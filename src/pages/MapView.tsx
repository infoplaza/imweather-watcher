import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, ImageOverlay, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { X, Loader2, ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useThemedLogo } from "@/hooks/useThemedLogo";
import "leaflet/dist/leaflet.css";

const API_BASE = "https://api.imweather.com/v0/gridmapdata";

// ── Tile math ──────────────────────────────────────────────

function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x: Math.max(0, Math.min(n - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

function tileToLatLng(x: number, y: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
  return { lat: (latRad * 180) / Math.PI, lng };
}

// ── Legend config ──────────────────────────────────────────

type LegendDef = { label: string; unit: string; stops: { color: string; value: number }[] };

const LEGENDS: Record<string, LegendDef> = {
  temperature: {
    label: "Temperatuur",
    unit: "°C",
    stops: [
      { color: "#3b0764", value: -40 },
      { color: "#1e3a8a", value: -30 },
      { color: "#1d4ed8", value: -20 },
      { color: "#0ea5e9", value: -10 },
      { color: "#06b6d4", value: -5 },
      { color: "#10b981", value: 0 },
      { color: "#22c55e", value: 5 },
      { color: "#84cc16", value: 10 },
      { color: "#eab308", value: 15 },
      { color: "#f59e0b", value: 20 },
      { color: "#f97316", value: 25 },
      { color: "#ef4444", value: 30 },
      { color: "#dc2626", value: 35 },
      { color: "#7f1d1d", value: 40 },
    ],
  },
  precipitation: {
    label: "Neerslag",
    unit: "mm",
    stops: [
      { color: "#f0fdf4", value: 0 },
      { color: "#86efac", value: 0.5 },
      { color: "#22c55e", value: 2 },
      { color: "#15803d", value: 5 },
      { color: "#1d4ed8", value: 10 },
      { color: "#7c3aed", value: 25 },
      { color: "#dc2626", value: 50 },
    ],
  },
};

// ── Color helpers ──────────────────────────────────────────

function hexToRgb(hex: string) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function colorDistSq(r: number, g: number, b: number, c: { r: number; g: number; b: number }) {
  return (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2;
}

/** Map an RGB pixel to the closest legend value via weighted interpolation */
function pixelToValue(r: number, g: number, b: number, legend: LegendDef): number | null {
  const dists = legend.stops.map(s => colorDistSq(r, g, b, hexToRgb(s.color)));
  let i0 = 0;
  for (let i = 1; i < dists.length; i++) if (dists[i] < dists[i0]) i0 = i;

  // Find second closest neighbor (only adjacent)
  const candidates = [i0 - 1, i0 + 1].filter(i => i >= 0 && i < legend.stops.length);
  if (candidates.length === 0) return legend.stops[i0].value;

  let i1 = candidates[0];
  if (candidates.length > 1 && dists[candidates[1]] < dists[candidates[0]]) i1 = candidates[1];

  const d0 = Math.sqrt(dists[i0]);
  const d1 = Math.sqrt(dists[i1]);
  const total = d0 + d1;
  if (total === 0) return legend.stops[i0].value;

  // Weighted: closer color gets more weight
  return legend.stops[i0].value * (1 - d0 / total) + legend.stops[i1].value * (1 - d1 / total);
}

// ── Shared canvas data for pixel sampling ──────────────────

type CanvasData = { canvas: HTMLCanvasElement; bounds: L.LatLngBounds } | null;

// ── WeatherOverlay + Tooltip (combined to share canvas) ────

function WeatherLayer({ model, runDateStep, element, level, onTooltip }: {
  model: string;
  runDateStep: string;
  element: string;
  level: string;
  onTooltip: (info: { x: number; y: number; value: string; swatch: string } | null) => void;
}) {
  const map = useMap();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [bounds, setBounds] = useState<L.LatLngBounds | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prevBlobRef = useRef<string | null>(null);
  const canvasDataRef = useRef<CanvasData>(null);

  const updateOverlay = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const b = map.getBounds();
    const z = map.getZoom();
    const tl = latLngToTile(b.getNorth(), b.getWest(), z);
    const br = latLngToTile(b.getSouth(), b.getEast(), z);
    const x1 = tl.x, y1 = tl.y, x2 = br.x + 1, y2 = br.y + 1;

    const levelParam = level ? `?level=${level}` : "";
    const url = `${API_BASE}/layer/image/${model}/${runDateStep}/${element}/${z}/${x1}/${y1}/${x2}/${y2}${levelParam}`;

    const nw = tileToLatLng(x1, y1, z);
    const se = tileToLatLng(x2, y2, z);
    const imageBounds = new L.LatLngBounds([se.lat, nw.lng], [nw.lat, se.lng]);

    fetch(url, { signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.blob(); })
      .then(blob => {
        if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current);

        const img = new Image();
        img.onload = () => {
          // Keep original canvas for accurate pixel sampling (tooltip)
          const origCanvas = document.createElement("canvas");
          origCanvas.width = img.width;
          origCanvas.height = img.height;
          origCanvas.getContext("2d")?.drawImage(img, 0, 0);
          canvasDataRef.current = { canvas: origCanvas, bounds: imageBounds };

          // Create upscaled canvas with bilinear interpolation for smooth display
          const scale = 4;
          const smoothCanvas = document.createElement("canvas");
          smoothCanvas.width = img.width * scale;
          smoothCanvas.height = img.height * scale;
          const sCtx = smoothCanvas.getContext("2d");
          if (sCtx) {
            sCtx.imageSmoothingEnabled = true;
            sCtx.imageSmoothingQuality = "high";
            sCtx.drawImage(img, 0, 0, smoothCanvas.width, smoothCanvas.height);
          }

          const smoothUrl = smoothCanvas.toDataURL("image/png");
          prevBlobRef.current = smoothUrl;
          setBlobUrl(smoothUrl);
          setBounds(imageBounds);
        };
        img.src = URL.createObjectURL(blob);
      })
      .catch(err => { if (err.name !== "AbortError") console.warn("Overlay fetch failed:", err); });
  }, [map, model, runDateStep, element, level]);

  useEffect(() => {
    updateOverlay();
    return () => {
      abortRef.current?.abort();
      if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current);
    };
  }, [updateOverlay]);

  // Handle mouse for tooltip
  useMapEvents({
    moveend: updateOverlay,
    zoomend: updateOverlay,
    mousemove: (e) => {
      const cd = canvasDataRef.current;
      if (!cd) { onTooltip(null); return; }

      const { canvas, bounds: ib } = cd;
      const { latlng } = e;
      if (!ib.contains(latlng)) { onTooltip(null); return; }

      const xPct = (latlng.lng - ib.getWest()) / (ib.getEast() - ib.getWest());
      const yPct = (ib.getNorth() - latlng.lat) / (ib.getNorth() - ib.getSouth());
      const px = Math.floor(xPct * canvas.width);
      const py = Math.floor(yPct * canvas.height);
      if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) { onTooltip(null); return; }

      const ctx = canvas.getContext("2d");
      if (!ctx) { onTooltip(null); return; }
      const [r, g, b, a] = ctx.getImageData(px, py, 1, 1).data;
      if (a < 50) { onTooltip(null); return; }

      const legend = LEGENDS[element];
      if (!legend) { onTooltip(null); return; }

      const val = pixelToValue(r, g, b, legend);
      if (val === null) { onTooltip(null); return; }

      const cp = map.latLngToContainerPoint(latlng);
      onTooltip({
        x: cp.x,
        y: cp.y,
        value: `${val.toFixed(1)}${legend.unit}`,
        swatch: `rgb(${r},${g},${b})`,
      });
    },
    mouseout: () => onTooltip(null),
  });

  if (!blobUrl || !bounds) return null;
  return <ImageOverlay url={blobUrl} bounds={bounds} opacity={1} className="weather-overlay" />;
}

