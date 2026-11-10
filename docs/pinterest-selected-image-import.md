# Pinterest selected-image import, development

Latest status, 3 November 2026: Pinterest dashboard confirms **Trial access active** for app StyledUK (ID 1633411). The development OAuth callback is registered. Trial access allows work to continue on read-only board/Pin viewing. It does not by itself establish permission to persist Pin images in Styled storage or create AI output from them. Pinterest Developer Guidelines prohibit storing API information by default and prohibit creating new content from Pins for distribution unless expressly permitted. Direct image copy and AI use therefore stay disabled while written permission is confirmed. Older setup notes below are historical.

## Current status

OAuth, board listing, paginated Pin viewing and an isolated image-copy path exist in the development code. The read-only viewer and image reuse now have separate server-side gates. The image-copy path remains unavailable unless a distinct permission reference and flag are configured. No real Pinterest account has connected through Styled and no real Pin image has been downloaded or sent to AI by this implementation. Tests use mocked providers; they do not establish real-user functionality.

On 2 November 2026 Chrome showed a personal Pinterest account. Pinterest requires a business account to create a developer app. The page was left open for the owner. No account conversion or terms acceptance was performed.

The owner then created the Styled business account. The developer onboarding page recognises that account but still requires email verification. One verification email was requested. Developer Terms and app registration remain pending.

Later on 2 November the owner completed verification/onboarding and My apps became accessible. The first app request is fully prepared in Chrome: Styled Wedding Planner, Styled UK, Styled logo, development app/privacy URLs, explicit private-copy and AI-reference disclosure; MCP/AI connector, Pinner App and Ecommerce, audience Pinners, authenticated Pinner's own data. The owner explicitly approved submission. The submission attempt was blocked by automatic approval review because the required reCAPTCHA service was unavailable. A normal page refresh was performed and all application fields and the logo restored. The form is left open for the owner to complete browser verification and submit directly. No successful submission, app ID, secret, access token or API approval has been confirmed yet. Do not mistake the completed form for an approved app or ask again for the already granted submission approval.

## Customer flow during Trial

Boards > choose a Styled board > Connect Pinterest > load your boards > choose a board > view Pins and open their Pinterest sources. Disconnect removes the encrypted token cookie for this browser. Board names and Pin data are requested as needed and held in the page while viewing; they are not saved as Styled board entries.

The view is read-only and uses Pinterest source links. It does not copy a Pin into Styled storage or pass it to image generation. Customers can upload a photo they own or have permission to use through the normal upload option. Direct reuse remains a distinct feature and is not enabled by API Trial approval alone.

Only image Pins returned by the API appear in this view; video Pins are omitted. This is not a scraper or a whole-account export.

## Development activation steps

1. Pinterest dashboard currently shows Trial access active. The exact configured callback is https://styledukprodprogress.vercel.app/api/pinterest/callback; OAuth requests only boards:read and pins:read.
2. Configure PINTEREST_APP_ID and PINTEREST_APP_SECRET privately in the development Vercel project. Keep credentials server-side; never commit or paste them into chat.
3. For read-only board viewing, set PINTEREST_API_ENABLED=true and PINTEREST_API_APPROVAL_REFERENCE to the Pinterest app ID/access-tier record, then redeploy development.
4. Keep PINTEREST_IMAGE_REUSE_ENABLED unset/false until Pinterest gives written permission for selected image copies, private storage, AI-provider transfer and generated results. If approval arrives, store its case/email reference in PINTEREST_IMAGE_REUSE_APPROVAL_REFERENCE, enable the separate flag, and redeploy development.
5. Test the read-only flow with the Styled account: connect, cancel, list boards, paginate Pins, open Pin sources, disconnect, expiry/reconnect and account isolation. Test image persistence/AI only after the separate written permission is recorded. Do not enable on styleduk.com without a separate release.

## Ready-to-submit use case for Pinterest

Styled is a wedding planning service. Users would authorize read-only access to their own or shared Pinterest boards, select up to three individual image Pins and explicitly request copying them to a private Styled inspiration board. We would retain source Pin links. When a user separately chooses Generate, selected images would be sent to our configured image-generation provider as mood references alongside the user's venue photograph. We would not train or fine-tune models on Pinterest content or scrape Pinterest pages.

Please confirm whether this use is permitted, including private image storage, transmission to the image-generation provider, creation/storage of generated results, retention/deletion obligations and attribution. If express permission or a separate agreement is required, please advise the process. We will keep direct import disabled until this is resolved.

This text was prepared to request clarification and permission. Pinterest granted Trial API access, but the access approval email did not specifically approve storage of Pin images or AI use. Do not treat general API approval as consent to those additional uses.

## Security and verification

Local verification on 2 November: all 295 tests passed, with zero failures/skips; TypeScript and build passed. Provider and board tests use fictional responses; no real Pinterest OAuth or image-generation call was made.

- Verified nonanonymous Styled accounts only, using Supabase getUser. No new database grants or migrations.
- Read-only OAuth scopes. Random, encrypted, account-bound state expires after ten minutes. Fixed return route, validated target-board UUID and both scopes checked at exchange.
- Access tokens are AES-GCM encrypted in Secure/HttpOnly/SameSite=Lax cookies scoped to /api/pinterest. Expiry is at most one hour or the shorter provider lifetime. Tokens never enter localStorage, database, logs or plaintext client responses. Refresh tokens are not retained. The app secret derives a purpose-specific cookie encryption key; rotation invalidates connections.
- Disconnect clears the current browser's connection, not the provider grant. Users can revoke that grant in Pinterest settings. Imported photos remain subject to existing private-photo management.
- Writes require same-origin bounded JSON; rate checks fail closed. Every image download re-reads the selected Pin using the current user's token and verifies board membership. Exact HTTPS image-host allowlist, no redirects, bounded bytes/timeouts and no CDN authorization headers. Client URLs cannot choose the server fetch target.
- Existing upload processing re-encodes bytes, strips metadata and enforces private ownership/quotas. Inspiration uploads do not change the current venue used for further room-angle uploads.
- Run node --test tests/pinterest-import.test.cjs tests/board-inspiration.test.cjs; then npm run check. Provider mocks verify behavior without credentials or real provider calls. Real OAuth, app approval and actual AI generation remain unverified until configured.

## Primary references checked 2 November 2026

- https://policy.pinterest.com/en/developer-guidelines restricts API-content storage, third-party sharing and creating new content from Pins. No-training alone does not establish permission for inference/storage.
- https://github.com/pinterest/api-description/blob/main/v5/openapi.yaml documents boards/list, boards/list_pins, pins/get and oauth/token.
- https://developers.pinterest.com/docs/key-concepts/access-tiers/ describes app access and review.
- https://help.pinterest.com/en/article/download-an-image documents individual downloads. Availability varies by Pin. Existing manual upload remains available for images users have permission to use.
