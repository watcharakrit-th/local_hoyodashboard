import type { MetricStatus } from "@/lib/metrics";

/**
 * Reinforces the card's wash color with an icon + word so status is never
 * conveyed by color alone.
 */
export function StatusPill({ status, goodLabel = "Complete", warningLabel = "In progress" }: {
  status: MetricStatus;
  goodLabel?: string;
  warningLabel?: string;
}) {
  if (status === "neutral") return null;
  const isGood = status === "good";
  return (
    <span className={`status-pill ${isGood ? "status-pill--good" : "status-pill--warning"}`}>
      <span aria-hidden>{isGood ? "✓" : "●"}</span>
      {isGood ? goodLabel : warningLabel}
    </span>
  );
}
