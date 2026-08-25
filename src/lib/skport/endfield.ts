import { generateSkportSign, SKPORT_PLATFORM, SKPORT_V_NAME } from "./crypto";

/**
 * SKPORT / Gryphline account API — Arknights: Endfield's equivalent of
 * HoYoLAB. Reverse-engineered by the community; endpoint shapes and the
 * signing scheme confirmed against `yeci226/endfield-discord-bot`'s actual
 * working source, then live-verified end-to-end against a real account
 * before writing any dashboard-facing code (see README's "Arknights:
 * Endfield" section).
 *
 * Unlike Wuthering Waves, this doesn't automate any login step at all —
 * not even a cookie-derived OAuth exchange. Gryphline's password endpoint
 * is Geetest captcha-gated (the reference bot's login function takes an
 * optional captcha payload and inspects an `x-rpc-aigis` response header),
 * so a server can't drive it. The reference bot's own OAuth-grant chain
 * (ACCOUNT_TOKEN -> code -> cred) turned out to be unnecessary here too —
 * live testing found that `cred` itself is already sitting in the
 * `SK_OAUTH_CRED_KEY` browser cookie once you're logged into skport.com,
 * so `SKPORT_CRED` is that cookie's value, copied once, and this file only
 * ever does the one cheap step downstream of it: refreshing `salt`. There
 * is no path in this file that resembles a login at all.
 *
 * The trade-off: unlike a real login chain, there's no way to *mint* a new
 * `cred` from here if the browser-issued one ever expires or gets rotated
 * — see `refreshSession()`. If that happens, the fix is a human one
 * (grab a fresh cookie value), not a code one, and the error message says
 * so.
 */

