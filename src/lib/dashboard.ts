import {
  getGenshinDailyNote,
  getGenshinEventCalendar,
  getGenshinImaginariumTheater,
  getGenshinSpiralAbyss,
  getGenshinStygianOnslaught,
} from "./hoyolab/genshin";
import {
  getAnomalyArbitration,
  getApocalypticShadow,
  getForgottenHall,
  getPureFiction,
  getStarRailNote,
} from "./hoyolab/starrail";
import { getDeadlyAssault, getShiyuDefense, getZzzNote } from "./hoyolab/zzz";
import { getGameRecordCard, type RawGameRecordCardEntry } from "./hoyolab/card";
import { getWuwaRoleData } from "./kurobbs/wuwa";
import { getEndfieldData } from "./skport/endfield";
import { secondsUntil } from "./format";
import type {
  DashboardResponse,
  DashboardSection,
  ErrorMetric,
  GameProfile,
  Metric,
  MetricIcon,
  MetricStatus,
} from "./metrics";

/** A downloaded icon served from public/icons/. */
function icon(file: string, alt: string): MetricIcon {
  return { kind: "image", src: `/icons/${file}`, alt };
}

function profileFor(uid: string | undefined, entries: RawGameRecordCardEntry[]): GameProfile | null {
  const entry = entries.find((e) => e.game_role_id === uid);
  if (!entry) return null;
  return { nickname: entry.nickname, level: entry.level, server: entry.region_name };
}

function statusFromEquality(current: number, target: number): MetricStatus {
  return current === target ? "good" : "warning";
}

/** A settled value if the fetch succeeded, otherwise null (caller emits an ErrorMetric). */
function ok<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}

function reasonMessage(result: PromiseSettledResult<unknown>): string {
  if (result.status !== "rejected") return "Unavailable";
  const { reason } = result;
  return reason instanceof Error ? reason.message : String(reason);
}

function errorMetric(id: string, label: string, result: PromiseSettledResult<unknown>): ErrorMetric {
  return { variant: "error", id, label, message: reasonMessage(result) };
}

// ---------------------------------------------------------------------------
// Genshin Impact
// ---------------------------------------------------------------------------

