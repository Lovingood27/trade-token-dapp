import { SignInButton } from "@/components/InternetIdentity";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/format";
import type { BalanceView } from "@/types";
import { ArrowDownLeft, ArrowUpRight, Flame, Wallet } from "lucide-react";

/** One labelled figure inside the balance panel. */
function BalanceStat({
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
    <div className="rounded-md border border-border bg-background/40 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest">
          {label}
        </span>
      </div>
      <p
        className={`mt-2 font-numeric text-xl font-semibold tracking-tight ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

/** Loading skeleton matching the balance panel layout. */
export function BalanceSummarySkeleton() {
  const ids = Array.from({ length: 3 }, (_, i) => `balance-skeleton-${i}`);
  return (
    <div
      data-ocid="dashboard.balance.loading_state"
      className="rounded-md border border-border bg-card p-6 shadow-subtle"
    >
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-4 h-12 w-48" />
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ids.map((id) => (
          <Skeleton key={id} className="h-20 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

/** Error state for the balance panel with a retry action. */
export function BalanceSummaryError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      data-ocid="dashboard.balance.error_state"
      className="flex flex-col items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-6"
    >
      <p className="text-sm text-foreground">
        We could not load your token balance. Please try again.
      </p>
      <button
        type="button"
        data-ocid="dashboard.balance.retry_button"
        onClick={onRetry}
        className="rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-smooth hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Retry
      </button>
    </div>
  );
}

/**
 * Signed-out prompt shown where the personal balance would appear. Keeps the
 * explorer public while inviting visitors to sign in for their own figures.
 */
export function BalanceSignInPrompt() {
  return (
    <div
      data-ocid="dashboard.balance.sign_in_prompt"
      className="flex flex-col items-start gap-4 rounded-md border border-dashed border-border bg-card/60 p-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
          <Wallet className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
            Your token balance
          </h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Sign in with Internet Identity to see your Trade Token balance,
            tokens earned and used, and your own mint, use and burn activity.
          </p>
        </div>
      </div>
      <SignInButton className="shrink-0 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-subtle transition-smooth hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60" />
    </div>
  );
}

/**
 * Prominent personal balance panel: current balance headline with tokens
 * earned, used and burned summarized beneath it.
 */
export function BalanceSummary({ balance }: { balance: BalanceView }) {
  return (
    <div
      data-ocid="dashboard.balance.panel"
      className="rounded-md border border-border bg-card p-6 shadow-subtle"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Wallet className="size-4" aria-hidden="true" />
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest">
          Current balance
        </span>
      </div>
      <p
        data-ocid="dashboard.balance.value"
        className="mt-3 font-numeric text-4xl font-bold tracking-tight text-primary md:text-5xl"
      >
        {formatAmount(balance.balance)}
        <span className="ml-2 align-middle text-base font-medium text-muted-foreground">
          TT
        </span>
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BalanceStat
          icon={<ArrowDownLeft className="size-4" aria-hidden="true" />}
          label="Earned"
          value={formatAmount(balance.earned)}
          tone="primary"
        />
        <BalanceStat
          icon={<ArrowUpRight className="size-4" aria-hidden="true" />}
          label="Used"
          value={formatAmount(balance.used)}
          tone="accent"
        />
        <BalanceStat
          icon={<Flame className="size-4" aria-hidden="true" />}
          label="Burned"
          value={formatAmount(balance.burned)}
          tone="muted"
        />
      </div>
    </div>
  );
}
