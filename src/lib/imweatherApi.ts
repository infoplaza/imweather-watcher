import type { WeatherModel, ModelRun, TimeStep } from "./weatherModels";
import { loadStatusMap } from "./modelStatusTracker";

const API_BASE = "https://api.imweather.com/v0/gridmapdata";

// ─── Model metadata per group ────────────────────────────────────────────────
interface StepRange {
  fromHour: number;
  toHour: number;
  stepSize: number;
}

interface ModelMeta {
  name: string;
  group: "atmosphere" | "wave" | "air-quality" | "ocean";
  testElement: string;
  resolution: string;
  source: string;
  /** Default step ranges used for all runs unless overridden by stepRangesByRunHour */
  stepRanges: StepRange[];
  /** Optional: override stepRanges for specific run hours (e.g. "03" for 03Z, "15" for 15Z) */
  stepRangesByRunHour?: Record<string, StepRange[]>;
  beta?: boolean;
  ai?: boolean;
  ensemble?: boolean;
  /** Override the model ID used in API calls (e.g. "=ecmwfensemblebenelux" for ensemble models) */
  apiId?: string;
  /** If true, different runs of this model may have different forecast lengths (e.g. ECMWF 06Z/18Z are shorter). The actual length is inferred from API data. */
  variableRunLength?: boolean;
  /** First forecast hour that contains actual data (default: 1). Hours before this are excluded (grey). */
  firstForecastHour?: number;
  apiElement: string;
  apiLevel?: string;
  imweather: { model: string; element: string; level: string };
}

/** Get the API model ID (handles ensemble = prefix etc.) */
export function getApiId(modelId: string): string {
  const meta = MODEL_META[modelId];
  return meta?.apiId ?? modelId;
}

/** Generate expected forecast hours from step ranges */
function generateExpectedHours(stepRanges: StepRange[]): number[] {
  const hours = new Set<number>();
  for (const range of stepRanges) {
    const start = range === stepRanges[0] ? range.fromHour : range.fromHour + range.stepSize;
    for (let h = start; h <= range.toHour; h += range.stepSize) {
      hours.add(h);
    }
  }
  return [...hours].sort((a, b) => a - b);
}

/** Shorthand: single constant step size */
function uniform(maxHour: number, step: number): StepRange[] {
  return [{ fromHour: 0, toHour: maxHour, stepSize: step }];
}

function getStepRangesForRuntime(meta: ModelMeta, runtime: number): StepRange[] {
  if (meta.stepRangesByRunHour) {
    const runHour = String(new Date(runtime * 1000).getUTCHours()).padStart(2, "0");
    if (meta.stepRangesByRunHour[runHour]) {
      return meta.stepRangesByRunHour[runHour];
    }
  }
  return meta.stepRanges;
}

// No inference — availability is strictly based on tileurl presence in the API response.

// Element options per group for toggling test elements
export interface ElementOption {
  key: string;
  label: string;
  apiElement: string;
  apiLevel?: string;
  testElement: string;
}

export const ATMOSPHERE_ELEMENTS: ElementOption[] = [
  { key: "temperature", label: "Temperatuur (2m)", apiElement: "temperature", apiLevel: "2m", testElement: "Temperatuur (2m)" },
  { key: "precipitation", label: "Neerslag", apiElement: "precipitation", testElement: "Neerslag" },
  { key: "windspeed", label: "Windsnelheid (10m)", apiElement: "windspeed", apiLevel: "10m", testElement: "Windsnelheid (10m)" },
];

