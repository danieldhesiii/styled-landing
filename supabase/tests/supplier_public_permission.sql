-- Every fixture, publication change and audit-history row is rolled back.
begin;
do $$
#variable_conflict use_variable
declare staff_id uuid:=gen_random_uuid(); vendor_id uuid:=gen_random_uuid(); supplier_id uuid;
 product_id text; asset_id uuid; declarations jsonb; permission text;
begin
 insert into auth.users(id,email,is_anonymous) values(staff_id,staff_id||'@example.invalid',false),(vendor_id,vendor_id||'@example.invalid',false);
 insert into public.staff(user_id) values(staff_id);
 execute 'set local role service_role';
 declarations:=jsonb_build_object('availabilityMode','manual','replyHours',48,'listingPermission',true,'imageRights',true,
  'publicImagePermission',true,'aiReferencePermission',true,'pricesConfirmed',true,'termsConfirmed',true,
  'terms','Fictional fixture terms only','notes','Test only');
 foreach permission in array array['listingPermission','publicImagePermission','imageRights'] loop
  supplier_id:=gen_random_uuid();asset_id:=gen_random_uuid();product_id:='public-permission-test-'||supplier_id;
  insert into public.suppliers(id,name,area,active) values(supplier_id,'Public permission fixture '||supplier_id,'Test area',false);
  -- Each login belongs to one supplier; move the fictional login between cases.
  delete from public.supplier_users where user_id=vendor_id;
  insert into public.supplier_users(user_id,supplier_id) values(vendor_id,supplier_id);
  insert into public.products(id,supplier_id,name,category,unit_price_pence,unit,qty_rule,capacity,image,active)
   values(product_id,supplier_id,'Fixture','florals',10000,'each','fixed',5,'/api/supplier-images/'||asset_id,false);
  insert into public.supplier_review_assets(id,supplier_id,product_id,path) values(asset_id,supplier_id,product_id,supplier_id||'/fixture.webp');
  perform public.review_supplier_range(supplier_id,0,vendor_id,'submit',declarations);
  perform public.review_supplier_range(supplier_id,1,staff_id,'approve','{}');
  -- Exact audit reproduction: save a single withdrawn permission on a live range.
  perform public.review_supplier_range(supplier_id,2,vendor_id,'save',declarations||jsonb_build_object(permission,false));
  if (select active from public.suppliers where id=supplier_id) or
     (select active from public.products where id=product_id) or
     (select approved or ai_reference_allowed from public.supplier_review_assets where id=asset_id) then
   raise exception 'TEST: saved public permission withdrawal retained publication: %',permission;
  end if;
  begin
   update public.products set active=true where id=product_id;
   raise exception 'TEST: withdrawn product reactivated without review';
  exception when others then
   if sqlerrm<>'Product publication requires an approved supplier submission' then raise;end if;
  end;
  begin
   update public.suppliers set active=true where id=supplier_id;
   raise exception 'TEST: withdrawn supplier reactivated without review';
  exception when others then
   if sqlerrm<>'Supplier publication requires an approved submission' then raise;end if;
  end;
  perform public.review_supplier_range(supplier_id,3,vendor_id,'save',declarations);
  perform public.review_supplier_range(supplier_id,4,vendor_id,'submit',declarations);
  if (select active from public.suppliers where id=supplier_id) or
     (select active from public.products where id=product_id) or
     (select approved or ai_reference_allowed from public.supplier_review_assets where id=asset_id) then
   raise exception 'TEST: renewed consent self-published without approval: %',permission;
  end if;
  perform public.review_supplier_range(supplier_id,5,staff_id,'approve','{}');
  if not (select active from public.suppliers where id=supplier_id) or
     not (select active from public.products where id=product_id) or
     not (select approved and ai_reference_allowed from public.supplier_review_assets where id=asset_id) then
   raise exception 'TEST: fresh staff approval did not restore publication: %',permission;
  end if;
 end loop;
end;$$;
rollback;