// ── Legend UI ──────────────────────────────────────────────

function MapLegend({ element }: { element: string }) {
  const legend = LEGENDS[element];
  if (!legend) return null;

  return (
    <div className="absolute bottom-8 right-3 z-[1000] flex flex-col items-end gap-1">
      <div className="bg-card/90 backdrop-blur-sm rounded-lg border shadow-lg px-2 py-2 flex items-stretch gap-2">
        <div
          className="w-3 rounded-sm"
          style={{
            background: `linear-gradient(to bottom, ${legend.stops.map((s, i) => `${s.color} ${(i / (legend.stops.length - 1)) * 100}%`).join(", ")})`,
            minHeight: "160px",
          }}
        />
        <div className="flex flex-col justify-between py-0.5">
          {legend.stops.map((s, i) => (
            <span key={i} className="font-mono text-[9px] leading-none text-foreground/80">
              {s.value}
            </span>
          ))}
        </div>
      </div>
      <span className="font-mono text-[9px] text-muted-foreground bg-card/90 backdrop-blur-sm rounded px-1.5 py-0.5 border">
        {legend.label} ({legend.unit})
      </span>
    </div>
  );
}

// ── Cursor tooltip ────────────────────────────────────────

function CursorTooltip({ info }: { info: { x: number; y: number; value: string; swatch: string } | null }) {
  if (!info) return null;
  return (
    <div
      className="absolute z-[1001] pointer-events-none"
      style={{ left: info.x + 12, top: info.y - 28 }}
    >
      <div className="bg-card/95 backdrop-blur-sm border rounded-md shadow-lg px-2 py-1 flex items-center gap-1.5">
        <div
          className="w-2.5 h-2.5 rounded-sm border border-foreground/20"
          style={{ backgroundColor: info.swatch }}
        />
        <span className="font-mono text-xs font-medium text-foreground">{info.value}</span>
      </div>
    </div>
  );
}

