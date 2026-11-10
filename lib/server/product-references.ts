import type {CatalogueItem} from '@/lib/types';
import {readPublicImage} from '@/lib/server/public-images';
import {ProductMatchError} from '@/lib/product-matching';
/** Named products must retain their photos, never silently lose identity input. */
export async function loadProductReferences(items:CatalogueItem[],namedIds:string[],budget:number){
  const named=new Set(namedIds),ordered=[...items].sort((a,b)=>Number(named.has(b.id))-Number(named.has(a.id)));
  const buffers:Buffer[]=[],names:string[]=[];
  for(const item of ordered){
    if(buffers.length>=budget){if(named.has(item.id))throw new ProductMatchError('Choose fewer venue or inspiration photos so all named product photos can be included.');continue;}
    try{
      if(!item.image)throw new Error('No product photo');
      buffers.push(await readPublicImage(item.image));
      names.push(`${item.name}${item.dimensions?`; ${item.dimensions}`:''}${item.material?`; ${item.material}`:''}`);
    }catch{if(named.has(item.id))throw new ProductMatchError(`The reference photo for ${item.name} is unavailable. Choose another product or try again later.`);}
  }
  return {buffers,names};
}
