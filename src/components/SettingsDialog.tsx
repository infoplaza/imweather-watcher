import { useState, useEffect } from "react";
import { Settings, Info } from "lucide-react";
import { useTheme } from "next-themes";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useSettings, type AppSettings } from "@/lib/appSettings";
import { useI18n } from "@/lib/i18n";

export function SettingsDialog() {
  const { settings, updateSettings } = useSettings();
  const { lang } = useI18n();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<AppSettings>(settings);

  useEffect(() => {
    if (open) setLocal(settings);
  }, [open]);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      updateSettings(local);
    }
    setOpen(isOpen);
  };

  const t = (nl: string, en: string) => lang === "nl" ? nl : en;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title={t("Instellingen", "Settings")}>
          <Settings className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Instellingen", "Settings")}</DialogTitle>
          <DialogDescription>{t("Pas de applicatie-instellingen aan.", "Adjust application settings.")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Theme */}
          <div className="space-y-2">
            <Label className="text-sm">{t("Thema", "Theme")}</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">{t("Donker", "Dark")}</SelectItem>
                <SelectItem value="light">{t("Licht", "Light")}</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show beta models */}
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t("Toon beta modellen", "Show beta models")}</Label>
            <Switch checked={local.showBeta} onCheckedChange={v => setLocal(p => ({ ...p, showBeta: v }))} />
          </div>

          {/* Refresh interval */}
          <div className="space-y-2">
            <Label className="text-sm">{t("Verversingsfrequentie", "Refresh frequency")}</Label>
            <Select value={String(local.refreshInterval)} onValueChange={v => setLocal(p => ({ ...p, refreshInterval: Number(v) }))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 3, 5, 10].map(m => (
                  <SelectItem key={m} value={String(m)}>{m} {t("minuten", "minutes")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Critical percentage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-sm">{t("Kritiek percentage", "Critical percentage")}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px] text-xs">
                      {t(
                        "Is er minder dan dit percentage beschikbaar, dan kleurt het model rood. Modellen boven dit percentage worden niet als 'Mislukt' gemarkeerd, ook niet bij een timeout.",
                        "If less than this percentage is available, the model turns red. Models above this percentage are never marked as 'Failed', even after a timeout."
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-sm font-mono text-muted-foreground">{local.criticalPct}%</span>
            </div>
            <Slider
              min={50}
              max={100}
              step={5}
              value={[local.criticalPct]}
              onValueChange={([v]) => setLocal(p => ({ ...p, criticalPct: v }))}
            />
          </div>

          {/* Processing timeout */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-sm">{t("Processing timeout", "Processing timeout")}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px] text-xs">
                      {t(
                        "Als een model langer dan dit aantal minuten geen nieuwe data ontvangt én onder het kritiek percentage zit, wordt de status van 'Bezig' naar 'Mislukt' gezet.",
                        "If a model receives no new data for this many minutes and is below the critical percentage, its status changes from 'Processing' to 'Failed'."
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-sm font-mono text-muted-foreground">{local.staleMinutes} min</span>
            </div>
            <Slider
              min={10}
              max={60}
              step={5}
              value={[local.staleMinutes]}
              onValueChange={([v]) => setLocal(p => ({ ...p, staleMinutes: v }))}
            />
          </div>

          {/* Visible runs */}
          <div className="space-y-2">
            <Label className="text-sm">{t("Zichtbare modelruns", "Visible model runs")}</Label>
            <RadioGroup value={String(local.visibleRuns)} onValueChange={v => setLocal(p => ({ ...p, visibleRuns: Number(v) as 1 | 2 }))}>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="1" id="runs-1" />
                  <Label htmlFor="runs-1" className="text-sm font-normal">1 run</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="2" id="runs-2" />
                  <Label htmlFor="runs-2" className="text-sm font-normal">2 runs</Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Stale factor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label className="text-sm">{t("Stale factor", "Stale factor")}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[260px] text-xs">
                      {t(
                        "Bepaalt wanneer een model als verouderd wordt gemarkeerd. De leeftijd van de laatste run wordt vergeleken met het verwachte interval × deze factor. Hogere waarde = minder snel een waarschuwing.",
                        "Determines when a model is marked as stale. The age of the latest run is compared to the expected interval × this factor. Higher value = less sensitive."
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="text-sm font-mono text-muted-foreground">{local.staleFactor.toFixed(2)}</span>
            </div>
            <Slider
              min={1.3}
              max={2.3}
              step={0.01}
              value={[local.staleFactor]}
              onValueChange={([v]) => setLocal(p => ({ ...p, staleFactor: Math.round(v * 100) / 100 }))}
          />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