// ── Custom panes for labels and borders above overlay ─────

function CreateLabelsPane() {
  const map = useMap();
  useEffect(() => {
    if (!map.getPane("bordersPane")) {
      const pane = map.createPane("bordersPane");
      pane.style.zIndex = "620";
      pane.style.pointerEvents = "none";
    }
    if (!map.getPane("labelsPane")) {
      const pane = map.createPane("labelsPane");
      pane.style.zIndex = "650";
      pane.style.pointerEvents = "none";
    }
  }, [map]);
  return null;
}

const BORDERS_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_boundary_lines_land.geojson";
const COASTLINE_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_coastline.geojson";

function CountryBorders() {
  const map = useMap();
  const bordersRef = useRef<L.GeoJSON | null>(null);
  const coastRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    // Load land borders
    fetch(BORDERS_URL)
      .then(res => res.json())
      .then(data => {
        if (bordersRef.current) map.removeLayer(bordersRef.current);
        const layer = L.geoJSON(data, {
          pane: "bordersPane",
          style: { color: "#222", weight: 2, opacity: 0.9, fillOpacity: 0, interactive: false },
        });
        layer.addTo(map);
        bordersRef.current = layer;
      })
      .catch(err => console.warn("Failed to load borders:", err));

    // Load coastlines
    fetch(COASTLINE_URL)
      .then(res => res.json())
      .then(data => {
        if (coastRef.current) map.removeLayer(coastRef.current);
        const layer = L.geoJSON(data, {
          pane: "bordersPane",
          style: { color: "#222", weight: 1.5, opacity: 0.85, fillOpacity: 0, interactive: false },
        });
        layer.addTo(map);
        coastRef.current = layer;
      })
      .catch(err => console.warn("Failed to load coastlines:", err));

    return () => {
      if (bordersRef.current) map.removeLayer(bordersRef.current);
      if (coastRef.current) map.removeLayer(coastRef.current);
    };
  }, [map]);

  return null;
}

// ── Main page ─────────────────────────────────────────────

