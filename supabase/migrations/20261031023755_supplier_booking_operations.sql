begin;
alter table public.order_lines add column stock_start date,add column stock_end date;

create table public.booking_workflows (
 order_id uuid primary key references public.orders(id) on delete cascade,
 revision integer not null default 0,
 phase text not null default 'review' check(phase in ('review','quoted','accepted','confirmed','cancelled')),
 logistics jsonb not null default '{}', supplier_replies jsonb not null default '{}',
 current_quote_id uuid, handover jsonb not null default '{}', cancellation_request text,
 updated_at timestamptz not null default now()
);
create table public.booking_quotes (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,
 version integer not null,status text not null default 'issued' check(status in ('issued','accepted','superseded','withdrawn')),
 payload jsonb not null,expires_at timestamptz not null,created_at timestamptz not null default now(),
 created_by uuid references auth.users(id),accepted_at timestamptz,accepted_by uuid references auth.users(id),
 unique(order_id,version)
);
alter table public.booking_workflows add constraint booking_current_quote_fk foreign key(current_quote_id) references public.booking_quotes(id);
create table public.booking_claims (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,
 supplier_id uuid not null references public.suppliers(id),kind text not null check(kind in ('damage','late_return','missing')),
 status text not null default 'reported' check(status in ('reported','notified','disputed','resolved')),
 amount_pence integer not null check(amount_pence>=0 and amount_pence<=100000000),evidence text not null,
 resolution text,customer_response text,created_by uuid references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.booking_notifications (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id) on delete cascade,
 supplier_id uuid references public.suppliers(id),audience text not null check(audience in ('supplier','customer','staff')),
 kind text not null,status text not null default 'queued' check(status in ('queued','sending','provider_accepted','failed','blocked','unknown')),
 dedupe_key text not null unique,due_at timestamptz not null default now(),attempts integer not null default 0,last_error text,attempted_at timestamptz,created_at timestamptz not null default now()
);
create index booking_quotes_order_idx on public.booking_quotes(order_id,version desc);
create index booking_claims_order_idx on public.booking_claims(order_id,created_at);
create index booking_notifications_queue_idx on public.booking_notifications(status,created_at);
create index booking_notifications_order_idx on public.booking_notifications(order_id,created_at);
alter table public.booking_workflows enable row level security;
alter table public.booking_quotes enable row level security;
alter table public.booking_claims enable row level security;
alter table public.booking_notifications enable row level security;
revoke all on public.booking_workflows,public.booking_quotes,public.booking_claims,public.booking_notifications from anon,authenticated;
grant select,insert,update,delete on public.booking_workflows,public.booking_quotes,public.booking_claims,public.booking_notifications to service_role;

