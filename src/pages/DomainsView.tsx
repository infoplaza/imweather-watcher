import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Rectangle, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { ArrowLeft, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useThemedLogo } from "@/hooks/useThemedLogo";
import { useQuery } from "@tanstack/react-query";
import { fetchSingleModel, isTrackedModel } from "@/lib/imweatherApi";
import { StatusBadge } from "@/components/StatusBadge";
import { TimeStepGrid } from "@/components/TimeStepGrid";
import "leaflet/dist/leaflet.css";

const API_BASE = "https://api.imweather.com/v0/gridmapdata";

interface BoundingBox {
  north: number;
  south: number;
  west: number;
  east: number;
}

interface ModelDomain {
  id: string;
  name: string;
  region: string;
  category: string;
  institute: string;
  resolution: string;
  boundingBox: BoundingBox;
  isGlobal: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  atmosphere: "#3b82f6",
  wave: "#06b6d4",
  "air quality": "#22c55e",
  ocean: "#8b5cf6",
};

const CATEGORY_LABELS: Record<string, string> = {
  atmosphere: "Atmosfeer",
  wave: "Golf",
  "air quality": "Luchtkwaliteit",
  ocean: "Oceaan",
};

async function fetchAllDomains(): Promise<ModelDomain[]> {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data: Record<string, { rundescriptions: Record<string, any> }> = await res.json();

  const domains: ModelDomain[] = [];
  for (const [id, model] of Object.entries(data)) {
    const rd = Object.values(model.rundescriptions)[0];
    if (!rd?.boundingbox) continue;
    const bb = rd.boundingbox as BoundingBox;
    const isGlobal =
      bb.north > 80 && bb.south < -80 && bb.west < -170 && bb.east > 170;
    domains.push({
      id,
      name: rd.name ?? id,
      region: rd.region ?? "Unknown",
      category: rd.category ?? "atmosphere",
      institute: rd.institute ?? "",
      resolution: rd.resolution ?? "",
      boundingBox: bb,
      isGlobal,
    });
  }

  return domains;
}

function FlyToModel({ domain }: { domain: ModelDomain | null }) {
  const map = useMap();
  useEffect(() => {
    if (!domain || domain.isGlobal) return;
    const bounds = L.latLngBounds(
      [domain.boundingBox.south, domain.boundingBox.west],
      [domain.boundingBox.north, domain.boundingBox.east]
    );
    map.flyToBounds(bounds, { padding: [60, 60], duration: 0.5, maxZoom: 8 });
  }, [domain?.id]);
  return null;
}

