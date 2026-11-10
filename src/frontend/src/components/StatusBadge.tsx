import { Badge } from "@/components/ui/badge";
import { tokenStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

type StatusTone = "open" | "funded" | "matured" | "cancelled";

const toneClasses: Record<StatusTone, string> = {
  open: "border-primary/60 bg-primary/10 text-primary",
  funded: "border-transparent bg-primary text-primary-foreground",
  matured: "border-border bg-muted text-muted-foreground",
  cancelled: "border-destructive/50 bg-destructive/10 text-destructive",
};

/** Pill-shaped status chip: Open (mint outline), Funded (mint solid), Matured (muted). */
export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone = (
    ["open", "funded", "matured", "cancelled"].includes(status)
      ? status
      : "matured"
  ) as StatusTone;
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-widest",
        toneClasses[tone],
        className,
      )}
    >
      {tokenStatusLabel(status)}
    </Badge>
  );
}

/** Copper document tag used for asset-class chips (INV, BOL, INS). */
export function DocumentTag({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-accent/40 bg-accent/10 px-1.5 py-0.5 font-mono text-[0.65rem] font-medium uppercase tracking-wider text-accent",
        className,
      )}
    >
      {label}
    </span>
  );
}
