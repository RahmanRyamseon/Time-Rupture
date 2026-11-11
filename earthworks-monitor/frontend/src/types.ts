import type { MultiPolygon, Polygon } from "geojson";

export type Role = "analyst" | "viewer";
export type ZoneType = "cut" | "fill" | "mixed";
export type Outline = Polygon | MultiPolygon;

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
}

export interface AppConfig {
  app_name: string;
  basemap_tile_url: string;
  basemap_attribution: string;
  max_upload_mb: number;
  max_dem_upload_mb: number;
}

export interface Project {
  id: string;
  name: string;
  client_name: string;
  description: string;
  site_count: number;
}

export interface Zone {
  id: string;
  site_id: string;
  name: string;
  zone_type: ZoneType;
  description: string;
  geometry: MultiPolygon;
  area_m2: number;
}

export interface Site {
  id: string;
  project_id: string;
  name: string;
  description: string;
  geometry: MultiPolygon;
  area_m2: number;
  bbox: [number, number, number, number];
  zones: Zone[];
}

export interface ParsedFeature {
  name: string | null;
  geometry: MultiPolygon;
  area_m2: number;
}

export interface ParsedFile {
  features: ParsedFeature[];
  union: ParsedFeature;
}

export type SurfaceKind = "survey" | "design";
export type ProcessingStatus = "processing" | "ready" | "failed";
export type VerticalDatum = "ellipsoidal_wgs84" | "egm2008" | "egm96" | "local";

export interface Alignment {
  method: "reference" | "none" | "vertical_shift_median_stable_ground";
  offset_m?: number;
  residual_rmse_m?: number;
  stable_area_m2?: number;
}

export interface Surface {
  id: string;
  site_id: string;
  kind: SurfaceKind;
  name: string;
  survey_date: string | null;
  vertical_datum: VerticalDatum;
  stated_accuracy_m: number | null;
  status: ProcessingStatus;
  released: boolean;
  is_reference: boolean;
  resolution_m: number | null;
  bounds_wgs84: [number, number, number, number] | null;
  stats: { site_coverage: number } | null;
  vertical_offset_m: number;
  alignment: Alignment | null;
  error: string | null;
}

export interface Volume {
  cut_m3: number;
  fill_m3: number;
  net_m3: number;
  cut_pm_m3: number;
  fill_pm_m3: number;
  net_pm_m3: number;
  below_lod_area_m2: number;
  region_area_m2: number;
  data_coverage: number;
}

export interface ZoneVolume extends Volume {
  zone_id: string;
  name: string;
  zone_type: ZoneType;
}

export interface AnalysisResults {
  site: Volume;
  zones: ZoneVolume[];
  lod_m: number;
  uncertainty: {
    sigma_pixel_m: number;
    sigma_systematic_m: number;
    confidence_z: number;
    source: "stable_ground" | "stated_accuracy" | "alignment_residual";
  };
  resolution_m: number;
  display_range_m: number;
  bounds_wgs84: [number, number, number, number];
}

export interface Analysis {
  id: string;
  from_surface_id: string;
  to_surface_id: string;
  status: ProcessingStatus;
  stale: boolean;
  results: AnalysisResults | null;
  error: string | null;
  computed_at: string | null;
}

export interface ZoneProgress {
  zone_id: string;
  progress: number | null;
  progress_pm: number | null;
}

export interface Progress {
  available: boolean;
  epochs: { surface_id: string; zones: ZoneProgress[] }[];
}

export interface Job {
  id: string;
  kind: string;
  surface_id: string | null;
  analysis_id: string | null;
  status: "queued" | "running" | "failed" | "done";
  created_at: string;
}
