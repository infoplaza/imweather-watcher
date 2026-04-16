import { cn } from "@/lib/utils";
import type { TimeStep } from "@/lib/weatherModels";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/lib/i18n";

interface MapContext {
  modelId: string;
  modelName: string;
  element: string;
  level: string;
  runtime: number; // unix timestamp
}

interface TimeStepGridProps {
  timeSteps: TimeStep[];
  compact?: boolean;
  mapContext?: MapContext;
}

/** Return a green shade based on the local step interval (gap to next/prev hour) */
function getStepColor(timeSteps: TimeStep[], index: number): string {
  let interval: number;
  if (index < timeSteps.length - 1) {
    interval = timeSteps[index + 1].hour - timeSteps[index].hour;
  } else if (index > 0) {
    interval = timeSteps[index].hour - timeSteps[index - 1].hour;
  } else {
    interval = 1;
  }
  if (interval <= 1) return "bg-success";
  if (interval <= 3) return "bg-success/60";
  return "bg-success/40";
}

export function TimeStepGrid({ timeSteps, compact = false, mapContext }: TimeStepGridProps) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const countableSteps = timeSteps.filter(s => !s.excluded);
  const availableCount = countableSteps.filter(s => s.available).length;
  const totalCount = countableSteps.length;
  const percentage = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0;

  const handleStepClick = (step: TimeStep) => {
    if (!mapContext || !step.available || step.excluded) return;
    const params = new URLSearchParams({
      model: mapContext.modelId,
      modelName: mapContext.modelName,
      element: mapContext.element,
      level: mapContext.level,
      run: String(mapContext.runtime),
      step: String(step.hour),
    });
    navigate(`/map?${params.toString()}`);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          {availableCount}/{totalCount} ({percentage}%)
        </span>
      </div>
      <div className={cn("flex flex-wrap")}>
        {timeSteps.map((step, i) => {
          const isClickable = mapContext && step.available && !step.excluded;
          return (
            <Tooltip key={step.hour}>
              <TooltipTrigger asChild>
                <div
                  style={{ margin: compact ? "0.5px" : "1px" }}
                  className={cn(
                    "rounded-sm transition-colors",
                    compact ? "h-2 w-2" : "h-3 w-3",
                    step.excluded
                      ? "bg-muted-foreground/30"
                      : step.available
                        ? `${getStepColor(timeSteps, i)} hover:opacity-80`
                        : "bg-destructive/70 hover:bg-destructive",
                    isClickable && "cursor-pointer hover:ring-1 hover:ring-foreground/30"
                  )}
                  onClick={() => isClickable && handleStepClick(step)}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="font-mono text-xs">
                T+{step.hour}h — {step.excluded ? t("tooltipExcluded") : step.available ? t("tooltipAvailable") : t("tooltipMissing")}
                {isClickable && ` — ${t("tooltipClickForMap")}`}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
