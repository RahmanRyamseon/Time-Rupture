import type { ZoneType } from "./types";

// Blue = cut, red = fill throughout the product (zones now, cut/fill rasters in Phase 2).
export const SITE_COLOR = "#1f2933";
export const ZONE_COLORS: Record<ZoneType, string> = {
  cut: "#2166ac",
  fill: "#b2182b",
  mixed: "#7b3294",
};
export const DRAFT_COLOR = "#e08a00";
