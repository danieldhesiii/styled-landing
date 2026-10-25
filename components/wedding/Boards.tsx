"use client";
import { useRef, useState } from "react";
import type { CatalogueItem } from "@/lib/types";
import type { WeddingBoard, BoardPin } from "@/lib/wedding";
import type { SavedLook } from "@/components/design/SavedLooks";
import { useCatalogue } from "@/components/catalogue/CatalogueProvider";
import { uploadVenuePhoto } from "@/lib/upload-venue-photo";
import { formatGBP } from "@/lib/quote";
import PinterestPreview from "./PinterestPreview";
import BoardImports from "./BoardImports";
import BoardCataloguePicker from "./BoardCataloguePicker";
import ProductDetails from "@/components/design/ProductDetails";
import ProductPurchase from "@/components/design/ProductPurchase";
import type { ShopAvailability } from "@/components/availability/useAvailability";
import type { BasketLine } from "@/lib/types";
import { imageDisclosure } from "@/lib/shopping";
import { pinterestLink } from "@/lib/board-inspiration";
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
  availability,
  basket = [],
  onQty,
  onRemove,
  onChangeDates,
  onAlternatives,
  embedded = false,
  boards,
  onSave,
  busy,
  loaded,
  photos,
  onPhoto,
  savedIds,
  looks,
  onAdd,
  onOpenSaved,
  onOpenLooks,
  onUseBoard,
  onSaveItem,
  onOpenLook,
  savedError,
  savingItems,
}: {
  availability?: ShopAvailability;
  basket?: BasketLine[];
  onQty?: (id: string, quantity: number) => void;
  onRemove?: (id: string) => void;
  onChangeDates?: () => void;
  onAlternatives?: () => void;
  savedError?: string;
  savingItems: Set<string>;
  onOpenSaved: () => void;
  onOpenLooks: () => void;
  onUseBoard: (board: WeddingBoard) => void;
  onSaveItem: (id: string) => void;
  onOpenLook: (id: string) => Promise<void>;
  embedded?: boolean;
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
  const {
    items,
    getItem,
    loading: catalogueLoading,
    error: catalogueError,
  } = useCatalogue();
  const [selected, setSelected] = useState(""),
    [name, setName] = useState(""),
    [note, setNote] = useState(""),
    [detailId, setDetailId] = useState<string | null>(null),
    [look, setLook] = useState(""),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  const [pinterest, setPinterest] = useState<{ boardId: string; url: string } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const board = boards.find((b) => b.id === selected) || boards[0],
    disabled = busy || uploading || !loaded;
  const field =
    "mt-2 w-full min-w-0 rounded-xl border border-sand bg-white px-3 py-2.5 text-sm";
  async function update(pins: BoardPin[]) {
    if (!board) return false;
    try {
      const saved = await onSave(
        boards.map((b) => (b.id === board.id ? { ...b, pins } : b)),
      );
      if (!saved) setError("Could not save your board. Please try again.");
      return saved;
    } catch {
      setError("Could not save your board. Please try again.");
      return false;
    }
  }
  async function pin(
    kind: BoardPin["kind"],
    ref: string | undefined,
    text = "",
  ) {
    if (!board) throw Error("Choose a board first.");
    if (
      kind !== "note" &&
      board.pins.some((pin) => pin.kind === kind && pin.ref === ref)
    )
      return true;
    if (kind === "note" && text.startsWith("Pinterest: ") && board.pins.some(p => p.kind === "note" && p.text === text)) return true;
    setError("");
    if (board.pins.length >= 100) {
      setError("This board has 100 ideas. Remove one or create another board.");
      return false;
    }
    if (
      await update([
        ...board.pins,
        { id: crypto.randomUUID(), kind, ref, text },
      ])
    ) {
      setNote("");
      setLook("");
    } else {
      setError("Could not save your board. Please try again.");
      return false;
    }
    return true;
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
  if (!loaded)
    return (
      <section
        aria-label="Wedding boards"
        className="rounded-2xl border border-sand bg-white p-5 sm:p-8"
      >
        <h1 className="font-serif text-4xl">Boards</h1>
        <p role="status" className="mt-5 text-sm">
          Loading your saved boards before you edit…
        </p>
      </section>
    );
  return (
    <section
      aria-label="Wedding boards"
      className="rounded-2xl border border-sand bg-white p-5 sm:p-8"
    >
      {!embedded && (
        <>
          <p className="text-xs uppercase tracking-widest text-clay">
            Collect what feels like you
          </p>
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Boards</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink/60">
            Private ideas for your ceremony, reception and style. Saving ideas
            does not reserve stock.
          </p>
        </>
      )}
      {savedError && (
        <p role="alert" className="mt-4 text-sm text-clay">
          {savedError}
        </p>
      )}
      <nav
        aria-label="Board shortcuts"
        className="my-5 flex flex-wrap gap-3 text-sm"
      >
        <button
          type="button"
          onClick={onOpenSaved}
          className="min-h-10 rounded-full border border-sand px-4"
        >
          ♡ Saved items →
        </button>
        <button
          type="button"
          onClick={onOpenLooks}
          className="min-h-10 rounded-full border border-sand px-4"
        >
          ▧ Saved looks →
        </button>
      </nav>
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
      <details open={!boards.length} className="mb-5">
        <summary className="w-fit cursor-pointer rounded-full border border-sand px-4 py-2 text-sm">
          New board
        </summary>
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
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
      </details>
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
      <div className="mb-5 border-y border-sand py-5">
        <BoardImports
          disabled={disabled || !board}
          onUpload={() => file.current?.click()}
          onPreview={url => { if (board) setPinterest({ boardId: board.id, url }); }}
          onLink={async (url) => {
            if (!(await pin("note", undefined, `Pinterest: ${url}`)))
              throw Error("Could not save link");
            if (board) setPinterest({ boardId: board.id, url });
          }}
        />
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
          <div className={pinterest?.boardId === board.id ? "grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" : "min-w-0"}>
          <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-3xl">{board.name}</h2>
            <p className="text-xs text-ink/60">
              {board.pins.length} {board.pins.length === 1 ? "idea" : "ideas"}{" "}
              saved
            </p>
          </div>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={
                disabled ||
                !board.pins.some(
                  (p) => p.kind !== "look" && !p.text.startsWith("Pinterest: "),
                )
              }
              onClick={() => onUseBoard(board)}
              className="min-h-11 rounded-full bg-ink px-5 py-3 text-sm text-cream disabled:opacity-50"
            >
              Use board in visualiser →
            </button>
            <p className="max-w-xl text-xs leading-relaxed text-ink/60">
              Prepare these ideas for a new look. Nothing generates until you
              choose Generate.
            </p>
          </div>
          <details className="border-y border-sand py-4">
            <summary className="w-fit cursor-pointer rounded-full bg-ink px-5 py-2.5 text-sm text-cream">
              Add to board
            </summary>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <BoardCataloguePicker
                key={board.id}
                items={items}
                savedIds={savedIds}
                pinnedIds={board.pins
                  .filter((p) => p.kind === "product" && p.ref)
                  .map((p) => p.ref!)}
                disabled={disabled || catalogueLoading || !!catalogueError}
                onPick={(id) => pin("product", id)}
              />
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
          </details>
          {!board.pins.length && (
            <p className="py-8 text-sm text-ink/60">
              Your board is ready. Use Add to board to collect your first idea.
            </p>
          )}
          <div className={`mt-5 grid min-w-0 gap-5 sm:grid-cols-2 ${pinterest?.boardId === board.id ? "" : "lg:grid-cols-3"}`}>
            {board.pins.map((p) => {
              const sourceLink =
                p.kind === "note" && p.text.startsWith("Pinterest: ")
                  ? pinterestLink(p.text.slice(11))
                  : null;
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
                          ? sourceLink
                            ? "Pinterest board or Pin"
                            : p.text
                          : p.kind === "product"
                            ? catalogueLoading
                              ? "Loading catalogue piece…"
                              : catalogueError
                                ? "Catalogue temporarily unavailable"
                                : "Piece no longer listed"
                            : p.kind === "photo"
                              ? p.text
                              : "Saved wedding look")}
                    </p>
                    {sourceLink && <div className="mt-3 space-y-2">
                      <button type="button" onClick={() => setPinterest({ boardId: board.id, url: sourceLink })}
                        className="min-h-11 rounded-full border border-sand px-4 py-2 text-sm">View beside my board</button>
                      <a href={sourceLink} target="_blank" rel="noopener noreferrer" className="block py-2 text-sm underline">Open on Pinterest ↗</a>
                    </div>}
                    {p.kind === "look" && (
                      <button
                        type="button"
                        onClick={() => {
                          setError("");
                          void onOpenLook(p.ref!).catch((e) =>
                            setError(e.message),
                          );
                        }}
                        className="mt-3 rounded-full border border-sand px-4 py-2 text-sm"
                      >
                        Open in visualiser →
                      </button>
                    )}
                    {item && (
                      <>
                        <p className="mt-2 text-xs text-ink/60">
                          {imageDisclosure(item)}
                        </p>
                        <p className="mt-2 text-sm">
                          {formatGBP(item.unitPrice)} {item.unit}
                        </p>
                        <button
                          type="button"
                          onClick={() => setDetailId(item.id)}
                          className="min-h-11 text-xs underline"
                        >
                          View details and terms
                        </button>
                        <button
                          type="button"
                          disabled={
                            disabled ||
                            catalogueLoading ||
                            !!catalogueError ||
                            savedIds.includes(item.id) ||
                            savingItems.has(item.id)
                          }
                          onClick={() => onSaveItem(item.id)}
                          className="mt-3 mr-2 rounded-full border border-sand px-4 py-2 text-sm disabled:opacity-60"
                        >
                          {savedIds.includes(item.id)
                            ? "Saved to items ✓"
                            : "Save to items"}
                        </button>
                        <ProductPurchase
                          item={item}
                          line={basket.find((line) => line.itemId === item.id)}
                          availability={availability?.items?.[item.id]}
                          onAdd={onAdd}
                          onQty={onQty}
                          onRemove={onRemove}
                          onChangeDates={onChangeDates}
                          onAlternatives={onAlternatives}
                        />
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
          </div>
          {pinterest?.boardId === board.id && <PinterestPreview url={pinterest.url} boardName={board.name}
            disabled={disabled} onClose={() => setPinterest(null)} onUpload={() => file.current?.click()} />}
          </div>
        </>
      )}
      {detailId && getItem(detailId) && (
        <ProductDetails
          item={getItem(detailId)!}
          line={basket.find((line) => line.itemId === detailId)}
          availability={availability?.items?.[detailId]}
          onAdd={onAdd}
          onQty={onQty}
          onRemove={onRemove}
          onClose={() => setDetailId(null)}
          onChangeDates={
            onChangeDates
              ? () => {
                  setDetailId(null);
                  onChangeDates();
                }
              : undefined
          }
          onAlternatives={
            onAlternatives
              ? () => {
                  setDetailId(null);
                  onAlternatives();
                }
              : undefined
          }
        />
      )}
    </section>
  );
}
