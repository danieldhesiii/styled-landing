export type VenueSupplierMode = "venue_only" | "venue_partners" | "styled";
export type VenueSupplier = {name:string; category:string; location:string; postcode:string; website:string};
export type VenueSupplierPolicy = {
  mode:VenueSupplierMode; bookingUrl:string; bookingNotes:string;
  localRadiusMiles:string; localNotes:string; suppliers:VenueSupplier[]; catalogueSupplierIds:string[];
};
export const EMPTY_VENUE_POLICY:VenueSupplierPolicy={mode:"venue_only",bookingUrl:"",bookingNotes:"",localRadiusMiles:"",localNotes:"",suppliers:[],catalogueSupplierIds:[]};
export const VENUE_MODES = {
  venue_only:"Our own supplier network",
  venue_partners:"Our approved suppliers on Styled",
  styled:"Styled catalogue welcome",
} as const;
export function publicWebsite(value:unknown):string {
  if(value===undefined||value===null||value==="")return "";
  if(typeof value!=="string"||value.length>1000)throw Error("Use a secure public website link.");
  try{const u=new URL(value.trim());if(u.protocol!=="https:"||u.username||u.password||u.port&&u.port!=="443"||!u.hostname.includes(".")||/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/i.test(u.hostname))throw Error();return u.href;}catch{throw Error("Use a secure HTTPS website link, without login details.");}
}
export function parseVenuePolicy(raw:unknown):VenueSupplierPolicy {
  if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("Check your supplier and booking settings.");
  const b=raw as Record<string,unknown>, p={...EMPTY_VENUE_POLICY};
  if(typeof b.mode!=="string"||!Object.prototype.hasOwnProperty.call(VENUE_MODES,b.mode))throw Error("Choose how couples find suppliers.");
  p.mode=b.mode as VenueSupplierMode;
  for(const k of ["bookingNotes","localNotes"] as const){if(typeof b[k]!=="string"||b[k].length>1500||b[k].includes("\0"))throw Error("Keep venue guidance under 1,500 characters.");p[k]=b[k].trim();}
  p.bookingUrl=publicWebsite(b.bookingUrl);
  if(typeof b.localRadiusMiles!=="string"||(b.localRadiusMiles!==""&&(!/^\d{1,3}$/.test(b.localRadiusMiles)||Number(b.localRadiusMiles)<1||Number(b.localRadiusMiles)>300)))throw Error("Use a local supplier radius from 1 to 300 miles, or leave it blank.");
  p.localRadiusMiles=b.localRadiusMiles;
  if(!Array.isArray(b.suppliers)||b.suppliers.length>20)throw Error("Add up to 20 recommended suppliers.");
  p.suppliers=b.suppliers.map(row=>{if(!row||typeof row!=="object"||Array.isArray(row))throw Error("Check each supplier.");const s={} as VenueSupplier;for(const k of ["name","category","location","postcode"] as const){const v=row[k];if(typeof v!=="string"||v.length>(k==="postcode"?12:160)||v.includes("\0"))throw Error("Check supplier names and locations.");s[k]=v.trim();}if(!s.name)throw Error("Give each supplier a business name.");s.website=publicWebsite(row.website);return s;});
  if(!Array.isArray(b.catalogueSupplierIds)||b.catalogueSupplierIds.length>50||b.catalogueSupplierIds.some(id=>typeof id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)))throw Error("Check the linked Styled supplier IDs.");
  p.catalogueSupplierIds=[...new Set(b.catalogueSupplierIds)] as string[];
  return p;
}
// Legacy published venues keep their previous open-catalogue behaviour. New
// venue drafts explicitly start with their own network until the team chooses.
export function venuePolicy(details?:{supplier_policy?:VenueSupplierPolicy}|null):VenueSupplierPolicy {
  if(!details?.supplier_policy)return {...EMPTY_VENUE_POLICY,mode:"styled"};
  return parseVenuePolicy(details.supplier_policy);
}
export function policyAllowsSupplier(policy:VenueSupplierPolicy,supplierId?:string){return policy.mode==="styled"||(policy.mode==="venue_partners"&&!!supplierId&&policy.catalogueSupplierIds.includes(supplierId));}
