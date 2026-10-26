# Independent Boards workspace

23 October 2026. Supersedes the initial Saved/Boards grouping in studio-navigation.md.

## Implemented

- Boards is a primary destination on desktop and mobile. Saved contains only Items and Looks.
- Mobile has five destinations: Browse, Boards, Saved, Visualise and My wedding. My orders remains available from the account menu and as a desktop destination.
- Boards links to Saved Items and Saved Looks. Catalogue pieces can be saved to Items or added to the basket. Saved AI looks can be reopened individually in the visualiser.
- Add inspiration shows upload, Google Photos and Pinterest icons with inline instructions. Google Photos currently uses a guided download/upload flow. Pinterest supports saving an allowlisted HTTPS board/Pin link as a private note plus guided image upload. A saved Pinterest link does not import its images.
- Direct OAuth imports are not connected. Provider setup/approval is still required. No misleading sign-in/import buttons are shown.
- Use board in visualiser prepares up to three private inspiration photos, twelve catalogue pieces and bounded notes. It keeps the selected room and basket unchanged, does not generate automatically, and offers an explicit remove action in the visualiser. Preparation lasts for the current studio session; the board itself remains saved.
- The image request uses separate private inspiration photo IDs. Server queries require the signed-in owner and preserve explicit venue-photo order, avoiding the old latest-upload lookup when a board photo was uploaded more recently than the actual room.
- Model instructions distinguish venue architecture, catalogue product references and mood-only inspiration. Inspiration must not introduce products outside the catalogue.

## Verification

Production build, typecheck and all 23 tests pass, including ownership/order failures, unsafe Pinterest links, reference limits, board preparation and image-role instructions. Browser checked desktop and 390 px mobile with no horizontal page overflow. Verified provider guides, persistence of a Pinterest source link, private photo upload and a board-to-visualiser handoff showing the correct inspiration and product counts with an unchanged empty basket and no room photo replacement. No paid image or real order was generated. Disposable customer fixture and private uploaded assets were removed after testing. No schema changes or new permissions.

Screenshots: `screenshots/boards-imports-mobile.jpg`, `screenshots/boards-imports-desktop.jpg`.

## Outstanding provider setup

See studio-navigation.md for official Google Photos Picker and Pinterest API links. Public direct account connections require provider configuration and approval. Until configured, users can upload selected photos and save Pinterest source links using the visible guides.


## Pinterest viewing workspace

Boards now supports a Pinterest preview beside the active Styled board. Paste a full board or Pin URL under Import photos > Pinterest, then save and view it, or preview it without saving. Existing saved Pinterest cards expose View beside my board. On a phone, the preview stacks above the board content and can be closed without leaving the board.

Public previews use Pinterest’s official board/Pin widget inside a sandboxed iframe. The widget document has scripts and popup permissions only, no same-origin access to Styled. No Pinterest account token, Styled session, private image URL or board name is passed to the widget. Third-party content loads only after choosing to view it. Board previews may show at most 50 Pins and do not copy those images to Styled.

Open Pinterest window opens the exact source link in a separate window, allowing normal Pinterest sign-in and private-board viewing. An ordinary new-tab link remains available when popups or embeds are blocked. Shortened pin.it links are preserved for opening on Pinterest; the preview explains that a full board/Pin URL is needed for embedding.

There is no bulk downloader or account-import claim. Automatic board access requires a registered Pinterest app, OAuth and provider approval. Users can download an individual image using Pinterest’s own option when available, then upload a copy to Styled. Only uploaded photos explicitly chosen for the visualiser become image inputs. No database or authentication changes are needed.

Official references: https://dev.pinterest.com/docs/web-features/widgets/ and https://developer.pinterest.com/docs/getting-started/connect-app/.

Pinterest viewer verification: public wedding board images rendered through the official widget; the separate-window button opened the exact board URL; saving a source twice kept one reference; unsafe URLs were rejected; shortened links showed the manual-open fallback without creating a widget. Mobile preview at 390 device pixels had no horizontal page overflow. Test board edits stayed in local component state. The temporary preview route was removed before deployment.
