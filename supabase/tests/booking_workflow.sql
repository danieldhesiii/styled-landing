-- Fictional, rollback-only fixtures. No external provider or network is used.
begin;
do $$
#variable_conflict use_variable
declare
 staff_id uuid:=gen_random_uuid(); customer_id uuid:=gen_random_uuid(); vendor_id uuid:=gen_random_uuid(); other_vendor uuid:=gen_random_uuid();
 supplier_id uuid:=gen_random_uuid(); other_supplier uuid:=gen_random_uuid(); order_id uuid:=gen_random_uuid();
 product_id text:='workflow-test-'||gen_random_uuid(); other_product text:='workflow-test-'||gen_random_uuid();
 line_id uuid; other_line uuid; quote_id uuid; revision integer; supplier uuid; actor uuid; declarations jsonb; reply jsonb;
 original_start date; original_replies jsonb;
begin
 insert into auth.users(id,email,is_anonymous) values(staff_id,staff_id||'@example.invalid',false),(customer_id,customer_id||'@example.invalid',false),(vendor_id,vendor_id||'@example.invalid',false),(other_vendor,other_vendor||'@example.invalid',false);
 insert into public.staff(user_id) values(staff_id);
 insert into public.suppliers(id,name,area,active) values(supplier_id,'Fictional workflow A '||supplier_id,'Test area',false),(other_supplier,'Fictional workflow B '||other_supplier,'Test area',false);
 insert into public.supplier_users(user_id,supplier_id) values(vendor_id,supplier_id),(other_vendor,other_supplier);
 insert into public.products(id,supplier_id,name,category,unit_price_pence,unit,qty_rule,capacity,image,active,lead_time_days) values
 (product_id,supplier_id,'Fictional fixture A','florals',10000,'each','fixed',5,'/fixture-a.webp',false,20),
 (other_product,other_supplier,'Fictional fixture B','florals',10000,'each','fixed',5,'/fixture-b.webp',false,0);
 execute 'set local role service_role';
 declarations:=jsonb_build_object('availabilityMode','manual','replyHours',48,'listingPermission',true,'imageRights',true,'publicImagePermission',true,'aiReferencePermission',false,'pricesConfirmed',true,'termsConfirmed',true,'terms','Fictional fixture terms only','notes','Test only');
 foreach supplier in array array[supplier_id,other_supplier] loop
  actor:=case when supplier=supplier_id then vendor_id else other_vendor end;
  perform public.review_supplier_range(supplier,0,actor,'submit',declarations);
  perform public.review_supplier_range(supplier,1,staff_id,'approve','{}');
 end loop;
 insert into public.orders(id,owner_id,couple_name,email,wedding_date,subtotal_pence,commission_pence,deposit_pence,status) values(order_id,customer_id,'Fictional workflow customer','test@example.invalid',current_date+90,30000,0,0,'requested');
 insert into public.order_lines(order_id,product_id,supplier_id,product_name,supplier_name,unit_price_pence,quantity,line_total_pence,supplier_status,needed_date,return_date) values
 (order_id,product_id,supplier_id,'Fixture A1','Supplier A',10000,1,10000,'pending',current_date+90,current_date+90),
 (order_id,product_id,supplier_id,'Fixture A2','Supplier A',10000,1,10000,'pending',current_date+90,current_date+90),
 (order_id,other_product,other_supplier,'Fixture B','Supplier B',10000,1,10000,'pending',current_date+90,current_date+90);
 select id into line_id from public.order_lines where order_lines.order_id=order_id and order_lines.supplier_id=supplier_id order by id limit 1;
 select id into other_line from public.order_lines where order_lines.order_id=order_id and order_lines.supplier_id=other_supplier;
 reply:=jsonb_build_object('response','available','mode','supplier_setup','deliveryPence',0,'setupPence',0,'collectionPence',0,'extraPence',0,'securityPence',0,'prepDays',0,'returnBufferDays',0,'systemChecked',true,'siteChecked',true,'sharedStockChecked',true,'pricesIncludeVat',true,'terms','Fictional fixture quote terms','note','Test only');
 perform public.change_booking_workflow(order_id,0,vendor_id,'reply',jsonb_build_object('supplierId',supplier_id,'reply',reply));
 perform public.change_booking_workflow(order_id,1,other_vendor,'reply',jsonb_build_object('supplierId',other_supplier,'reply',reply));
 perform public.change_booking_workflow(order_id,2,staff_id,'issue',jsonb_build_object('expiresAt',now()+interval '7 days'));
 select current_quote_id,supplier_replies into quote_id,original_replies from public.booking_workflows where booking_workflows.order_id=order_id;
 perform public.change_booking_workflow(order_id,3,customer_id,'accept',jsonb_build_object('quoteId',quote_id,'reviewed',true));
 -- A multi-item amendment fails atomically: the valid first change must not leak.
 begin
  perform public.change_booking_workflow(order_id,4,customer_id,'logistics',jsonb_build_object('logistics','{}'::jsonb,'itemDates',jsonb_build_array(
   jsonb_build_object('id',other_line,'start',current_date+60,'end',current_date+60),
   jsonb_build_object('id',line_id,'start',current_date+19,'end',current_date+19))));
  raise exception 'TEST: insufficient amendment notice accepted';
 exception when others then if sqlerrm not like 'Hire starts before the supplier notice period.%' then raise;end if;end;
 if (select needed_date from public.order_lines where id=other_line)<>current_date+90 or
    (select revision from public.booking_workflows where booking_workflows.order_id=order_id)<>4 or
    (select supplier_replies from public.booking_workflows where booking_workflows.order_id=order_id)<>original_replies or
    (select status from public.booking_quotes where id=quote_id)<>'accepted' then raise exception 'TEST: failed amendment partially changed accepted booking';end if;
 -- Exact notice boundary is allowed; zero-notice items can start today.
 perform public.change_booking_workflow(order_id,4,customer_id,'logistics',jsonb_build_object('logistics','{}'::jsonb,'itemDates',jsonb_build_array(
  jsonb_build_object('id',line_id,'start',current_date+20,'end',current_date+20),
  jsonb_build_object('id',other_line,'start',current_date,'end',current_date))));
 if (select status from public.booking_quotes where id=quote_id)<>'superseded' or
    (select supplier_replies from public.booking_workflows where booking_workflows.order_id=order_id)<>'{}'::jsonb then raise exception 'TEST: valid amendment did not revoke quote and checks';end if;
 perform public.change_booking_workflow(order_id,5,vendor_id,'reply',jsonb_build_object('supplierId',supplier_id,'reply',reply));
 perform public.change_booking_workflow(order_id,6,other_vendor,'reply',jsonb_build_object('supplierId',other_supplier,'reply',reply));
 -- Simulate an old/legacy request already inside the notice window. Issuance
 -- must recheck notice even without going through the amendments UI.
 update public.order_lines set needed_date=current_date+19,return_date=current_date+19 where id=line_id;
 begin
  perform public.change_booking_workflow(order_id,7,staff_id,'issue',jsonb_build_object('expiresAt',now()+interval '7 days'));
  raise exception 'TEST: quote issue bypassed notice';
 exception when others then if sqlerrm not like 'Hire starts before the supplier notice period.%' then raise;end if;end;
 if (select revision from public.booking_workflows where booking_workflows.order_id=order_id)<>7 or
    (select count(*) from public.booking_quotes where booking_quotes.order_id=order_id)<>1 then raise exception 'TEST: failed issue persisted a quote or revision';end if;
 update public.order_lines set needed_date=current_date+20,return_date=current_date+20 where id=line_id;
 perform public.change_booking_workflow(order_id,7,staff_id,'issue',jsonb_build_object('expiresAt',now()+interval '7 days'));
 select current_quote_id into quote_id from public.booking_workflows where booking_workflows.order_id=order_id;
 perform public.change_booking_workflow(order_id,8,customer_id,'accept',jsonb_build_object('quoteId',quote_id,'reviewed',true));
 perform public.change_booking_workflow(order_id,9,staff_id,'handover',jsonb_build_object('handover',jsonb_build_object('contractParty','supplier','confirmationReference','Fictional reference','paymentArrangement','Offline fixture; nothing paid','cancellationTerms','Fictional test only')));
 begin
  perform public.change_booking_workflow(order_id,10,vendor_id,'confirm',jsonb_build_object('supplierId',supplier_id));raise exception 'TEST: supplier confirmed final booking';
 exception when others then if sqlerrm<>'Current customer acceptance is required' then raise;end if;end;
 if exists(select 1 from public.booking_notifications where booking_notifications.order_id=order_id and kind='booking_confirmed') then raise exception 'TEST: unauthorized confirmation queued messages';end if;
 -- Force a downstream transaction failure after confirmation to prove both
 -- the status and all outbox rows roll back together.
 begin
  perform public.change_booking_workflow(order_id,10,staff_id,'confirm','{}');
  raise exception 'ROLLBACK_CONFIRMATION_FIXTURE';
 exception when others then if sqlerrm<>'ROLLBACK_CONFIRMATION_FIXTURE' then raise;end if;end;
 if (select status from public.orders where id=order_id)<>'requested' or exists(select 1 from public.booking_notifications where booking_notifications.order_id=order_id and kind='booking_confirmed') then raise exception 'TEST: confirmation/outbox did not roll back';end if;
 perform public.change_booking_workflow(order_id,10,staff_id,'confirm','{}');
 if (select count(*) from public.booking_notifications where booking_notifications.order_id=order_id and kind='booking_confirmed')<>3 or
    (select count(*) from public.booking_notifications where booking_notifications.order_id=order_id and kind='booking_confirmed' and audience='customer' and booking_notifications.supplier_id is null)<>1 or
    (select count(distinct booking_notifications.supplier_id) from public.booking_notifications where booking_notifications.order_id=order_id and kind='booking_confirmed' and audience='supplier')<>2 then raise exception 'TEST: expected one customer and one message per supplier';end if;
 begin
  perform public.change_booking_workflow(order_id,10,staff_id,'confirm','{}');raise exception 'TEST: stale confirmation accepted';
 exception when others then if sqlerrm<>'Request changed. Refresh before saving' then raise;end if;end;
 begin
  perform public.change_booking_workflow(order_id,11,staff_id,'confirm','{}');raise exception 'TEST: repeated confirmation accepted';
 exception when others then if sqlerrm<>'Current customer acceptance is required' then raise;end if;end;
 if (select count(*) from public.booking_notifications where booking_notifications.order_id=order_id and kind='booking_confirmed')<>3 then raise exception 'TEST: retry duplicated confirmation messages';end if;
 if (select stripe_payment_intent_id from public.orders where id=order_id) is not null then raise exception 'TEST: unexpected payment';end if;
 if has_function_privilege('anon','public.change_booking_workflow(uuid,integer,uuid,text,jsonb)','execute') or has_function_privilege('authenticated','public.change_booking_workflow(uuid,integer,uuid,text,jsonb)','execute') then raise exception 'TEST: workflow permissions leaked';end if;
end;$$;
select 'Passed: amendment/issue notice, exact boundary, rollback, quote invalidation, scoped roles, unique confirmation outbox, no payment' as result;
rollback;