async function buildGenshinSection(profile: GameProfile | null): Promise<DashboardSection> {
  const [noteR, abyssR, theaterR, stygianR, calendarR] = await Promise.allSettled([
    getGenshinDailyNote(),
    getGenshinSpiralAbyss(),
    getGenshinImaginariumTheater(),
    getGenshinStygianOnslaught(),
    getGenshinEventCalendar(),
  ]);

  const metrics: Metric[] = [];
  const note = ok(noteR);
  const abyss = ok(abyssR);
  const theater = ok(theaterR);
  const stygian = ok(stygianR);
  const calendar = ok(calendarR);

  if (note) {
    metrics.push({
      id: "commissions",
      label: "Daily commissions",
      variant: "fraction",
      current: note.finished_task_num,
      max: note.total_task_num,
      status: statusFromEquality(note.finished_task_num, note.total_task_num),
      icon: icon("genshin-commission.webp", "Daily commission"),
    });

    metrics.push({
      id: "resin",
      label: "Original resin",
      variant: "progress",
      current: note.current_resin,
      max: note.max_resin,
      status: note.current_resin < note.max_resin ? "good" : "warning",
      icon: icon("genshin-resin.webp", "Original resin"),
      ...(note.current_resin < note.max_resin
        ? { countdownSeconds: Number(note.resin_recovery_time), countdownLabel: "until full" }
        : {}),
    });

    metrics.push({
      id: "realm-currency",
      label: "Jar of riches (realm currency)",
      variant: "progress",
      current: note.current_home_coin,
      max: note.max_home_coin,
      status: note.current_home_coin < note.max_home_coin ? "good" : "warning",
      icon: icon("genshin-realm-currency.webp", "Jar of riches"),
      ...(note.current_home_coin < note.max_home_coin
        ? { countdownSeconds: Number(note.home_coin_recovery_time), countdownLabel: "until full" }
        : {}),
    });

    metrics.push({
      id: "enemies-of-note",
      label: "Enemies of note (trounce discounts left)",
      variant: "fraction",
      current: note.remain_resin_discount_num,
      max: note.resin_discount_num_limit,
      status: note.remain_resin_discount_num === 0 ? "good" : "warning",
      icon: icon("genshin-enemies-of-note.webp", "Enemies of note"),
    });

    const t = note.transformer;
    if (!t.obtained) {
      metrics.push({
        id: "transformer",
        label: "Parametric transformer",
        variant: "error",
        message: "Not yet obtained.",
        icon: icon("genshin-transformer.webp", "Parametric transformer"),
      });
    } else {
      const ready =
        t.recovery_time.Day === 0 && t.recovery_time.Hour === 0 && t.recovery_time.Minute === 0 && t.recovery_time.Second === 0;
      metrics.push({
        id: "transformer",
        label: "Parametric transformer",
        variant: "countdown",
        ready,
        icon: icon("genshin-transformer.webp", "Parametric transformer"),
        countdownLabel: ready ? undefined : "until ready",
        countdownSeconds: ready
          ? undefined
          : t.recovery_time.Day * 86400 + t.recovery_time.Hour * 3600 + t.recovery_time.Minute * 60 + t.recovery_time.Second,
      });
    }
  } else {
    metrics.push(
      errorMetric("commissions", "Daily commissions", noteR),
      errorMetric("resin", "Original resin", noteR),
      errorMetric("realm-currency", "Jar of riches (realm currency)", noteR),
      errorMetric("enemies-of-note", "Enemies of note", noteR),
      errorMetric("transformer", "Parametric transformer", noteR),
    );
  }

  if (abyss) {
    metrics.push({
      id: "spiral-abyss",
      label: "Spiral Abyss",
      variant: "stars",
      current: abyss.total_star,
      max: 36,
      status: statusFromEquality(abyss.total_star, 36),
      icon: icon("genshin-spiral-abyss-badge.webp", "Spiral Abyss"),
      valueIcon: icon("genshin-spiral-abyss-star.png", "Spiral Abyss star"),
      countdownSeconds: secondsUntil(secondsToParts(Number(abyss.end_time))),
      countdownLabel: "until reset",
    });
  } else {
    metrics.push(errorMetric("spiral-abyss", "Spiral Abyss", abyssR));
  }

  if (theater) {
    const current = theater.data[0];
    if (current) {
      // "medal_num" tracks something else (it can sit below the true clear count) —
      // the actual star challenge stellas are the 12 (2 per act x 6 acts) entries in
      // get_medal_round_list, 1 where that stella was obtained.
      const stellas = current.stat.get_medal_round_list;
      const stellaCount = stellas.filter((v) => v === 1).length;
      metrics.push({
        id: "imaginarium-theater",
        label: "Imaginarium Theater",
        variant: "stars",
        current: stellaCount,
        max: stellas.length || 12,
        status: statusFromEquality(stellaCount, stellas.length || 12),
        icon: icon("genshin-imaginarium-theater-badge.webp", "Imaginarium Theater"),
        valueIcon: icon("genshin-imaginarium-theater-star.png", "Imaginarium Theater star"),
        countdownSeconds: secondsUntil(secondsToParts(Number(current.schedule.end_time))),
        countdownLabel: "until reset",
      });
    } else {
      metrics.push(errorMetric("imaginarium-theater", "Imaginarium Theater", theaterR));
    }
  } else {
    metrics.push(errorMetric("imaginarium-theater", "Imaginarium Theater", theaterR));
  }

  if (stygian) {
    const current = stygian.data[0];
    const best = current?.single.best ?? null;
    metrics.push({
      id: "stygian-onslaught",
      label: "Stygian Onslaught",
      variant: "stygian",
      difficulty: best?.difficulty ?? 0,
      seconds: best?.second ?? 0,
      status: (best?.difficulty ?? 0) === 5 ? "good" : "warning",
      icon: icon("genshin-stygian-onslaught-badge.webp", "Stygian Onslaught"),
      valueIcon: icon("genshin-stygian-difficulty.webp", "Stygian Onslaught difficulty"),
      ...(current
        ? { countdownSeconds: secondsUntil(secondsToParts(Number(current.schedule.end_time))), countdownLabel: "until reset" }
        : {}),
    });
  } else {
    metrics.push(errorMetric("stygian-onslaught", "Stygian Onslaught", stygianR));
  }

  if (calendar) {
    const event = calendar.act_list.find((e) => e.hard_challenge_detail?.sub);
    const sub = event?.hard_challenge_detail?.sub;
    if (sub) {
      metrics.push({
        id: "disturbance-outbreak",
        label: "Disturbance outbreak (Dire Prestige)",
        variant: "fraction",
        current: sub.x,
        max: sub.y,
        status: statusFromEquality(sub.x, sub.y),
        icon: icon("genshin-disturbance-outbreak-badge.webp", "Disturbance outbreak"),
        valueIcon: icon("genshin-disturbance-outbreak.png", "Dire Prestige"),
        countdownSeconds: sub.seconds,
        countdownLabel: "until outbreak ends",
      });
    } else {
      metrics.push({
        id: "disturbance-outbreak",
        label: "Disturbance outbreak (Dire Prestige)",
        variant: "error",
        message: "No active Stygian Onslaught outbreak window.",
      });
    }
  } else {
    metrics.push(errorMetric("disturbance-outbreak", "Disturbance outbreak (Dire Prestige)", calendarR));
  }

  return { game: "genshin", title: "Genshin Impact", accent: "genshin", profile, metrics };
}

