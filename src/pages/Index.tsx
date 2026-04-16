import { Link } from "react-router-dom";
import { getModelsByGroup } from "@/lib/weatherModels";
import { useThemedLogo } from "@/hooks/useThemedLogo";
import { ModelCard } from "@/components/ModelCard";
import type { ElementView } from "@/components/ModelCard";
import { SortableModelGrid } from "@/components/SortableModelGrid";
import { GroupSummary } from "@/components/GroupSummary";
import { AvailabilityGauge } from "@/components/AvailabilityGauge";
import { CompactView } from "@/components/CompactView";
import { StaleModelsAlert } from "@/components/StaleModelsAlert";
import { Activity, RefreshCw, Loader2, Sparkles, ChevronDown, LayoutList, Star, Thermometer, CloudRain, Wind, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { useWeatherModels } from "@/hooks/useWeatherModels";
import { ATMOSPHERE_ELEMENTS } from "@/lib/imweatherApi";
import { useSettings } from "@/lib/appSettings";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateModelsCache } from "@/lib/imweatherApi";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { updateAndGetNoProgressModels } from "@/lib/modelStatusTracker";
import { NoProgressAlert } from "@/components/NoProgressAlert";
import { ChangelogDialog } from "@/components/ChangelogDialog";

type GroupKey = "atmosphere" | "wave" | "air-quality" | "ocean";

function LiveIndicator({ isLoading, isError, hasData, errorLabel }: { isLoading: boolean; isError: boolean; hasData: boolean; errorLabel: string }) {
  if (isLoading) return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
  if (isError) return <span className="text-[10px] text-destructive font-mono">{errorLabel}</span>;
  if (hasData) return <span className="text-[10px] text-success font-mono">● live</span>;
  return null;
}