-- Internal transaction boundary. Only the server service role can execute it.
create function public.change_booking_workflow(p_order uuid,p_revision integer,p_actor uuid,p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare o public.orders;w public.booking_workflows;q public.booking_quotes;c public.booking_claims;s uuid;r jsonb;v_staff boolean;v_owner boolean;v_supplier boolean;v_version integer;v_payload jsonb;v_total bigint;v_security bigint;v_lines jsonb;v_groups jsonb;v_item record;v_start date;v_end date;v_available integer;v_newphase text;v_id uuid;
begin
 select * into o from public.orders where id=p_order for update;
 if not found then raise exception 'Request not found';end if;
 select exists(select 1 from public.staff where user_id=p_actor) into v_staff;
 v_owner:=o.owner_id=p_actor and exists(select 1 from auth.users where id=p_actor and not coalesce(is_anonymous,false));
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
  v_newphase:='review';
 elsif p_action='logistics' then
  if not v_staff and not v_owner then raise exception 'Customer or staff access required';end if;
  w.logistics:=p_data->'logistics';w.supplier_replies:='{}';v_newphase:='review';
  update public.order_lines set supplier_status='pending',supplier_decided_at=null,stock_start=null,stock_end=null where order_id=p_order;
 elsif p_action='issue' then
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
  if not v_staff or w.phase<>'accepted' then raise exception 'Current customer acceptance is required';end if;
  if coalesce(w.handover->>'contractParty','undecided') not in ('supplier','styled') or length(coalesce(w.handover->>'confirmationReference',''))<3 or length(coalesce(w.handover->>'paymentArrangement',''))<3 or length(coalesce(w.handover->>'cancellationTerms',''))<3 then raise exception 'Record agreed contract, payment and cancellation arrangements first';end if;
  select * into q from public.booking_quotes where id=w.current_quote_id;
  if q.status<>'accepted' or q.expires_at<=now() then raise exception 'Quote needs renewed customer acceptance';end if;
  perform 1 from public.products where id in(select product_id from public.order_lines where order_id=p_order) order by id for update;
  for v_item in select l.*,coalesce((w.supplier_replies->l.supplier_id::text->>'prepDays')::integer,0) prep,coalesce((w.supplier_replies->l.supplier_id::text->>'returnBufferDays')::integer,0) buffer from public.order_lines l where order_id=p_order loop
   if v_item.supplier_status<>'confirmed' then raise exception 'Supplier availability changed';end if;
   select available into v_available from public.product_availability_range(array[v_item.product_id],coalesce(v_item.needed_date,o.wedding_date)-v_item.prep,coalesce(v_item.return_date,o.wedding_date)+v_item.buffer,p_order);
   if not found or (v_available is not null and v_available<v_item.quantity) then raise exception 'Stock changed. A new supplier review is needed';end if;
  end loop;
  update public.orders set status='confirmed',decided_at=now(),decided_by=p_actor where id=p_order;
  v_newphase:='confirmed';
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
 insert into public.order_events(order_id,actor_id,actor_label,type,detail) values(p_order,p_actor,(select email from auth.users where id=p_actor),'workflow_'||p_action,jsonb_build_object('supplierId',s,'revision',w.revision+1));
 return jsonb_build_object('ok',true,'revision',w.revision+1);
end;$$;
revoke all on function public.change_booking_workflow(uuid,integer,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.change_booking_workflow(uuid,integer,uuid,text,jsonb) to service_role;

-- Existing line-response endpoints must also invalidate previously issued quotes.
create function public.invalidate_booking_quote() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if current_setting('styled.booking_write',true)='on' then return new;end if;
 if row(new.supplier_status,new.quantity,new.unit_price_pence,new.needed_date,new.return_date) is distinct from row(old.supplier_status,old.quantity,old.unit_price_pence,old.needed_date,old.return_date) then
  perform 1 from public.orders where id=new.order_id for update;
  if exists(select 1 from public.orders where id=new.order_id and status<>'requested') then raise exception 'Booking details need an agreed change process';end if;
  update public.booking_quotes set status='superseded' where order_id=new.order_id and status in ('issued','accepted');
  update public.booking_workflows set revision=revision+1,phase='review',current_quote_id=null,supplier_replies=supplier_replies-new.supplier_id::text,updated_at=now() where order_id=new.order_id;
 end if;return new;
end;$$;
create trigger booking_line_quote_guard before update on public.order_lines for each row execute function public.invalidate_booking_quote();
revoke all on function public.invalidate_booking_quote() from public,anon,authenticated;
create function public.guard_booking_confirmation() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.status='confirmed' and old.status is distinct from new.status and current_setting('styled.booking_write',true) is distinct from 'on' then raise exception 'Use the saved quote workflow after customer acceptance to record a booking';end if;
 if new.status in ('cancelled','declined') and new.status is distinct from old.status then
  update public.booking_quotes set status='withdrawn' where order_id=new.id and status in ('issued','accepted');
  update public.booking_workflows set phase='cancelled',revision=revision+1,updated_at=now() where order_id=new.id;
 end if;return new;
end;$$;
create trigger booking_confirmation_guard before update of status on public.orders for each row execute function public.guard_booking_confirmation();
revoke all on function public.guard_booking_confirmation() from public,anon,authenticated;
create or replace function public.product_availability(
  p_product_ids text[],
  p_day date,
  p_exclude_order uuid default null
)
returns table (
  product_id text,
  capacity integer,
  effective_capacity integer,
  reserved integer,
  available integer
)
language sql
stable
set search_path = ''
as $$
  with t as (
    select
      p.id,
      p.capacity,
      case
        when exists (select 1 from public.availability_overrides a
                     where a.supplier_id = p.supplier_id and a.day = p_day and a.blocked) then 0
        when exists (select 1 from public.availability_overrides a
                     where a.product_id = p.id and a.day = p_day and a.blocked) then 0
        when p.capacity is null then null
        else coalesce(
          (select a.units_available from public.availability_overrides a
           where a.product_id = p.id and a.day = p_day and not a.blocked),
          p.capacity)
      end as effective_capacity,
      coalesce((
        select sum(l.quantity)::integer
        from public.order_lines l
        join public.orders o on o.id = l.order_id
        where l.product_id = p.id
          and p_day between coalesce(l.stock_start,l.needed_date, o.wedding_date) and coalesce(l.stock_end,l.return_date, o.wedding_date)
          and o.status in ('requested', 'confirmed', 'deposit_paid')
          and l.supplier_status <> 'declined'
          and (p_exclude_order is null or o.id <> p_exclude_order)
      ), 0) as reserved
    from public.products p
    where p.id = any (p_product_ids)
  )
  select
    t.id,
    t.capacity,
    t.effective_capacity,
    t.reserved,
    case when t.effective_capacity is null then null
         else greatest(t.effective_capacity - t.reserved, 0) end
  from t;
$$;
revoke all on function public.product_availability(text[], date, uuid) from public, anon, authenticated;
grant execute on function public.product_availability(text[], date, uuid) to service_role;

create table public.supplier_reviews (
 supplier_id uuid primary key references public.suppliers(id) on delete cascade,revision integer not null default 0,
 state text not null default 'draft' check(state in ('draft','submitted','changes','approved')),
 declarations jsonb not null default '{}',snapshot jsonb not null default '{}',feedback text,
 submitted_by uuid references auth.users(id),submitted_at timestamptz,reviewed_by uuid references auth.users(id),reviewed_at timestamptz,updated_at timestamptz not null default now()
);
create table public.supplier_review_assets (
 id uuid primary key default gen_random_uuid(),supplier_id uuid not null references public.suppliers(id) on delete cascade,
 product_id text not null references public.products(id) on delete cascade,path text not null unique,approved boolean not null default false,created_at timestamptz not null default now()
);
create index supplier_review_assets_supplier_idx on public.supplier_review_assets(supplier_id);
alter table public.supplier_reviews enable row level security;
alter table public.supplier_review_assets enable row level security;
revoke all on public.supplier_reviews,public.supplier_review_assets from anon,authenticated;
grant select,insert,update,delete on public.supplier_reviews,public.supplier_review_assets to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('supplier-review-assets','supplier-review-assets',false,5242880,array['image/webp']) on conflict(id) do nothing;
create function public.review_supplier_range(p_supplier uuid,p_revision integer,p_actor uuid,p_action text,p_data jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
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
  if p_action='submit' and (coalesce(p_data->>'listingPermission','false')<>'true' or coalesce(p_data->>'imageRights','false')<>'true' or coalesce(p_data->>'pricesConfirmed','false')<>'true' or coalesce(p_data->>'termsConfirmed','false')<>'true' or length(coalesce(p_data->>'terms',''))<10 or (p_data->>'replyHours')::integer not between 1 and 168) then raise exception 'Confirm listing, photos, prices, terms and response target before submitting';end if;
  if p_action='submit' and not exists(select 1 from public.products where supplier_id=p_supplier) then raise exception 'Add your starting products first';end if;
  select coalesce(jsonb_agg(to_jsonb(p)-array['created_at','updated_at','active','capacity','stock','sort_order'] order by p.id),'[]') into v_products from public.products p where supplier_id=p_supplier;
  update public.supplier_reviews set revision=revision+1,state=case when p_action='submit' then 'submitted' else 'draft' end,declarations=p_data,snapshot=jsonb_build_object('supplier',to_jsonb(sp)-array['created_at','active','onboarding_availability_confirmed_at','ical_url','ical_synced_at','commission_rate'],'products',v_products),submitted_by=p_actor,submitted_at=case when p_action='submit' then now() else null end,reviewed_at=null,feedback=null,updated_at=now() where supplier_id=p_supplier;
 elsif p_action='changes' then
  if not v_staff or v.state<>'submitted' or length(coalesce(p_data->>'feedback',''))<3 then raise exception 'Staff feedback is required on a submitted range';end if;
  update public.supplier_reviews set revision=revision+1,state='changes',feedback=p_data->>'feedback',reviewed_by=p_actor,reviewed_at=now(),updated_at=now() where supplier_id=p_supplier;
 elsif p_action='approve' then
  if not v_staff or v.state<>'submitted' then raise exception 'Staff must review a submitted range';end if;
  if not exists(select 1 from public.products where supplier_id=p_supplier) or exists(select 1 from public.products where supplier_id=p_supplier and (image is null or trim(image)='')) then raise exception 'Every starting product needs an approved image';end if;
  select coalesce(jsonb_agg(to_jsonb(p)-array['created_at','updated_at','active','capacity','stock','sort_order'] order by p.id),'[]') into v_products from public.products p where supplier_id=p_supplier;
  if v.snapshot->'products' is distinct from v_products or v.snapshot->'supplier' is distinct from to_jsonb(sp)-array['created_at','active','onboarding_availability_confirmed_at','ical_url','ical_synced_at','commission_rate'] then raise exception 'Supplier details changed. Ask for a fresh submission';end if;
  update public.supplier_reviews set revision=revision+1,state='approved',reviewed_by=p_actor,reviewed_at=now(),feedback=p_data->>'feedback',updated_at=now() where supplier_id=p_supplier;
  update public.supplier_review_assets set approved=true where supplier_id=p_supplier and product_id in(select id from public.products where supplier_id=p_supplier);
  update public.suppliers set active=true where id=p_supplier;
  update public.products set active=true where supplier_id=p_supplier;
 else raise exception 'Unknown review action';end if;
 return jsonb_build_object('ok',true);
end;$$;
revoke all on function public.review_supplier_range(uuid,integer,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.review_supplier_range(uuid,integer,uuid,text,jsonb) to service_role;
create function public.guard_product_publication() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' and (to_jsonb(new)-array['updated_at','active','capacity','stock','sort_order']) is distinct from (to_jsonb(old)-array['updated_at','active','capacity','stock','sort_order']) then
  new.active:=false;
  update public.supplier_reviews set state='draft',revision=revision+1,updated_at=now() where supplier_id=new.supplier_id;
 end if;
 if new.active and (tg_op='INSERT' or not old.active) then
  if not exists(select 1 from public.supplier_reviews r cross join lateral jsonb_array_elements(r.snapshot->'products') p where r.supplier_id=new.supplier_id and r.state='approved' and p=to_jsonb(new)-array['created_at','updated_at','active','capacity','stock','sort_order']) then raise exception 'Product publication requires an approved supplier submission';end if;
 end if;
 return new;
end;$$;
create trigger product_publication_guard before insert or update on public.products for each row execute function public.guard_product_publication();
revoke all on function public.guard_product_publication() from public,anon,authenticated;
create function public.guard_supplier_publication() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if row(new.name,new.area,new.bio,new.logo_url,new.service_details) is distinct from row(old.name,old.area,old.bio,old.logo_url,old.service_details) then
  new.active:=false;update public.supplier_reviews set state='draft',revision=revision+1,updated_at=now() where supplier_id=new.id;
 end if;
 if new.active and not old.active and not exists(select 1 from public.supplier_reviews where supplier_id=new.id and state='approved') then raise exception 'Supplier publication requires an approved submission';end if;
 return new;
end;$$;
create trigger supplier_publication_guard before update on public.suppliers for each row execute function public.guard_supplier_publication();
revoke all on function public.guard_supplier_publication() from public,anon,authenticated;


create function public.queue_booking_request() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.booking_notifications(order_id,supplier_id,audience,kind,dedupe_key)
 select order_id,supplier_id,'supplier','initial_request',order_id||':initial:'||supplier_id from added_lines where supplier_id is not null group by order_id,supplier_id on conflict do nothing;
 insert into public.booking_notifications(order_id,audience,kind,dedupe_key)
 select order_id,'staff','initial_request',order_id||':initial:staff' from added_lines group by order_id on conflict do nothing;
 return null;
end;$$;
create trigger booking_request_queue after insert on public.order_lines referencing new table as added_lines for each statement execute function public.queue_booking_request();
revoke all on function public.queue_booking_request() from public,anon,authenticated;

commit;
