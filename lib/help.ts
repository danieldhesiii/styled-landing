export const HELP_TOPICS = [
  "overview",
  "wedding",
  "catalogue",
  "venues",
  "saved",
  "visualiser",
  "basket",
  "orders",
  "suppliers",
  "business",
  "supplier_partners",
  "venue_partners",
] as const;
export type HelpTopic = (typeof HELP_TOPICS)[number];
type Guide = {
  label: string;
  title: string;
  intro: string;
  steps: { title: string; body: string }[];
  note: string;
};
export const HELP_GUIDES: Record<HelpTopic, Guide> = {
  overview: {
    "label": "Start here",
    "title": "Plan, explore and request",
    "intro": "Keep each event in its own plan.",
    "steps": [
        {
            "title": "Set up your event",
            "body": "Add dates, guests and a product budget in Wedding plan."
        },
        {
            "title": "Explore",
            "body": "Browse products or venues. Save favourites or select products for a preview."
        },
        {
            "title": "Request confirmation",
            "body": "Review your basket and send a request. Track the response in My bookings."
        }
    ],
    "note": "Venue enquiries and product requests are separate. No request takes payment or reserves availability."
},
  wedding: {
    "label": "Wedding plan",
    "title": "Set up this event",
    "intro": "Dates, venue, guests and product budget stay with the selected event.",
    "steps": [
        {
            "title": "Add your details",
            "body": "Enter what you know. Your event date sets the countdown; guests help estimate quantities."
        },
        {
            "title": "Choose a venue and hire dates",
            "body": "Record your venue or use Find venues. Choose default delivery and collection dates; individual items can have different dates in Basket."
        },
        {
            "title": "Plan another event",
            "body": "Add event creates a separate ceremony, reception or celebration. Saved items and Saved looks are shared across your account."
        }
    ],
    "note": "Saving a venue does not book it. Request products early enough for supplier lead times and agree delivery and setup before confirming."
},
  catalogue: {
    "label": "Catalogue",
    "title": "Find your products",
    "intro": "Search, filter or browse by supplier.",
    "steps": [
        {
            "title": "Open a product",
            "body": "Check its photographs, price, specifications and supplier terms."
        },
        {
            "title": "Select for a preview",
            "body": "Use Select for preview to choose products for Visualise. Preview selections do not change your basket."
        },
        {
            "title": "Add to basket",
            "body": "Choose a quantity on the product page. Review dates in Basket before requesting confirmation."
        }
    ],
    "note": "Saving or selecting a product does not reserve stock. Availability and the final quote need supplier confirmation."
},
  venues: {
    label: "Find venues",
    title: "Find a venue or record one you have",
    intro:
      "Find venues is a directory. Wedding plan records the venue you are planning around. Recording a choice does not book it.",
    steps: [
      {
        title: "Search for a suitable space",
        body: "Search by place, date and guests. Use the extra filters for budget, facilities and venue type. The demo collection shows fictional examples and cannot accept bookings. Venue shortlists stay on this device.",
      },
      {
        title: "Explore the venue page",
        body: "Review capacity, hire details, photos and facilities. Venue video and 360° & 3D walkthrough show media when the venue has added it. A blank placeholder means no video or tour is available yet.",
      },
      {
        title: "Save a choice or send a request",
        body: "Save to wedding plan records your choice. To ask about availability or arrange a viewing, use the venue page’s request form and choose the relevant dates. Unblocked dates still need the venue’s confirmation.",
      },
      {
        title: "Follow the response",
        body: "Open My bookings, then Venue requests. Venue teams can respond, suggest alternatives or record a confirmed booking. Agree the hire terms, contract and payment separately.",
      },
    ],
    note: "Already booked a venue elsewhere? Add it and its photographs in Wedding plan. Venue operators use the separate venue workspace, reached through Venue owners in the website menu.",
  },
  saved: {
    label: "Saved",
    title: "Keep your favourite products and previews",
    intro:
      "Open Saved, then choose Saved items or Saved looks. Your favourites are shared across your events.",
    steps: [
      {
        title: "Save individual products",
        body: "Use a product’s heart in Catalogue or beneath a preview. Find it later under Saved items. Add it to the current event’s Basket when ready.",
      },
      {
        title: "Save a generated look",
        body: "Choose Save on a finished visualiser preview. Find it under Saved looks. Continue designing reopens its original room photo and catalogue details in Visualise. Your current event and basket stay unchanged; availability is checked again when you request items.",
      },
      {
        title: "Remove a favourite",
        body: "Choose the saved heart again, or the saved look’s removal action. This removes the favourite without changing products already in your Basket.",
      },
    ],
    note: "Sign in to keep favourites across devices. Saving an idea does not reserve stock, hold a price or confirm a booking.",
  },
  visualiser: {
    "label": "Visualise",
    "title": "Preview your venue",
    "intro": "Choose products, add a venue photo and describe your ideas.",
    "steps": [
        {
            "title": "Choose your products",
            "body": "Choose products uses the items you select from Catalogue. Choose for me lets Styled match products to your description."
        },
        {
            "title": "Describe and generate",
            "body": "Upload your venue photograph and describe the look. Review the selected products, then generate."
        },
        {
            "title": "Review your result",
            "body": "Compare versions or tweak the look. Save the preview, or add individual products to Basket when ready."
        }
    ],
    "note": "AI previews are illustrative. Product appearance, proportions and room details can differ. Check the actual product photographs and supplier specifications."
},
  basket: {
    label: "Basket",
    title: "Review choices before sending a request",
    intro:
      "Basket contains unsubmitted supplier products for the current event. My bookings contains requests already sent.",
    steps: [
      {
        title: "Review products and quantities",
        body: "Check the supplier, quantity and estimated line total for every item. Use the quantity controls or remove a piece. Opening Basket does not submit anything.",
      },
      {
        title: "Set each hire period",
        body: "Items start with the event’s default hire dates. Choose Change dates on an item to set its own delivery or collection date and return date. Availability is checked across the full hire period.",
      },
      {
        title: "Resolve any availability messages",
        body: "Set missing dates, reduce quantities, remove unavailable products or choose alternatives. Delivery coverage, timings and any extra hire charges still need supplier agreement.",
      },
      {
        title: "Request supplier confirmation",
        body: "Review your contact details, dates and estimate on the request form, then submit when ready. Keep the reference and follow the response in My bookings, then Supplier requests. Submit other event baskets separately.",
      },
    ],
    note: "Submitting is a request for manual review. It does not reserve stock or take payment. Final prices, deposits, payment dates and delivery or collection costs are agreed separately before booking.",
  },
  orders: {
    label: "My bookings",
    title: "Track requests and confirmed bookings",
    intro:
      "Supplier requests and Venue requests are kept separately here. Products still in Basket have not been submitted.",
    steps: [
      {
        title: "Choose the request type",
        body: "Supplier requests shows product requests. Venue requests shows venue bookings and viewing enquiries. Open a request to review its details and current status.",
      },
      {
        title: "Follow confirmation",
        body: "Open Saved quote, booking details and returns on your supplier request. Review the complete quote, then accept the current version to request booking confirmation. Supplier availability alone is not a booking.",
      },
      {
        title: "Keep your reference",
        body: "Keep the request reference and contact email. Track your order on the public website can also look up a supplier request using these details.",
      },
      {
        title: "Discuss changes",
        body: "Before confirmation, edit item hire dates and access notes inside the submitted request. Changes require fresh supplier checks and a new quote. Use the cancellation review option or contact support@styleduk.com for other changes. Venue bookings remain separate.",
      },
    ],
    note: "No request form takes payment. Agree the final quote, deadlines, delivery arrangements and payment terms before treating anything as booked.",
  },
  suppliers: {
    label: "Suppliers",
    title: "Explore the businesses behind the pieces",
    intro:
      "Supplier profiles show the businesses and published products you can explore for your event.",
    steps: [
      {
        title: "Explore a profile",
        body: "Read the business information and browse its published catalogue products. Check each product’s pricing unit and conditions.",
      },
      {
        title: "Continue in your studio",
        body: "Use Add in studio to carry a product into your current event’s Basket. Review quantities, dates and the estimate before requesting confirmation.",
      },
      {
        title: "Run a supplier business?",
        body: "Use For businesses, then Join as a supplier. An approved business uses a separate supplier workspace; your customer planning page does not manage stock or listings.",
      },
    ],
    note: "Supplier coverage and final availability need confirmation. A profile or product favourite is not a booking.",
  },
  business: {
    label: "Business workspaces",
    title: "Choose the workspace for your business",
    intro:
      "Customer planning, supplier products and venue listings have separate tools.",
    steps: [
      {
        title: "List a venue",
        body: "Choose List your venue to prepare a private listing and submit it for review. Existing operators can open the venue workspace for listings, requests and calendar dates.",
      },
      {
        title: "Offer products",
        body: "Choose Join as a supplier to apply with your business details and range. Approved suppliers use the supplier workspace for products, stock and incoming requests.",
      },
      {
        title: "Offer both",
        body: "A business can use both workspaces with the same account once Styled links its supplier access. Your customer Wedding plan remains a separate personal space.",
      },
    ],
    note: "An application does not publish a listing or grant business access automatically. Contact support@styleduk.com for help linking the correct business.",
  },
  supplier_partners: {
    label: "Supplier workspace",
    title: "Manage your business on Styled",
    intro:
      "This workspace is for approved supplier businesses. Customer plans and venue listings are managed separately.",
    steps: [
      {
        title: "Apply or sign in",
        body: "Join as a supplier sends your business details to Styled for review. Supplier workspace access is available once Styled links your approved business to your login.",
      },
      {
        title: "Prepare your catalogue",
        body: "Open Business setup for your story, service area and delivery or hire rules. In Products, add individual pieces or preview a CSV stock import. New products stay private. Add your photographs and permissions in Business setup, then submit the starting range for Styled review. Publication requires staff approval; an inactive business stays private.",
      },
      {
        title: "Keep availability current",
        body: "Use Availability for stock and date updates and any configured calendar sync. Check the full requested hire period, including delivery and return, when reviewing a request.",
      },
      {
        title: "Review incoming requests",
        body: "Use Requests to find items needing a response. Check the full hire dates and tell Styled what you can supply. If unavailable, add a reason or suggest alternatives. Your availability response does not confirm the whole booking.",
      },
    ],
    note: "Applying does not grant access or publish listings automatically. Contact support@styleduk.com if the correct business is not linked to your account.",
  },
  venue_partners: {
    label: "Venue workspace",
    title: "Manage your venue, one step at a time",
    intro:
      "This workspace is for venue operators. It is separate from the customer’s Wedding plan and the supplier product workspace.",
    steps: [
      {
        title: "Start a private listing",
        body: "Choose Venue owners in the website menu, then Start your venue listing. Existing teams choose Venue login, or My venue workspace in their account menu. Overview shows the next step and your listing status.",
      },
      {
        title: "Describe the space",
        body: "Add details, photos and supplier choices, then save a private draft. Submit for review when ready. Awaiting review means Styled is checking it. Changes requested shows staff feedback; update the draft and resubmit. Published means the approved version is visible to customers. Email alerts depend on sending setup; the workspace always shows the current status.",
      },
      {
        title: "Choose your supplier route",
        body: "In Suppliers & booking, choose your own network, your approved suppliers on Styled, or the wider Styled catalogue. Maintain public supplier names, websites and locations. Styled links onboarded suppliers after verification; recommending a business does not add products or grant account access.",
      },
      {
        title: "Set booking and local preferences",
        body: "Add an optional HTTPS link to your booking system and local sourcing guidance. A catalogue distance limit uses verified venue and supplier locations; unknown locations are excluded. Booking links open externally and do not automatically sync dates, contracts or payments.",
      },
      {
        title: "Add optional media",
        body: "Add a public Matterport or Kuula link for a captured walkthrough and a YouTube or Vimeo link for video. These are separate fields. Photos do not automatically create a 3D tour; leave the fields empty until your media is ready.",
      },
      {
        title: "Manage requests and dates",
        body: "Requests contains viewing and booking enquiries. Reply with availability or alternatives and record agreed bookings. Use Calendar to block dates booked elsewhere. Confirmed Styled bookings block their date automatically.",
      },
    ],
    note: "Agree venue contracts and payment separately. Saving a venue in a customer plan does not send a booking request. Contact support@styleduk.com for listing or workspace help.",
  },
};

