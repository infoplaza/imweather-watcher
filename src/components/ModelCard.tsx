import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import { addLogoToCanvas } from "@/lib/shareUtils";
import type { WeatherModel } from "@/lib/weatherModels";
import { getImweatherUrl } from "@/lib/weatherModels";
import { StatusBadge } from "./StatusBadge";
import { TimeStepGrid } from "./TimeStepGrid";
import { RunDetailDialog } from "./RunDetailDialog";
import { ModelInfoDialog } from "./ModelInfoDialog";
import { Cloud, Waves, Wind, Droplets, ChevronDown, Thermometer, CloudRain, Loader2, ChartNoAxesCombined, Share2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n, type TranslationKey } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { fetchSingleModel, ATMOSPHERE_ELEMENTS, getApiId } from "@/lib/imweatherApi";

const groupIcons = { atmosphere: Cloud, wave: Waves, "air-quality": Wind, ocean: Droplets };

const testElementKeyMap: Record<string, TranslationKey> = {
  "Temperatuur (2m)": "elementTemperature2m",
  "Neerslag": "elementPrecipitation",
  "Significante golfhoogte (Hs)": "elementSignificantWaveHeight",
  "Air Quality Index": "elementAirQualityIndex",
  "Zeewatertemperatuur (SST)": "elementSeaSurfaceTemp",
  "Windsnelheid (10m)": "elementWindspeed",
};

import { useSettings } from "@/lib/appSettings";

export type ElementView = "temperature" | "precipitation" | "windspeed";

const ELEMENT_IMWEATHER: Record<ElementView, { element: string; level: string }> = {
  temperature: { element: "temperature", level: "2m" },
  precipitation: { element: "precipitation", level: "" },
  windspeed: { element: "windspeed", level: "10m" },
};

const ELEMENT_OPTIONS: Record<ElementView, (typeof ATMOSPHERE_ELEMENTS)[number]> = {
  temperature: ATMOSPHERE_ELEMENTS[0],
  precipitation: ATMOSPHERE_ELEMENTS[1],
  windspeed: ATMOSPHERE_ELEMENTS[2],
};

