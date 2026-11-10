-- Service-only transactional write. Ownership is rechecked inside the lock;
-- normal stock is an upper bound and Styled reservations remain separate.
create function public.set_supplier_product_day_limit(
  p_actor uuid, p_supplier uuid, p_product text, p_day date,
  p_units integer, p_note text default null
) returns void
language plpgsql security invoker set search_path = '' as $$
declare stock integer;
begin
  perform 1 from public.supplier_users where user_id=p_actor and supplier_id=p_supplier for share;
  if not found then raise exception 'Supplier access required'; end if;
  select capacity into stock from public.products where id=p_product and supplier_id=p_supplier for update;
  if not found then raise exception 'Product does not belong to this supplier'; end if;
  if p_day is null or p_day < (now() at time zone 'UTC')::date then raise exception 'Choose today or a future date'; end if;
  if p_units is not null and (p_units<0 or p_units>1000000) then raise exception 'Invalid daily units'; end if;
  if length(coalesce(p_note,''))>300 then raise exception 'Note too long'; end if;
  if p_units is null then
    delete from public.availability_overrides where product_id=p_product and day=p_day;
    return;
  end if;
  if stock is null and p_units<>0 then raise exception 'Made-to-order products can only be closed for a date'; end if;
  if stock is not null and p_units>stock then raise exception 'Daily limit exceeds normal stock'; end if;
  insert into public.availability_overrides(product_id,day,blocked,units_available,note,created_by,source)
  values(p_product,p_day,p_units=0,p_units,nullif(btrim(p_note),''),p_actor,'manual')
  on conflict (product_id,day) where product_id is not null do update
    set blocked=excluded.blocked, units_available=excluded.units_available,
        note=excluded.note, created_by=excluded.created_by,source='manual';
end;
$$;
revoke all on function public.set_supplier_product_day_limit(uuid,uuid,text,date,integer,text) from public,anon,authenticated;
grant execute on function public.set_supplier_product_day_limit(uuid,uuid,text,date,integer,text) to service_role;
