begin;
select set_config('styled.qa_owner',gen_random_uuid()::text,true);
select set_config('styled.qa_other',gen_random_uuid()::text,true);
select set_config('styled.qa_supplier',gen_random_uuid()::text,true);
select set_config('styled.qa_product','qa-delivery-'||gen_random_uuid()::text,true);
insert into auth.users(id) values(current_setting('styled.qa_owner')::uuid),(current_setting('styled.qa_other')::uuid);
insert into public.suppliers(id,name,area) values(current_setting('styled.qa_supplier')::uuid,'Delivery QA '||current_setting('styled.qa_supplier'),'Test');
insert into public.products(id,supplier_id,name,category,unit_price_pence,unit,qty_rule,capacity) values(current_setting('styled.qa_product'),current_setting('styled.qa_supplier')::uuid,'Delivery QA item','centrepieces',100,'each','fixed',2);
set local role anon;
do $$begin
 begin perform 1 from public.wedding_workspaces;raise exception 'Anonymous workspace read allowed';exception when insufficient_privilege then null;end;
 begin perform 1 from public.discovery_locations;raise exception 'Private business locations exposed';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('styled.qa_owner'),true);
set local role authenticated;
insert into public.wedding_workspaces(owner_id,data) values(auth.uid(),'{"test":true}');
do $$begin
 if(select count(*) from public.wedding_workspaces)<>1 then raise exception 'Owner cannot read workspace';end if;
 begin update public.wedding_workspaces set owner_id=current_setting('styled.qa_other')::uuid;raise exception 'Ownership transfer allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('styled.qa_other'),true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.wedding_workspaces) then raise exception 'Other account can read wedding';end if;
 update public.wedding_workspaces set data='{}';if found then raise exception 'Other account can update wedding';end if;
 begin insert into public.wedding_workspaces(owner_id) values(current_setting('styled.qa_owner')::uuid);raise exception 'Forged owner insert allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
-- One rental occupies both the delivery and event days.
select public.create_order(current_setting('styled.qa_owner')::uuid,
 jsonb_build_object('couple_name','QA','email','qa@example.com','wedding_date',current_date+60,'subtotal_pence',100,'commission_pence',0,'deposit_pence',25),
 jsonb_build_array(jsonb_build_object('product_id',current_setting('styled.qa_product'),'supplier_id',current_setting('styled.qa_supplier'),'product_name','QA','supplier_name','QA','unit_price_pence',100,'quantity',1,'line_total_pence',100,'needed_date',current_date+59)));
do $$declare a record;begin
 select * into a from public.product_availability(array[current_setting('styled.qa_product')],current_date+59);
 if a.available<>1 then raise exception 'Delivery day stock was not reserved';end if;
 select * into a from public.product_availability(array[current_setting('styled.qa_product')],current_date+60);
 if a.available<>1 then raise exception 'Wedding day stock was not reserved';end if;
 select * into a from public.product_availability_range(array[current_setting('styled.qa_product')],current_date+59,current_date+60);
 if a.available<>1 then raise exception 'Range summed the same rental twice';end if;
 begin
  perform public.create_order(current_setting('styled.qa_other')::uuid,jsonb_build_object('couple_name','Other QA','email','qa@example.com','wedding_date',current_date+59,'subtotal_pence',200,'commission_pence',0,'deposit_pence',50),jsonb_build_array(jsonb_build_object('product_id',current_setting('styled.qa_product'),'supplier_id',current_setting('styled.qa_supplier'),'product_name','QA','supplier_name','QA','unit_price_pence',100,'quantity',2,'line_total_pence',200,'needed_date',current_date+59)));
  raise exception 'Overlapping delivery allowed overbooking';
 exception when raise_exception then if sqlerrm<>'unavailable' then raise;end if;end;
end$$;
-- Supplier blocks anywhere in the interval are respected.
insert into public.availability_overrides(supplier_id,day,blocked) values(current_setting('styled.qa_supplier')::uuid,current_date+59,true);
do $$declare a record;begin
 select * into a from public.product_availability_range(array[current_setting('styled.qa_product')],current_date+59,current_date+60);
 if a.effective_capacity<>0 or a.available<>0 then raise exception 'Delivery day supplier block ignored';end if;
end$$;
rollback;
