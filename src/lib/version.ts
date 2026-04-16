export const APP_VERSION = "1.0.1";

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: { nl: string; en: string }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0.1",
    date: "2026-04-10",
    changes: [
      { nl: "Nieuwe pagina: Modeldomeinen (/domains) — interactieve kaart met alle modeldomeinen", en: "New page: Model Domains (/domains) — interactive map with all model domains" },
      { nl: "Alfabetische modellijst met klik-to-highlight en fly-to-bounds", en: "Alphabetical model list with click-to-highlight and fly-to-bounds" },
      { nl: "Globale modellen subtiel op de achtergrond, regionale modellen prominent", en: "Global models subtle in background, regional models prominent" },
      { nl: "Categoriefilters (Atmosfeer, Golf, Luchtkwaliteit, Oceaan) in de header", en: "Category filters (Atmosphere, Wave, Air Quality, Ocean) in the header" },
      { nl: "Domeinkaart link toegevoegd aan het hoofddashboard", en: "Domain map link added to the main dashboard" },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-04-10",
    changes: [
      { nl: "Versiebeheer en changelog toegevoegd", en: "Version management and changelog added" },
      { nl: "DWD AICON model toegevoegd (AI-model, T+180u/T+120u)", en: "DWD AICON model added (AI model, T+180h/T+120h)" },
      { nl: "ICON-D2 RUC model toegevoegd", en: "ICON-D2 RUC model added" },
      { nl: "stepRangesByRunHour voor ICON Global en DWD AICON (06Z/18Z → korter bereik)", en: "stepRangesByRunHour for ICON Global and DWD AICON (06Z/18Z → shorter range)" },
      { nl: "Forecast-matching fix voor modellen met niet-ronde runtimes (Optimal)", en: "Forecast-matching fix for models with non-round runtimes (Optimal)" },
    ],
  },
];
