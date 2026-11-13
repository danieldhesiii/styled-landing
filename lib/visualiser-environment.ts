export const VISUALISER_ENVIRONMENTS = [
  "indoor",
  "outdoor",
  "tent-interior",
] as const;
export type VisualiserEnvironment = (typeof VISUALISER_ENVIRONMENTS)[number];
export type TentColour = "white" | "sand";
export function parseVisualiserEnvironment(
  value: unknown,
): VisualiserEnvironment {
  if (value === undefined) return "indoor";
  if (!VISUALISER_ENVIRONMENTS.includes(value as VisualiserEnvironment))
    throw Error("Choose an indoor, outdoor or existing-tent setting.");
  return value as VisualiserEnvironment;
}
export function parseTentColour(value: unknown): TentColour {
  if (value === undefined) return "white";
  if (value !== "white" && value !== "sand")
    throw Error("Choose white or sand tent fabric.");
  return value;
}
export const isAlexTent = (id: string) =>
  id === "earth-village-stretch-tent-10x15" ||
  id === "earth-village-stretch-tent-20x15";
/** An explicit unsupported model size must not become a style-based substitution. */
export function unknownTentSize(brief:string):boolean {
 const pattern=/\b(?:(?:use|choose|select|show)\s+(?:(?:the|a|an)\s+)?)(\d{1,3})\s*(?:x|×|by)\s*(\d{1,3})\s*m(?:etres?)?\b(?!\s*(?:site|lawn|grounds|area|footprint))|\b(\d{1,3})\s*(?:x|×|by)\s*(\d{1,3})\s*m(?:etres?)?\s+(?:stretch\s+)?(?:tent|marquee)\b/gi;
 for(const m of brief.matchAll(pattern)){
  const prefix=brief.slice(Math.max(0,(m.index||0)-45),m.index).split(/[.;,]|\bbut\b/i).pop()||"";
  if(/\b(no|not|without|avoid|remove|exclude)\b/i.test(prefix))continue;
  const sizes=[Number(m[1]||m[3]),Number(m[2]||m[4])].sort((a,b)=>a-b);
  if(!(sizes[0]===10&&sizes[1]===15)&&!(sizes[0]===15&&sizes[1]===20))return true;
 }
 return false;
}
