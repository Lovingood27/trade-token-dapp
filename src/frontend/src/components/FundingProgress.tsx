import { progressWidth } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Mint funding-progress bar with a monospace percentage readout. */
export function FundingProgress({
  ratio,
  className,
  showLabel = true,
}: {
  ratio: number;
  className?: string;
  showLabel?: boolean;
}) {
  const width = progressWidth(ratio);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        tabIndex={0}
        aria-valuenow={Math.round(width)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Funding progress"
      >
        <div
          className="h-full origin-left rounded-full bg-primary animate-progress-grow"
          style={{ width: `${width}%` }}
        />
      </div>
      {showLabel && (
        <span className="font-numeric text-xs font-medium text-foreground">
          {Math.round(width)}%
        </span>
      )}
    </div>
  );
}
