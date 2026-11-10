import { FundingProgress } from "@/components/FundingProgress";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import {
  type UpdateTokenInput,
  useCancelToken,
  useIssuedTokens,
  useUpdateToken,
} from "@/hooks/useQueries";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { IssuedTokenView, TradeError, TradeToken } from "@/types";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  FileText,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** A token is editable/cancellable only while open and unfunded. */
function isEditable(token: TradeToken): boolean {
  return token.status === "open" && token.amountFunded === 0n;
}

function fundingRatio(token: TradeToken): number {
  if (token.fundingTarget <= 0n) return 0;
  return Number(token.amountFunded) / Number(token.fundingTarget);
}

/** Convert a nanosecond timestamp to a yyyy-mm-dd value for a date input. */
function toDateInputValue(timestamp: bigint): string {
  const date = new Date(Number(timestamp / 1_000_000n));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

/** Convert a yyyy-mm-dd date input value to a nanosecond timestamp. */
function fromDateInputValue(value: string): bigint | null {
  if (!value) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(ms)) return null;
  return BigInt(ms) * 1_000_000n;
}

interface EditDraft {
  faceValue: string;
  currency: string;
  debtorName: string;
  issueDate: string;
  maturityDate: string;
  fundingTarget: string;
  returnTerms: string;
}

function draftFromToken(token: TradeToken): EditDraft {
  return {
    faceValue: token.faceValue.toString(),
    currency: token.currency,
    debtorName: token.debtorName,
    issueDate: toDateInputValue(token.issueDate),
    maturityDate: toDateInputValue(token.maturityDate),
    fundingTarget: token.fundingTarget.toString(),
    returnTerms: token.returnTerms,
  };
}

function parseWholeAmount(value: string): bigint | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  try {
    return BigInt(trimmed);
  } catch {
    return null;
  }
}

