import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, Loader2, RefreshCw } from "lucide-react";
import { useThemedLogo } from "@/hooks/useThemedLogo";
import { TimeStepGrid } from "./TimeStepGrid";
import type { WeatherModel, ModelRun } from "@/lib/weatherModels";
import { fetchRunElements, type RunElementDetail } from "@/lib/imweatherApi";

interface RunDetailDialogProps {
  model: WeatherModel;
  run: ModelRun;
}

export function RunDetailDialog({ model, run }: RunDetailDialogProps) {
  const logo = useThemedLogo();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elements, setElements] = useState<RunElementDetail[]>([]);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const loadElements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRunElements(model.id, run);
      setElements(data);
      setLastCheck(new Date());
    } catch {
      setElements([]);
    } finally {
      setLoading(false);
    }
  }, [model.id, run]);

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && elements.length === 0) {
      await loadElements();
    }
  };

  const handleRefresh = async () => {
    await loadElements();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle className="flex items-center gap-2 font-mono text-sm">
              <img src={logo} alt="IMWeatherWatcher" className="h-6 w-auto rounded" />
              {model.name} — {run.runTime} {run.date}
            </DialogTitle>
            <div className="flex items-center gap-2 shrink-0">
              {lastCheck && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {lastCheck.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "UTC" })} UTC
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-6 gap-1 text-[10px] px-2"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : elements.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Geen elementen gevonden</p>
        ) : (
          <div className="space-y-3">
            {elements.map((el) => (
              <div key={`${el.element}-${el.level}`} className="rounded-md border p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium">{el.element}</span>
                  {el.level && (
                    <span className="font-mono text-[10px] text-muted-foreground">{el.level}</span>
                  )}
                </div>
                <TimeStepGrid
                  timeSteps={el.timeSteps}
                  compact
                  mapContext={{
                    modelId: model.id,
                    modelName: model.name,
                    element: el.element,
                    level: el.level,
                    runtime: (() => {
                      const runHour = parseInt(run.runTime);
                      const [y, m, d] = run.date.split("-").map(Number);
                      return Math.floor(new Date(Date.UTC(y, m - 1, d, runHour)).getTime() / 1000);
                    })(),
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
