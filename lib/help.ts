export const HELP_TOPICS = [
  "overview",
  "wedding",
  "catalogue",
  "venues",
  "boards",
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
    label: "Start here",
    title: "From ideas to confirmed plans",
    intro:
      "Start with your event, collect ideas, then request the pieces and venue you need. You can browse before you know every detail.",
    steps: [
      {
        title: "Plan your event",
        body: "Wedding plan holds the dates, guest count, budget and venue for the event selected in Currently planning. Add event creates a separate plan for a ceremony, reception or another celebration.",
      },
      {
        title: "Explore and collect",
        body: "Catalogue is for supplier products. Find venues is for discovering spaces. Saved keeps your favourite items and AI looks; Boards brings those ideas together with photos and notes.",
      },
      {
        title: "Visualise if you want to",
        body: "Use a venue photo and describe your ideas in Visualise. This is optional: you can browse products and request supplier confirmation without generating an image.",
      },
      {
        title: "Request, then confirm",
        body: "Basket holds your unsubmitted choices. My bookings tracks requests you have sent. Suppliers and venue teams must confirm the details before a request becomes a booking.",
      },
    ],
    note: "Venue hire and supplier products have separate request processes. No payment is taken by the request forms. Use Help & support to ask Styled a question without leaving your plan.",
  },
  wedding: {
    label: "Wedding plan",
    title: "Set the details for this event",
    intro:
      "Your plan helps suggest quantities, check hire dates and keep track of your venue. It is your private planning space, not a booking.",
    steps: [
      {
        title: "Add the details you know",
        body: "Set your guest count and supplier budget. Use the estimating or budget-not-set options if you are undecided. Add your event date to see its countdown in the top header.",
      },
      {
        title: "Choose when you need the items",
        body: "Your event date is when the celebration happens. Default hire dates cover delivery or collection through return. For a Sunday event, you might request Saturday delivery and Monday return. Override these dates per item in Basket.",
      },
      {
        title: "Record your venue",
        body: "Already booked somewhere? Choose I have a venue and add its details and photos. Still looking? Use Find venues. Saving a venue to your plan only records your choice; send a separate venue request to enquire about booking it.",
      },
      {
        title: "Keep events separate",
        body: "Use Add event for a ceremony, reception or other celebration, then switch with Currently planning. Each event has its own dates, venue, basket and latest preview. Boards and Saved are shared. Cancel or Close dismisses an unfinished new event.",
      },
      {
        title: "Save before you leave",
        body: "Use Save changes or Save plan after editing. Switching events saves the current plan before opening the next. Each event basket is submitted separately.",
      },
    ],
    note: "A date in your plan does not reserve stock or a venue. Request early enough for supplier lead times and agree an arrival deadline before making firm arrangements.",
  },
  catalogue: {
    label: "Catalogue",
    title: "Find the pieces you need",
    intro:
      "Browse products for the event shown in the header. You do not need an AI preview to shop.",
    steps: [
      {
        title: "Search and narrow the results",
        body: "Search for a product or supplier, choose a category, and use Filters for style, supplier or price. Browse by supplier groups products by business. A location and radius can help you find nearby suppliers; delivery coverage still needs confirmation.",
      },
      {
        title: "Check the product",
        body: "Open Details, terms and boards for the description, dimensions and supplier conditions. Review whether it is for hire or sale, its pricing unit and any availability message.",
      },
      {
        title: "Save or add to your basket",
        body: "The heart keeps an item in Saved, then Items. Add to basket selects it for your current event. Check the suggested quantity and change it to what you need.",
      },
      {
        title: "Check dates before requesting",
        body: "Open Basket to review quantities and each item’s hire dates. Availability is checked again when you submit your request.",
      },
    ],
    note: "Saving or adding a product does not hold stock or a price. Catalogue images may be illustrative; check the product details and confirm the final quote with the supplier.",
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
    note: "Already booked a venue elsewhere? Add it and its photographs in Wedding plan. Venue operators use the separate venue workspace, reached through For businesses.",
  },
  boards: {
    label: "Boards",
    title: "Bring your inspiration together",
    intro:
      "Create private collections for a ceremony, reception, colour palette or any idea. Boards are shared across your events.",
    steps: [
      {
        title: "Create and choose a board",
        body: "Enter a name under New board and choose Create board. Select a board by its name to view or add ideas. Board changes save to your account when they succeed.",
      },
      {
        title: "Add products, images and notes",
        body: "Use Add to board for catalogue pieces, notes, uploaded photos or a saved AI look. Saving a heart creates a favourite; adding to a board organises that idea. Neither action puts it into Basket.",
      },
      {
        title: "Bring ideas from other services",
        body: "Google Photos opens separately: download a photo, then upload it here. Paste a public Pinterest board or Pin link to save it or view it beside your board. Private boards open on Pinterest. Links alone do not import images; upload individual images you have permission to use.",
      },
      {
        title: "Use ideas in a preview",
        body: "Use board in visualiser prepares its uploaded photos, catalogue items and notes for the current event. It does not replace your venue, change your basket or start generation. Pinterest links and saved looks are references, not automatically imported image files.",
      },
    ],
    note: "Only real catalogue products can be added to Basket. Inspiration photos and AI looks cannot be ordered as images. Removing a board idea does not remove a separately saved favourite or basket item.",
  },
  saved: {
    label: "Saved",
    title: "Keep favourites, then organise or shop",
    intro:
      "One page, two collections: Items for catalogue products and Looks for generated previews. Both are shared across your events.",
    steps: [
      {
        title: "Save individual products",
        body: "Use a product’s heart in Catalogue or beneath a preview. Find it later under Saved, then Items. Add it to the current event’s Basket when ready.",
      },
      {
        title: "Save a generated look",
        body: "Choose Save on a finished visualiser preview. Find it under Saved, then Looks. Open a look to return to Visualise and explore its linked catalogue pieces.",
      },
      {
        title: "Build a board",
        body: "Use Boards to combine favourite pieces and saved looks with your own photos and notes. Saving something does not automatically add it to a board.",
      },
      {
        title: "Remove a favourite",
        body: "Choose the saved heart again, or the saved look’s removal action. This removes the favourite without changing products already in your Basket.",
      },
    ],
    note: "Sign in to keep favourites across devices. Saving an idea does not reserve stock, hold a price or confirm a booking.",
  },
  visualiser: {
    label: "Visualise",
    title: "Preview an idea, then explore its pieces",
    intro:
      "The visualiser belongs to your currently selected event. Opening it does not generate an image or submit a request.",
    steps: [
      {
        title: "Start with the venue",
        body: "Upload a clear venue photograph or choose an example room. A board can supply inspiration, while your venue photo remains the starting space.",
      },
      {
        title: "Describe the look",
        body: "Choose the scene, pick a style or describe your own. Include useful details such as colours, layout and the catalogue pieces you want to explore. Generate only when your description is ready.",
      },
      {
        title: "Review and refine",
        body: "Use Tweak this look to refine a result or New style to try another direction. Choose a version in Compare to review it. A before-and-after comparison is available when the original photo is present.",
      },
      {
        title: "Shop or keep the idea",
        body: "Shop this look takes you to Pieces from this look below the image. Review each real product and add it to Basket without leaving Visualise. Save keeps the preview under Saved, then Looks; Download saves an image file to your device.",
      },
    ],
    note: "AI preview only. Products, colours, scale, quantities and room details may differ. Catalogue references are not a guarantee that every visible object is available or exactly represented. Check the actual products with suppliers.",
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
        body: "Items start with the event’s default hire dates. Tick Different dates for this item to set its own delivery or collection date and return date. Availability is checked across the full hire period.",
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
        body: "A submitted or pending request is awaiting a response. It becomes a booking only after confirmation. Check supplier line statuses as different suppliers may respond separately.",
      },
      {
        title: "Keep your reference",
        body: "Keep the request reference and contact email. Track your order on the public website can also look up a supplier request using these details.",
      },
      {
        title: "Discuss changes",
        body: "Contact support@styleduk.com about supplier request changes, quoting your reference. Follow the venue request’s response for venue arrangements. Editing Wedding plan later does not amend a submitted request.",
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
        body: "Add your business profile and review Products for images, pricing units and product details. For a CSV stock list, preview the import before applying changes.",
      },
      {
        title: "Keep availability current",
        body: "Use Availability for stock and date updates and any configured calendar sync. Check the full requested hire period, including delivery and return, when reviewing a request.",
      },
      {
        title: "Review incoming requests",
        body: "Check the supplier order lines in your workspace and coordinate availability, costs and fulfilment with Styled. Agree commercial terms with Styled before taking bookings.",
      },
    ],
    note: "Applying does not grant access or publish listings automatically. Contact support@styleduk.com if the correct business is not linked to your account.",
  },
  venue_partners: {
    label: "Venue workspace",
    title: "Prepare your listing and manage enquiries",
    intro:
      "This workspace is for venue operators. It is separate from the customer’s Wedding plan and the supplier product workspace.",
    steps: [
      {
        title: "Start a private listing",
        body: "Use For businesses, then List your venue. Sign in and create a draft, or contact Styled through the partnership form first.",
      },
      {
        title: "Describe the space",
        body: "Add photos, capacity, hire prices, facilities and practical details. Save your draft while you prepare it, then submit for review. Approved changes are published by Styled; editing a draft does not change the live listing.",
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
    if (studioSection === "boards") return "boards";
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
