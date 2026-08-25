import type { GlyphName } from "@/lib/metrics";

/**
 * A small hand-built line-icon set for the handful of resources HoYoLAB's
 * Battle Chronicle API never returns an image for (the daily-note counters,
 * currencies, and the shared "star" motif used across every ranked mode).
 * One consistent stroke style keeps the dashboard reading as one system —
 * real API-provided artwork (character portraits, event rewards, rank
 * medals) is used directly wherever the API actually has it.
 */
export function Glyph({ name, className }: { name: GlyphName; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (name) {
    case "commission":
      return (
        <svg {...common}>
          <rect x="5" y="4" width="14" height="17" rx="2" />
          <path d="M9 3.5h6a1 1 0 0 1 1 1V6H8V4.5a1 1 0 0 1 1-1Z" />
          <path d="m8.5 13 2 2 4.5-4.5" />
          <path d="M8 17h8" />
        </svg>
      );
    case "resin":
      return (
        <svg {...common}>
          <path d="M12 3c2.8 3.6 5.5 7.1 5.5 10.5a5.5 5.5 0 1 1-11 0C6.5 10.1 9.2 6.6 12 3Z" />
          <path d="M9.5 14.5c0 1.5 1.1 2.5 2.5 2.5" opacity=".6" />
        </svg>
      );
    case "realm-currency":
      return (
        <svg {...common}>
          <path d="M5 9.5 12 6l7 3.5-7 3.5-7-3.5Z" />
          <path d="M5 9.5V16c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V9.5" />
          <path d="M5 12.75c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5" />
        </svg>
      );
    case "trounce":
      return (
        <svg {...common}>
          <path d="M12 3 4.5 6v5.2c0 4.6 3.2 7.4 7.5 9.3 4.3-1.9 7.5-4.7 7.5-9.3V6L12 3Z" />
          <path d="m9.5 12 2 2 3.5-4" />
        </svg>
      );
    case "difficulty":
      return (
        <svg {...common}>
          <path d="m4 8 8-4.5L20 8" />
          <path d="m4 13 8-4.5 8 4.5" />
          <path d="m4 18 8-4.5 8 4.5" opacity=".5" />
        </svg>
      );
    case "transformer":
      return (
        <svg {...common}>
          <path d="M7 3h10" />
          <path d="M7 21h10" />
          <path d="M7 3c0 4 3 4.8 3 6.5S7 14 7 18" opacity="0" />
          <path d="M7.5 3.2c0 4 4.2 4.6 4.2 5.8s-4.2 1.8-4.2 5.8" />
          <path d="M16.5 20.8c0-4-4.2-4.6-4.2-5.8s4.2-1.8 4.2-5.8" />
        </svg>
      );
    case "star":
      return (
        <svg {...common} strokeWidth={1.4}>
          <path
            d="M12 3.5l2.47 5.13 5.53.62-4.1 3.83 1.08 5.5L12 15.9l-4.98 2.68 1.08-5.5-4.1-3.83 5.53-.62L12 3.5Z"
            fill="currentColor"
            fillOpacity=".18"
          />
        </svg>
      );
    case "trailblaze-power":
      return (
        <svg {...common}>
          <path d="M13 3 6 13.5h5L10.5 21 18 10h-5L13 3Z" fill="currentColor" fillOpacity=".15" />
        </svg>
      );
    case "simulated-universe":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
          <ellipse cx="12" cy="12" rx="9" ry="3.6" />
          <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
        </svg>
      );
    case "battery":
      return (
        <svg {...common}>
          <rect x="3" y="8" width="16" height="9" rx="2" />
          <path d="M21 11v3" />
          <path d="m11 10.5-2.5 3.2H11L8.5 17" />
        </svg>
      );
    case "rank-badge":
      return (
        <svg {...common}>
          <path d="M12 3 5 6v5.5c0 4.5 3 7.3 7 8.5 4-1.2 7-4 7-8.5V6l-7-3Z" />
        </svg>
      );
    case "waveplate":
      return (
        <svg {...common}>
          <path d="M12 3 20 8v8l-8 5-8-5V8l8-5Z" fill="currentColor" fillOpacity=".12" />
          <path d="M5 9.5c2 2 3.5-2 5.5 0s3.5-2 5.5 0 3.5-2 5.5 0" opacity=".7" />
        </svg>
      );
    case "reserve-energy":
      return (
        <svg {...common}>
          <path d="M12 2.5 19 7v10l-7 4.5L5 17V7l7-4.5Z" />
          <path d="M12 8 9 12.5h2.5L10 17l4.5-5.5H12L14 8Z" fill="currentColor" fillOpacity=".2" />
        </svg>
      );
    case "activity":
      return (
        <svg {...common}>
          <path d="M3 12h4l2-7 4 14 2-7h6" />
        </svg>
      );
    case "weekly-challenge":
      return (
        <svg {...common}>
          <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
          <path d="M3.5 9.5h17" />
          <path d="M8 3v3M16 3v3" />
          <path d="m8.5 14.5 2 2 4-4.5" />
        </svg>
      );
    case "sanity":
      return (
        <svg {...common}>
          <path d="M12 3v3.5" />
          <path d="m18.5 6.5-2.5 2.5" />
          <path d="m5.5 6.5 2.5 2.5" />
          <circle cx="12" cy="14" r="7" />
          <path d="M12 10.5v3.8l3 2" />
        </svg>
      );
    case "daily-mission":
      return (
        <svg {...common}>
          <path d="M6 3h9l4 4v14H6Z" />
          <path d="M15 3v4h4" />
          <path d="m8.5 13 2 2 4.5-4.5" />
        </svg>
      );
    case "weekly-mission":
      return (
        <svg {...common}>
          <path d="M6 3h9l4 4v14H6Z" />
          <path d="M15 3v4h4" />
          <path d="M8.5 12h6" />
          <path d="M8.5 15.5h6" />
        </svg>
      );
    default:
      return null;
  }
}
