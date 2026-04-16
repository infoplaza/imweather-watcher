import { useState, useCallback } from "react";
import type { WeatherModel, ModelRun } from "@/lib/weatherModels";
import { getImweatherUrl } from "@/lib/weatherModels";
import { Cloud, Waves, Wind, Droplets, AlertTriangle, CheckCircle2, ExternalLink, Loader2, RefreshCw, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import { fetchRunElements, type RunElementDetail } from "@/lib/imweatherApi";

interface GroupSummaryProps {
  group: "atmosphere" | "wave" | "air-quality" | "ocean";
  models: WeatherModel[];
  showBeta?: boolean;
}

interface ModelElementIssues {
  model: WeatherModel;
  run: ModelRun;
  elements: RunElementDetail[];
}

/** Find contiguous gaps in timesteps and return them as ranges */
function findGaps(timeSteps: { hour: number; available: boolean; excluded?: boolean }[]): { from: number; to: number; count: number }[] {
  const gaps: { from: number; to: number; count: number }[] = [];
  let gapStart: number | null = null;
  let gapCount = 0;

  for (let i = 0; i < timeSteps.length; i++) {
    const step = timeSteps[i];
    if (step.excluded) continue;
    if (!step.available) {
      if (gapStart === null) {
        gapStart = step.hour;
        gapCount = 1;
      } else {
        gapCount++;
      }
    } else {
      if (gapStart !== null) {
        gaps.push({ from: gapStart, to: timeSteps[i - 1].hour, count: gapCount });
        gapStart = null;
        gapCount = 0;
      }
    }
  }
  if (gapStart !== null) {
    gaps.push({ from: gapStart, to: timeSteps[timeSteps.length - 1].hour, count: gapCount });
  }

  return gaps.sort((a, b) => b.count - a.count);
}

export function GroupSummary({ group, models, showBeta = false }: GroupSummaryProps) {
  const { t } = useI18n();

  const groupConfig = {
    atmosphere: { icon: Cloud, label: t("atmosphere") },
    wave: { icon: Waves, label: t("wave") },
    "air-quality": { icon: Wind, label: t("airQuality") },
    ocean: { icon: Droplets, label: t("ocean") },
  };

  const { icon: Icon, label } = groupConfig[group];

  const activeModels = showBeta ? models : models.filter(m => !m.beta || m.ai);

  // Only consider the latest run per model (sort to ensure latest first)
  const latestRuns = activeModels.map(m => {
    const sorted = [...m.runs].sort((a, b) => b.date.localeCompare(a.date) || parseInt(b.runTime) - parseInt(a.runTime));
    return { model: m, run: sorted[0] };
  }).filter(x => x.run);
  const totalRuns = latestRuns.length;
  const completeRuns = latestRuns.filter(x => x.run.status === "complete").length;
  const issueCount = totalRuns - completeRuns;
  const hasIssues = issueCount > 0;

  // State for element-level detail
  const [loading, setLoading] = useState(false);
  const [elementIssues, setElementIssues] = useState<ModelElementIssues[]>([]);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const loadAllElements = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        latestRuns.map(async ({ model, run }) => {
          const elements = await fetchRunElements(model.id, run);
          return { model, run, elements };
        })
      );
      setElementIssues(results);
      setLastCheck(new Date());
    } catch {
      setElementIssues([]);
    } finally {
      setLoading(false);
    }
  }, [latestRuns.map(x => `${x.model.id}-${x.run.runTime}-${x.run.date}`).join(",")]);

  const handleOpen = async (isOpen: boolean) => {
    if (isOpen && elementIssues.length === 0) {
      await loadAllElements();
    }
  };

  const card = (
    <div className={cn(
      "rounded-lg border p-4 space-y-3 transition-colors cursor-pointer",
      hasIssues ? "border-warning/30 bg-warning/5 hover:bg-warning/10" : "border-success/30 bg-success/5 hover:bg-success/10"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md",
            hasIssues ? "bg-warning/20" : "bg-success/20"
          )}>
            <Icon className={cn("h-4 w-4", hasIssues ? "text-warning" : "text-success")} />
          </div>
          <h2 className="font-semibold text-sm">{label}</h2>
        </div>
        {hasIssues ? (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            <span className="font-mono text-xs text-warning font-medium">{issueCount} {t("issues")}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span className="font-mono text-xs text-success font-medium">OK</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="font-mono text-[11px]">{activeModels.length} {t("models")}</span>
        <span className="font-mono text-[11px]">{completeRuns}/{totalRuns} {t("runsComplete")}</span>
      </div>
    </div>
  );

  return (
    <Dialog onOpenChange={handleOpen}>
      <DialogTrigger asChild>{card}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
              {label} — {t("latestRun")}
            </DialogTitle>
            <div className="flex items-center gap-2 shrink-0">
              {lastCheck && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {lastCheck.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" })} UTC
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-6 gap-1 text-[10px] px-2"
                onClick={loadAllElements}
                disabled={loading}
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : elementIssues.length === 0 ? (
          <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Laden...</span>
          </div>
        ) : (
          <div className="space-y-2">
            {elementIssues.map(({ model, run, elements }) => {
              const issueElements = elements.filter(el => {
                const counted = el.timeSteps.filter(s => !s.excluded);
                if (counted.length === 0) return true;
                return counted.some(s => !s.available);
              });
              const okCount = elements.length - issueElements.length;
              const hasModelIssues = issueElements.length > 0;

              return (
                <Collapsible key={model.id}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full rounded-lg border p-3 hover:bg-muted/50 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-2">
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=closed]:-rotate-90" />
                      <span className="font-semibold text-sm">{model.name}</span>
                      <StatusBadge status={run.status} />
                      <span className="font-mono text-[10px] text-muted-foreground">{run.runTime} {run.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-mono text-[10px]",
                        hasModelIssues ? "text-destructive" : "text-success"
                      )}>
                        {hasModelIssues ? `${issueElements.length} issues` : "OK"}
                      </span>
                      <a
                        href={getImweatherUrl(model, run)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-5 border-l pl-3 py-2 space-y-1">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground mb-1.5">
                        <span className="text-success">{okCount} elements OK</span>
                        {issueElements.length > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-destructive">{issueElements.length} with issues</span>
                          </>
                        )}
                      </div>

                      {issueElements.length === 0 ? (
                        <div className="flex items-center gap-1.5 py-1 text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">All elements complete</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {issueElements
                            .sort((a, b) => {
                              const aMissing = a.timeSteps.filter(s => !s.excluded && !s.available).length;
                              const bMissing = b.timeSteps.filter(s => !s.excluded && !s.available).length;
                              return bMissing - aMissing;
                            })
                            .map((el) => {
                              const counted = el.timeSteps.filter(s => !s.excluded);
                              const available = counted.filter(s => s.available).length;
                              const total = counted.length;
                              const pct = total > 0 ? Math.round((available / total) * 100) : 0;
                              const gaps = findGaps(el.timeSteps);
                              const topGap = gaps[0];
                              const elementLabel = el.level ? `${el.element} (${el.level})` : el.element;

                              return (
                                <div key={`${el.element}-${el.level}`} className="py-1 border-t border-dashed first:border-t-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[11px] font-medium truncate">{elementLabel}</span>
                                    <span className={cn(
                                      "font-mono text-[10px] shrink-0",
                                      pct >= 90 ? "text-success" : pct >= 50 ? "text-warning" : "text-destructive"
                                    )}>
                                      {available}/{total} ({pct}%)
                                    </span>
                                  </div>
                                  {topGap && (
                                    <span className="inline-flex items-center rounded border border-destructive/30 bg-destructive/10 px-1 py-0.5 font-mono text-[9px] text-destructive mt-0.5">
                                      T+{topGap.from}h–{topGap.to}h ({topGap.count} missing)
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
