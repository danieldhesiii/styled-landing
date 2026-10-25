# Usability review, 25 October 2026

## Journey and responsibility

Customer planning stays in the studio. Wedding plan records private details for the currently selected event; Find venues discovers spaces and sends separate requests. Catalogue and Basket handle supplier products. Boards organises inspiration, Saved keeps favourites, and Visualise is optional. My bookings tracks requests already submitted. Venue and supplier operators keep separate workspaces.

## Changes

- Rewrote task-specific help around the current interface, including multiple events, the header countdown, per-item hire dates, saved collections, board inspiration, real product references, manual supplier review and venue media placeholders.
- Added a Start here guide explaining which section does what. Merged Items and Looks into one Saved guide matching the actual navigation.
- Separated public supplier discovery help from supplier workspace help. Venue operators receive their own listing, media, requests and calendar guidance.
- Replaced the mobile help tab grid with a labelled topic selector, preserving desktop tabs and keyboard navigation. Topic changes do not navigate or modify the underlying plan. Support remains directly available.
- Reduced repeated delivery instructions while keeping confirmation requirements visible. Moved examples and detailed lead-time advice into expandable help.
- Used event-specific guest/date labels and Supplier requests consistently on customer request screens. Kept the My bookings destination name.
- Reworked basket rows so product names have room, quantity controls and totals sit on their own row, and removal remains distinct. Quantity buttons identify the product for assistive technology.
- Empty boards expose Add to board immediately. The disabled visualiser shortcut explains which content it needs. Import guidance distinguishes a missing board from loading, and Google Photos correctly describes a single-photo upload.
- Added a direct next action from an empty Saved looks collection to Visualise. Simplified landing copy without removing the separate booking and payment notices.

## Boundaries

No change to supplier approval, stock checks, pricing, payment, authentication or image generation. A preview is not an exact product guarantee; a saved venue is not a booking; a submitted request takes no payment and needs confirmation. Pinterest links do not download boards, and Google Photos has a manual download/upload flow. Walkthroughs require a captured tour link, not just uploaded photos.

## Verification

Help routing regression tests cover customer context, shared Saved help and business separation. UI checks cover help topic changes without background navigation, mobile reading space, keyboard dismissal, planning dates, board import instructions and basket layout. Build and existing tests must pass before publishing. No test bookings, supplier emails or paid image generation are required.
