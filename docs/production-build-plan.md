# Styled — Production Build Plan

> This document defines everything that needs to be built to turn the current MVP into a full production marketplace. It is written for a developer implementing the features — all file paths are relative to the project root.

---

## Overview

Styled is a **wedding décor marketplace + AI visualiser**. Couples upload their venue, design their look with real supplier products, see an AI-rendered preview, and order everything in one go.

The three pillars of the production site are:

| Pillar | URL space | Status |
|---|---|---|
| **Venues** | `/venues`, `/venues/[slug]` | Not built |
| **Suppliers** | `/suppliers`, `/suppliers/[id]` | Partially built |
| **Marketplace / Design studio** | `/design` | Built but needs restructure |

---

## 1. Venues

### What we want

Styled partners with UK wedding venues. The venues section serves two goals:

1. **Marketing** — show couples how their venue looks when fully styled by Styled suppliers. The aspiration is to list a venue, show professional photography of it dressed for a wedding, and offer a "start your design in this venue" CTA.
2. **Date booking** — couples can reserve a styling date at a venue directly through Styled. Styled coordinates the supplier deliveries and setup for that date.

### Pages to build

#### `/venues` — Browse all partner venues

- Hero: "We partner with venues" + short pitch (Styled dresses your space, markets it to couples, and coordinates every supplier on the day)
- Grid of venue cards: name, location, capacity, hero photo, "From £X styling packages"
- Filter: county / region, indoor/outdoor, capacity range
- CTA strip: "Are you a venue? Partner with us →" (links to `/venues/partner`)

#### `/venues/[slug]` — Venue detail page

Sections (in scroll order):

1. **Hero** — full-bleed venue photo (empty space), venue name + location + headline stat (e.g. "Seats up to 200 · Essex")
2. **Gallery** — 4–8 photos of the venue fully dressed for a wedding (professional shoot or supplied by venue). Lightbox on click.
3. **Video tour** — embedded YouTube/Vimeo video of the venue + a "3D walkthrough" button (Matterport or similar iframe embed — URL stored per venue). These are recorded on-site visits.
4. **Styled packages** — 2–4 preset styling packages available at this venue (e.g. "Garden Romance — from £4,200", "Classic Elegance — from £5,800"). Each links to the `/design` studio pre-loaded with this venue's sample image and that style preset.
5. **Available dates** — calendar widget showing which dates are open for bookings. Clicking a date opens a reservation flow (name, email, guest count, preferred package → sends an enquiry, no payment at this stage).
6. **About the venue** — short description, facilities, nearby accommodation
7. **Map embed** (Google Maps static or Mapbox)
8. **CTA** — "Design your day at [Venue Name] →" → `/design?venue=[slug]`

#### `/venues/partner` — Venue partner application

- Short pitch to venue owners (Styled markets your space, brings vetted suppliers, one coordinator on the day)
- Simple form: venue name, contact name, email, county, capacity, website, brief message
- Submits to `vendor_applications` table (reuse existing) with `category = 'venue'`

### Database changes needed

New table: `public.venue_listings`

```sql
create table public.venue_listings (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  location        text not null,           -- e.g. "Chelmsford, Essex"
  county          text not null,
  capacity_min    integer,
  capacity_max    integer,
  indoor_outdoor  text check (indoor_outdoor in ('indoor','outdoor','both')),
  description     text,
  hero_image      text,                    -- storage path or external URL
  gallery_images  text[] not null default '{}',
  video_url       text,                    -- YouTube / Vimeo embed URL
  matterport_url  text,                    -- 3D walkthrough iframe src
  map_embed_url   text,
  package_from_pence integer,             -- lowest package price for display
  active          boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
```

New table: `public.venue_packages` (the styled packages available at each venue)

```sql
create table public.venue_packages (
  id           uuid primary key default gen_random_uuid(),
  venue_id     uuid not null references public.venue_listings (id) on delete cascade,
  name         text not null,              -- "Garden Romance"
  style_id     text not null,             -- matches lib/styles.ts id
  description  text,
  price_from_pence integer not null,
  sort_order   integer not null default 0
);
```

New table: `public.venue_enquiries`

