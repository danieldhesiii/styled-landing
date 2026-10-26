-- DEV only. Synthetic fixtures and all mutations roll back; no auth emails or notifications.
begin;
do $$
declare u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); p text:='test-hire-'||gen_random_uuid();
 v uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); alt uuid:=gen_random_uuid();
 oid uuid; short integer; rejected boolean; line jsonb; order_body jsonb;
begin
 insert into auth.users(id) values(u);
 insert into public.suppliers(id,name,area) values(s,'TEST hire dates','Test');
 insert into public.products(id,supplier_id,name,category,unit_price_pence,unit,qty_rule,capacity)
 values(p,s,'TEST hire dates','centrepieces',100,'each','fixed',1);
 order_body:=jsonb_build_object('couple_name','TEST','email','test@example.invalid','wedding_date',current_date+61,'subtotal_pence',100,'commission_pence',0,'deposit_pence',0);
 line:=jsonb_build_array(jsonb_build_object('product_id',p,'supplier_id',s,'product_name','TEST','supplier_name','TEST','unit','each','quantity',1,'unit_price_pence',100,'line_total_pence',100,'needed_date',current_date+60,'return_date',current_date+62));
 oid:=public.create_order(u,order_body,line);
 if not exists(select 1 from public.order_lines where order_id=oid and needed_date=current_date+60 and return_date=current_date+62) then raise exception 'Item dates not stored'; end if;
 select available into short from public.product_availability(array[p],current_date+62);
 if short<>0 then raise exception 'Return day was not included in stock checks'; end if;
 select available into short from public.product_availability(array[p],current_date+63);
 if short<>1 then raise exception 'Stock did not release after return'; end if;
 rejected:=false;
 begin perform public.create_order(u,order_body,line); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'Overlapping hire accepted'; end if;
 -- A later item period is allowed even though the wedding itself is earlier.
 line:=jsonb_build_array(jsonb_build_object('product_id',p,'supplier_id',s,'product_name','TEST','supplier_name','TEST','unit','each','quantity',1,'unit_price_pence',100,'line_total_pence',100,'needed_date',current_date+63,'return_date',current_date+64));
 perform public.create_order(u,order_body,line);
 insert into public.venue_listings(id,slug,name,location,county,active) values(v,'test-period-'||v,'TEST venue period','Test','Test',true);
 insert into public.venue_enquiries(id,venue_id,owner_user_id,name,email,preferred_date,booking_start,booking_end,request_kind,status) values
 (a,v,u,'TEST','test@example.invalid',current_date+71,current_date+70,current_date+72,'booking','new'),
 (b,v,u,'TEST','test@example.invalid',current_date+73,current_date+72,current_date+74,'booking','new');
 perform public.respond_venue_enquiry(v,a,'booked','TEST agreed','{}',null::time);
 rejected:=false;
 begin perform public.respond_venue_enquiry(v,b,'booked','TEST agreed','{}',null::time); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'Overlapping setup day accepted'; end if;
 rejected:=false;
 begin perform public.set_venue_date_block(v,current_date+72,'TEST block',true); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'Confirmed pack-down day was blocked'; end if;
 -- Viewing on an occupied hire day is a separate appointment, never a booking.
 insert into public.venue_enquiries(venue_id,owner_user_id,name,email,preferred_date,request_kind,status)
 values(v,u,'TEST','test@example.invalid',current_date+71,'viewing','new');
 insert into public.venue_enquiries(id,venue_id,owner_user_id,name,email,preferred_date,booking_start,booking_end,request_kind,status,alternative_dates)
 values(alt,v,u,'TEST','test@example.invalid',current_date+81,current_date+80,current_date+82,'booking','declined',array[current_date+91]);
 perform public.set_venue_date_block(v,current_date+90,'TEST blocked setup',true);
 rejected:=false;
 begin perform public.request_venue_alternative(alt,u,current_date+91); exception when raise_exception then rejected:=true; end;
 if not rejected then raise exception 'Suggested event accepted despite blocked setup'; end if;
 perform public.set_venue_date_block(v,current_date+90,null,false);
 perform public.request_venue_alternative(alt,u,current_date+91);
 if not exists(select 1 from public.venue_enquiries where id=alt and status='new' and preferred_date=current_date+91 and booking_start=current_date+90 and booking_end=current_date+92) then
  raise exception 'Alternative date lost setup/pack-down duration'; end if;
end $$;
select 'PASS: item stock through return; later item dates; venue overlap and blocks; viewing independence; alternatives preserve period' as result;
rollback;
