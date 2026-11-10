import type { TokenId, TradeError, TradeToken } from "@/backend";
import { SignInButton } from "@/components/InternetIdentity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFundToken } from "@/hooks/useQueries";
import { formatAmount, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { CheckCircle2, Loader2, Lock, TriangleAlert } from "lucide-react";
import { useState } from "react";

/** Turn a backend funding rejection into a clear, actionable message. */
function describeFundingError(error: TradeError): string {
  switch (error.__kind__) {
    case "tokenNotOpen":
      return "This token is no longer open for funding.";
    case "tokenCancelled":
      return "This token was cancelled and cannot be funded.";
    case "tokenMatured":
      return "This token has matured and is closed to new commitments.";
    case "exceedsFundingTarget":
      return `Amount exceeds the remaining target of ${formatAmount(error.exceedsFundingTarget.remaining)}.`;
    case "tokenNotFound":
      return "This token could not be found.";
    case "invalidTerms":
      return error.invalidTerms;
    case "unauthorizedIssuer":
      return "You are not authorized to fund this token.";
    case "notIssuer":
      return "You are not authorized to fund this token.";
    default:
      return "The commitment could not be recorded. Please try again.";
  }
}

function useSignedIn(): boolean {
  const { identity } = useInternetIdentity();
  return !!identity && !identity.getPrincipal().isAnonymous();
}

/**
 * Funding action for a signed-in investor: enter an amount toward the remaining
 * funding target and commit it. Visitors see a sign-in prompt instead.
 */
export function FundingPanel({
  token,
  className,
}: {
  token: TradeToken;
  className?: string;
}) {
  const signedIn = useSignedIn();
  const fundToken = useFundToken();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const remaining = token.fundingTarget - token.amountFunded;
  const isOpen = token.status === "open";
  const parsed = Number(amount);
  const validAmount =
    amount.trim() !== "" && Number.isFinite(parsed) && parsed > 0;
  const exceedsRemaining =
    validAmount && BigInt(Math.round(parsed)) > remaining;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (!validAmount) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (exceedsRemaining) {
      setError(
        `Amount exceeds the remaining target of ${formatAmount(remaining)}.`,
      );
      return;
    }
    const committed = BigInt(Math.round(parsed));
    const captured = amount;
    setAmount("");
    fundToken.mutate(
      { tokenId: token.id as TokenId, amount: committed },
      {
        onSuccess: (result) => {
          if (result.__kind__ === "ok") {
            setSuccess(
              `Committed ${formatMoney(committed, token.currency)} to this token.`,
            );
          } else {
            setError(describeFundingError(result.err));
            setAmount((current) => (current === "" ? captured : current));
          }
        },
        onError: () => {
          setError("The commitment could not be recorded. Please try again.");
          setAmount((current) => (current === "" ? captured : current));
        },
      },
    );
  };

  return (
    <section
      data-ocid="funding.panel"
      aria-label="Fund this token"
      className={cn(
        "rounded-lg border border-border bg-card p-5 shadow-none",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
          Fund this token
        </h2>
        {isOpen ? (
          <span className="font-numeric text-xs text-muted-foreground">
            {formatAmount(remaining)} {token.currency} remaining
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
            <Lock className="size-3" aria-hidden="true" />
            Closed
          </span>
        )}
      </div>

      {!signedIn ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign in with Internet Identity to commit funds to this token.
          </p>
          <SignInButton className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-smooth hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60" />
        </div>
      ) : !isOpen ? (
        <p className="mt-4 text-sm text-muted-foreground">
          This token is {token.status} and is no longer accepting commitments.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label
              htmlFor="funding-amount"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Commitment amount ({token.currency})
            </Label>
            <Input
              id="funding-amount"
              data-ocid="funding.amount.input"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
                setSuccess(null);
              }}
              aria-invalid={error !== null}
              className="font-numeric"
            />
          </div>

          <Button
            type="submit"
            data-ocid="funding.submit_button"
            disabled={fundToken.isPending || !validAmount}
            className="w-full rounded-md bg-primary font-semibold text-primary-foreground transition-smooth hover:brightness-110"
          >
            {fundToken.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Committing…
              </>
            ) : (
              "Commit funds"
            )}
          </Button>

          {error && (
            <p
              role="alert"
              data-ocid="funding.error_state"
              className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span>{error}</span>
            </p>
          )}
          {success && (
            <output
              data-ocid="funding.success_state"
              className="flex items-start gap-2 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary"
            >
              <CheckCircle2
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span>{success}</span>
            </output>
          )}
        </form>
      )}
    </section>
  );
}
