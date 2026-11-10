begin;
-- Existing owner/staff SELECT policies still limit rows. Only customer-facing
-- dates are added; supplier notes and operational stock buffers stay private.
grant select(needed_date,return_date) on public.order_lines to authenticated;
commit;
