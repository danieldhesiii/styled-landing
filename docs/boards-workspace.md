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
