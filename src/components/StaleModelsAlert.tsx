import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { WeatherModel } from "@/lib/weatherModels";
import { useI18n } from "@/lib/i18n";
import { ModelInfoDialog } from "@/components/ModelInfoDialog";

interface StaleModelInfo {
  id: string;
  name: string;
  ageHours: number;
  expectedIntervalHours: number;
}

function getLatestRunDate(model: WeatherModel): Date | null {
  if (model.runs.length === 0) return null;

  let latest: Date | null = null;
  for (const run of model.runs) {
    const runHour = parseInt(run.runTime);
    const [year, month, day] = run.date.split("-").map(Number);
    const runDate = new Date(Date.UTC(year, month - 1, day, runHour));
    if (!latest || runDate > latest) {
      latest = runDate;
    }
  }
  return latest;
}

function getRunsPerDay(model: WeatherModel): number {
  // Count distinct runTimes (e.g. "00", "06", "12", "18" = 4 runs/day)
  const uniqueRunTimes = new Set(model.runs.map((r) => r.runTime));
  // If we only have 1-2 runs visible, estimate based on common patterns
  // Minimum assumption: at least as many unique run times as we see
  return Math.max(uniqueRunTimes.size, 1);
}

export function getStaleModels(
  models: WeatherModel[],
  showBeta: boolean,
  staleFactor = 1.8
): StaleModelInfo[] {
  const now = new Date();
  const stale: StaleModelInfo[] = [];

  for (const model of models) {
    if (!showBeta && model.beta) continue;

    const latestRun = getLatestRunDate(model);
    if (!latestRun) continue;

    const runsPerDay = getRunsPerDay(model);
    const expectedIntervalHours = 24 / runsPerDay;
    const ageMs = now.getTime() - latestRun.getTime();
    const ageHours = ageMs / (1000 * 60 * 60);
    const threshold = expectedIntervalHours * staleFactor;

    if (ageHours > threshold) {
      stale.push({
        id: model.id,
        name: model.name,
        ageHours: Math.round(ageHours),
        expectedIntervalHours,
      });
    }
  }

  // Sort by most overdue first
  stale.sort((a, b) => b.ageHours - a.ageHours);
  return stale;
}

interface StaleModelsAlertProps {
  models: WeatherModel[];
  showBeta: boolean;
  staleFactor?: number;
}

export function StaleModelsAlert({ models, showBeta, staleFactor = 1.85 }: StaleModelsAlertProps) {
  const { lang } = useI18n();
  const staleModels = getStaleModels(models, showBeta, staleFactor);

  if (staleModels.length === 0) return null;

  const formatAge = (hours: number) => {
    if (hours < 1) return lang === "nl" ? "<1 uur" : "<1 hour";
    if (hours === 1) return lang === "nl" ? "1 uur" : "1 hour";
    return lang === "nl" ? `${hours} uur` : `${hours} hours`;
  };

  return (
    <Alert variant="destructive" className="border-destructive/50 bg-destructive/10 text-destructive [&>svg]:text-destructive flex items-center gap-3 py-3 px-4 [&>svg]:static [&>svg]:translate-y-0 [&>svg~*]:pl-0">
      <AlertTriangle className="h-5 w-5 shrink-0" />
      <AlertDescription className="text-xs leading-normal">
        <span className="font-semibold">
          {lang === "nl"
            ? `${staleModels.length} ${staleModels.length === 1 ? "model" : "modellen"} verouderd: `
            : `${staleModels.length} stale ${staleModels.length === 1 ? "model" : "models"}: `}
        </span>
        {staleModels.map((m, i) => (
          <span key={m.name} className="font-mono">
            {i > 0 && <span className="text-muted-foreground/50"> | </span>}
            <span className="inline-flex items-center">
              <ModelInfoDialog modelId={m.id} modelName={m.name}>
                <button className="font-semibold text-destructive hover:underline cursor-pointer">{m.name}</button>
              </ModelInfoDialog>
            </span>
            <span className="text-muted-foreground">
              {" "}– {formatAge(m.ageHours)} {lang === "nl" ? "geleden" : "ago"}
            </span>
          </span>
        ))}
      </AlertDescription>
    </Alert>
  );
}