export function ModelCard({ model, elementOverride }: { model: WeatherModel; elementOverride?: ElementView }) {
  const { t } = useI18n();
  const { settings, updateSettings } = useSettings();
  const DEFAULT_VISIBLE = settings.visibleRuns;
  const [expanded, setExpanded] = useState(false);
  const [localElementView, setLocalElementView] = useState<ElementView | null>(null);
  const elementView = localElementView ?? elementOverride ?? "temperature";
  const [isSharing, setIsSharing] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const Icon = model.ensemble ? ChartNoAxesCombined : groupIcons[model.group];
  const isAtmosphere = model.group === "atmosphere";

  const handleShare = useCallback(async () => {
    if (!cardRef.current || isSharing) return;
    setIsSharing(true);
    try {
      // Wait briefly for layout to stabilize
      await new Promise(r => setTimeout(r, 100));
      // Get computed background color for accurate rendering
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: bgColor ? `hsl(${bgColor})` : "#1a1a2e",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const blob = await addLogoToCanvas(canvas);
      if (!blob) return;

      // Always copy to clipboard first
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
      } catch {
        console.warn("Clipboard write failed");
      }

      const now = new Date();
      const ts = `${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const fileName = `${model.name} ${ts}.png`;

      // Ask user if they also want to download
      const wantDownload = window.confirm("Afbeelding gekopieerd naar klembord.\nWil je het ook downloaden?");
      if (wantDownload) {
        // Try native Web Share API (works on mobile for WhatsApp etc.)
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], fileName, { type: "image/png" });
          const shareData = { title: model.name, files: [file] };
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return;
          }
        }

        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      // User cancelled share or error
      console.warn("Share cancelled or failed", e);
    } finally {
      setIsSharing(false);
    }
  }, [isSharing, model.name]);

  // Fetch model data for non-default element
  const elementQuery = useQuery({
    queryKey: ["single-model", model.id, elementView],
    queryFn: () => fetchSingleModel(model.id, ELEMENT_OPTIONS[elementView]),
    enabled: isAtmosphere && elementView !== "temperature",
    staleTime: 2 * 60 * 1000,
  });

  // Use element-specific data when available, otherwise default model data
  const displayModel = (isAtmosphere && elementView !== "temperature" && elementQuery.data) ? elementQuery.data : model;
  const isElementLoading = isAtmosphere && elementView !== "temperature" && elementQuery.isLoading;

  const translatedElement = testElementKeyMap[displayModel.testElement]
    ? t(testElementKeyMap[displayModel.testElement])
    : displayModel.testElement;

  // Build imweather URL based on selected element view
  const getElementUrl = (run: typeof model.runs[0]) => {
    if (!isAtmosphere || elementView === "temperature") {
      return getImweatherUrl(model, run);
    }
    const overrideModel = { ...model, imweather: { ...model.imweather, ...ELEMENT_IMWEATHER[elementView] } };
    return getImweatherUrl(overrideModel, run);
  };

  const sortedRuns = [...displayModel.runs].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date);
    if (dateCompare !== 0) return dateCompare;
    return parseInt(b.runTime) - parseInt(a.runTime);
  });

  // Compute icon color based on latest run availability
  const latestRun = sortedRuns[0];
  const { iconColorClass, hoverRingClass } = (() => {
    if (!latestRun) return { iconColorClass: "text-muted-foreground", hoverRingClass: "hover:ring-muted-foreground/30" };
    const total = latestRun.timeSteps.length;
    if (total === 0) return { iconColorClass: "text-muted-foreground", hoverRingClass: "hover:ring-muted-foreground/30" };
    const available = latestRun.timeSteps.filter(s => s.available).length;
    const pct = (available / total) * 100;
    if (pct >= settings.criticalPct) return { iconColorClass: "text-success", hoverRingClass: "hover:ring-success/50" };
    if (pct >= 40) return { iconColorClass: "text-warning", hoverRingClass: "hover:ring-warning/50" };
    return { iconColorClass: "text-destructive", hoverRingClass: "hover:ring-destructive/50" };
  })();

  const visibleRuns = expanded ? sortedRuns : sortedRuns.slice(0, DEFAULT_VISIBLE);
  const hasMore = sortedRuns.length > DEFAULT_VISIBLE;

  return (
    <div id={`model-${model.id}`} ref={cardRef} className={cn(
      "rounded-lg border bg-card p-4 space-y-4 transition-shadow ring-0 hover:ring-2",
      hoverRingClass,
      model.beta && "border-dashed border-muted-foreground/30"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", iconColorClass)} />
          <a
            href={sortedRuns.length > 0 ? getElementUrl(sortedRuns[0]) : "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-sm hover:underline"
          >
            {model.name}
          </a>
          {isAtmosphere && (
            <div className="flex items-center gap-0.5 ml-1">
              <button
                onClick={() => setLocalElementView("temperature")}
                className={cn(
                  "p-0.5 rounded transition-colors",
                  elementView === "temperature"
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground/50 hover:text-muted-foreground"
                )}
                title={t("elementTemperature2m")}
              >
                <Thermometer className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setLocalElementView("precipitation")}
                className={cn(
                  "p-0.5 rounded transition-colors",
                  elementView === "precipitation"
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground/50 hover:text-muted-foreground"
                )}
                title={t("elementPrecipitation")}
              >
                <CloudRain className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setLocalElementView("windspeed")}
                className={cn(
                  "p-0.5 rounded transition-colors",
                  elementView === "windspeed"
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground/50 hover:text-muted-foreground"
                )}
                title={t("elementWindspeed")}
              >
                <Wind className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {model.beta && (
            <span className="rounded border border-orange-400/50 bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase text-orange-500">
              beta
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ModelInfoDialog modelId={getApiId(model.id)} modelName={model.name} />
          <button
            onClick={() => {
              const favs = settings.favorites || [];
              const isFav = favs.includes(model.id);
              updateSettings({ favorites: isFav ? favs.filter(id => id !== model.id) : [...favs, model.id] });
            }}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={settings.favorites?.includes(model.id) ? "Remove favorite" : "Add favorite"}
          >
            <Star className={cn("h-3.5 w-3.5", settings.favorites?.includes(model.id) && "fill-yellow-400 text-yellow-400")} />
          </button>
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Share"
          >
            {isSharing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{model.source}</span>
        <span>·</span>
        <span className="font-mono">{translatedElement}</span>
      </div>

      {isElementLoading ? (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {visibleRuns.map((run) => (
            <div
              key={`${run.date}-${run.runTime}`}
              className="block space-y-1.5 rounded-md bg-secondary/50 p-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-medium">{run.runTime}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{run.date}</span>
                  <RunDetailDialog model={model} run={run} />
                </div>
                <StatusBadge status={run.status} />
              </div>
              <TimeStepGrid
                timeSteps={run.timeSteps}
                compact
                mapContext={{
                  modelId: model.id,
                  modelName: model.name,
                  element: isAtmosphere ? ELEMENT_IMWEATHER[elementView].element : model.imweather.element,
                  level: isAtmosphere ? ELEMENT_IMWEATHER[elementView].level : model.imweather.level,
                  runtime: (() => {
                    const runHour = parseInt(run.runTime);
                    const [y, m, d] = run.date.split("-").map(Number);
                    return Math.floor(new Date(Date.UTC(y, m - 1, d, runHour)).getTime() / 1000);
                  })(),
                }}
              />
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 w-full justify-center text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors pt-1"
        >
          <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
          {expanded ? t("showLessRuns") : `${t("showMoreRuns")} (${sortedRuns.length - DEFAULT_VISIBLE})`}
        </button>
      )}
    </div>
  );
}
