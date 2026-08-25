import type { DashboardSection } from "@/lib/metrics";
import { MetricCard } from "@/components/cards/MetricCard";

const ACCENT_VAR: Record<DashboardSection["accent"], string> = {
  genshin: "var(--accent-genshin)",
  hsr: "var(--accent-hsr)",
  zzz: "var(--accent-zzz)",
  wuwa: "var(--accent-wuwa)",
  endfield: "var(--accent-endfield)",
};

export function GameSection({ section }: { section: DashboardSection }) {
  const accent = ACCENT_VAR[section.accent] ?? "var(--accent-genshin)";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-6 rounded-full" style={{ background: accent }} aria-hidden />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{section.title}</h2>
        </div>
        {section.profile && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">{section.profile.nickname}</span>
            <span className="text-[var(--text-muted)]">
              Lv.{section.profile.level} · {section.profile.server}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {section.metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} accent={accent} />
        ))}
      </div>
    </section>
  );
}
