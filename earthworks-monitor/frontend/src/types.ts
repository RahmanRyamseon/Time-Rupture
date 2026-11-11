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
