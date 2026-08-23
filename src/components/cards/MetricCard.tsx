import type { Metric, MetricIcon, MetricStatus } from "@/lib/metrics";
import { Glyph } from "@/components/icons/Glyphs";
import { StatusPill } from "@/components/StatusPill";
import { CountdownText } from "@/components/CountdownText";
import { toRoman } from "@/lib/format";

function cardClass(status: MetricStatus | undefined) {
  if (status === "good") return "metric-card metric-card--good";
  if (status === "warning") return "metric-card metric-card--warning";
  return "metric-card";
}

function IconSlot({ icon, accent }: { icon?: MetricIcon; accent: string }) {
  if (!icon) return null;

  // A handful of the downloaded icons are pale/near-white and disappear on the
  // card's light surface with a flat gray chip behind them — tint the chip
  // with the section's own accent instead so every icon keeps contrast.
  const chipStyle = { background: `color-mix(in srgb, ${accent} 16%, transparent)` };

  if (icon.kind === "glyph") {
    return (
      <span
        className="flex items-center justify-center w-[29px] h-[29px] rounded-lg text-[var(--text-secondary)] shrink-0"
        style={chipStyle}
      >
        <Glyph name={icon.name} className="w-4 h-4" />
      </span>
    );
  }

  if (icon.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon.src}
        alt={icon.alt}
        className="w-[29px] h-[29px] rounded-lg object-contain p-1 shrink-0"
        style={chipStyle}
      />
    );
  }

  // image-list: overlapping avatar stack (kept for any future multi-avatar card)
  return (
    <div className="flex -space-x-1.5">
      {icon.images.slice(0, 5).map((img, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={img.src}
          alt={img.alt}
          className="w-[22px] h-[22px] rounded-full border object-cover bg-black/5"
          style={{ borderColor: "var(--surface-card)" }}
        />
      ))}
      {icon.images.length === 0 && <span className="text-xs text-[var(--text-muted)]">None dispatched</span>}
    </div>
  );
}

/** A small icon placed next to a value (e.g. a mode's star/rank marker), as
 * opposed to `IconSlot`, which renders the card's larger header icon. */
function ValueIcon({ icon, accent }: { icon?: MetricIcon; accent: string }) {
  if (!icon || icon.kind === "image-list") return null;

  const chipStyle = { background: `color-mix(in srgb, ${accent} 18%, transparent)` };

  if (icon.kind === "glyph") {
    return (
      <span
        className="flex items-center justify-center self-center w-6 h-6 rounded-full text-[var(--text-secondary)] shrink-0"
        style={chipStyle}
      >
        <Glyph name={icon.name} className="w-3.5 h-3.5" />
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={icon.src}
      alt={icon.alt}
      className="w-6 h-6 rounded-full object-contain p-0.5 self-center shrink-0"
      style={chipStyle}
    />
  );
}

function SvgMeter({ percent, colorVar }: { percent: number; colorVar: string }) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="w-full h-2 block" role="img" aria-label={`${Math.round(clamped)}% full`}>
      <rect x="0" y="0" width="100" height="8" rx="4" fill="var(--meter-track)" />
      {clamped > 0 && <rect x="0" y="0" width={clamped} height="8" rx="4" fill={colorVar} />}
    </svg>
  );
}

function Header({ label, icon, accent }: { label: string; icon?: MetricIcon; accent: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-sm text-[var(--text-secondary)] leading-snug">{label}</span>
      <IconSlot icon={icon} accent={accent} />
    </div>
  );
}

function BigValue({ current, max }: { current: number | string; max?: number | string }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-semibold text-[var(--text-primary)] tabular-nums">{current}</span>
      {max !== undefined && <span className="text-sm text-[var(--text-muted)] tabular-nums">/ {max}</span>}
    </div>
  );
}