const MODEL_META: Record<string, ModelMeta> = {
  // ── ATMOSPHERE ──
  gfs: {
    name: "GFS", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "0.25°", source: "NOAA/NCEP",
    stepRanges: [
      { fromHour: 0, toHour: 120, stepSize: 1 },
      { fromHour: 120, toHour: 384, stepSize: 3 },
    ],
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "gfs", element: "temperature", level: "2m" },
  },
  ecmwfhresglobal: {
    name: "ECMWF HRES", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "0.1°", source: "ECMWF",
    stepRanges: [
      { fromHour: 0, toHour: 90, stepSize: 1 },
      { fromHour: 90, toHour: 144, stepSize: 3 },
      { fromHour: 144, toHour: 240, stepSize: 6 },
    ],
    variableRunLength: true,
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "ecmwfhresglobal", element: "temperature", level: "2m" },
  },
  dwdiconglobal: {
    name: "ICON Global", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "13km", source: "DWD",
    stepRanges: [
      { fromHour: 0, toHour: 78, stepSize: 1 },
      { fromHour: 78, toHour: 180, stepSize: 3 },
    ],
    stepRangesByRunHour: {
      6: [{ fromHour: 0, toHour: 78, stepSize: 1 }, { fromHour: 78, toHour: 120, stepSize: 3 }],
      18: [{ fromHour: 0, toHour: 78, stepSize: 1 }, { fromHour: 78, toHour: 120, stepSize: 3 }],
    },
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "dwdiconglobal", element: "temperature", level: "2m" },
  },
  knmiharmoniebenelux: {
    name: "HARMONIE Benelux", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "2.5km", source: "KNMI",
    stepRanges: uniform(48, 1),
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "knmiharmoniebenelux", element: "temperature", level: "2m" },
  },
  knmiharmonieeurope: {
    name: "HARMONIE Europe", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "5.5km", source: "KNMI",
    stepRanges: uniform(48, 1),
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "knmiharmonieeurope", element: "temperature", level: "2m" },
  },
  mfarpegeeurope: {
    name: "ARPEGE EU", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "0.1°", source: "Météo-France",
    stepRanges: [
      { fromHour: 0, toHour: 48, stepSize: 1 },
      { fromHour: 48, toHour: 102, stepSize: 3 },
    ],
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "mfarpegeeurope", element: "temperature", level: "2m" },
  },
  mfarpegeglobal: {
    name: "ARPEGE Global", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "0.5°", source: "Météo-France",
    stepRanges: [
      { fromHour: 0, toHour: 48, stepSize: 1 },
      { fromHour: 48, toHour: 102, stepSize: 3 },
    ],
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "mfarpegeglobal", element: "temperature", level: "2m" },
  },
  "mfarome-france": {
    name: "AROME France", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "0.025°", source: "Météo-France",
    stepRanges: uniform(48, 1),
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "mfarome-france", element: "temperature", level: "2m" },
  },
  dwdiconeu: {
    name: "ICON EU", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "6.5km", source: "DWD",
    stepRanges: [
      { fromHour: 0, toHour: 78, stepSize: 1 },
      { fromHour: 78, toHour: 120, stepSize: 3 },
    ],
    stepRangesByRunHour: {
      "03": uniform(30, 1),
      "09": uniform(30, 1),
      "15": uniform(30, 1),
      "21": uniform(30, 1),
    },
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "dwdiconeu", element: "temperature", level: "2m" },
  },
  dwdiconeuensemble: {
    name: "ICON EU ENS", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "6.5km", source: "DWD", ensemble: true,
    apiId: "dwdiconeuensemble",
    stepRanges: [
      { fromHour: 0, toHour: 78, stepSize: 1 },
      { fromHour: 78, toHour: 120, stepSize: 3 },
    ],
    stepRangesByRunHour: {
      "03": uniform(30, 1),
      "09": uniform(30, 1),
      "15": uniform(30, 1),
      "21": uniform(30, 1),
    },
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "dwdiconeuensemble", element: "temperature", level: "2m" },
  },
  "nam-conus": {
    name: "NAM CONUS", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "3km", source: "NOAA",
    stepRanges: uniform(60, 1),
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "nam-conus", element: "temperature", level: "2m" },
  },
  "hrrr-conus-hourly": {
    name: "HRRR CONUS", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "3km", source: "NOAA",
    stepRanges: uniform(48, 1),
    variableRunLength: true,
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "hrrr-conus-hourly", element: "temperature", level: "2m" },
  },
  dwdicond2: {
    name: "ICON-D2", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "2.2km", source: "DWD",
    stepRanges: uniform(48, 1),
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "dwdicond2", element: "temperature", level: "2m" },
  },
  dwdicond2ruc: {
    name: "ICON-D2 RUC", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "2.2km", source: "DWD",
    stepRanges: uniform(12, 1),
    variableRunLength: true,
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "dwdicond2ruc", element: "temperature", level: "2m" },
  },
  dwdicond2ensemble: {
    name: "ICON-D2 ENS", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "2.2km", source: "DWD", ensemble: true,
    apiId: "dwdicond2ensemble",
    stepRanges: uniform(48, 1),
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "dwdicond2ensemble", element: "temperature", level: "2m" },
  },
  optimal: {
    name: "Optimal", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "2.5km", source: "Infoplaza",
    stepRanges: uniform(48, 1),
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "optimal", element: "temperature", level: "2m" },
  },
  ecmwfensemblebenelux: {
    name: "ECMWF ENS Benelux", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "0.25°", source: "ECMWF", ensemble: true,
    apiId: "ecmwfensemblebenelux",
    stepRanges: [
      { fromHour: 0, toHour: 90, stepSize: 1 },
      { fromHour: 93, toHour: 144, stepSize: 3 },
      { fromHour: 150, toHour: 360, stepSize: 6 },
    ],
    variableRunLength: true,
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "ecmwfensemblebenelux", element: "temperature", level: "2m" },
  },
  ecmwfensembleglobal: {
    name: "ECMWF ENS Global", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "0.25°", source: "ECMWF", ensemble: true,
    apiId: "ecmwfensembleglobal",
    stepRanges: [
      { fromHour: 0, toHour: 90, stepSize: 1 },
      { fromHour: 93, toHour: 144, stepSize: 3 },
      { fromHour: 150, toHour: 360, stepSize: 6 },
    ],
    variableRunLength: true,
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "ecmwfensembleglobal", element: "temperature", level: "2m" },
  },

  // ── AI ATMOSPHERE MODELS ──
  ecmwfaifs: {
    name: "ECMWF AIFS", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "0.25°", source: "ECMWF", ai: true,
    stepRanges: uniform(240, 6),
    variableRunLength: true,
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "ecmwfaifs", element: "temperature", level: "2m" },
  },
  aigfs: {
    name: "AIGFS", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "0.25°", source: "NOAA", ai: true,
    stepRanges: uniform(240, 6),
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "aigfs", element: "temperature", level: "2m" },
  },
  fourcastnetv2: {
    name: "FourCastNet v2", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "0.25°", source: "NVIDIA", ai: true,
    stepRanges: uniform(240, 6),
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "fourcastnetv2", element: "temperature", level: "2m" },
  },
  fengwu: {
    name: "FengWu", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "0.25°", source: "Shanghai AI Lab", ai: true,
    stepRanges: uniform(240, 6),
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "fengwu", element: "temperature", level: "2m" },
  },
  panguweather: {
    name: "Pangu", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "0.25°", source: "Huawei", ai: true,
    stepRanges: uniform(240, 6),
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "panguweather", element: "temperature", level: "2m" },
  },
  dwdaicon: {
    name: "DWD AICON", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "0.25°", source: "DWD", ai: true,
    stepRanges: uniform(180, 3),
    stepRangesByRunHour: { 6: uniform(120, 3), 18: uniform(120, 3) },
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "dwdaicon", element: "temperature", level: "2m" },
  },
  navgem: {
    name: "NAVGEM", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "0.25°", source: "US Navy", ai: true,
    stepRanges: uniform(180, 6),
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "navgem", element: "temperature", level: "2m" },
  },
  dmiharmoniedini: {
    name: "DMI Harmonie DINI", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "2.5km", source: "DMI",
    stepRanges: uniform(54, 1),
    apiElement: "temperature", apiLevel: "2m",
    imweather: { model: "dmiharmoniedini", element: "temperature", level: "2m" },
  },

  gfswave: {
    name: "GFS Wave", group: "wave", testElement: "Significante golfhoogte (Hs)",
    resolution: "0.25°", source: "NOAA/NCEP",
    stepRanges: [
      { fromHour: 0, toHour: 120, stepSize: 1 },
      { fromHour: 120, toHour: 240, stepSize: 3 },
    ],
    apiElement: "waveheight_significant",
    imweather: { model: "gfswave", element: "waveheight_significant", level: "" },
  },
  ecmwfwamglobal: {
    name: "ECMWF WAM", group: "wave", testElement: "Significante golfhoogte (Hs)",
    resolution: "0.1°", source: "ECMWF",
    stepRanges: [
      { fromHour: 0, toHour: 90, stepSize: 1 },
      { fromHour: 90, toHour: 144, stepSize: 3 },
      { fromHour: 144, toHour: 240, stepSize: 6 },
    ],
    variableRunLength: true,
    apiElement: "waveheight_significant",
    imweather: { model: "ecmwfwamglobal", element: "waveheight_significant", level: "" },
  },
  ecmwfwamglobalensemble: {
    name: "ECMWF WAM ENS", group: "wave", testElement: "Significante golfhoogte (Hs)",
    resolution: "0.1°", source: "ECMWF", ensemble: true,
    apiId: "ecmwfwamglobalensemble",
    stepRanges: [
      { fromHour: 0, toHour: 90, stepSize: 1 },
      { fromHour: 90, toHour: 144, stepSize: 3 },
      { fromHour: 144, toHour: 240, stepSize: 6 },
    ],
    variableRunLength: true,
    apiElement: "waveheight_significant",
    imweather: { model: "ecmwfwamglobalensemble", element: "waveheight_significant", level: "" },
  },
  "imw-ww3-eushelf": {
    name: "WW3 EU Shelf", group: "wave", testElement: "Significante golfhoogte (Hs)",
    resolution: "0.05°", source: "IMWeather/WW3",
    stepRanges: uniform(180, 1),
    apiElement: "waveheight_significant",
    imweather: { model: "imw-ww3-eushelf", element: "waveheight_significant", level: "" },
  },
  mfwameurope: {
    name: "MF WAM Europe", group: "wave", testElement: "Significante golfhoogte (Hs)",
    resolution: "0.1°", source: "Météo-France",
    stepRanges: uniform(48, 1),
    firstForecastHour: 2,
    apiElement: "waveheight_significant",
    imweather: { model: "mfwameurope", element: "waveheight_significant", level: "" },
  },
  "imw-wave": {
    name: "Infoplaza Wave", group: "wave", testElement: "Significante golfhoogte (Hs)",
    resolution: "25km", source: "Infoplaza",
    stepRanges: uniform(191, 1),
    apiElement: "waveheight_significant",
    imweather: { model: "imw-wave", element: "waveheight_significant", level: "" },
  },
  dwdewam: {
    name: "ICON EU Wave", group: "wave", testElement: "Significante golfhoogte (Hs)",
    resolution: "0.0625°", source: "DWD",
    stepRanges: uniform(78, 1),
    apiElement: "waveheight_significant",
    imweather: { model: "dwdewam", element: "waveheight_significant", level: "" },
  },
  dwdgwam: {
    name: "ICON Global Wave", group: "wave", testElement: "Significante golfhoogte (Hs)",
    resolution: "0.25°", source: "DWD",
    stepRanges: uniform(174, 3),
    apiElement: "waveheight_significant",
    imweather: { model: "dwdgwam", element: "waveheight_significant", level: "" },
  },
  dwdcwam: {
    name: "CWAM German Coasts", group: "wave", testElement: "Significante golfhoogte (Hs)",
    resolution: "~900m", source: "DWD",
    stepRanges: uniform(78, 1),
    apiElement: "waveheight_significant",
    imweather: { model: "dwdcwam", element: "waveheight_significant", level: "" },
  },

  // ── AIR QUALITY ──
  camsglobal: {
    name: "CAMS Global", group: "air-quality", testElement: "Air Quality Index",
    resolution: "0.4°", source: "ECMWF/Copernicus",
    stepRanges: uniform(120, 3),
    apiElement: "airqualityindex", apiLevel: "surface",
    imweather: { model: "camsglobal", element: "airqualityindex", level: "surface" },
  },
  camseurope: {
    name: "CAMS Europe", group: "air-quality", testElement: "Air Quality Index",
    resolution: "0.1°", source: "ECMWF/Copernicus",
    stepRanges: uniform(96, 1),
    apiElement: "airqualityindex", apiLevel: "surface",
    imweather: { model: "camseurope", element: "airqualityindex", level: "surface" },
  },

  // ── OCEAN ──
  mercator: {
    name: "Mercator Ocean", group: "ocean", testElement: "Zeewatertemperatuur (SST)",
    resolution: "0.083°", source: "Copernicus Marine",
    stepRanges: uniform(239, 1),
    apiElement: "temperature", apiLevel: "seasurface",
    imweather: { model: "mercator", element: "temperature", level: "seasurface" },
  },
  "ncep-rtofs": {
    name: "NCEP RTOFS", group: "ocean", testElement: "Zeewatertemperatuur (SST)",
    resolution: "0.083°", source: "NOAA/NCEP",
    stepRanges: uniform(192, 3),
    apiElement: "temperature", apiLevel: "seasurface",
    imweather: { model: "ncep-rtofs", element: "temperature", level: "seasurface" },
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModelsApiResponse {
  [modelId: string]: {
    elements: {
      [runTimestamp: string]: {
        [elementName: string]: {
          name: string;
          levels: Record<string, { description: string }>;
          is_beta_model: boolean;
        };
      };
    };
    rundescriptions?: {
      [runTimestamp: string]: {
        is_beta_model?: boolean;
      };
    };
  };
}

interface LayersApiResponse {
  layers: {
    timestamp: number;
    datetime: string;
    tileurl: string;
    url: string;
  }[];
  element?: {
    firstoffset?: number;
  };
}

// ─── Core fetch functions ────────────────────────────────────────────────────

function runtimeToRunTime(ts: number): string {
  const d = new Date(ts * 1000);
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = d.getUTCMinutes();
  if (minutes === 0) return `${hours}Z`;
  return `${hours}:${String(minutes).padStart(2, "0")}Z`;
}

function runtimeToDate(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toISOString().slice(0, 10);
}

// Cache the models API response for 60s to avoid duplicate fetches across groups
let modelsCache: { data: ModelsApiResponse; ts: number } | null = null;

async function fetchModelsApi(): Promise<ModelsApiResponse> {
  if (modelsCache && Date.now() - modelsCache.ts < 60_000) {
    return modelsCache.data;
  }
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) throw new Error(`Models API error: ${res.status}`);
  const data: ModelsApiResponse = await res.json();
  modelsCache = { data, ts: Date.now() };
  return data;
}

