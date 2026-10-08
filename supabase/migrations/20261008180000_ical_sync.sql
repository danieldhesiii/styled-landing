-- iCal calendar sync for suppliers.
--
-- A supplier can paste a read-only calendar feed (Google Calendar, Booqable,
-- Current RMS, …). We read it and block the dates it's busy, so their bookings
-- elsewhere automatically close those dates on Styled — "set and forget".

alter table public.suppliers
  add column ical_url     text,
  add column ical_synced_at timestamptz;

-- Mark where a block came from, so a calendar sync can reconcile its own blocks
-- (add new, drop gone) without ever touching a date a human blocked by hand.
alter table public.availability_overrides
  add column source text not null default 'manual'
    check (source in ('manual', 'ical'));
