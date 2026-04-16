import { Clock } from "lucide-react";

interface SequenceSegment {
  from: number;
  step: number;
  to: number;
  count: number;
}

function getSegmentColor(step: number): string {
  if (step <= 1) return "bg-primary";
  if (step <= 3) return "bg-primary/60";
  return "bg-primary/40";
}

function parseSequences(sequences: string[]): SequenceSegment[] {
  const seen = new Set<string>();
  const segments: SequenceSegment[] = [];
  for (const seq of sequences) {
    const outerMatch = seq.match(/seq:\[(.+)\]/);
    if (!outerMatch) continue;
    const parts = outerMatch[1].split(",");
    for (const part of parts) {
      const match = part.trim().match(/^(\d+):(\d+):(\d+)$/);
      if (!match) continue;
      const key = match[0];
      if (seen.has(key)) continue;
      seen.add(key);
      const from = Number(match[1]);
      const step = Number(match[2]);
      const to = Number(match[3]);
      const count = Math.floor((to - from) / step);
      segments.push({ from, step, to, count });
    }
  }
  return segments;
}

function formatInterval(step: number): string {
  if (step === 1) return "elk uur";
  return `elke ${step} uur`;
}

function hoursToDays(hours: number): string {
  const days = Math.round((hours / 24) * 10) / 10;
  if (days === 1) return "1 dag";
  return `${days} dagen`;
}

export function ForecastTimeline({ sequences }: { sequences: string[] }) {
  const segments = parseSequences(sequences);
  if (segments.length === 0) return null;

  const maxHour = Math.max(...segments.map((s) => s.to));
  const totalSteps = segments.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="rounded-md border bg-secondary/30 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          Voorspellingstijdlijn
        </h4>
        <span className="text-xs font-medium text-foreground">
          Tot <strong>{hoursToDays(maxHour)}</strong> vooruit
        </span>
      </div>

      {/* Timeline bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-secondary">
        {segments.map((seg, i) => {
          const widthPct = ((seg.to - seg.from) / maxHour) * 100;
          return (
            <div
              key={i}
              className={`${getSegmentColor(seg.step)} transition-all`}
              style={{ width: `${widthPct}%` }}
              title={`${seg.from}h – ${seg.to}h (${formatInterval(seg.step)})`}
            />
          );
        })}
      </div>

      {/* Segment labels */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${segments.length}, 1fr)` }}>
        {segments.map((seg, i) => (
          <div key={i} className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className={`inline-block h-2 w-2 rounded-full ${getSegmentColor(seg.step)}`} />
              <span className="text-xs font-medium">{seg.from}h – {seg.to}h</span>
            </div>
            <p className="text-[11px] text-muted-foreground pl-3.5">
              {formatInterval(seg.step)} · {seg.count} stappen
            </p>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground text-right">
        Totaal: {totalSteps} tijdstappen
      </p>
    </div>
  );
}
