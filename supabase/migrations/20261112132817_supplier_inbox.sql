create table public.supplier_conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id),
  supplier_id uuid not null references public.suppliers(id),
  customer_label text not null check (length(customer_label) between 1 and 100),
  last_body text not null default '',
  last_message_id uuid,
  updated_at timestamptz not null default now(),
  customer_unread boolean not null default false,
  supplier_unread boolean not null default false,
  unique(customer_id,supplier_id)
);
create table public.supplier_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.supplier_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  sender_role text not null check (sender_role in ('customer','supplier')),
  body text not null check(length(trim(body)) between 1 and 4000),
  client_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  unique(sender_id,client_id)
);
create index supplier_inbox_order on public.supplier_conversations(supplier_id,updated_at desc);
create index customer_inbox_order on public.supplier_conversations(customer_id,updated_at desc);
create index supplier_message_history on public.supplier_messages(conversation_id,created_at desc,id);

alter table public.supplier_conversations enable row level security;
alter table public.supplier_messages enable row level security;
revoke all on public.supplier_conversations,public.supplier_messages from anon,authenticated;
grant select on public.supplier_conversations,public.supplier_messages to authenticated;
grant all on public.supplier_conversations,public.supplier_messages to service_role;

create function styled_private.can_read_supplier_conversation(p_customer uuid,p_supplier uuid)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.users u where u.id=(select auth.uid()) and not u.is_anonymous)
  and ((select auth.uid())=p_customer or exists(
    select 1 from public.supplier_users su where su.user_id=(select auth.uid()) and su.supplier_id=p_supplier));
$$;
revoke all on function styled_private.can_read_supplier_conversation(uuid,uuid) from public,anon;
grant usage on schema styled_private to authenticated;
grant execute on function styled_private.can_read_supplier_conversation(uuid,uuid) to authenticated;
create policy conversation_participants_read on public.supplier_conversations for select to authenticated
using (styled_private.can_read_supplier_conversation(customer_id,supplier_id));
create policy message_participants_read on public.supplier_messages for select to authenticated
using (exists(select 1 from public.supplier_conversations c where c.id=conversation_id
and styled_private.can_read_supplier_conversation(c.customer_id,c.supplier_id)));

-- Service-only transaction. Membership is rechecked here as well as in the API.
create function public.send_supplier_message(p_customer uuid,p_supplier uuid,p_actor uuid,p_label text,p_body text,p_client uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare thread uuid; message_id uuid; role_name text; previous public.supplier_messages;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_actor::text || p_client::text,0));
  if not exists(select 1 from auth.users where id=p_actor and not is_anonymous and email_confirmed_at is not null) then
    raise exception 'Confirmed account required';
  end if;
  if p_actor=p_customer then role_name:='customer';
  elsif exists(select 1 from public.supplier_users where user_id=p_actor and supplier_id=p_supplier) then role_name:='supplier';
  else raise exception 'Conversation access denied'; end if;
  if length(trim(p_body)) not between 1 and 4000 then raise exception 'Invalid message'; end if;
  select * into previous from public.supplier_messages where sender_id=p_actor and client_id=p_client;
  if found then
    if previous.body<>trim(p_body) or not exists(select 1 from public.supplier_conversations
      where id=previous.conversation_id and customer_id=p_customer and supplier_id=p_supplier) then
      raise exception 'Message retry changed';
    end if;
    return previous.conversation_id;
  end if;
  select id into thread from public.supplier_conversations where customer_id=p_customer and supplier_id=p_supplier for update;
  if thread is null then
    if role_name<>'customer' or not exists(select 1 from public.suppliers where id=p_supplier and active) then
      raise exception 'Supplier unavailable';
    end if;
    insert into public.supplier_conversations(customer_id,supplier_id,customer_label)
    values(p_customer,p_supplier,left(p_label,100))
    on conflict(customer_id,supplier_id) do update set customer_label=excluded.customer_label
    returning id into thread;
  end if;
  insert into public.supplier_messages(conversation_id,sender_id,sender_role,body,client_id)
    values(thread,p_actor,role_name,trim(p_body),p_client)
    on conflict(sender_id,client_id) do nothing returning id into message_id;
  if message_id is not null then
    update public.supplier_conversations set last_body=left(trim(p_body),180),last_message_id=message_id,
      updated_at=clock_timestamp(),
      customer_unread=case when role_name='supplier' then true else customer_unread end,
      supplier_unread=case when role_name='customer' then true else supplier_unread end
    where id=thread;
  end if;
  return thread;
end; $$;
revoke all on function public.send_supplier_message(uuid,uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.send_supplier_message(uuid,uuid,uuid,text,text,uuid) to service_role;
