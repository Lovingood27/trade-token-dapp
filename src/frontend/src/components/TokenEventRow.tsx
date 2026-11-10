import { Badge } from "@/components/ui/badge";
import { eventKindLabel, formatAmount, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TokenEventKind } from "@/types";
import { ArrowDownLeft, ArrowUpRight, Flame } from "lucide-react";

type EventTone = "mint" | "use" | "burn";

const toneClasses: Record<EventTone, string> = {
  mint: "border-primary/60 bg-primary/10 text-primary",
  use: "border-accent/50 bg-accent/10 text-accent",
  burn: "border-destructive/50 bg-destructive/10 text-destructive",
};

const iconClasses: Record<EventTone, string> = {
  mint: "border-primary/40 bg-primary/10 text-primary",
  use: "border-accent/40 bg-accent/10 text-accent",
  burn: "border-destructive/40 bg-destructive/10 text-destructive",
};

function toneFor(kind: string): EventTone {
  return kind === "mint" || kind === "use" || kind === "burn" ? kind : "use";
}

function EventIcon({ tone }: { tone: EventTone }) {
  const Icon =
    tone === "mint" ? ArrowDownLeft : tone === "burn" ? Flame : ArrowUpRight;
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full border",
        iconClasses[tone],
      )}
      aria-hidden="true"
    >
      <Icon className="size-4" />
    </span>
  );
}

export interface TokenEventRowProps {
  kind: TokenEventKind;
  amount: bigint;
  createdAt: bigint;
  reason: string;
  reference?: string;
  /** Short principal label shown for public feed rows. */
  ownerShort?: string;
  index: number;
}

/**
 * One ledger event row: kind chip, amount, timestamp and the linked invoice or
 * action reference. Shared by the personal history and the public feed.
 */
export function TokenEventRow({
  kind,
  amount,
  createdAt,
  reason,
  reference,
  ownerShort,
  index,
}: TokenEventRowProps) {
  const tone = toneFor(kind);
  return (
    <li
      data-ocid={`history.row.${index + 1}`}
      className="flex flex-col gap-3 border-b border-border px-4 py-4 transition-smooth last:border-b-0 hover:bg-secondary/40 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <EventIcon tone={tone} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-widest",
                toneClasses[tone],
              )}
            >
              {eventKindLabel(kind)}
            </Badge>
            {reference && (
              <span className="font-mono text-[0.7rem] text-muted-foreground">
                {reference}
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-foreground">{reason}</p>
          {ownerShort && (
            <p className="mt-0.5 font-mono text-[0.7rem] text-muted-foreground">
              {ownerShort}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-center sm:gap-1">
        <span className="font-numeric text-base font-semibold text-foreground">
          {formatAmount(amount)}
        </span>
        <time
          dateTime={new Date(Number(createdAt / 1_000_000n)).toISOString()}
          className="text-xs text-muted-foreground"
        >
          {formatDateTime(createdAt)}
        </time>
      </div>
    </li>
  );
}
