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
    favorites: "Favorieten",
    showFavoritesOnly: "Alleen favorieten",
    noFavorites: "Geen favorieten geselecteerd. Klik op de ster bij een model om het als favoriet te markeren.",
    testElementsPerGroup: "Test-elementen per groep",
    tooltipExcluded: "N.v.t.",
    tooltipAvailable: "Beschikbaar",
    tooltipMissing: "Ontbreekt",
    tooltipClickForMap: "Klik voor kaart",
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
    showLessRuns: "Show less runs",
    aiModels: "AI Models",
    favorites: "Favorites",
    showFavoritesOnly: "Favorites only",
    noFavorites: "No favorites selected. Click the star on a model to mark it as a favorite.",
    testElementsPerGroup: "Test elements per group",
    tooltipExcluded: "N/A",
    tooltipAvailable: "Available",
    tooltipMissing: "Missing",
    tooltipClickForMap: "Click for map",
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
