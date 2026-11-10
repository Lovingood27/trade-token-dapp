import { FundingProgress } from "@/components/FundingProgress";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { useFundedTokens } from "@/hooks/useQueries";
import {
  formatDate,
  formatMoney,
  formatPercent,
  tokenKindLabel,
} from "@/lib/format";
import type { FundedTokenView } from "@/types";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Briefcase, TrendingUp, Wallet } from "lucide-react";

function fundingRatio(view: FundedTokenView): number {
  const target = view.token.fundingTarget;
  if (target <= 0n) return 0;
  return Number(view.token.amountFunded) / Number(target);
}

function HoldingCard({
  view,
  index,
}: { view: FundedTokenView; index: number }) {
  const { token, commitment } = view;
  const ratio = fundingRatio(view);
  return (
    <li
      data-ocid={`portfolio.item.${index + 1}`}
      className="animate-fade-in-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <Link
        to="/token/$tokenId"
        params={{ tokenId: token.id.toString() }}
        data-ocid={`portfolio.item.${index + 1}.link`}
        className="group block rounded-md border border-border bg-card p-5 shadow-subtle transition-smooth hover:border-primary/40 hover:shadow-elevated focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground">
                {tokenKindLabel(token.kind)}
              </span>
              <span className="text-muted-foreground/50" aria-hidden="true">
                ·
              </span>
              <span className="font-mono text-[0.65rem] text-muted-foreground">
                #{token.id.toString()}
              </span>
            </div>
            <h3 className="mt-1.5 truncate font-display text-lg font-semibold tracking-tight text-foreground">
              {token.debtorName}
            </h3>
          </div>
          <StatusBadge status={token.status} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
              Committed
            </p>
            <p className="mt-0.5 font-numeric text-sm font-medium text-foreground">
              {formatMoney(commitment.amount, token.currency)}
            </p>
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
              Expected return
            </p>
            <p className="mt-0.5 font-numeric text-sm font-medium text-primary">
              {formatMoney(commitment.expectedReturn, token.currency)}
            </p>
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
              Maturity
            </p>
            <p className="mt-0.5 font-numeric text-sm font-medium text-accent">
              {formatDate(token.maturityDate)}
            </p>
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
              Face value
            </p>
            <p className="mt-0.5 font-numeric text-sm font-medium text-foreground">
              {formatMoney(token.faceValue, token.currency)}
            </p>
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
              Funding progress
            </span>
            <span className="font-numeric text-[0.65rem] text-muted-foreground">
              {formatMoney(token.amountFunded, token.currency)} /{" "}
              {formatMoney(token.fundingTarget, token.currency)}
            </span>
          </div>
          <FundingProgress ratio={ratio} />
        </div>

        <div className="mt-4 flex items-center justify-end gap-1 text-xs font-medium text-muted-foreground transition-smooth group-hover:text-primary">
          View token
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </div>
      </Link>
    </li>
  );
}

function SummaryStat({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "primary";
}) {
  return (
    <div className="rounded-md border border-border bg-card p-5 shadow-subtle">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[0.65rem] font-semibold uppercase tracking-widest">
          {label}
        </span>
      </div>
      <p
        className={
          tone === "primary"
            ? "mt-2 font-numeric text-2xl font-semibold text-primary"
            : "mt-2 font-numeric text-2xl font-semibold text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}

function PortfolioSkeleton() {
  const ids = Array.from({ length: 3 }, (_, i) => `portfolio-skeleton-${i}`);
  return (
    <ul
      data-ocid="portfolio.loading_state"
      className="grid grid-cols-1 gap-4 lg:grid-cols-2"
    >
      {ids.map((id) => (
        <li
          key={id}
          className="h-64 animate-pulse-soft rounded-md border border-border bg-card"
        />
      ))}
    </ul>
  );
}

function EmptyPortfolio() {
  return (
    <div
      data-ocid="portfolio.empty_state"
      className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-card/50 px-6 py-16 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
        <Briefcase className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-xl font-semibold tracking-tight text-foreground">
        No holdings yet
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        You have not funded any Trade Tokens. Browse the marketplace to commit
        capital to open invoices and purchase orders.
      </p>
      <Link
        to="/"
        data-ocid="portfolio.browse_marketplace.link"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-subtle transition-smooth hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Browse marketplace
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

export default function PortfolioPage() {
  const { data, isLoading, isError, refetch } = useFundedTokens();
  const holdings = data ?? [];

  const totalCommitted = holdings.reduce(
    (sum, view) => sum + view.commitment.amount,
    0n,
  );
  const totalExpectedReturn = holdings.reduce(
    (sum, view) => sum + view.commitment.expectedReturn,
    0n,
  );
  const currency = holdings[0]?.token.currency ?? "USD";
  const blendedReturn =
    totalCommitted > 0n
      ? Number(totalExpectedReturn - totalCommitted) / Number(totalCommitted)
      : 0;

  return (
    <Layout>
      <section
        data-ocid="portfolio.page"
        className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
      >
        <header className="flex flex-col gap-2">
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
            Investor ledger
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Portfolio
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Track the Trade Tokens you have funded, their funding progress, and
            the returns due at maturity.
          </p>
        </header>

        {isError ? (
          <div
            data-ocid="portfolio.error_state"
            className="mt-8 flex flex-col items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-5"
          >
            <p className="text-sm text-foreground">
              We could not load your portfolio. Please try again.
            </p>
            <button
              type="button"
              data-ocid="portfolio.retry_button"
              onClick={() => void refetch()}
              className="rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-smooth hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="mt-8">
            <PortfolioSkeleton />
          </div>
        ) : holdings.length === 0 ? (
          <div className="mt-8">
            <EmptyPortfolio />
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SummaryStat
                icon={<Wallet className="size-4" aria-hidden="true" />}
                label="Total committed"
                value={formatMoney(totalCommitted, currency)}
              />
              <SummaryStat
                icon={<TrendingUp className="size-4" aria-hidden="true" />}
                label="Total expected return"
                value={formatMoney(totalExpectedReturn, currency)}
                tone="primary"
              />
              <SummaryStat
                icon={<Briefcase className="size-4" aria-hidden="true" />}
                label="Blended return"
                value={formatPercent(blendedReturn)}
              />
            </div>

            <div className="mt-10 flex items-baseline justify-between">
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                Holdings
              </h2>
              <span className="font-numeric text-xs text-muted-foreground">
                {holdings.length}{" "}
                {holdings.length === 1 ? "position" : "positions"}
              </span>
            </div>
            <div className="ledger-rule mt-3" />

            <ul
              data-ocid="portfolio.list"
              className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2"
            >
              {holdings.map((view, index) => (
                <HoldingCard
                  key={view.commitment.id.toString()}
                  view={view}
                  index={index}
                />
              ))}
            </ul>
          </>
        )}
      </section>
    </Layout>
  );
}