```sql
create table public.venue_enquiries (
  id           uuid primary key default gen_random_uuid(),
  venue_id     uuid not null references public.venue_listings (id),
  package_id   uuid references public.venue_packages (id),
  name         text not null,
  email        text not null,
  phone        text,
  guest_count  integer,
  preferred_date date,
  message      text,
  status       text not null default 'new' check (status in ('new','contacted','booked','declined')),
  created_at   timestamptz not null default now()
);
```

Add to admin panel: `/admin/venues` — list and edit venue_listings, manage packages, view enquiries.

### Design system notes

- Venues pages use the same `(site)` layout as the landing page (cream background, serif headings)
- Gallery: use a CSS grid of photos with a simple JS lightbox (no external library needed — native `<dialog>` works)
- Date calendar: build a simple month-grid component. Booked dates pulled from `venue_enquiries` where `status = 'booked'`. No third-party calendar library.
- 3D walkthrough: `<iframe>` with `allow="xr-spatial-tracking"` attribute for Matterport. URL stored in `venue_listings.matterport_url`. Show a "View in 3D" button that expands the iframe in a modal.

---

## 2. Suppliers

### What we want

The `/suppliers` page already exists and lists supplier cards. The gaps are:

1. **Supplier detail page** — `/suppliers/[id]` exists as a route file but needs building out properly with all the supplier's products visible, a story, and a "contact" or "enquiry" path.
2. **Supplier onboarding landing** — a public `/suppliers/join` page that pitches the business case for joining Styled and ends in a vendor application form.
3. **Portal improvements** — the existing supplier portal (`/portal`) lets suppliers manage their own products and availability. It needs a stock import UX polish and clearer onboarding steps on first login.

### Pages to build / improve

#### `/suppliers/[id]` — Supplier profile (public)

- Header: logo (from `suppliers.logo_url`), name, area, short bio
- Product grid: all active products for this supplier — same card style as marketplace. "Add to basket" links to `/design` pre-populating the basket.
- "Browse in the design studio →" CTA

The existing route file at `app/(site)/suppliers/[id]/page.tsx` is the shell — implement the full content here.

#### `/suppliers/join` — Supplier onboarding landing

Pitch sections:

1. **Hero** — "Reach couples designing their whole wedding around your pieces"
2. **How it works** — 3 steps: (1) List your products, (2) Couples design with them in our AI studio, (3) We send you confirmed orders
3. **Commission model** — be transparent. Something like: "Styled charges a [X]% commission on each sale. You keep the rest. No subscription, no listing fee."
4. **Requirements** — what Styled expects (UK-based, reliable delivery, quality photos)
5. **Application form** — same fields as vendor_applications (business name, contact, email, phone, product category, area, website, message). Submits to `vendor_applications` table.
6. **Existing suppliers** — show 3–4 supplier logos as social proof

#### Portal improvements (`/portal`)

The existing portal already handles:
- Dashboard with recent orders
- Products list + stock import
- Availability calendar
- iCal sync

Improvements needed:
- **Onboarding checklist** on first login: (1) Add your logo, (2) Add your first product, (3) Set your availability. Show a progress bar. Mark steps complete as they do them.
- **Logo upload** — add a logo upload field on the portal dashboard. Writes to `suppliers.logo_url` via a server action.
- **Product photo upload** — currently products only have an `image` URL field (external URL or path). Add a file uploader in the portal products page that stores to Supabase storage bucket `supplier-assets` and saves the path to `products.image`.

New storage bucket needed: `supplier-assets` (public reads, supplier-scoped writes via RLS).

---

## 3. Marketplace / Design Studio Restructure

### What we want

The current `/design` page has the AI render stage as the dominant element, with the catalogue pushed below it and the basket in a sidebar. The user has to scroll past the render to reach the catalogue.

**New philosophy:** The catalogue is the marketplace. The AI render is a tool that enhances it. Structure the studio so the catalogue is immediately visible and usable — couples can browse, filter, add to basket, and only trigger a render when they want to see how it looks.

### New layout for `/design`

