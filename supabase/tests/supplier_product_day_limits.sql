-- Synthetic ownership and stock tests. Everything is rolled back.
begin;
do $$
declare
  u uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); other_s uuid:=gen_random_uuid();
  p text:='date-limit-'||gen_random_uuid(); other_p text:='date-limit-other-'||gen_random_uuid(); made text:='date-limit-made-'||gen_random_uuid();
  oid uuid:=gen_random_uuid(); d date:=current_date+90; n integer;
begin
  insert into auth.users(id,email,is_anonymous) values(u,u||'@example.invalid',false),(other_user,other_user||'@example.invalid',false);
  insert into public.suppliers(id,name,area) values(s,'Date limit fixture','Test'),(other_s,'Other date limit fixture','Test');
  insert into public.supplier_users(user_id,supplier_id) values(u,s),(other_user,other_s);
  insert into public.products(id,supplier_id,name,category,unit_price_pence,unit,qty_rule,capacity,active)
    values(p,s,'Fixture arch','backdrops',100,'each','fixed',4,false),(other_p,other_s,'Other arch','backdrops',100,'each','fixed',8,false),
      (made,s,'Made to order fixture','florals',100,'each','fixed',null,false);
  insert into public.orders(id,owner_id,couple_name,email,wedding_date,subtotal_pence,commission_pence,deposit_pence,status)
    values(oid,u,'Fixture','fixture@example.invalid',d,100,0,0,'requested');
  insert into public.order_lines(order_id,product_id,supplier_id,product_name,supplier_name,unit_price_pence,quantity,line_total_pence,supplier_status,needed_date,return_date)
    values(oid,p,s,'Fixture arch','Fixture',100,1,100,'pending',d-1,d+1);
  execute 'set local role service_role';
  perform public.set_supplier_product_day_limit(u,s,p,d,2,'Booked elsewhere');
  select available into n from public.product_availability(array[p],d);
  if n<>1 then raise exception 'TEST: Styled reservation not deducted from total date limit'; end if;
  perform public.set_supplier_product_day_limit(u,s,p,d,1,'Changed');
  if (select count(*) from public.availability_overrides where product_id=p and day=d)<>1 then raise exception 'TEST: duplicate exception'; end if;
  select available into n from public.product_availability(array[p],d);
  if n<>0 then raise exception 'TEST: edited date limit not applied'; end if;
  perform public.set_supplier_product_day_limit(u,s,p,d,0,null);
  select effective_capacity into n from public.product_availability(array[p],d);
  if n<>0 then raise exception 'TEST: zero did not close product'; end if;
  begin perform public.set_supplier_product_day_limit(u,s,p,d,5,null); raise exception 'TEST: increased stock';
  exception when others then if sqlerrm<>'Daily limit exceeds normal stock' then raise; end if; end;
  begin perform public.set_supplier_product_day_limit(u,s,other_p,d,1,null); raise exception 'TEST: modified other supplier product';
  exception when others then if sqlerrm<>'Product does not belong to this supplier' then raise; end if; end;
  begin perform public.set_supplier_product_day_limit(u,other_s,other_p,d,1,null); raise exception 'TEST: impersonated supplier';
  exception when others then if sqlerrm<>'Supplier access required' then raise; end if; end;
  begin perform public.set_supplier_product_day_limit(u,s,p,current_date-1,1,null); raise exception 'TEST: edited past';
  exception when others then if sqlerrm<>'Choose today or a future date' then raise; end if; end;
  begin perform public.set_supplier_product_day_limit(u,s,made,d,1,null); raise exception 'TEST: limited made-to-order product';
  exception when others then if sqlerrm<>'Made-to-order products can only be closed for a date' then raise; end if; end;
  perform public.set_supplier_product_day_limit(u,s,made,d,0,null);
  select effective_capacity into n from public.product_availability(array[made],d);
  if n<>0 then raise exception 'TEST: made-to-order close ignored'; end if;
  perform public.set_supplier_product_day_limit(u,s,p,d,null,null);
  select available into n from public.product_availability(array[p],d);
  if n<>3 then raise exception 'TEST: normal stock not restored'; end if;
  insert into public.availability_overrides(supplier_id,day,blocked,source) values(s,d,true,'manual');
  perform public.set_supplier_product_day_limit(u,s,p,d,2,null);
  select effective_capacity into n from public.product_availability(array[p],d);
  if n<>0 then raise exception 'TEST: product exception bypassed whole-business block'; end if;
  perform public.set_supplier_product_day_limit(u,s,p,d,null,null);
  if not exists(select 1 from public.availability_overrides where supplier_id=s and day=d and blocked) then raise exception 'TEST: removed whole-business block'; end if;
  if (select status from public.orders where id=oid)<>'requested' or (select supplier_status from public.order_lines where order_id=oid)<>'pending' then raise exception 'TEST: changed existing order'; end if;
  if has_function_privilege('anon','public.set_supplier_product_day_limit(uuid,uuid,text,date,integer,text)','execute') or
     has_function_privilege('authenticated','public.set_supplier_product_day_limit(uuid,uuid,text,date,integer,text)','execute') then raise exception 'TEST: browser role can call privileged stock function'; end if;
  execute 'reset role';
end;
$$;
rollback;
