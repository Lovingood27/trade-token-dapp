import { SignInButton } from "@/components/InternetIdentity";
import { Layout } from "@/components/Layout";
import { TokenEventRow } from "@/components/TokenEventRow";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyEvents, useRecentEvents } from "@/hooks/useQueries";
import { eventKindLabel } from "@/lib/format";
import type { TokenEventKind } from "@/types";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { History as HistoryIcon, SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";

type KindFilter = "all" | "mint" | "use" | "burn";

interface HistorySearch {
  kind?: KindFilter;
}

const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All Events" },
  { value: "mint", label: "Minted" },
  { value: "use", label: "Used" },
  { value: "burn", label: "Burned" },
];

const KIND_VALUES: KindFilter[] = ["all", "mint", "use", "burn"];

const PUBLIC_FEED_LIMIT = 50n;

function parseKind(value: unknown): KindFilter {
  return KIND_VALUES.includes(value as KindFilter)
    ? (value as KindFilter)
    : "all";
}

function useSignedIn(): boolean {
  const { identity } = useInternetIdentity();
  return !!identity && !identity.getPrincipal().isAnonymous();
}

function FilterOption({
  active,
  label,
  onClick,
  ocid,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  ocid: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-ocid={ocid}
      aria-pressed={active}
      className={
        active
          ? "flex items-center justify-between rounded-sm bg-primary/10 px-3 py-2 text-left text-sm font-medium text-primary transition-smooth"
          : "flex items-center justify-between rounded-sm px-3 py-2 text-left text-sm text-muted-foreground transition-smooth hover:bg-secondary hover:text-foreground"
      }
    >
      <span>{label}</span>
      {active && (
        <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
      )}
    </button>
  );
}

function HistorySkeleton() {
  const ids = Array.from({ length: 6 }, (_, i) => `history-skeleton-${i}`);
  return (
    <ul className="divide-y divide-border rounded-md border border-border bg-card shadow-subtle">
      {ids.map((id) => (
        <li key={id} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function HistoryHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="flex flex-col gap-2 border-b border-border pb-6">
      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-primary">
        Ledger activity
      </p>
      <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        History
      </h1>
      <p className="max-w-2xl text-sm text-muted-foreground">
        {signedIn
          ? "The full record of token mint, use and burn events on your account, newest first."
          : "The public feed of token mint, use and burn events across the network, newest first."}
      </p>
    </header>
  );
}

export default function HistoryPage() {
  const signedIn = useSignedIn();
  const search = useSearch({ strict: false }) as HistorySearch;
  const navigate = useNavigate();

  const kind = parseKind(search.kind);
  const kindParam: TokenEventKind | null =
    kind === "all" ? null : (kind as TokenEventKind);

  const myEvents = useMyEvents(kindParam);
  const recentEvents = useRecentEvents(PUBLIC_FEED_LIMIT);

  const active = signedIn ? myEvents : recentEvents;
  const { isLoading, isError, refetch } = active;

  const rows = useMemo(() => {
    if (signedIn) {
      return (myEvents.data ?? []).map((event) => ({
        id: event.id.toString(),
        kind: event.kind,
        amount: event.amount,
        createdAt: event.createdAt,
        reason: event.reason,
        reference: event.reference,
        ownerShort: undefined as string | undefined,
      }));
    }
    return (recentEvents.data ?? []).map((event) => ({
      id: event.id.toString(),
      kind: event.kind,
      amount: event.amount,
      createdAt: event.createdAt,
      reason: event.reason,
      reference: event.reference,
      ownerShort: event.ownerShort,
    }));
  }, [signedIn, myEvents.data, recentEvents.data]);

  function updateKind(next: KindFilter) {
    void navigate({
      to: "/history",
      search: (prev: HistorySearch) => ({
        kind: next ?? prev.kind,
      }),
      replace: true,
    });
  }

  return (
    <Layout>
      <section
        data-ocid="history.page"
        className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
      >
        <HistoryHeader signedIn={signedIn} />

        {!signedIn && (
          <div
            data-ocid="history.signin_prompt"
            className="mt-6 flex flex-col gap-3 rounded-md border border-primary/30 bg-primary/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="font-display text-sm font-semibold text-foreground">
                Want your own history?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in with Internet Identity to see the mint, use and burn
                events on your account.
              </p>
            </div>
            <SignInButton className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-smooth hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60" />
          </div>
        )}

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          <aside
            data-ocid="history.filters.panel"
            className="w-full shrink-0 lg:w-64"
          >
            <div className="rounded-md border border-border bg-card shadow-subtle">
              <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                <SlidersHorizontal
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground">
                  Event Type
                </h2>
              </div>
              <div className="flex flex-col gap-1 px-2 py-3">
                {KIND_OPTIONS.map((option) => (
                  <FilterOption
                    key={option.value}
                    active={kind === option.value}
                    label={option.label}
                    ocid={`history.filter.kind.${option.value}`}
                    onClick={() => updateKind(option.value)}
                  />
                ))}
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {isLoading ? (
              <div data-ocid="history.loading_state">
                <HistorySkeleton />
              </div>
            ) : isError ? (
              <div
                data-ocid="history.error_state"
                className="flex flex-col items-center justify-center rounded-md border border-destructive/40 bg-destructive/5 px-6 py-16 text-center"
              >
                <h2 className="font-display text-lg font-bold text-foreground">
                  Could not load your history
                </h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  The ledger did not respond. Check your connection and try
                  again.
                </p>
                <Button
                  type="button"
                  onClick={() => void refetch()}
                  data-ocid="history.retry_button"
                  className="mt-5 rounded-md"
                >
                  Retry
                </Button>
              </div>
            ) : rows.length === 0 ? (
              <div
                data-ocid="history.empty_state"
                className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-card/50 px-6 py-20 text-center"
              >
                <div className="flex size-12 items-center justify-center rounded-full border border-border bg-muted">
                  <HistoryIcon
                    className="size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
                <h2 className="mt-4 font-display text-lg font-bold text-foreground">
                  No events to show
                </h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  {kind === "all"
                    ? signedIn
                      ? "Your ledger is empty. Mint, use or burn tokens and the events will appear here."
                      : "No token events have been recorded on the network yet."
                    : `There are no ${eventKindLabel(kind).toLowerCase()} events in this view. Try a different event type.`}
                </p>
                {kind !== "all" && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => updateKind("all")}
                    data-ocid="history.clear_filter_button"
                    className="mt-5 rounded-md"
                  >
                    Show all events
                  </Button>
                )}
              </div>
            ) : (
              <ul
                data-ocid="history.event_list"
                className="divide-y divide-border rounded-md border border-border bg-card shadow-subtle"
              >
                {rows.map((row, index) => (
                  <TokenEventRow
                    key={row.id}
                    kind={row.kind}
                    amount={row.amount}
                    createdAt={row.createdAt}
                    reason={row.reason}
                    reference={row.reference}
                    ownerShort={row.ownerShort}
                    index={index}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
