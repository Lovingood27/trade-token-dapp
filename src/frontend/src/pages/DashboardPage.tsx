import {
  ActivityFeed,
  ActivityFeedEmpty,
  ActivityFeedError,
  ActivityFeedSkeleton,
  toActivityRow,
  toPublicActivityRow,
} from "@/components/ActivityFeed";
import {
  BalanceSignInPrompt,
  BalanceSummary,
  BalanceSummaryError,
  BalanceSummarySkeleton,
} from "@/components/BalanceSummary";
import { Layout } from "@/components/Layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useLedgerSummary,
  useMyBalance,
  useMyEvents,
  useRecentEvents,
} from "@/hooks/useQueries";
import { formatAmount } from "@/lib/format";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Coins,
  FileText,
  Flame,
  Users,
  Wallet,
} from "lucide-react";

const RECENT_EVENT_LIMIT = 12n;

function useSignedIn(): boolean {
  const { identity } = useInternetIdentity();
  return !!identity && !identity.getPrincipal().isAnonymous();
}

/** One network-total figure in the explorer strip. */
function NetworkStat({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "primary" | "accent" | "muted";
}) {
  const valueClass =
    tone === "primary"
      ? "text-primary"
      : tone === "accent"
        ? "text-accent"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";
  return (
    <div
      data-ocid="dashboard.network.stat"
      className="rounded-md border border-border bg-card p-5 shadow-subtle"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest">
          {label}
        </span>
      </div>
      <p
        className={`mt-2 font-numeric text-2xl font-semibold tracking-tight ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function NetworkStatsSkeleton() {
  const ids = Array.from({ length: 5 }, (_, i) => `network-skeleton-${i}`);
  return (
    <div
      data-ocid="dashboard.network.loading_state"
      className="grid grid-cols-2 gap-4 lg:grid-cols-5"
    >
      {ids.map((id) => (
        <div
          key={id}
          className="rounded-md border border-border bg-card p-5 shadow-subtle"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Public explorer: network totals plus the recent token activity feed. */
function ExplorerView() {
  const summary = useLedgerSummary();
  const recent = useRecentEvents(RECENT_EVENT_LIMIT);

  const rows = (recent.data ?? []).map(toPublicActivityRow);

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="network-heading">
        <div className="flex items-baseline justify-between">
          <h2
            id="network-heading"
            className="font-display text-xl font-semibold tracking-tight text-foreground"
          >
            Network totals
          </h2>
          <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
            Live ledger
          </span>
        </div>
        <div className="ledger-rule mt-3" />

        <div className="mt-6">
          {summary.isError ? (
            <div
              data-ocid="dashboard.network.error_state"
              className="flex flex-col items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-5"
            >
              <p className="text-sm text-foreground">
                We could not load the network totals. Please try again.
              </p>
              <button
                type="button"
                data-ocid="dashboard.network.retry_button"
                onClick={() => void summary.refetch()}
                className="rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-smooth hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Retry
              </button>
            </div>
          ) : summary.isLoading || !summary.data ? (
            <NetworkStatsSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
              <NetworkStat
                icon={<Coins className="size-4" aria-hidden="true" />}
                label="Tokens minted"
                value={formatAmount(summary.data.totalMinted)}
                tone="primary"
              />
              <NetworkStat
                icon={<ArrowUpRight className="size-4" aria-hidden="true" />}
                label="Tokens used"
                value={formatAmount(summary.data.totalUsed)}
                tone="accent"
              />
              <NetworkStat
                icon={<Flame className="size-4" aria-hidden="true" />}
                label="Tokens burned"
                value={formatAmount(summary.data.totalBurned)}
                tone="muted"
              />
              <NetworkStat
                icon={<FileText className="size-4" aria-hidden="true" />}
                label="Invoices scanned"
                value={summary.data.invoiceCount.toString()}
              />
              <NetworkStat
                icon={<Users className="size-4" aria-hidden="true" />}
                label="Participants"
                value={summary.data.participantCount.toString()}
              />
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="recent-heading">
        <div className="flex items-baseline justify-between">
          <h2
            id="recent-heading"
            className="font-display text-xl font-semibold tracking-tight text-foreground"
          >
            Recent token activity
          </h2>
          <Link
            to="/history"
            data-ocid="dashboard.recent.view_all.link"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-smooth hover:text-primary"
          >
            View history
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="ledger-rule mt-3" />

        <div className="mt-6 overflow-hidden rounded-md border border-border bg-card shadow-subtle">
          {recent.isError ? (
            <ActivityFeedError onRetry={() => void recent.refetch()} />
          ) : recent.isLoading ? (
            <ActivityFeedSkeleton />
          ) : rows.length === 0 ? (
            <ActivityFeedEmpty message="No token activity yet. Mint, use and burn events will appear here as the ledger is used." />
          ) : (
            <ActivityFeed rows={rows} />
          )}
        </div>
      </section>
    </div>
  );
}

/** Signed-in personal dashboard: balance headline plus the caller's own feed. */
function PersonalDashboard() {
  const balance = useMyBalance();
  const events = useMyEvents(null);

  const rows = (events.data ?? []).map(toActivityRow);

  return (
    <section aria-labelledby="personal-heading" className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between">
        <h2
          id="personal-heading"
          className="font-display text-xl font-semibold tracking-tight text-foreground"
        >
          Your dashboard
        </h2>
        <Link
          to="/history"
          data-ocid="dashboard.personal.view_all.link"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-smooth hover:text-primary"
        >
          Full history
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="ledger-rule" />

      {balance.isError ? (
        <BalanceSummaryError onRetry={() => void balance.refetch()} />
      ) : balance.isLoading || !balance.data ? (
        <BalanceSummarySkeleton />
      ) : (
        <BalanceSummary balance={balance.data} />
      )}

      <div className="overflow-hidden rounded-md border border-border bg-card shadow-subtle">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Wallet className="size-4 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">
            Your recent activity
          </h3>
        </div>
        {events.isError ? (
          <ActivityFeedError onRetry={() => void events.refetch()} />
        ) : events.isLoading ? (
          <ActivityFeedSkeleton />
        ) : rows.length === 0 ? (
          <ActivityFeedEmpty message="You have no mint, use or burn events yet. Scan an invoice to mint your first Trade Tokens." />
        ) : (
          <ActivityFeed rows={rows} />
        )}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const signedIn = useSignedIn();

  return (
    <Layout>
      <section
        data-ocid="dashboard.page"
        className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
      >
        <header className="flex flex-col gap-2 border-b border-border pb-6">
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-primary">
            On-chain Trade Ledger
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Explorer
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Network totals and recent mint, use and burn activity across the
            Trade Token ledger.
          </p>
        </header>

        <div className="mt-10 flex flex-col gap-12">
          {signedIn ? <PersonalDashboard /> : <BalanceSignInPrompt />}
          <ExplorerView />
        </div>
      </section>
    </Layout>
  );
}
