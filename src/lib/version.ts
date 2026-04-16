export const APP_VERSION = "1.0.1";

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0.1",
    date: "2026-04-10",
    changes: [
      "Nieuwe pagina: Modeldomeinen (/domains) — interactieve kaart met alle modeldomeinen",
      "Alfabetische modellijst met klik-to-highlight en fly-to-bounds",
      "Globale modellen subtiel op de achtergrond, regionale modellen prominent",
      "Categoriefilters (Atmosfeer, Golf, Luchtkwaliteit, Oceaan) in de header",
      "Domeinkaart link toegevoegd aan het hoofddashboard",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-04-10",
    changes: [
      "Versiebeheer en changelog toegevoegd",
      "DWD AICON model toegevoegd (AI-model, T+180u/T+120u)",
      "ICON-D2 RUC model toegevoegd",
      "stepRangesByRunHour voor ICON Global en DWD AICON (06Z/18Z → korter bereik)",
      "Forecast-matching fix voor modellen met niet-ronde runtimes (Optimal)",
    ],
  },
];
