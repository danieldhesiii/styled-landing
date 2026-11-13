begin;
do $$
declare cust_a uuid:=gen_random_uuid();cust_b uuid:=gen_random_uuid();s uuid:=gen_random_uuid();p text:='last-chandelier-'||gen_random_uuid();
 d date:=current_date+110; o uuid;n uuid;body jsonb;lines jsonb;avail integer;due timestamptz;started timestamptz;
begin
 insert into auth.users(id,email) values(cust_a,cust_a||'@example.invalid'),(cust_b,cust_b||'@example.invalid');
 insert into public.suppliers(id,name,area,message_reply_hours,active) values(s,'Supplier test '||s,'Test',24,false);
 insert into public.products(id,supplier_id,name,category,capacity,unit_price_pence,unit,qty_rule,active,image)
 values(p,s,'Last chandelier','lighting',1,6000,'each','fixed',false,'/test.webp');
 insert into public.staff(user_id) values(cust_a);
 perform public.review_supplier_range(s,0,cust_a,'submit',jsonb_build_object('availabilityMode','manual','replyHours',24,'listingPermission',true,'imageRights',true,'publicImagePermission',true,'aiReferencePermission',false,'pricesConfirmed',true,'termsConfirmed',true,'terms','Synthetic fixture only.'));
 perform public.review_supplier_range(s,1,cust_a,'approve','{}');
 body:=jsonb_build_object('couple_name','Rehearsal','email','example@example.invalid','wedding_date',d,'subtotal_pence',6000,'commission_pence',0,'deposit_pence',0);
 lines:=jsonb_build_array(jsonb_build_object('product_id',p,'supplier_id',s,'product_name','Last chandelier','supplier_name','Example','unit','each','quantity',1,'unit_price_pence',6000,'line_total_pence',6000,'needed_date',d-1,'return_date',d+1));
 o:=public.create_order(cust_a,body,lines);
 select id,created_at,reply_due_at into strict n,started,due from public.supplier_order_notices where order_id=o;
 if due is distinct from started+interval '24 hours' then raise exception 'Reply target missing';end if;
 update public.supplier_order_notices set sent_version='example',part_count=2 where id=n;
 perform public.record_order_phone_part(n,0,'SM'||repeat('a',32),'delivered');
 perform public.record_order_phone_part(n,0,'SM'||repeat('a',32),'accepted');
 perform public.record_order_phone_part(n,0,'SM'||repeat('a',32),'delivered');
 perform public.record_order_phone_part(n,1,'SM'||repeat('b',32),'failed');
 if (select count(*) from public.order_phone_parts where notice_id=n)<>2 or not exists(select from public.order_phone_parts where notice_id=n and part=0 and state='delivered') then raise exception 'Receipt regression';end if;
 if (select supplier_status from public.order_lines where order_id=o)<>'pending' then raise exception 'Receipt wrongly confirmed availability';end if;
 if has_table_privilege('authenticated','public.order_phone_parts','select') or has_function_privilege('authenticated','public.record_order_phone_part(uuid,integer,text,text)','execute') then raise exception 'Private receipts exposed';end if;
 insert into public.booking_quotes(order_id,version,payload,expires_at) values(o,1,'{}',now()-interval '1 hour');
 begin perform public.create_order(cust_b,body,lines);raise exception 'Second customer took held stock';exception when raise_exception then if sqlerrm<>'unavailable' then raise;end if;end;
 update public.order_lines set supplier_status='declined' where order_id=o;
 select available into avail from public.product_availability(array[p],d+1);
 if avail is distinct from 1 then raise exception 'Decline failed to release stock';end if;
 o:=public.create_order(cust_b,body,lines);
 update public.orders set status='cancelled' where id=o;
 select available into avail from public.product_availability(array[p],d);
 if avail is distinct from 1 then raise exception 'Cancellation failed to release stock';end if;
end $$;
rollback;
