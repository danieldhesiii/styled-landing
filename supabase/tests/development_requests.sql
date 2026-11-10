
begin;
do $$
declare u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); oid uuid; pid text:='request-fixture-'||gen_random_uuid();
begin
 insert into auth.users(id,email,is_anonymous) values(u,u||'@example.invalid',false);
 insert into public.suppliers(id,name,area,active) values(s,'Fictional request fixture','Test only',false);
 insert into public.products(id,supplier_id,name,category,unit_price_pence,unit,qty_rule,capacity,active) values(pid,s,'Fictional chair','furniture',1000,'each','fixed',10,false);
 oid:=public.create_development_request_order(u,jsonb_build_object('couple_name','Rollback only','email','fixture@example.invalid','wedding_date',current_date+90,'subtotal_pence',1000,'commission_pence',0,'deposit_pence',0),jsonb_build_array(
 jsonb_build_object('product_id',pid,'supplier_id',s,'product_name','Fictional chair','supplier_name','Fictional request fixture','unit','each','quantity',1,'unit_price_pence',1000,'line_total_pence',1000),
 jsonb_build_object('product_id',null,'supplier_id',null,'product_name','Unknown chandelier','supplier_name','Crescent Moon','unit','price on request','quantity',2,'unit_price_pence',null,'line_total_pence',null,'request_snapshot',jsonb_build_object('catalogueId','demo-crescent-moon-unknown','requestOnly',true,'developmentOnly',true,'priceOnRequest',true))));
 if (select count(*) from public.order_lines where order_id=oid)<>2 then raise exception 'TEST: missing mixed request lines';end if;
 if not exists(select 1 from public.order_lines where order_id=oid and product_id is null and supplier_id is null and unit_price_pence is null and line_total_pence is null and request_snapshot->>'catalogueId'='demo-crescent-moon-unknown') then raise exception 'TEST: unknown price or identity was lost';end if;
 if exists(select 1 from public.booking_notifications where order_id=oid and status<>'blocked') then raise exception 'TEST: prototype can send real notifications';end if;
 begin update public.orders set status='confirmed' where id=oid;raise exception 'TEST: request was confirmed';exception when others then if sqlerrm like 'TEST:%' then raise;end if;end;
 begin update public.orders set status='deposit_paid' where id=oid;raise exception 'TEST: request was paid';exception when others then if sqlerrm like 'TEST:%' then raise;end if;end;
 begin insert into public.booking_quotes(order_id,version,payload,expires_at) values(oid,1,'{}',now()+interval '1 day');raise exception 'TEST: request was quoted';exception when others then if sqlerrm like 'TEST:%' then raise;end if;end;
 begin update public.order_lines set supplier_status='confirmed' where order_id=oid and request_snapshot is not null;raise exception 'TEST: unlinked supplier was confirmed';exception when check_violation then null;end;
 if has_function_privilege('authenticated','public.create_development_request_order(uuid,jsonb,jsonb)','EXECUTE') then raise exception 'TEST: public RPC access';end if;
end;$$;
rollback;