function DomainLabels({
  domains,
  hoveredModel,
  selectedModel,
  onSelect,
  onHover,
}: {
  domains: ModelDomain[];
  hoveredModel: string | null;
  selectedModel: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const map = useMap();
  const [tick, setTick] = useState(0);

  useMapEvents({
    zoomend: () => setTick((v) => v + 1),
    moveend: () => setTick((v) => v + 1),
  });

  const labelPositions = useMemo(() => {
    const mapBounds = map.getBounds();
    const mapSize = map.getSize();
    const items: { domain: ModelDomain; screenX: number; screenY: number }[] = [];

    for (const d of domains) {
      const domBounds = L.latLngBounds(
        [d.boundingBox.south, d.boundingBox.west],
        [d.boundingBox.north, d.boundingBox.east],
      );
      if (!mapBounds.intersects(domBounds)) continue;

      const pt = map.latLngToContainerPoint([d.boundingBox.north, d.boundingBox.west]);
      const x = Math.max(4, Math.min(pt.x, mapSize.x - 100));
      const y = Math.max(4, Math.min(pt.y, mapSize.y - 16));
      items.push({ domain: d, screenX: x, screenY: y });
    }

    items.sort((a, b) => a.screenY - b.screenY || a.screenX - b.screenX);

    const LABEL_H = 15;
    const LABEL_W = 80;
    const placed: { x: number; y: number }[] = [];
    const result: { domain: ModelDomain; lat: number; lng: number }[] = [];

    for (const item of items) {
      let y = item.screenY;
      for (let attempt = 0; attempt < 25; attempt++) {
        const overlap = placed.some(
          (p) => Math.abs(y - p.y) < LABEL_H && Math.abs(item.screenX - p.x) < LABEL_W,
        );
        if (!overlap) break;
        y += LABEL_H;
      }
      placed.push({ x: item.screenX, y });
      const latLng = map.containerPointToLatLng(L.point(item.screenX, y));
      result.push({ domain: item.domain, lat: latLng.lat, lng: latLng.lng });
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domains, map, tick]);

  return (
    <>
      {labelPositions.map(({ domain: d, lat, lng }) => {
        const color = CATEGORY_COLORS[d.category] ?? "#6b7280";
        const isHovered = hoveredModel === d.id;
        const isSelected = selectedModel === d.id;
        const highlight = isHovered || isSelected;

        return (
          <Marker
            key={d.id}
            position={[lat, lng]}
            zIndexOffset={highlight ? 1000 : 0}
            icon={L.divIcon({
              className: "",
              html: `<div style="
                color: ${highlight ? "#fff" : color};
                font-size: 10px;
                font-weight: ${highlight ? 600 : 400};
                font-family: ui-sans-serif, system-ui, sans-serif;
                white-space: nowrap;
                pointer-events: auto;
                cursor: pointer;
                text-shadow: 0 0 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.6);
                padding: 1px 5px;
                border-radius: 3px;
                ${highlight ? `background: ${color}bb;` : ""}
                line-height: 13px;
                transition: color 0.15s, background 0.15s;
              ">${d.name}</div>`,
              iconSize: [0, 0],
              iconAnchor: [-2, 7],
            })}
            eventHandlers={{
              click: () => onSelect(d.id),
              mouseover: () => onHover(d.id),
              mouseout: () => onHover(null),
            }}
          />
        );
      })}
    </>
  );
}

type CategoryKey = string;

export default function DomainsView() {
  const navigate = useNavigate();
  const logo = useThemedLogo();
  const [activeCategories, setActiveCategories] = useState<Set<CategoryKey>>(
    new Set(["atmosphere", "wave", "air quality", "ocean"])
  );
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const { data: domains = [], isLoading } = useQuery({
    queryKey: ["model-domains"],
    queryFn: fetchAllDomains,
    staleTime: 30 * 60 * 1000,
  });

  const isTracked = selectedModel ? isTrackedModel(selectedModel) : false;
  const { data: modelData, isLoading: isModelLoading } = useQuery({
    queryKey: ["domain-model-status", selectedModel],
    queryFn: () => fetchSingleModel(selectedModel!),
    enabled: !!selectedModel && isTracked,
    staleTime: 2 * 60 * 1000,
  });

  const sortedDomains = useMemo(
    () =>
      domains
        .filter((d) => activeCategories.has(d.category))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [domains, activeCategories]
  );

  const globalDomains = useMemo(() => sortedDomains.filter((d) => d.isGlobal), [sortedDomains]);
  const regionalDomains = useMemo(() => sortedDomains.filter((d) => !d.isGlobal), [sortedDomains]);

  const toggleCategory = (cat: CategoryKey) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const categories = useMemo(
    () => [...new Set(domains.map((d) => d.category))].sort(),
    [domains]
  );

  const selectedDomain = useMemo(
    () => (selectedModel ? domains.find((d) => d.id === selectedModel) ?? null : null),
    [selectedModel, domains]
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedModel((prev) => (prev === id ? null : id));
  }, []);

  const latestRun = modelData?.runs?.[0] ?? null;

  return (
    <div className="h-screen w-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-2 border-b bg-background/95 backdrop-blur z-50">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <img src={logo} alt="Logo" className="h-6" />
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-semibold">Modeldomeinen</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                activeCategories.has(cat)
                  ? "border-transparent text-white"
                  : "border-border text-muted-foreground bg-transparent opacity-50"
              }`}
              style={
                activeCategories.has(cat)
                  ? { backgroundColor: CATEGORY_COLORS[cat] ?? "#6b7280" }
                  : undefined
              }
            >
              {CATEGORY_LABELS[cat] ?? cat}
              <span className="opacity-70">
                ({domains.filter((d) => d.category === cat).length})
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* Map + sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 border-r bg-background/50 flex flex-col">
          <div className="px-3 py-2 border-b">
            <p className="text-xs text-muted-foreground">
              {sortedDomains.length} modellen · hover om domein te tonen
            </p>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-0.5">
              {sortedDomains.map((d) => {
                const isSelected = selectedModel === d.id;
                const isHovered = hoveredModel === d.id;
                const color = CATEGORY_COLORS[d.category] ?? "#6b7280";
                const tracked = isTrackedModel(d.id);
                return (
                  <button
                    key={d.id}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-all flex items-center gap-2 ${
                      isSelected
                        ? "font-semibold text-foreground"
                        : isHovered
                        ? "bg-secondary text-foreground"
                        : tracked
                        ? "text-foreground hover:bg-secondary/50"
                        : "text-muted-foreground/50 hover:bg-secondary/50"
                    }`}
                    style={isSelected ? { backgroundColor: `${color}20` } : undefined}
                    onMouseEnter={() => setHoveredModel(d.id)}
                    onMouseLeave={() => setHoveredModel(null)}
                    onClick={() => handleSelect(d.id)}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate flex-1">{d.name}</span>
                    {d.isGlobal && (
                      <span className="text-[10px] text-muted-foreground/40 shrink-0">GLB</span>
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* Map */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-50">
              <div className="text-sm text-muted-foreground">Laden...</div>
            </div>
          )}
          <MapContainer
            center={[50, 10]}
            zoom={4}
            className="h-full w-full"
            zoomControl={false}
            attributionControl={false}
            maxBounds={[[-90, -180], [90, 180]]}
            maxBoundsViscosity={1.0}
            minZoom={2}
            worldCopyJump={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png"
              maxZoom={18}
              noWrap={true}
            />
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png"
              maxZoom={18}
              pane="tooltipPane"
              noWrap={true}
            />

            <FlyToModel domain={selectedDomain} />

            {/* Global models — border only, no fill unless selected */}
            {globalDomains.map((d) => {
              const isSelected = selectedModel === d.id;
              const isHovered = hoveredModel === d.id;
              const color = CATEGORY_COLORS[d.category] ?? "#6b7280";

              return (
                <Rectangle
                  key={d.id}
                  bounds={[
                    [d.boundingBox.south, d.boundingBox.west],
                    [d.boundingBox.north, d.boundingBox.east],
                  ]}
                  interactive={false}
                  pathOptions={{
                    color,
                    weight: isSelected ? 3 : isHovered ? 2 : 1,
                    fillColor: color,
                    fillOpacity: isSelected ? 0.15 : 0,
                    opacity: isSelected ? 0.9 : isHovered ? 0.7 : 0.15,
                    dashArray: "8 6",
                  }}
                />
              );
            })}

            {/* Regional models — border only, no fill unless selected */}
            {regionalDomains.map((d) => {
              const isSelected = selectedModel === d.id;
              const isHovered = hoveredModel === d.id;
              const color = CATEGORY_COLORS[d.category] ?? "#6b7280";
              const dimmed = selectedModel !== null && !isSelected && !isHovered;

              return (
                <Rectangle
                  key={d.id}
                  bounds={[
                    [d.boundingBox.south, d.boundingBox.west],
                    [d.boundingBox.north, d.boundingBox.east],
                  ]}
                  interactive={false}
                  pathOptions={{
                    color,
                    weight: isSelected ? 3.5 : isHovered ? 2.5 : 1.5,
                    fillColor: color,
                    fillOpacity: isSelected ? 0.25 : 0,
                    opacity: isSelected ? 1 : isHovered ? 1 : dimmed ? 0.2 : 0.5,
                  }}
                />
              );
            })}

            {/* Clickable name labels at NW corner of each domain */}
            <DomainLabels
              domains={sortedDomains}
              hoveredModel={hoveredModel}
              selectedModel={selectedModel}
              onSelect={handleSelect}
              onHover={setHoveredModel}
            />
          </MapContainer>

          {/* Selected model info panel */}
          {selectedDomain && (
            <div className="absolute bottom-4 left-4 z-[1000] bg-background/95 backdrop-blur border rounded-xl shadow-xl w-80">
              {/* Header bar */}
              <div className="px-4 pt-3 pb-2 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">{selectedDomain.name}</h3>
                  <div className="flex items-center gap-2">
                    {latestRun && <StatusBadge status={latestRun.status} />}
                    <button
                      onClick={() => setSelectedModel(null)}
                      className="text-muted-foreground hover:text-foreground text-lg leading-none transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{selectedDomain.institute}</p>
              </div>

              {/* Details grid */}
              <div className="px-4 py-2.5 space-y-2.5">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Categorie</span>
                    <span className="font-medium" style={{ color: CATEGORY_COLORS[selectedDomain.category] }}>
                      {CATEGORY_LABELS[selectedDomain.category] ?? selectedDomain.category}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Regio</span>
                    <span className="font-medium">{selectedDomain.region}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Resolutie</span>
                    <span className="font-medium">{selectedDomain.resolution}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Domein</span>
                    <span className="font-mono text-[10px]">
                      {selectedDomain.boundingBox.south.toFixed(1)}°–{selectedDomain.boundingBox.north.toFixed(1)}°N
                    </span>
                  </div>
                </div>

                {/* Run status section */}
                {isTracked && (
                  <div className="border-t pt-2.5">
                    {isModelLoading ? (
                      <p className="text-[11px] text-muted-foreground animate-pulse">Laden status...</p>
                    ) : latestRun ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                            Laatste run: {latestRun.date} {latestRun.runTime}
                          </span>
                        </div>
                        <TimeStepGrid
                          timeSteps={latestRun.timeSteps}
                          compact
                          mapContext={modelData ? {
                            modelId: modelData.id,
                            modelName: modelData.name,
                            element: modelData.imweather.element,
                            level: modelData.imweather.level,
                            runtime: (() => {
                              const [y, m, dd] = latestRun.date.split("-").map(Number);
                              const h = parseInt(latestRun.runTime);
                              return Math.floor(Date.UTC(y, m - 1, dd, h) / 1000);
                            })(),
                          } : undefined}
                        />
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Geen rundata beschikbaar</p>
                    )}
                  </div>
                )}

                {!isTracked && (
                  <div className="border-t pt-2">
                    <p className="text-[10px] text-muted-foreground italic">
                      Dit model wordt niet gemonitord
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
