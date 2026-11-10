-- Isolated development fixture: all publication/data changes roll back.
begin;
select set_config('adminproof.staff',gen_random_uuid()::text,true);
select set_config('adminproof.vendor',gen_random_uuid()::text,true);
select set_config('adminproof.supplier',gen_random_uuid()::text,true);
select set_config('adminproof.product','admin-proof-'||gen_random_uuid()::text,true);
insert into auth.users(id,email) values(current_setting('adminproof.staff')::uuid,'admin-proof@example.invalid'),(current_setting('adminproof.vendor')::uuid,'vendor-proof@example.invalid');
insert into public.staff(user_id) values(current_setting('adminproof.staff')::uuid);
set local role service_role;
insert into public.suppliers(id,name,area,active) values(current_setting('adminproof.supplier')::uuid,'Fictional admin proof '||current_setting('adminproof.supplier'),'Test',false);
insert into public.supplier_users(user_id,supplier_id) values(current_setting('adminproof.vendor')::uuid,current_setting('adminproof.supplier')::uuid);
insert into public.products(id,supplier_id,name,category,unit_price_pence,unit,qty_rule,capacity,image,active) values(current_setting('adminproof.product'),current_setting('adminproof.supplier')::uuid,'Before approval','florals',1000,'each','fixed',5,'/img/fictional-fixture.webp',false);
do $$ declare declarations jsonb:=jsonb_build_object('availabilityMode','manual','replyHours',48,'listingPermission',true,'imageRights',true,'publicImagePermission',true,'aiReferencePermission',false,'pricesConfirmed',true,'termsConfirmed',true,'terms','Fictional fixture terms only','notes','Test only'); begin
 perform public.review_supplier_range(current_setting('adminproof.supplier')::uuid,0,current_setting('adminproof.vendor')::uuid,'submit',declarations);
 perform public.review_supplier_range(current_setting('adminproof.supplier')::uuid,1,current_setting('adminproof.staff')::uuid,'approve','{}');
end;$$;
reset role;
set local role anon;
do $$ begin if not exists(select 1 from public.products where id=current_setting('adminproof.product') and name='Before approval') then raise exception 'Published catalogue/detail read missing'; end if;end;$$;
reset role;
set local role service_role;
update public.products set name='Edited product name',unit_price_pence=1250 where id=current_setting('adminproof.product');
do $$ begin if not exists(select 1 from public.products where id=current_setting('adminproof.product') and name='Edited product name' and unit_price_pence=1250 and not active) then raise exception 'Admin save/reload incorrect'; end if;end;$$;
reset role;
set local role anon;
do $$ begin if exists(select 1 from public.products where id=current_setting('adminproof.product')) then raise exception 'Unapproved edit publicly visible'; end if;end;$$;
reset role;
set local role service_role;
do $$ declare rev integer; declarations jsonb; begin
 select revision,r.declarations into rev,declarations from public.supplier_reviews r where supplier_id=current_setting('adminproof.supplier')::uuid;
 perform public.review_supplier_range(current_setting('adminproof.supplier')::uuid,rev,current_setting('adminproof.vendor')::uuid,'submit',declarations);
 perform public.review_supplier_range(current_setting('adminproof.supplier')::uuid,rev+1,current_setting('adminproof.staff')::uuid,'approve','{}');
end;$$;
reset role;
set local role anon;
do $$ begin if not exists(select 1 from public.products where id=current_setting('adminproof.product') and name='Edited product name' and unit_price_pence=1250) then raise exception 'Approved edit did not propagate to catalogue/detail read'; end if;end;$$;
reset role;
rollback;
