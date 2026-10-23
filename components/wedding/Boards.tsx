"use client";
import { useRef, useState } from "react";
import type { CatalogueItem } from "@/lib/types";
import type { WeddingBoard, BoardPin } from "@/lib/wedding";
import type { SavedLook } from "@/components/design/SavedLooks";
import { useCatalogue } from "@/components/catalogue/CatalogueProvider";
import { uploadVenuePhoto } from "@/lib/upload-venue-photo";
import { formatGBP } from "@/lib/quote";
function LookImage({ id }: { id: string }) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState(false);
  return (
    <div className="aspect-[4/3] bg-sand">
      {url ? (
        <img
          src={url}
          alt="Your saved AI look"
          className="h-full w-full object-cover"
        />
      ) : (
        <button
          type="button"
          disabled={error}
          className="h-full w-full p-5 text-sm"
          onClick={async () => {
            try {
              const r = await fetch(`/api/renders/${id}`);
              const d = await r.json();
              if (!r.ok || !d.imageUrl) throw Error();
              setUrl(d.imageUrl);
            } catch {
              setError(true);
            }
          }}
        >
          {error ? "Look no longer available" : "View saved look"}
        </button>
      )}
    </div>
  );
}
export default function Boards({
  boards,
  onSave,
  busy,
  loaded,
  photos,
  onPhoto,
  savedIds,
  looks,
  onAdd,
}: {
  boards: WeddingBoard[];
  onSave: (next: WeddingBoard[]) => Promise<boolean>;
  busy: boolean;
  loaded: boolean;
  photos: Record<string, string>;
  onPhoto: (id: string, url: string) => void;
  savedIds: string[];
  looks: SavedLook[];
  onAdd: (item: CatalogueItem) => void;
}) {
  const { items, getItem } = useCatalogue();
  const [selected, setSelected] = useState(""),
    [name, setName] = useState(""),
    [note, setNote] = useState(""),
    [product, setProduct] = useState(""),
    [look, setLook] = useState(""),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const board = boards.find((b) => b.id === selected) || boards[0],
    disabled = busy || uploading || !loaded;
  const field =
    "mt-2 w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-2.5 text-sm";
  async function update(pins: BoardPin[]) {
    if (!board) return false;
    return onSave(boards.map((b) => (b.id === board.id ? { ...b, pins } : b)));
  }
  async function pin(
    kind: BoardPin["kind"],
    ref: string | undefined,
    text = "",
  ) {
    if (!board) return;
    setError("");
    if (
      await update([
        ...board.pins,
        { id: crypto.randomUUID(), kind, ref, text },
      ])
    ) {
      setNote("");
      setProduct("");
      setLook("");
    }
  }
  async function upload(f?: File) {
    if (!f || !board) return;
    setUploading(true);
    setError("");
    try {
      const photo = await uploadVenuePhoto(f);
      onPhoto(photo.id, photo.url);
      await pin("photo", photo.id, f.name.slice(0, 100));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not upload your inspiration.",
      );
    } finally {
      setUploading(false);
    }
  }
  return (
    <section className="rounded-2xl border border-sand bg-white p-5 sm:p-8">
      <p className="text-xs uppercase tracking-widest text-clay">
        Collect what feels like you
      </p>
      <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Wedding boards</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">
        Bring together real catalogue pieces, private inspiration and saved
        looks. Your boards stay private, and saving here does not reserve stock.
      </p>
      <form
        className="mt-7 flex flex-wrap items-end gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const b = { id: crypto.randomUUID(), name: name.trim(), pins: [] };
          if (await onSave([...boards, b])) {
            setSelected(b.id);
            setName("");
          }
        }}
      >
        <label className="min-w-0 flex-1 text-sm">
          New board name
          <input
            maxLength={80}
            placeholder="e.g. Ceremony, reception or colour ideas"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={field}
          />
        </label>
        <button
          disabled={disabled || boards.length >= 20}
          className="rounded-full bg-ink px-5 py-3 text-sm text-cream disabled:opacity-50"
        >
          Create board
        </button>
      </form>
      <div className="my-6 flex flex-wrap gap-2">
        {boards.map((b) => (
          <button
            type="button"
            key={b.id}
            onClick={() => setSelected(b.id)}
            aria-pressed={board?.id === b.id}
            className={`rounded-full border px-4 py-2 text-sm ${board?.id === b.id ? "border-ink bg-ink text-cream" : "border-sand"}`}
          >
            {b.name} ({b.pins.length})
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mb-4 text-sm text-clay">
          {error}
        </p>
      )}
      {!board ? (
        <p className="rounded-xl bg-cream p-6 text-sm text-ink/60">
          Create your first board to start collecting ideas.
        </p>
      ) : (
        <>
          <div className="grid gap-5 border-y border-sand py-6 sm:grid-cols-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (product) void pin("product", product);
              }}
            >
              <label className="text-sm">
                Add a catalogue piece
                <select
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  required
                  className={field}
                >
                  <option value="">Choose a piece</option>
                  {[...items]
                    .sort(
                      (a, b) =>
                        Number(savedIds.includes(b.id)) -
                        Number(savedIds.includes(a.id)),
                    )
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {savedIds.includes(i.id) ? "♥ " : ""}
                        {i.name}
                      </option>
                    ))}
                </select>
              </label>
              <button
                disabled={disabled}
                className="mt-3 rounded-full border border-sand px-4 py-2 text-sm disabled:opacity-50"
              >
                Save piece to board
              </button>
            </form>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (note.trim()) void pin("note", undefined, note.trim());
              }}
            >
              <label className="text-sm">
                A note for this board
                <textarea
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  required
                  placeholder="Colours, flowers or ideas to remember"
                  rows={2}
                  className={field}
                />
              </label>
              <button
                disabled={disabled}
                className="mt-3 rounded-full border border-sand px-4 py-2 text-sm disabled:opacity-50"
              >
                Add note
              </button>
            </form>
            <div>
              <p className="text-sm">Your inspiration images</p>
              <p className="mt-2 text-xs text-ink/50">
                Upload images you have permission to use. Inspiration is not a
                purchasable product.
              </p>
              <button
                type="button"
                disabled={disabled}
                onClick={() => file.current?.click()}
                className="mt-3 rounded-full border border-sand px-4 py-2 text-sm disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload inspiration"}
              </button>
              <input
                ref={file}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                className="hidden"
                onChange={(e) => {
                  void upload(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (look) void pin("look", look);
              }}
            >
              <label className="text-sm">
                Add a saved AI look
                <select
                  value={look}
                  onChange={(e) => setLook(e.target.value)}
                  required
                  className={field}
                >
                  <option value="">
                    {looks.length
                      ? "Choose a saved look"
                      : "Save a look in the visualiser first"}
                  </option>
                  {looks.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.styleName}
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={disabled || !looks.length}
                className="mt-3 rounded-full border border-sand px-4 py-2 text-sm disabled:opacity-50"
              >
                Add look to board
              </button>
            </form>
          </div>
          <h2 className="mt-7 font-serif text-3xl">{board.name}</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {board.pins.map((p) => {
              const item = p.kind === "product" ? getItem(p.ref || "") : null;
              return (
                <article
                  key={p.id}
                  className="overflow-hidden rounded-xl border border-sand"
                >
                  {item?.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  )}
                  {p.kind === "photo" &&
                    (photos[p.ref || ""] ? (
                      <img
                        src={photos[p.ref!]}
                        alt={p.text || "Private inspiration"}
                        className="aspect-[4/3] w-full object-cover"
                      />
                    ) : (
                      <p className="p-5 text-sm">
                        This inspiration image is no longer available.
                      </p>
                    ))}
                  {p.kind === "look" && <LookImage id={p.ref!} />}
                  <div className="p-4">
                    <p className="text-[10px] uppercase tracking-widest text-clay">
                      {p.kind === "product"
                        ? "Catalogue piece"
                        : p.kind === "look"
                          ? "Illustrative AI look"
                          : p.kind === "photo"
                            ? "Inspiration only"
                            : "Your note"}
                    </p>
                    <p className="mt-2 font-serif text-xl">
                      {item?.name ||
                        (p.kind === "note"
                          ? p.text
                          : p.kind === "product"
                            ? "Piece no longer listed"
                            : p.kind === "photo"
                              ? p.text
                              : "Saved wedding look")}
                    </p>
                    {item && (
                      <>
                        <p className="mt-2 text-sm">
                          {formatGBP(item.unitPrice)} {item.unit}
                        </p>
                        <button
                          type="button"
                          onClick={() => onAdd(item)}
                          className="mt-3 rounded-full bg-ink px-4 py-2 text-sm text-cream"
                        >
                          Add to basket
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        void update(board.pins.filter((v) => v.id !== p.id))
                      }
                      className="mt-3 block text-xs underline disabled:opacity-50"
                    >
                      Remove from board
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {!board.pins.length && (
            <p className="mt-5 rounded-xl bg-cream p-6 text-sm text-ink/60">
              Your first piece or idea will appear here.
            </p>
          )}
        </>
      )}
    </section>
  );
}
