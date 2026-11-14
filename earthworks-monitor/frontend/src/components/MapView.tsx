import type { Feature, FeatureCollection, Polygon, Position } from "geojson";
import maplibregl, { GeoJSONSource, LngLatBoundsLike, Map as MlMap, StyleSpecification } from "maplibre-gl";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DRAFT_COLOR, SITE_COLOR, ZONE_COLORS } from "../mapColors";
import type { AppConfig, Outline, Site } from "../types";

export type BBox = [number, number, number, number];

export interface RasterLayer {
  /** Changes whenever the tiles change, so the layer is rebuilt. */
  key: string;
  url: string;
  bounds: BBox;
  maxzoom: number;
  opacity: number;
}

interface Props {
  config: AppConfig;
  sites: Site[];
  /** Outlines not saved yet (drawn or parsed from an upload). */
  preview: Outline[];
  /** The map fits these bounds whenever the object identity changes. */
  focus: BBox | null;
  drawing?: boolean;
  onDrawn?: (polygon: Polygon) => void;
  /** Raster overlays, bottom first; drawn beneath the outlines. */
  rasters?: RasterLayer[];
  legendExtra?: ReactNode;
}

const NO_RASTERS: RasterLayer[] = [];

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

function baseStyle(config: AppConfig): StyleSpecification {
  const style: StyleSpecification = {
    version: 8,
    sources: {},
    layers: [{ id: "background", type: "background", paint: { "background-color": "#ece7dc" } }],
  };
  if (config.basemap_tile_url) {
    style.sources.basemap = {
      type: "raster",
      tiles: [config.basemap_tile_url],
      tileSize: 256,
      attribution: config.basemap_attribution,
    };
    style.layers.push({ id: "basemap", type: "raster", source: "basemap" });
  }
  return style;
}

function addOverlayLayers(map: MlMap) {
  for (const id of ["sites", "zones", "preview", "draft"]) {
    map.addSource(id, { type: "geojson", data: EMPTY });
  }
  const zoneColor: maplibregl.ExpressionSpecification = [
    "match",
    ["get", "zone_type"],
    "cut",
    ZONE_COLORS.cut,
    "fill",
    ZONE_COLORS.fill,
    ZONE_COLORS.mixed,
  ];
  map.addLayer({ id: "sites-fill", type: "fill", source: "sites", paint: { "fill-color": SITE_COLOR, "fill-opacity": 0.05 } });
  map.addLayer({ id: "zones-fill", type: "fill", source: "zones", paint: { "fill-color": zoneColor, "fill-opacity": 0.25 } });
  map.addLayer({ id: "zones-line", type: "line", source: "zones", paint: { "line-color": zoneColor, "line-width": 2 } });
  map.addLayer({ id: "sites-line", type: "line", source: "sites", paint: { "line-color": SITE_COLOR, "line-width": 2.5 } });
  map.addLayer({ id: "preview-fill", type: "fill", source: "preview", paint: { "fill-color": DRAFT_COLOR, "fill-opacity": 0.25 } });
  map.addLayer({ id: "preview-line", type: "line", source: "preview", paint: { "line-color": DRAFT_COLOR, "line-width": 2.5 } });
  map.addLayer({ id: "draft-line", type: "line", source: "draft", paint: { "line-color": DRAFT_COLOR, "line-width": 2, "line-dasharray": [2, 1] } });
  map.addLayer({
    id: "draft-points",
    type: "circle",
    source: "draft",
    filter: ["==", ["geometry-type"], "Point"],
    paint: { "circle-radius": 5, "circle-color": "#fff", "circle-stroke-color": DRAFT_COLOR, "circle-stroke-width": 2 },
  });
}

