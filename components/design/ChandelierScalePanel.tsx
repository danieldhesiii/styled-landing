"use client";
import {useId} from 'react';
import {chandelierMeasurements,parseChandelierScale,type ChandelierSize} from '@/lib/chandelier-scale';

export default function ChandelierScalePanel({product,ceiling,suspension,onCeiling,onSuspension,disabled}:{
  product:ChandelierSize;ceiling:string;suspension:string;onCeiling:(value:string)=>void;onSuspension:(value:string)=>void;disabled:boolean;
}) {
  const id=useId();
  let measured:ReturnType<typeof chandelierMeasurements>|null=null,error='';
  if(ceiling!==''&&suspension!=='') try {
    const scale=parseChandelierScale({ceilingHeightCm:Number(ceiling)*100,suspensionDropCm:Number(suspension)});
    if(scale) measured=chandelierMeasurements(product,scale);
  } catch(e) {error=e instanceof Error?e.message:'Check measurements.';}
  const maxCm=240,bodyHeight=product.dropCm/maxCm*180,bodyWidth=product.diameterCm/maxCm*180;
  return <div className="mt-3 text-sm">
    <p className="font-medium">{product.dropCm/100} m drop · {product.diameterCm/100} m wide</p>
    <p className="mt-1 text-xs text-ink/60">Brochure dimensions. Image scale is approximate.</p>
    <details className="mt-3 rounded-xl border border-sand p-3">
      <summary className="cursor-pointer font-medium">Size guide & room measurements</summary>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <svg viewBox="0 0 230 210" role="img" aria-label={`Dimension diagram: ${product.name}, ${product.dropCm} centimetres tall and ${product.diameterCm} centimetres wide, beside a 2 metre ruler.`} className="h-44 w-48 flex-none">
          <line x1="25" x2="25" y1="30" y2="180" stroke="currentColor" strokeWidth="1"/>
          {[0,50,100,150,200].map(cm=><g key={cm}><line x1="20" x2="30" y1={180-cm/maxCm*180} y2={180-cm/maxCm*180} stroke="currentColor"/><text x="35" y={184-cm/maxCm*180} fontSize="9">{cm/100} m</text></g>)}
          <rect x={150-bodyWidth/2} y={180-bodyHeight} width={bodyWidth} height={bodyHeight} fill="#be967633" stroke="#9c7356" strokeWidth="1.5"/>
          <text x="150" y="198" textAnchor="middle" fontSize="10">{product.diameterCm} cm wide</text>
        </svg>
        <p className="max-w-xs text-xs leading-relaxed text-ink/60">The shaded box shows the brochure height and width against a ruler. It is a size comparison, not a venue placement.</p>
      </div>
      <p className="mt-2 text-xs text-ink/70">For a better estimate, enter both measurements. Leave both blank if you do not know.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label htmlFor={`${id}-ceiling`} className="text-xs">Ceiling height at hanging point (m)<input id={`${id}-ceiling`} type="number" inputMode="decimal" min="1.5" max="30" step="0.01" placeholder="e.g. 4.5" value={ceiling} onChange={e=>onCeiling(e.target.value)} disabled={disabled} className="mt-1 block min-h-11 w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm"/></label>
        <label htmlFor={`${id}-suspension`} className="text-xs">Extra chain / suspension drop (cm)<input id={`${id}-suspension`} type="number" inputMode="decimal" min="0" step="1" placeholder="e.g. 30, or 0 if none" value={suspension} onChange={e=>onSuspension(e.target.value)} disabled={disabled} className="mt-1 block min-h-11 w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm"/></label>
      </div>
      {(ceiling!==''||suspension!=='')&&<button type="button" disabled={disabled} onClick={()=>{onCeiling('');onSuspension('');}} className="mt-3 text-xs underline disabled:opacity-50">Clear measurements</button>}
      {measured&&<p className="mt-3 text-xs text-ink/75">Calculated bottom height: {(measured.floorClearanceCm/100).toFixed(2)} m above the floor. This is not a safety or installation check.</p>}
      {error&&<p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
      <p className="mt-3 text-xs leading-relaxed text-ink/60">Assumes brochure drop excludes extra suspension. Confirm this with the supplier. Apply or generate a look to use these values. AI can still vary the size; reliable placement needs a calibrated room model.</p>
    </details>
  </div>;
}
