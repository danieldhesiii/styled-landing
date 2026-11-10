"use client";
import Link from "next/link";
import type { CatalogueItem } from "@/lib/types";
import { previewStudioHref } from "@/lib/product-preview-navigation";

export interface ProductPreviewSelectionProps {
  selectedVisualiserIds?: string[];
  onVisualise?: (item: CatalogueItem) => void;
}

/** Preview selection is controlled by the active event, never by basket stock. */
export default function ProductPreviewSelection({
  item,
  selectedVisualiserIds = [],
  onVisualise,
  disabled = false,
  studioHref,
}: ProductPreviewSelectionProps & {
  item: CatalogueItem;
  disabled?: boolean;
  studioHref?: string;
}) {
  const selected = selectedVisualiserIds.includes(item.id);
  const classes = `inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50 ${selected ? "border-sage bg-sage/10 text-ink" : "border-ink/40 hover:bg-sand/30"}`;
  if (!onVisualise) {
    return <Link href={previewStudioHref(item.id, studioHref)} className={classes}>Select for preview in studio</Link>;
  }
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={selected ? `Remove ${item.name} from preview` : `Select ${item.name} for preview`}
      disabled={disabled}
      onClick={() => onVisualise(item)}
      className={classes}
    >
      {selected && <span aria-hidden="true">✓</span>}
      {selected ? "Selected" : "Select for preview"}
    </button>
  );
}