async function fetchModelRuns(group: string, elementOverride?: ElementOption): Promise<{ modelRuns: Record<string, number[]>; betaModels: Set<string> }> {
  const data = await fetchModelsApi();
  const modelRuns: Record<string, number[]> = {};
  const betaModels = new Set<string>();

  const metaEntries = Object.entries(MODEL_META).filter(([, m]) => m.group === group);

  for (const [modelId, meta] of metaEntries) {
    const apiModelId = getApiId(modelId);
    const modelData = data[apiModelId];
    if (!modelData?.elements) {
      modelRuns[modelId] = [];
      continue;
    }

    // Check rundescriptions for beta status (more reliable than element-level)
    if (modelData.rundescriptions) {
      const anyBeta = Object.values(modelData.rundescriptions).some(rd => rd.is_beta_model);
      if (anyBeta) betaModels.add(modelId);
    }

    const apiElement = elementOverride?.apiElement ?? meta.apiElement;
    const apiLevel = elementOverride ? elementOverride.apiLevel : meta.apiLevel;

    const runs: number[] = [];
    for (const [runTs, elements] of Object.entries(modelData.elements)) {
      const elem = elements[apiElement];
      if (elem) {
        if (elem.is_beta_model) betaModels.add(modelId);
        if (!apiLevel || elem.levels?.[apiLevel]) {
          runs.push(Number(runTs));
        }
      }
    }
    runs.sort((a, b) => b - a);
    modelRuns[modelId] = runs.slice(0, 4);
  }

  return { modelRuns, betaModels };
}

