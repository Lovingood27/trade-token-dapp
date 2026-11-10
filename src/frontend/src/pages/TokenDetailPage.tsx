import type { AttachedDocument, TokenId, TradeToken } from "@/backend";
import { FundingPanel } from "@/components/FundingPanel";
import { FundingProgress } from "@/components/FundingProgress";
import { Layout } from "@/components/Layout";
import { DocumentTag, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useFundedTokens,
  useToken,
  useTokenDocuments,
} from "@/hooks/useQueries";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatPercent,
  shortPrincipal,
  tokenKindLabel,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Circle,
  ExternalLink,
  FileText,
  Inbox,
  Lock,
} from "lucide-react";
import { useMemo, useState } from "react";

function useSignedIn(): boolean {
  const { identity } = useInternetIdentity();
  return !!identity && !identity.getPrincipal().isAnonymous();
}

/** Parse the route param into a token id, or null when it is not a number. */
function parseTokenId(raw: string): TokenId | null {
  if (!/^\d+$/.test(raw)) return null;
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

interface TermRow {
  label: string;
  value: string;
  mono?: boolean;
}

function TermsGrid({ token }: { token: TradeToken }) {
  const rows: TermRow[] = [
    {
      label: "Issuer",
      value: shortPrincipal(token.issuer.toText()),
      mono: true,
    },
    { label: "Asset class", value: tokenKindLabel(token.kind) },
    {
      label: "Face value",
      value: formatMoney(token.faceValue, token.currency),
      mono: true,
    },
    { label: "Currency", value: token.currency, mono: true },
    { label: "Buyer / debtor", value: token.debtorName },
    { label: "Issue date", value: formatDate(token.issueDate), mono: true },
    {
      label: "Maturity date",
      value: formatDate(token.maturityDate),
      mono: true,
    },
    {
      label: "Funding target",
      value: formatMoney(token.fundingTarget, token.currency),
      mono: true,
    },
    {
      label: "Amount funded",
      value: formatMoney(token.amountFunded, token.currency),
      mono: true,
    },
  ];
  return (
    <dl
      data-ocid="token.terms.list"
      className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2"
    >
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-3"
        >
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">
            {row.label}
          </dt>
          <dd
            className={cn(
              "min-w-0 truncate text-right text-sm font-medium text-foreground",
              row.mono && "font-numeric",
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function StatusTimeline({ token }: { token: TradeToken }) {
  const steps = [
    { key: "open", label: "Open", hint: "Accepting commitments" },
    { key: "funded", label: "Funded", hint: "Target reached" },
    { key: "matured", label: "Matured", hint: "Returns distributed" },
  ] as const;
  const order: Record<string, number> = {
    open: 0,
    funded: 1,
    matured: 2,
    cancelled: -1,
  };
  const current = order[token.status] ?? -1;
  return (
    <ol
      data-ocid="token.status.timeline"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0"
    >
      {steps.map((step, index) => {
        const reached = current >= index;
        return (
          <li
            key={step.key}
            className="flex flex-1 items-center gap-3 sm:flex-col sm:gap-2 sm:text-center"
          >
            <span
              className={cn(
                "inline-flex size-7 shrink-0 items-center justify-center rounded-full border",
                reached
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted text-muted-foreground",
              )}
            >
              {reached ? (
                <Check className="size-4" aria-hidden="true" />
              ) : (
                <Circle className="size-2.5 fill-current" aria-hidden="true" />
              )}
            </span>
            <span className="flex flex-col sm:items-center">
              <span
                className={cn(
                  "text-sm font-medium",
                  reached ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
              <span className="text-xs text-muted-foreground">{step.hint}</span>
            </span>
            {index < steps.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "hidden h-px flex-1 sm:block",
                  current > index ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function DocumentRow({ document }: { document: AttachedDocument }) {
  const [url, setUrl] = useState<string | null>(null);

  const open = () => {
    const bytes = new Uint8Array(document.file);
    const blob = new Blob([bytes], {
      type: document.contentType || "application/octet-stream",
    });
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    window.open(objectUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <li
      data-ocid="token.document.item"
      className="flex items-center justify-between gap-4 rounded-md border border-border bg-background/40 px-3 py-2.5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <FileText className="size-4 shrink-0 text-accent" aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {document.fileName}
          </p>
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            {document.contentType || "document"} ·{" "}
            {formatDate(document.uploadedAt)}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-ocid="token.document.open_button"
        onClick={open}
        className="shrink-0 rounded-md border-border bg-transparent text-xs font-medium text-foreground transition-smooth hover:bg-secondary"
      >
        <ExternalLink className="size-3.5" aria-hidden="true" />
        Open
      </Button>
      {url && <span className="sr-only">Document opened in a new tab</span>}
    </li>
  );
}

function DocumentsSection({ tokenId }: { tokenId: TokenId }) {
  const { data: documents, isLoading } = useTokenDocuments(tokenId);
  return (
    <section
      data-ocid="token.documents.section"
      aria-label="Attached documents"
      className="rounded-lg border border-border bg-card p-5 shadow-none"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
          Attached documents
        </h2>
        <DocumentTag label={tokenId.toString()} />
      </div>
      {isLoading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 2 }, (_, i) => `doc-skeleton-${i}`).map(
            (id) => (
              <Skeleton key={id} className="h-12 w-full" />
            ),
          )}
        </div>
      ) : !documents || documents.length === 0 ? (
        <p
          data-ocid="token.documents.empty_state"
          className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Inbox className="size-4" aria-hidden="true" />
          No invoice or purchase order documents have been attached yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {documents.map((document) => (
            <DocumentRow key={document.id.toString()} document={document} />
          ))}
        </ul>
      )}
    </section>
  );
}

function FundingHistorySection({
  tokenId,
  currency,
}: {
  tokenId: TokenId;
  currency: string;
}) {
  const signedIn = useSignedIn();
  return (
    <section
      data-ocid="token.funding_history.section"
      aria-label="Funding history"
      className="rounded-lg border border-border bg-card p-5 shadow-none"
    >
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
        Funding history
      </h2>
      {signedIn ? (
        <SignedInFundingHistory tokenId={tokenId} currency={currency} />
      ) : (
        <p
          data-ocid="token.funding_history.empty_state"
          className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Lock className="size-4" aria-hidden="true" />
          Sign in to view your commitments to this token.
        </p>
      )}
    </section>
  );
}

/** Mounts the caller-private commitments query only while signed in. */
function SignedInFundingHistory({
  tokenId,
  currency,
}: {
  tokenId: TokenId;
  currency: string;
}) {
  const { data: funded, isLoading } = useFundedTokens();

  const commitments = useMemo(
    () => (funded ?? []).filter((view) => view.commitment.tokenId === tokenId),
    [funded, tokenId],
  );

  if (isLoading) {
    return (
      <div className="mt-4 space-y-2">
        {Array.from({ length: 2 }, (_, i) => `commit-skeleton-${i}`).map(
          (id) => (
            <Skeleton key={id} className="h-12 w-full" />
          ),
        )}
      </div>
    );
  }

  if (commitments.length === 0) {
    return (
      <p
        data-ocid="token.funding_history.empty_state"
        className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"
      >
        <Inbox className="size-4" aria-hidden="true" />
        You have not committed funds to this token yet.
      </p>
    );
  }

  return (
    <ul data-ocid="token.funding_history.list" className="mt-4 space-y-2">
      {commitments.map((view) => (
        <li
          key={view.commitment.id.toString()}
          data-ocid="token.funding_history.item"
          className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-md border border-border bg-background/40 px-3 py-2.5 sm:grid-cols-4"
        >
          <div className="min-w-0">
            <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
              Investor
            </p>
            <p className="truncate font-numeric text-sm text-foreground">
              {shortPrincipal(view.commitment.investor.toText())}
            </p>
          </div>
          <div>
            <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
              Amount
            </p>
            <p className="font-numeric text-sm text-foreground">
              {formatMoney(view.commitment.amount, currency)}
            </p>
          </div>
          <div>
            <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
              Expected return
            </p>
            <p className="font-numeric text-sm text-primary">
              {formatMoney(view.commitment.expectedReturn, currency)}
            </p>
          </div>
          <div>
            <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">
              Committed
            </p>
            <p className="font-numeric text-sm text-foreground">
              {formatDateTime(view.commitment.committedAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function DetailSkeleton() {
  return (
    <div data-ocid="token.loading_state" className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 w-full" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

export default function TokenDetailPage() {
  const params = useParams({ strict: false }) as { tokenId?: string };
  const tokenId = parseTokenId(params.tokenId ?? "");
  const { data: token, isLoading, isError } = useToken(tokenId);

  return (
    <Layout>
      <section
        data-ocid="token_detail.page"
        className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      >
        <Link
          to="/"
          data-ocid="token_detail.back.link"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-smooth hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to marketplace
        </Link>

        {tokenId === null ? (
          <div
            data-ocid="token.error_state"
            className="mt-8 rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive"
          >
            This token reference is not valid.
          </div>
        ) : isLoading ? (
          <div className="mt-6">
            <DetailSkeleton />
          </div>
        ) : isError || !token ? (
          <div
            data-ocid="token.error_state"
            className="mt-8 rounded-lg border border-border bg-card p-8 text-center"
          >
            <h1 className="font-display text-xl font-semibold text-foreground">
              Token not found
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This Trade Token does not exist or is no longer available.
            </p>
            <Button
              asChild
              className="mt-5 rounded-md bg-primary font-semibold text-primary-foreground"
            >
              <Link to="/" data-ocid="token_detail.back_button">
                Return to marketplace
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <header className="rounded-lg border border-border bg-card p-6 shadow-none">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-numeric text-sm text-muted-foreground">
                      LTT-{token.id.toString().padStart(4, "0")}
                    </span>
                    <StatusBadge status={token.status} />
                    <DocumentTag label={tokenKindLabel(token.kind)} />
                  </div>
                  <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    {token.debtorName}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Issued by{" "}
                    <span className="font-numeric text-foreground">
                      {shortPrincipal(token.issuer.toText())}
                    </span>{" "}
                    · matures {formatDate(token.maturityDate)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Face value
                  </p>
                  <p className="font-numeric text-2xl font-semibold text-foreground">
                    {formatMoney(token.faceValue, token.currency)}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-xs uppercase tracking-wider text-muted-foreground">
                  <span>Funding progress</span>
                  <span className="font-numeric">
                    {formatMoney(token.amountFunded, token.currency)} of{" "}
                    {formatMoney(token.fundingTarget, token.currency)}
                  </span>
                </div>
                <FundingProgress
                  ratio={
                    token.fundingTarget > 0n
                      ? Number(token.amountFunded) / Number(token.fundingTarget)
                      : 0
                  }
                />
                <p className="font-numeric text-xs text-muted-foreground">
                  {formatPercent(
                    token.fundingTarget > 0n
                      ? Number(token.amountFunded) / Number(token.fundingTarget)
                      : 0,
                  )}{" "}
                  funded
                </p>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <section
                  data-ocid="token.terms.section"
                  aria-label="Token terms"
                  className="rounded-lg border border-border bg-card p-5 shadow-none"
                >
                  <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                    Terms
                  </h2>
                  <div className="mt-4">
                    <TermsGrid token={token} />
                  </div>
                  <div className="mt-5">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Return terms
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {token.returnTerms || "No return terms specified."}
                    </p>
                  </div>
                </section>

                <FundingHistorySection
                  tokenId={token.id}
                  currency={token.currency}
                />

                <DocumentsSection tokenId={token.id} />
              </div>

              <div className="space-y-6">
                <FundingPanel token={token} />

                <section
                  data-ocid="token.status.section"
                  aria-label="Status"
                  className="rounded-lg border border-border bg-card p-5 shadow-none"
                >
                  <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                    Status
                  </h2>
                  <div className="mt-4">
                    <StatusTimeline token={token} />
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </section>
    </Layout>
  );
}
