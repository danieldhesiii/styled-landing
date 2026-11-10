"use client";
import { useEffect, useRef, useState } from 'react';
import { adminApi } from '@/lib/admin-client';
export type EditableProduct = { id: string; name: string; unitPricePence: number; capacity: number | null; note: string; updatedAt: string };
export default function ProductEditDialog({ product, onClose, onSaved }: { product: EditableProduct; onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(product.name), [price, setPrice] = useState(String(product.unitPricePence / 100)),
    [note, setNote] = useState(product.note), [capacity, setCapacity] = useState(product.capacity === null ? '' : String(product.capacity)),
    [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    const focus = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    dialog.current?.showModal(); document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; focus?.focus(); };
  }, []);
  const field = 'mt-2 block min-h-11 w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-2 text-base';
  return <dialog ref={dialog} aria-labelledby="product-edit-title" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-y-auto overscroll-contain rounded-2xl bg-cream p-0 text-ink backdrop:bg-ink/40">
    <form onSubmit={async e => {
      e.preventDefault(); if (busy) return; setBusy(true); setError('');
      try {
        const r = await adminApi(`/api/admin/products/${encodeURIComponent(product.id)}`, 'PATCH', { name, unitPrice: Number(price), note, capacity: capacity === '' ? null : Number(capacity), updatedAt: product.updatedAt });
        if (!r.ok) throw Error(r.data?.error || 'Could not save this product.');
        onSaved(); onClose();
      } catch(e) { setError(e instanceof Error ? e.message : 'Could not save. Your changes are still here.'); }
      finally { setBusy(false); }
    }}>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-sand bg-cream p-5"><h2 id="product-edit-title" className="font-serif text-2xl">Edit product</h2><button type="button" disabled={busy} onClick={onClose} className="min-h-11 px-3 text-sm underline">Close</button></header>
      <fieldset disabled={busy} className="space-y-5 p-5">
        <label className="block text-sm">Product name<input autoFocus required minLength={2} maxLength={160} value={name} onChange={e => setName(e.target.value)} className={field}/></label>
        <label className="block text-sm">Price (£)<input required type="number" min={0} max={1000000} step="0.01" value={price} onChange={e => setPrice(e.target.value)} className={field}/></label>
        <label className="block text-sm">Units per day (blank for made to order)<input type="number" min={0} max={100000} step={1} value={capacity} onChange={e => setCapacity(e.target.value)} className={field}/></label>
        <label className="block text-sm">Description<textarea rows={4} maxLength={500} value={note} onChange={e => setNote(e.target.value)} className={field}/></label>
        <p className="text-sm text-ink/70">Name, price or description changes hide this product pending approval. Existing request prices stay unchanged.</p>
        {error && <p role="alert" className="rounded-xl bg-blush/30 p-4 text-sm">{error}</p>}
      </fieldset>
      <footer className="sticky bottom-0 flex flex-wrap gap-4 border-t border-sand bg-cream p-5"><button disabled={busy} className="min-h-11 rounded-full bg-ink px-6 text-sm text-cream disabled:opacity-50">{busy ? 'Saving…' : 'Save changes'}</button><button type="button" disabled={busy} onClick={onClose} className="min-h-11 text-sm underline">Cancel</button></footer>
    </form>
  </dialog>;
}