function secondsToParts(unixSeconds: number): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const d = new Date(unixSeconds * 1000);
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
    second: d.getSeconds(),
  };
}

// ---------------------------------------------------------------------------
// Honkai: Star Rail
// ---------------------------------------------------------------------------

async function buildHsrSection(profile: GameProfile | null): Promise<DashboardSection> {
  const [noteR, forgottenHallR, pureFictionR, apocShadowR, anomalyR] = await Promise.allSettled([
    getStarRailNote(),
    getForgottenHall(),
    getPureFiction(),
    getApocalypticShadow(),
    getAnomalyArbitration(),
  ]);

  const metrics: Metric[] = [];
  const note = ok(noteR);

  if (note) {
    metrics.push({
      id: "daily-training",
      label: "Daily training",
      variant: "fraction",
      current: note.current_train_score,
      max: note.max_train_score,
      status: statusFromEquality(note.current_train_score, note.max_train_score),
      icon: icon("hsr-daily-training.webp", "Daily training"),
    });

    metrics.push({
      id: "trailblaze-power",
      label: "Trailblaze power",
      variant: "progress",
      current: note.current_stamina,
      max: note.max_stamina,
      status: note.current_stamina < note.max_stamina ? "good" : "warning",
      icon: icon("hsr-trailblaze-power.webp", "Trailblaze power"),
    });

    metrics.push({
      id: "echo-of-war",
      label: "Echo of War (weekly discounts left)",
      variant: "fraction",
      current: note.weekly_cocoon_cnt,
      max: note.weekly_cocoon_limit,
      status: note.weekly_cocoon_cnt === 0 ? "good" : "warning",
      icon: icon("hsr-echo-of-war.webp", "Echo of War"),
    });

    metrics.push({
      id: "simulated-universe",
      label: "Simulated Universe",
      variant: "fraction",
      current: note.current_rogue_score,
      max: note.max_rogue_score,
      status: statusFromEquality(note.current_rogue_score, note.max_rogue_score),
      icon: icon("hsr-simulated-universe.webp", "Simulated Universe"),
    });
  } else {
    metrics.push(
      errorMetric("daily-training", "Daily training", noteR),
      errorMetric("trailblaze-power", "Trailblaze power", noteR),
      errorMetric("echo-of-war", "Echo of War", noteR),
      errorMetric("simulated-universe", "Simulated Universe", noteR),
    );
  }

  pushHsrChallenge(metrics, "forgotten-hall", "Forgotten Hall", ok(forgottenHallR), forgottenHallR, 36, "hsr-forgotten-hall-badge.webp");
  pushHsrChallenge(metrics, "pure-fiction", "Pure Fiction", ok(pureFictionR), pureFictionR, 12, "hsr-pure-fiction-badge.webp");
  pushHsrChallenge(metrics, "apocalyptic-shadow", "Apocalyptic Shadow", ok(apocShadowR), apocShadowR, 12, "hsr-apocalyptic-shadow-badge.webp");

  const anomaly = ok(anomalyR);
  if (anomaly && anomaly.challenge_peak_records.length > 0) {
    const current = anomaly.challenge_peak_records.reduce((latest, r) =>
      new Date(r.group.end_time.year, r.group.end_time.month - 1, r.group.end_time.day).getTime() >
      new Date(latest.group.end_time.year, latest.group.end_time.month - 1, latest.group.end_time.day).getTime()
        ? r
        : latest,
    );
    const countdown = secondsUntil(secondsFromDateOnly(current.group.end_time));

    metrics.push({
      id: "anomaly-arbitration-knight",
      label: "Anomaly Arbitration — Knight stage",
      variant: "stars",
      current: current.mob_stars,
      max: 9,
      status: current.mob_stars !== 0 ? "good" : "warning",
      icon: icon("hsr-anomaly-knight-badge.webp", "Anomaly Arbitration Knight stage"),
      valueIcon: icon("hsr-star-shared.png", "Knight stage star"),
      countdownSeconds: countdown,
      countdownLabel: "until reset",
    });

    metrics.push({
      id: "anomaly-arbitration-king",
      label: "Anomaly Arbitration — King in Check",
      variant: "stars",
      current: current.boss_stars,
      max: 3,
      status: current.boss_stars === 1 ? "good" : "warning",
      icon: icon("hsr-anomaly-king-badge.webp", "Anomaly Arbitration King in Check"),
      valueIcon: icon("hsr-anomaly-king-star.png", "King in Check star"),
      countdownSeconds: countdown,
      countdownLabel: "until reset",
    });
  } else {
    metrics.push(
      errorMetric("anomaly-arbitration-knight", "Anomaly Arbitration — Knight stage", anomalyR),
      errorMetric("anomaly-arbitration-king", "Anomaly Arbitration — King in Check", anomalyR),
    );
  }

  return { game: "hsr", title: "Honkai: Star Rail", accent: "hsr", profile, metrics };
}

