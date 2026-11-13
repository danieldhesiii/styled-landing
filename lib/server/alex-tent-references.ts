import type { CatalogueItem } from "@/lib/types";
import type { TentColour } from "@/lib/visualiser-environment";
import { readPublicImage } from "@/lib/server/public-images";
export async function loadAlexTentReferences(
  tent: CatalogueItem,
  colour: TentColour,
) {
  const small = tent.id === "earth-village-stretch-tent-10x15";
  const primary = small
    ? `/img/items/earth-village-events/10x15/image${colour === "sand" ? 1 : 3}.jpeg`
    : "/img/items/earth-village-events/image2.jpeg";
  const paths = [primary];
  const names = paths.map(
    () =>
      `${tent.name}; ${colour} fabric option; product identity only. Reference associated with the supplier's package document; exact photographed size is unconfirmed. Ignore every background object, person, table, chair and floral arrangement.`,
  );
  const buffers = await Promise.all(paths.map(readPublicImage));
  return {
    buffers,
    names,
    source: small
      ? "10x15m Stretch Tent Wedding Package.docx"
      : "20x15m Stretch Tent Wedding Package.docx",
  };
}
