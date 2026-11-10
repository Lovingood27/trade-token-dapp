import { InvoiceCategory, type InvoiceError } from "@/backend";
import {
  type InvoiceDraft,
  InvoiceReviewForm,
  type ReviewedInvoice,
  newLineItemDraft,
} from "@/components/InvoiceReviewForm";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyInvoices, useSubmitInvoice } from "@/hooks/useQueries";
import {
  formatDate,
  formatMoney,
  invoiceCategoryLabel,
  invoiceStatusLabel,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Receipt,
  ScanLine,
  Upload,
} from "lucide-react";
import { type ChangeEvent, type DragEvent, useRef, useState } from "react";

const ACCEPTED_TYPES = ".pdf,.png,.jpg,.jpeg,.webp";
const MAX_BYTES = 10 * 1024 * 1024;

type Phase = "capture" | "reading" | "review" | "success";

interface ScannedFile {
  name: string;
  size: number;
  bytes: Uint8Array<ArrayBuffer>;
  contentType: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(): InvoiceDraft {
  return {
    category: InvoiceCategory.materialOrder,
    retailerName: "",
    vendorReference: "",
    invoiceDate: todayIso(),
    totalAmount: "",
    currency: "USD",
    lineItems: [newLineItemDraft()],
  };
}

/**
 * Best-effort client-side read of a scanned invoice. Text-readable files are
 * parsed for a reference, date and total; anything else falls back to a blank
 * draft the user completes in the review step.
 */
async function readInvoice(file: ScannedFile): Promise<InvoiceDraft> {
  const draft = emptyDraft();
  const isText =
    file.contentType.startsWith("text/") ||
    file.contentType === "application/json";

  if (!isText) return draft;

  try {
    const text = new TextDecoder().decode(file.bytes).slice(0, 20_000);

    const reference = text.match(
      /(?:invoice|ref|reference|inv)[\s#:.-]*([A-Z0-9][A-Z0-9-]{3,})/i,
    );
    if (reference) draft.vendorReference = reference[1];

    const date = text.match(/(\d{4}-\d{2}-\d{2})/);
    if (date) draft.invoiceDate = date[1];

    const total = text.match(
      /(?:total|amount due|grand total)[\s:$]*([\d,]+(?:\.\d{1,2})?)/i,
    );
    if (total) draft.totalAmount = total[1].replace(/,/g, "");

    const currency = text.match(/\b(USD|EUR|GBP|SGD|AED|JPY)\b/);
    if (currency) draft.currency = currency[1];

    if (/tool|drill|saw|hammer|wrench/i.test(text)) {
      draft.category = InvoiceCategory.handAndPowerTools;
    } else if (/rental|excavat|equipment|crane/i.test(text)) {
      draft.category = InvoiceCategory.heavyEquipmentRental;
    }
  } catch {
    // Unreadable content falls back to the blank draft.
  }

  return draft;
}

function invoiceErrorMessage(error: InvoiceError): string {
  switch (error.__kind__) {
    case "invalidInvoice":
      return error.invalidInvoice;
    case "invoiceNotFound":
      return "The invoice could not be found.";
    case "notOwner":
      return "You can only submit your own invoices.";
    case "alreadyReviewed":
      return "This invoice has already been reviewed.";
    default:
      return "The invoice could not be submitted.";
  }
}

export default function ScanPage() {
  const submitInvoice = useSubmitInvoice();
  const invoices = useMyInvoices();

  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("capture");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<ScannedFile | null>(null);
  const [draft, setDraft] = useState<InvoiceDraft>(emptyDraft);
  const [fileError, setFileError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [mintedAmount, setMintedAmount] = useState<bigint | null>(null);

  const reset = () => {
    setPhase("capture");
    setFile(null);
    setDraft(emptyDraft());
    setFileError(null);
    setServerError(null);
    setMintedAmount(null);
  };

  const handleFile = async (incoming: File) => {
    setFileError(null);
    setServerError(null);

    if (incoming.size > MAX_BYTES) {
      setFileError("This file exceeds the 10 MB limit.");
      return;
    }
    if (
      !incoming.type.startsWith("image/") &&
      incoming.type !== "application/pdf" &&
      !incoming.type.startsWith("text/")
    ) {
      setFileError("Upload a PDF, image or text invoice.");
      return;
    }

    try {
      const bytes = new Uint8Array(await incoming.arrayBuffer());
      const scanned: ScannedFile = {
        name: incoming.name,
        size: incoming.size,
        bytes,
        contentType: incoming.type || "application/octet-stream",
      };
      setFile(scanned);
      setPhase("reading");
      const parsed = await readInvoice(scanned);
      setDraft(parsed);
      setPhase("review");
    } catch {
      setFileError("The file could not be read. Please try another.");
      setPhase("capture");
    }
  };

  const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (selected) void handleFile(selected);
    event.target.value = "";
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) void handleFile(dropped);
  };

  const handleSubmit = (reviewed: ReviewedInvoice) => {
    if (!file) return;
    setServerError(null);

    submitInvoice.mutate(
      {
        category: reviewed.category,
        retailerName: reviewed.retailerName,
        vendorReference: reviewed.vendorReference,
        invoiceDate: reviewed.invoiceDate,
        totalAmount: reviewed.totalAmount,
        currency: reviewed.currency,
        lineItems: reviewed.lineItems,
        // The generated binding types the file parameter as raw bytes
        // (IDL.Vec(IDL.Nat8)); pass the scanned bytes directly.
        file: file.bytes,
      },
      {
        onSuccess: (result) => {
          if (result.__kind__ === "ok") {
            setMintedAmount(reviewed.totalAmount);
            setPhase("success");
          } else {
            setServerError(invoiceErrorMessage(result.err));
          }
        },
        onError: (error) => {
          setServerError(
            error instanceof Error && error.message
              ? error.message
              : "The invoice could not be submitted. Please try again.",
          );
        },
      },
    );
  };

  return (
    <Layout>
      <section
        data-ocid="scan.page"
        className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
      >
        <header className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Invoice intake
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Scan an invoice
          </h1>
          <p className="mt-3 text-muted-foreground">
            Upload a supplier invoice for material orders, equipment rentals or
            tool purchases, review the extracted line items, and mint tokens.
          </p>
        </header>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col gap-6">
            {phase === "capture" && (
              <div
                data-ocid="scan.capture_panel"
                className="rounded-lg border border-border bg-card p-6"
              >
                <div
                  data-ocid="scan.dropzone"
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center transition-smooth",
                    dragging
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/30 hover:border-primary/50",
                  )}
                >
                  <span className="inline-flex size-12 items-center justify-center rounded-full bg-secondary text-primary">
                    <ScanLine className="size-6" aria-hidden="true" />
                  </span>
                  <p className="font-display text-base font-semibold text-foreground">
                    Drop an invoice here to scan it
                  </p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    We read the retailer, reference, date, total and line items,
                    then let you confirm them before submitting.
                  </p>
                  <Button
                    type="button"
                    data-ocid="scan.upload_button"
                    onClick={() => inputRef.current?.click()}
                    className="mt-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Upload className="size-4" aria-hidden="true" />
                    Choose a file
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    PDF, PNG, JPG or WEBP · up to 10 MB
                  </p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED_TYPES}
                    data-ocid="scan.file_input"
                    className="sr-only"
                    onChange={onInputChange}
                  />
                </div>

                {fileError && (
                  <p
                    role="alert"
                    data-ocid="scan.file_error"
                    className="mt-4 flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  >
                    <AlertTriangle
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                    {fileError}
                  </p>
                )}
              </div>
            )}

            {phase === "reading" && (
              <div
                data-ocid="scan.reading_state"
                className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6"
              >
                <div className="flex items-center gap-3">
                  <Loader2
                    className="size-5 animate-spin text-primary"
                    aria-hidden="true"
                  />
                  <p className="text-sm text-foreground">
                    Reading {file?.name ?? "the invoice"}…
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  {Array.from(
                    { length: 4 },
                    (_, i) => `scan-skeleton-${i}`,
                  ).map((id) => (
                    <Skeleton key={id} className="h-10 w-full rounded-md" />
                  ))}
                </div>
              </div>
            )}

            {phase === "review" && file && (
              <div className="flex flex-col gap-4">
                <div
                  data-ocid="scan.file_summary"
                  className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-4 py-3"
                >
                  <FileText
                    className="size-4 shrink-0 text-accent"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(file.size)} · scanned
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    data-ocid="scan.rescan_button"
                    onClick={reset}
                    disabled={submitInvoice.isPending}
                    className="rounded-md"
                  >
                    Rescan
                  </Button>
                </div>

                {submitInvoice.isPending && (
                  <div
                    data-ocid="scan.upload_progress"
                    className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3"
                  >
                    <Loader2
                      className="size-4 shrink-0 animate-spin text-primary"
                      aria-hidden="true"
                    />
                    <div
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                      aria-hidden="true"
                    >
                      <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Submitting…
                    </span>
                  </div>
                )}

                <InvoiceReviewForm
                  draft={draft}
                  onChange={setDraft}
                  onSubmit={handleSubmit}
                  onCancel={reset}
                  isSubmitting={submitInvoice.isPending}
                  serverError={serverError}
                />
              </div>
            )}

            {phase === "success" && (
              <div
                data-ocid="scan.success_state"
                className="rounded-lg border border-primary/40 bg-card p-6"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="mt-0.5 size-6 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div>
                    <h2 className="font-display text-xl font-semibold text-foreground">
                      Invoice submitted
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Your invoice was accepted and utility tokens were minted
                      to your balance.
                    </p>
                    {mintedAmount !== null && (
                      <p className="mt-3 font-numeric text-2xl font-semibold text-primary">
                        +{formatMoney(mintedAmount, draft.currency)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    asChild
                    data-ocid="scan.view_history_link"
                    className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Link to="/history">View token history</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    data-ocid="scan.scan_another_button"
                    onClick={reset}
                    className="rounded-md"
                  >
                    Scan another invoice
                  </Button>
                </div>
              </div>
            )}
          </div>

          <aside className="flex flex-col gap-4 self-start rounded-lg border border-border bg-muted/30 p-6 lg:sticky lg:top-24">
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              How scanning works
            </h2>
            <ol className="flex flex-col gap-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="font-numeric text-primary">01</span>
                Upload the invoice document.
              </li>
              <li className="flex gap-3">
                <span className="font-numeric text-primary">02</span>
                Confirm the category, retailer, reference, date and total.
              </li>
              <li className="flex gap-3">
                <span className="font-numeric text-primary">03</span>
                Check the line items, then submit to mint tokens.
              </li>
            </ol>
            <p className="border-t border-border pt-4 text-xs text-muted-foreground">
              Tool invoices are accepted from a fixed set of named retailers.
            </p>
          </aside>
        </div>

        <section
          data-ocid="scan.history_section"
          className="mt-12 border-t border-border pt-8"
        >
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Previously scanned invoices
            </h2>
            <Receipt
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
          </div>

          {invoices.isLoading ? (
            <div
              data-ocid="scan.history.loading_state"
              className="mt-5 flex flex-col gap-3"
            >
              {Array.from({ length: 3 }, (_, i) => `invoice-skeleton-${i}`).map(
                (id) => (
                  <Skeleton key={id} className="h-16 w-full rounded-lg" />
                ),
              )}
            </div>
          ) : invoices.isError ? (
            <div
              data-ocid="scan.history.error_state"
              className="mt-5 flex flex-col items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-6"
            >
              <p className="text-sm text-destructive">
                Your scanned invoices could not be loaded.
              </p>
              <Button
                type="button"
                variant="outline"
                data-ocid="scan.history.retry_button"
                onClick={() => void invoices.refetch()}
                className="rounded-md"
              >
                Retry
              </Button>
            </div>
          ) : invoices.data && invoices.data.length > 0 ? (
            <ul
              data-ocid="scan.history.list"
              className="mt-5 flex flex-col gap-3"
            >
              {invoices.data.map((view, index) => (
                <li
                  key={view.invoice.id.toString()}
                  data-ocid={`scan.history.item.${index + 1}`}
                  className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium text-foreground">
                        {view.invoice.retailerName}
                      </p>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-widest",
                          view.invoice.status === "accepted"
                            ? "border-transparent bg-primary text-primary-foreground"
                            : view.invoice.status === "rejected"
                              ? "border-destructive/50 bg-destructive/10 text-destructive"
                              : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        {invoiceStatusLabel(view.invoice.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {invoiceCategoryLabel(view.invoice.category)} ·{" "}
                      {view.invoice.vendorReference} ·{" "}
                      {formatDate(view.invoice.invoiceDate)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-numeric text-sm text-foreground">
                      {formatMoney(
                        view.invoice.totalAmount,
                        view.invoice.currency,
                      )}
                    </p>
                    <p className="font-numeric text-xs text-primary">
                      +
                      {formatMoney(
                        view.invoice.mintedAmount,
                        view.invoice.currency,
                      )}{" "}
                      minted
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div
              data-ocid="scan.history.empty_state"
              className="mt-5 flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-12 text-center"
            >
              <span className="inline-flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <Receipt className="size-6" aria-hidden="true" />
              </span>
              <p className="font-display text-base font-semibold text-foreground">
                No invoices scanned yet
              </p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Scan your first supplier invoice to mint utility tokens and see
                it listed here.
              </p>
            </div>
          )}
        </section>
      </section>
    </Layout>
  );
}