/** Business guides stay in their workspace; customer help never changes pages. */
export function helpTopicsFor(initial: HelpTopic): HelpTopic[] {
  if (initial === "business")
    return ["business", "venue_partners", "supplier_partners"];
  if (initial === "supplier_partners" || initial === "venue_partners")
    return ["business", initial];
  return HELP_TOPICS.filter(
    (key) =>
      key !== "business" &&
      key !== "supplier_partners" &&
      key !== "venue_partners",
  );
}
export function helpTopicForPage(
  pathname: string,
  studioSection?: string,
): HelpTopic {
  if (pathname === "/design" || pathname.startsWith("/design/")) {
    if (studioSection === "looks" || studioSection === "saved") return "saved";
    if (studioSection === "orders") return "orders";
    if (studioSection === "wedding") return "wedding";
    if (studioSection === "boards") return "saved";
    if (studioSection === "checkout") return "basket";
    if (studioSection === "venues") return "venues";
    if (studioSection === "visualiser") return "visualiser";
    return "catalogue";
  }
  if (
    pathname === "/venues/partner" ||
    pathname.startsWith("/venue-portal") ||
    pathname.startsWith("/admin/venues")
  )
    return "venue_partners";
  if (pathname === "/venues" || pathname.startsWith("/venues/"))
    return "venues";
  if (pathname === "/business") return "business";
  if (
    pathname === "/vendors" ||
    pathname === "/suppliers/join" ||
    pathname.startsWith("/portal")
  )
    return "supplier_partners";
  if (pathname === "/suppliers" || pathname.startsWith("/suppliers/"))
    return "suppliers";
  if (pathname === "/order" || pathname.startsWith("/order/")) return "orders";
  return "overview";
}
