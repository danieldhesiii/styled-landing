begin;

-- Range review normally locks supplier, review, products. A direct declaration
-- update already owns the review row, so never WAIT for supplier/product locks
-- here: a conflicting edit must roll back and retry instead of forming a cycle.
create function public.withdraw_supplier_publication(p_supplier uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.suppliers where id=p_supplier for no key update nowait;
 perform 1 from public.supplier_reviews where supplier_id=p_supplier for update nowait;
 perform 1 from public.products where supplier_id=p_supplier order by id for update nowait;
 update public.suppliers set active=false where id=p_supplier and active;
 update public.products set active=false where supplier_id=p_supplier and active;
 update public.supplier_review_assets set approved=false,ai_reference_allowed=false
  where supplier_id=p_supplier and (approved or ai_reference_allowed);
 -- Also repair inconsistent older approvals without retaining a reactivation
 -- capability. Normal save/submit has already moved the review out of approved.
 update public.supplier_reviews set state='draft',revision=revision+1,updated_at=now()
  where supplier_id=p_supplier and state='approved';
exception when lock_not_available then
 raise exception 'Supplier publication is being updated. Refresh and retry' using errcode='55P03';
end;$$;
revoke all on function public.withdraw_supplier_publication(uuid) from public,anon,authenticated;
grant execute on function public.withdraw_supplier_publication(uuid) to service_role;

-- Withdrawals commit with the declaration. This only revokes: renewed consent
-- still requires the existing submission and staff approval flow.
create function public.revoke_supplier_reference_permissions()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.declarations->'listingPermission' is distinct from 'true'::jsonb or
    new.declarations->'publicImagePermission' is distinct from 'true'::jsonb or
    new.declarations->'imageRights' is distinct from 'true'::jsonb then
  perform public.withdraw_supplier_publication(new.supplier_id);
 elsif new.declarations->'aiReferencePermission' is distinct from 'true'::jsonb then
  update public.supplier_review_assets set ai_reference_allowed=false
   where supplier_id=new.supplier_id and ai_reference_allowed;
 end if;
 return new;
end;$$;
revoke all on function public.revoke_supplier_reference_permissions() from public,anon,authenticated;
create trigger supplier_permission_withdrawal after insert or update of declarations on public.supplier_reviews
 for each row execute function public.revoke_supplier_reference_permissions();

-- Repair stale grants left by earlier withdrawals; a missing declaration grants
-- no AI permission. AI-only withdrawal preserves public listing approval.
update public.supplier_review_assets a set ai_reference_allowed=false
 where a.ai_reference_allowed and not exists(
  select 1 from public.supplier_reviews r where r.supplier_id=a.supplier_id
   and r.declarations->'aiReferencePermission'='true'::jsonb
 );

-- Existing reviews that withdrew public permissions must stop publishing too.
-- Suppliers with no review record are not reclassified by this repair.
do $$
declare supplier uuid;
begin
 for supplier in select supplier_id from public.supplier_reviews
  where declarations->'listingPermission' is distinct from 'true'::jsonb or
        declarations->'publicImagePermission' is distinct from 'true'::jsonb or
        declarations->'imageRights' is distinct from 'true'::jsonb
  order by supplier_id
 loop
  perform public.withdraw_supplier_publication(supplier);
 end loop;
end;$$;

commit;