async function fetchRunLayers(modelId: string, runtime: number, elementOverride?: ElementOption): Promise<number[]> {
  const meta = MODEL_META[modelId];
  if (!meta) return [];
  const apiModelId = getApiId(modelId);
  const apiElement = elementOverride?.apiElement ?? meta.apiElement;
  const apiLevel = elementOverride ? elementOverride.apiLevel : meta.apiLevel;
  const levelParam = apiLevel ? `&level=${apiLevel}` : "";
  const memberParam = meta.ensemble ? "&member=mean" : "";
  const res = await fetch(
    `${API_BASE}/layers/${apiModelId}/${runtime}/${apiElement}/0/0/0/1/1?outputtype=image${levelParam}${memberParam}`
  );
  if (!res.ok) return [];
  const data: LayersApiResponse = await res.json();
  const layerTimestamps = data.layers
    .filter((l) => !!l.tileurl)
    .map((l) => l.timestamp);

  const runStepRanges = getStepRangesForRuntime(meta, runtime);
  return layerTimestamps;
}

function buildModel(
  modelId: string,
  runTimestamps: number[],
  layersByRun: Record<number, number[]>,
  elementOverride?: ElementOption
): WeatherModel | null {
  const meta = MODEL_META[modelId];
  if (!meta) return null;

  const runs: ModelRun[] = runTimestamps.map((runtime) => {
    const runTime = runtimeToRunTime(runtime);
    const date = runtimeToDate(runtime);
    const layerTimestamps = layersByRun[runtime] || [];
    const availableLayers = new Set(layerTimestamps);

    // Build a set of available forecast hours (rounded) for non-round runtimes
    // e.g. runtime 05:28 with layer at 06:00 → forecast hour ≈ 0.53 → rounds to 1
    const availableHours = new Set<number>();
    for (const ts of layerTimestamps) {
      availableHours.add(Math.round((ts - runtime) / 3600));
    }

    const runStepRanges = getStepRangesForRuntime(meta, runtime);
    const allExpectedHours = generateExpectedHours(runStepRanges);

    // For models with variable run lengths (e.g. ECMWF 06Z/18Z are shorter),
    // cap expected hours at the actual forecast length from the API.
    // For fixed-length models, always show the full range so missing data is visible.
    let expectedHours: number[];
    if (meta.variableRunLength && layerTimestamps.length > 0) {
      const maxTs = Math.max(...layerTimestamps);
      const runMaxHour = Math.round((maxTs - runtime) / 3600);
      expectedHours = allExpectedHours.filter((h) => h <= runMaxHour);
    } else {
      expectedHours = allExpectedHours;
    }

    const isPrecipitation = (elementOverride?.apiElement ?? meta.apiElement) === "precipitation";
    const timeSteps: TimeStep[] = expectedHours.map((h, idx) => {
      const expectedTs = runtime + h * 3600;
      // Match by exact timestamp OR by rounded forecast hour (for non-round runtimes)
      const available = availableLayers.has(expectedTs) || availableHours.has(h);
      // Hours before firstForecastHour (default 1, i.e. T+0) are excluded from counting but still shown as a dot
      // For precipitation: first forecast timestep may also be excluded
      const firstHour = meta.firstForecastHour ?? 1;
      const isEarlyExcluded = h < firstHour;
      const excludedPrecip = isPrecipitation && !isEarlyExcluded && idx <= 1 && !available;
      const excluded = isEarlyExcluded || excludedPrecip;
      return { hour: h, available: available || excluded, ...(excluded ? { excluded: true } : {}) };
    });

    const countableSteps = timeSteps.filter(s => !s.excluded);
    const availableCount = countableSteps.filter((s) => s.available).length;
    const total = countableSteps.length;
    let status: ModelRun["status"];
    if (total === 0 || availableCount === 0) status = "missing";
    else if (availableCount === total) status = "complete";
    else if (availableCount < total * 0.3) status = "processing";
    else status = "partial";

    return { runTime, date, timeSteps, status, runtime };
  });

  // Post-processing: determine "failed" status
  // Sort runs newest first by runtime
  const sortedByRuntime = [...runs].sort((a, b) => (b as any).runtime - (a as any).runtime);
  const statusMap = loadStatusMap();
  // Read settings from localStorage
  let staleMinutes = 20;
  let criticalPct = 80;
  try {
    const raw = localStorage.getItem("imw-app-settings");
    if (raw) {
      const parsed = JSON.parse(raw);
      staleMinutes = parsed.staleMinutes ?? 20;
      criticalPct = parsed.criticalPct ?? 80;
    }
  } catch {}

  sortedByRuntime.forEach((run, index) => {
    if (run.status === "processing") {
      // Calculate availability percentage for this run
      const countable = run.timeSteps.filter(s => !s.excluded);
      const avail = countable.filter(s => s.available).length;
      const pct = countable.length > 0 ? (avail / countable.length) * 100 : 0;

      // If availability is already above critical%, it's not a failure
      if (pct >= criticalPct) {
        run.status = "partial";
      } else if (index > 0) {
        // Not the most recent run — cannot be processing
        run.status = "failed";
      } else {
        // Most recent run — check staleness via tracker
        const entry = statusMap[modelId];
        if (entry) {
          const minutesSinceChange = (Date.now() - new Date(entry.lastChangedAt).getTime()) / 60000;
          if (minutesSinceChange > staleMinutes) {
            run.status = "failed";
          }
        }
      }
    }
    // Clean up the temporary runtime property
    delete (run as any).runtime;
  });

  return {
    id: modelId,
    name: meta.name,
    group: meta.group,
    testElement: elementOverride?.testElement ?? meta.testElement,
    resolution: meta.resolution,
    source: meta.source,
    beta: meta.beta,
    ai: meta.ai,
    ensemble: meta.ensemble,
    imweather: meta.imweather,
    runs,
  };
}

