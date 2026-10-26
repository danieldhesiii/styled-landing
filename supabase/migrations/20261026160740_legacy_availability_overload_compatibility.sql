-- Preserve legacy callers that pass all four arguments, while removing
-- defaults that collide with the newer three-argument hire-date function.
-- The existing function has no dependent database objects; no stock rows change.
do $compat$
declare definition text;
begin
 if exists(select 1 from pg_proc where oid=to_regprocedure('public.product_availability(text[],date,uuid,uuid)') and pronargdefaults>0) then
  select replace(pg_get_functiondef('public.product_availability(text[],date,uuid,uuid)'::regprocedure), ' DEFAULT NULL::uuid', '') into definition;
  drop function public.product_availability(text[],date,uuid,uuid);
  execute definition;
  revoke all on function public.product_availability(text[],date,uuid,uuid) from public,anon,authenticated;
  grant execute on function public.product_availability(text[],date,uuid,uuid) to service_role;
 end if;
end;
$compat$;
