import { useRef, useState, useCallback } from "react";
import html2canvas from "html2canvas";
import { addLogoToCanvas } from "@/lib/shareUtils";
import type { WeatherModel } from "@/lib/weatherModels";
import { Cloud, Waves, Wind, Droplets, ChartNoAxesCombined, Share2, Loader2, Star, Layers, Sparkles } from "lucide-react";
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
  const { t } = useI18n();
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
        t("imageCopiedConfirm")
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
  }, [isSharing, t]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleShareAll} disabled={isSharing}>
          {isSharing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}
          {t("shareOverview")}
        </Button>
      </div>

      <div ref={containerRef} className="rounded-lg border bg-card p-4 space-y-4">
        {grouped.map(({ group, items }) => {
          const regular = items.filter((m) => !m.ai && !m.ensemble);
          const ensembleItems = items.filter((m) => m.ensemble && !m.ai);
          const aiItems = group === "atmosphere" ? items.filter((m) => m.ai && !m.ensemble) : [];

          const renderModelRow = (model: WeatherModel) => {
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
                    updateSettings({ favorites: isFav ? favs.filter((id) => id !== model.id) : [...favs, model.id] });
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
          };

          const gridClass = "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2";

          return (
            <div key={group}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {groupLabels[group]}
              </h3>
              {regular.length > 0 && <div className={gridClass}>{regular.map(renderModelRow)}</div>}

              {ensembleItems.length > 0 && (
                <div className={regular.length > 0 ? "mt-3" : ""}>
                  <div className="flex items-center gap-2 w-full rounded-lg border border-dashed border-violet-500/30 bg-violet-500/5 p-2.5 mb-2">
                    <Layers className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                    <span className="text-xs font-semibold text-violet-700 dark:text-violet-300">{t("ensembleModels")}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{ensembleItems.length} {t("models")}</span>
                  </div>
                  <div className={gridClass}>{ensembleItems.map(renderModelRow)}</div>
                </div>
              )}

              {aiItems.length > 0 && (
                <div className={regular.length > 0 || ensembleItems.length > 0 ? "mt-3" : ""}>
                  <div className="flex items-center gap-2 w-full rounded-lg border border-dashed border-primary/30 bg-primary/5 p-2.5 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-primary">{t("aiModels")}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{aiItems.length} {t("models")}</span>
                  </div>
                  <div className={gridClass}>{aiItems.map(renderModelRow)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
