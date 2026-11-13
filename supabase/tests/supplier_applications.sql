begin;
insert into auth.users(id,email) values('e0000000-0000-4000-8000-000000000001','staff@example.com'),('e0000000-0000-4000-8000-000000000002','customer@example.com');
insert into public.staff(user_id) values('e0000000-0000-4000-8000-000000000001');
insert into public.vendor_applications(id,business_name,email,area,category) values('e0000000-0000-4000-8000-000000000010','Approval fixture','supplier@example.com','Essex','lighting');
do $$declare first_id uuid; second_id uuid;begin
 if (select count(*) from public.application_notifications where application_id='e0000000-0000-4000-8000-000000000010')<>1 then raise exception 'Missing atomic outbox';end if;
 if has_table_privilege('anon','public.application_notifications','select') or has_table_privilege('authenticated','public.application_notifications','select') then raise exception 'Private queue exposed';end if;
 if has_function_privilege('authenticated','public.approve_supplier_application(uuid,uuid)','execute') or has_function_privilege('anon','public.approve_supplier_application(uuid,uuid)','execute') then raise exception 'Approval exposed';end if;
 begin
 perform public.approve_supplier_application('e0000000-0000-4000-8000-000000000010','e0000000-0000-4000-8000-000000000002');
 raise exception 'Nonstaff approval succeeded';
 exception when others then if sqlerrm<>'Staff access required' then raise;end if;end;
 first_id:=public.approve_supplier_application('e0000000-0000-4000-8000-000000000010','e0000000-0000-4000-8000-000000000001');
 second_id:=public.approve_supplier_application('e0000000-0000-4000-8000-000000000010','e0000000-0000-4000-8000-000000000001');
 if first_id<>second_id then raise exception 'Repeated approval duplicated supplier';end if;
 if exists(select 1 from public.suppliers where id=first_id and active) then raise exception 'Approval published supplier';end if;
 if exists(select 1 from public.supplier_users where supplier_id=first_id) then raise exception 'Approval gave access without invitation';end if;
 if not exists(select 1 from public.vendor_applications where supplier_id=first_id and status='accepted' and reviewed_by='e0000000-0000-4000-8000-000000000001') then raise exception 'Decision not linked';end if;
end;$$;
insert into public.vendor_applications(id,business_name,email,status,category) values('e0000000-0000-4000-8000-000000000011','Declined fixture','declined@example.com','declined','lighting'),('e0000000-0000-4000-8000-000000000012','Venue fixture','venue@example.com','new','venue');
do $$begin
 begin perform public.approve_supplier_application('e0000000-0000-4000-8000-000000000011','e0000000-0000-4000-8000-000000000001');raise exception 'Declined approved';exception when others then if sqlerrm<>'Reopen the application before approval' then raise;end if;end;
 begin perform public.approve_supplier_application('e0000000-0000-4000-8000-000000000012','e0000000-0000-4000-8000-000000000001');raise exception 'Venue approved';exception when others then if sqlerrm<>'Use the venue approval process' then raise;end if;end;
end;$$;
rollback;
