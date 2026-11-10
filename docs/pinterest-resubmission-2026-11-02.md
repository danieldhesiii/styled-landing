# Pinterest application corrections, 2 November 2026

## Status and limits

Support update, 2 November: the owner explicitly authorised "Send the support request". A request was submitted through Pinterest Help > Pinterest API and Developer Tools > API Access for existing app 1633411. Subject: "App 1633411: correction email but Trial pending and editing locked". Pinterest redirected to /en/contact/success/ and confirmed "We got your message" and "Request sent! Check your email for updates." No case reference was displayed. No attachments were sent. This is confirmation of support-message receipt, not API approval or a new application submission.

The message asked Pinterest to confirm the conflicting feedback/pending status and unlock or return the existing application for correction. It supplied the now-live https://styleduk.com/privacy policy, a complete read-only OAuth and selected-image workflow description, and a request for explicit permission concerning private copying/storage, AI-provider transfer and generated results. Direct importing remains disabled. Wait for Pinterest's response before trying duplicate requests or treating the application as approved.

Release update: the owner subsequently approved the one-file live privacy update. It is published and publicly verified at https://styleduk.com/privacy. See live-privacy-release-2026-11-02.md for commit, scope and evidence. Earlier preparation notes below describe the pre-approval state. The Pinterest description remains locked/pending; no resubmission has been performed by this release.

The owner reported Trial pending after personally submitting, then supplied Pinterest's generic rejection feedback about privacy-policy accessibility/association/label and app-description accuracy. This supersedes the earlier prepared-form/CAPTCHA checkpoint. The exact rejection cause has not been confirmed. Do not present API approval as granted or hide the proposed AI use to obtain approval.

Chrome navigation initially failed because automatic approval review had reached its usage limit. After the owner asked to continue, normal Chrome control became available again. The existing app was inspected through its normal UI. No Pinterest application changes or resubmission were performed in this correction pass.

Verified submitted fields for app 1633411: app name StyledUK; company Styleduk; app URL http://www.styleduk.com/; privacy URL https://styleduk.com/privacy; purpose: "This is a wedding marketplace to hire decorations and venues". Both the dashboard and Configure show Trial access pending; Details fields and Save are disabled. The submitted description is much shorter than the previously prepared one. The reported feedback and current pending dashboard must not be treated as proof of the same final review state.

## Public access check before changes

Unauthenticated requests to both development /privacy and styleduk.com/privacy returned HTTP 200 with HTML policy text, no login redirect. Both were titled and headed Privacy information. The development policy already included the optional Pinterest connection; the live policy did not. These checks do not prove what Pinterest's reviewer received or the submitted field values.

Changes stay in the development repository/project. The root domain, live repository and live database are unchanged. The application actually links to the live policy, so a development-only fix does not update the submitted URL. A one-file live policy patch is prepared at docs/patches/styleduk-live-privacy-only.patch; it is not applied or published. The owner must explicitly approve that live policy release under the existing environment rules. Alternatively, when editing unlocks, change both app and policy URLs to the development host. Do not claim the submitted live policy is corrected until a live release has been approved and verified.

## Corrections

- Explicit Privacy policy title, visible heading, footer/auth/legal link labels and canonical URL.
- Clear Styled UK / Styled Wedding Planner identity, support email and association between the official company website and the development application.
- Concrete explanation of optional OAuth, read-only scopes, optional secret-board access, fields read, selected private copies, AI-provider transfer only on Generate, encrypted token lifetime, disconnect and deletion requests.
- No invented legal entity, address, fixed retention/deletion guarantee or provider approval.

## Use these consistent application fields

- App name: StyledUK (keep the existing app)
- Company: Styled UK
- Company website or app link: https://styleduk.com/ if the owner approves the live privacy-only correction; otherwise use https://styledukprodprogress.vercel.app when editing unlocks.
- Privacy policy: https://styleduk.com/privacy after the separately approved policy release; alternatively https://styledukprodprogress.vercel.app/privacy with the matching development app URL.
- Developer purpose: Consumer experience, because this is a customer-facing wedding planning application. The separate description must still disclose the AI feature explicitly; do not recategorise to conceal it.
- Use cases: Pinner App and Ecommerce
- Audience: Pinners
- Reads Pins/Boards: Yes, mine, meaning the connecting authenticated Pinner's own authorised boards/Pins, not arbitrary other accounts. Ask Pinterest if they require a different access classification for this exact use.

## Complete description to paste

StyledUK is the Pinterest integration for Styled UK's customer-facing wedding planning application. Couples organise private inspiration boards, explore wedding suppliers and create illustrative styling previews using their venue photographs. New features are tested at https://styledukprodprogress.vercel.app before release to the company website https://styleduk.com. Our privacy policy describes the optional Pinterest connection and the proposed data use.

The proposed Pinterest integration uses OAuth with boards:read and pins:read. Secret-board read scopes are requested only if the user opts in. Users choose one of their authorised boards, select up to three individual image Pins and confirm that they have permission to copy and use those images. Styled would save selected image copies privately with their titles and source Pin links. It does not scrape Pinterest pages, publish/edit Pins or read arbitrary unconnected accounts.

Only when the user separately chooses Generate would selected images be sent to our configured image-generation provider as mood references alongside the user's venue photo. Generated previews may be saved privately by that user. Styled does not train or fine-tune models on Pinterest content. Access tokens are encrypted in HttpOnly cookies for at most one hour; no refresh token is retained. Users can disconnect and request deletion of imported copies through support@styleduk.com.

Direct importing is implemented but disabled pending Pinterest approval. We request explicit review of permission for selected-image copying/storage, AI-provider transfer and generated results. We will not enable those uses based solely on generic API access if additional permission is required. Initial Trial testing is with the Styled business account; wider customer access would follow the applicable review process.

## Before resubmitting

1. Open the policy while signed out and confirm the complete page loads with Privacy policy at the top. Keep app and policy URLs consistent with the approved hosting choice above. Development verification passed with ordinary and Pinterest-style user agents, HTTP 200, full server-rendered policy text, canonical URL and no Vercel challenge. This does not prove what Pinterest's actual reviewer receives.
2. Update the existing rejected application, not a duplicate app. Review the actual submitted values in Pinterest; the pasted email alone does not reveal them.
3. Paste the full description, preserving AI/storage disclosures. If the field imposes a shorter limit, condense it without removing the material uses.
4. Submit after normal CAPTCHA/required approvals. Existing owner intent to proceed is recorded; do not bypass a fresh browser-review failure or provider prerequisite.
5. Record the actual review response. A corrected label or successful resubmission is not a promise of approval.
