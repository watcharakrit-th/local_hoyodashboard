import { encodeMd5Parameter, encodePassword, generateDeviceId } from "./crypto";

/**
 * Kuro Games' Wuthering Waves account API — reverse-engineered by the
 * `Wuthery/kuro.py` community wrapper, ported here rather than depending on
 * the Python package directly. Live-verified end-to-end against a real
 * account (see `kurobbs/README.md`) before writing this.
 *
 * Unlike HoYoLAB, there's no user-supplied long-lived session token — but
 * critically, this file must NOT log in from scratch on every dashboard
 * refresh either: repeatedly submitting the account password from a
 * brand-new random device ID (which the first version of this file did)
 * is exactly the shape of traffic anti-fraud systems flag as credential
 * stuffing. Instead the login chain (game login -> game token -> oauth
 * code -> player info) runs at most a few times a day — see
 * `getSession()` — and every dashboard refresh in between reuses that
 * cached session for the one lightweight read (`getPlayerRole`) it
 * actually needs, from one stable device ID, the way a real client would.
 *
 * This intentionally does NOT use KuroBBS's website widget endpoint (which
 * is richer — it has Tower of Adversity clears — but only reachable via a
 * Chinese-phone-number login) so this account doesn't need one.
 */

const APP_KEY = "32gh5r0p35ullmxrzzwk40ly"; // kuro.py's constants.APP_KEYS[WUWA][OVERSEAS]
const CLIENT_ID = "7rxmydkibzzsf12om5asjnoo";

const GAME_LOGIN_URL = "https://sdkapi.kurogame-service.com/sdkcom/v2/login/emailPwd.lg";
const GAME_TOKEN_URL = "https://sdkapi.kurogame-service.com/sdkcom/v2/auth/getToken.lg";
const OAUTH_CODE_URL = "https://sdkapi.kurogame-service.com/sdkcom/v2/user/oauth/code/generate.lg";
const PLAYER_INFO_URL = "https://pc-launcher-sdk-api.kurogame.net/game/queryPlayerInfo";
const PLAYER_ROLE_URL = "https://pc-launcher-sdk-api.kurogame.net/game/queryRole";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

class KuroApiError extends Error {
  constructor(endpoint: string, code: unknown, message: unknown) {
    super(`[${endpoint}] Kuro API error ${code}: ${message}`);
  }
}

/** The SDK login endpoints (game login/token/oauth-code) take a signed, form-encoded body. */
async function signedFormRequest<T>(
  url: string,
  endpoint: string,
  params: Record<string, unknown>,
  { sign = true }: { sign?: boolean } = {},
): Promise<T> {
  const body = { ...params };
  if (sign) body.sign = encodeMd5Parameter(body, APP_KEY);

  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) form.set(key, String(value));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${endpoint}`);

  const json = (await res.json()) as { codes?: number | null; msg?: string } & Record<string, unknown>;
  // Mirrors kuro.py: `codes not in {0, None}` — null/undefined codes is fine, only a real non-zero code is an error.
  if (json.codes != null && json.codes !== 0) {
    throw new KuroApiError(endpoint, json.codes, json.msg);
  }
  return json as T;
}

/** The launcher player-info/role endpoints take a plain JSON body, and use a `code` field instead of `codes`. */
async function jsonRequest<T>(
  url: string,
  endpoint: string,
  body: Record<string, unknown>,
  { retries = 3 }: { retries?: number } = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${endpoint}`);

    const json = (await res.json()) as { code?: number; message?: string } & Record<string, unknown>;

    // code 1005 means "not ready yet" — the launcher API is occasionally slow
    // to catch up right after a fresh login; a short retry clears it.
    if (json.code === 1005 && attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      continue;
    }
    if (json.code !== undefined && json.code !== 0) {
      throw new KuroApiError(endpoint, json.code, json.message);
    }
    return json as T;
  }
}

// ---- Raw response shapes ----

interface RawGameLoginResult {
  code: string; // authorization code, NOT the widget/community token
}

interface RawGameTokenResult {
  access_token: string;
  expires_in?: number; // seconds, if the server reports one
}

interface RawOauthCodeResult {
  oauthCode: string;
}

interface RawPlayerInfoResult {
  data: Record<string, string>; // region -> JSON-encoded string of { roleId, roleName, level, ... }
}

interface RawPlayerInfo {
  roleId: string;
  roleName: string;
  level: number;
}

interface RawPlayerRoleResult {
  data: Record<string, string>; // region -> JSON-encoded string of { Base: {...}, ... }
}

/** `Base` object inside a player-role response — the actual daily-resource data. */
export interface RawBasicRoleInfo {
  Name: string;
  Level: number;
  WorldLevel: number;
  ActiveDays: number;
  Energy: number;
  MaxEnergy: number;
  EnergyRecoverTime: number; // unix ms
  StoreEnergy: number;
  MaxStoreEnergy: number;
  StoreEnergyRecoverTime: number; // unix ms, 0 when not counting down
  Liveness: number;
  LivenessMaxCount: number;
  WeeklyInstCount: number; // weekly challenges REMAINING (0 = fully done)
}

export interface WuwaRoleData {
  base: RawBasicRoleInfo;
  region: string;
}

// ---- The chain ----

async function gameLogin(email: string, password: string, deviceId: string): Promise<string> {
  const result = await signedFormRequest<RawGameLoginResult>(GAME_LOGIN_URL, "gameLogin", {
    __e__: 1,
    email,
    client_id: CLIENT_ID,
    deviceNum: deviceId,
    password: encodePassword(password),
    platform: "PC",
    productId: "A1730",
    productKey: "5c063821193f41e09f1c4fdd7567dda3",
    projectId: "G153",
    redirect_uri: 1,
    response_type: "code",
    sdkVersion: "2.6.0h",
    channelId: "240",
  });
  return result.code;
}