export function MetricCard({ metric, accent = "#2a78d6" }: { metric: Metric; accent?: string }) {
  switch (metric.variant) {
    case "fraction": {
      return (
        <div className={cardClass(metric.status)}>
          <Header label={metric.label} icon={metric.icon} accent={accent} />
          <div className="flex items-center gap-2">
            <BigValue current={metric.current} max={metric.max} />
            <ValueIcon icon={metric.valueIcon} accent={accent} />
          </div>
          <div className="mt-auto flex items-center justify-between gap-2">
            <StatusPill status={metric.status} />
            {metric.countdownSeconds !== undefined && (
              <CountdownText seconds={metric.countdownSeconds} label={metric.countdownLabel} />
            )}
          </div>
        </div>
      );
    }

    case "progress": {
      const percent = metric.max > 0 ? (metric.current / metric.max) * 100 : 0;
      return (
        <div className={cardClass(metric.status)}>
          <Header label={metric.label} icon={metric.icon} accent={accent} />
          <BigValue current={metric.current} max={metric.max} />
          <SvgMeter percent={percent} colorVar={accent} />
          <div className="mt-auto flex items-center justify-between gap-2">
            <StatusPill status={metric.status ?? "neutral"} goodLabel="Regenerating" warningLabel="Full" />
            {metric.countdownSeconds !== undefined && (
              <CountdownText seconds={metric.countdownSeconds} label={metric.countdownLabel} />
            )}
          </div>
        </div>
      );
    }

    case "stars": {
      return (
        <div className={cardClass(metric.status)}>
          <Header label={metric.label} icon={metric.icon} accent={accent} />
          <div className="flex items-center gap-2">
            <BigValue current={metric.current} max={metric.max} />
            <ValueIcon icon={metric.valueIcon} accent={accent} />
          </div>
          <div className="mt-auto flex items-center justify-between gap-2">
            <StatusPill status={metric.status} goodLabel="Fully cleared" warningLabel="Incomplete" />
            {metric.countdownSeconds !== undefined && (
              <CountdownText seconds={metric.countdownSeconds} label={metric.countdownLabel} />
            )}
          </div>
        </div>
      );
    }

    case "countdown": {
      return (
        <div className="metric-card">
          <Header label={metric.label} icon={metric.icon} accent={accent} />
          {metric.ready ? (
            <span className="status-pill status-pill--good w-fit">
              <span aria-hidden>✓</span> Ready now
            </span>
          ) : (
            <div className="flex flex-col gap-0.5">
              <span className="text-lg font-semibold text-[var(--text-primary)]">On cooldown</span>
              {metric.countdownSeconds !== undefined && (
                <span className="text-sm text-[var(--text-secondary)]">
                  Ready in <CountdownText seconds={metric.countdownSeconds} />
                </span>
              )}
            </div>
          )}
        </div>
      );
    }

    case "stygian": {
      const none = metric.difficulty === 0;
      return (
        <div className={cardClass(metric.status)}>
          <Header label={metric.label} icon={metric.icon} accent={accent} />
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-[var(--text-primary)]">
              {none ? "None" : `Difficulty ${toRoman(metric.difficulty)}`}
            </span>
            <span className="text-sm text-[var(--text-muted)] tabular-nums">{metric.seconds}s</span>
            <ValueIcon icon={metric.valueIcon} accent={accent} />
          </div>
          <div className="mt-auto flex items-center justify-between gap-2">
            <StatusPill status={metric.status} goodLabel="Max difficulty" warningLabel="Below max" />
            {metric.countdownSeconds !== undefined && (
              <CountdownText seconds={metric.countdownSeconds} label={metric.countdownLabel} />
            )}
          </div>
        </div>
      );
    }

    case "rank-score": {
      return (
        <div className={cardClass(metric.status)}>
          <Header label={metric.label} icon={metric.icon} accent={accent} />
          <div className="flex items-center gap-3">
            <span
              className="flex items-center justify-center w-11 h-11 rounded-xl text-lg font-bold text-white shrink-0"
              style={{ background: metric.status === "good" ? "var(--status-good)" : "var(--status-warning-icon)" }}
            >
              {metric.rank}
            </span>
            <div className="flex flex-col">
              <span className="text-xl font-semibold text-[var(--text-primary)] tabular-nums">
                {metric.score.toLocaleString()}
              </span>
              <span className="text-xs text-[var(--text-muted)]">score</span>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between gap-2">
            <StatusPill status={metric.status} goodLabel="S rank" warningLabel="Below S" />
            {metric.countdownSeconds !== undefined && (
              <CountdownText seconds={metric.countdownSeconds} label={metric.countdownLabel} />
            )}
          </div>
        </div>
      );
    }

    case "star-score": {
      return (
        <div className={cardClass(metric.status)}>
          <Header label={metric.label} icon={metric.icon} accent={accent} />
          <div className="flex items-baseline gap-3">
            <BigValue current={metric.current} max={metric.max} />
            <span className="text-sm text-[var(--text-muted)] tabular-nums">{metric.score.toLocaleString()} pts</span>
          </div>
          <div className="mt-auto flex items-center justify-between gap-2">
            <StatusPill status={metric.status} />
            {metric.countdownSeconds !== undefined && (
              <CountdownText seconds={metric.countdownSeconds} label={metric.countdownLabel} />
            )}
          </div>
        </div>
      );
    }

    case "error": {
      return (
        <div className="metric-card metric-card--error">
          <Header label={metric.label} icon={metric.icon} accent={accent} />
          <span className="text-sm text-[var(--text-muted)] mt-auto">{metric.message}</span>
        </div>
      );
    }

    default:
      return null;
  }
}
