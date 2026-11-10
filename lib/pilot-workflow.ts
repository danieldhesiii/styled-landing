import {hireDateError} from "./booking-dates";
export type PilotPhase="draft"|"review"|"quoted"|"accepted"|"confirmed"|"cancelled";
export type PilotSupplier={id:string;name:string;minimum:number;mode:"installed"|"hire_only";reply:"pending"|"available"|"alternative"|"declined";note:string;delivery:string;setup:string;collection:string;extra:string;security:string;siteChecked:boolean;approved:boolean;rights:boolean;terms:boolean;owner:string;followUp:string;internalNote:string};
export type PilotProduct={id:string;supplierId:string;name:string;price:number;max:number;image:string;detail:string;package:boolean};
export const PILOT_PRODUCTS:PilotProduct[]=[
 {id:"floral-package",supplierId:"meadow",name:"Ceremony floral package",price:55000,max:2,image:"/img/venues/manor_orangery.png",detail:"One arch, two aisle arrangements and eight table centres. Shared stock; cannot be split. Ivory or blush example variants.",package:true},
 {id:"welcome-display",supplierId:"meadow",name:"Welcome floral display",price:9500,max:3,image:"/img/venues/oak_barn.png",detail:"One arrangement with stand, 90 cm high. Close-up supplier photography would be added here.",package:false},
 {id:"chandelier",supplierId:"lantern",name:"Crystal chandelier and compatible stand",price:13000,max:8,image:"/img/venues/county_hall.jpg",detail:"One chandelier and matched stand. Venue and installation suitability require a supplier check. Technical dimensions await real supplier material.",package:true},
 {id:"lantern-pair",supplierId:"lantern",name:"Decorative lantern pair",price:8000,max:6,image:"/img/venues/oak_barn.png",detail:"Two coordinated lanterns. Example hire product; no installation suitability is implied.",package:true},
];
export type PilotState={phase:PilotPhase;version:number;acceptedVersion:number|null;quoteExpires:string|null;start:string;end:string;venue:string;setupWindow:string;collectionWindow:string;accessNotes:string;region:"local"|"travel";basket:Record<string,number>;suppliers:PilotSupplier[];events:{text:string;at:string}[];claim:{status:"none"|"reported"|"notified"|"disputed"|"resolved";evidence:string;amount:string;note:string}};
export const PHASE_LABELS:Record<PilotPhase,string>={draft:"Build a request",review:"Supplier review",quoted:"Full quote ready",accepted:"Customer accepted",confirmed:"Example booking recorded",cancelled:"Request cancelled"};
export function initialPilot():PilotState{return {phase:"draft",version:1,acceptedVersion:null,quoteExpires:null,start:"",end:"",venue:"Example wedding venue",setupWindow:"",collectionWindow:"",accessNotes:"",region:"local",basket:{"floral-package":1,"chandelier":3},suppliers:[
 {id:"meadow",name:"Meadow Floral Hire (fictional)",minimum:45000,mode:"installed",reply:"pending",note:"",delivery:"",setup:"",collection:"",extra:"0",security:"",siteChecked:false,approved:true,rights:true,terms:true,owner:"",followUp:"",internalNote:""},
 {id:"lantern",name:"Lantern House Lighting (fictional)",minimum:30000,mode:"installed",reply:"pending",note:"",delivery:"",setup:"",collection:"",extra:"0",security:"",siteChecked:false,approved:true,rights:true,terms:true,owner:"",followUp:"",internalNote:""}],events:[],claim:{status:"none",evidence:"",amount:"",note:""}};}
export function pilotMoney(value:string):number|null{if(!/^\d{1,6}(\.\d{1,2})?$/.test(value.trim()))return null;return Math.round(Number(value)*100);}
export function pilotTotals(s:PilotState){return s.suppliers.map(p=>{const lines=PILOT_PRODUCTS.filter(i=>i.supplierId===p.id&&(s.basket[i.id]||0)>0);const subtotal=lines.reduce((n,i)=>n+i.price*s.basket[i.id],0);const amounts=[p.delivery,p.setup,p.collection,p.extra].map(pilotMoney);return {supplier:p,lines,subtotal,shortfall:Math.max(0,p.minimum-subtotal),feesKnown:amounts.every(a=>a!==null),fees:amounts.reduce<number>((a,b)=>a+(b||0),0),security:pilotMoney(p.security)};}).filter(g=>g.lines.length);}
export function pilotRequestProblems(s:PilotState,today:string){const problems:string[]=[];const d=hireDateError(s.start,s.end,today);if(d)problems.push(d.replace("delivery and return","hire start and end"));if(!s.venue.trim())problems.push("Add the venue so suppliers can assess delivery and setup.");
 if(!Object.values(s.basket).some(q=>q>0))problems.push("Add at least one product.");
 for(const [id,q]of Object.entries(s.basket)){const i=PILOT_PRODUCTS.find(p=>p.id===id);if(!i||!Number.isInteger(q)||q<0||(i&&q>i.max))problems.push("Check quantities against the example stock limits.");}
 for(const g of pilotTotals(s)){if(g.shortfall)problems.push(`Add £${(g.shortfall/100).toFixed(2)} more with ${g.supplier.name}.`);if(!g.supplier.approved||!g.supplier.rights||!g.supplier.terms)problems.push(`${g.supplier.name} needs listing, image and terms approval in Supplier setup.`);}
 return problems;}
