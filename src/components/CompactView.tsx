import { useRef, useState, useCallback } from "react";
import html2canvas from "html2canvas";
import { addLogoToCanvas } from "@/lib/shareUtils";
import type { WeatherModel } from "@/lib/weatherModels";
import { Cloud, Waves, Wind, Droplets, ChartNoAxesCombined, Share2, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/appSettings";

const groupIcons = { atmosphere: Cloud, wave: Waves, "air-quality": Wind, ocean: Droplets };
const groupOrder: WeatherModel["group"][] = ["atmosphere", "wave", "air-quality", "ocean"];

function getLatestRunStats(model: WeatherModel) {
  const sorted = [...model.runs].sort((a, b) => {
    const dc = b.date.localeCompare(a.date);
    return dc !== 0 ? dc : parseInt(b.runTime) - parseInt(a.runTime);
  });
  const latest = sorted[0];
  if (!latest) return { runTime: "-", pct: 0 };
  const total = latest.timeSteps.length;
  if (total === 0) return { runTime: latest.runTime, pct: 0 };
  const available = latest.timeSteps.filter(s => s.available).length;
  return { runTime: `${latest.runTime} ${latest.date}`, pct: Math.round((available / total) * 100) };
}

function pctColor(pct: number, criticalPct: number) {
  if (pct >= criticalPct) return "text-success";
  if (pct >= 40) return "text-warning";
  return "text-destructive";
}

function pctBorderColor(pct: number, criticalPct: number) {
  if (pct >= criticalPct) return "border-success/50";
  if (pct >= 40) return "border-warning/50";
  return "border-destructive/50";
}

interface CompactViewProps {
  models: WeatherModel[];
  showBeta: boolean;
  onModelClick?: (model: WeatherModel) => void;
}

export function CompactView({ models, showBeta, onModelClick }: CompactViewProps) {
  const { t, lang } = useI18n();
  const { settings, updateSettings } = useSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  const filtered = models.filter(m => showBeta || !m.beta);

  const grouped = groupOrder
    .map(g => ({ group: g, items: filtered.filter(m => m.group === g) }))
    .filter(g => g.items.length > 0);

  const groupLabels: Record<string, string> = {
    atmosphere: t("atmosphere"),
    wave: t("wave"),
    "air-quality": t("airQuality"),
    ocean: t("ocean"),
  };

  const handleShareAll = useCallback(async () => {
    if (!containerRef.current || isSharing) return;
    setIsSharing(true);
    try {
      await new Promise(r => setTimeout(r, 100));
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
      const canvas = await html2canvas(containerRef.current, {
        backgroundColor: bgColor ? `hsl(${bgColor})` : "#1a1a2e",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const blob = await addLogoToCanvas(canvas);
      if (!blob) return;

      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      } catch { console.warn("Clipboard write failed"); }

      const now = new Date();
      const ts = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const fileName = `IMWeather Overview ${ts}.png`;

      const wantDownload = window.confirm(
        lang === "nl"
          ? "Afbeelding gekopieerd naar klembord.\nWil je het ook downloaden?"
          : "Image copied to clipboard.\nDo you also want to download it?"
      );
      if (wantDownload) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.warn("Share failed", e);
    } finally {
      setIsSharing(false);
    }
  }, [isSharing, lang]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleShareAll} disabled={isSharing}>
          {isSharing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}
          {lang === "nl" ? "Deel overzicht" : "Share overview"}
        </Button>
      </div>

      <div ref={containerRef} className="rounded-lg border bg-card p-4 space-y-4">
        {grouped.map(({ group, items }) => {
          return (
            <div key={group}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {groupLabels[group]}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {items.map(model => {
                  const Icon = model.ensemble ? ChartNoAxesCombined : groupIcons[model.group];
                  const { runTime, pct } = getLatestRunStats(model);
                  return (
                    <div
                      key={model.id}
                      onClick={() => onModelClick?.(model)}
                      className={cn(
                        "flex items-center gap-2.5 py-2 px-3 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors min-h-[36px]",
                        pctBorderColor(pct, settings.criticalPct)
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", pctColor(pct, settings.criticalPct))} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const favs = settings.favorites || [];
                          const isFav = favs.includes(model.id);
                          updateSettings({ favorites: isFav ? favs.filter(id => id !== model.id) : [...favs, model.id] });
                        }}
                        className="shrink-0 p-0.5 rounded hover:bg-muted/50 transition-colors"
                      >
                        <Star className={cn("h-3 w-3", settings.favorites?.includes(model.id) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/50")} />
                      </button>
                      <span className="text-sm font-medium flex-1 whitespace-nowrap">{model.name}</span>
                      {model.beta && (
                        <span className="rounded border border-orange-400/50 bg-orange-500/15 px-1 py-0.5 text-[8px] font-mono font-semibold uppercase text-orange-500">
                          beta
                        </span>
                      )}
                      <span className="font-mono text-xs text-muted-foreground shrink-0">{runTime}</span>
                      <span className={cn("font-mono text-xs font-bold shrink-0", pctColor(pct, settings.criticalPct))}>
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
