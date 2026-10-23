# Studio navigation update

23 October 2026.

## Implemented

- Five main destinations: Browse, Saved, Visualise, My wedding and My orders.
- Desktop uses a quiet text navigation bar. Mobile uses a fixed, labelled bottom navigation with safe-area spacing.
- Catalogue and Venues sit under Browse. Saved groups Items, Looks and Boards, with counts and short explanations.
- Removed duplicate saved-look header access and inline wedding settings. My wedding is the dedicated editing destination.
- Basket is a separate header action with the total quantity, available from every studio section. Orders remains submitted requests.
- Saved product filters are collapsed initially. Existing `?tab=saved`, `?tab=looks` and `?tab=boards` links and account-owned data continue to work.

## Verification checkpoint

Type checking, production build and 18 existing tests pass. Desktop/mobile browser checks and final deployment are in progress at this checkpoint. No schema, access policy or production database changes are required.

## Next: external inspiration inside Boards

Requested location: **Saved > Boards > Add inspiration**. Keep these options with the active board, rather than in the main navigation or the Items/Looks collections.

- Upload photo: existing private upload capability.
- Google Photos: use the official Photos Picker API. The user connects Google, selects individual photos, previews the selection and adds chosen images to the current board. Do not request whole-library access. Provider project setup, OAuth client and verification are required before public launch.
- Pinterest: connect via OAuth with read-only board/Pin scopes; let users select a board and specific Pins. Standard access approval is required for the public integration. Preserve the source Pin link and attribution, check applicable display/storage policies before choosing between a linked Pin and a copied image, and do not scrape private Pinterest boards.
- Keep imported inspiration distinct from purchasable catalogue products. Private venue uploads and inspiration have different uses; do not silently send imported images to AI generation.
- Add providers only when configured and approved. Do not ship misleading connection buttons. Include cancellation, expired-session/reconnect, failure and empty-selection handling. Disconnect removes tokens, with deletion of imported board content a separate user choice.

Provider connections are planned, not implemented in this navigation checkpoint.

References:
- https://developers.google.com/photos/picker/guides/get-started-picker
- https://developers.google.com/photos/overview/configure-your-app
- https://dev.pinterest.com/docs/key-concepts/access-tiers/
- https://developers.pinterest.com/docs/api/v5/pins-list/
