import type { StylePreset, SampleVenue } from "./types";

// Four style presets covering the common UK looks. Names match the landing-page
// visualiser (Garden Romance, Classic Elegance, Modern Minimal, Wildflower).
// Each points at an illustrative styled-room render in /public/img/renders.
export const STYLES: StylePreset[] = [
  {
    id: "garden_romance",
    name: "Garden Romance",
    tagline: "Blush blooms, soft linen, candlelight",
    palette: ["#d9b7ad", "#efe7db", "#c9a0a0", "#8a9a82"],
    wash: "rgba(217, 183, 173, 0.24)",
    render: "/img/renders/garden_romance.jpg",
  },
  {
    id: "classic_elegance",
    name: "Classic Elegance",
    tagline: "Ivory, gold and tall arrangements",
    palette: ["#f3ecdf", "#a67c52", "#d8c7ad", "#2b2622"],
    wash: "rgba(166, 124, 82, 0.20)",
    render: "/img/renders/classic_elegance.jpg",
  },
  {
    id: "modern_minimal",
    name: "Modern Minimal",
    tagline: "Clean lines, muted tones, sculptural stems",
    palette: ["#d7d2c8", "#2b2622", "#b0a99c", "#8a9a82"],
    wash: "rgba(43, 38, 34, 0.16)",
    render: "/img/renders/modern_minimal.jpg",
  },
  {
    id: "rustic_barn",
    name: "Wildflower",
    tagline: "Loose wildflowers, warm wood, festoon light",
    palette: ["#8a9a82", "#b98a6a", "#efe7db", "#6b4f3a"],
    wash: "rgba(138, 154, 130, 0.22)",
    render: "/img/renders/rustic_barn.jpg",
  },
];

export function getStyle(id: string): StylePreset {
  return STYLES.find((s) => s.id === id) ?? STYLES[0];
}

// Sample venues so a couple can try the loop without uploading a photo.
// `tour: true` marks venues with a 3D look-around available (placeholder for now).
export const SAMPLE_VENUES: SampleVenue[] = [
  {
    id: "manor_orangery",
    name: "Hedingham Manor Orangery",
    area: "Halstead, Essex",
    kind: "Orangery",
    gradient: "linear-gradient(135deg, #7d8a74 0%, #a9b39c 50%, #e7e3d6 100%)",
    image: "/img/venues/manor_orangery.png",
    tour: true,
  },
  {
    id: "oak_barn",
    name: "The Oak Barn",
    area: "Great Dunmow, Essex",
    kind: "Dry-hire barn",
    gradient: "linear-gradient(135deg, #6b4f3a 0%, #8a6f52 45%, #c9a878 100%)",
    image: "/img/venues/oak_barn.png",
    tour: true,
  },
  {
    id: "county_hall",
    name: "Hertford County Hall",
    area: "Hertford, Herts",
    kind: "Historic hall",
    gradient: "linear-gradient(135deg, #3a3330 0%, #6c5f52 50%, #b7a488 100%)",
    image: "/img/venues/county_hall.jpg",
    tour: false,
  },
];

export function getVenue(id: string): SampleVenue {
  return SAMPLE_VENUES.find((v) => v.id === id) ?? SAMPLE_VENUES[0];
}
