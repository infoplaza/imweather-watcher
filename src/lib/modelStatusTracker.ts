import type { WeatherModel } from "@/lib/weatherModels";

const STORAGE_KEY = "imw-model-status";
const CHECKED_KEY = "imw-model-status-checked";

export const STALE_MINUTES = 20;

export interface ModelStatusEntry {
  runKey: string;
  availableCount: number;
  totalSteps: number;
  modelName: string;
  lastChangedAt: string; // ISO UTC
}

type StatusMap = Record<string, ModelStatusEntry>;

export interface NoProgressModel {
  id: string;
  name: string;
  lastChangedAt: string; // ISO UTC
  availabilityPct: number;
}

export function loadStatusMap(): StatusMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStatusMap(map: StatusMap) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function getLatestRun(model: WeatherModel) {
  const sorted = [...model.runs].sort(
    (a, b) => b.date.localeCompare(a.date) || parseInt(b.runTime) - parseInt(a.runTime)
  );
  return sorted[0] ?? null;
}

export function updateAndGetNoProgressModels(
  models: WeatherModel[],
  showBeta: boolean,
  criticalPct: number = 80
): { noProgress: NoProgressModel[]; totalTracked: number } {
  const map = loadStatusMap();
  const now = new Date().toISOString();
  const nowMs = Date.now();
  const results: NoProgressModel[] = [];
  let totalTracked = 0;
  const activeIds = new Set<string>();

  for (const model of models) {
    if (!showBeta && model.beta) continue;

    activeIds.add(model.id);
    totalTracked++;
    const run = getLatestRun(model);
    if (!run) continue;

    const activeSteps = run.timeSteps.filter(s => !s.excluded);
    if (activeSteps.length === 0) continue;

    const availableCount = activeSteps.filter(s => s.available).length;
    const availabilityPct = (availableCount / activeSteps.length) * 100;
    const runKey = `${run.date}|${run.runTime}`;

    const existing = map[model.id];

    if (!existing || existing.runKey !== runKey || existing.availableCount !== availableCount) {
      // Something changed — update
      map[model.id] = { runKey, availableCount, totalSteps: activeSteps.length, modelName: model.name, lastChangedAt: now };
    } else {
      // No change — check staleness
      const minutesSinceChange = (nowMs - new Date(existing.lastChangedAt).getTime()) / 60000;
      if (minutesSinceChange > 30 && availabilityPct < criticalPct) {
        results.push({
          id: model.id,
          name: model.name,
          lastChangedAt: existing.lastChangedAt,
          availabilityPct: Math.round(availabilityPct),
        });
      }
    }
  }

  // Remove models that no longer exist
  for (const key of Object.keys(map)) {
    if (!activeIds.has(key)) delete map[key];
  }

  saveStatusMap(map);
  localStorage.setItem(CHECKED_KEY, new Date().toISOString());
  return { noProgress: results, totalTracked };
}

export function getLastCheckedAt(): string | null {
  return localStorage.getItem(CHECKED_KEY);
}