export async function fetchModelsByGroup(
  group: "atmosphere" | "wave" | "air-quality" | "ocean",
  elementOverride?: ElementOption
): Promise<WeatherModel[]> {
  const { modelRuns, betaModels } = await fetchModelRuns(group, elementOverride);

  const fetchTasks: { modelId: string; runtime: number }[] = [];
  for (const [modelId, runtimes] of Object.entries(modelRuns)) {
    for (const rt of runtimes) {
      fetchTasks.push({ modelId, runtime: rt });
    }
  }

  const layerResults = await Promise.all(
    fetchTasks.map(async ({ modelId, runtime }) => {
      const layers = await fetchRunLayers(modelId, runtime, elementOverride);
      return { modelId, runtime, layers };
    })
  );

  const layersByModelRun: Record<string, Record<number, number[]>> = {};
  for (const { modelId, runtime, layers } of layerResults) {
    if (!layersByModelRun[modelId]) layersByModelRun[modelId] = {};
    layersByModelRun[modelId][runtime] = layers;
  }

  const models: WeatherModel[] = [];
  for (const [modelId, runtimes] of Object.entries(modelRuns)) {
    const model = buildModel(modelId, runtimes, layersByModelRun[modelId] || {}, elementOverride);
    if (model) {
      if (betaModels.has(modelId)) model.beta = true;
      models.push(model);
    }
  }

  return models;
}

