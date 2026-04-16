import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info, Loader2, Clock, Calendar, Layers, Globe, Building2, Gauge, Activity } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ForecastTimeline } from "@/components/ForecastTimeline";
import { loadStatusMap, getLastCheckedAt } from "@/lib/modelStatusTracker";
import { useI18n } from "@/lib/i18n";

const API_BASE = "https://api.imweather.com/v0/gridmapdata";

interface RunDescription {
  category: string;
  institute: string;
  name: string;
  resolution: string;
  type: string;
  region: string;
  sequence: string;
  runtime: number;
  timeranges: { from: number; to: number; maxoffset: number };
  is_beta_model: boolean;
}

interface ModelInfoResponse {
  metadata: {
    runtimes: number[];
    runtimeshours: number[];
    lastupdatetime: number;
    configured_in_jupiter: boolean;
  };
  rundescriptions: Record<string, RunDescription>;
  elements: Record<string, Record<string, { name: string; category: string; unit: string }>>;
}

async function fetchModelInfo(modelId: string): Promise<ModelInfoResponse> {
  const res = await fetch(`${API_BASE}/models/${modelId}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function formatTimestamp(ts: number, locale: string): string {
  const d = new Date(ts * 1000);
  return d.toLocaleString(locale === "nl" ? "nl-NL" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}


export function ModelInfoDialog({ modelId, modelName, children }: { modelId: string; modelName: string; children?: React.ReactNode }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["model-info", modelId],
    queryFn: () => fetchModelInfo(modelId),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const statusEntry = useMemo(() => {
    if (!open) return null;
    const map = loadStatusMap();
    return map[modelId] ?? null;
  }, [open, modelId]);

  // Get first rundescription for general info
  const runDesc = data?.rundescriptions
    ? Object.values(data.rundescriptions)[0]
    : null;

  // Only use the sequence from the most recent run
  const latestRuntime = data?.metadata?.runtimes?.[0];
  const latestRunDesc = data?.rundescriptions && latestRuntime != null
    ? data.rundescriptions[String(latestRuntime)]
    : null;
  const sequences = latestRunDesc ? [latestRunDesc.sequence] : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <button
            className="p-0.5 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            title={t("modelInfo")}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
       <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-primary" />
            {modelName}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive py-4">
            {t("errorLoadingModelInfo")}
          </p>
        )}

        {!isLoading && (
          <ScrollArea className="flex-1 -mr-4 pr-4">
            <div className="space-y-4 pb-2">
              {/* Paneel 1: Laatste info */}
              <div className="rounded-md border bg-secondary/30 p-3 space-y-1.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Activity className="h-3 w-3" />
                  {t("latestInfo")}
                </h4>
                {statusEntry ? (
                  <div className="text-sm space-y-1">
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                      <span className="text-muted-foreground">Run:</span>
                      <span className="font-mono font-medium">{statusEntry.runKey.replace("|", " · ")}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Gauge className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                      <span className="text-muted-foreground">{t("progress")}:</span>
                      <span className="font-mono font-medium">
                        {statusEntry.availableCount}/{statusEntry.totalSteps}
                        {statusEntry.totalSteps > 0 && ` (${Math.round((statusEntry.availableCount / statusEntry.totalSteps) * 100)}%)`}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                      <span className="text-muted-foreground">{t("lastChange")}:</span>
                      <span className="font-mono font-medium">
                        {new Date(statusEntry.lastChangedAt).toLocaleTimeString(lang === "nl" ? "nl-NL" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" })}
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                      <span className="text-muted-foreground">{t("lastCheck")}:</span>
                      <span className="font-mono font-medium">
                        {(() => {
                          const checked = getLastCheckedAt();
                          if (!checked) return "—";
                          return new Date(checked).toLocaleTimeString(lang === "nl" ? "nl-NL" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" });
                        })()}
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("noStatusData")}</p>
                )}
              </div>

              {/* Paneel 2: Algemene info */}
              {data && runDesc && (
                <div className="rounded-md border bg-secondary/30 p-3 space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Globe className="h-3 w-3" />
                    {t("generalInfo")}
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <InfoRow icon={Building2} label={t("institute")} value={runDesc.institute} />
                    <InfoRow icon={Globe} label={t("region")} value={runDesc.region} />
                    <InfoRow icon={Gauge} label={t("resolution")} value={runDesc.resolution} />
                    <InfoRow icon={Layers} label={t("type")} value={runDesc.type} />
                  </div>
                </div>
              )}

              {/* Beschikbare runs */}
              {data?.metadata.runtimeshours && (
                <div className="rounded-md border bg-secondary/30 p-3 space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {t("availableRuns")}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {data.metadata.runtimeshours.map((h) => (
                      <span
                        key={h}
                        className="rounded-full border bg-background px-2.5 py-0.5 text-xs font-mono font-medium"
                      >
                        {String(h).padStart(2, "0")}Z
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Voorspellingstijdlijn */}
              {sequences.length > 0 && (
                <ForecastTimeline sequences={sequences} />
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Info; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 text-muted-foreground/70 shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}
