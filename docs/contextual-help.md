# Contextual website help

The shared How it works dialog opens on the topic relevant to the current page or studio section. Topics cover the catalogue, venues, saved items, AI visualiser, saved looks, basket and checkout, orders, suppliers and venue partners.

Topic selection belongs only to the dialog. Selecting a help tab never navigates, updates the studio tab, generates an image or changes the basket. Reopening help restores the page's relevant starting topic.

Public header and footer controls use the current route. The studio uses its active section; checkout selects the basket guide. Saved looks, My orders and the mobile basket have their own contextual controls. The landing page's introductory steps now describe browsing and saving before optional visualisation.

## Accessibility and overlays

The native modal dialog traps focus, restores it to the opener and locks background scrolling. Topic buttons expose tab/tabpanel relationships and support arrow keys, Home and End. Escape and close events are contained so closing help leaves the underlying saved looks, orders or mobile basket panel open. Mobile layout uses a two-column topic list and a scrolling content area.

## Content boundaries

Help distinguishes saved products from saved generated looks, venue selection from date confirmation, and applications from approved account access. Checkout guidance identifies preview payments as placeholders with no card charged.

## Verification

- TypeScript check and production build passed.
- Desktop venue help opened on Venues; switching topics preserved the route and guest filter, and closing restored focus.
- Mobile help fit a 390px viewport without horizontal overflow; the menu stayed open behind it.
- Unsaved venue application text and studio catalogue search survived topic changes.
- Studio Saved items selected the matching guide; the wedding-details editor remained expanded.
- Escape closed help while keeping Saved looks, My orders and the native mobile basket open. Basket quantity and total were unchanged.
- Supplier portal help opened on Suppliers and preserved the portal route.
- Disposable development-only account and private supplier were removed after testing.

Screenshots: `screenshots/how-it-works-desktop.jpg` and `screenshots/how-it-works-mobile.jpg`.
