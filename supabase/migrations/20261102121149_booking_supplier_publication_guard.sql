begin;

-- Quote issuance/confirmation already lock products. Range review takes the
-- opposite order (supplier, review, products). Never wait for a supplier here:
-- fail/retry if review is running, otherwise retain SHARE locks until commit so
-- deactivation cannot slip between the publication check and the booking write.
create function public.check_booking_supplier_publication(p_order uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare supplier record;
begin
 if exists(select 1 from public.order_lines l left join public.suppliers s on s.id=l.supplier_id
           where l.order_id=p_order and s.id is null) then
  raise exception 'A supplier is no longer published. Request a fresh supplier review';
 end if;
 for supplier in
  select s.id,s.active from public.suppliers s
  where s.id in(select l.supplier_id from public.order_lines l where l.order_id=p_order)
  order by s.id for share of s nowait
 loop
  if not supplier.active then
   raise exception 'A supplier is no longer published. Request a fresh supplier review';
  end if;
 end loop;
exception when lock_not_available then
 raise exception 'Supplier publication is being updated. Refresh and retry'
  using errcode='55P03';
end;$$;
revoke all on function public.check_booking_supplier_publication(uuid) from public,anon,authenticated;
grant execute on function public.check_booking_supplier_publication(uuid) to service_role;

create function public.guard_booking_supplier_publication()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_table_name='booking_quotes' then
  perform public.check_booking_supplier_publication(new.order_id);
 elsif new.status='confirmed' and old.status is distinct from new.status then
  perform public.check_booking_supplier_publication(new.id);
 end if;
 return new;
end;$$;
revoke all on function public.guard_booking_supplier_publication() from public,anon,authenticated;
create trigger booking_quote_supplier_publication_guard before insert on public.booking_quotes
 for each row execute function public.guard_booking_supplier_publication();
create trigger booking_order_supplier_publication_guard before update of status on public.orders
 for each row execute function public.guard_booking_supplier_publication();

commit;