const REFRESH_SALT_URL = "https://zonai.skport.com/web/v1/auth/refresh";
const PLAYER_BINDING_URL = "https://zonai.skport.com/api/v1/game/player/binding";
const CARD_DETAIL_URL = "https://zonai.skport.com/api/v1/game/endfield/card/detail";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. Copy .env.example to .env.local and fill it in.`);
  }
  return value;
}

class SkportApiError extends Error {
  constructor(endpoint: string, code: unknown, message: unknown) {
    super(`[${endpoint}] SKPORT API error ${code}: ${message}`);
  }
}

/** `code: 10000` specifically means "cred/salt is stale" — distinct from any other API error so the
 * caller can refresh-and-retry exactly once instead of treating every failure as a session problem. */
class SkportStaleSessionError extends Error {
  constructor(endpoint: string, message: unknown) {
    super(`[${endpoint}] SKPORT session stale: ${message}`);
  }
}

interface SkportSession {
  cred: string;
  salt: string;
}

/** Every zonai.skport.com endpoint: V2-signed, reports errors via `code`. */
async function skportRequest<T>(
  method: "GET" | "POST",
  url: string,
  endpoint: string,
  session: SkportSession,
  options: { params?: Record<string, string>; body?: Record<string, unknown>; gameRole?: string } = {},
): Promise<T> {
  const target = new URL(url);
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) target.searchParams.set(key, value);
  }
  const query = target.searchParams.toString();
  const bodyString = options.body ? JSON.stringify(options.body) : "";
  const signBody = method === "GET" ? query : bodyString;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const sign = generateSkportSign(target.pathname, signBody, timestamp, session.salt);

  const headers: Record<string, string> = {
    cred: session.cred,
    platform: SKPORT_PLATFORM,
    timestamp,
    sign,
    vname: SKPORT_V_NAME,
    "sk-language": "en_US",
    Origin: "https://game.skport.com",
    Referer: "https://game.skport.com/",
    "User-Agent": USER_AGENT,
  };
  if (options.gameRole) headers["sk-game-role"] = options.gameRole;
  if (method === "POST") headers["Content-Type"] = "application/json";

  const res = await fetch(target.toString(), {
    method,
    headers,
    body: method === "POST" ? bodyString || "{}" : undefined,
    cache: "no-store",
  });
  // A stale cred/salt surfaces as HTTP 401 with a JSON body on this API, not just a bare rejection.
  if (!res.ok && res.status !== 401) throw new Error(`HTTP ${res.status} fetching ${endpoint}`);

  const json = (await res.json().catch(() => ({}))) as { code?: number; message?: string } & Record<string, unknown>;

  // A bare 401 means "stale" here regardless of whether the body carries an explicit
  // `code: 10000` — the reference client treats any 401 as that signal even when the
  // body doesn't say so explicitly, and an untyped 401 falling through unhandled would
  // otherwise get returned to the caller as if it were valid data.
  if (res.status === 401 || json.code === 10000) {
    throw new SkportStaleSessionError(endpoint, json.message ?? "HTTP 401");
  }
  if (json.code !== undefined && json.code !== 0) throw new SkportApiError(endpoint, json.code, json.message);

  return json as T;
}

async function refreshSalt(cred: string, previousSalt: string): Promise<string> {
  const result = await skportRequest<{ data: { token: string } }>(
    "GET",
    REFRESH_SALT_URL,
    "refreshSalt",
    { cred, salt: previousSalt },
    { params: { platform: SKPORT_PLATFORM } },
  );
  return result.data.token;
}

interface BoundRole {
  roleId: string;
  serverId: string;
  serverName: string;
  gameRole: string;
}

async function getPlayerBinding(cred: string, salt: string): Promise<BoundRole> {
  interface RawBinding {
    data: {
      list: {
        appCode: string;
        bindingList: {
          defaultRole?: { roleId: string; serverId: string; serverName: string };
        }[];
      }[];
    };
  }

  const result = await skportRequest<RawBinding>("GET", PLAYER_BINDING_URL, "getPlayerBinding", { cred, salt });
  const endfield = result.data.list.find((g) => g.appCode === "endfield");
  const role = endfield?.bindingList?.[0]?.defaultRole;
  if (!role) throw new Error("No Arknights: Endfield character bound to this SKPORT account.");

  return { roleId: role.roleId, serverId: role.serverId, serverName: role.serverName, gameRole: `3_${role.roleId}_${role.serverId}` };
}

// ---- Session caching (see file header — this is the account-safety-critical part) ----

interface CachedSession extends SkportSession, BoundRole {
  expiresAt: number; // ms epoch
}

// 3 days — matches WuWa's typically-observed real-world session lifetime (see wuwa.ts).
// Safe to keep long: this is only the *proactive* refresh threshold, not the only thing
// protecting correctness — a salt going bad mid-window is still caught reactively via the
// `code: 10000` handling in skportRequest()/getEndfieldData() and self-heals on the next call.
const SESSION_TTL_MS = 3 * 24 * 60 * 60 * 1000;

let cachedSession: CachedSession | null = null;
let bootstrapCount = 0;
// Guards against two nearly-simultaneous dashboard polls (two open tabs, a manual
// Refresh landing next to the scheduled one) both seeing a cold/expired session and
// each kicking off their own bootstrap — without this, a single race window could
// fire twice as many auth requests as intended. Concurrent callers await the same
// in-flight promise instead of starting a second one.
let bootstrapPromise: Promise<CachedSession> | null = null;

async function bootstrap(): Promise<CachedSession> {
  const cred = requireEnv("SKPORT_CRED");
  bootstrapCount++;
  console.log(
    `[skport] Establishing a new SKPORT session (#${bootstrapCount} this process, ${new Date().toISOString()}). ` +
      `This should be rare — if you see this more than a few times a day, something's wrong.`,
  );

  const salt = await refreshSalt(cred, "");
  const role = await getPlayerBinding(cred, salt);
  const expiresAt = Date.now() + SESSION_TTL_MS;
  console.log(`[skport] Session ready, cached until ${new Date(expiresAt).toISOString()}.`);
  return { cred, salt, ...role, expiresAt };
}

