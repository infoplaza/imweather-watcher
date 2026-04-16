import { cn } from "@/lib/utils";
import type { ModelRun } from "@/lib/weatherModels";
import { useI18n } from "@/lib/i18n";

export function StatusBadge({ status }: { status: ModelRun["status"] }) {
  const { t } = useI18n();

  const statusConfig: Record<ModelRun["status"], { label: string; className: string }> = {
    complete: { label: t("statusComplete"), className: "bg-success/20 text-success border-success/30" },
    partial: { label: t("statusPartial"), className: "bg-warning/20 text-warning border-warning/30" },
    missing: { label: t("statusMissing"), className: "bg-destructive/20 text-destructive border-destructive/30" },
    processing: { label: t("statusProcessing"), className: "bg-processing/20 text-processing border-processing/30 animate-pulse-slow" },
    failed: { label: t("statusFailed"), className: "bg-destructive/20 text-destructive border-destructive/30" },
  };

  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-mono font-medium", config.className)}>
      {config.label}
    </span>
  );
}