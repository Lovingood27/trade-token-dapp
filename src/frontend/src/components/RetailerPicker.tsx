import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check, Store } from "lucide-react";

/**
 * The named retailers whose hand and power tool invoices are accepted for
 * tokenization. Kept as a fixed list so the picker stays consistent with the
 * retailer names the ledger expects.
 */
export const TOOL_RETAILERS = [
  "The Home Depot",
  "Lowe's",
  "Harbor Freight Tools",
  "Grainger",
  "Fastenal",
  "Northern Tool + Equipment",
  "Ace Hardware",
  "MSC Industrial Supply",
  "Toolstation",
  "Screwfix",
] as const;

export type ToolRetailer = (typeof TOOL_RETAILERS)[number];

/**
 * Retailer picker for tool invoices. Renders the named retailers as a
 * selectable grid plus a free-text field for a retailer not on the list.
 */
export function RetailerPicker({
  value,
  onChange,
  error,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}) {
  const isListed = (TOOL_RETAILERS as readonly string[]).includes(value);

  return (
    <fieldset
      data-ocid="scan.retailer_picker"
      className="flex flex-col gap-3"
      disabled={disabled}
    >
      <legend className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
        Retailer
      </legend>
      <p className="text-xs text-muted-foreground">
        Tool invoices are accepted from these retailers. Select the one on the
        invoice.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {TOOL_RETAILERS.map((retailer) => {
          const selected = value === retailer;
          return (
            <button
              key={retailer}
              type="button"
              data-ocid={`scan.retailer_option.${TOOL_RETAILERS.indexOf(retailer) + 1}`}
              aria-pressed={selected}
              onClick={() => onChange(retailer)}
              className={cn(
                "flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left text-sm transition-smooth focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                selected
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-7 shrink-0 items-center justify-center rounded-md",
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                {selected ? (
                  <Check className="size-4" aria-hidden="true" />
                ) : (
                  <Store className="size-4" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {retailer}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="retailerOther" className="text-foreground">
          Other retailer
        </Label>
        <input
          id="retailerOther"
          data-ocid="scan.retailer_other_input"
          type="text"
          placeholder="Enter a retailer not listed above"
          value={isListed ? "" : value}
          aria-invalid={!!error}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground transition-smooth placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      </div>

      {error && (
        <p
          role="alert"
          data-ocid="scan.retailer_error"
          className="text-xs text-destructive"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
}