/** Fetch a single model's availability with a specific element override */
export async function fetchSingleModel(
  modelId: string,
  elementOverride?: ElementOption
): Promise<WeatherModel | null> {
  const meta = MODEL_META[modelId];
  if (!meta) return null;

  const { modelRuns, betaModels } = await fetchModelRuns(meta.group, elementOverride);
  const runtimes = modelRuns[modelId] || [];
  if (runtimes.length === 0) return null;

  const layerResults = await Promise.all(
    runtimes.map(async (runtime) => {
      const layers = await fetchRunLayers(modelId, runtime, elementOverride);
      return { runtime, layers };
    })
  );

  const layersByRun: Record<number, number[]> = {};
  for (const { runtime, layers } of layerResults) {
    layersByRun[runtime] = layers;
  }

  const model = buildModel(modelId, runtimes, layersByRun, elementOverride);
  if (model && betaModels.has(modelId)) model.beta = true;
  return model;
}

// Backward compat
export async function fetchAtmosphereModels(): Promise<WeatherModel[]> {
  return fetchModelsByGroup("atmosphere");
}

export function invalidateModelsCache(): void {
  modelsCache = null;
}

/** Check if a model ID is tracked in our configuration */
export function isTrackedModel(modelId: string): boolean {
  return modelId in MODEL_META;
}

