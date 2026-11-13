-- One durable inbox entry per order and supplier. Only enrolled recipients get a phone delivery.
create table public.supplier_whatsapp_recipients (
 supplier_id uuid primary key references public.suppliers on delete cascade,
 phone text not null unique check (phone ~ '^\+[1-9][0-9]{7,14}$'),
 verified_at timestamptz not null default now()
);
create table public.supplier_order_notices (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders on delete cascade,
 supplier_id uuid not null references public.suppliers on delete cascade,
 code text unique not null default upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)),
 recipient text, sent_version text, approval_used boolean not null default false, delivery text not null default 'portal_only',
 created_at timestamptz not null default now(), unique(order_id,supplier_id)
);
create index supplier_order_notices_inbox on public.supplier_order_notices(supplier_id,created_at desc);
alter table public.supplier_whatsapp_recipients enable row level security;
alter table public.supplier_order_notices enable row level security;
revoke all on public.supplier_whatsapp_recipients,public.supplier_order_notices from public,anon,authenticated;
grant all on public.supplier_whatsapp_recipients,public.supplier_order_notices to service_role;
create function public.enqueue_supplier_order_notice() returns trigger language plpgsql security definer set search_path='' as $$
declare destination text;
begin
 if new.supplier_id is not null then
  select phone into destination from public.supplier_whatsapp_recipients where supplier_id=new.supplier_id;
  insert into public.supplier_order_notices(order_id,supplier_id,recipient,delivery)
  values(new.order_id,new.supplier_id,destination,case when destination is null then 'portal_only' else 'queued' end)
  on conflict(order_id,supplier_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.enqueue_supplier_order_notice() from public,anon,authenticated;
create trigger supplier_order_notice after insert on public.order_lines for each row execute function public.enqueue_supplier_order_notice();

create view public.supplier_order_inbox with (security_invoker=true) as
select n.id,n.order_id,n.supplier_id,n.created_at, o.reference,
 concat_ws(chr(10), 'Styled request '||o.reference,'Customer: '||o.couple_name,'Phone: '||coalesce(nullif(o.phone,''),'Not supplied'),
 'Event: '||coalesce(o.wedding_date::text,'To agree'),'Venue: '||coalesce(nullif(o.venue_label,''),'To agree'),items.summary,
 'Notes: '||nullif(o.notes,'')) as summary,
 md5(jsonb_build_array(o.wedding_date,o.venue_label,o.notes,o.couple_name,o.phone,items.details)::text) as version,
 case when o.status<>'requested' then o.status when items.declined then 'needs_review'
 when items.pending then 'awaiting_approval' else 'availability_confirmed' end as status
from public.supplier_order_notices n join public.orders o on o.id=n.order_id
cross join lateral (select string_agg(l.quantity||' × '||l.product_name||' ('||
 coalesce(l.needed_date::text,o.wedding_date::text,'To agree')||' to '||coalesce(l.return_date::text,o.wedding_date::text,'To agree')||')',chr(10) order by l.id) summary,
 jsonb_agg(jsonb_build_array(l.id,l.quantity,l.product_name,l.needed_date,l.return_date,l.unit_price_pence) order by l.id) details,
 bool_or(l.supplier_status='pending') pending,bool_or(l.supplier_status='declined') declined
 from public.order_lines l where l.order_id=n.order_id and l.supplier_id=n.supplier_id having count(*)>0) items;
revoke all on public.supplier_order_inbox from public,anon,authenticated;
grant select on public.supplier_order_inbox to service_role;

create function public.approve_supplier_order_notice(p_notice uuid,p_supplier uuid,p_version text,p_actor uuid,p_channel text)
returns text language plpgsql set search_path='' as $$
declare n public.supplier_order_notices; current_view public.supplier_order_inbox;
begin
 select * into strict n from public.supplier_order_notices where id=p_notice and supplier_id=p_supplier for update;
 if p_channel='portal' then
  if not exists(select from public.supplier_users where user_id=p_actor and supplier_id=p_supplier) then raise exception 'Access denied'; end if;
 elsif p_channel='whatsapp' then
  if n.delivery not in ('sending','sent','unknown') or n.sent_version is distinct from p_version or not exists
   (select from public.supplier_whatsapp_recipients where supplier_id=p_supplier and phone=n.recipient)
  then raise exception 'Phone delivery expired'; end if;
 else raise exception 'Invalid channel'; end if;
 perform 1 from public.orders where id=n.order_id for update;
 perform 1 from public.order_lines where order_id=n.order_id and supplier_id=p_supplier order by id for update;
 select * into strict current_view from public.supplier_order_inbox where id=p_notice;
 if current_view.version is distinct from p_version then return 'changed'; end if;
 if current_view.status <> 'awaiting_approval' then return current_view.status; end if;
 if p_channel='whatsapp' and n.approval_used then return 'changed'; end if;
 update public.supplier_order_notices set approval_used=true where id=n.id;
 update public.order_lines set supplier_status='confirmed',supplier_decided_at=now()
 where order_id=n.order_id and supplier_id=p_supplier and supplier_status='pending';
 insert into public.order_events(order_id,actor_id,actor_label,type,detail) values(n.order_id,p_actor,p_channel,'line_confirmed',
 jsonb_build_object('by','supplier','supplier_id',p_supplier,'channel',p_channel));
 return 'availability_confirmed';
end $$;
revoke all on function public.approve_supplier_order_notice(uuid,uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.approve_supplier_order_notice(uuid,uuid,text,uuid,text) to service_role;