Split the page into two clear zones:

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER — logo · saved looks · settings · account              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MARKETPLACE ZONE  (full width, always visible)                 │
│  ┌──────────────────────────────────────────────┐  ┌─────────┐ │
│  │  Filter bar                                  │  │  BASKET │ │
│  │  Category tabs  │  Vendor filter  │  Sort    │  │  panel  │ │
│  ├──────────────────────────────────────────────┤  │         │ │
│  │                                              │  │         │ │
│  │  PRODUCT GRID                                │  │         │ │
│  │  (3-col on desktop, 2-col tablet, 1-col mob) │  │         │ │
│  │                                              │  │         │ │
│  └──────────────────────────────────────────────┘  └─────────┘ │
│                                                                 │
│  AI VISUALISER ZONE  (collapsible panel, below or drawer)      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  [▶ Visualise your look]  button to expand                  ││
│  │  When open: render stage + style picker + venue selector    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Key changes from current:**
- Catalogue grid is the first thing you see. No scrolling required.
- AI visualiser is a collapsible panel (collapsed by default). A prominent button "See how this looks in your venue →" expands it.
- Basket is sticky sidebar on desktop, bottom sheet on mobile.
- Filter bar is always visible above the grid.

### Catalogue / marketplace improvements

#### Filter bar (new component: `CatalogueFilterBar`)

- **Category tabs** — horizontal scroll of pill tabs: All · Florals · Furniture · Centrepieces · Lighting · Backdrops · Signage · Bar · Linen & Tableware · Attire · Stationery · Cake & Favours
- **Vendor dropdown** — filter by supplier name (pulled from DB)
- **Sort** — dropdown: Featured · Price: low to high · Price: high to low · Top rated
- **Price range** — two-thumb slider (min £ / max £ per item unit price)
- **Style filter** — pill pills: Garden Romance · Classic Elegance · Rustic Barn · Modern Minimal
- Active filters shown as dismissible chips below the bar

#### Product cards (improve existing)

Current cards are minimal. Make them feel like a marketplace:
- Larger image (16:10 aspect)
- Supplier name below product name (clickable — goes to `/suppliers/[id]`)
- Unit price prominent, quantity rule in small text (e.g. "£6.50 per guest")
- Rating stars + review count
- Stock badge: "In stock" / "Low stock" / "Made to order"
- Lead time: "Ready in 14 days"
- "Add" button on hover (or always visible on mobile)
- If already in basket: "Added ✓" state with quantity control inline

#### Browse by vendor

Add a "Browse by vendor" toggle at the top of the catalogue. When active, the product grid is replaced with a two-column layout:

```
LEFT: Vendor list (name, logo, category, piece count)  → click to filter
RIGHT: Products for selected vendor
```

This is the same data — just a different way to navigate it.

#### Saved looks integration

Currently "Saved looks" is a drawer accessed from the header. Move it to a visible tab within the marketplace:

Header tabs (within the design page, below the main header):

`Browse catalogue` · `Saved looks (3)` · `My orders`

Saves a click and makes looks feel like part of the shopping journey rather than a separate tool.

### AI Visualiser (moved to collapsible panel)

The render stage, style picker, venue picker and photo uploader all move into a collapsible panel or right-side drawer.

**Panel header (always visible):**
> ✨ Visualise your look — See exactly how your basket items will look in your venue
> [Open visualiser]

**When expanded (takes over right side / full screen on mobile):**
- Venue selector + photo uploader (current `BriefStep` functionality)
- Style preset pills
- Render stage (current `RenderStage` component)
- "Shop this look" button that reads render's `itemIds` and filters the catalogue to those products

**Trigger points** — the visualiser auto-expands when:
1. User clicks "See how it looks" on any product card
2. User clicks "Visualise your look" panel header
3. User navigates to `/design?render=true`

### Settings (wedding details)

Currently the settings bar (guests, budget, date) is at the top of the page and editable inline. Keep it but condense it into the header bar alongside the account menu. A small "Edit" opens it as a dropdown rather than an inline expander.

### Mobile layout

- Full-screen product grid (no sidebar)
- Basket: floating bottom bar showing "X items · £YYY" → taps to open bottom sheet
- Visualiser: floating "✨ Visualise" button (FAB, bottom right) → opens full-screen modal
- Filter bar: horizontal scroll at the top, "Filters" button opens a bottom sheet with all filters

