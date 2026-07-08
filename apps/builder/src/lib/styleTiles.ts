import type { StyleTileId } from "./types";

export interface StyleTileOption {
  id: StyleTileId;
  label: string;
  description: string;
  swatch: [string, string, string];
}

export const STYLE_TILES: StyleTileOption[] = [
  {
    id: "clean-minimal",
    label: "Clean and minimal",
    description: "White backgrounds, subtle greys, one accent color. Simple and professional.",
    swatch: ["#FFFFFF", "#E4E4E1", "#1C1A18"],
  },
  {
    id: "bold-vibrant",
    label: "Bold and vibrant",
    description: "Strong colors, high contrast, energetic and eye-catching.",
    swatch: ["#FF3B5C", "#FFC700", "#0057FF"],
  },
  {
    id: "soft-feminine",
    label: "Soft and feminine",
    description: "Pastels, rounded corners, warm and approachable.",
    swatch: ["#FFB8EA", "#F5F0E8", "#D47DBC"],
  },
  {
    id: "dark-sleek",
    label: "Dark and sleek",
    description: "Dark backgrounds, neon or metallic accents. Premium and modern.",
    swatch: ["#111111", "#39FF88", "#B8B8B8"],
  },
];

export function findStyleTile(id: StyleTileId | null): StyleTileOption | undefined {
  return STYLE_TILES.find((tile) => tile.id === id);
}
