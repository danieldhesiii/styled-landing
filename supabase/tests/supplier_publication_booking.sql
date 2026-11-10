-- Fictional fixtures, rolled back in full. No provider, payment or hosted data.
begin;
do $$
#variable_conflict use_variable
declare
 staff_id uuid:=gen_random_uuid(); customer_id uuid:=gen_random_uuid(); vendor_id uuid:=gen_random_uuid();
 supplier_id uuid:=gen_random_uuid(); order_id uuid:=gen_random_uuid();
 product_id text:='publication-test-'||gen_random_uuid(); quote_id uuid;
 declarations jsonb; reply jsonb; revision integer; notices integer;
begin
 insert into auth.users(id,email,is_anonymous) values
  (staff_id,staff_id||'@example.invalid',false),(customer_id,customer_id||'@example.invalid',false),
  (vendor_id,vendor_id||'@example.invalid',false);
 insert into public.staff(user_id) values(staff_id);
 insert into public.suppliers(id,name,area,active) values(supplier_id,'Publication fixture '||supplier_id,'Test area',false);
 insert into public.supplier_users(user_id,supplier_id) values(vendor_id,supplier_id);
 insert into public.products(id,supplier_id,name,category,unit_price_pence,unit,qty_rule,capacity,image,active)
  values(product_id,supplier_id,'Fixture','florals',10000,'each','fixed',5,'/fixture.webp',false);
 execute 'set local role service_role';
 declarations:=jsonb_build_object('availabilityMode','manual','replyHours',48,'listingPermission',true,
  'imageRights',true,'publicImagePermission',true,'aiReferencePermission',false,'pricesConfirmed',true,
  'termsConfirmed',true,'terms','Fictional fixture terms only','notes','Test only');
 perform public.review_supplier_range(supplier_id,0,vendor_id,'submit',declarations);
 perform public.review_supplier_range(supplier_id,1,staff_id,'approve','{}');
 insert into public.orders(id,owner_id,couple_name,email,wedding_date,subtotal_pence,commission_pence,deposit_pence,status)
  values(order_id,customer_id,'Fixture customer','test@example.invalid',current_date+90,10000,0,0,'requested');
 insert into public.order_lines(order_id,product_id,supplier_id,product_name,supplier_name,unit_price_pence,quantity,
  line_total_pence,supplier_status,needed_date,return_date)
  values(order_id,product_id,supplier_id,'Fixture','Fixture supplier',10000,1,10000,'pending',current_date+90,current_date+90);
 reply:=jsonb_build_object('response','available','mode','supplier_setup','deliveryPence',0,'setupPence',0,
  'collectionPence',0,'extraPence',0,'securityPence',0,'prepDays',0,'returnBufferDays',0,'systemChecked',true,
  'siteChecked',true,'sharedStockChecked',true,'pricesIncludeVat',true,'terms','Fictional quote terms','note','Test');
 perform public.change_booking_workflow(order_id,0,vendor_id,'reply',jsonb_build_object('supplierId',supplier_id,'reply',reply));

 -- Reproduce the audit: deactivate ONLY the supplier; its product remains active.
 update public.suppliers set active=false where id=supplier_id;
 if not (select active from public.products where id=product_id) then raise exception 'TEST: product unexpectedly deactivated';end if;
 select count(*) into notices from public.booking_notifications where booking_notifications.order_id=order_id;
 begin
  perform public.change_booking_workflow(order_id,1,staff_id,'issue',jsonb_build_object('expiresAt',now()+interval '7 days'));
  raise exception 'TEST: issued a quote for an unpublished supplier';
 exception when others then
  if sqlerrm<>'A supplier is no longer published. Request a fresh supplier review' then raise;end if;
 end;
 if exists(select 1 from public.booking_quotes where booking_quotes.order_id=order_id) or
    (select revision from public.booking_workflows where booking_workflows.order_id=order_id)<>1 or
    (select phase from public.booking_workflows where booking_workflows.order_id=order_id)<>'review' or
    (select count(*) from public.booking_notifications where booking_notifications.order_id=order_id)<>notices then
  raise exception 'TEST: failed quote issue persisted partial changes';
 end if;
 -- No rejection for a published supplier: normal issue and acceptance still work.
 update public.suppliers set active=true where id=supplier_id;
 perform public.change_booking_workflow(order_id,1,staff_id,'issue',jsonb_build_object('expiresAt',now()+interval '7 days'));
 select current_quote_id into quote_id from public.booking_workflows where booking_workflows.order_id=order_id;
 perform public.change_booking_workflow(order_id,2,customer_id,'accept',jsonb_build_object('quoteId',quote_id,'reviewed',true));
 perform public.change_booking_workflow(order_id,3,staff_id,'handover',jsonb_build_object('handover',jsonb_build_object(
  'contractParty','supplier','confirmationReference','Fictional reference','paymentArrangement','Offline fixture only',
  'cancellationTerms','Fictional terms only')));
 update public.suppliers set active=false where id=supplier_id;
 select count(*) into notices from public.booking_notifications where booking_notifications.order_id=order_id;
 begin
  perform public.change_booking_workflow(order_id,4,staff_id,'confirm','{}');
  raise exception 'TEST: confirmed a booking with an unpublished supplier';
 exception when others then
  if sqlerrm<>'A supplier is no longer published. Request a fresh supplier review' then raise;end if;
 end;
 if (select status from public.orders where id=order_id)<>'requested' or
    (select status from public.booking_quotes where id=quote_id)<>'accepted' or
    (select revision from public.booking_workflows where booking_workflows.order_id=order_id)<>4 or
    (select phase from public.booking_workflows where booking_workflows.order_id=order_id)<>'accepted' or
    (select count(*) from public.booking_notifications where booking_notifications.order_id=order_id)<>notices then
  raise exception 'TEST: failed confirmation persisted partial changes';
 end if;
 update public.suppliers set active=true where id=supplier_id;
 perform public.change_booking_workflow(order_id,4,staff_id,'confirm','{}');
 if (select status from public.orders where id=order_id)<>'confirmed' or
    (select count(*) from public.booking_notifications where booking_notifications.order_id=order_id and kind='booking_confirmed')<>2 then
  raise exception 'TEST: published supplier could not complete normal confirmation';
 end if;
 if has_function_privilege('authenticated','public.check_booking_supplier_publication(uuid)','execute') or
    has_function_privilege('anon','public.guard_booking_supplier_publication()','execute') then
  raise exception 'TEST: booking guards exposed to public callers';
 end if;
end;$$;
rollback;
