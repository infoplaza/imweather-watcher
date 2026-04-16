import { useState } from "react";
import { FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { APP_VERSION, CHANGELOG } from "@/lib/version";
import { useI18n } from "@/lib/i18n";

export function ChangelogDialog() {
  const [open, setOpen] = useState(false);
  const { t, lang } = useI18n();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground font-mono transition-colors cursor-pointer">
          v{APP_VERSION}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            {t("changelog")}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 -mr-4 pr-4">
          <div className="space-y-5 pb-2">
            {CHANGELOG.map((entry) => (
              <div key={entry.version} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    v{entry.version}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-mono">
                    {entry.date}
                  </span>
                </div>
                <ul className="space-y-1 pl-1">
                  {entry.changes.map((change, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-primary/60 shrink-0">•</span>
                      <span>{change[lang]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
