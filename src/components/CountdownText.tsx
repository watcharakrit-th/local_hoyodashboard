"use client";

import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";

/**
 * Ticks a server-provided "seconds remaining" snapshot down locally so the
 * countdown stays live between polls instead of just showing a stale number.
 */
export function CountdownText({ seconds, label }: { seconds: number; label?: string }) {
  // "Adjusting state when a prop changes": reset the local ticker whenever the
  // server hands us a fresh snapshot, without calling setState from an effect.
  const [prevSeconds, setPrevSeconds] = useState(seconds);
  const [remaining, setRemaining] = useState(seconds);
  if (seconds !== prevSeconds) {
    setPrevSeconds(seconds);
    setRemaining(seconds);
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => Math.max(0, prev - 30));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-xs text-[var(--text-muted)]">
      {formatDuration(remaining)}
      {label ? ` ${label}` : ""}
    </span>
  );
}
