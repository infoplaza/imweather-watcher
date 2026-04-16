export interface TimeStep {
  hour: number;
  available: boolean;
  /** If true, this step is excluded from availability stats (shown as grey) */
  excluded?: boolean;
}

export interface ModelRun {
  runTime: string; // e.g. "00Z", "06Z", "12Z", "18Z"
  date: string;
  timeSteps: TimeStep[];
  status: "complete" | "partial" | "missing" | "processing" | "failed";
}

export interface WeatherModel {
  id: string;
  name: string;
  group: "atmosphere" | "wave" | "air-quality" | "ocean";
  testElement: string;
  runs: ModelRun[];
  resolution: string;
  source: string;
  beta?: boolean;
  ai?: boolean;
  ensemble?: boolean;
  imweather: {
    model: string;
    element: string;
    level: string;
  };
}

export function getImweatherUrl(model: WeatherModel, run: ModelRun): string {
  const runHour = parseInt(run.runTime);
  const [year, month, day] = run.date.split("-").map(Number);
  const runDate = new Date(Date.UTC(year, month - 1, day, runHour));
  const runTimestamp = Math.floor(runDate.getTime() / 1000);
  return `https://imweather.com/?model=${model.imweather.model}&element=${model.imweather.element}&run=${runTimestamp}&member=&level=${model.imweather.level}`;
}

function generateTimeSteps(maxHour: number, stepSize: number, missingPattern: number[] = []): TimeStep[] {
  const steps: TimeStep[] = [];
  for (let h = 0; h <= maxHour; h += stepSize) {
    steps.push({ hour: h, available: !missingPattern.includes(h) });
  }
  return steps;
}

function getRunStatus(steps: TimeStep[]): ModelRun["status"] {
  const available = steps.filter(s => s.available).length;
  if (available === 0) return "missing";
  if (available === steps.length) return "complete";
  if (available < steps.length * 0.3) return "processing";
  return "partial";
}

function createRun(runTime: string, date: string, maxHour: number, stepSize: number, missing: number[] = []): ModelRun {
  const timeSteps = generateTimeSteps(maxHour, stepSize, missing);
  return { runTime, date, timeSteps, status: getRunStatus(timeSteps) };
}

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

