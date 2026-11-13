-- Product details displayed on the customer receipt. Existing order owner policies apply.
grant select(request_snapshot) on public.order_lines to authenticated;
