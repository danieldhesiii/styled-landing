-- Message receipts are written only by the server after an authorised participant opens a thread.
alter table public.suppliers add column message_reply_hours integer check(message_reply_hours between 1 and 168);
grant select(message_reply_hours) on public.suppliers to anon,authenticated;
alter table public.supplier_messages add column read_at timestamptz;
alter table public.supplier_conversations
 add column last_sender_role text check(last_sender_role in ('customer','supplier')),
 add column awaiting_since timestamptz,
 add column reply_target_hours integer check(reply_target_hours between 1 and 168);

update public.supplier_conversations c set last_sender_role=m.sender_role,
 awaiting_since=(select min(s.created_at) from public.supplier_messages s where s.conversation_id=c.id and s.sender_role=m.sender_role
   and s.created_at>coalesce((select max(o.created_at) from public.supplier_messages o where o.conversation_id=c.id and o.sender_role<>m.sender_role),'-infinity'::timestamptz))
from public.supplier_messages m where m.id=c.last_message_id;

create function public.snapshot_supplier_reply_target() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 select message_reply_hours into new.reply_target_hours from public.suppliers where id=new.supplier_id;
 return new;
end;$$;
revoke all on function public.snapshot_supplier_reply_target() from public,anon,authenticated;
create trigger supplier_conversation_reply_target before insert on public.supplier_conversations for each row execute function public.snapshot_supplier_reply_target();

create function public.track_supplier_reply_turn() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 update public.supplier_conversations set
  awaiting_since=case when last_sender_role=new.sender_role and awaiting_since is not null then awaiting_since else new.created_at end,
  last_sender_role=new.sender_role where id=new.conversation_id;
 return new;
end;$$;
revoke all on function public.track_supplier_reply_turn() from public,anon,authenticated;
create trigger supplier_message_reply_turn after insert on public.supplier_messages for each row execute function public.track_supplier_reply_turn();

-- No browser RPC grant. Validate membership inside the transaction as well as in the API.
create function public.read_supplier_messages(p_thread uuid,p_actor uuid,p_supplier_workspace boolean,p_last uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare c public.supplier_conversations; seen public.supplier_messages; own_role text;
begin
 if not exists(select 1 from auth.users where id=p_actor and not is_anonymous and email_confirmed_at is not null) then raise exception 'Confirmed account required';end if;
 select * into c from public.supplier_conversations where id=p_thread for update;
 if not found then raise exception 'Conversation access denied';end if;
 if p_supplier_workspace and exists(select 1 from public.supplier_users where user_id=p_actor and supplier_id=c.supplier_id) then own_role:='supplier';
 elsif not p_supplier_workspace and c.customer_id=p_actor then own_role:='customer';
 else raise exception 'Conversation access denied';end if;
 select * into seen from public.supplier_messages where id=p_last and conversation_id=p_thread;
 if not found then raise exception 'Message not found';end if;
 update public.supplier_messages set read_at=coalesce(read_at,clock_timestamp())
 where conversation_id=p_thread and sender_role<>own_role and read_at is null and (created_at,id)<=(seen.created_at,seen.id);
 if c.last_message_id=p_last then
  update public.supplier_conversations set customer_unread=case when own_role='customer' then false else customer_unread end,
   supplier_unread=case when own_role='supplier' then false else supplier_unread end where id=p_thread and ((own_role='customer' and customer_unread) or (own_role='supplier' and supplier_unread));
 end if;
 return true;
end;$$;
revoke all on function public.read_supplier_messages(uuid,uuid,boolean,uuid) from public,anon,authenticated;
grant execute on function public.read_supplier_messages(uuid,uuid,boolean,uuid) to service_role;
