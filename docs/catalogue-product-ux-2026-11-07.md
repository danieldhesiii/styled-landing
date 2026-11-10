# Catalogue and product UX — phases 3 and 5

Development checkout only. No commit, deployment, payment activation or database change performed by this work. Other agents own the shared studio, location matching and supplier pages.

## Official reference review

Reviewed the official Next and Moss category/product examples on 7 November 2026 through their public page content. This is a structural reference review; it does not claim a completed interactive or mobile walkthrough of either retailer.

| Reference | Observed pattern | Styled application |
| --- | --- | --- |
| [Next suit jackets](https://www.next.co.uk/shop/mens/clothing/suits/suit-jackets) | Category results expose filters and sort; product entries foreground identity and prices. | Wrapping category chips, concise product cards, explicit price/unit and availability cue, one main detail action. |
| [Next tuxedo jacket](https://www.next.co.uk/style/st130964/183688) | Product imagery, title and price precede item selection and the bag action; description sits in a separate detail section. | Large product image, supplier and price followed by event availability, quantity and basket controls; dimensions and terms in a separate section. |
| [Moss jackets](https://www.moss.co.uk/jackets?jacket=true) | Filter/sort controls, clear/reset, compact product identity and price. | Filters and Suppliers use the same ResponsivePanel component and consistent buttons; active filter chips can be cleared. |
| [Moss performance jacket](https://www.moss.co.uk/moss-1851-performance-tailored-fit-navy-jacket-966689909) | Stock-aware options and one bag action precede description, fit, materials, delivery and returns information. | Quantity respects the existing availability ceiling; details and supplier terms remain available below the main purchase area. Missing terms remain explicit. |

These are workflow and information-hierarchy adaptations. No retailer branding, product photographs, written descriptions, assets or retail payment/returns policies were copied. Existing Styled colours, typography, catalogue records and image provenance labels remain in use. Catalogue has one photograph per product in its current data shape, so this work does not fabricate gallery images.

## Implemented flow

- Catalogue cards use a responsive grid, a consistent image ratio, name, linked supplier, price/unit, availability and View product. Save remains a compact heart. Secondary notes, terms, review disclaimers, basket controls and board controls have moved off cards.
- Suppliers and Filters share panel dimensions, mobile dialog, escape/focus behaviour and desktop disclosure. Supplier choices include recorded area and product count. Opening one panel closes the other.
- Browse shows read-only delivery/event/collection dates and links to Wedding plan; there are no catalogue date inputs. Availability continues to use the parent's current event data.
- `/design?tab=catalogue&product=<id>` opens a full studio detail view using the existing event and basket state. ProductPurchase supports selecting a whole quantity before adding as well as editing existing basket quantities.
- `/products/<id>` is a public product page with canonical metadata, supplier profile link, missing-photo and unknown-terms states and Add to studio. It uses the existing anonymous public catalogue reader. Missing/withdrawn products receive a not-found page. Development preview products retain the existing development-host restriction and never receive the add-to-basket query.
- Add to studio carries `product=<id>&add=<id>` into the existing studio handler, adding a real product once and opening its detail. Request submission still performs existing date/quantity checks; this action does not reserve stock or take payment.
- Public links carry a sanitized `returnTo` catalogue URL; category, supplier, search, style, price, sort and venue scope survive return and studio handoff. In-studio detail navigation preserves mounted filter state and writes filters into the detail URL for reload.

## Integration API for planning / visualiser owner

`ProductBrowser` and `ProductDetails` accept `onVisualise?: (item: CatalogueItem) => void`. When supplied, a Use in visualiser action appears on real product cards and studio details. The parent should retain the selected real catalogue ID(s) before switching to the visualiser. The callback deliberately does not silently add to the basket. This agent has not edited `app/design/page.tsx`; its owner must wire the callback there.

Legacy date/board props remain accepted to avoid breaking other owners' call sites, but the catalogue no longer renders their editing/board UI. Existing detail drawers used elsewhere remain supported; the catalogue itself uses full-page presentation.

## Verification

- Existing baseline: 332 tests passed before this work.
- Focused final checks: 18 tests passed across `catalogue-product-ux.test.cjs` and `shopping-audit.test.cjs`.
- Full shared-checkout test suite: 366 tests passed; the subsequent location-preservation regression also passed in the focused run.
- Isolated TypeScript check passed, excluding concurrently regenerated `.next` declarations. The parent owns the final Next build.
- Browser check was attempted but unavailable: the browser extension timed out and the local preview could not bind its port in this session. Desktop, 390px/360px, interactive focus/escape and real development-data walkthrough remain for browser QA; no claim of browser verification is made.
