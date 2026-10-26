-- Each account owns its favourites. All fixtures are rolled back.
begin;
select set_config('styled.test_owner',gen_random_uuid()::text,true);
select set_config('styled.test_other',gen_random_uuid()::text,true);
select set_config('styled.test_supplier',gen_random_uuid()::text,true);
select set_config('styled.test_product','test-saved-'||gen_random_uuid()::text,true);
insert into auth.users(id) values(current_setting('styled.test_owner')::uuid),(current_setting('styled.test_other')::uuid);
insert into public.suppliers(id,name,area) values(current_setting('styled.test_supplier')::uuid,'Saved items test '||current_setting('styled.test_supplier'),'Test');
insert into public.products(id,supplier_id,name,category,unit_price_pence,unit,qty_rule) values(current_setting('styled.test_product'),current_setting('styled.test_supplier')::uuid,'Saved item test','centrepieces',100,'each','fixed');
set local role anon;
do $$ begin
 begin perform 1 from public.saved_items;raise exception 'Anonymous read allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('styled.test_owner'),true);
set local role authenticated;
insert into public.saved_items(product_id) values(current_setting('styled.test_product'));
do $$ begin
 if(select count(*) from public.saved_items)<>1 then raise exception 'Owner could not read saved item';end if;
 begin insert into public.saved_items(product_id) values(current_setting('styled.test_product'));raise exception 'Duplicate saved item allowed';exception when unique_violation then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('styled.test_other'),true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.saved_items) then raise exception 'Other account read saved item';end if;
 delete from public.saved_items where owner_id=current_setting('styled.test_owner')::uuid;
 begin insert into public.saved_items(owner_id,product_id) values(current_setting('styled.test_owner')::uuid,current_setting('styled.test_product'));raise exception 'Forged owner allowed';exception when insufficient_privilege then null;end;
 begin update public.saved_items set owner_id=auth.uid();raise exception 'Ownership update allowed';exception when insufficient_privilege then null;end;
end $$;
insert into public.saved_items(product_id) values(current_setting('styled.test_product'));
delete from public.saved_items where product_id=current_setting('styled.test_product');
reset role;
select set_config('request.jwt.claim.sub',current_setting('styled.test_owner'),true);
set local role authenticated;
do $$ begin
 if(select count(*) from public.saved_items)<>1 then raise exception 'Other account deleted owner item';end if;
end $$;
delete from public.saved_items where product_id=current_setting('styled.test_product');
do $$ begin
 if exists(select 1 from public.saved_items) then raise exception 'Owner could not unsave';end if;
end $$;
reset role;
rollback;
