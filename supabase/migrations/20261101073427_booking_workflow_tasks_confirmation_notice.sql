begin;
-- Recheck notice periods inside the same locked transaction as amendments/quotes.
-- No override or supplier terms are invented by this migration.
create or replace function public.change_booking_workflow(p_order uuid,p_revision integer,p_actor uuid,p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare o public.orders;w public.booking_workflows;q public.booking_quotes;c public.booking_claims;s uuid;r jsonb;v_staff boolean;v_owner boolean;v_supplier boolean;v_version integer;v_payload jsonb;v_total bigint;v_security bigint;v_lines jsonb;v_groups jsonb;v_item record;v_start date;v_end date;v_available integer;v_newphase text;v_id uuid;v_price record;v_date jsonb;v_lead_days integer;v_today date := (now() at time zone 'Europe/London')::date;
begin
 select * into o from public.orders where id=p_order for update;
 if not found then raise exception 'Request not found';end if;
 select exists(select 1 from public.staff where user_id=p_actor) into v_staff;
 -- The role-guarded server has verified a real session; service_role has no auth.users SELECT grant.
 v_owner:=o.owner_id=p_actor;
 insert into public.booking_workflows(order_id) values(p_order) on conflict do nothing;
 select * into w from public.booking_workflows where order_id=p_order for update;
 if w.revision<>p_revision then raise exception 'Request changed. Refresh before saving';end if;
 s:=nullif(p_data->>'supplierId','')::uuid;
 v_supplier:=s is not null and exists(select 1 from public.supplier_users where user_id=p_actor and supplier_id=s) and exists(select 1 from public.order_lines where order_id=p_order and supplier_id=s);
 if not v_staff and not v_owner and not v_supplier then raise exception 'Access denied';end if;
 if p_action in ('reply','logistics','issue','accept') and o.status<>'requested' then raise exception 'This request is no longer open';end if;
 perform set_config('styled.booking_write','on',true);
 v_newphase:=w.phase;
 if p_action='reply' then
  if not v_staff and not v_supplier then raise exception 'Supplier access required';end if;
  if s is null or not exists(select 1 from public.order_lines where order_id=p_order and supplier_id=s) then raise exception 'Supplier not on request';end if;
  r:=p_data->'reply';
  if r->>'response' not in ('pending','available','alternative','declined') then raise exception 'Invalid supplier response';end if;
  w.supplier_replies:=jsonb_set(w.supplier_replies,array[s::text],r||jsonb_build_object('checkedAt',now(),'recordedBy',p_actor),true);
  update public.order_lines set supplier_status=case r->>'response' when 'available' then 'confirmed' when 'declined' then 'declined' else 'pending' end,supplier_note=r->>'note',supplier_decided_at=now() where order_id=p_order and supplier_id=s;
  update public.order_lines set stock_start=coalesce(needed_date,o.wedding_date)-coalesce((r->>'prepDays')::integer,0),stock_end=coalesce(return_date,o.wedding_date)+coalesce((r->>'returnBufferDays')::integer,0) where order_id=p_order and supplier_id=s;
  for v_price in select key,value from jsonb_each(coalesce(r->'unitPrices','{}')) loop
   if not exists(select 1 from public.order_lines where id=v_price.key::uuid and order_id=p_order and supplier_id=s) or (v_price.value::text)::integer<0 then raise exception 'Quoted item price is outside this supplier request';end if;
   update public.order_lines set unit_price_pence=(v_price.value::text)::integer,line_total_pence=(v_price.value::text)::integer*quantity where id=v_price.key::uuid and order_id=p_order and supplier_id=s;
  end loop;
  update public.orders set subtotal_pence=(select sum(line_total_pence) from public.order_lines where order_id=p_order),deposit_pence=least(deposit_pence,(select sum(line_total_pence) from public.order_lines where order_id=p_order)) where id=p_order;
  v_newphase:='review';
 elsif p_action='logistics' then
  if not v_staff and not v_owner then raise exception 'Customer or staff access required';end if;
  for v_date in select value from jsonb_array_elements(coalesce(p_data->'itemDates','[]')) loop
   if not exists(select 1 from public.order_lines where order_id=p_order and id=(v_date->>'id')::uuid) then raise exception 'Item is not on this request';end if;
   v_start:=(v_date->>'start')::date;v_end:=(v_date->>'end')::date;
   if v_start is null or v_end is null or v_start<current_date or v_end<v_start or v_end-v_start>31 or v_end>current_date+1825 then raise exception 'Choose valid future item hire dates within a 31-day period';end if;
   select greatest(coalesce(lead_time_days,0),0) into v_lead_days from public.products
    where id=(select product_id from public.order_lines where id=(v_date->>'id')::uuid and order_id=p_order) for share;
   if v_start < v_today + v_lead_days then raise exception 'Hire starts before the supplier notice period. Choose a later date';end if;
   update public.order_lines set needed_date=v_start,return_date=v_end where order_id=p_order and id=(v_date->>'id')::uuid;
  end loop;
  w.logistics:=p_data->'logistics';w.supplier_replies:='{}';v_newphase:='review';
  update public.order_lines set supplier_status='pending',supplier_decided_at=null,stock_start=null,stock_end=null where order_id=p_order;
 elsif p_action='issue' then
  perform public.check_booking_venue_policy(p_order);
  if not v_staff then raise exception 'Staff access required';end if;
  if exists(select 1 from public.order_lines where order_id=p_order and (supplier_id is null or supplier_status<>'confirmed')) or not exists(select 1 from public.order_lines where order_id=p_order) then raise exception 'All supplier availability replies are required';end if;
  if (p_data->>'expiresAt')::timestamptz<=now() or (p_data->>'expiresAt')::timestamptz>now()+interval '30 days' then raise exception 'Choose a quote expiry within 30 days';end if;
  for s in select distinct supplier_id from public.order_lines where order_id=p_order loop
   r:=w.supplier_replies->s::text;
   if r is null or r->>'response'<>'available' or not coalesce((r->>'systemChecked')::boolean,false) or not coalesce((r->>'siteChecked')::boolean,false) or not coalesce((r->>'sharedStockChecked')::boolean,false) or not coalesce((r->>'pricesIncludeVat')::boolean,false) or length(trim(coalesce(r->>'terms','')))<3 then raise exception 'Supplier checks, full fees and terms are required';end if;
   if exists(select 1 from unnest(array['deliveryPence','setupPence','collectionPence','extraPence','securityPence']) k where r->>k is null or (r->>k)::numeric<0 or (r->>k)::numeric>100000000) then raise exception 'Complete every fee and refundable security amount';end if;
   if exists(select 1 from public.suppliers sp where sp.id=s and sp.service_details->>'minimumOrder' ~ '^\d+(\.\d{1,2})?$' and (sp.service_details->>'minimumOrder')::numeric*100>(select sum(line_total_pence) from public.order_lines where order_id=p_order and supplier_id=s)) then raise exception 'Supplier item minimum is not met';end if;
  end loop;
  -- Product locks match the existing create_order transaction ordering.
  perform 1 from public.products where id in(select product_id from public.order_lines where order_id=p_order) order by id for update;
  for v_item in select l.*,coalesce((w.supplier_replies->l.supplier_id::text->>'prepDays')::integer,0) prep,coalesce((w.supplier_replies->l.supplier_id::text->>'returnBufferDays')::integer,0) buffer from public.order_lines l where order_id=p_order loop
   v_start:=coalesce(v_item.needed_date,o.wedding_date)-v_item.prep;v_end:=coalesce(v_item.return_date,o.wedding_date)+v_item.buffer;
   if v_start is null or v_start<current_date or v_end<v_start or v_end-v_start>59 then raise exception 'Review hire dates and stock buffers';end if;
   if not exists(select 1 from public.products where id=v_item.product_id and active) then raise exception 'A product is no longer published';end if;
   if coalesce(v_item.needed_date,o.wedding_date) < v_today + (select greatest(coalesce(lead_time_days,0),0) from public.products where id=v_item.product_id) then
    raise exception 'Hire starts before the supplier notice period. Choose a later date';
   end if;
   select available into v_available from public.product_availability_range(array[v_item.product_id],v_start,v_end,p_order);
   if not found or (v_available is not null and v_available<v_item.quantity) then raise exception 'Stock changed. Review the full buffered hire period';end if;
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'productId',l.product_id,'supplierId',l.supplier_id,'supplier',l.supplier_name,'name',l.product_name,'quantity',l.quantity,'unitPricePence',l.unit_price_pence,'lineTotalPence',l.line_total_pence,'start',coalesce(l.needed_date,o.wedding_date),'end',coalesce(l.return_date,o.wedding_date)) order by l.id),'[]'),sum(l.line_total_pence) into v_lines,v_total from public.order_lines l where l.order_id=p_order;
  select jsonb_agg(jsonb_build_object('supplierId',key,'reply',value-'recordedBy')) into v_groups from jsonb_each(w.supplier_replies) where key in(select supplier_id::text from public.order_lines where order_id=p_order);
  select coalesce(sum((value->>'deliveryPence')::bigint+(value->>'setupPence')::bigint+(value->>'collectionPence')::bigint+(value->>'extraPence')::bigint),0)+v_total,coalesce(sum((value->>'securityPence')::bigint),0) into v_total,v_security from jsonb_each(w.supplier_replies) where key in(select supplier_id::text from public.order_lines where order_id=p_order);
  if v_total>50000000 or v_security>50000000 then raise exception 'Quote exceeds online review limit';end if;
  select coalesce(max(version),0)+1 into v_version from public.booking_quotes where order_id=p_order;
  update public.booking_quotes set status='superseded' where order_id=p_order and status in ('issued','accepted');
  v_payload:=jsonb_build_object('reference',o.reference,'venue',o.venue_label,'eventDate',o.wedding_date,'logistics',w.logistics,'lines',v_lines,'suppliers',v_groups,'totalPence',v_total,'securityPence',v_security,'pricesIncludeVat',true,'paymentCollectionEnabled',false);
  insert into public.booking_quotes(order_id,version,payload,expires_at,created_by) values(p_order,v_version,v_payload,(p_data->>'expiresAt')::timestamptz,p_actor) returning id into w.current_quote_id;
  v_newphase:='quoted';
  insert into public.booking_notifications(order_id,audience,kind,dedupe_key) values(p_order,'customer','quote_ready',p_order||':quote:'||v_version) on conflict do nothing;
 elsif p_action='accept' then
  if not v_owner or p_data->>'reviewed'<>'true' then raise exception 'The customer must review and accept their quote';end if;
  select * into q from public.booking_quotes where id=w.current_quote_id for update;
  if w.phase<>'quoted' or q.id is null or q.id::text<>p_data->>'quoteId' or q.status<>'issued' or q.expires_at<=now() then raise exception 'Quote changed or expired. Request a fresh quote';end if;
  update public.booking_quotes set status='accepted',accepted_at=now(),accepted_by=p_actor where id=q.id;
  v_newphase:='accepted';
  insert into public.booking_notifications(order_id,audience,kind,dedupe_key) values(p_order,'staff','quote_accepted',p_order||':accepted:'||q.version) on conflict do nothing;
 elsif p_action='handover' then
  if not v_staff then raise exception 'Staff access required';end if;
  w.handover:=p_data->'handover';
 elsif p_action='confirm' then
  perform public.check_booking_venue_policy(p_order);
  if not v_staff or w.phase<>'accepted' then raise exception 'Current customer acceptance is required';end if;
  if coalesce(w.handover->>'contractParty','undecided') not in ('supplier','styled') or length(coalesce(w.handover->>'confirmationReference',''))<3 or length(coalesce(w.handover->>'paymentArrangement',''))<3 or length(coalesce(w.handover->>'cancellationTerms',''))<3 then raise exception 'Record agreed contract, payment and cancellation arrangements first';end if;
  select * into q from public.booking_quotes where id=w.current_quote_id;
  if q.status<>'accepted' or q.expires_at<=now() then raise exception 'Quote needs renewed customer acceptance';end if;
  perform 1 from public.products where id in(select product_id from public.order_lines where order_id=p_order) order by id for update;
  for v_item in select l.*,coalesce((w.supplier_replies->l.supplier_id::text->>'prepDays')::integer,0) prep,coalesce((w.supplier_replies->l.supplier_id::text->>'returnBufferDays')::integer,0) buffer from public.order_lines l where order_id=p_order loop
   if not exists(select 1 from public.products where id=v_item.product_id and active) then raise exception 'A product is no longer published';end if;
   if v_item.supplier_status<>'confirmed' then raise exception 'Supplier availability changed';end if;
   select available into v_available from public.product_availability_range(array[v_item.product_id],coalesce(v_item.needed_date,o.wedding_date)-v_item.prep,coalesce(v_item.return_date,o.wedding_date)+v_item.buffer,p_order);
   if not found or (v_available is not null and v_available<v_item.quantity) then raise exception 'Stock changed. A new supplier review is needed';end if;
  end loop;
  update public.orders set status='confirmed',decided_at=now(),decided_by=p_actor where id=p_order;
  v_newphase:='confirmed';
  -- Rows commit or roll back together with the final booking. Stable keys make
  -- each recipient audience unique even if a confirmation is retried.
  insert into public.booking_notifications(order_id,audience,kind,dedupe_key)
   values(p_order,'customer','booking_confirmed',p_order||':confirmed:customer') on conflict(dedupe_key) do nothing;
  insert into public.booking_notifications(order_id,supplier_id,audience,kind,dedupe_key)
   select p_order,supplier_id,'supplier','booking_confirmed',p_order||':confirmed:supplier:'||supplier_id
   from public.order_lines where order_id=p_order and supplier_id is not null group by supplier_id
   on conflict(dedupe_key) do nothing;
 elsif p_action='cancel_request' then
  if not v_owner or length(coalesce(p_data->>'reason',''))<3 then raise exception 'Customer cancellation reason required';end if;
  w.cancellation_request:=p_data->>'reason';
  insert into public.booking_notifications(order_id,audience,kind,dedupe_key) values(p_order,'staff','cancellation_request',p_order||':cancel-request:'||w.revision) on conflict do nothing;
 elsif p_action='claim' then
  if not v_staff and not v_supplier then raise exception 'Supplier or staff access required';end if;
  if o.status not in ('confirmed','deposit_paid') then raise exception 'Claims require a recorded booking';end if;
  if s is null or not exists(select 1 from public.order_lines where order_id=p_order and supplier_id=s) then raise exception 'Supplier not on booking';end if;
  if length(coalesce(p_data->>'evidence',''))<10 or (p_data->>'amountPence')::integer<0 or p_data->>'kind' not in ('damage','late_return','missing') then raise exception 'Record a valid claim amount and condition evidence';end if;
  insert into public.booking_claims(order_id,supplier_id,kind,amount_pence,evidence,created_by) values(p_order,s,p_data->>'kind',(p_data->>'amountPence')::integer,p_data->>'evidence',p_actor);
 elsif p_action='claim_update' then
  select * into c from public.booking_claims where id=(p_data->>'claimId')::uuid and order_id=p_order for update;
  if not found then raise exception 'Claim not found';end if;
  if p_data->>'status'='disputed' then
   if not v_owner or c.status<>'notified' or length(coalesce(p_data->>'note',''))<3 then raise exception 'A notified customer can record a dispute';end if;
   update public.booking_claims set status='disputed',customer_response=p_data->>'note',updated_at=now() where id=c.id;
  else
   if not v_staff or not ((c.status='reported' and p_data->>'status'='notified') or (c.status in ('notified','disputed') and p_data->>'status'='resolved')) then raise exception 'Review the report, then notify, then resolve';end if;
   if length(coalesce(p_data->>'note',''))<3 then raise exception 'Record the explanation or resolution';end if;
   update public.booking_claims set status=p_data->>'status',resolution=p_data->>'note',updated_at=now() where id=c.id;
   if p_data->>'status'='notified' then insert into public.booking_notifications(order_id,audience,kind,dedupe_key) values(p_order,'customer','claim_review',p_order||':claim:'||c.id) on conflict do nothing;end if;
  end if;
 else raise exception 'Unknown workflow action';end if;
 if p_action in ('reply','logistics') then update public.booking_quotes set status='superseded' where order_id=p_order and status in ('issued','accepted');w.current_quote_id:=null;end if;
 update public.booking_workflows set revision=revision+1,phase=v_newphase,logistics=w.logistics,supplier_replies=w.supplier_replies,current_quote_id=w.current_quote_id,handover=w.handover,cancellation_request=w.cancellation_request,updated_at=now() where order_id=p_order;
 insert into public.order_events(order_id,actor_id,actor_label,type,detail) values(p_order,p_actor,coalesce(p_data->>'actorLabel',p_actor::text),'workflow_'||p_action,jsonb_build_object('supplierId',s,'revision',w.revision+1));
 return jsonb_build_object('ok',true,'revision',w.revision+1);
end;$$;
revoke all on function public.change_booking_workflow(uuid,integer,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.change_booking_workflow(uuid,integer,uuid,text,jsonb) to service_role;

commit;