export default function MapView() {
  const logo = useThemedLogo();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const model = params.get("model") || "";
  const element = params.get("element") || "";
  const level = params.get("level") || "";
  const run = params.get("run") || "";
  const step = params.get("step") || "0";
  const modelName = params.get("modelName") || model;

  const runTs = Number(run);
  const stepHour = Number(step);

  const [runDateStep, setRunDateStep] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tooltipInfo, setTooltipInfo] = useState<{ x: number; y: number; value: string; swatch: string } | null>(null);

  // All available layers from the API
  const [allLayers, setAllLayers] = useState<{ timestamp: number; stepHour: number; runDateStep: string }[]>([]);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch all layers once
  useEffect(() => {
    if (!model || !run) return;
    setLoading(true);
    const levelParam = level ? `&level=${level}` : "";
    fetch(`${API_BASE}/layers/${model}/${runTs}/${element}/0/0/0/1/1?outputtype=image${levelParam}`)
      .then(res => res.json())
      .then(data => {
        if (!data.layers?.length) return;
        const layers = data.layers
          .filter((l: any) => l.url)
          .map((l: any) => {
            const parts = l.url.split("/");
            const idx = parts.indexOf("image");
            const rds = idx >= 0 ? parts[idx + 2] : null;
            return { timestamp: l.timestamp, stepHour: Math.round((l.timestamp - runTs) / 3600), runDateStep: rds };
          })
          .filter((l: any) => l.runDateStep);
        setAllLayers(layers);

        // Set initial layer
        const current = layers.find((l: any) => l.stepHour === stepHour) || layers[0];
        if (current) setRunDateStep(current.runDateStep);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [model, run, element, level, runTs]);

  const currentIndex = useMemo(() => {
    const idx = allLayers.findIndex(l => l.stepHour === stepHour);
    return idx >= 0 ? idx : 0;
  }, [allLayers, stepHour]);

  const goToIndex = useCallback((idx: number) => {
    const layer = allLayers[idx];
    if (!layer) return;
    setRunDateStep(layer.runDateStep);
    setParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("step", String(layer.stepHour));
      return next;
    }, { replace: true });
  }, [allLayers, setParams]);

  // Animation
  useEffect(() => {
    if (playing && allLayers.length > 1) {
      playRef.current = setInterval(() => {
        goToIndex(currentIndex < allLayers.length - 1 ? currentIndex + 1 : 0);
      }, 800);
    }
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [playing, currentIndex, allLayers, goToIndex]);

  const targetTs = runTs + stepHour * 3600;
  const runDate = run ? new Date(runTs * 1000) : null;
  const runDateStr = runDate
    ? `${runDate.toISOString().slice(0, 10)} ${String(runDate.getUTCHours()).padStart(2, "0")}Z`
    : "";
  const validTime = runDate ? new Date(targetTs * 1000) : null;
  const validTimeStr = validTime
    ? `${validTime.toISOString().slice(0, 10)} ${String(validTime.getUTCHours()).padStart(2, "0")}:00 UTC`
    : "";

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-card shrink-0">
        <img src={logo} alt="IMWeatherWatcher" className="h-6 w-auto rounded" />
        <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">beta</span>
        <div className="flex items-center gap-2 font-mono text-xs flex-1">
          <span className="font-semibold">{modelName}</span>
          <span className="text-muted-foreground">·</span>
          <span>{element}{level ? ` (${level})` : ""}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">Run: {runDateStr}</span>
          <span className="text-muted-foreground">·</span>
          <span>T+{step}h</span>
          <span className="text-muted-foreground">— {validTimeStr}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/50">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <MapContainer center={[52, 5]} zoom={5} className="h-full w-full" zoomControl>
          <CreateLabelsPane />
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
          />
          {runDateStep && (
            <WeatherLayer
              model={model}
              runDateStep={runDateStep}
              element={element}
              level={level}
              onTooltip={setTooltipInfo}
            />
          )}
          <CountryBorders />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            pane="labelsPane"
          />
        </MapContainer>
        <MapLegend element={element} />
        <CursorTooltip info={tooltipInfo} />
      </div>

      {/* Time step slider */}
      {allLayers.length > 1 && (
        <div className="shrink-0 border-t bg-card px-4 py-2 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => goToIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setPlaying(p => !p)}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => goToIndex(Math.min(allLayers.length - 1, currentIndex + 1))}
            disabled={currentIndex === allLayers.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Slider
            min={0}
            max={allLayers.length - 1}
            step={1}
            value={[currentIndex]}
            onValueChange={([v]) => { setPlaying(false); goToIndex(v); }}
            className="flex-1"
          />
          <span className="font-mono text-xs text-muted-foreground whitespace-nowrap min-w-[60px] text-right">
            T+{allLayers[currentIndex]?.stepHour ?? 0}h
          </span>
        </div>
      )}
    </div>
  );
}
