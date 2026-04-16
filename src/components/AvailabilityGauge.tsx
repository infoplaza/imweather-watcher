import type { WeatherModel } from "@/lib/weatherModels";
import { useI18n } from "@/lib/i18n";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface AvailabilityGaugeProps {
  models: WeatherModel[];
  showBeta?: boolean;
  atmosphereModels?: WeatherModel[];
  atmospherePrecipModels?: WeatherModel[];
  atmosphereWindModels?: WeatherModel[];
  waveModels?: WeatherModel[];
  airQualityModels?: WeatherModel[];
  oceanModels?: WeatherModel[];
}

function MiniGauge({ models, label }: { models: WeatherModel[]; label: string }) {
  const stats = computeStats(models);
  const { pct } = stats;
  const radius = 22;
  const stroke = 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 90 ? "text-success" : pct >= 70 ? "text-warning" : "text-destructive";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-[56px] w-[56px]">
        <svg viewBox="0 0 52 52" className="h-full w-full -rotate-90">
          <circle cx="26" cy="26" r={radius} fill="none" strokeWidth={stroke} className="stroke-muted" />
          <circle
            cx="26" cy="26" r={radius} fill="none" strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            className={`${color} transition-all duration-700`} style={{ stroke: "currentColor" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-mono text-xs font-bold ${color}`}>{pct}%</span>
        </div>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

function MiniGaugeFromStats({ stats, label }: { stats: ReturnType<typeof computeStats>; label: string }) {
  const { pct } = stats;
  const radius = 22;
  const stroke = 4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 90 ? "text-success" : pct >= 70 ? "text-warning" : "text-destructive";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-[56px] w-[56px]">
        <svg viewBox="0 0 52 52" className="h-full w-full -rotate-90">
          <circle cx="26" cy="26" r={radius} fill="none" strokeWidth={stroke} className="stroke-muted" />
          <circle
            cx="26" cy="26" r={radius} fill="none" strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            className={`${color} transition-all duration-700`} style={{ stroke: "currentColor" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-mono text-xs font-bold ${color}`}>{pct}%</span>
        </div>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

function computeStats(models: WeatherModel[]) {
  let totalSteps = 0;
  let availableSteps = 0;
  let totalRuns = 0;
  models.forEach((m) => {
    const sorted = [...m.runs].sort(
      (a, b) => b.date.localeCompare(a.date) || parseInt(b.runTime) - parseInt(a.runTime)
    );
    const latestRun = sorted[0];
    if (!latestRun) return;
    totalRuns++;
    const countable = latestRun.timeSteps.filter(s => !s.excluded);
    totalSteps += countable.length;
    availableSteps += countable.filter((s) => s.available).length;
  });
  const pct = totalSteps > 0 ? Math.round((availableSteps / totalSteps) * 100) : 0;
  return { totalSteps, availableSteps, totalRuns, pct, modelCount: models.length };
}

function computeCombinedStats(modelSets: WeatherModel[][]) {
  let totalSteps = 0;
  let availableSteps = 0;
  let totalRuns = 0;
  const modelCount = new Set(modelSets.flatMap(set => set.map(m => m.id))).size;
  modelSets.forEach(models => {
    const s = computeStats(models);
    totalSteps += s.totalSteps;
    availableSteps += s.availableSteps;
    totalRuns += s.totalRuns;
  });
  const pct = totalSteps > 0 ? Math.round((availableSteps / totalSteps) * 100) : 0;
  return { totalSteps, availableSteps, totalRuns, pct, modelCount };
}

export function AvailabilityGauge({ models, showBeta = false, atmosphereModels = [], atmospherePrecipModels = [], atmosphereWindModels = [], waveModels = [], airQualityModels = [], oceanModels = [] }: AvailabilityGaugeProps) {
  const { t } = useI18n();

  const productionModels = models.filter(m => !m.beta);
  const betaModels = models.filter(m => m.beta);
  const visibleModels = showBeta ? models : productionModels;

  const stats = computeStats(visibleModels);
  const { pct } = stats;

  const radius = 40;
  const stroke = 7;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const color =
    pct >= 90 ? "text-success" : pct >= 70 ? "text-warning" : "text-destructive";

  const gauge = (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4 cursor-pointer transition-colors hover:bg-muted/50 overflow-hidden min-w-0">
      <div className="relative h-[80px] w-[80px] shrink-0">
        <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
          <circle cx="48" cy="48" r={radius} fill="none" strokeWidth={stroke} className="stroke-muted" />
          <circle
            cx="48" cy="48" r={radius} fill="none" strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            className={`${color} transition-all duration-700`} style={{ stroke: "currentColor" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono text-lg font-bold ${color}`}>{pct}%</span>
        </div>
      </div>
      <div className="space-y-1 min-w-0">
        <h3 className="text-sm font-semibold truncate">{t("dataAvailability")}</h3>
        <p className="font-mono text-xs text-muted-foreground truncate">
          {stats.availableSteps.toLocaleString()} / {stats.totalSteps.toLocaleString()} steps
        </p>
        <p className="text-[10px] text-muted-foreground/70 truncate">Latest run · primary element</p>
      </div>
    </div>
  );

  const prodStats = computeStats(productionModels);
  const betaStats = showBeta ? computeStats(betaModels) : null;

  return (
    <Dialog>
      <DialogTrigger asChild>{gauge}</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("dataAvailability")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex justify-center">
            <div className="relative h-[120px] w-[120px]">
              <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
                <circle cx="48" cy="48" r={radius} fill="none" strokeWidth={stroke} className="stroke-muted" />
                <circle
                  cx="48" cy="48" r={radius} fill="none" strokeWidth={stroke}
                  strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
                  className={`${color} transition-all duration-700`} style={{ stroke: "currentColor" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-mono text-2xl font-bold ${color}`}>{pct}%</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">Based on the latest run per model, using the primary element only.</p>

          {/* Per-group mini-gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MiniGaugeFromStats
              stats={computeCombinedStats([
                showBeta ? atmosphereModels : atmosphereModels.filter(m => !m.beta),
                showBeta ? atmospherePrecipModels : atmospherePrecipModels.filter(m => !m.beta),
                showBeta ? atmosphereWindModels : atmosphereWindModels.filter(m => !m.beta),
              ])}
              label="Atmosphere"
            />
            <MiniGauge models={showBeta ? waveModels : waveModels.filter(m => !m.beta)} label="Wave" />
            <MiniGauge models={showBeta ? airQualityModels : airQualityModels.filter(m => !m.beta)} label="Air Quality" />
            <MiniGauge models={showBeta ? oceanModels : oceanModels.filter(m => !m.beta)} label="Ocean" />
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Production</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="font-mono text-lg font-bold">{prodStats.modelCount}</p>
                <p className="text-xs text-muted-foreground">{t("models")}</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="font-mono text-lg font-bold">{prodStats.totalRuns}</p>
                <p className="text-xs text-muted-foreground">runs</p>
              </div>
            </div>
            <div className="rounded-lg border p-3 text-center mt-3">
              <p className="font-mono text-lg font-bold">{prodStats.totalSteps.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total timesteps</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="font-mono text-lg font-bold text-success">{prodStats.availableSteps.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{t("available")}</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="font-mono text-lg font-bold text-destructive">{(prodStats.totalSteps - prodStats.availableSteps).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{t("missing")}</p>
              </div>
            </div>
          </div>

          {/* Footnote: test elements per group */}
          <div>
            <Separator className="mb-3" />
            <p className="text-[10px] text-muted-foreground/60 font-medium mb-1">{t("testElementsPerGroup")}:</p>
            <ul className="text-[10px] text-muted-foreground/60 space-y-0.5 list-none pl-0">
              <li>· Atmosphere: {t("elementTemperature2m")}, {t("elementPrecipitation")}, {t("elementWindspeed")}</li>
              <li>· Wave: {t("elementSignificantWaveHeight")}</li>
              <li>· Air Quality: {t("elementAirQualityIndex")}</li>
              <li>· Ocean: {t("elementSeaSurfaceTemp")}</li>
            </ul>
          </div>

          {betaStats && betaModels.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                Beta
                <span className="rounded border border-orange-400/50 bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase text-orange-500">beta</span>
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-dashed p-3 text-center">
                  <p className="font-mono text-lg font-bold">{betaStats.modelCount}</p>
                  <p className="text-xs text-muted-foreground">{t("models")}</p>
                </div>
                <div className="rounded-lg border border-dashed p-3 text-center">
                  <p className="font-mono text-lg font-bold">{betaStats.totalRuns}</p>
                  <p className="text-xs text-muted-foreground">runs</p>
                </div>
              </div>
              <div className="rounded-lg border border-dashed p-3 text-center mt-3">
                <p className="font-mono text-lg font-bold">{betaStats.totalSteps.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total timesteps</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="rounded-lg border border-dashed p-3 text-center">
                  <p className="font-mono text-lg font-bold text-success">{betaStats.availableSteps.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{t("available")}</p>
                </div>
                <div className="rounded-lg border border-dashed p-3 text-center">
                  <p className="font-mono text-lg font-bold text-destructive">{(betaStats.totalSteps - betaStats.availableSteps).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{t("missing")}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
