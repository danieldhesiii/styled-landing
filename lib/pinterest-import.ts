export interface PinterestBoard { id: string; name: string }
export interface PinterestPhoto { id: string; title: string; image: string; source: string }
export const PINTEREST_SELECTION_LIMIT = 3;
export function addPinterestPhotos(current: import('./wedding').BoardPin[], photos: { id: string; pin: Pick<PinterestPhoto, 'title' | 'source'> }[]) {
  const sources = new Set(current.filter(p => p.kind === 'photo').map(p => p.text.match(/https:\/\/www\.pinterest\.com\/pin\/\d+\//)?.[0]));
  const next: import('./wedding').BoardPin[] = [];
  for (const photo of photos) {
    if (sources.has(photo.pin.source)) continue;
    sources.add(photo.pin.source);
    next.push({ id: crypto.randomUUID(), kind: 'photo', ref: photo.id, text: `${photo.pin.title}\nSource: ${photo.pin.source}` });
  }
  if (current.length + next.length > 100) throw Error('This board is full. Remove an idea before importing more images.');
  // The visualiser takes the first three photos. Put the explicit new selection
  // first, so importing does not silently use older inspiration instead.
  return [...next, ...current];
}
export function pinterestId(value: unknown): value is string {
  return typeof value === 'string' && /^\d{1,30}$/.test(value);
}
export function pinterestImage(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2000) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.port ||
      !(u.hostname === 'i.pinimg.com' || u.hostname === 'i2.pinimg.com') ||
      !/\.(jpe?g|png|webp)(?:$)/i.test(u.pathname)) return null;
    return u.href;
  } catch { return null; }
}
export function pinterestPhoto(pin: any): PinterestPhoto | null {
  if (!pinterestId(pin?.id) || pin?.media?.media_type !== 'image') return null;
  const images = Object.values(pin.media.images || {}) as any[];
  const ordered = images.filter(i => pinterestImage(i?.url))
    .sort((a,b) => (Number(b.width) || 0) - (Number(a.width) || 0));
  if (!ordered.length) return null;
  return { id: pin.id, title: String(pin.title || 'Pinterest inspiration').slice(0,150),
    image: pinterestImage(ordered[0].url)!, source: `https://www.pinterest.com/pin/${pin.id}/` };
}
