import { InvoiceCategory } from "@/backend";
import { RetailerPicker } from "@/components/RetailerPicker";
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
import { invoiceCategoryLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

const CURRENCIES = ["USD", "EUR", "GBP", "SGD", "AED", "JPY"];

const CATEGORY_OPTIONS: InvoiceCategory[] = [
  InvoiceCategory.materialOrder,
  InvoiceCategory.heavyEquipmentRental,
  InvoiceCategory.handAndPowerTools,
];

export interface LineItemDraft {
  id: string;
  description: string;
  quantity: string;
  amount: string;
}

let lineItemSeq = 0;

/** Create a line-item draft with a stable identity for React keys. */
export function newLineItemDraft(
  description = "",
  quantity = "1",
  amount = "",
): LineItemDraft {
  lineItemSeq += 1;
  return { id: `line-${lineItemSeq}`, description, quantity, amount };
}

export interface InvoiceDraft {
  category: InvoiceCategory;
  retailerName: string;
  vendorReference: string;
  invoiceDate: string;
  totalAmount: string;
  currency: string;
  lineItems: LineItemDraft[];
}

export interface ReviewedInvoice {
  category: InvoiceCategory;
  retailerName: string;
  vendorReference: string;
  invoiceDate: bigint;
  totalAmount: bigint;
  currency: string;
  lineItems: { description: string; quantity: bigint; amount: bigint }[];
}

type FieldErrors = Partial<
  Record<
    "retailerName" | "vendorReference" | "invoiceDate" | "totalAmount",
    string
  >
> & { lineItems?: string };

function parseAmount(value: string): number {
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function toTimestamp(value: string): bigint {
  return BigInt(new Date(`${value}T00:00:00Z`).getTime()) * 1_000_000n;
}

function validate(draft: InvoiceDraft): FieldErrors {
  const errors: FieldErrors = {};
  const total = parseAmount(draft.totalAmount);

  if (!draft.retailerName.trim()) {
    errors.retailerName = "Select or enter the retailer on the invoice.";
  }
  if (!draft.vendorReference.trim()) {
    errors.vendorReference = "Enter the vendor reference or invoice number.";
  }
  if (!draft.invoiceDate) {
    errors.invoiceDate = "Select the invoice date.";
  }
  if (!draft.totalAmount.trim()) {
    errors.totalAmount = "Enter the invoice total.";
  } else if (!Number.isFinite(total) || total <= 0) {
    errors.totalAmount = "Total must be a positive amount.";
  }

  const hasLineItem = draft.lineItems.some(
    (item) => item.description.trim() && item.amount.trim(),
  );
  if (!hasLineItem) {
    errors.lineItems =
      "Add at least one line item with a description and amount.";
  }

  return errors;
}

/**
 * Review and correction form for a scanned invoice. Owns the editable draft,
 * validates it, and hands the reviewed values back to the page on submit.
 */
export function InvoiceReviewForm({
  draft,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting,
  serverError,
}: {
  draft: InvoiceDraft;
  onChange: (draft: InvoiceDraft) => void;
  onSubmit: (reviewed: ReviewedInvoice) => void;
  onCancel: () => void;
  isSubmitting: boolean;
  serverError?: string | null;
}) {
  const [errors, setErrors] = useState<FieldErrors>({});

  const setField = <K extends keyof InvoiceDraft>(
    key: K,
    value: InvoiceDraft[K],
  ) => {
    onChange({ ...draft, [key]: value });
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const setLineItem = (index: number, patch: Partial<LineItemDraft>) => {
    const next = draft.lineItems.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );
    onChange({ ...draft, lineItems: next });
    setErrors((current) => ({ ...current, lineItems: undefined }));
  };

  const addLineItem = () => {
    onChange({
      ...draft,
      lineItems: [...draft.lineItems, newLineItemDraft()],
    });
  };

  const removeLineItem = (index: number) => {
    onChange({
      ...draft,
      lineItems: draft.lineItems.filter((_, i) => i !== index),
    });
  };

  const lineItemTotal = useMemo(
    () =>
      draft.lineItems.reduce((sum, item) => {
        const amount = parseAmount(item.amount);
        return sum + (Number.isFinite(amount) ? amount : 0);
      }, 0),
    [draft.lineItems],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      category: draft.category,
      retailerName: draft.retailerName.trim(),
      vendorReference: draft.vendorReference.trim(),
      invoiceDate: toTimestamp(draft.invoiceDate),
      totalAmount: BigInt(Math.round(parseAmount(draft.totalAmount))),
      currency: draft.currency,
      lineItems: draft.lineItems
        .filter((item) => item.description.trim() && item.amount.trim())
        .map((item) => ({
          description: item.description.trim(),
          quantity: BigInt(
            Math.max(1, Math.round(parseAmount(item.quantity) || 1)),
          ),
          amount: BigInt(Math.round(parseAmount(item.amount))),
        })),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      data-ocid="scan.review_form"
      className="flex flex-col gap-6 rounded-lg border border-border bg-card p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-lg font-semibold text-foreground">
          Review the scanned invoice
        </h2>
        <p className="text-sm text-muted-foreground">
          Confirm or correct the details read from the document before
          submitting it to mint tokens.
        </p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
          Invoice category
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {CATEGORY_OPTIONS.map((category) => {
            const selected = draft.category === category;
            return (
              <button
                key={category}
                type="button"
                data-ocid={`scan.category_${category}_button`}
                aria-pressed={selected}
                onClick={() => setField("category", category)}
                className={cn(
                  "rounded-md border px-3 py-2.5 text-left text-sm font-medium transition-smooth focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  selected
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {invoiceCategoryLabel(category)}
              </button>
            );
          })}
        </div>
      </fieldset>

      {draft.category === InvoiceCategory.handAndPowerTools ? (
        <RetailerPicker
          value={draft.retailerName}
          onChange={(value) => setField("retailerName", value)}
          error={errors.retailerName}
          disabled={isSubmitting}
        />
      ) : (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="retailerName" className="text-foreground">
            Retailer / vendor
          </Label>
          <Input
            id="retailerName"
            data-ocid="scan.retailer_input"
            placeholder="BuildRight Materials Co."
            value={draft.retailerName}
            aria-invalid={!!errors.retailerName}
            onChange={(event) => setField("retailerName", event.target.value)}
          />
          {errors.retailerName && (
            <p
              role="alert"
              data-ocid="scan.retailer_input.error"
              className="text-xs text-destructive"
            >
              {errors.retailerName}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vendorReference" className="text-foreground">
            Vendor reference
          </Label>
          <Input
            id="vendorReference"
            data-ocid="scan.vendor_reference_input"
            placeholder="INV-20481"
            value={draft.vendorReference}
            aria-invalid={!!errors.vendorReference}
            onChange={(event) =>
              setField("vendorReference", event.target.value)
            }
          />
          {errors.vendorReference && (
            <p
              role="alert"
              data-ocid="scan.vendor_reference_input.error"
              className="text-xs text-destructive"
            >
              {errors.vendorReference}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="invoiceDate" className="text-foreground">
            Invoice date
          </Label>
          <Input
            id="invoiceDate"
            type="date"
            data-ocid="scan.invoice_date_input"
            value={draft.invoiceDate}
            aria-invalid={!!errors.invoiceDate}
            onChange={(event) => setField("invoiceDate", event.target.value)}
          />
          {errors.invoiceDate && (
            <p
              role="alert"
              data-ocid="scan.invoice_date_input.error"
              className="text-xs text-destructive"
            >
              {errors.invoiceDate}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="totalAmount" className="text-foreground">
            Total amount
          </Label>
          <Input
            id="totalAmount"
            data-ocid="scan.total_amount_input"
            inputMode="decimal"
            placeholder="18450"
            value={draft.totalAmount}
            aria-invalid={!!errors.totalAmount}
            onChange={(event) => setField("totalAmount", event.target.value)}
            className="font-numeric"
          />
          {errors.totalAmount && (
            <p
              role="alert"
              data-ocid="scan.total_amount_input.error"
              className="text-xs text-destructive"
            >
              {errors.totalAmount}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="currency" className="text-foreground">
            Currency
          </Label>
          <Select
            value={draft.currency}
            onValueChange={(value) => setField("currency", value)}
          >
            <SelectTrigger
              id="currency"
              data-ocid="scan.currency_select"
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
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
            Line items
          </h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-ocid="scan.add_line_item_button"
            onClick={addLineItem}
            disabled={isSubmitting}
            className="rounded-md"
          >
            <Plus className="size-4" aria-hidden="true" />
            Add line
          </Button>
        </div>

        {draft.lineItems.length === 0 ? (
          <p
            data-ocid="scan.line_items.empty_state"
            className="rounded-md border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground"
          >
            No line items yet. Add the goods or services listed on the invoice.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {draft.lineItems.map((item, index) => (
              <li
                key={item.id}
                data-ocid={`scan.line_item.${index + 1}`}
                className="grid gap-3 rounded-md border border-border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_auto]"
              >
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor={`line-desc-${index}`}
                    className="text-xs text-muted-foreground"
                  >
                    Description
                  </Label>
                  <Input
                    id={`line-desc-${index}`}
                    data-ocid={`scan.line_item_description_input.${index + 1}`}
                    placeholder="2x4 lumber, 8ft"
                    value={item.description}
                    onChange={(event) =>
                      setLineItem(index, { description: event.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor={`line-qty-${index}`}
                    className="text-xs text-muted-foreground"
                  >
                    Qty
                  </Label>
                  <Input
                    id={`line-qty-${index}`}
                    data-ocid={`scan.line_item_quantity_input.${index + 1}`}
                    inputMode="numeric"
                    value={item.quantity}
                    onChange={(event) =>
                      setLineItem(index, { quantity: event.target.value })
                    }
                    className="font-numeric"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor={`line-amt-${index}`}
                    className="text-xs text-muted-foreground"
                  >
                    Amount
                  </Label>
                  <Input
                    id={`line-amt-${index}`}
                    data-ocid={`scan.line_item_amount_input.${index + 1}`}
                    inputMode="decimal"
                    placeholder="0.00"
                    value={item.amount}
                    onChange={(event) =>
                      setLineItem(index, { amount: event.target.value })
                    }
                    className="font-numeric"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    data-ocid={`scan.remove_line_item_button.${index + 1}`}
                    aria-label={`Remove line item ${index + 1}`}
                    onClick={() => removeLineItem(index)}
                    disabled={isSubmitting}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {errors.lineItems && (
          <p
            role="alert"
            data-ocid="scan.line_items.error"
            className="text-xs text-destructive"
          >
            {errors.lineItems}
          </p>
        )}

        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">Line item total</span>
          <span className="font-numeric text-foreground">
            {lineItemTotal.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            {draft.currency}
          </span>
        </div>
      </div>

      {serverError && (
        <p
          role="alert"
          data-ocid="scan.submit_error"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {serverError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <Button
          type="submit"
          data-ocid="scan.submit_button"
          disabled={isSubmitting}
          className="rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isSubmitting ? "Submitting…" : "Submit invoice"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          data-ocid="scan.cancel_button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-md"
        >
          Scan a different file
        </Button>
      </div>
    </form>
  );
}
