import type { CatalogueItem } from './types';

export class ProductMatchError extends Error {}
export function normaliseProductText(text:string):string {
  return (text||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/([a-z])([0-9])/gi,'$1 $2').replace(/([0-9])([a-z])/gi,'$1 $2').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
function aliases(item:CatalogueItem):string[] {
  const name=normaliseProductText(item.name);
  return [...new Set([name,name.replace(/^vintage /,''),name.replace(/ (\d+)$/, ' chandelier $1'), ...(item.category==='tents'?[name.replace(/^(\d+) (\d+) m .*/,'$1 x $2 m'),name.replace(/^(\d+) (\d+) m .*/,'$1 by $2 m'),name.replace(/^(\d+) (\d+) m .*/,'$1 $2 m')]:[])])].filter(n=>n.split(' ').length>=2||n.length>=4);
}
function negated(text:string,start:number):boolean {
  const prefix=text.slice(Math.max(0,start-55),start);
  // A new clause or "but use" ends an earlier negative request.
  const clause=prefix.split(/\.\s*|\b(?:but|then|and use|instead use)\b/).pop()||'';
  return /\b(?:no|not|without|avoid|remove|exclude|instead of|rather than|don t)\b[^.]*$/.test(clause);
}
export function namedProducts(brief:string,catalogue:CatalogueItem[]):{items:CatalogueItem[];excludedIds:string[]} {
  if(!brief.trim())return {items:[],excludedIds:[]};
  const variantText = normaliseProductText(brief);
  const variant = /\bvintage french crystal empire(?: chandelier)? 105\b/.exec(variantText);
  if (variant && !negated(variantText, variant.index)
    && catalogue.some(item=>item.id==='demo-crescent-moon-french-crystal-empire-105')
    && !catalogue.some(item=>normaliseProductText(item.name)==='vintage french crystal empire 105')) {
    throw new ProductMatchError('Vintage French Crystal Empire 105 is a separate variant. Choose the listed French Crystal Empire 105 or ask the supplier to confirm the vintage model.');
  }
  const text=brief.split(/[.;,!?]/).map(normaliseProductText).join(' . '),items:CatalogueItem[]=[],excludedIds:string[]=[];
  for(const item of catalogue){
    let include=false,exclude=false;
    for(const alias of aliases(item)){
      const needle=` ${alias} `,haystack=` ${text} `;
      let offset=0,index:number;
      while((index=haystack.indexOf(needle,offset))!==-1){
        if(negated(text,index))exclude=true;else include=true;
        offset=index+needle.length-1;
      }
    }
    if(include)items.push(item);else if(exclude)excludedIds.push(item.id);
  }
  // Never silently replace an unknown model number with another product.
  const families=new Map<string,CatalogueItem[]>();
  for(const item of catalogue){
    // Tent dimensions precede the family name; the outdoor size guard handles unknown sizes.
    if(item.category==='tents')continue;
    const name=normaliseProductText(item.name),family=name.replace(/\b\d+\b/g,'').replace(/^vintage /,'').trim();
    if(family.split(' ').length<2&&!/\d/.test(name))continue;
    families.set(family,[...(families.get(family)||[]),item]);
  }
  for(const [family,options] of families){
    const pattern=new RegExp(`(?:^| )${family}(?: chandelier)?(?: (\\d+))?(?= |$)`,'g');let match:RegExpExecArray|null;
    while((match=pattern.exec(text))!==null){
      if(negated(text,match.index))continue;
      const number=match[1];
      if(number&&!items.some(item=>normaliseProductText(item.name).includes(`${family} ${number}`)))throw new ProductMatchError(`That model number is not listed. Available products: ${options.map(i=>i.name).join(' or ')}.`);
      if(!number&&options.length>1)throw new ProductMatchError(`Please specify the exact product: ${options.map(i=>i.name).join(' or ')}.`);
    }
  }
  return {items,excludedIds};
}
const STOP=new Set('a an the and with for of in to it my our their use please create look wedding style supplier demo not bookable confirmed approval only product current stock'.split(' '));
const STYLE_WORDS:Record<string,string>={classic_elegance:'classic ornate crystal refined polished elegant',garden_romance:'romantic soft warm floral greenery garden',rustic_barn:'rustic wood natural festoon wildflower relaxed',modern_minimal:'modern clean contemporary minimal sculptural neutral'};
export function productStyleScore(item:CatalogueItem,brief:string,styleId:string|null):number {
  const text=normaliseProductText([item.name,item.material,item.note].filter(Boolean).join(' '));
  const words=new Set(normaliseProductText(brief).split(' ').filter(w=>w.length>2&&!STOP.has(w)));
  for(const [word,related] of Object.entries({small:['compact'],big:['large','oversized'],grand:['statement','oversized'],huge:['oversized','large']}))if(words.has(word))for(const token of related)words.add(token);
  const overlap=[...words].filter(w=>text.split(' ').includes(w)).length;
  const mood=(STYLE_WORDS[styleId||'']||'').split(' ').filter(w=>w&&text.split(' ').includes(w)).length;
  return (styleId&&(item.styles||[]).includes(styleId)?30:0)+overlap*8+mood*3+(item.imageKind==='supplier'||item.imageKind==='supplier_reference'?2:0);
}
export function rankProducts<T extends CatalogueItem>(catalogue:T[],brief:string,styleId:string|null):T[] {
  return [...catalogue].sort((a,b)=>productStyleScore(b,brief,styleId)-productStyleScore(a,brief,styleId));
}
/** Separate preview-only assets from orderable products; never grants venue/supplier access. */
export function choosePreviewProduct(opts:{catalogue:CatalogueItem[];currentItems:CatalogueItem[];brief:string;styleId:string|null;chosenIds:string[];allow:boolean;auto:boolean}):CatalogueItem|undefined {
  const named=namedProducts(opts.brief,opts.catalogue);
  const explicit=[...new Map((named.items.length?named.items:opts.catalogue.filter(i=>opts.chosenIds.includes(i.id)&&!named.excludedIds.includes(i.id))).map(i=>[i.id,i])).values()];
  if(explicit.length&&!opts.allow)throw new ProductMatchError('That preview product is not available within this venue or supplier selection.');
  if(explicit.length>1)throw new ProductMatchError('Choose one preview lighting design per look. You can compare another design in a new version.');
  if(explicit.length)return explicit[0];
  if(!opts.allow||!opts.auto||/\b(?:no|without|avoid|remove) (?:any |the )?chandeliers?\b/i.test(opts.brief))return;
  const pool=opts.catalogue.filter(i=>!named.excludedIds.includes(i.id));
  const best=rankProducts(pool,opts.brief,opts.styleId)[0];if(!best)return;
  const competing=opts.currentItems.filter(i=>i.category===best.category);
  // Keep deliberately chosen live products; otherwise choose by style and brief.
  if(competing.some(i=>opts.chosenIds.includes(i.id)))return;
  const score=productStyleScore(best,opts.brief,opts.styleId);
  if(score<=2||competing.some(i=>productStyleScore(i,opts.brief,opts.styleId)>=score))return;
  return best;
}
