import { FundingProgress } from "@/components/FundingProgress";
import { DocumentTag, StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  formatDate,
  formatMoney,
  shortPrincipal,
  tokenKindLabel,
} from "@/lib/format";
import type { TokenSummary } from "@/types";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

/** Derive a stable, ledger-style reference code from a token id. */
export function tokenReference(id: bigint): string {
  return `LTT-${id.toString().padStart(6, "0")}`;
}

/**
 * Dense editorial token card for the marketplace grid: reference + status,
 * issuer, face value, funding progress, return terms and maturity date.
 */
export function TokenCard({
  token,
  index,
}: {
  token: TokenSummary;
  index: number;
}) {
  const remaining = token.fundingTarget - token.amountFunded;
  const isOpen = token.status === "open";
  const isMatured = token.status === "matured";

  return (
    <article
      data-ocid={`marketplace.token_card.${index + 1}`}
      className="group flex flex-col rounded-md border border-border bg-card p-5 shadow-subtle transition-smooth animate-fade-in-up hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
      style={{ animationDelay: `${Math.min(index, 11) * 60}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-numeric text-xs font-medium tracking-wide text-muted-foreground">
          {tokenReference(token.id)}
        </span>
        <StatusBadge status={token.status} />
      </div>

      <div className="mt-4 min-w-0">
        <h3 className="truncate font-numeric text-lg font-bold tracking-tight text-foreground">
          {shortPrincipal(token.issuer.toString())}
        </h3>
        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Issuer</span>
          <span aria-hidden="true">·</span>
          <span>{tokenKindLabel(token.kind)}</span>
        </p>
      </div>

      <div className="mt-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
          Face Value
        </p>
        <p className="mt-1 font-numeric text-2xl font-semibold tracking-tight text-foreground">
          {formatMoney(token.faceValue, token.currency)}
        </p>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
            Funding Progress
          </span>
          <span className="font-numeric text-xs text-muted-foreground">
            {formatMoney(token.amountFunded, token.currency)} /{" "}
            {formatMoney(token.fundingTarget, token.currency)}
          </span>
        </div>
        <FundingProgress ratio={token.fundingProgress} className="mt-2" />
        <p className="mt-2 font-numeric text-xs text-muted-foreground">
          {isMatured
            ? "Fully funded · settled"
            : isOpen
              ? `${formatMoney(remaining, token.currency)} remaining`
              : "Funding target reached"}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
            Return Terms
          </p>
          <p className="mt-1 truncate font-numeric text-sm font-medium text-primary">
            {token.returnTerms}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
            Maturity
          </p>
          <p className="mt-1 font-numeric text-sm font-medium text-accent">
            {formatDate(token.maturityDate)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <DocumentTag label={token.kind === "purchaseOrder" ? "PO" : "INV"} />
        <Button
          asChild
          variant={isOpen ? "default" : "secondary"}
          className="rounded-md"
        >
          <Link
            to="/token/$tokenId"
            params={{ tokenId: token.id.toString() }}
            data-ocid={`marketplace.token_card.${index + 1}.open_button`}
          >
            {isOpen ? "Fund Token" : "View Details"}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
