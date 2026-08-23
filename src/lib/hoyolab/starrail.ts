import { hoyolabRequest } from "./client";

const BASE = "https://bbs-api-os.hoyolab.com/game_record/hkrpg/api";

function role() {
  return {
    role_id: requireEnv("HSR_UID"),
    server: requireEnv("HSR_SERVER"),
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

// ---- Raw response shapes ----

export interface RawStarRailNote {
  current_train_score: number;
  max_train_score: number;
  current_stamina: number;
  max_stamina: number;
  weekly_cocoon_cnt: number;
  weekly_cocoon_limit: number;
  current_rogue_score: number;
  max_rogue_score: number;
}

export interface RawChallengeGroup {
  status: "Running" | "New" | "End";
  name_mi18n: string;
  begin_time: { year: number; month: number; day: number; hour: number; minute: number };
  end_time: { year: number; month: number; day: number; hour: number; minute: number };
}

export interface RawStarRailChallenge {
  star_num: number;
  max_floor: string;
  has_data: boolean;
  groups: RawChallengeGroup[];
}

export interface RawPeakBossRecord {
  star_num: number;
  challenge_peak_rank_icon: string;
  challenge_peak_rank_icon_type: string;
}

export interface RawPeakRecord {
  group: {
    name_mi18n: string;
    status: "Running" | "New" | "End";
    end_time: { year: number; month: number; day: number; hour: number; minute: number };
  };
  boss_stars: number;
  mob_stars: number;
  boss_record: RawPeakBossRecord | null;
}

export interface RawChallengePeak {
  challenge_peak_records: RawPeakRecord[];
}

// ---- Fetchers ----

export function getStarRailNote() {
  return hoyolabRequest<RawStarRailNote>(`${BASE}/note`, { params: role() });
}

export function getForgottenHall() {
  return hoyolabRequest<RawStarRailChallenge>(`${BASE}/challenge`, {
    params: { ...role(), schedule_type: 1, need_all: "false" },
  });
}

export function getPureFiction() {
  return hoyolabRequest<RawStarRailChallenge>(`${BASE}/challenge_story`, {
    params: { ...role(), schedule_type: 1, need_all: "false" },
  });
}

export function getApocalypticShadow() {
  return hoyolabRequest<RawStarRailChallenge>(`${BASE}/challenge_boss`, {
    params: { ...role(), schedule_type: 1, need_all: "false" },
  });
}

export function getAnomalyArbitration() {
  // schedule_type=1 doesn't reliably return the freshest cycle for this endpoint;
  // schedule_type=3 returns the 3 most recent cycles and the dashboard picks the
  // one with the latest end_time.
  return hoyolabRequest<RawChallengePeak>(`${BASE}/challenge_peak`, {
    params: { ...role(), schedule_type: 3 },
  });
}