async function getSession(): Promise<CachedSession> {
  if (cachedSession && Date.now() < cachedSession.expiresAt) return cachedSession;
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap()
      .then((session) => (cachedSession = session))
      .finally(() => (bootstrapPromise = null));
  }
  return bootstrapPromise;
}

/** Re-derives just the salt from the existing `cred`. Unlike WuWa/HoYoLAB, there's no fallback
 * path to mint a brand-new `cred` from here (see file header) — if this also fails, the `cred`
 * itself is dead and needs a human to grab a fresh cookie value. Same singleflight guard as
 * `getSession()` above, for the same reason. */
let refreshPromise: Promise<CachedSession> | null = null;

async function refreshSession(stale: CachedSession): Promise<CachedSession> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const salt = await refreshSalt(stale.cred, stale.salt);
        const refreshed: CachedSession = { ...stale, salt, expiresAt: Date.now() + SESSION_TTL_MS };
        cachedSession = refreshed;
        console.log(`[skport] Session salt refreshed, cached until ${new Date(refreshed.expiresAt).toISOString()}.`);
        return refreshed;
      } catch {
        cachedSession = null;
        throw new Error(
          "SKPORT_CRED appears to be invalid or expired. Log into skport.com again, copy a fresh " +
            "SK_OAUTH_CRED_KEY cookie value, and update it in .env.local (see .env.example).",
        );
      }
    })().finally(() => (refreshPromise = null));
  }
  return refreshPromise;
}

// ---- Public data fetch ----

export interface EndfieldData {
  profile: { nickname: string; level: number; server: string };
  sanity: { current: number; max: number; fullAtMs: number };
  dailyMission: { current: number; max: number };
  weeklyMission: { current: number; max: number } | null;
}

/** `maxTs` is unix seconds — confirmed live against a real account (a raw value like
 * `1787690622` only makes sense a few hours from "now" as seconds; as milliseconds it lands in
 * 1970). Kept as a magnitude check rather than a bare `* 1000` in case that ever changes. */
function normalizeTimestampToMs(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n > 1e12 ? n : n * 1000;
}

interface RawCardDetail {
  data: {
    detail: {
      base: { name: string; level: number; worldLevel: number; serverName: string };
      dungeon: { curStamina: string | number; maxStamina: string | number; maxTs: string | number };
      dailyMission: { dailyActivation: number; maxDailyActivation: number };
      weeklyMission?: { score: number; total: number };
    };
  };
}

async function getCardDetail(session: CachedSession) {
  const result = await skportRequest<RawCardDetail>("GET", CARD_DETAIL_URL, "getCardDetail", session, {
    params: { roleId: session.roleId, serverId: session.serverId },
    gameRole: session.gameRole,
  });
  return result.data.detail;
}

async function fetchAll(session: CachedSession): Promise<EndfieldData> {
  const detail = await getCardDetail(session);

  return {
    profile: { nickname: detail.base.name, level: detail.base.level, server: detail.base.serverName },
    sanity: {
      current: Number(detail.dungeon.curStamina),
      max: Number(detail.dungeon.maxStamina),
      fullAtMs: normalizeTimestampToMs(detail.dungeon.maxTs),
    },
    dailyMission: { current: detail.dailyMission.dailyActivation, max: detail.dailyMission.maxDailyActivation },
    weeklyMission: detail.weeklyMission ? { current: detail.weeklyMission.score, max: detail.weeklyMission.total } : null,
  };
}

/** Fetches the account's default bound Arknights: Endfield character's daily-resource data. */
export async function getEndfieldData(): Promise<EndfieldData> {
  const session = await getSession();
  try {
    return await fetchAll(session);
  } catch (error) {
    if (!(error instanceof SkportStaleSessionError)) throw error;
    const refreshed = await refreshSession(session);
    return fetchAll(refreshed);
  }
}
