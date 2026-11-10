import { Layout } from "@/components/Layout";
import { TokenCard } from "@/components/TokenCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarketplace } from "@/hooks/useQueries";
import { formatMoney } from "@/lib/format";
import { TokenSort, type TokenStatus } from "@/types";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";

type StatusFilter = "all" | "open" | "funded" | "matured";

interface MarketplaceSearch {
  status?: StatusFilter;
  sort?: TokenSort;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Tokens" },
  { value: "open", label: "Open" },
  { value: "funded", label: "Funded" },
  { value: "matured", label: "Matured" },
];

const SORT_OPTIONS: { value: TokenSort; label: string }[] = [
  { value: TokenSort.fundingProgress, label: "Funding Progress" },
  { value: TokenSort.faceValue, label: "Face Value" },
  { value: TokenSort.maturityDate, label: "Maturity Date" },
];

const STATUS_VALUES: StatusFilter[] = ["all", "open", "funded", "matured"];
const SORT_VALUES: TokenSort[] = [
  TokenSort.fundingProgress,
  TokenSort.faceValue,
  TokenSort.maturityDate,
];

function parseStatus(value: unknown): StatusFilter {
  return STATUS_VALUES.includes(value as StatusFilter)
    ? (value as StatusFilter)
    : "all";
}

function parseSort(value: unknown): TokenSort {
  return SORT_VALUES.includes(value as TokenSort)
    ? (value as TokenSort)
    : TokenSort.fundingProgress;
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border px-5 py-4 last:border-b-0">
      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <div className="mt-3 flex flex-col gap-1">{children}</div>
    </div>
  );
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

function MarketplaceSkeleton() {
  const ids = Array.from({ length: 6 }, (_, i) => `marketplace-skeleton-${i}`);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {ids.map((id) => (
        <div
          key={id}
          className="flex flex-col gap-4 rounded-md border border-border bg-card p-5"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-1.5 w-full rounded-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function MarketplacePage() {
  const search = useSearch({ strict: false }) as MarketplaceSearch;
  const navigate = useNavigate();

  const status = parseStatus(search.status);
  const sort = parseSort(search.sort);

  const statusParam: TokenStatus | null =
    status === "all" ? null : (status as TokenStatus);

  const { data, isLoading, isError, refetch } = useMarketplace(
    statusParam,
    sort,
  );

  const tokens = useMemo(() => data ?? [], [data]);

  const totals = useMemo(() => {
    let faceValue = 0n;
    let funded = 0n;
    for (const token of tokens) {
      faceValue += token.faceValue;
      funded += token.amountFunded;
    }
    return { faceValue, funded, count: tokens.length };
  }, [tokens]);

  function updateSearch(next: Partial<MarketplaceSearch>) {
    void navigate({
      to: "/",
      search: (prev: MarketplaceSearch) => ({
        status: next.status ?? prev.status ?? "all",
        sort: next.sort ?? prev.sort ?? TokenSort.fundingProgress,
      }),
      replace: true,
    });
  }

  return (
    <Layout>
      <section
        data-ocid="marketplace.page"
        className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
      >
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-primary">
              On-chain Trade Ledger
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Marketplace
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Browse tokenized invoices and purchase orders open for funding,
              already funded, or settled at maturity.
            </p>
          </div>
          <dl className="flex gap-6">
            <div>
              <dt className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                Tokens
              </dt>
              <dd className="mt-1 font-numeric text-xl font-semibold text-foreground">
                {totals.count}
              </dd>
            </div>
            <div>
              <dt className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                Face Value
              </dt>
              <dd className="mt-1 font-numeric text-xl font-semibold text-foreground">
                {formatMoney(totals.faceValue)}
              </dd>
            </div>
            <div>
              <dt className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
                Funded
              </dt>
              <dd className="mt-1 font-numeric text-xl font-semibold text-primary">
                {formatMoney(totals.funded)}
              </dd>
            </div>
          </dl>
        </header>

        <div className="mt-8 flex flex-col gap-8 lg:flex-row">
          <aside
            data-ocid="marketplace.filters.panel"
            className="w-full shrink-0 lg:w-64"
          >
            <div className="rounded-md border border-border bg-card shadow-subtle">
              <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                <SlidersHorizontal
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground">
                  Filters &amp; Controls
                </h2>
              </div>

              <FilterGroup label="Status">
                {STATUS_OPTIONS.map((option) => (
                  <FilterOption
                    key={option.value}
                    active={status === option.value}
                    label={option.label}
                    ocid={`marketplace.filter.status.${option.value}`}
                    onClick={() => updateSearch({ status: option.value })}
                  />
                ))}
              </FilterGroup>

              <FilterGroup label="Sort By">
                {SORT_OPTIONS.map((option) => (
                  <FilterOption
                    key={option.value}
                    active={sort === option.value}
                    label={option.label}
                    ocid={`marketplace.sort.${option.value}`}
                    onClick={() => updateSearch({ sort: option.value })}
                  />
                ))}
              </FilterGroup>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {isLoading ? (
              <div data-ocid="marketplace.loading_state">
                <MarketplaceSkeleton />
              </div>
            ) : isError ? (
              <div
                data-ocid="marketplace.error_state"
                className="flex flex-col items-center justify-center rounded-md border border-destructive/40 bg-destructive/5 px-6 py-16 text-center"
              >
                <h2 className="font-display text-lg font-bold text-foreground">
                  Could not load the marketplace
                </h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  The ledger did not respond. Check your connection and try
                  again.
                </p>
                <Button
                  type="button"
                  onClick={() => void refetch()}
                  data-ocid="marketplace.retry_button"
                  className="mt-5 rounded-md"
                >
                  Retry
                </Button>
              </div>
            ) : tokens.length === 0 ? (
              <div
                data-ocid="marketplace.empty_state"
                className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-card/50 px-6 py-20 text-center"
              >
                <div className="flex size-12 items-center justify-center rounded-full border border-border bg-muted">
                  <SlidersHorizontal
                    className="size-5 text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
                <h2 className="mt-4 font-display text-lg font-bold text-foreground">
                  No tokens match this view
                </h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  {status === "all"
                    ? "The marketplace is empty. New invoices and purchase orders will appear here as issuers list them."
                    : `There are no ${status} tokens right now. Try a different status filter.`}
                </p>
                {status !== "all" && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => updateSearch({ status: "all" })}
                    data-ocid="marketplace.clear_filter_button"
                    className="mt-5 rounded-md"
                  >
                    Show all tokens
                  </Button>
                )}
              </div>
            ) : (
              <div
                data-ocid="marketplace.token_list"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
              >
                {tokens.map((token, index) => (
                  <TokenCard
                    key={token.id.toString()}
                    token={token}
                    index={index}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
}
