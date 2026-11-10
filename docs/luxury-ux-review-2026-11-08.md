# Luxury retail navigation review — 8 November 2026

## Official-site comparison

Research used the web tool against official sites. Findings below are navigation/content observations from returned pages, not a claim of a device-by-device visual or interaction audit.

| Reference | Observed pattern | Adaptation for Styled |
| --- | --- | --- |
| [The Conran Shop](https://theconranshop.com/) (the UK address redirects here) | Shop and room-led discovery are distinct from business access; help, services and contact links are grouped in the footer. | Clear customer discovery in the header, business utility link, grouped footer. No retail-sized mega-menu for Styled’s smaller inventory. |
| [1stDibs](https://www.1stdibs.com/) | Product categories lead; style/creator discovery, seller directory and editorial inspiration have distinct destinations. | Keep public navigation focused on venues and suppliers, separate from business/account actions. Contextual How it works remains signed-in only, per the standing user preference. |
| [NET-A-PORTER](https://www.net-a-porter.com/en-gb/) and its [dresses listing](https://www.net-a-porter.com/en-gb/shop/clothing/dresses) | Category/editorial navigation and sign-in are separate; listing content exposes filtering and result counts. | Account action stays distinct from browsing; venue sorting is visible beside results rather than buried in advanced filters. |
| [THE WED directory](https://thewed.com/vendors) | Vendors and venues are primary destinations; directory refinement uses categories and locations with a visible count. | Concise discovery labels, visible venue count, removable filter selections and a separate shortlist control. No claim that Styled uses the same vetting or membership model. |

Design inference: hierarchy, predictable destinations and reduced framing suit Styled better than adding luxury claims, badges or decorative movement. No source assets, partner names, reviews or endorsement claims were copied into the product.

## Implemented — owned scope only

- `components/SiteHeader.tsx`: public discovery links are Venues and Suppliers; business, login and planning actions remain separate. No public How it works entry or landing help headline. Larger existing wordmark treatment; explicit mobile Menu/Close labels; expanded state, hidden navigation and Escape focus return; mobile link/route changes close the menu. Venue/supplier business routes are not incorrectly highlighted as customer discovery.
- `components/SiteFooter.tsx`: Explore, Help and For businesses groups; full privacy/terms links remain easy to reach. Two-column mobile layout and existing brand colours/typefaces.
- `app/(site)/layout.tsx`: width-safe content and focusable skip-link destination.
- `app/(site)/page.tsx`: existing imagery and AI notices retained; flatter feature/editorial sections replace repeated bordered cards; clearer heading measure, venue and supplier discovery actions, quiet interactive affordances.
- `components/venues/VenueSearch.tsx`: sorting beside results, removable and wrapping filter selections, URL updates when removing filters/sorting, restrained filter surface, readable fields and larger action targets. Existing availability checks, venue restrictions, error handling, price caveats, shortlist behaviour and demo separation remain.

New local transitions use `motion-safe:` (200ms colour/transform changes and existing 250ms fade). Reduced-motion users receive immediate state changes. No animation library, global style changes, new imagery or dependencies. Existing motion inside unowned child components was not changed or newly certified.

## Validation and limits

- Focused existing public/venue/supplier suite: **39 passed, 0 failed**.
- Additional transient component checks passed: mobile menu toggles and Escape/ARIA state; individual venue filter removal; one sort control outside advanced disclosure; footer discovery/help/business/policy destinations; motion utilities guarded with `motion-safe:`.
- Owned-path whitespace/diff checks passed. Layout/source review covers narrow-screen wrapping, 44–48px navigation/actions and readable existing text sizes.
- Final TypeScript repeat: **passed**, exit 0. An earlier nullable-total error in concurrently edited quote work was resolved by its owner. Final focused repeat after URL/supplier-link refinements: **22 passed, 0 failed**.
- No browser walkthrough, screenshots, rendered mobile-overflow verification or performance measurements claimed. Earlier browser availability failures remain a verification limitation. No Next build, commit, deployment, payment or public publication performed. Globals, studio/design, products and other agents’ changes were left to their owners.