function secondsFromDateOnly(t: { year: number; month: number; day: number; hour?: number; minute?: number }): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  return { year: t.year, month: t.month, day: t.day, hour: t.hour ?? 4, minute: t.minute ?? 0, second: 0 };
}

function pushHsrChallenge(
  metrics: Metric[],
  id: string,
  label: string,
  data: { star_num: number; groups: { status: string; end_time: { year: number; month: number; day: number; hour: number; minute: number } }[] } | null,
  result: PromiseSettledResult<unknown>,
  max: number,
  badgeFile: string,
) {
  if (!data) {
    metrics.push(errorMetric(id, label, result));
    return;
  }
  const runningGroup = data.groups.find((g) => g.status === "Running") ?? data.groups[0];
  metrics.push({
    id,
    label,
    variant: "stars",
    current: data.star_num,
    max,
    status: statusFromEquality(data.star_num, max),
    icon: icon(badgeFile, label),
    valueIcon: icon("hsr-star-shared.png", `${label} star`),
    ...(runningGroup ? { countdownSeconds: secondsUntil(secondsFromDateOnly(runningGroup.end_time)), countdownLabel: "until reset" } : {}),
  });
}

// ---------------------------------------------------------------------------
// Zenless Zone Zero
// ---------------------------------------------------------------------------