export function pilotQuoteProblems(s:PilotState){const problems:string[]=[];for(const g of pilotTotals(s)){if(g.supplier.reply!=="available")problems.push(`${g.supplier.name}: availability not agreed.`);if(!g.feesKnown)problems.push(`${g.supplier.name}: complete all delivery, setup, collection and extra-day costs (enter 0 if included).`);if(g.supplier.mode==="installed"&&!g.supplier.siteChecked)problems.push(`${g.supplier.name}: venue and installation check outstanding.`);if(g.security===null)problems.push(`${g.supplier.name}: specify the example refundable security amount, including 0 if none.`);}return problems;}
export type PilotAction=
 |{type:"edit";patch:Partial<Pick<PilotState,"start"|"end"|"venue"|"setupWindow"|"collectionWindow"|"accessNotes"|"region"|"basket">>}
 |{type:"supplier";id:string;patch:Partial<PilotSupplier>}
 |{type:"submit";today:string}|{type:"quote";today:string;now:string}|{type:"accept";version:number;now:string}|{type:"confirm"}|{type:"cancel"}|{type:"note";id:string;text:string}|{type:"claim";patch:Partial<PilotState["claim"]>};
export function pilotChange(s:PilotState,a:PilotAction,now=new Date().toISOString()):PilotState{
 if(s.phase==="cancelled"&&a.type!=="note")throw Error("Reset the example to start another request.");
 const event=(next:PilotState,text:string)=>({...next,events:next.events.at(-1)?.text===text?[...next.events.slice(0,-1),{text,at:now}]:[...next.events,{text,at:now}]});
 const invalidate=(next:PilotState)=>({...next,version:s.version+1,acceptedVersion:null,quoteExpires:null,phase:(s.phase==="draft"?"draft":"review")as PilotPhase});
 if(a.type==="edit"){if(s.phase==="confirmed")throw Error("Reset the example before changing a recorded booking.");return event(invalidate({...s,...a.patch,suppliers:s.suppliers.map(p=>({...p,reply:"pending",siteChecked:false}))}),"Request changed. Supplier checks and any earlier quote acceptance are reset.");}
 if(a.type==="supplier"){
  const p=s.suppliers.find(p=>p.id===a.id);if(!p)throw Error("Unknown example supplier.");
  const operational=Object.keys(a.patch).every(k=>["owner","followUp","internalNote"].includes(k));
  if(s.phase==="confirmed"&&!operational)throw Error("Reset the example before changing agreed booking details.");
  const next={...s,suppliers:s.suppliers.map(p=>p.id===a.id?{...p,...a.patch,id:p.id}:p)};
  return event(operational?next:invalidate(next),operational?`${p.name}: tracking updated.`:`${p.name}: details changed; quote approval must be checked again.`);
 }
 if(a.type==="submit"){if(s.phase!=="draft"&&s.phase!=="review")throw Error("Edit the request before resubmitting.");const p=pilotRequestProblems(s,a.today);if(p.length)throw Error(p.join(" "));return event({...s,phase:"review"},"Practice request submitted. No email, stock reservation or payment created.");}
 if(a.type==="quote"){if(s.phase!=="review")throw Error("Submit the request and collect supplier replies first.");const p=[...pilotRequestProblems(s,a.today),...pilotQuoteProblems(s)];if(p.length)throw Error(p.join(" "));return event({...s,phase:"quoted",quoteExpires:new Date(Date.parse(a.now)+72*3600000).toISOString()},`Complete example quote version ${s.version} issued, valid for 72 hours. Security amounts are separate from hire.`);}
 if(a.type==="accept"){if(s.phase!=="quoted"||a.version!==s.version||!s.quoteExpires||Date.parse(a.now)>Date.parse(s.quoteExpires))throw Error("This quote changed or expired. Ask for a new quote.");if(pilotQuoteProblems(s).length)throw Error("The full quote still needs supplier checks.");return event({...s,phase:"accepted",acceptedVersion:s.version},`Customer accepted example quote version ${s.version}. No payment taken.`);}
 if(a.type==="confirm"){if(s.phase!=="accepted"||s.acceptedVersion!==s.version||pilotQuoteProblems(s).length)throw Error("The customer must accept the current complete quote first.");return event({...s,phase:"confirmed"},"Example booking recorded after both sides agreed. Real contracts, money and inventory are untouched.");}
 if(a.type==="cancel"){if(s.phase==="confirmed")throw Error("A confirmed booking needs an agreed cancellation process; reset this example instead.");return event({...s,phase:"cancelled",acceptedVersion:null},"Practice request cancelled. No refund needed because no money was taken.");}
 if(a.type==="note"){if(!a.text.trim()||a.text.length>1000)throw Error("Add a note under 1,000 characters.");return event(s,`${a.id}: ${a.text.trim()}`);}
 if(a.type==="claim"){
  if(s.phase!=="confirmed")throw Error("Complete the example booking before trying a return inspection.");
  const claim={...s.claim,...a.patch};
  const allowed:Record<PilotState["claim"]["status"],string[]>={none:["reported"],reported:["notified"],notified:["disputed","resolved"],disputed:["resolved"],resolved:[]};
  if(!allowed[s.claim.status].includes(claim.status))throw Error("Record the report, then customer notification, then any dispute or resolution in order.");
  if(claim.status!=="none"&&(!claim.evidence.trim()||pilotMoney(claim.amount)===null))throw Error("Record evidence and a valid claimed amount first.");
  return event({...s,claim},`Example claim: ${claim.status}. No funds deducted or customer notification sent.`);
 }
 return s;
}