async function getGameToken(code: string, deviceId: string): Promise<RawGameTokenResult> {
  return signedFormRequest<RawGameTokenResult>(GAME_TOKEN_URL, "getGameToken", {
    client_id: CLIENT_ID,
    deviceNum: deviceId,
    client_secret: APP_KEY,
    code,
    productId: "A1725",
    projectId: "G153",
    redirect_uri: 1,
    grant_type: "authorization_code",
  });
}

async function generateOauthCode(accessToken: string, deviceId: string): Promise<string> {
  // Not signed — matches kuro.py, which omits the `sign` field for this one endpoint.
  const result = await signedFormRequest<RawOauthCodeResult>(
    OAUTH_CODE_URL,
    "generateOauthCode",
    {
      client_id: CLIENT_ID,
      deviceNum: deviceId,
      client_secret: APP_KEY,
      access_token: accessToken,
      productId: "A1725",
      projectId: "G153",
      redirect_uri: 1,
      scope: "launcher",
    },
    { sign: false },
  );
  return result.oauthCode;
}

async function getPlayerInfo(oauthCode: string): Promise<Record<string, RawPlayerInfo>> {
  const result = await jsonRequest<RawPlayerInfoResult>(PLAYER_INFO_URL, "getPlayerInfo", {
    oauthCode,
  });
  const out: Record<string, RawPlayerInfo> = {};
  for (const [region, infoJson] of Object.entries(result.data)) {
    out[region] = JSON.parse(infoJson) as RawPlayerInfo;
  }
  return out;
}

async function getPlayerRole(
  oauthCode: string,
  playerId: string,
  region: string,
): Promise<RawBasicRoleInfo> {
  const result = await jsonRequest<RawPlayerRoleResult>(PLAYER_ROLE_URL, "getPlayerRole", {
    oauthCode,
    playerId,
    region,
  });
  const parsed = JSON.parse(result.data[region]) as { Base: RawBasicRoleInfo };
  return parsed.Base;
}

// ---- Session caching (the account-safety-critical part — see file header) ----

interface WuwaSession {
  oauthCode: string;
  playerId: string;
  region: string;
  expiresAt: number; // ms epoch
}

const DEFAULT_SESSION_TTL_MS = 6 * 60 * 60 * 1000; // re-login at most ~4x/day by default
const MIN_SESSION_TTL_MS = 30 * 60 * 1000; // never trust a server-reported expiry shorter than this

let cachedSession: WuwaSession | null = null;
let processDeviceId: string | null = null;
let loginCount = 0; // how many real logins this process has done — check `pm2 logs` against this

/**
 * A stable device ID for this account. `WUWA_DEVICE_ID` (recommended —
 * see .env.example) keeps it stable across restarts too; without it, this
 * still only generates one *per process lifetime* instead of one per
 * request, which was the actual bug.
 */
function getDeviceId(): string {
  const fromEnv = process.env.WUWA_DEVICE_ID;
  if (fromEnv) return fromEnv;

  if (!processDeviceId) {
    processDeviceId = generateDeviceId();
    console.warn(
      "[kurobbs] WUWA_DEVICE_ID is not set — generated one for this process only. " +
        "Set it in .env.local (see .env.example) so the device identity stays stable across restarts too.",
    );
  }
  return processDeviceId;
}

async function login(deviceId: string): Promise<WuwaSession> {
  const email = requireEnv("WUWA_EMAIL");
  const password = requireEnv("WUWA_PASSWORD");

  loginCount++;
  console.log(
    `[kurobbs] Logging into Wuthering Waves (real login #${loginCount} this process, ${new Date().toISOString()}). ` +
      `This should be rare — if you see this more than a few times a day, something's wrong.`,
  );

  const authCode = await gameLogin(email, password, deviceId);
  const tokenResult = await getGameToken(authCode, deviceId);
  const oauthCode = await generateOauthCode(tokenResult.access_token, deviceId);
  const players = await getPlayerInfo(oauthCode);

  const [region, info] = Object.entries(players)[0] ?? [];
  if (!region || !info) throw new Error("No Wuthering Waves character bound to this account.");

  const reportedTtlMs = tokenResult.expires_in ? tokenResult.expires_in * 1000 : undefined;
  const ttlMs =
    reportedTtlMs && reportedTtlMs > MIN_SESSION_TTL_MS
      ? reportedTtlMs * 0.9 // refresh a little before the server would expire it
      : DEFAULT_SESSION_TTL_MS;

  const expiresAt = Date.now() + ttlMs;
  console.log(`[kurobbs] Login OK, session cached until ${new Date(expiresAt).toISOString()}.`);

  return { oauthCode, playerId: info.roleId, region, expiresAt };
}

async function getSession(): Promise<WuwaSession> {
  if (cachedSession && Date.now() < cachedSession.expiresAt) return cachedSession;
  cachedSession = await login(getDeviceId());
  return cachedSession;
}

/** Fetches the account's default bound Wuthering Waves character's daily-resource data. */
export async function getWuwaRoleData(): Promise<WuwaRoleData> {
  const session = await getSession();
  try {
    const base = await getPlayerRole(session.oauthCode, session.playerId, session.region);
    return { base, region: session.region };
  } catch {
    // The cached session may have gone stale earlier than expected — force
    // exactly one fresh login and retry once before giving up.
    cachedSession = null;
    const fresh = await getSession();
    const base = await getPlayerRole(fresh.oauthCode, fresh.playerId, fresh.region);
    return { base, region: fresh.region };
  }
}
