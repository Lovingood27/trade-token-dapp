import { Skeleton } from "@/components/ui/skeleton";
import { eventKindLabel, formatAmount, formatDateTime } from "@/lib/format";
import type { PublicEventView, TokenEvent, TokenEventKind } from "@/types";
import { ArrowDownLeft, ArrowUpRight, Flame, Inbox } from "lucide-react";

/** A single normalized ledger row, shared by the personal and public feeds. */
export interface ActivityRow {
  id: string;
  kind: TokenEventKind;
  amount: bigint;
  reason: string;
  reference?: string;
  createdAt: bigint;
  /** Shortened owner principal, shown only on the public feed. */
  ownerShort?: string;
}

/** Normalize a personal event into a feed row. */
export function toActivityRow(event: TokenEvent): ActivityRow {
  return {
    id: event.id.toString(),
    kind: event.kind,
    amount: event.amount,
    reason: event.reason,
    reference: event.reference,
    createdAt: event.createdAt,
  };
}

/** Normalize a public event into a feed row. */
export function toPublicActivityRow(event: PublicEventView): ActivityRow {
  return {
    id: event.id.toString(),
    kind: event.kind,
    amount: event.amount,
    reason: event.reason,
    reference: event.reference,
    createdAt: event.createdAt,
    ownerShort: event.ownerShort,
  };
}

const kindStyles: Record<
  TokenEventKind,
  { icon: React.ReactNode; chip: string }
> = {
  mint: {
    icon: <ArrowDownLeft className="size-4" aria-hidden="true" />,
    chip: "border-primary/50 bg-primary/10 text-primary",
  },
  use: {
    icon: <ArrowUpRight className="size-4" aria-hidden="true" />,
    chip: "border-accent/50 bg-accent/10 text-accent",
  },
  burn: {
    icon: <Flame className="size-4" aria-hidden="true" />,
    chip: "border-border bg-muted text-muted-foreground",
  },
};

function ActivityItem({ row, index }: { row: ActivityRow; index: number }) {
  const style = kindStyles[row.kind];
  return (
    <li
      data-ocid={`dashboard.activity.item.${index + 1}`}
      className="flex items-center gap-4 px-5 py-4 transition-smooth animate-fade-in-up hover:bg-secondary/40"
      style={{ animationDelay: `${Math.min(index, 11) * 50}ms` }}
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${style.chip}`}
      >
        {style.icon}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {eventKindLabel(row.kind)}
          </span>
          {row.reference && (
            <span className="font-numeric text-[0.65rem] text-muted-foreground">
              {row.reference}
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {row.reason}
          {row.ownerShort && (
            <>
              <span aria-hidden="true"> · </span>
              <span className="font-numeric">{row.ownerShort}</span>
            </>
          )}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-numeric text-sm font-semibold text-foreground">
          {formatAmount(row.amount)}
        </p>
        <p className="mt-0.5 font-numeric text-[0.65rem] text-muted-foreground">
          {formatDateTime(row.createdAt)}
        </p>
      </div>
    </li>
  );
}

/** Loading skeleton matching the feed row layout. */
export function ActivityFeedSkeleton() {
  const ids = Array.from({ length: 5 }, (_, i) => `activity-skeleton-${i}`);
  return (
    <ul
      data-ocid="dashboard.activity.loading_state"
      className="divide-y divide-border"
    >
      {ids.map((id) => (
        <li key={id} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="space-y-2">
            <Skeleton className="ml-auto h-3.5 w-16" />
            <Skeleton className="ml-auto h-3 w-24" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Error state for the activity feed with a retry action. */
export function ActivityFeedError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      data-ocid="dashboard.activity.error_state"
      className="flex flex-col items-start gap-3 p-6"
    >
      <p className="text-sm text-foreground">
        We could not load the activity feed. Please try again.
      </p>
      <button
        type="button"
        data-ocid="dashboard.activity.retry_button"
        onClick={onRetry}
        className="rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-smooth hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Retry
      </button>
    </div>
  );
}

/** Empty state for the activity feed. */
export function ActivityFeedEmpty({ message }: { message: string }) {
  return (
    <div
      data-ocid="dashboard.activity.empty_state"
      className="flex flex-col items-center justify-center px-6 py-14 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
        <Inbox className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-4 max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Ledger-style feed of token events. Renders personal or public rows through
 * the same normalized shape.
 */
export function ActivityFeed({ rows }: { rows: ActivityRow[] }) {
  return (
    <ul data-ocid="dashboard.activity.list" className="divide-y divide-border">
      {rows.map((row, index) => (
        <ActivityItem key={row.id} row={row} index={index} />
      ))}
    </ul>
  );
}
