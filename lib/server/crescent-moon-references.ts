import 'server-only';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import library from '@/lib/crescent-moon-reference-library.json';
import products from '@/lib/crescent-moon-preview.json';
import {readPublicImage} from './public-images';

/** Only visually matched views of the selected model; uncertain variants stay out. */
export async function loadCrescentMoonReferences(id:string) {
  const product=products.find(p=>`demo-crescent-moon-${p.slug}`===id);
  if(!product) throw new Error('Unknown chandelier reference.');
  const sources=library.filter(entry=>entry.productSlug===product.slug && entry.status==='visual-match' && entry.source!==product.imageSource);
  const buffers:Buffer[]=[await sharp(await readPublicImage(`/img/items/crescent-moon-demo/${product.image}`)).rotate().jpeg({quality:95}).toBuffer()];
  const names=[`${product.name}; primary identity view; drop ${product.dropCm} cm, diameter ${product.diameterCm} cm; ${product.description}`];
  for(const source of sources){
    buffers.push(await readFile(path.join(process.cwd(),'private/supplier-references/crescent-moon',source.file)));
    names.push(`${product.name}; SAME chandelier, additional view, not an additional product; ${source.instruction}. The named brochure model determines size, not perspective in an event photograph.`);
  }
  return {buffers,names};
}

/** Product identity outranks mood styling and any fixture in the base render. */
export function chandelierIdentityInstruction(id:string, firstReferenceImage:number):string {
  const product=products.find(p=>`demo-crescent-moon-${p.slug}`===id);
  if(!product) throw new Error('Unknown chandelier reference.');
  return `PRODUCT IDENTITY PRIORITY: The selected product is ${product.name}. Image ${firstReferenceImage} is its PRIMARY identity photograph. Reproduce that specific physical object, not a generic chandelier or a new design inspired by it.
Required appearance: ${product.description}
Physical proportions: ${product.dropCm} cm fixture drop, ${product.diameterCm} cm diameter; height-to-width ratio ${(product.dropCm/product.diameterCm).toFixed(2)}. These describe the fixture, not the suspension chain. The brochure specifies ${product.bulbs} bulbs in total; do not invent visible arms for bulbs hidden inside crystal or on the far side.
Preserve the photographed outline, crown, body, basket, tier arrangement, visible arms, crystal draping, metal finish and relative proportions. Do not recolour the metal to suit the wedding palette. Do not hybridise Empire basket construction with Marie Therese arms or necklace swags from another model.
Place ONE complete selected chandelier visibly inside the room, suspended naturally from the ceiling with believable perspective and scale. Replace any different decorative chandelier in the base image; preserve the building itself. Keep the entire fixture visible wherever the room framing allows; do not enlarge the room or crop the product to disguise a mismatch. Do not copy a reference room, people, text, flowers or other fixtures.
All additional views labelled ${product.name} show the SAME object. Use them for detail; the primary photograph determines identity if a background or secondary fixture differs. Mood, inspiration photos and customer styling requests may change the surrounding scene, never this product's construction. This remains an illustrative preview, not installation or rigging approval.`;
}

/** Keep the edit target first, then the chosen product, before secondary room angles. */
export function orderChandelierInputs(venue:Buffer[], products:Buffer[], inspiration:Buffer[]=[]):Buffer[] {
  if(!venue.length) throw new Error('A venue image is required.');
  return [venue[0], ...products, ...venue.slice(1), ...inspiration];
}
