-- Read-only verification for main to run on DEV qkyeitvwscrxbiwamxan.
-- Confirm project in dashboard/CLI before any separately authorized application.
select column_name,data_type from information_schema.columns
 where table_schema='public' and table_name='venue_enquiries'
 and column_name in ('request_kind','viewing_time','next_actor');
select conname,convalidated,pg_get_constraintdef(oid) from pg_constraint
 where conrelid='public.venue_enquiries'::regclass and conname in ('venue_enquiries_status_check','venue_request_kind_status_check');
select indexdef from pg_indexes where schemaname='public' and indexname='venue_confirmed_booking_day_idx';
-- After application, both constraints above must have convalidated=true.
-- Legacy mismatch counts must be zero; migration refuses to rewrite/correct user rows.
select request_kind,status,count(*) from public.venue_enquiries
 where (status='booked' and request_kind<>'booking') or (status='viewing_confirmed' and request_kind<>'viewing')
 or (viewing_time is not null and request_kind<>'viewing')
 group by request_kind,status;
-- This preflight is also safe BEFORE migration (does not refer to new columns).
select count(*) as legacy_viewing_booked_count from public.venue_enquiries
 where request_kind='viewing' and status='booked';
select relrowsecurity from pg_class where oid='public.venue_request_messages'::regclass;
select policyname,roles,cmd,qual from pg_policies where schemaname='public'
 and tablename in ('venue_request_messages','venue_enquiries');
select p.oid::regprocedure as rpc,p.prosecdef as security_definer,
 has_function_privilege('anon',p.oid,'execute') as anon_exec,
 has_function_privilege('authenticated',p.oid,'execute') as authenticated_exec,
 has_function_privilege('service_role',p.oid,'execute') as service_exec
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
 and p.proname in ('respond_venue_enquiry','send_venue_request_message','request_venue_alternative','set_venue_date_block');
-- Expected: all security_definer/anon_exec/authenticated_exec false, service_exec true.
select grantee,privilege_type from information_schema.role_table_grants
 where table_schema='public' and table_name='venue_request_messages';
-- authenticated SELECT only; no anon grants. Service retains managed write access.
