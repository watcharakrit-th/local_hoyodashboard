import { hoyolabRequest } from "./client";

const BASE = "https://sg-public-api.hoyolab.com/event/game_record/genshin/api";

function role() {
  return {
    role_id: requireEnv("GENSHIN_UID"),
    server: requireEnv("GENSHIN_SERVER"),
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

// ---- Raw response shapes (only the fields this app reads) ----

export interface RawExpedition {
  avatar_side_icon: string;
  status: "Ongoing" | "Finished";
  remained_time: string;
}

export interface RawDailyNote {
  current_resin: number;
  max_resin: number;
  resin_recovery_time: string;
  finished_task_num: number;
  total_task_num: number;
  remain_resin_discount_num: number;
  resin_discount_num_limit: number;
  current_expedition_num: number;
  max_expedition_num: number;
  expeditions: RawExpedition[];
  current_home_coin: number;
  max_home_coin: number;
  home_coin_recovery_time: string;
  transformer: {
    obtained: boolean;
    recovery_time: { Day: number; Hour: number; Minute: number; Second: number; reached: boolean };
  };
}

export interface RawSpiralAbyss {
  schedule_id: number;
  start_time: string;
  end_time: string;
  max_floor: string;
  total_star: number;
  total_battle_times: number;
  total_win_times: number;
}

export interface RawTheaterStat {
  difficulty_id: number;
  max_round_id: number;
  /** One entry per star challenge stella (2 per act, 6 acts = 12); 1 = obtained, 0 = not. */
  get_medal_round_list: number[];
  medal_num: number;
}

export interface RawTheaterSchedule {
  start_time: string;
  end_time: string;
}

export interface RawTheaterEntry {
  stat: RawTheaterStat;
  schedule: RawTheaterSchedule;
  has_data: boolean;
}

export interface RawImgTheater {
  data: RawTheaterEntry[];
  is_unlock: boolean;
}

export interface RawHardChallengeBest {
  difficulty: number;
  second: number;
  icon: string;
}

export interface RawHardChallengeSide {
  best: RawHardChallengeBest | null;
  has_data: boolean;
}

export interface RawHardChallengeSchedule {
  schedule_id: string;
  start_time: string;
  end_time: string;
  is_valid: boolean;
  name: string;
}

export interface RawHardChallengeEntry {
  schedule: RawHardChallengeSchedule;
  single: RawHardChallengeSide;
  mp: RawHardChallengeSide;
}

export interface RawHardChallenge {
  data: RawHardChallengeEntry[];
  is_unlock: boolean;
}

export interface RawEventReward {
  item_id: number;
  name: string;
  icon: string;
  num: number;
}

export interface RawCalendarEvent {
  id: number;
  name: string;
  countdown_seconds: number;
  reward_list: RawEventReward[];
  hard_challenge_detail?: {
    is_unlock: boolean;
    difficulty: number;
    second: number;
    sub: { seconds: number; x: number; y: number } | null;
  };
}

export interface RawGenshinEventCalendar {
  act_list: RawCalendarEvent[];
  fixed_act_list: RawCalendarEvent[];
}

// ---- Fetchers ----

export function getGenshinDailyNote() {
  return hoyolabRequest<RawDailyNote>(`${BASE}/dailyNote`, { params: role() });
}

export function getGenshinSpiralAbyss() {
  return hoyolabRequest<RawSpiralAbyss>(`${BASE}/spiralAbyss`, {
    params: { ...role(), schedule_type: 1 },
  });
}

export function getGenshinImaginariumTheater() {
  return hoyolabRequest<RawImgTheater>(`${BASE}/role_combat`, {
    params: { ...role(), need_detail: "false" },
  });
}

export function getGenshinStygianOnslaught() {
  return hoyolabRequest<RawHardChallenge>(`${BASE}/hard_challenge`, {
    params: { ...role(), need_detail: "false" },
  });
}

export function getGenshinEventCalendar() {
  return hoyolabRequest<RawGenshinEventCalendar>(`${BASE}/act_calendar`, {
    method: "POST",
    params: role(),
  });
}
