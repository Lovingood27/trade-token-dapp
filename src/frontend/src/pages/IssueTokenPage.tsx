import type { TokenKind, TradeError } from "@/backend";
import { DocumentUpload } from "@/components/DocumentUpload";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateToken } from "@/hooks/useQueries";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, FileText, Receipt } from "lucide-react";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";

const CURRENCIES = ["USD", "EUR", "GBP", "SGD", "AED", "JPY"];

interface FormState {
  kind: TokenKind;
  faceValue: string;
  currency: string;
  debtorName: string;
  issueDate: string;
  maturityDate: string;
  fundingTarget: string;
  returnTerms: string;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

const initialState: FormState = {
  kind: "invoice" as TokenKind,
  faceValue: "",
  currency: "USD",
  debtorName: "",
  issueDate: "",
  maturityDate: "",
  fundingTarget: "",
  returnTerms: "",
};

function toTimestamp(value: string): bigint {
  return BigInt(new Date(`${value}T00:00:00Z`).getTime()) * 1_000_000n;
}

function parseAmount(value: string): number {
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function tradeErrorMessage(error: TradeError): string {
  switch (error.__kind__) {
    case "invalidTerms":
      return error.invalidTerms;
    case "unauthorizedIssuer":
      return "Only the issuer can create this token.";
    case "tokenNotFound":
      return "The token could not be found.";
    case "notIssuer":
      return "You are not the issuer of this token.";
    case "tokenNotOpen":
      return "This token is no longer open.";
    case "tokenCancelled":
      return "This token has been cancelled.";
    case "tokenMatured":
      return "This token has already matured.";
    case "exceedsFundingTarget":
      return "The amount exceeds the remaining funding target.";
    default:
      return "The token could not be created.";
  }
}

function validate(form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  const faceValue = parseAmount(form.faceValue);
  const fundingTarget = parseAmount(form.fundingTarget);

  if (!form.faceValue.trim()) {
    errors.faceValue = "Enter the face value of the obligation.";
  } else if (!Number.isFinite(faceValue) || faceValue <= 0) {
    errors.faceValue = "Face value must be a positive amount.";
  }

  if (!form.currency.trim()) {
    errors.currency = "Select a settlement currency.";
  }

  if (!form.debtorName.trim()) {
    errors.debtorName = "Enter the buyer or debtor name.";
  } else if (form.debtorName.trim().length < 2) {
    errors.debtorName = "Buyer name is too short.";
  }

  if (!form.issueDate) {
    errors.issueDate = "Select the issue date.";
  }

  if (!form.maturityDate) {
    errors.maturityDate = "Select the maturity date.";
  } else if (form.issueDate && form.maturityDate <= form.issueDate) {
    errors.maturityDate = "Maturity must fall after the issue date.";
  }

  if (!form.fundingTarget.trim()) {
    errors.fundingTarget = "Enter the funding target.";
  } else if (!Number.isFinite(fundingTarget) || fundingTarget <= 0) {
    errors.fundingTarget = "Funding target must be a positive amount.";
  } else if (Number.isFinite(faceValue) && fundingTarget > faceValue) {
    errors.fundingTarget = "Funding target cannot exceed the face value.";
  }

  if (!form.returnTerms.trim()) {
    errors.returnTerms = "Describe the return terms investors receive.";
  } else if (form.returnTerms.trim().length < 8) {
    errors.returnTerms = "Return terms need at least 8 characters.";
  }

  return errors;
}

export default function IssueTokenPage() {
  const createToken = useCreateToken();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [createdTokenId, setCreatedTokenId] = useState<bigint | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const summary = useMemo(() => {
    const faceValue = parseAmount(form.faceValue);
    const fundingTarget = parseAmount(form.fundingTarget);
    return {
      faceValue: Number.isFinite(faceValue) ? faceValue : 0,
      fundingTarget: Number.isFinite(fundingTarget) ? fundingTarget : 0,
    };
  }, [form.faceValue, form.fundingTarget]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    createToken.mutate(
      {
        kind: form.kind,
        faceValue: BigInt(Math.round(parseAmount(form.faceValue))),
        currency: form.currency,
        debtorName: form.debtorName.trim(),
        issueDate: toTimestamp(form.issueDate),
        maturityDate: toTimestamp(form.maturityDate),
        fundingTarget: BigInt(Math.round(parseAmount(form.fundingTarget))),
        returnTerms: form.returnTerms.trim(),
      },
      {
        onSuccess: (result) => {
          if (result.__kind__ === "ok") {
            setCreatedTokenId(result.ok);
            setSubmitted(true);
          } else {
            setServerError(tradeErrorMessage(result.err));
          }
        },
        onError: () => {
          setServerError("The token could not be created. Please try again.");
        },
      },
    );
  };

  const resetForm = () => {
    setForm(initialState);
    setErrors({});
    setSubmitted(false);
    setCreatedTokenId(null);
    setServerError(null);
  };

  return (
    <Layout>
      <section
        data-ocid="issue.page"
        className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
      >
        <header className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Issuance desk
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Issue a Trade Token
          </h1>
          <p className="mt-3 text-muted-foreground">
            Tokenize an invoice or purchase order, set its funding target and
            return terms, then open it to investors on the marketplace.
          </p>
        </header>

        {submitted && createdTokenId !== null ? (
          <div
            data-ocid="issue.success_state"
            className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
          >
            <div className="rounded-lg border border-primary/40 bg-card p-6">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 size-6 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    Token created
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your{" "}
                    {form.kind === "purchaseOrder"
                      ? "purchase order"
                      : "invoice"}{" "}
                    is now open for funding on the marketplace.
                  </p>
                  <p className="mt-3 font-numeric text-sm text-foreground">
                    Token ID #{createdTokenId.toString()}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  asChild
                  data-ocid="issue.view_token_link"
                  className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Link
                    to="/token/$tokenId"
                    params={{ tokenId: createdTokenId.toString() }}
                  >
                    View token detail
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  data-ocid="issue.issue_another_button"
                  onClick={resetForm}
                  className="rounded-md"
                >
                  Issue another token
                </Button>
              </div>

              <div className="mt-8 border-t border-border pt-6">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                  Supporting documents
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Attach the invoice or purchase-order paperwork so investors
                  can review the underlying trade.
                </p>
                <DocumentUpload tokenId={createdTokenId} className="mt-4" />
              </div>
            </div>

            <aside className="rounded-lg border border-border bg-muted/30 p-6">
              <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Issued terms
              </h3>
              <dl className="mt-4 flex flex-col gap-3 text-sm">
                <SummaryRow
                  label="Instrument"
                  value={
                    form.kind === "purchaseOrder" ? "Purchase Order" : "Invoice"
                  }
                />
                <SummaryRow
                  label="Face value"
                  value={formatMoney(
                    BigInt(Math.round(summary.faceValue)),
                    form.currency,
                  )}
                />
                <SummaryRow
                  label="Funding target"
                  value={formatMoney(
                    BigInt(Math.round(summary.fundingTarget)),
                    form.currency,
                  )}
                />
                <SummaryRow
                  label="Buyer / debtor"
                  value={form.debtorName || "—"}
                />
                <SummaryRow label="Issue date" value={form.issueDate || "—"} />
                <SummaryRow label="Maturity" value={form.maturityDate || "—"} />
              </dl>
            </aside>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]"
          >
            <div className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6">
              <fieldset className="flex flex-col gap-3">
                <legend className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                  Instrument type
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <KindOption
                    kind="invoice"
                    selected={form.kind === "invoice"}
                    onSelect={() => setField("kind", "invoice" as TokenKind)}
                    icon={<Receipt className="size-5" aria-hidden="true" />}
                    title="Invoice"
                    description="A receivable owed by a buyer on delivered goods."
                  />
                  <KindOption
                    kind="purchaseOrder"
                    selected={form.kind === "purchaseOrder"}
                    onSelect={() =>
                      setField("kind", "purchaseOrder" as TokenKind)
                    }
                    icon={<FileText className="size-5" aria-hidden="true" />}
                    title="Purchase Order"
                    description="A committed order financing production or shipment."
                  />
                </div>
              </fieldset>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  id="faceValue"
                  label="Face value"
                  error={errors.faceValue}
                  hint="Total amount the obligation is worth."
                >
                  <Input
                    id="faceValue"
                    data-ocid="issue.face_value_input"
                    inputMode="decimal"
                    placeholder="425000"
                    value={form.faceValue}
                    aria-invalid={!!errors.faceValue}
                    onChange={(event) =>
                      setField("faceValue", event.target.value)
                    }
                    className="font-numeric"
                  />
                </Field>

                <Field id="currency" label="Currency" error={errors.currency}>
                  <Select
                    value={form.currency}
                    onValueChange={(value) => setField("currency", value)}
                  >
                    <SelectTrigger
                      id="currency"
                      data-ocid="issue.currency_select"
                      aria-invalid={!!errors.currency}
                      className="w-full"
                    >
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field
                id="debtorName"
                label="Buyer / debtor name"
                error={errors.debtorName}
                hint="The counterparty obligated to pay at maturity."
              >
                <Input
                  id="debtorName"
                  data-ocid="issue.debtor_input"
                  placeholder="Shanghai Cosco Ltd"
                  value={form.debtorName}
                  aria-invalid={!!errors.debtorName}
                  onChange={(event) =>
                    setField("debtorName", event.target.value)
                  }
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  id="issueDate"
                  label="Issue date"
                  error={errors.issueDate}
                >
                  <Input
                    id="issueDate"
                    type="date"
                    data-ocid="issue.issue_date_input"
                    value={form.issueDate}
                    aria-invalid={!!errors.issueDate}
                    onChange={(event) =>
                      setField("issueDate", event.target.value)
                    }
                  />
                </Field>

                <Field
                  id="maturityDate"
                  label="Maturity date"
                  error={errors.maturityDate}
                >
                  <Input
                    id="maturityDate"
                    type="date"
                    data-ocid="issue.maturity_date_input"
                    value={form.maturityDate}
                    aria-invalid={!!errors.maturityDate}
                    onChange={(event) =>
                      setField("maturityDate", event.target.value)
                    }
                  />
                </Field>
              </div>

              <Field
                id="fundingTarget"
                label="Funding target"
                error={errors.fundingTarget}
                hint="Amount investors must commit to fund the token."
              >
                <Input
                  id="fundingTarget"
                  data-ocid="issue.funding_target_input"
                  inputMode="decimal"
                  placeholder="400000"
                  value={form.fundingTarget}
                  aria-invalid={!!errors.fundingTarget}
                  onChange={(event) =>
                    setField("fundingTarget", event.target.value)
                  }
                  className="font-numeric"
                />
              </Field>

              <Field
                id="returnTerms"
                label="Return terms"
                error={errors.returnTerms}
                hint="Yield, tenor and settlement basis investors receive."
              >
                <Textarea
                  id="returnTerms"
                  data-ocid="issue.return_terms_textarea"
                  rows={4}
                  placeholder="8.45% APY, settled at maturity on the full face value."
                  value={form.returnTerms}
                  aria-invalid={!!errors.returnTerms}
                  onChange={(event) =>
                    setField("returnTerms", event.target.value)
                  }
                />
              </Field>

              {serverError && (
                <p
                  role="alert"
                  data-ocid="issue.error_state"
                  className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {serverError}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
                <Button
                  type="submit"
                  data-ocid="issue.submit_button"
                  disabled={createToken.isPending}
                  className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {createToken.isPending ? "Issuing…" : "Issue token"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  data-ocid="issue.reset_button"
                  onClick={resetForm}
                  disabled={createToken.isPending}
                  className="rounded-md"
                >
                  Clear form
                </Button>
              </div>
            </div>

            <aside className="flex flex-col gap-4 self-start rounded-lg border border-border bg-muted/30 p-6 lg:sticky lg:top-24">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Issuance summary
              </h2>
              <dl className="flex flex-col gap-3 text-sm">
                <SummaryRow
                  label="Instrument"
                  value={
                    form.kind === "purchaseOrder" ? "Purchase Order" : "Invoice"
                  }
                />
                <SummaryRow
                  label="Face value"
                  value={formatMoney(
                    BigInt(Math.round(summary.faceValue)),
                    form.currency,
                  )}
                />
                <SummaryRow
                  label="Funding target"
                  value={formatMoney(
                    BigInt(Math.round(summary.fundingTarget)),
                    form.currency,
                  )}
                />
                <SummaryRow
                  label="Buyer / debtor"
                  value={form.debtorName || "—"}
                />
                <SummaryRow label="Maturity" value={form.maturityDate || "—"} />
              </dl>
              <p className="border-t border-border pt-4 text-xs text-muted-foreground">
                Tokens open for funding the moment they are issued. You can
                attach supporting documents right after creation.
              </p>
            </aside>
          </form>
        )}
      </section>
    </Layout>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-foreground">
        {label}
      </Label>
      {children}
      {error ? (
        <p
          role="alert"
          data-ocid={`issue.${id}.error`}
          className="text-xs text-destructive"
        >
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function KindOption({
  kind,
  selected,
  onSelect,
  icon,
  title,
  description,
}: {
  kind: string;
  selected: boolean;
  onSelect: () => void;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      data-ocid={`issue.kind_${kind}_button`}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-4 text-left transition-smooth focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        selected
          ? "border-primary bg-primary/5"
          : "border-border bg-background hover:border-primary/50",
      )}
    >
      <span
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-md",
          selected
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-muted-foreground",
        )}
      >
        {icon}
      </span>
      <span className="font-display text-sm font-semibold text-foreground">
        {title}
      </span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-right font-numeric text-foreground">
        {value}
      </dd>
    </div>
  );
}
