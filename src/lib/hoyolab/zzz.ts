import { hoyolabRequest } from "./client";

const BASE = "https://sg-act-public-api.hoyolab.com/event/game_record_zzz/api/zzz";

function role() {
  return {
    role_id: requireEnv("ZZZ_UID"),
    server: requireEnv("ZZZ_SERVER"),
  };
}

function uidRegion() {
  return {
    uid: requireEnv("ZZZ_UID"),
    region: requireEnv("ZZZ_SERVER"),
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

// ---- Raw response shapes ----

export interface RawZzzNote {
  energy: { progress: { current: number; max: number }; restore: number };
  vitality: { current: number; max: number };
  bounty_commission: { num: number; total: number; refresh_time: number } | null;
  weekly_task: { cur_point: number; max_point: number; refresh_time: number } | null;
}

export interface RawShiyuBrief {
  score: number;
  rating: string; // "S" | "A" | "B" | ...
  max_score: number;
}

export interface RawShiyuInfo {
  hadal_ver: "v1" | "v2";
  hadal_info_v1?: { brief?: RawShiyuBrief };
  hadal_info_v2?: { brief: RawShiyuBrief; hadal_end_time: RawZzzTime };
}

export interface RawZzzTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export interface RawDeadlyAssault {
  total_score: number;
  total_star: number;
  end_time: RawZzzTime;
  has_data: boolean;
}

// ---- Fetchers ----

export function getZzzNote() {
  return hoyolabRequest<RawZzzNote>(`${BASE}/note`, { params: role() });
}

export function getShiyuDefense() {
  return hoyolabRequest<RawShiyuInfo>(`${BASE}/hadal_info_v2`, {
    params: { ...role(), schedule_type: 1 },
  });
}

export function getDeadlyAssault() {
  return hoyolabRequest<RawDeadlyAssault>(`${BASE}/hadal_mem_detail_v2`, {
    params: { ...uidRegion(), schedule_type: 1 },
  });
}
