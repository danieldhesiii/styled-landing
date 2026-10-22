-- Transactional access regression: no fixture data survives this script.
begin;
select set_config('styled.test_staff', gen_random_uuid()::text, true);
select set_config('styled.test_supplier_user', gen_random_uuid()::text, true);
select set_config('styled.test_other', gen_random_uuid()::text, true);
select set_config('styled.test_supplier', gen_random_uuid()::text, true);
select set_config('styled.test_venue', gen_random_uuid()::text, true);
select set_config('styled.test_draft', gen_random_uuid()::text, true);
select set_config('styled.test_package', gen_random_uuid()::text, true);
insert into auth.users (id) values
 (current_setting('styled.test_staff')::uuid),
 (current_setting('styled.test_supplier_user')::uuid),
 (current_setting('styled.test_other')::uuid);
insert into public.staff (user_id) values (current_setting('styled.test_staff')::uuid);
insert into public.suppliers (id, name, area) values
 (current_setting('styled.test_supplier')::uuid, 'TEST ONLY ' || current_setting('styled.test_supplier'), 'Test');
insert into public.supplier_users (user_id, supplier_id) values
 (current_setting('styled.test_supplier_user')::uuid, current_setting('styled.test_supplier')::uuid);
insert into public.venue_listings (id, slug, name, location, county, active) values
 (current_setting('styled.test_venue')::uuid, 'test-' || current_setting('styled.test_venue'), 'TEST ONLY published venue', 'Test', 'Test', true),
 (current_setting('styled.test_draft')::uuid, 'test-' || current_setting('styled.test_draft'), 'TEST ONLY draft venue', 'Test', 'Test', false);
insert into public.venue_packages (id, venue_id, name, style_id, price_from_pence) values
 (current_setting('styled.test_package')::uuid, current_setting('styled.test_venue')::uuid, 'Test', 'garden_romance', 100);
insert into public.venue_enquiries (venue_id, name, email) values
 (current_setting('styled.test_venue')::uuid, 'Test', 'test@example.invalid');
set local role anon;
do $$ begin
 if (select count(*) from public.venue_listings where id in (current_setting('styled.test_venue')::uuid, current_setting('styled.test_draft')::uuid)) <> 1 then raise exception 'Public venue isolation failed'; end if;
 if (select count(*) from public.venue_packages where id = current_setting('styled.test_package')::uuid) <> 1 then raise exception 'Public package visibility failed'; end if;
 begin
  perform 1 from public.venue_enquiries;
  raise exception 'Public enquiry reads were allowed';
 exception when insufficient_privilege then null;
 end;
 begin
  insert into public.venue_enquiries (venue_id, name, email) values (current_setting('styled.test_venue')::uuid, 'Test', 'test@example.invalid');
  raise exception 'Public enquiry inserts were allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', current_setting('styled.test_other'), true);
set local role authenticated;
do $$ begin
 if exists(select 1 from public.venue_enquiries where venue_id = current_setting('styled.test_venue')::uuid) then raise exception 'Unrelated user read enquiry'; end if;
 if styled_private.can_manage_supplier_asset(current_setting('styled.test_supplier') || '/logo.png') then raise exception 'Unrelated user could manage asset'; end if;
 begin
  insert into public.venue_listings (slug, name, location, county) values ('forbidden-test', 'Test', 'Test', 'Test');
  raise exception 'Unrelated user created venue';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', current_setting('styled.test_supplier_user'), true);
set local role authenticated;
do $$ begin
 if not styled_private.can_manage_supplier_asset(current_setting('styled.test_supplier') || '/logo.png') then raise exception 'Owner could not manage own asset'; end if;
 if styled_private.can_manage_supplier_asset(gen_random_uuid()::text || '/logo.png') then raise exception 'Owner could manage another supplier asset'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', current_setting('styled.test_staff'), true);
set local role authenticated;
do $$ begin
 if not exists(select 1 from public.venue_enquiries where venue_id = current_setting('styled.test_venue')::uuid) then raise exception 'Staff could not read enquiries'; end if;
 update public.venue_listings set description = 'Test update' where id = current_setting('styled.test_draft')::uuid;
 if not found then raise exception 'Staff could not edit draft'; end if;
end $$;
reset role;
do $$ begin
 begin
  insert into public.venue_enquiries (venue_id, package_id, name, email) values (current_setting('styled.test_draft')::uuid, current_setting('styled.test_package')::uuid, 'Test', 'test@example.invalid');
  raise exception 'Cross-venue package was accepted';
 exception when foreign_key_violation then null;
 end;
end $$;
rollback;
select 'PASS: public, staff, supplier isolation and cross-venue package checks; fixtures rolled back' as result;
