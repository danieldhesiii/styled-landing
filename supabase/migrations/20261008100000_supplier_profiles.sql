-- Supplier profile enrichment: a logo and a per-supplier commission rate.

alter table public.suppliers
  add column logo_url        text,
  add column commission_rate numeric(5, 2)
    check (commission_rate is null or (commission_rate >= 0 and commission_rate <= 100));

comment on column public.suppliers.commission_rate is
  'Styled''s commission for this supplier, as a percent (e.g. 12.00). NULL = use the platform default. Internal: never shown to couples or exposed to the anon API.';

-- commission_rate is a commercial secret. The catalogue is read by signed-out
-- visitors (the anon role via createAnonClient), so lock the column down the way
-- orders are: drop the table-wide SELECT and grant back only the columns that are
-- safe to show publicly. The logo is public; the commission and the supplier's
-- private contact are not. Staff screens read suppliers with the service role,
-- which is unaffected by these grants.
revoke select on public.suppliers from anon, authenticated;
grant select (id, name, area, active, created_at, logo_url)
  on public.suppliers to anon, authenticated;
