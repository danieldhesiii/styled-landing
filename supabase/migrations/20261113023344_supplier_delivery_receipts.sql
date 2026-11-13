-- A provider receipt is transport evidence, never permission to approve an order.
alter table public.supplier_order_notices add column reply_due_at timestamptz,
 add column part_count integer check(part_count between 1 and 1000);
create function public.stamp_order_reply_target() returns trigger language plpgsql set search_path='' as $$
begin
 select new.created_at + make_interval(hours=>s.message_reply_hours) into new.reply_due_at
 from public.suppliers s where s.id=new.supplier_id;
 return new;
end $$;
create trigger stamp_order_reply_target before insert on public.supplier_order_notices
for each row execute function public.stamp_order_reply_target();
revoke all on function public.stamp_order_reply_target() from public,anon,authenticated;

create table public.order_phone_parts(
 notice_id uuid not null references public.supplier_order_notices(id) on delete cascade,
 part integer not null check(part>=0), message_sid text unique not null check(message_sid ~ '^SM[0-9a-fA-F]{32}$'),
 state text not null check(state in ('accepted','delivered','failed')), primary key(notice_id,part)
);
alter table public.order_phone_parts enable row level security;
revoke all on public.order_phone_parts from public,anon,authenticated;
grant all on public.order_phone_parts to service_role;
create function public.record_order_phone_part(p_notice uuid,p_part integer,p_sid text,p_state text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select from public.supplier_order_notices where id=p_notice and sent_version is not null and p_part>=0 and p_part<part_count)
 then raise exception 'No matching send';end if;
 insert into public.order_phone_parts as current(notice_id,part,message_sid,state)
 values(p_notice,p_part,p_sid,p_state)
 on conflict(notice_id,part) do update set state=case
 when current.state='delivered' or excluded.state='delivered' then 'delivered'
 when current.state='failed' or excluded.state='failed' then 'failed' else 'accepted' end
 where current.message_sid=excluded.message_sid;
 if not found then raise exception 'Message mismatch';end if;
end $$;
revoke all on function public.record_order_phone_part(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function public.record_order_phone_part(uuid,integer,text,text) to service_role;