async function buildZzzSection(profile: GameProfile | null): Promise<DashboardSection> {
  const [noteR, shiyuR, assaultR] = await Promise.allSettled([
    getZzzNote(),
    getShiyuDefense(),
    getDeadlyAssault(),
  ]);

  const metrics: Metric[] = [];
  const note = ok(noteR);

  if (note) {
    metrics.push({
      id: "engagement",
      label: "Daily engagement",
      variant: "fraction",
      current: note.vitality.current,
      max: note.vitality.max,
      status: statusFromEquality(note.vitality.current, note.vitality.max),
      icon: icon("zzz-engagement.webp", "Daily engagement"),
    });

    metrics.push({
      id: "battery",
      label: "Battery energy",
      variant: "progress",
      current: note.energy.progress.current,
      max: note.energy.progress.max,
      status: note.energy.progress.current < note.energy.progress.max ? "good" : "warning",
      icon: icon("zzz-battery.webp", "Battery energy"),
      ...(note.energy.progress.current < note.energy.progress.max
        ? { countdownSeconds: note.energy.restore, countdownLabel: "until full" }
        : {}),
    });

    if (note.bounty_commission) {
      metrics.push({
        id: "bounty-commission",
        label: "Bounty commission",
        variant: "fraction",
        current: note.bounty_commission.num,
        max: note.bounty_commission.total,
        status: statusFromEquality(note.bounty_commission.num, note.bounty_commission.total),
        icon: icon("zzz-bounty-commission.png", "Bounty commission"),
      });
    } else {
      metrics.push({ id: "bounty-commission", label: "Bounty commission", variant: "error", message: "Not unlocked yet." });
    }

    if (note.weekly_task) {
      metrics.push({
        id: "ridu-weekly",
        label: "New Eridu weekly point",
        variant: "fraction",
        current: note.weekly_task.cur_point,
        max: note.weekly_task.max_point,
        status: note.weekly_task.cur_point >= 1700 ? "good" : "warning",
        icon: icon("zzz-ridu-weekly.webp", "New Eridu weekly point"),
      });
    } else {
      metrics.push({ id: "ridu-weekly", label: "New Eridu weekly point", variant: "error", message: "Not unlocked yet." });
    }
  } else {
    metrics.push(
      errorMetric("engagement", "Daily engagement", noteR),
      errorMetric("battery", "Battery energy", noteR),
      errorMetric("bounty-commission", "Bounty commission", noteR),
      errorMetric("ridu-weekly", "New Eridu weekly point", noteR),
    );
  }

  const shiyu = ok(shiyuR);
  if (shiyu) {
    const brief = shiyu.hadal_ver === "v2" ? shiyu.hadal_info_v2?.brief : shiyu.hadal_info_v1?.brief;
    const endTime = shiyu.hadal_ver === "v2" ? shiyu.hadal_info_v2?.hadal_end_time : undefined;
    metrics.push({
      id: "shiyu-defense",
      label: "Shiyu Defense",
      variant: "rank-score",
      score: brief?.score ?? 0,
      maxScore: brief?.max_score ?? 0,
      rank: brief?.rating || "None",
      status: brief?.rating === "S" ? "good" : "warning",
      icon: icon("zzz-shiyu-defense.png", "Shiyu Defense rank"),
      ...(endTime ? { countdownSeconds: secondsUntil(endTime), countdownLabel: "until reset" } : {}),
    });
  } else {
    metrics.push(errorMetric("shiyu-defense", "Shiyu Defense", shiyuR));
  }

  const assault = ok(assaultR);
  if (assault && assault.has_data) {
    metrics.push({
      id: "deadly-assault",
      label: "Deadly Assault",
      variant: "star-score",
      current: assault.total_star,
      max: 9,
      score: assault.total_score,
      status: assault.total_star >= 6 ? "good" : "warning",
      icon: icon("zzz-deadly-assault-star.png", "Deadly Assault star"),
      countdownSeconds: secondsUntil(assault.end_time),
      countdownLabel: "until reset",
    });
  } else {
    metrics.push(
      assault
        ? { id: "deadly-assault", label: "Deadly Assault", variant: "error", message: "No data for this cycle yet." }
        : errorMetric("deadly-assault", "Deadly Assault", assaultR),
    );
  }

  return { game: "zzz", title: "Zenless Zone Zero", accent: "zzz", profile, metrics };
}

// ---------------------------------------------------------------------------
// Wuthering Waves
// ---------------------------------------------------------------------------