// ─── Run element detail ──────────────────────────────────────────────────────

export interface RunElementDetail {
  element: string;
  level: string;
  timeSteps: import("./weatherModels").TimeStep[];
}

export async function fetchRunElements(
  modelId: string,
  run: import("./weatherModels").ModelRun
): Promise<RunElementDetail[]> {
  const meta = MODEL_META[modelId];
  if (!meta) return [];

  // Convert run date + runTime back to unix timestamp
  const runHour = parseInt(run.runTime);
  const [year, month, day] = run.date.split("-").map(Number);
  const runDate = new Date(Date.UTC(year, month - 1, day, runHour));
  const runtime = Math.floor(runDate.getTime() / 1000);

  const runStepRanges = getStepRangesForRuntime(meta, runtime);
  const expectedHours = generateExpectedHours(runStepRanges);

  // Get all elements for this model + run from the models API
  const data = await fetchModelsApi();
  const apiModelId = getApiId(modelId);
  const modelData = data[apiModelId];
  if (!modelData?.elements) return [];

  const runElements = modelData.elements[String(runtime)];
  if (!runElements) return [];

  // For each element+level combo, fetch layers
  const tasks: { element: string; level: string }[] = [];
  const ignoredElements = new Set(["domain", "seasurfaceheight", "windvector"]);
  for (const [elementName, elementData] of Object.entries(runElements)) {
    if (ignoredElements.has(elementName)) continue;
    const levels = Object.keys(elementData.levels || {});
    const filteredLevels = levels.filter((l) => l !== "pressure" && l !== "");
    if (filteredLevels.length === 0) {
      // Skip elements with no usable level (e.g. camseurope elements without a real level)
      if (modelId === "camseurope") continue;
      // Use meta.apiLevel as fallback if available (e.g. Mercator with "seasurface")
      const fallbackLevel = meta.apiLevel || "";
      tasks.push({ element: elementName, level: fallbackLevel });
    } else {
      for (const lvl of filteredLevels) {
        tasks.push({ element: elementName, level: lvl });
      }
    }
  }

  const results = await Promise.all(
    tasks.map(async ({ element, level }) => {
      const levelParam = level ? `&level=${level}` : "";
      const memberParam = meta.ensemble ? "&member=mean" : "";
      let res = await fetch(
        `${API_BASE}/layers/${apiModelId}/${runtime}/${element}/0/0/0/1/1?outputtype=image${levelParam}${memberParam}`
      );
      // Some elements are listed under a level in the models API but the layers
      // API actually expects no level parameter. Retry without level on 404.
      if (!res.ok && levelParam) {
        res = await fetch(
          `${API_BASE}/layers/${apiModelId}/${runtime}/${element}/0/0/0/1/1?outputtype=image${memberParam}`
        );
      }
      if (!res.ok) return { element, level, timeSteps: [] as import("./weatherModels").TimeStep[] };
      const layerData: LayersApiResponse = await res.json();
      // Only count layers that have a tileurl — same logic as main availability check
      const layerTimestamps = layerData.layers
        .filter((l) => !!l.tileurl)
        .map((l) => l.timestamp);
      const availableTs = new Set(layerTimestamps);

      // Cap expected hours only for models with variable run length (consistent with fetchElements)
      let runExpectedHours: number[];
      if (meta.variableRunLength && layerTimestamps.length > 0) {
        const maxHour = Math.round((Math.max(...layerTimestamps) - runtime) / 3600);
        runExpectedHours = expectedHours.filter((h) => h <= maxHour);
      } else {
        runExpectedHours = expectedHours;
      }

      const firstHour = meta.firstForecastHour ?? 1;
      const isPrecip = element === "precipitation" || element === "precipitationtype";
      let timeSteps: import("./weatherModels").TimeStep[] = runExpectedHours.map((h) => {
        const expectedTs = runtime + h * 3600;
        const isEarlyExcluded = h < firstHour;
        if (isEarlyExcluded) {
          return { hour: h, available: true, excluded: true };
        }
        return { hour: h, available: availableTs.has(expectedTs) };
      });
      // For precip elements: remove leading unavailable timesteps (they don't exist for this element)
      if (isPrecip) {
        const skipCount = modelId.includes("arpege") ? 2 : 1;
        let skipped = 0;
        timeSteps = timeSteps.filter(s => {
          if (s.excluded) return true;
          if (skipped < skipCount) {
            skipped++;
            return s.available; // keep if available, remove if missing
          }
          return true;
        });
      }
      return { element, level, timeSteps };
    })
  );

  return results.sort((a, b) => a.element.localeCompare(b.element));
}
