-- Hosted service_role cannot read auth.users directly. Keep this operation
-- restricted to the authenticated server API, with no browser RPC grant.
-- The function validates the actor and membership inside its transaction.
alter function public.send_supplier_message(uuid,uuid,uuid,text,text,uuid) security definer;
revoke all on function public.send_supplier_message(uuid,uuid,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.send_supplier_message(uuid,uuid,uuid,text,text,uuid) to service_role;
