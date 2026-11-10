"use client";
import { useEffect, useRef, useState } from 'react';
import type { PinterestBoard, PinterestPhoto } from '@/lib/pinterest-import';

async function read(response: Response) {
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'Could not connect to Pinterest.');
  return data;
}
const control = 'min-h-11 rounded-full border border-sand px-4 py-2 text-sm disabled:opacity-50';
const button = `${control} bg-white`;

export default function PinterestImport({ disabled, onBusy, targetBoardId }: {
  disabled: boolean; targetBoardId: string; onBusy: (busy: boolean) => void;
}) {
  const [enabled, setEnabled] = useState(false), [connected, setConnected] = useState(false);
  const [boards, setBoards] = useState<PinterestBoard[]>([]), [pins, setPins] = useState<PinterestPhoto[]>([]);
  const [boardId, setBoardId] = useState(''), [bookmark, setBookmark] = useState<string | null>(null);
  const [boardBookmark, setBoardBookmark] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    fetch('/api/pinterest', { cache: 'no-store' }).then(read).then(async d => {
      if (active.current) { setEnabled(d.enabled); setConnected(d.connected); }
      const requestedBoard = new URLSearchParams(window.location.search).get('boardId');
      if (d.enabled && d.connected && requestedBoard) {
        await loadBoards();
        if (active.current) setBoardId(requestedBoard);
        await loadPins(requestedBoard);
      }
    }).catch(e => { if (active.current) setError(e instanceof Error ? e.message : 'Could not check the Pinterest connection.'); });
    const outcome = new URLSearchParams(window.location.search).get('pinterest');
    if (outcome === 'failed') setError('Pinterest was not connected. You can try again.');
    return () => { active.current = false; };
  }, []);

  async function run(fn: () => Promise<void>) {
    if (busy || disabled) return;
    setBusy(true); onBusy(true); setError(''); setNotice('');
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load Pinterest.'); }
    finally { setBusy(false); onBusy(false); }
  }
  async function loadBoards(more = false) {
    const d = await read(await fetch(`/api/pinterest?action=boards${more && boardBookmark ? `&bookmark=${encodeURIComponent(boardBookmark)}` : ''}`, { cache: 'no-store' }));
    setBoards(old => more ? [...old, ...d.items.filter((b:PinterestBoard) => !old.some(o => o.id === b.id))] : d.items);
    setBoardBookmark(d.bookmark);
  }
  async function loadPins(id: string, more = false) {
    const d = await read(await fetch(`/api/pinterest?action=pins&boardId=${encodeURIComponent(id)}${more && bookmark ? `&bookmark=${encodeURIComponent(bookmark)}` : ''}`, { cache: 'no-store' }));
    setPins(old => more ? [...old, ...d.items.filter((p:PinterestPhoto) => !old.some(o => o.id === p.id))] : d.items);
    setBookmark(d.bookmark);
    if (!d.items.length && !more) setNotice('No image Pins on this page. You can view the full board on Pinterest.');
  }

  if (!enabled) return <p role={error ? 'status' : undefined} className="mt-3 text-xs leading-relaxed text-ink/60">{error || 'Pinterest board viewing will appear here when the development connection is configured. You can still save a board link or upload an image you have permission to use.'}</p>;

  return <div className="mt-4 space-y-4">
    <p className="text-xs leading-relaxed text-ink/65">Connect Pinterest to view your boards and Pins here. Styled only requests read access.</p>
    {!connected ? <button disabled={disabled || busy} className={button} type="button" onClick={() => void run(async () => {
      const d = await read(await fetch('/api/pinterest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'connect', targetBoardId }) }));
      window.location.assign(d.url);
    })}>Connect Pinterest</button> : <>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled || busy} className={button} onClick={() => void run(() => loadBoards())}>Load my boards</button>
        <button type="button" disabled={disabled || busy} className="min-h-11 px-2 text-xs underline" onClick={() => void run(async () => {
          await read(await fetch('/api/pinterest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'disconnect' }) }));
          setConnected(false); setBoards([]); setPins([]); setBoardId('');
          setNotice('Pinterest is disconnected on this browser. You can also revoke Styled’s access in Pinterest settings.');
        })}>Disconnect</button>
      </div>
      {!!boards.length && <label className="block text-sm">Pinterest board<select value={boardId} disabled={disabled || busy} className="mt-2 min-h-11 w-full rounded-lg border border-sand bg-white p-2" onChange={e => {
        const id = e.target.value; setBoardId(id); setPins([]); setBookmark(null);
        if (id) void run(() => loadPins(id));
      }}><option value="">Choose a board</option>{boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
      {boardBookmark && <button type="button" className={button} disabled={disabled || busy} onClick={() => void run(() => loadBoards(true))}>More boards</button>}
      {!!pins.length && <div className="grid grid-cols-2 gap-3" aria-label="Pinterest Pins">
        {pins.map(p => <div key={p.id} className="min-w-0 rounded-lg border border-sand bg-white p-2">
          <a href={p.source} target="_blank" rel="noopener noreferrer" aria-label={`Open ${p.title} on Pinterest`}><img src={p.image} alt={p.title} referrerPolicy="no-referrer" className="aspect-square w-full rounded object-contain" loading="lazy" /></a>
          <a href={p.source} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center break-words text-xs underline">{p.title || 'View Pin on Pinterest'} ↗</a>
        </div>)}
      </div>}
      {bookmark && <button type="button" className={button} disabled={disabled || busy} onClick={() => void run(() => loadPins(boardId, true))}>More images</button>}
      {!!pins.length && <p className="rounded-lg bg-cream p-3 text-xs leading-relaxed text-ink/65">Pins are shown directly from Pinterest and are not saved to your Styled board. Direct image importing and AI use are not enabled. To add an image, upload one you own or have permission to use.</p>}
    </>}
    {busy && <p role="status" className="text-xs">Please wait…</p>}
    {notice && <p role="status" className="text-xs text-ink/70">{notice}</p>}
    {error && <p role="alert" className="text-xs text-clay">{error}</p>}
  </div>;
}