function setData(map: MlMap, source: string, features: Feature[]) {
  (map.getSource(source) as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
}

export default function MapView({
  config,
  sites,
  preview,
  focus,
  drawing = false,
  onDrawn,
  rasters = NO_RASTERS,
  legendExtra,
}: Props) {
  const { t } = useTranslation();
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [points, setPointsState] = useState<Position[]>([]);
  const pointsRef = useRef<Position[]>([]);
  const setPoints = (next: Position[]) => {
    pointsRef.current = next;
    setPointsState(next);
  };
  const onDrawnRef = useRef(onDrawn);
  onDrawnRef.current = onDrawn;

  useEffect(() => {
    const map = new maplibregl.Map({
      container: container.current!,
      style: baseStyle(config),
      center: [50, 24],
      zoom: 4,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }));
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }));
    map.on("load", () => {
      addOverlayLayers(map);
      mapRef.current = map;
      setReady(true);
    });
    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, [config]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    setData(
      map,
      "sites",
      sites.map((s) => ({ type: "Feature", properties: { id: s.id }, geometry: s.geometry })),
    );
    setData(
      map,
      "zones",
      sites.flatMap((s) =>
        s.zones.map((z) => ({
          type: "Feature" as const,
          properties: { id: z.id, zone_type: z.zone_type },
          geometry: z.geometry,
        })),
      ),
    );
  }, [ready, sites]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    setData(
      map,
      "preview",
      preview.map((geometry) => ({ type: "Feature", properties: {}, geometry })),
    );
  }, [ready, preview]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !focus) return;
    const bounds: LngLatBoundsLike = [
      [focus[0], focus[1]],
      [focus[2], focus[3]],
    ];
    map.fitBounds(bounds, { padding: 60, maxZoom: 17, duration: 400 });
  }, [ready, focus]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const wanted = new Map(rasters.map((r) => [`raster-${r.key}`, r]));
    for (const layer of map.getStyle().layers) {
      if (layer.id.startsWith("raster-") && !wanted.has(layer.id)) {
        map.removeLayer(layer.id);
        map.removeSource(layer.id);
      }
    }
    for (const [id, raster] of wanted) {
      if (!map.getSource(id)) {
        map.addSource(id, {
          type: "raster",
          tiles: [raster.url],
          tileSize: 256,
          bounds: raster.bounds,
          maxzoom: raster.maxzoom,
        });
        map.addLayer({ id, type: "raster", source: id, paint: { "raster-fade-duration": 0 } });
      }
      map.setPaintProperty(id, "raster-opacity", raster.opacity);
      map.moveLayer(id, "sites-fill"); // keeps the given order, below the outlines
    }
    // Zone tints would distort the cut/fill colours, so only outlines stay on top.
    map.setPaintProperty("zones-fill", "fill-opacity", rasters.length ? 0 : 0.25);
    map.setPaintProperty("sites-fill", "fill-opacity", rasters.length ? 0 : 0.05);
  }, [ready, rasters]);

  // --- polygon drawing ---
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || !drawing) return;
    setPoints([]);
    map.getCanvas().style.cursor = "crosshair";
    map.doubleClickZoom.disable();
    const onClick = (e: maplibregl.MapMouseEvent) =>
      setPoints([...pointsRef.current, [e.lngLat.lng, e.lngLat.lat]]);
    // A double-click also fires two clicks; drop the duplicate corner it adds.
    const onDoubleClick = () => finish(pointsRef.current.slice(0, -1));
    map.on("click", onClick);
    map.on("dblclick", onDoubleClick);
    return () => {
      map.off("click", onClick);
      map.off("dblclick", onDoubleClick);
      map.getCanvas().style.cursor = "";
      map.doubleClickZoom.enable();
      setPoints([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, drawing]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const features: Feature[] = points.map((p) => ({
      type: "Feature",
      properties: {},
      geometry: { type: "Point", coordinates: p },
    }));
    if (points.length >= 2) {
      const ring = points.length >= 3 ? [...points, points[0]] : points;
      features.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: ring } });
    }
    setData(map, "draft", features);
  }, [ready, points]);

  function finish(current: Position[]) {
    if (current.length < 3) return;
    setPoints([]);
    onDrawnRef.current?.({ type: "Polygon", coordinates: [[...current, current[0]]] });
  }

  return (
    <div className="map-wrap">
      <div ref={container} className="map" />
      {drawing && (
        <div className="map-toolbar">
          <span>{t("geometry.drawHelp")}</span>
          <button onClick={() => setPoints(points.slice(0, -1))} disabled={points.length === 0}>
            {t("geometry.undo")}
          </button>
          <button className="primary" onClick={() => finish(points)} disabled={points.length < 3}>
            {t("geometry.finish")}
          </button>
        </div>
      )}
      <ul className="legend">
        <li>
          <i style={{ borderColor: SITE_COLOR }} /> {t("legend.site")}
        </li>
        {(["cut", "fill", "mixed"] as const).map((type) => (
          <li key={type}>
            <i style={{ borderColor: ZONE_COLORS[type], background: `${ZONE_COLORS[type]}40` }} />{" "}
            {t(`legend.${type}`)}
          </li>
        ))}
        {legendExtra}
      </ul>
    </div>
  );
}
