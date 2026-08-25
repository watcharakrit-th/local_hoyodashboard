/**
 * The normalized shape every card component renders from. Built server-side in
 * `dashboard.ts` from raw HoYoLAB API responses, so the client never has to know
 * about HoYoLAB's field names or per-endpoint quirks.
 */

export type MetricStatus = "good" | "warning" | "neutral";

export type GlyphName =
  | "commission"
  | "resin"
  | "realm-currency"
  | "trounce"
  | "difficulty"
  | "transformer"
  | "star"
  | "trailblaze-power"
  | "simulated-universe"
  | "battery"
  | "rank-badge"
  | "waveplate"
  | "reserve-energy"
  | "activity"
  | "weekly-challenge"
  | "sanity"
  | "daily-mission"
  | "weekly-mission";

export type MetricIcon =
  | { kind: "image"; src: string; alt: string }
  | { kind: "image-list"; images: { src: string; alt: string }[] }
  | { kind: "glyph"; name: GlyphName };

interface BaseMetric {
  id: string;
  label: string;
  icon?: MetricIcon;
  /** A smaller icon rendered next to the value itself (e.g. a mode's star/rank
   * marker), separate from `icon`, which sits in the card's header. */
  valueIcon?: MetricIcon;
  /** Present whenever the requirement calls for a "time remaining" readout. */
  countdownSeconds?: number;
  countdownLabel?: string;
}

export interface FractionMetric extends BaseMetric {
  variant: "fraction";
  current: number;
  max: number;
  status: MetricStatus;
}

export interface ProgressMetric extends BaseMetric {
  variant: "progress";
  current: number;
  max: number;
  /** Optional — most progress meters (resin, trailblaze power, battery, ...)
   * are "good" while regenerating and "warning" once capped. */
  status?: MetricStatus;
}

export interface StarMetric extends BaseMetric {
  variant: "stars";
  current: number;
  max: number;
  status: MetricStatus;
}

export interface CountdownMetric extends BaseMetric {
  variant: "countdown";
  ready: boolean;
}

export interface StygianMetric extends BaseMetric {
  variant: "stygian";
  /** 0 = no clear this cycle yet ("none"). */
  difficulty: number;
  seconds: number;
  status: MetricStatus;
}

export interface RankScoreMetric extends BaseMetric {
  variant: "rank-score";
  score: number;
  maxScore: number;
  rank: string;
  status: MetricStatus;
}

export interface StarScoreMetric extends BaseMetric {
  variant: "star-score";
  current: number;
  max: number;
  score: number;
  status: MetricStatus;
}

export interface ErrorMetric extends BaseMetric {
  variant: "error";
  message: string;
}

export type Metric =
  | FractionMetric
  | ProgressMetric
  | StarMetric
  | CountdownMetric
  | StygianMetric
  | RankScoreMetric
  | StarScoreMetric
  | ErrorMetric;

export interface GameProfile {
  nickname: string;
  level: number;
  server: string;
}

export interface DashboardSection {
  game: "genshin" | "hsr" | "zzz" | "wuwa" | "endfield";
  title: string;
  accent: string;
  profile: GameProfile | null;
  metrics: Metric[];
}

export interface DashboardResponse {
  generatedAt: string;
  sections: DashboardSection[];
}
