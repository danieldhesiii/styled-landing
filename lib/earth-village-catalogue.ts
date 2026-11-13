import type { CatalogueItem } from "./types";

// Supplier document received 12 November 2026. Prices are per package.
// Availability, site suitability and delivery are confirmed in the hire quote.
export function earthVillageCatalogue(): CatalogueItem[] {
  const common = {
    supplier: "Earth Village Events", supplierId: "earth-village-events",
    supplierArea: "Bristol and surrounding areas",
    qtyRule: "fixed" as const, unit: "package, plus delivery",
    styles: ["garden_romance", "rustic_barn"], icon: "⛺", swatch: "#d7c7a7",
    imageKind: "supplier" as const, rating: 0, reviewCount: 0,
    reviewsVerified: false, leadTimeDays: 0, stock: "on_request" as const,
    requestOnly: true,
    damageTerms: "20% non-refundable booking deposit. Balance due 14 working days before installation. Damage deposit and damage terms to be confirmed with the supplier.",
    deliveryTerms: "£4 per mile, one way from Bristol. Tent and furniture delivery are charged separately. Usually within about 2.5 hours of Bristol; further travel by arrangement. Set-up and take-down included for the tent. No VAT added.",
  };
  return [
    {
      ...common, id: "earth-village-stretch-tent-10x15", name: "10 × 15 m Stretch Tent Wedding Package",
      category: "tents", visualiserUse: "outdoor", unitPrice: 2850,
      image: "/img/items/earth-village-events/10x15/image3.jpeg",
      gallery: [
        {src:"/img/items/earth-village-events/10x15/image1.jpeg",alt:"Sand stretch tent with open sides in a garden at a past event"},
        {src:"/img/items/earth-village-events/10x15/image2.jpeg",alt:"Sand stretch tent at sunset with its guy ropes visible"},
        {src:"/img/items/earth-village-events/10x15/image4.jpeg",alt:"Past event interior showing matting and overhead festoon lighting"},
        {src:"/img/items/earth-village-events/10x15/image5.jpeg",alt:"White stretch canopy with open sides and countryside views"},
        {src:"/img/items/earth-village-events/10x15/image6.jpeg",alt:"Open-sided stretch tent showing its matting and evening lighting"},
        {src:"/img/items/earth-village-events/10x15/image7.jpeg",alt:"Stretch tent installed on the lawn outside a historic building"},
      ],
      dimensions: "Tent 10 × 15 m. Allow approximately 15 × 20 m including guy ropes.",
      material: "White or sand stretch fabric with Dandy Dura natural floor matting.",
      hireUnits: "Around 75 seated with bar and dance floor, or up to 100 seated for dining only. Up to 100 evening guests.",
      note: "A flowing outdoor canopy for 75 to 100 guests, with full floor matting, perimeter fairy lights, eight colour-changing uplighters and overhead festoon lighting. Professional installation and take-down are included. LED lighting runs from venue mains power. £2,850 per package, plus delivery.",
      packageDetails: [
        {title:"Included",text:"10 × 15 m stretch tent in white or sand, full Dandy Dura floor matting, perimeter fairy lights, eight colour-changing uplighters, overhead festoons, installation and take-down. No VAT added."},
        {title:"Optional furniture",text:"75 vintage folding chairs and 13 rustic trestle tables, seating six each: £550. Furniture delivery is a separate £4 per mile one way from Bristol. Request the furniture as a separate package."},
        {title:"Delivery example",text:"At 50 miles from Bristol: tent £2,850 + delivery £200 = £3,050. With the £550 furniture package and its separate £200 delivery: £3,800. Delivery is charged once on the outward mileage, not again for the return journey. Exact mileage and access are confirmed in your quote."},
        {title:"Space and capacity",text:"Allow approximately 15 × 20 m including guy ropes. Around 75 seated guests leaves space for a bar and dance floor. Up to 100 can be seated for dining only, or attend in the evening. Send site photos and rough measurements so Alex can assess the layout and suitability."},
        {title:"Installation and collection",text:"Installation usually takes five to six hours with three crew, depending on rigging, access and site logistics. The tent is usually ready two or three days before the wedding. Earliest standard collection after a Saturday wedding is Monday; Sunday collection costs extra. A site visit is free when booked."},
        {title:"Booking and extras",text:"A signed booking form and 20% non-refundable booking deposit confirm the supplier booking. The base tent package deposit is £570; delivery and extras affect the final quote. Balance due 14 working days before installation. Sidewalls, paper lanterns and Sunday collection are quoted separately. Other supplier services arranged and managed by Earth Village Events carry a 20% arrangement charge."},
        {title:"About these photographs",text:"Supplier-provided photographs of past events. Some styling, decor and furniture came from other suppliers. Furniture is optional; flowers, tableware, linen, lounge seating and other pictured styling are not included in the tent package."},
      ],
    },
    {
      ...common, id: "earth-village-furniture-75", name: "Rustic Furniture Package for 75",
      category: "furniture", visualiserUse: "reference-pending", unitPrice: 550,
      icon: "🪑",
      dimensions: "13 rustic trestle tables seating six each, and 75 vintage folding chairs.",
      material: "Wooden trestle tables and vintage folding chairs.",
      hireUnits: "Optional furniture package for the 10 × 15 m stretch tent wedding booking.",
      note: "Add 75 vintage folding chairs and 13 rustic trestle tables to your stretch tent booking. £550 per package, plus separate delivery at £4 per mile one way from Bristol. Tent, tableware, linen and decorative styling are separate.",
      packageDetails: [
        {title:"Included",text:"75 vintage folding chairs and 13 rustic trestle tables seating six each. The package is sized for 75 guests; 13 tables provide up to 78 table places. Confirm the layout and any furniture setup requirements with Alex."},
        {title:"Delivery example",text:"At 50 miles from Bristol, furniture delivery is £200, giving £750 for this furniture package. This is separate from the tent delivery charge. No VAT added."},
        {title:"Furniture details",text:"The supplied tent photographs show past event styling, including furniture from other businesses. Exact folding-chair and table photographs are to be confirmed with Alex."},
      ],
    },
    {
      ...common, id: "earth-village-stretch-tent-20x15", name: "20 × 15 m Stretch Tent Wedding Package",
      category: "tents", visualiserUse: "outdoor", unitPrice: 5467,
      image: "/img/items/earth-village-events/image2.jpeg",
      gallery: [1, 3, 4, 5].map(n => ({src: `/img/items/earth-village-events/image${n}.jpeg`, alt: "Earth Village Events stretch tent at a past event"})),
      dimensions: "Tent 20 × 15 m. Allow approximately 25 × 20 m including guy ropes.",
      material: "White or sand stretch fabric with Dandy Dura natural floor matting.",
      hireUnits: "Around 150 seated with bar and dance floor, or up to 200 seated for dining only. Up to 200 evening guests.",
      note: "A flowing outdoor canopy with floor matting, perimeter fairy lights, 12 colour-changing uplighters and overhead festoon lighting. Professional installation and take-down are included. LED lighting runs from venue mains power.",
      packageDetails: [
        {title:"Included",text:"20 × 15 m stretch tent in white or sand, full floor matting, perimeter fairy lights, 12 uplighters, overhead festoons, installation and take-down."},
        {title:"Optional furniture",text:"150 vintage folding chairs and 25 rustic trestle tables, seating six each: £1,095. Furniture delivery is an additional £4 per mile one way. Request it as a separate package."},
        {title:"Delivery example",text:"At 50 miles from Bristol: tent £5,467 + delivery £200 = £5,667. With furniture and its separate £200 delivery: £6,962. Exact mileage and access are confirmed in your quote."},
        {title:"Site and timings",text:"Send your date, postcode, meal and evening guest numbers, site photos and measurements. A free site visit is included when booked. Installation can take up to 10 hours with three to five crew. Usually ready two or three days before the wedding; earliest standard collection after a Saturday wedding is Monday. Sunday collection costs extra."},
        {title:"Booking and extras",text:"A signed booking form and 20% non-refundable deposit confirm the booking. The base tent deposit is £1,093.40. Balance due 14 working days before installation. Sidewalls, paper lanterns and Sunday collection are quoted separately. Other supplier services arranged and managed by Earth Village Events carry a 20% arrangement charge."},
        {title:"About these photographs",text:"Supplier photographs of past events. Some decor and styling are supplied by other businesses. Furniture is optional; lounge seating, flowers, crockery and other pictured styling are not included in the tent package."},
      ],
    },
    {
      ...common, id: "earth-village-furniture-150", name: "Rustic Furniture Package for 150",
      category: "furniture", visualiserUse: "reference-pending", unitPrice: 1095,
      image: "/img/items/earth-village-events/image3.jpeg",
      dimensions: "25 rustic trestle tables seating six each, and 150 vintage folding chairs.",
      material: "Wooden trestle tables and vintage folding chairs.",
      hireUnits: "Optional furniture package for the stretch tent wedding booking.",
      note: "Add seating and tables for 150 guests to your stretch tent booking. £1,095 plus separate delivery at £4 per mile one way from Bristol. Tent, tableware, linen and decorative styling are separate.",
      packageDetails: [{title:"Delivery example",text:"Furniture delivery at 50 miles is £200, giving £1,295 for the furniture package. This charge is additional to tent delivery. Confirm any furniture setup requirements and hire dates with Alex."}],
    },
  ];
}
