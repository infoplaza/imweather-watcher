import { createContext, useContext, useState, type ReactNode } from "react";

export type Lang = "nl" | "en";

const translations = {
  nl: {
    dataPipelineStatus: "Data Pipeline Status",
    lastUpdate: "Laatste update",
    refresh: "Vernieuwen",
    legend: "Legenda",
    available: "Beschikbaar",
    missing: "Ontbreekt",
    atmosphere: "Atmosfeer",
    wave: "Golf",
    airQuality: "Luchtkwaliteit",
    ocean: "Oceaan",
    temperature: "Temperatuur",
    significantWaveHeight: "Significante golfhoogte",
    airQualityIndex: "Air Quality Index",
    seaSurfaceTemp: "Zeewatertemperatuur",
    models: "modellen",
    runsComplete: "runs compleet",
    issues: "issues",
    statusComplete: "Compleet",
    statusPartial: "Onvolledig",
    statusMissing: "Ontbreekt",
    statusProcessing: "Bezig...",
    statusFailed: "Mislukt",
    apiFallback: "API fout — fallback data",
    atmosphereLabel: "Atmosfeer",
    waveLabel: "Golf — Significante golfhoogte (Hs)",
    airQualityLabel: "Luchtkwaliteit — Air Quality Index",
    oceanLabel: "Oceaan — Zeewatertemperatuur (SST)",
    temperatureLabel: "Temperatuur (2m)",
    precipitationLabel: "Neerslag",
    elementTemperature2m: "Temperatuur (2m)",
    elementPrecipitation: "Neerslag",
    elementSignificantWaveHeight: "Significante golfhoogte (Hs)",
    elementAirQualityIndex: "Air Quality Index",
    elementSeaSurfaceTemp: "Zeewatertemperatuur (SST)",
    elementWindspeed: "Windsnelheid (10m)",
    allRunsComplete: "Alle runs zijn compleet",
    latestRun: "Laatste run",
    showMoreRuns: "Toon meer runs",
    showLessRuns: "Toon minder runs",
    dataAvailability: "Databeschikbaarheid",
    showBeta: "Toon beta modellen",
    aiModels: "AI Modellen",
    ensembleModels: "Ensemble modellen",
    favorites: "Favorieten",
    showFavoritesOnly: "Alleen favorieten",
    noFavorites: "Geen favorieten geselecteerd. Klik op de ster bij een model om het als favoriet te markeren.",
    testElementsPerGroup: "Test-elementen per groep",
    tooltipExcluded: "N.v.t.",
    tooltipAvailable: "Beschikbaar",
    tooltipMissing: "Ontbreekt",
    tooltipClickForMap: "Klik voor kaart",
    modelDomains: "Modeldomeinen",
    loading: "Laden...",
    hoverToShowDomain: "hover om domein te tonen",
    category: "Categorie",
    region: "Regio",
    resolution: "Resolutie",
    domainLabel: "Domein",
    loadingStatus: "Laden status...",
    noRunData: "Geen rundata beschikbaar",
    notMonitored: "Dit model wordt niet gemonitord",
    notInUse: "Niet in gebruik",
    modelInfo: "Model informatie",
    errorLoadingModelInfo: "Fout bij ophalen modelinformatie.",
    latestInfo: "Laatste info",
    progress: "Voortgang",
    lastChange: "Laatste wijziging",
    lastCheck: "Laatste check",
    noStatusData: "Nog geen statusdata beschikbaar",
    generalInfo: "Algemene info",
    institute: "Instituut",
    type: "Type",
    availableRuns: "Beschikbare runs",
    forecastTimeline: "Voorspellingstijdlijn",
    upTo: "Tot",
    ahead: "vooruit",
    day: "dag",
    days: "dagen",
    everyHour: "elk uur",
    everyNHours: "elke {n} uur",
    steps: "stappen",
    totalTimesteps: "Totaal: {n} tijdstappen",
    shareOverview: "Deel overzicht",
    imageCopiedConfirm: "Afbeelding gekopieerd naar klembord.\nWil je het ook downloaden?",
    allElementsComplete: "Alle elementen compleet",
    elementsOk: "elements OK",
    withIssues: "met issues",
    changelog: "Changelog",
  },
  en: {
    dataPipelineStatus: "Data Pipeline Status",
    lastUpdate: "Last update",
    refresh: "Refresh",
    legend: "Legend",
    available: "Available",
    missing: "Missing",
    atmosphere: "Atmosphere",
    wave: "Wave",
    airQuality: "Air Quality",
    ocean: "Ocean",
    temperature: "Temperature",
    significantWaveHeight: "Significant wave height",
    airQualityIndex: "Air Quality Index",
    seaSurfaceTemp: "Sea surface temperature",
    models: "models",
    runsComplete: "runs complete",
    issues: "issues",
    statusComplete: "Complete",
    statusPartial: "Incomplete",
    statusMissing: "Missing",
    statusProcessing: "Processing...",
    statusFailed: "Failed",
    apiFallback: "API error — fallback data",
    atmosphereLabel: "Atmosphere",
    waveLabel: "Wave — Significant wave height (Hs)",
    airQualityLabel: "Air Quality — Air Quality Index",
    oceanLabel: "Ocean — Sea surface temperature (SST)",
    temperatureLabel: "Temperature (2m)",
    precipitationLabel: "Precipitation",
    elementTemperature2m: "Temperature (2m)",
    elementPrecipitation: "Precipitation",
    elementSignificantWaveHeight: "Significant wave height (Hs)",
    elementAirQualityIndex: "Air Quality Index",
    elementSeaSurfaceTemp: "Sea surface temperature (SST)",
    elementWindspeed: "Wind speed (10m)",
    allRunsComplete: "All runs are complete",
    latestRun: "Latest run",
    dataAvailability: "Data Availability",
    showBeta: "Show beta models",
    showMoreRuns: "Show more runs",
    showLessRuns: "Show fewer runs",
    aiModels: "AI Models",
    ensembleModels: "Ensemble models",
    favorites: "Favorites",
    showFavoritesOnly: "Favorites only",
    noFavorites: "No favorites selected. Click the star on a model to mark it as a favorite.",
    testElementsPerGroup: "Test elements per group",
    tooltipExcluded: "N/A",
    tooltipAvailable: "Available",
    tooltipMissing: "Missing",
    tooltipClickForMap: "Click for map",
    modelDomains: "Model Domains",
    loading: "Loading...",
    hoverToShowDomain: "hover to show domain",
    category: "Category",
    region: "Region",
    resolution: "Resolution",
    domainLabel: "Domain",
    loadingStatus: "Loading status...",
    noRunData: "No run data available",
    notMonitored: "This model is not monitored",
    notInUse: "Not in use",
    modelInfo: "Model information",
    errorLoadingModelInfo: "Error loading model information.",
    latestInfo: "Latest info",
    progress: "Progress",
    lastChange: "Last change",
    lastCheck: "Last check",
    noStatusData: "No status data available yet",
    generalInfo: "General info",
    institute: "Institute",
    type: "Type",
    availableRuns: "Available runs",
    forecastTimeline: "Forecast timeline",
    upTo: "Up to",
    ahead: "ahead",
    day: "day",
    days: "days",
    everyHour: "every hour",
    everyNHours: "every {n} hours",
    steps: "steps",
    totalTimesteps: "Total: {n} timesteps",
    shareOverview: "Share overview",
    imageCopiedConfirm: "Image copied to clipboard.\nDo you also want to download it?",
    allElementsComplete: "All elements complete",
    elementsOk: "elements OK",
    withIssues: "with issues",
    changelog: "Changelog",
  },
} as const;

export type TranslationKey = keyof typeof translations.nl;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem("imw-lang");
    return (stored === "en" || stored === "nl") ? stored : "nl";
  });

  const setLangAndStore = (l: Lang) => {
    setLang(l);
    localStorage.setItem("imw-lang", l);
  };

  const t = (key: TranslationKey): string => translations[lang][key];

  return (
    <I18nContext.Provider value={{ lang, setLang: setLangAndStore, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
