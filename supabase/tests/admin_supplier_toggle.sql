-- Fictional fixtures only. All records and temporary publication changes roll back.
begin;
select set_config('toggle.staff',gen_random_uuid()::text,true);
select set_config('toggle.vendor',gen_random_uuid()::text,true);
select set_config('toggle.approved',gen_random_uuid()::text,true);
select set_config('toggle.legacy',gen_random_uuid()::text,true);
select set_config('toggle.product','toggle-proof-'||gen_random_uuid()::text,true);
insert into auth.users(id,email) values(current_setting('toggle.staff')::uuid,current_setting('toggle.staff')||'@example.invalid'),(current_setting('toggle.vendor')::uuid,current_setting('toggle.vendor')||'@example.invalid');
insert into public.staff(user_id) values(current_setting('toggle.staff')::uuid);
set local role service_role;
insert into public.suppliers(id,name,area,active) values(current_setting('toggle.approved')::uuid,'Fictional toggle approved '||current_setting('toggle.approved'),'Test',false),(current_setting('toggle.legacy')::uuid,'Fictional toggle legacy '||current_setting('toggle.legacy'),'Test',true);
insert into public.supplier_users(user_id,supplier_id) values(current_setting('toggle.vendor')::uuid,current_setting('toggle.approved')::uuid);
insert into public.products(id,supplier_id,name,category,unit_price_pence,unit,qty_rule,capacity,image,active) values(current_setting('toggle.product'),current_setting('toggle.approved')::uuid,'Fictional toggle product','florals',1000,'each','fixed',5,'/img/fictional-toggle.webp',false);
do $$ declare declarations jsonb:=jsonb_build_object('availabilityMode','manual','replyHours',48,'listingPermission',true,'imageRights',true,'publicImagePermission',true,'aiReferencePermission',false,'pricesConfirmed',true,'termsConfirmed',true,'terms','Fictional toggle fixture only','notes','Test only'); begin
 perform public.review_supplier_range(current_setting('toggle.approved')::uuid,0,current_setting('toggle.vendor')::uuid,'submit',declarations);
 perform public.review_supplier_range(current_setting('toggle.approved')::uuid,1,current_setting('toggle.staff')::uuid,'approve','{}');
end;$$;
-- Approved pause must preserve review and product flags for safe reactivation.
update public.suppliers set active=false where id=current_setting('toggle.approved')::uuid;
do $$ begin
 if (select active from public.suppliers where id=current_setting('toggle.approved')::uuid) then raise exception 'Approved pause failed';end if;
 if not exists(select 1 from public.supplier_reviews where supplier_id=current_setting('toggle.approved')::uuid and state='approved') then raise exception 'Pause lost approval';end if;
 if not (select active from public.products where id=current_setting('toggle.product')) then raise exception 'Pause changed product flags';end if;
end;$$;
reset role;
set local role anon;
do $$ begin
 if exists(select 1 from public.suppliers where id=current_setting('toggle.approved')::uuid) then raise exception 'Paused supplier publicly visible';end if;
 if exists(select 1 from public.products p join public.suppliers s on s.id=p.supplier_id where p.id=current_setting('toggle.product')) then raise exception 'Paused supplier catalogue item publicly visible';end if;
end;$$;
reset role;
set local role service_role;
update public.suppliers set active=true where id=current_setting('toggle.approved')::uuid;
do $$ begin if not (select active from public.suppliers where id=current_setting('toggle.approved')::uuid) then raise exception 'Approved reactivation failed';end if;end;$$;
reset role;
set local role anon;
do $$ begin if not exists(select 1 from public.products p join public.suppliers s on s.id=p.supplier_id where p.id=current_setting('toggle.product')) then raise exception 'Reactivation did not restore public catalogue';end if;end;$$;
reset role;
set local role service_role;
-- Legacy/missing approval reproduces the actual hosted state without real edits.
update public.suppliers set active=false where id=current_setting('toggle.legacy')::uuid;
do $$ begin
 begin
  update public.suppliers set active=true where id=current_setting('toggle.legacy')::uuid;
  raise exception 'Unapproved reactivation bypassed guard';
 exception when sqlstate 'P0001' then
  if sqlerrm<>'Supplier publication requires an approved submission' then raise;end if;
 end;
end;$$;
-- A successful update can return inactive: the editorial guard overrides active.
do $$ declare actual boolean; begin
 update public.suppliers set name=name||' edited',active=true where id=current_setting('toggle.approved')::uuid returning active into actual;
 if actual then raise exception 'Material edit bypassed review';end if;
 if not exists(select 1 from public.supplier_reviews where supplier_id=current_setting('toggle.approved')::uuid and state='draft') then raise exception 'Material edit did not invalidate approval';end if;
 begin
  update public.suppliers set active=true where id=current_setting('toggle.approved')::uuid;
  raise exception 'Draft reactivation bypassed guard';
 exception when sqlstate 'P0001' then
  if sqlerrm<>'Supplier publication requires an approved submission' then raise;end if;
 end;
end;$$;
-- Permission withdrawal stays effective; a renewed declaration needs approval.
update public.supplier_reviews set declarations=declarations||'{"listingPermission":false}'::jsonb where supplier_id=current_setting('toggle.approved')::uuid;
do $$ begin
 begin
  update public.suppliers set active=true where id=current_setting('toggle.approved')::uuid;
  raise exception 'Withdrawn permission bypassed guard';
 exception when sqlstate 'P0001' then
  if sqlerrm<>'Supplier publication requires an approved submission' then raise;end if;
 end;
end;$$;
reset role;
rollback;
select 'PASS: approved pause/reactivate; legacy and draft reactivation refused; editorial override returned; permission guard retained. Fixture rolled back.' as toggle_proof;
