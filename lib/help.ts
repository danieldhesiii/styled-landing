export const HELP_TOPICS = [
  "wedding",
  "boards",
  "catalogue",
  "venues",
  "saved_items",
  "visualiser",
  "saved_looks",
  "basket",
  "orders",
  "suppliers",
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
  wedding: {
    label: "My wedding",
    title: "Keep your plans together",
    intro:
      "Save your own venue, photographs, dates and budget in your private account.",
    steps: [
      {
        title: "Choose your starting point",
        body: "Tell us whether you already have a venue, are looking for one, or are just exploring. Add the wedding location postcode for relevant discovery.",
      },
      {
        title: "Set wedding and delivery days",
        body: "Delivery follows your wedding date while Same as wedding day is checked. Untick it for an earlier setup day. Stock is checked from delivery through the wedding.",
      },
      {
        title: "Keep your photographs",
        body: "Upload your venue rooms and angles. Set the first image as the visualiser starting point, then save wedding details to continue on another device.",
      },
    ],
    note: "Your own venue and photos stay private. Delivery times, fees and collection are confirmed separately; selecting dates is not a confirmed booking.",
  },
  boards: {
    label: "Boards",
    title: "Collect ideas for your wedding",
    intro:
      "Private boards bring your products, inspiration, saved looks and notes into one place. Google Photos and Pinterest icons explain the available import steps.",
    steps: [
      {
        title: "Create a board",
        body: "Open Boards in the main navigation. Name a board for your ceremony, reception or a style you want to explore.",
      },
      {
        title: "Build the idea",
        body: "Add catalogue pieces, upload your inspiration images, write notes or choose a look already saved in the visualiser. Board changes save to your account. Use board in visualiser prepares photos, catalogue pieces and notes without changing your venue or basket. Direct Google Photos and Pinterest account imports still need setup; photo upload and Pinterest link saving work now.",
      },
      {
        title: "Shop when ready",
        body: "Use Add to basket on real catalogue pieces. Inspiration images and generated looks are illustrative and cannot be ordered as photographs.",
      },
    ],
    note: "Boards stay private. Adding a piece to a board does not reserve stock, change your basket or start image generation. Save wedding details before navigating away if you have edited them.",
  },
  catalogue: {
    label: "Catalogue",
    title: "Find pieces for your day",
    intro:
      "Start with the products. You can shop and save without using image generation.",
    steps: [
      {
        title: "Set your wedding details",
        body: "Use My wedding for your venue, guest count and budget. Set a wedding day and, if different, an earlier delivery day. Stock is checked across that interval. A venue choice is optional.",
      },
      {
        title: "Browse your way",
        body: "Search by product or supplier, choose a category, or use Filters for supplier, style and price. Browse by supplier groups the same catalogue around the businesses behind each piece.",
      },
      {
        title: "Save or add",
        body: "Use the heart to save an item to your account. Add to basket puts it into your quote instead. Saving an item does not add it to your basket or open the visualiser.",
      },
      {
        title: "Review as you go",
        body: "Adjust quantities in a product card or your basket. On a phone, the bottom basket bar opens your basket. The Visualise shortcut opens the separate AI visualiser tab only when you choose it.",
      },
    ],
    note: "Prices, date availability and supplier confirmation are checked again as your plans move forward.",
  },
  venues: {
    label: "Venues",
    title: "Choose a setting for your plans",
    intro:
      "Explore venues in their own section, then continue shopping for the pieces that suit your space.",
    steps: [
      {
        title: "Explore published venues",
        body: "Use county, setting and guest-count filters to narrow the collection. Venue listings appear as the Styled team publishes them.",
      },
      {
        title: "View details and dates",
        body: "Details & dates opens the venue page with available photography, styling packages, tours and the date enquiry form. Unavailable dates are disabled in the calendar.",
      },
      {
        title: "Choose a venue for your design",
        body: "Choose this venue returns you to the catalogue with that venue selected. Your basket stays with you, and choosing a venue does not start image generation.",
      },
      {
        title: "Use your own space",
        body: "If you already have a venue, use your own photograph in the AI visualiser. You can change your selected venue from the wedding details bar.",
      },
    ],
    note: "Choosing a venue does not reserve a date. Venue enquiries and confirmation are separate from your supplier basket.",
  },
  saved_items: {
    label: "Saved items",
    title: "Keep a shortlist of favourite pieces",
    intro:
      "Saved items are individual products, kept separately from your saved generated looks.",
    steps: [
      {
        title: "Save a piece",
        body: "Choose the heart on a catalogue card. The button changes to Saved after the item has been saved successfully.",
      },
      {
        title: "Return to your shortlist",
        body: "Open Saved, then Items. Your favourites are linked to your signed-in account and remain there after a refresh or when you sign in on another device.",
      },
      {
        title: "Build your basket when ready",
        body: "Use Add to basket and quantity controls on a saved product. A saved item is a favourite, not a reservation of stock.",
      },
      {
        title: "Edit your shortlist",
        body: "Choose the saved heart again to remove an item from the collection. Removing a favourite does not remove an item you have already added to your basket.",
      },
    ],
    note: "Published products and their prices or availability can change. Saving a piece does not hold its price or stock.",
  },
  visualiser: {
    label: "AI visualiser",
    title: "Explore how your ideas could look",
    intro:
      "The visualiser is an optional workspace in its own studio tab. Opening it does not generate an image.",
    steps: [
      {
        title: "Choose your starting image",
        body: "Upload a venue photograph, use a sample room, or bring in a chosen partner venue. Add useful extra angles when you have them.",
      },
      {
        title: "Describe the scene",
        body: "Choose the type of wedding scene and a style, or describe the look you want in your own words. You can include catalogue pieces from your basket.",
      },
      {
        title: "Generate when you are ready",
        body: "Use the generation control inside the visualiser to create a preview. You can refine a result or try a new look, and compare versions while working.",
      },
      {
        title: "Save and explore the pieces",
        body: "Save a generated result to Saved looks if you want to return to it. Shop this look scrolls to the associated catalogue pieces directly below the image. Add them to your basket there, or use Browse the full catalogue to explore more. Find your product shortlist under Saved, then Items.",
      },
    ],
    note: "AI previews are illustrative. Check the actual catalogue products, quantities, prices and date availability before making plans.",
  },
  saved_looks: {
    label: "Saved looks",
    title: "Keep the looks you love",
    intro:
      "Saved looks holds generated designs, while Saved items holds individual products.",
    steps: [
      {
        title: "Save a finished look",
        body: "Use Save on a completed visualiser result. Saving a product heart in the catalogue does not create a saved look.",
      },
      {
        title: "Open your collection",
        body: "Open Saved, then Looks. Your signed-in account keeps the looks you have explicitly saved.",
      },
      {
        title: "Return to a design",
        body: "Choose a saved look to open it in the AI visualiser. Where an original venue image is available, use the before-and-after control to compare it.",
      },
      {
        title: "Remove a look if needed",
        body: "Remove from saved takes a look out of your saved collection. It does not remove your separately saved products or place an order.",
      },
    ],
    note: "Saving a look keeps an idea, not a confirmed quote or reservation. Check current products and availability when you return.",
  },
  basket: {
    label: "Basket & checkout",
    title: "Review your pieces and request a reservation",
    intro: "Your basket brings supplier pieces into one itemised plan.",
    steps: [
      {
        title: "Review quantities and suppliers",
        body: "The basket groups pieces by supplier and shows your estimated total. Change quantities or remove pieces before continuing.",
      },
      {
        title: "Check your wedding date",
        body: "Set your date and review any availability messages. Having a product in the basket does not hold it for that date.",
      },
      {
        title: "Enter your reservation details",
        body: "Request supplier confirmation opens the checkout details. Review the latest quote, your contact details and delivery information before submitting a request.",
      },
      {
        title: "Keep the confirmation",
        body: "After a successful request, keep your reference and follow its progress in My orders or Track order. Styled reviews supplier confirmation manually before a booking is confirmed. Suppliers can reply with alternative dates when needed.",
      },
    ],
    note: "In this preview the card-payment step is a placeholder, and no card is charged. The deposit shown in your quote is not a completed payment.",
  },
  orders: {
    label: "Orders",
    title: "Follow your order request",
    intro:
      "Use My orders in the studio or Track order on the public website to follow your request.",
    steps: [
      {
        title: "Find your request",
        body: "Open My orders for requests associated with your account or current session. You can also use Track order with the reference and email used when ordering.",
      },
      {
        title: "Read the current status",
        body: "Review the order and supplier-line statuses for the latest progress. A submitted request is not the same as every supplier having confirmed it.",
      },
      {
        title: "Check the details",
        body: "Review the products, quantities, venue and dates shown against the request. Keep your reference when discussing it with Styled.",
      },
    ],
    note: "This guide does not submit, change or cancel an order. Opening another help topic also leaves your order page unchanged.",
  },
  suppliers: {
    label: "Suppliers",
    title: "Explore or join the supplier collection",
    intro:
      "Couples can discover suppliers; businesses can apply to join and then manage an approved supplier account.",
    steps: [
      {
        title: "Explore a supplier",
        body: "The supplier directory links to business profiles and their published products. Add in studio carries a piece into your design studio basket.",
      },
      {
        title: "Apply to join",
        body: "Use Join as a supplier or List your business to share your business details and product categories. Styled reviews the application and discusses the commercial terms.",
      },
      {
        title: "Set up an approved account",
        body: "Once staff have linked your supplier login, use the supplier portal to add your logo and business story. Import a CSV stock list, review the preview, then apply the changes.",
      },
      {
        title: "Keep products and dates current",
        body: "Use Products for photos and product updates, and Availability for dates and calendar sync. Review incoming supplier order lines through the portal.",
      },
    ],
    note: "A public application does not grant portal or staff access automatically. New listings and commercial terms are agreed with Styled.",
  },
  venue_partners: {
    label: "Venue partners",
    title: "Bring your venue to Styled",
    intro:
      "Venue teams have a partnership application separate from the couple’s venue-selection journey.",
    steps: [
      {
        title: "Share your venue",
        body: "Use Partner with us to send the venue name, county, capacity, website and the best contact for your team.",
      },
      {
        title: "Discuss the listing",
        body: "Styled will discuss your photography, styling possibilities and what a pilot could look like. An application does not immediately publish a venue.",
      },
      {
        title: "Prepare the public page",
        body: "The Styled team manages approved venue listings, images, packages and supported tours in the existing venue admin tools.",
      },
      {
        title: "Coordinate date enquiries",
        body: "Couples request dates through the venue detail page. Styled staff manage the enquiry status and coordinate confirmation with the venue team.",
      },
    ],
    note: "Venue selection in the studio is not a booking. Venue operators are not automatically given access to Styled’s staff admin.",
  },
};
export function helpTopicForPage(
  pathname: string,
  studioSection?: string,
): HelpTopic {
  if (pathname === "/design" || pathname.startsWith("/design/")) {
    if (studioSection === "looks") return "saved_looks";
    if (studioSection === "orders") return "orders";
    if (studioSection === "wedding") return "wedding";
    if (studioSection === "boards") return "boards";
    if (studioSection === "checkout") return "basket";
    if (studioSection === "saved") return "saved_items";
    if (studioSection === "venues") return "venues";
    if (studioSection === "visualiser") return "visualiser";
    return "catalogue";
  }
  if (pathname === "/venues/partner" || pathname.startsWith("/admin/venues"))
    return "venue_partners";
  if (pathname === "/venues" || pathname.startsWith("/venues/"))
    return "venues";
  if (
    pathname === "/suppliers" ||
    pathname.startsWith("/suppliers/") ||
    pathname === "/vendors" ||
    pathname.startsWith("/portal")
  )
    return "suppliers";
  if (pathname === "/order" || pathname.startsWith("/order/")) return "orders";
  return "catalogue";
}
