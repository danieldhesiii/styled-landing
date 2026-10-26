# Saved items and a separate visualiser

Implemented 23 October 2026 in the production-progress app.

- Product cards offer Save / Saved independently of the basket. Saving does not add a product to the basket or open the generator.
- Saved items have their own studio tab, separate from Saved looks. They survive refreshes and follow the signed-in account across devices.
- The AI visualiser has a dedicated studio tab. Both Visualise shortcuts select it; it no longer opens as a mobile modal or sits beneath the catalogue.
- Product cards no longer include See how it looks. Generation only begins when explicitly requested inside the visualiser.
- Switching between tabs keeps basket quantities, wedding details and render state. Saved looks still open in their existing collection drawer.
- Venue/style deep links with `render=true` select the visualiser. `tab=saved` opens saved items, and `tab=visualiser` opens the generator workspace.
- Save requests show pending/error states, prevent repeated clicks and retain the previous state if persistence fails.

## Database and access

`20261022225435_saved_items.sql` was applied only to Wedding Planner Dev (`qkyeitvwscrxbiwamxan`), the database used by the Vercel production-progress app. Each row belongs to one account and references one product. Account/product uniqueness prevents duplicates; row-level policies restrict reads and deletes to the owner and prevent saving on behalf of another owner. Anonymous access and ownership updates are denied.

## Verification

- Production build and TypeScript checks passed.
- `supabase/tests/saved_items_access.sql` passed transactionally: anonymous denial, owner save/read/remove, duplicate prevention, other-account read/delete isolation, forged-owner insert rejection and ownership-update denial. Fixtures rolled back.
- Browser checks passed: save without basket insertion, saved collection, refresh persistence, unsave/resave, independent saved-looks drawer, visualiser tab selection and basket preservation.
- Phone-width check passed at 390px with no horizontal page overflow; the Visualise shortcut changes tabs with no modal open.
- Security advisors reported no findings on saved_items. Existing unrelated development-project notices are unchanged.
- No image generation or order was submitted during verification. The disposable account is removed after testing.

Screenshots: `docs/screenshots/saved-items-desktop.jpg` and `docs/screenshots/visualiser-tab-mobile.jpg`.

The unrelated nested `styled-landing/` checkout is excluded from root TypeScript checks and from deployment. Its contents remain untouched.
