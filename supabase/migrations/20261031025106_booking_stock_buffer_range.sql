begin;
-- Request entry still limits hire to 31 days; internal checks include up to 28 buffer days.
create or replace function public.product_availability_range(p_product_ids text[], p_start date, p_end date, p_exclude_order uuid default null)
returns table (product_id text, capacity integer, effective_capacity integer, reserved integer, available integer)
language sql stable set search_path = '' as $$
  select a.product_id, max(a.capacity), min(a.effective_capacity), max(a.reserved), min(a.available)
  from generate_series(p_start, p_end, interval '1 day') d(day)
  cross join lateral public.product_availability(p_product_ids, d.day::date, p_exclude_order) a
  where p_end >= p_start and p_end - p_start <= 59
  group by a.product_id;
$$;
revoke all on function public.product_availability_range(text[], date, date, uuid) from public, anon, authenticated;
grant execute on function public.product_availability_range(text[], date, date, uuid) to service_role;

create or replace function public.check_booking_venue_policy(p_order uuid) returns void language plpgsql security invoker set search_path='' as $$
declare v_slug text;v public.venue_listings;p jsonb;origin record;loc record;s uuid;distance double precision;radius numeric;
begin
 select (regexp_match(notes,'Venue route: ([a-z0-9-]+)'))[1] into v_slug from public.orders where id=p_order;
 if v_slug is null then return;end if;
 select * into v from public.venue_listings where venue_listings.slug=v_slug and active for share;
 if not found then raise exception 'The venue is no longer published. Review with the venue team';end if;
 p:=v.details->'supplier_policy';
 if p->>'mode'='venue_only' then raise exception 'This venue uses its own suppliers. Product bookings must be handled with the venue';end if;
 if p->>'mode'='venue_partners' and exists(select 1 from public.order_lines where order_id=p_order and not coalesce((p->'catalogueSupplierIds') ? supplier_id::text,false)) then raise exception 'A supplier is no longer approved by this venue';end if;
 radius:=nullif(p->>'localRadiusMiles','')::numeric;
 if radius is not null then
  select * into origin from public.discovery_locations where entity_type='venue' and entity_id=v.id;
  if not found or origin.latitude is null or origin.longitude is null then raise exception 'Venue location must be verified before local supplier matching';end if;
  for s in select distinct supplier_id from public.order_lines where order_id=p_order loop
   select * into loc from public.discovery_locations where entity_type='supplier' and entity_id=s;
   if not found or loc.latitude is null or loc.longitude is null then raise exception 'Supplier location must be verified';end if;
   distance:=3958.7613*acos(least(1.0,greatest(-1.0,sin(radians(origin.latitude))*sin(radians(loc.latitude))+cos(radians(origin.latitude))*cos(radians(loc.latitude))*cos(radians(loc.longitude-origin.longitude)))));
   if distance>radius or (not coalesce(loc.nationwide,false) and loc.radius_miles is not null and distance>loc.radius_miles) then raise exception 'Supplier is outside the venue or supplier service radius';end if;
  end loop;
 end if;
end;$$;
revoke all on function public.check_booking_venue_policy(uuid) from public,anon,authenticated;
grant execute on function public.check_booking_venue_policy(uuid) to service_role;

commit;
