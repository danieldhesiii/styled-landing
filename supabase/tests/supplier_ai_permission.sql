begin;
do $$
#variable_conflict use_variable
declare staff_id uuid:=gen_random_uuid(); vendor_id uuid:=gen_random_uuid(); supplier_id uuid:=gen_random_uuid();
 product_id text:='permission-test-'||gen_random_uuid(); asset_id uuid:=gen_random_uuid(); declarations jsonb;
begin
 insert into auth.users(id,email,is_anonymous) values(staff_id,staff_id||'@example.invalid',false),(vendor_id,vendor_id||'@example.invalid',false);
 insert into public.staff(user_id) values(staff_id);
 insert into public.suppliers(id,name,area,active) values(supplier_id,'Permission fixture '||supplier_id,'Test area',false);
 insert into public.supplier_users(user_id,supplier_id) values(vendor_id,supplier_id);
 insert into public.products(id,supplier_id,name,category,unit_price_pence,unit,qty_rule,capacity,image,active)
  values(product_id,supplier_id,'Fixture','florals',10000,'each','fixed',5,'/api/supplier-images/'||asset_id,false);
 insert into public.supplier_review_assets(id,supplier_id,product_id,path) values(asset_id,supplier_id,product_id,supplier_id||'/fixture.webp');
 execute 'set local role service_role';
 declarations:=jsonb_build_object('availabilityMode','manual','replyHours',48,'listingPermission',true,'imageRights',true,
  'publicImagePermission',true,'aiReferencePermission',true,'pricesConfirmed',true,'termsConfirmed',true,
  'terms','Fictional fixture terms only','notes','Test only');
 perform public.review_supplier_range(supplier_id,0,vendor_id,'submit',declarations);
 perform public.review_supplier_range(supplier_id,1,staff_id,'approve','{}');
 if not (select ai_reference_allowed and approved from public.supplier_review_assets where id=asset_id) then
  raise exception 'TEST: explicit approved consent did not authorise AI references';end if;
 -- Reproduce the exact save-after-approval withdrawal, without editing products.
 perform public.review_supplier_range(supplier_id,2,vendor_id,'save',declarations||jsonb_build_object('aiReferencePermission',false));
 if (select ai_reference_allowed from public.supplier_review_assets where id=asset_id) then
  raise exception 'TEST: saved withdrawal left the asset authorised for AI';end if;
 if not (select approved from public.supplier_review_assets where id=asset_id) or
    not (select active from public.products where id=product_id) or not (select active from public.suppliers where id=supplier_id) then
  raise exception 'TEST: AI withdrawal changed independent public listing approval';end if;
 -- Consent can be re-proposed, but only staff approval can restore the grant.
 perform public.review_supplier_range(supplier_id,3,vendor_id,'save',declarations);
 perform public.review_supplier_range(supplier_id,4,vendor_id,'submit',declarations);
 if (select ai_reference_allowed from public.supplier_review_assets where id=asset_id) then
  raise exception 'TEST: save/submit restored AI permission without approval';end if;
 perform public.review_supplier_range(supplier_id,5,staff_id,'approve','{}');
 if not (select ai_reference_allowed from public.supplier_review_assets where id=asset_id) then
  raise exception 'TEST: staff reapproval did not restore consent';end if;
 -- Withdrawal on submission must take effect immediately too.
 perform public.review_supplier_range(supplier_id,6,vendor_id,'submit',declarations||jsonb_build_object('aiReferencePermission',false));
 if (select ai_reference_allowed from public.supplier_review_assets where id=asset_id) then
  raise exception 'TEST: submitted withdrawal retained AI permission';end if;
 perform public.review_supplier_range(supplier_id,7,staff_id,'approve','{}');
 if (select ai_reference_allowed from public.supplier_review_assets where id=asset_id) then
  raise exception 'TEST: approval ignored the withdrawn declaration';end if;
 -- Legacy/missing declarations also fail closed, without touching public rights.
 update public.supplier_review_assets set ai_reference_allowed=true where id=asset_id;
 update public.supplier_reviews set declarations=declarations-'aiReferencePermission' where supplier_reviews.supplier_id=supplier_id;
 if (select ai_reference_allowed from public.supplier_review_assets where id=asset_id) then
  raise exception 'TEST: missing consent retained AI permission';end if;
 if has_function_privilege('authenticated','public.revoke_supplier_reference_permissions()','execute') or
    has_function_privilege('anon','public.withdraw_supplier_publication(uuid)','execute') then
  raise exception 'TEST: permission trigger exposed to public callers';end if;
end;$$;
rollback;
