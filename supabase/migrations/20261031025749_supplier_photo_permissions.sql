begin;
alter table public.supplier_review_assets add column ai_reference_allowed boolean not null default false;
create or replace function public.review_supplier_range(p_supplier uuid,p_revision integer,p_actor uuid,p_action text,p_data jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare v public.supplier_reviews;sp public.suppliers;v_staff boolean;v_vendor boolean;v_products jsonb;
begin
 select * into sp from public.suppliers where id=p_supplier for update;if not found then raise exception 'Supplier not found';end if;
 select exists(select 1 from public.staff where user_id=p_actor) into v_staff;
 select exists(select 1 from public.supplier_users where user_id=p_actor and supplier_id=p_supplier) into v_vendor;
 if not v_staff and not v_vendor then raise exception 'Supplier or staff access required';end if;
 insert into public.supplier_reviews(supplier_id) values(p_supplier) on conflict do nothing;
 select * into v from public.supplier_reviews where supplier_id=p_supplier for update;
 if v.revision<>p_revision then raise exception 'Range changed. Refresh before saving';end if;
 perform 1 from public.products where supplier_id=p_supplier order by id for update;
 if p_action in ('save','submit') then
  if p_data->>'availabilityMode' not in ('manual','styled') then raise exception 'Choose how availability is checked';end if;
  if p_action='submit' and (coalesce(p_data->>'publicImagePermission','false')<>'true' or coalesce(p_data->>'listingPermission','false')<>'true' or coalesce(p_data->>'imageRights','false')<>'true' or coalesce(p_data->>'pricesConfirmed','false')<>'true' or coalesce(p_data->>'termsConfirmed','false')<>'true' or length(coalesce(p_data->>'terms',''))<10 or (p_data->>'replyHours')::integer not between 1 and 168) then raise exception 'Confirm listing, photos, prices, terms and response target before submitting';end if;
  if p_action='submit' and not exists(select 1 from public.products where supplier_id=p_supplier) then raise exception 'Add your starting products first';end if;
  select coalesce(jsonb_agg(to_jsonb(p)-array['created_at','updated_at','active','capacity','stock','sort_order'] order by p.id),'[]') into v_products from public.products p where supplier_id=p_supplier;
  update public.supplier_reviews set revision=revision+1,state=case when p_action='submit' then 'submitted' else 'draft' end,declarations=p_data,snapshot=jsonb_build_object('supplier',to_jsonb(sp)-array['created_at','active','onboarding_availability_confirmed_at','ical_url','ical_synced_at','commission_rate'],'products',v_products),submitted_by=p_actor,submitted_at=case when p_action='submit' then now() else null end,reviewed_at=null,feedback=null,updated_at=now() where supplier_id=p_supplier;
 elsif p_action='changes' then
  if not v_staff or v.state<>'submitted' or length(coalesce(p_data->>'feedback',''))<3 then raise exception 'Staff feedback is required on a submitted range';end if;
  update public.supplier_reviews set revision=revision+1,state='changes',feedback=p_data->>'feedback',reviewed_by=p_actor,reviewed_at=now(),updated_at=now() where supplier_id=p_supplier;
 elsif p_action='approve' then
  if coalesce(v.declarations->>'publicImagePermission','false')<>'true' then raise exception 'Public photo permission must be recorded before publication';end if;
  if not v_staff or v.state<>'submitted' then raise exception 'Staff must review a submitted range';end if;
  if not exists(select 1 from public.products where supplier_id=p_supplier) or exists(select 1 from public.products where supplier_id=p_supplier and (image is null or trim(image)='')) then raise exception 'Every starting product needs an approved image';end if;
  select coalesce(jsonb_agg(to_jsonb(p)-array['created_at','updated_at','active','capacity','stock','sort_order'] order by p.id),'[]') into v_products from public.products p where supplier_id=p_supplier;
  if v.snapshot->'products' is distinct from v_products or v.snapshot->'supplier' is distinct from to_jsonb(sp)-array['created_at','active','onboarding_availability_confirmed_at','ical_url','ical_synced_at','commission_rate'] then raise exception 'Supplier details changed. Ask for a fresh submission';end if;
  update public.supplier_reviews set revision=revision+1,state='approved',reviewed_by=p_actor,reviewed_at=now(),feedback=p_data->>'feedback',updated_at=now() where supplier_id=p_supplier;
  update public.supplier_review_assets set approved=true,ai_reference_allowed=coalesce((v.declarations->>'aiReferencePermission')::boolean,false) where supplier_id=p_supplier and product_id in(select id from public.products where supplier_id=p_supplier);
  update public.suppliers set active=true where id=p_supplier;
  update public.products set active=true where supplier_id=p_supplier;
 else raise exception 'Unknown review action';end if;
 return jsonb_build_object('ok',true);
end;$$;

commit;