function StatCell({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary" | "accent";
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.65rem] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "font-numeric text-lg font-semibold",
          tone === "primary" && "text-primary",
          tone === "accent" && "text-accent",
          tone === "default" && "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function EditForm({
  token,
  onDone,
}: {
  token: TradeToken;
  onDone: () => void;
}) {
  const updateToken = useUpdateToken();
  const [draft, setDraft] = useState<EditDraft>(() => draftFromToken(token));
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof EditDraft>(key: K, value: EditDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const faceValue = parseWholeAmount(draft.faceValue);
    const fundingTarget = parseWholeAmount(draft.fundingTarget);
    const issueDate = fromDateInputValue(draft.issueDate);
    const maturityDate = fromDateInputValue(draft.maturityDate);

    if (!draft.debtorName.trim()) {
      setError("Enter the debtor name.");
      return;
    }
    if (!draft.currency.trim()) {
      setError("Enter a currency code.");
      return;
    }
    if (faceValue === null || faceValue <= 0n) {
      setError("Face value must be a positive whole number.");
      return;
    }
    if (fundingTarget === null || fundingTarget <= 0n) {
      setError("Funding target must be a positive whole number.");
      return;
    }
    if (issueDate === null || maturityDate === null) {
      setError("Enter valid issue and maturity dates.");
      return;
    }
    if (maturityDate <= issueDate) {
      setError("Maturity date must be after the issue date.");
      return;
    }
    if (!draft.returnTerms.trim()) {
      setError("Describe the return terms.");
      return;
    }

    const input: UpdateTokenInput = {
      tokenId: token.id,
      kind: token.kind,
      faceValue,
      currency: draft.currency.trim().toUpperCase(),
      debtorName: draft.debtorName.trim(),
      issueDate,
      maturityDate,
      fundingTarget,
      returnTerms: draft.returnTerms.trim(),
    };

    updateToken.mutate(input, {
      onSuccess: (result) => {
        if (result.__kind__ === "ok") {
          toast.success("Token terms updated.");
          onDone();
        } else {
          setError(describeTradeError(result.err));
        }
      },
      onError: () => {
        setError("Could not save changes. Please try again.");
      },
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      data-ocid={`issuer.edit_form.${token.id}`}
      className="mt-4 flex flex-col gap-4 border-t border-border pt-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`debtor-${token.id}`}>Debtor name</Label>
          <Input
            id={`debtor-${token.id}`}
            data-ocid={`issuer.edit.debtor_input.${token.id}`}
            value={draft.debtorName}
            onChange={(e) => set("debtorName", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`currency-${token.id}`}>Currency</Label>
          <Input
            id={`currency-${token.id}`}
            data-ocid={`issuer.edit.currency_input.${token.id}`}
            value={draft.currency}
            maxLength={8}
            onChange={(e) => set("currency", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`face-${token.id}`}>Face value</Label>
          <Input
            id={`face-${token.id}`}
            data-ocid={`issuer.edit.face_value_input.${token.id}`}
            inputMode="numeric"
            className="font-numeric"
            value={draft.faceValue}
            onChange={(e) => set("faceValue", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`target-${token.id}`}>Funding target</Label>
          <Input
            id={`target-${token.id}`}
            data-ocid={`issuer.edit.funding_target_input.${token.id}`}
            inputMode="numeric"
            className="font-numeric"
            value={draft.fundingTarget}
            onChange={(e) => set("fundingTarget", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`issue-${token.id}`}>Issue date</Label>
          <Input
            id={`issue-${token.id}`}
            data-ocid={`issuer.edit.issue_date_input.${token.id}`}
            type="date"
            className="font-numeric"
            value={draft.issueDate}
            onChange={(e) => set("issueDate", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`maturity-${token.id}`}>Maturity date</Label>
          <Input
            id={`maturity-${token.id}`}
            data-ocid={`issuer.edit.maturity_date_input.${token.id}`}
            type="date"
            className="font-numeric"
            value={draft.maturityDate}
            onChange={(e) => set("maturityDate", e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`terms-${token.id}`}>Return terms</Label>
        <textarea
          id={`terms-${token.id}`}
          data-ocid={`issuer.edit.return_terms_input.${token.id}`}
          rows={2}
          value={draft.returnTerms}
          onChange={(e) => set("returnTerms", e.target.value)}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      </div>

      {error && (
        <p
          role="alert"
          data-ocid={`issuer.edit.error_state.${token.id}`}
          className="flex items-center gap-2 text-sm text-destructive"
        >
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          data-ocid={`issuer.edit.save_button.${token.id}`}
          disabled={updateToken.isPending}
          className="rounded-md bg-primary text-primary-foreground shadow-subtle transition-smooth hover:brightness-110"
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          {updateToken.isPending ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          data-ocid={`issuer.edit.cancel_button.${token.id}`}
          onClick={onDone}
          disabled={updateToken.isPending}
          className="rounded-md text-muted-foreground transition-smooth hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
          Discard
        </Button>
      </div>
    </form>
  );
}

function describeTradeError(error: TradeError): string {
  switch (error.__kind__) {
    case "invalidTerms":
      return error.invalidTerms || "The token terms are invalid.";
    case "tokenNotOpen":
      return "This token is no longer open for changes.";
    case "tokenCancelled":
      return "This token has been cancelled.";
    case "tokenMatured":
      return "This token has already matured.";
    case "unauthorizedIssuer":
    case "notIssuer":
      return "You are not the issuer of this token.";
    case "tokenNotFound":
      return "This token could not be found.";
    default:
      return "The request was rejected. Please review the terms and try again.";
  }
}

function TokenCard({
  view,
  index,
}: {
  view: IssuedTokenView;
  index: number;
}) {
  const { token, commitmentCount } = view;
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cancelToken = useCancelToken();
  const editable = isEditable(token);
  const ratio = fundingRatio(token);
  const remaining = token.fundingTarget - token.amountFunded;

  function handleCancel() {
    cancelToken.mutate(token.id, {
      onSuccess: (result) => {
        if (result.__kind__ === "ok") {
          toast.success("Token cancelled.");
          setConfirmOpen(false);
        } else {
          toast.error(describeTradeError(result.err));
        }
      },
      onError: () => {
        toast.error("Could not cancel the token. Please try again.");
      },
    });
  }

  return (
    <article
      data-ocid={`issuer.token.item.${index + 1}`}
      className="animate-fade-in-up rounded-md border border-border bg-card p-5 shadow-subtle transition-smooth hover:border-primary/40 hover:shadow-elevated"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-numeric text-xs font-medium text-muted-foreground">
              #{token.id.toString()}
            </span>
            <span className="rounded-sm border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-mono text-[0.65rem] font-medium uppercase tracking-wider text-accent">
              {token.kind === "purchaseOrder" ? "PO" : "INV"}
            </span>
          </div>
          <h3 className="mt-1.5 truncate font-display text-lg font-semibold tracking-tight text-foreground">
            {token.debtorName}
          </h3>
        </div>
        <StatusBadge status={token.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <StatCell
          label="Face value"
          value={formatMoney(token.faceValue, token.currency)}
        />
        <StatCell
          label="Funding target"
          value={formatMoney(token.fundingTarget, token.currency)}
        />
        <StatCell
          label="Amount funded"
          value={formatMoney(token.amountFunded, token.currency)}
          tone="primary"
        />
        <StatCell
          label="Maturity"
          value={formatDate(token.maturityDate)}
          tone="accent"
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-widest text-muted-foreground">
            Funding progress
          </span>
          <span className="font-numeric text-muted-foreground">
            {formatPercent(ratio)}
          </span>
        </div>
        <FundingProgress ratio={ratio} showLabel={false} />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-numeric">
            {remaining > 0n
              ? `${formatMoney(remaining, token.currency)} remaining`
              : "Fully funded"}
          </span>
          <span className="font-numeric">
            {commitmentCount.toString()}{" "}
            {commitmentCount === 1n ? "commitment" : "commitments"}
          </span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="rounded-md text-muted-foreground transition-smooth hover:text-foreground"
        >
          <Link
            to="/token/$tokenId"
            params={{ tokenId: token.id.toString() }}
            data-ocid={`issuer.token.view_link.${index + 1}`}
          >
            <ArrowUpRight className="size-4" aria-hidden="true" />
            View
          </Link>
        </Button>

        {editable && (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              data-ocid={`issuer.token.edit_button.${index + 1}`}
              onClick={() => setEditing((open) => !open)}
              className="rounded-md transition-smooth"
            >
              <Pencil className="size-4" aria-hidden="true" />
              {editing ? "Close editor" : "Edit terms"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              data-ocid={`issuer.token.cancel_button.${index + 1}`}
              onClick={() => setConfirmOpen(true)}
              className="rounded-md text-destructive transition-smooth hover:bg-destructive/10 hover:text-destructive"
            >
              <Ban className="size-4" aria-hidden="true" />
              Cancel token
            </Button>
          </>
        )}

        {!editable && token.status === "open" && (
          <span className="text-xs text-muted-foreground">
            Terms are locked once funding begins.
          </span>
        )}
      </div>

      {editing && editable && (
        <EditForm token={token} onDone={() => setEditing(false)} />
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          data-ocid={`issuer.cancel_dialog.${index + 1}`}
          className="border-border bg-popover"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              Cancel this token?
            </DialogTitle>
            <DialogDescription>
              Token #{token.id.toString()} for {token.debtorName} will be
              permanently cancelled and removed from the marketplace. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              data-ocid={`issuer.cancel_dialog.dismiss_button.${index + 1}`}
              onClick={() => setConfirmOpen(false)}
              disabled={cancelToken.isPending}
              className="rounded-md"
            >
              Keep token
            </Button>
            <Button
              type="button"
              data-ocid={`issuer.cancel_dialog.confirm_button.${index + 1}`}
              onClick={handleCancel}
              disabled={cancelToken.isPending}
              className="rounded-md bg-destructive text-destructive-foreground transition-smooth hover:brightness-110"
            >
              <Ban className="size-4" aria-hidden="true" />
              {cancelToken.isPending ? "Cancelling…" : "Cancel token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function DashboardSkeleton() {
  const ids = Array.from({ length: 4 }, (_, i) => `issuer-skeleton-${i}`);
  return (
    <div
      data-ocid="issuer.loading_state"
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {ids.map((id) => (
        <div
          key={id}
          className="rounded-md border border-border bg-card p-5 shadow-subtle"
        >
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-3 h-6 w-40" />
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="mt-4 h-2 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function IssuerDashboardPage() {
  const { data, isLoading, isError, refetch } = useIssuedTokens();
  const tokens = data ?? [];

  const openCount = tokens.filter((v) => v.token.status === "open").length;
  const fundedCount = tokens.filter((v) => v.token.status === "funded").length;
  const totalFunded = tokens.reduce((sum, v) => sum + v.token.amountFunded, 0n);

  return (
    <Layout>
      <Toaster position="bottom-right" />
      <section
        data-ocid="issuer.page"
        className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Issuer desk
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              My Tokens
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Manage the Trade Tokens you have issued, edit open terms, and
              cancel unfunded listings.
            </p>
          </div>
          <Button
            asChild
            data-ocid="issuer.issue_button"
            className="rounded-md bg-primary text-primary-foreground shadow-subtle transition-smooth hover:brightness-110"
          >
            <Link to="/issue">
              <Plus className="size-4" aria-hidden="true" />
              Issue a token
            </Link>
          </Button>
        </div>

        {!isLoading && !isError && tokens.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-4 rounded-md border border-border bg-muted/30 p-5 sm:grid-cols-4">
            <StatCell label="Tokens issued" value={tokens.length.toString()} />
            <StatCell
              label="Open"
              value={openCount.toString()}
              tone="primary"
            />
            <StatCell label="Funded" value={fundedCount.toString()} />
            <StatCell
              label="Total funded"
              value={formatMoney(totalFunded)}
              tone="accent"
            />
          </div>
        )}

        <div className="mt-8">
          {isLoading && <DashboardSkeleton />}

          {isError && (
            <div
              data-ocid="issuer.error_state"
              className="flex flex-col items-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 px-6 py-12 text-center"
            >
              <AlertTriangle
                className="size-8 text-destructive"
                aria-hidden="true"
              />
              <h2 className="font-display text-lg font-semibold text-foreground">
                Could not load your tokens
              </h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Something went wrong while fetching your issued tokens. Please
                try again.
              </p>
              <Button
                type="button"
                data-ocid="issuer.retry_button"
                onClick={() => void refetch()}
                className="rounded-md bg-primary text-primary-foreground transition-smooth hover:brightness-110"
              >
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !isError && tokens.length === 0 && (
            <div
              data-ocid="issuer.empty_state"
              className="flex flex-col items-center gap-4 rounded-md border border-dashed border-border bg-card px-6 py-16 text-center"
            >
              <span className="flex size-14 items-center justify-center rounded-full border border-border bg-muted/40">
                <FileText
                  className="size-6 text-muted-foreground"
                  aria-hidden="true"
                />
              </span>
              <h2 className="font-display text-xl font-semibold text-foreground">
                No tokens issued yet
              </h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Tokenize your first invoice or purchase order to open it for
                funding on the marketplace.
              </p>
              <Button
                asChild
                data-ocid="issuer.empty_state.issue_link"
                className="rounded-md bg-primary text-primary-foreground shadow-subtle transition-smooth hover:brightness-110"
              >
                <Link to="/issue">
                  <Plus className="size-4" aria-hidden="true" />
                  Issue your first token
                </Link>
              </Button>
            </div>
          )}

          {!isLoading && !isError && tokens.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {tokens.map((view, index) => (
                <TokenCard
                  key={view.token.id.toString()}
                  view={view}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
