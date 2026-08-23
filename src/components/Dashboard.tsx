"use client";

import useSWR from "swr";
import { useEffect, useState } from "react";
import type { DashboardResponse } from "@/lib/metrics";
import { GameSection } from "@/components/GameSection";

const fetcher = (url: string) =>
  fetch(url).then(async (res) => {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Request failed (${res.status})`);
    }
    return res.json() as Promise<DashboardResponse>;
  });

function useAgo(iso?: string) {
  const [label, setLabel] = useState("just now");

  useEffect(() => {
    if (!iso) return;
    const update = () => {
      const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
      if (seconds < 5) setLabel("just now");
      else if (seconds < 60) setLabel(`${seconds}s ago`);
      else setLabel(`${Math.round(seconds / 60)}m ago`);
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [iso]);

  return label;
}

export function Dashboard() {
  const { data, error, isLoading, mutate, isValidating } = useSWR<DashboardResponse>("/api/dashboard", fetcher, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });

  const ago = useAgo(data?.generatedAt);

  return (
    <main className="max-w-6xl mx-auto px-5 py-8 flex flex-col gap-10">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">HoYo Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)]">Live Genshin Impact, Star Rail & ZZZ resource tracker</p>
        </div>
        <div className="flex items-center gap-3">
          {data && <span className="text-xs text-[var(--text-muted)]">Updated {ago}</span>}
          <button
            onClick={() => mutate()}
            disabled={isValidating}
            className="text-sm font-medium px-3 py-1.5 rounded-lg border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] disabled:opacity-50 transition-colors"
          >
            {isValidating ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div className="metric-card metric-card--warning">
          <span className="font-medium text-[var(--text-primary)]">Couldn&apos;t load dashboard data</span>
          <span className="text-sm text-[var(--text-secondary)]">{error.message}</span>
          <span className="text-xs text-[var(--text-muted)]">
            Check that HOYOLAB_LTUID / HOYOLAB_LTOKEN and each game&apos;s UID/server are set in .env.local.
          </span>
        </div>
      )}

      {isLoading && !data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="metric-card animate-pulse">
              <div className="h-4 w-24 bg-[var(--surface-card-hover)] rounded" />
              <div className="h-7 w-16 bg-[var(--surface-card-hover)] rounded" />
            </div>
          ))}
        </div>
      )}

      {data?.sections.map((section) => <GameSection key={section.game} section={section} />)}
    </main>
  );
}