const Index = () => {
  const logo = useThemedLogo();
  const { t, lang, setLang } = useI18n();
  const { settings, updateSettings } = useSettings();
  const showBeta = settings.showBeta;
  type ViewMode = "detail" | "compact" | "favorites";
  const [viewMode, setViewMode] = useState<ViewMode>(settings.showFavoritesOnly ? "favorites" : "detail");
  const [activeTab, setActiveTab] = useState<GroupKey>("atmosphere");
  const [atmosphereElement, setAtmosphereElement] = useState<ElementView | undefined>(undefined);

  const atmosphere = useWeatherModels("atmosphere", undefined, settings.refreshInterval);
  const atmospherePrecip = useWeatherModels("atmosphere", ATMOSPHERE_ELEMENTS.find(e => e.key === "precipitation"), settings.refreshInterval);
  const atmosphereWind = useWeatherModels("atmosphere", ATMOSPHERE_ELEMENTS.find(e => e.key === "windspeed"), settings.refreshInterval);
  const wave = useWeatherModels("wave", undefined, settings.refreshInterval);
  const airQuality = useWeatherModels("air-quality", undefined, settings.refreshInterval);
  const ocean = useWeatherModels("ocean", undefined, settings.refreshInterval);

  const atmosphereModels = atmosphere.data ?? getModelsByGroup("atmosphere");
  const waveModels = wave.data ?? getModelsByGroup("wave");
  const airQualityModels = airQuality.data ?? getModelsByGroup("air-quality");
  const oceanModels = ocean.data ?? getModelsByGroup("ocean");

  const atmospherePrecipModels = atmospherePrecip.data ?? [];
  const atmosphereWindModels = atmosphereWind.data ?? [];

  const anyLoading = atmosphere.isLoading || wave.isLoading || airQuality.isLoading || ocean.isLoading;
  const allModels = useMemo(() => [...atmosphereModels, ...waveModels, ...airQualityModels, ...oceanModels], [atmosphereModels, waveModels, airQualityModels, oceanModels]);

  const [lastRefresh, setLastRefresh] = useState(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" }) + " UTC");
  const queryClient = useQueryClient();

  const { noProgress: noProgressModels, totalTracked } = useMemo(() => {
    if (anyLoading) return { noProgress: [], totalTracked: 0 };
    return updateAndGetNoProgressModels(allModels, showBeta, settings.criticalPct);
  }, [allModels, showBeta, anyLoading, lastRefresh, settings.criticalPct]);


  const handleRefresh = () => {
    invalidateModelsCache();
    queryClient.removeQueries({ queryKey: ["weather-models"] });
    queryClient.removeQueries({ queryKey: ["single-model"] });
    queryClient.invalidateQueries();
    setLastRefresh(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" }) + " UTC");
  };

  

  const tabGroups: { key: GroupKey; label: string; models: typeof atmosphereModels; query: typeof atmosphere; cols: string }[] = [
    { key: "atmosphere", label: t("atmosphere"), models: atmosphereModels, query: atmosphere, cols: "md:grid-cols-2 xl:grid-cols-4" },
    { key: "wave", label: t("wave"), models: waveModels, query: wave, cols: "md:grid-cols-2 xl:grid-cols-4" },
    { key: "air-quality", label: t("airQuality"), models: airQualityModels, query: airQuality, cols: "md:grid-cols-2 xl:grid-cols-3" },
    { key: "ocean", label: t("ocean"), models: oceanModels, query: ocean, cols: "md:grid-cols-2 xl:grid-cols-3" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="IMWeather Watcher" className="h-8 rounded" />
            <span className="rounded border border-orange-400/50 bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase text-orange-500">beta</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <div className="flex items-center rounded-md border bg-muted/50 p-0.5">
              <button
                onClick={() => setLang("nl")}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                  lang === "nl" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                NL
              </button>
              <button
                onClick={() => setLang("en")}
                className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
                  lang === "en" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                EN
              </button>
            </div>
            {!anyLoading && (atmosphere.data || wave.data || airQuality.data || ocean.data) && (
              <span className="rounded border border-success/50 bg-success/15 px-1.5 py-0.5 text-[9px] font-mono font-semibold uppercase text-success">
                ● live
              </span>
            )}
            {anyLoading && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            )}
            <SettingsDialog />
            <Link to="/domains" className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors" title="Modeldomeinen">
              <Map className="h-4 w-4" />
            </Link>
            <span className="font-mono text-[10px] text-muted-foreground">
              {t("lastUpdate")}: {lastRefresh}
            </span>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleRefresh}>
              <RefreshCw className={`h-3 w-3 ${anyLoading ? "animate-spin" : ""}`} />
              {t("refresh")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <StaleModelsAlert
          models={allModels}
          showBeta={showBeta}
          staleFactor={settings.staleFactor}
        />
        <NoProgressAlert models={noProgressModels} totalTracked={totalTracked} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <AvailabilityGauge models={[...atmosphereModels, ...waveModels, ...airQualityModels, ...oceanModels]} showBeta={showBeta} atmosphereModels={atmosphereModels} atmospherePrecipModels={atmospherePrecipModels} atmosphereWindModels={atmosphereWindModels} waveModels={waveModels} airQualityModels={airQualityModels} oceanModels={oceanModels} />
          <GroupSummary group="atmosphere" models={atmosphereModels} showBeta={showBeta} />
          <GroupSummary group="wave" models={waveModels} showBeta={showBeta} />
          <GroupSummary group="air-quality" models={airQualityModels} showBeta={showBeta} />
          <GroupSummary group="ocean" models={oceanModels} showBeta={showBeta} />
        </div>

        {/* Shared sticky navbar for all views */}
        <div className="sticky top-14 z-[9] bg-background/95 backdrop-blur-sm border-b -mx-[2rem] px-[2rem] py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 bg-muted rounded-md p-1">
              <Button
                variant={viewMode === "detail" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setViewMode("detail")}
              >
                Detail
              </Button>
              <Button
                variant={viewMode === "compact" ? "default" : "ghost"}
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setViewMode("compact")}
              >
                <LayoutList className="h-3 w-3" />
                Compact
              </Button>
              {settings.favorites && settings.favorites.length > 0 && (
                <Button
                  variant={viewMode === "favorites" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setViewMode("favorites")}
                >
                  <Star className={cn("h-3 w-3", viewMode === "favorites" ? "fill-primary-foreground" : "fill-yellow-400 text-yellow-400")} />
                  {t("favorites")} ({settings.favorites.length})
                </Button>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="font-medium">{t("legend")}:</span>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm bg-success" />
                <span>{t("available")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm bg-destructive/70" />
                <span>{t("missing")}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-sm bg-muted-foreground/30" />
                <span>{lang === "nl" ? "Niet in gebruik" : "Not in use"}</span>
              </div>
            </div>
          </div>

          {/* Group tabs only in detail view */}
          {viewMode === "detail" && (
            <div className="flex items-center gap-3">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as GroupKey)}>
                <TabsList>
                  {tabGroups.map(({ key, label }) => (
                    <TabsTrigger key={key} value={key} className="text-xs">
                      {label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              {activeTab === "atmosphere" && (
                <div className="flex items-center gap-0.5 rounded-md border bg-muted/50 p-0.5">
                  {([
                    { key: undefined as ElementView | undefined, icon: Thermometer, title: t("elementTemperature2m") },
                    { key: "precipitation" as ElementView | undefined, icon: CloudRain, title: t("elementPrecipitation") },
                    { key: "windspeed" as ElementView | undefined, icon: Wind, title: t("elementWindspeed") },
                  ] as const).map(({ key, icon: Icon, title }) => (
                    <button
                      key={key ?? "default"}
                      onClick={() => setAtmosphereElement(atmosphereElement === key ? undefined : key)}
                      className={cn(
                        "p-1 rounded transition-colors",
                        atmosphereElement === key
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title={title}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* View content */}
        {viewMode === "compact" && (
          <CompactView
            models={allModels}
            showBeta={showBeta}
            onModelClick={(model) => {
              setActiveTab(model.group as GroupKey);
              setViewMode("detail");
              setTimeout(() => {
                const el = document.getElementById(`model-${model.id}`);
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "center" });
                  const runs = [...model.runs].sort((a, b) => b.date.localeCompare(a.date) || parseInt(b.runTime) - parseInt(a.runTime));
                  const latest = runs[0];
                  let ringColor = "ring-muted-foreground/30";
                  if (latest && latest.timeSteps.length > 0) {
                    const pct = (latest.timeSteps.filter(s => s.available).length / latest.timeSteps.length) * 100;
                    if (pct >= settings.criticalPct) ringColor = "ring-success/50";
                    else if (pct >= 40) ringColor = "ring-warning/50";
                    else ringColor = "ring-destructive/50";
                  }
                  el.classList.add("ring-2", ringColor);
                  setTimeout(() => el.classList.remove("ring-2", ringColor), 3000);
                }
              }, 100);
            }}
          />
        )}

        {viewMode === "favorites" && (
          <div className="space-y-4 mt-4">
            {(() => {
              const favoriteModels = allModels.filter(m => (showBeta || !m.beta) && settings.favorites?.includes(m.id));
              if (favoriteModels.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                    <Star className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm">{t("noFavorites")}</p>
                  </div>
                );
              }
              return (
                <SortableModelGrid
                  models={favoriteModels}
                  cols="md:grid-cols-2 xl:grid-cols-4"
                  storageKey="favorites"
                />
              );
            })()}
          </div>
        )}

        {viewMode === "detail" && (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as GroupKey)}>
            {tabGroups.map(({ key, models, cols }) => {
              const regularModels = models.filter(m => (showBeta || !m.beta) && !m.ai);
              const aiModels = key === "atmosphere" ? models.filter(m => m.ai && (showBeta || !m.beta)) : [];

              return (
                <TabsContent key={key} value={key} className="mt-4">
                  <SortableModelGrid
                    models={regularModels}
                    cols={cols}
                    storageKey={key}
                    elementOverride={key === "atmosphere" ? atmosphereElement : undefined}
                  />

                  {aiModels.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center gap-2 w-full rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <span className="text-sm font-semibold text-primary">{t("aiModels")}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{aiModels.length} {t("models")}</span>
                      </div>
                      <SortableModelGrid
                        models={aiModels}
                        cols={cols}
                        storageKey={`${key}-ai`}
                        elementOverride={key === "atmosphere" ? atmosphereElement : undefined}
                      />
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </main>

      <footer className="border-t py-3">
        <div className="container flex justify-end items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-mono">
            An Infoplaza – I'm Weather product © 2026
          </span>
          <span className="text-muted-foreground/30">·</span>
          <ChangelogDialog />
        </div>
      </footer>
    </div>
  );
};

export default Index;