---

## 4. Supporting Admin Changes

The `/admin` panel needs new sections to support the above:

| Route | Purpose |
|---|---|
| `/admin/venues` | List/edit `venue_listings`, manage `venue_packages` |
| `/admin/venues/[id]/enquiries` | View and action `venue_enquiries` |
| `/admin/vendors` | Already exists — keep, add logo upload field |

---

## 5. Navigation & Site Structure

Current nav: How it works · Features · Suppliers · Track order · Get started

New nav:

```
Venues  |  Suppliers  |  How it works  |  Track order  |  [ Get started ]
```

On mobile: hamburger drawer with the same links.

Footer (add proper footer — currently none exists):
```
Styled.

For couples          For venues          For suppliers
Design studio        Partner with us     Join as a supplier
How it works         See our venues      Supplier portal
Track your order

© 2025 Styled. UK   |   Privacy   |   Terms
```

---

## 6. Database Migrations Checklist

| Migration file | What it adds |
|---|---|
| `20261023_venue_listings.sql` | `venue_listings`, `venue_packages` tables + RLS |
| `20261023_venue_enquiries.sql` | `venue_enquiries` table + RLS |
| `20261023_supplier_assets_bucket.sql` | `supplier-assets` storage bucket + policies |
| `20261023_venue_listings_admin_policies.sql` | Staff read/write policies for venue tables |

---

## 7. Implementation Order (suggested for the coder)

1. **Database migrations** — run all 4 above on the dev Supabase project first
2. **Venues browse page** `/venues` — static layout, seed 2–3 dummy venues directly in DB
3. **Venue detail page** `/venues/[slug]` — gallery, video, packages, date enquiry form
4. **Venue partner application** `/venues/partner`
5. **Admin venues panel** `/admin/venues`
6. **Catalogue filter bar** — new `CatalogueFilterBar` component, wire into `/design`
7. **Product card redesign** — update existing card component with marketplace styling
8. **Design page layout restructure** — move render stage to collapsible panel, catalogue to top
9. **Browse by vendor** — toggle + vendor sidebar
10. **Mobile layout** — basket bottom sheet, visualiser FAB, filter bottom sheet
11. **Supplier detail page** `/suppliers/[id]` — product grid + profile
12. **Supplier join page** `/suppliers/join`
13. **Portal: logo upload + onboarding checklist**
14. **Navigation & footer** — update `(site)/layout.tsx`

---

## 8. Key Files for the Coder

| File | What it does |
|---|---|
| `app/(site)/layout.tsx` | Site nav + footer wrapper |
| `app/(site)/page.tsx` | Landing page |
| `app/(site)/suppliers/page.tsx` | Supplier grid (already working) |
| `app/(site)/suppliers/[id]/page.tsx` | Supplier detail (shell exists, needs content) |
| `app/design/page.tsx` | Main design studio (large client component — restructure here) |
| `components/design/ProductBrowser.tsx` | Current catalogue browser — replace with new marketplace layout |
| `components/design/RenderStage.tsx` | AI render panel — wrap in collapsible |
| `components/design/BasketPanel.tsx` | Basket — keep, adapt for mobile bottom sheet |
| `lib/catalogue.ts` | Static seed data — source of truth until suppliers self-manage |
| `lib/types.ts` | TypeScript types |
| `lib/styles.ts` | Style presets (garden_romance, classic_elegance, etc.) |
| `supabase/migrations/` | All schema migrations |
| `scripts/seed-catalogue.mjs` | Seeds suppliers + products from catalogue.ts into DB |

---

## 9. Design Tokens (existing — do not change)

```
bg-cream       #faf8f5   page background
bg-sand        #ede9e3   card borders, dividers
text-ink       #1c1917   primary text
text-clay      #b07d62   accent / category labels
bg-blush       #f9eee8   soft pink highlight sections
font-serif     Cormorant Garamond (loaded in layout)
```

All new pages must use these tokens. No new colours to be introduced without agreement.

---

*Last updated: October 2026. Owner: Kamil.*
