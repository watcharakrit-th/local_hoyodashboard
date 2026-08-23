import crypto from "crypto";

/**
 * Port of kuro.py's `kuro/utility/auth/crypto.py` — Kuro Games' SDK login
 * request signing. Reverse-engineered by the Wuthery community, not
 * documented by Kuro Games; verified against a live account in `../../../kurobbs/`
 * (see that folder's README) before porting here.
 */

function encodeHexMd5(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex");
}

/** Swaps a handful of fixed positions in the MD5 hex digest — Kuro's own obfuscation, not a security measure. */
function md5Code(input: string): string {
  const chars = encodeHexMd5(input).toLowerCase().split("");
  if (chars.length >= 23) {
    [chars[1], chars[13]] = [chars[13], chars[1]];
    [chars[5], chars[17]] = [chars[17], chars[5]];
    [chars[7], chars[23]] = [chars[23], chars[7]];
  }
  return chars.join("");
}

/** Builds the `sign` field required by the game-login/token/auto-login SDK endpoints. */
export function encodeMd5Parameter(params: Record<string, unknown>, appKey: string): string {
  let raw = "";
  for (const key of Object.keys(params).sort()) {
    if (key === "sign" || key === "market") continue;
    const value = params[key];
    if (value === null || value === undefined) continue;
    raw += `${key}=${value}&`;
  }
  raw += appKey;
  return md5Code(raw);
}

function shuffle(chars: string[], startIndex: number): void {
  for (let i = startIndex; i < chars.length; i += 4) {
    if (i + 2 < chars.length) {
      [chars[i], chars[i + 2]] = [chars[i + 2], chars[i]];
    }
    if (i + 6 >= chars.length) break;
  }
}

/** Obfuscates the password for the game-login request body (base64 + a fixed shuffle, not real encryption). */
export function encodePassword(password: string): string {
  if (!password) return "";
  const chars = Buffer.from(password, "utf-8").toString("base64").split("");
  shuffle(chars, 0);
  shuffle(chars, 1);
  return chars.join("");
}

export function generateDeviceId(): string {
  return crypto.randomUUID().toUpperCase();
}