export const weatherModels: WeatherModel[] = [
  {
    id: "gfs", name: "GFS", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "0.25°", source: "NOAA/NCEP",
    imweather: { model: "gfs", element: "temperature", level: "2m" },
    runs: [
      createRun("00Z", today, 384, 3, []),
      createRun("06Z", today, 384, 3, [252, 255, 258, 261, 264, 267, 270]),
      createRun("12Z", today, 384, 3, [180, 183, 186, 189, 192, 195, 198, 201, 204, 207, 210, 213, 216, 219, 222, 225, 228, 231, 234, 237, 240, 243, 246, 249, 252, 255, 258, 261, 264, 267, 270, 273, 276, 279, 282, 285, 288, 291, 294, 297, 300, 303, 306, 309, 312, 315, 318, 321, 324, 327, 330, 333, 336, 339, 342, 345, 348, 351, 354, 357, 360, 363, 366, 369, 372, 375, 378, 381, 384]),
      createRun("18Z", yesterday, 384, 3, []),
    ],
  },
  {
    id: "ecmwf-hres", name: "ECMWF HRES", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "0.1°", source: "ECMWF",
    imweather: { model: "ecmwf-hres", element: "temperature", level: "2m" },
    runs: [
      createRun("00Z", today, 240, 3, []),
      createRun("12Z", today, 240, 3, []),
    ],
  },
  {
    id: "icon-global", name: "ICON Global", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "13km", source: "DWD",
    imweather: { model: "icon-global", element: "temperature", level: "2m" },
    runs: [
      createRun("00Z", today, 180, 3, []),
      createRun("06Z", today, 180, 3, [120, 123, 126, 129, 132, 135, 138, 141, 144, 147, 150, 153, 156, 159, 162, 165, 168, 171, 174, 177, 180]),
      createRun("12Z", today, 180, 3, []),
      createRun("18Z", yesterday, 180, 3, []),
    ],
  },
  {
    id: "harmonie", name: "HARMONIE", group: "atmosphere", testElement: "Temperatuur (2m)",
    resolution: "2.5km", source: "KNMI",
    imweather: { model: "harmonie", element: "temperature", level: "2m" },
    runs: [
      createRun("00Z", today, 48, 1, []),
      createRun("06Z", today, 48, 1, [36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48]),
      createRun("12Z", today, 48, 1, Array.from({ length: 49 }, (_, i) => i)),
      createRun("18Z", yesterday, 48, 1, []),
    ],
  },
  {
    id: "ww3-global", name: "WW3 Global", group: "wave", testElement: "Significante golfhoogte (Hs)",
    resolution: "0.5°", source: "NOAA/NCEP",
    imweather: { model: "ww3-global", element: "significant_wave_height", level: "" },
    runs: [
      createRun("00Z", today, 180, 3, []),
      createRun("06Z", today, 180, 3, []),
      createRun("12Z", today, 180, 3, [90, 93, 96, 99, 102, 105, 108, 111, 114, 117, 120, 123, 126, 129, 132, 135, 138, 141, 144, 147, 150, 153, 156, 159, 162, 165, 168, 171, 174, 177, 180]),
      createRun("18Z", yesterday, 180, 3, []),
    ],
  },
  {
    id: "ecmwf-wav", name: "ECMWF WAM", group: "wave", testElement: "Significante golfhoogte (Hs)",
    resolution: "0.1°", source: "ECMWF",
    imweather: { model: "ecmwf-wav", element: "significant_wave_height", level: "" },
    runs: [
      createRun("00Z", today, 240, 3, []),
      createRun("12Z", today, 240, 3, []),
    ],
  },
  {
    id: "nww3-euro", name: "NWW3 Europe", group: "wave", testElement: "Significante golfhoogte (Hs)",
    resolution: "0.08°", source: "Météo-France",
    imweather: { model: "nww3-euro", element: "significant_wave_height", level: "" },
    runs: [
      createRun("00Z", today, 72, 1, []),
      createRun("06Z", today, 72, 1, Array.from({ length: 73 }, (_, i) => i)),
      createRun("12Z", today, 72, 1, [48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72]),
      createRun("18Z", yesterday, 72, 1, []),
    ],
  },
  {
    id: "cams-global", name: "CAMS Global", group: "air-quality", testElement: "Air Quality Index",
    resolution: "0.4°", source: "ECMWF/Copernicus",
    imweather: { model: "cams-global", element: "airquality", level: "" },
    runs: [
      createRun("00Z", today, 120, 3, []),
      createRun("12Z", today, 120, 3, [72, 75, 78, 81, 84, 87, 90, 93, 96, 99, 102, 105, 108, 111, 114, 117, 120]),
    ],
  },
  {
    id: "cams-euro", name: "CAMS Europe", group: "air-quality", testElement: "Air Quality Index",
    resolution: "0.1°", source: "ECMWF/Copernicus",
    imweather: { model: "cams-euro", element: "airquality", level: "" },
    runs: [
      createRun("00Z", today, 96, 1, []),
      createRun("12Z", today, 96, 1, Array.from({ length: 97 }, (_, i) => i)),
    ],
  },
  {
    id: "silam", name: "SILAM", group: "air-quality", testElement: "Air Quality Index",
    resolution: "0.1°", source: "FMI", beta: true,
    imweather: { model: "silam", element: "airquality", level: "" },
    runs: [
      createRun("00Z", today, 120, 3, []),
      createRun("12Z", today, 120, 3, [60, 63, 66, 69, 72, 75, 78, 81, 84, 87, 90, 93, 96, 99, 102, 105, 108, 111, 114, 117, 120]),
    ],
  },
  {
    id: "hycom", name: "HYCOM", group: "ocean", testElement: "Zeewatertemperatuur (SST)",
    resolution: "0.08°", source: "US Navy/NOAA",
    imweather: { model: "hycom", element: "sea_water_temperature", level: "" },
    runs: [
      createRun("00Z", today, 168, 3, []),
      createRun("12Z", today, 168, 3, [96, 99, 102, 105, 108, 111, 114, 117, 120, 123, 126, 129, 132, 135, 138, 141, 144, 147, 150, 153, 156, 159, 162, 165, 168]),
    ],
  },
  {
    id: "mercator", name: "Mercator Ocean", group: "ocean", testElement: "Zeewatertemperatuur (SST)",
    resolution: "0.083°", source: "Copernicus Marine",
    imweather: { model: "mercator", element: "sea_water_temperature", level: "" },
    runs: [
      createRun("00Z", today, 240, 24, []),
      createRun("12Z", today, 240, 24, []),
    ],
  },
  {
    id: "nemo-nordic", name: "NEMO Nordic", group: "ocean", testElement: "Zeewatertemperatuur (SST)",
    resolution: "0.028°", source: "SMHI", beta: true,
    imweather: { model: "nemo-nordic", element: "sea_water_temperature", level: "" },
    runs: [
      createRun("00Z", today, 48, 1, []),
      createRun("12Z", today, 48, 1, Array.from({ length: 49 }, (_, i) => i)),
    ],
  },
];

export function getModelsByGroup(group: "atmosphere" | "wave" | "air-quality" | "ocean"): WeatherModel[] {
  return weatherModels.filter(m => m.group === group);
}
