import { useQuery } from "@tanstack/react-query";
import { fetchModelsByGroup, type ElementOption } from "@/lib/imweatherApi";
import type { WeatherModel } from "@/lib/weatherModels";

export function useWeatherModels(
  group: "atmosphere" | "wave" | "air-quality" | "ocean",
  elementOverride?: ElementOption,
  refreshIntervalMinutes: number = 5
) {
  return useQuery<WeatherModel[]>({
    queryKey: ["weather-models", group, elementOverride?.key ?? "default"],
    queryFn: () => fetchModelsByGroup(group, elementOverride),
    refetchInterval: refreshIntervalMinutes * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
}
