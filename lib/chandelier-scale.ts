/** Measurement-based guidance, not camera calibration or installation approval. */
export interface ChandelierScale {
  ceilingHeightCm: number;
  suspensionDropCm: number;
}
export interface ChandelierSize {
  name: string;
  dropCm: number;
  diameterCm: number;
}
export function parseChandelierScale(value: unknown): ChandelierScale | null {
  if(value===undefined || value===null) return null;
  if(typeof value!=='object' || Array.isArray(value)) throw new Error('Check the chandelier size measurements.');
  const {ceilingHeightCm,suspensionDropCm}=value as Partial<ChandelierScale>;
  if(typeof ceilingHeightCm!=='number'||!Number.isFinite(ceilingHeightCm)||ceilingHeightCm<150||ceilingHeightCm>3000)
    throw new Error('Enter a ceiling height between 1.5 and 30 metres at the hanging point.');
  if(typeof suspensionDropCm!=='number'||!Number.isFinite(suspensionDropCm)||suspensionDropCm<0||suspensionDropCm>=ceilingHeightCm)
    throw new Error('Enter the extra suspension drop in centimetres, from zero up to the ceiling height.');
  return {ceilingHeightCm,suspensionDropCm};
}
export function chandelierMeasurements(size:ChandelierSize, scale:ChandelierScale) {
  const floorClearanceCm=scale.ceilingHeightCm-scale.suspensionDropCm-size.dropCm;
  if(floorClearanceCm<=0) throw new Error('The chandelier and suspension reach the floor. Check the product and room measurements.');
  return {floorClearanceCm,bodyFraction:size.dropCm/scale.ceilingHeightCm,diameterFraction:size.diameterCm/scale.ceilingHeightCm};
}
export function chandelierScaleInstruction(size:ChandelierSize, scale:ChandelierScale|null):string {
  if(!scale) return 'SCALE IS UNCALIBRATED: No measured ceiling height or suspension drop is supplied. Do not claim this render is true to scale. Use brochure dimensions as a physical size guide, but do not shrink a statement chandelier merely to keep it high above the scene. Do not copy the apparent size of the fixture in an earlier render.';
  const m=chandelierMeasurements(size,scale);
  return `MEASUREMENT-BASED SIZE GUIDANCE for ${size.name}. The user supplied a floor-to-ceiling height of ${scale.ceilingHeightCm} cm AT THE HANGING POINT, and ${scale.suspensionDropCm} cm extra suspension between that point and the top of the fixture. Assuming the brochure drop describes the fixture itself, its body is ${size.dropCm} cm tall and ${size.diameterCm} cm wide. Its bottom is therefore ${m.floorClearanceCm.toFixed(1)} cm above the floor. In a local vertical plane at the chandelier, the fixture body occupies ${(m.bodyFraction*100).toFixed(1)}% of the floor-to-ceiling height; its diameter corresponds to ${(m.diameterFraction*100).toFixed(1)}% of that SAME height. Respect perspective and the chosen hanging depth; these are world-space ratios, not percentages of the entire output image. Do not make the product smaller to match an earlier render or to create extra headroom. Do not raise the ceiling or enlarge the room to make it fit. Preserve the selected model's full height and width. These measurements guide an approximate image; they do not establish safe clearance, rigging suitability or supplier-approved installation.`;
}