async function buildWuwaSection(): Promise<DashboardSection> {
  const metrics: Metric[] = [];
  let profile: GameProfile | null = null;

  try {
    const { base, region } = await getWuwaRoleData();
    profile = { nickname: base.Name, level: base.Level, server: region };

    metrics.push({
      id: "waveplates",
      label: "Waveplates",
      variant: "progress",
      current: base.Energy,
      max: base.MaxEnergy,
      status: base.Energy < base.MaxEnergy ? "good" : "warning",
      icon: { kind: "glyph", name: "waveplate" },
      ...(base.Energy < base.MaxEnergy
        ? { countdownSeconds: secondsUntilMs(base.EnergyRecoverTime), countdownLabel: "until full" }
        : {}),
    });

    metrics.push({
      id: "reserve-energy",
      label: "Reserve energy",
      variant: "progress",
      current: base.StoreEnergy,
      max: base.MaxStoreEnergy,
      status: base.StoreEnergy < base.MaxStoreEnergy ? "good" : "warning",
      icon: { kind: "glyph", name: "reserve-energy" },
      ...(base.StoreEnergy < base.MaxStoreEnergy && base.StoreEnergyRecoverTime > 0
        ? { countdownSeconds: secondsUntilMs(base.StoreEnergyRecoverTime), countdownLabel: "until full" }
        : {}),
    });

    metrics.push({
      id: "daily-activity",
      label: "Daily activity",
      variant: "fraction",
      current: base.Liveness,
      max: base.LivenessMaxCount,
      status: statusFromEquality(base.Liveness, base.LivenessMaxCount),
      icon: { kind: "glyph", name: "activity" },
    });

    // The player-role endpoint only reports how many weekly challenges are
    // left, not the cap — 3 is Wuthering Waves' known, stable weekly Tacet
    // Field discount limit (same role as Genshin's Echo of War), not a value
    // the API itself confirms.
    const weeklyMax = 3;
    metrics.push({
      id: "weekly-challenge",
      label: "Weekly challenges left",
      variant: "fraction",
      current: base.WeeklyInstCount,
      max: weeklyMax,
      status: base.WeeklyInstCount === 0 ? "good" : "warning",
      icon: { kind: "glyph", name: "weekly-challenge" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    metrics.push(
      { id: "waveplates", label: "Waveplates", variant: "error", message },
      { id: "reserve-energy", label: "Reserve energy", variant: "error", message },
      { id: "daily-activity", label: "Daily activity", variant: "error", message },
      { id: "weekly-challenge", label: "Weekly challenges left", variant: "error", message },
    );
  }

  return { game: "wuwa", title: "Wuthering Waves", accent: "wuwa", profile, metrics };
}

/** Wuthering Waves' launcher API returns unix-millisecond timestamps, not seconds. */
function secondsUntilMs(unixMs: number): number {
  return Math.max(0, Math.round((unixMs - Date.now()) / 1000));
}

// ---------------------------------------------------------------------------
// Arknights: Endfield
// ---------------------------------------------------------------------------

async function buildEndfieldSection(): Promise<DashboardSection> {
  const metrics: Metric[] = [];
  let profile: GameProfile | null = null;

  try {
    const data = await getEndfieldData();
    profile = data.profile;

    metrics.push({
      id: "sanity",
      label: "Sanity",
      variant: "progress",
      current: data.sanity.current,
      max: data.sanity.max,
      status: data.sanity.current < data.sanity.max ? "good" : "warning",
      icon: { kind: "glyph", name: "sanity" },
      ...(data.sanity.current < data.sanity.max
        ? { countdownSeconds: secondsUntilMs(data.sanity.fullAtMs), countdownLabel: "until full" }
        : {}),
    });

    metrics.push({
      id: "daily-mission",
      label: "Daily mission",
      variant: "fraction",
      current: data.dailyMission.current,
      max: data.dailyMission.max,
      status: statusFromEquality(data.dailyMission.current, data.dailyMission.max),
      icon: { kind: "glyph", name: "daily-mission" },
    });

    if (data.weeklyMission) {
      metrics.push({
        id: "weekly-mission",
        label: "Weekly mission",
        variant: "fraction",
        current: data.weeklyMission.current,
        max: data.weeklyMission.max,
        status: statusFromEquality(data.weeklyMission.current, data.weeklyMission.max),
        icon: { kind: "glyph", name: "weekly-mission" },
      });
    } else {
      metrics.push({ id: "weekly-mission", label: "Weekly mission", variant: "error", message: "Not unlocked yet." });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    metrics.push(
      { id: "sanity", label: "Sanity", variant: "error", message },
      { id: "daily-mission", label: "Daily mission", variant: "error", message },
      { id: "weekly-mission", label: "Weekly mission", variant: "error", message },
    );
  }

  return { game: "endfield", title: "Arknights: Endfield", accent: "endfield", profile, metrics };
}

// ---------------------------------------------------------------------------

export async function buildDashboard(): Promise<DashboardResponse> {
  let entries: RawGameRecordCardEntry[] = [];
  try {
    entries = (await getGameRecordCard()).list;
  } catch {
    // Profile headers are cosmetic — fall through with no profile info rather
    // than failing the whole dashboard over a single non-critical call.
  }

  const [genshin, hsr, zzz, wuwa, endfield] = await Promise.all([
    buildGenshinSection(profileFor(process.env.GENSHIN_UID, entries)),
    buildHsrSection(profileFor(process.env.HSR_UID, entries)),
    buildZzzSection(profileFor(process.env.ZZZ_UID, entries)),
    buildWuwaSection(),
    buildEndfieldSection(),
  ]);
  return { generatedAt: new Date().toISOString(), sections: [genshin, hsr, zzz, wuwa, endfield] };
}
