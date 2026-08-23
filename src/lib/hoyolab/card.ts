import { hoyolabRequest } from "./client";

const BASE = "https://bbs-api-os.hoyolab.com/game_record/card/wapi";

export interface RawGameRecordCardEntry {
  game_role_id: string;
  nickname: string;
  level: number;
  region_name: string;
}

export interface RawGameRecordCard {
  list: RawGameRecordCardEntry[];
}

/** One call that returns nickname/level/server for every HoYoverse game linked to this account. */
export function getGameRecordCard() {
  const ltuid = process.env.HOYOLAB_LTUID;
  if (!ltuid) throw new Error("Missing required environment variable HOYOLAB_LTUID");
  return hoyolabRequest<RawGameRecordCard>(`${BASE}/getGameRecordCard`, { params: { uid: ltuid } });
}
