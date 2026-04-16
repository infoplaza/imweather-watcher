import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ChevronsUpDown, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ModelInfoDialog } from "@/components/ModelInfoDialog";
import { useI18n } from "@/lib/i18n";
import { loadStatusMap, getLastCheckedAt, type NoProgressModel, type ModelStatusEntry } from "@/lib/modelStatusTracker";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useSettings } from "@/lib/appSettings";

interface NoProgressAlertProps {
  models: NoProgressModel[];
  totalTracked: number;
}

type SortKey = "model" | "run" | "available" | "lastChanged";
type SortDir = "asc" | "desc";

function StatusMapViewer() {
  const { lang } = useI18n();
  const { settings } = useSettings();
  const map = loadStatusMap();
  const checkedIso = getLastCheckedAt();
  const checkedDate = checkedIso ? new Date(checkedIso) : new Date();
  const nowMs = Date.now();
  const [sortKey, setSortKey] = useState<SortKey>("model");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rawEntries = Object.entries(map);

  if (rawEntries.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground font-mono mt-2">
        {lang === "nl" ? "Geen tracking data beschikbaar." : "No tracking data available."}
      </p>
    );
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown className="h-2.5 w-2.5 opacity-40" />;
    return sortDir === "asc"
      ? <ChevronUp className="h-2.5 w-2.5" />
      : <ChevronDown className="h-2.5 w-2.5" />;
  };

  const entries = [...rawEntries].sort(([idA, a], [idB, b]) => {
    const pctA = a.totalSteps > 0 ? a.availableCount / a.totalSteps : 0;
    const pctB = b.totalSteps > 0 ? b.availableCount / b.totalSteps : 0;
    let cmp = 0;
    switch (sortKey) {
      case "model": cmp = (a.modelName || "").trim().toUpperCase().localeCompare((b.modelName || "").trim().toUpperCase()); break;
      case "run": cmp = (a.runKey || "").localeCompare(b.runKey || "", undefined, { sensitivity: "base" }); break;
      case "available": cmp = pctA - pctB; break;
      case "lastChanged": cmp = new Date(a.lastChangedAt).getTime() - new Date(b.lastChangedAt).getTime(); break;
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" }) + " UTC";
  };

  const minsAgo = (iso: string) => {
    const mins = Math.round((nowMs - new Date(iso).getTime()) / 60000);
    if (mins < 60) return `${mins}min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  const getStatusColor = (entry: ModelStatusEntry) => {
    const pct = entry.totalSteps > 0 ? (entry.availableCount / entry.totalSteps) * 100 : 0;
    const minutesSinceChange = (nowMs - new Date(entry.lastChangedAt).getTime()) / 60000;
    if (pct >= settings.criticalPct) return "text-green-400";
    if (pct < settings.criticalPct && minutesSinceChange > 30) return "text-destructive";
    return "text-amber-400";
  };

  const checkedAt = checkedDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" }) + " UTC";

  const thClass = "text-left px-2 py-1 font-medium cursor-pointer hover:text-foreground transition-colors select-none";

  return (
    <div className="mt-2 rounded-md border border-border/50 bg-background/50 overflow-hidden">
      <p className="text-[10px] text-muted-foreground px-2 py-1 border-b border-border/30">
        {lang === "nl" ? "Gecontroleerd om" : "Checked at"} {checkedAt}
      </p>
      <table className="w-full text-[10px] font-mono">
        <thead>
          <tr className="border-b border-border/50 text-muted-foreground">
            <th className={thClass} onClick={() => handleSort("model")}>
              <span className="inline-flex items-center gap-1">Model <SortIcon col="model" /></span>
            </th>
            <th className={thClass} onClick={() => handleSort("run")}>
              <span className="inline-flex items-center gap-1">Run <SortIcon col="run" /></span>
            </th>
            <th className={`${thClass} !text-right`} onClick={() => handleSort("available")}>
              <span className="inline-flex items-center gap-1 justify-end w-full">{lang === "nl" ? "Beschikbaar" : "Available"} <SortIcon col="available" /></span>
            </th>
            <th className={`${thClass} !text-right`} onClick={() => handleSort("lastChanged")}>
              <span className="inline-flex items-center gap-1 justify-end w-full">{lang === "nl" ? "Laatste wijziging" : "Last changed"} <SortIcon col="lastChanged" /></span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([id, entry]) => {
            const pct = entry.totalSteps > 0 ? Math.round((entry.availableCount / entry.totalSteps) * 100) : 0;
            const color = getStatusColor(entry);
            return (
              <tr key={id} className="border-b border-border/30 last:border-0 hover:bg-muted/30">
                <td className={`px-2 py-1 font-semibold ${color}`}>
                  {entry.modelName || id} <span className="text-muted-foreground font-normal">({id})</span>
                </td>
                <td className="px-2 py-1 text-muted-foreground">{entry.runKey}</td>
                <td className={`px-2 py-1 text-right font-semibold ${color}`}>
                  {entry.availableCount} / {entry.totalSteps || "?"} ({pct}%)
                </td>
                <td className="px-2 py-1 text-right text-muted-foreground">
                  {formatTime(entry.lastChangedAt)} ({minsAgo(entry.lastChangedAt)} {lang === "nl" ? "geleden" : "ago"})
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function NoProgressAlert({ models, totalTracked }: NoProgressAlertProps) {
  const { lang } = useI18n();
  const { settings } = useSettings();

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC";
  };

  const minutesAgo = (iso: string) => {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 60) return `${mins}min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  const hasIssues = models.length > 0;

  if (!hasIssues) {
    return (
      <Collapsible>
        <Alert variant="default" className="border-success/50 bg-success/5">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <AlertTitle className="text-success text-sm font-semibold">
            <CollapsibleTrigger className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity group">
              {lang === "nl" ? "Alle modellen ontvangen data" : "All models receiving data"}
              <ChevronDown className="h-3 w-3 text-success/60 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
          </AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground space-y-1">
            <p>
              {lang === "nl"
                ? `${totalTracked} modellen worden gemonitord — geen problemen gedetecteerd.`
                : `${totalTracked} models being monitored — no issues detected.`}
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>
                {lang === "nl"
                  ? "Deze functionaliteit heeft 24 uur nodig om goed te werken."
                  : "This feature needs 24 hours to work properly."}
              </span>
            </div>
          </AlertDescription>
          <CollapsibleContent>
            <StatusMapViewer />
          </CollapsibleContent>
        </Alert>
      </Collapsible>
    );
  }

  return (
    <Collapsible>
      <Alert variant="default" className="border-destructive/50 bg-destructive/5 [&>svg]:text-destructive">
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="text-destructive text-sm font-semibold">
          <CollapsibleTrigger className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity group">
            {lang === "nl"
              ? `Geen voortgang gedetecteerd (${models.length} ${models.length === 1 ? "model" : "modellen"})`
              : `No progress detected (${models.length} ${models.length === 1 ? "model" : "models"})`}
            <ChevronDown className="h-3 w-3 text-destructive transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
        </AlertTitle>
        <AlertDescription className="text-xs mt-1.5 space-y-1">
          <p className="text-muted-foreground">
            {lang === "nl"
              ? `De volgende modellen hebben al meer dan 30 minuten geen nieuwe tijdstappen ontvangen en zijn minder dan ${settings.criticalPct}% beschikbaar:`
              : `The following models have not received new time steps for over 30 minutes and are less than ${settings.criticalPct}% available:`}
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            {models.map((m) => (
              <span key={m.id} className="font-mono inline-flex items-center gap-1.5">
                <ModelInfoDialog modelId={m.id} modelName={m.name}>
                  <button className="font-semibold text-destructive hover:underline cursor-pointer">
                    {m.name}
                  </button>
                </ModelInfoDialog>
                <span className="text-muted-foreground">
                  – {lang === "nl" ? "sinds" : "since"} {formatTime(m.lastChangedAt)}{" "}
                  ({minutesAgo(m.lastChangedAt)} {lang === "nl" ? "geleden" : "ago"}),{" "}
                  {m.availabilityPct}%
                </span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>
              {lang === "nl"
                ? "Deze functionaliteit heeft 24 uur nodig om goed te werken."
                : "This feature needs 24 hours to work properly."}
            </span>
          </div>
        </AlertDescription>
        <CollapsibleContent>
          <StatusMapViewer />
        </CollapsibleContent>
      </Alert>
    </Collapsible>
  );
}
