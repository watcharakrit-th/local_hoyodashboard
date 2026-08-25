import crypto from "crypto";

/**
 * SKPORT (Gryphline's Arknights: Endfield community platform, zonai.skport.com)
 * request signing — the "V2" scheme used by every signed endpoint this dashboard
 * calls. Confirmed against the actual, working TypeScript source of
 * `yeci226/endfield-discord-bot` (an open-source Discord bot doing this in
 * production), not just third-party docs — see README's "Arknights: Endfield"
 * section for the source list and why that mattered here.
 *
 *   sign = MD5( HEX( HMAC-SHA256(path + body + timestamp + headerJson, salt) ) )
 *
 * `headerJson` is a fixed-shape, fixed-key-order JSON string embedding the
 * request's own platform/timestamp/device-id/version headers — it's part of
 * what gets signed, not a separate value.
 */

export const SKPORT_PLATFORM = "3";
export const SKPORT_V_NAME = "1.0.0";

export function generateSkportSign(path: string, body: string, timestamp: string, salt: string): string {
  const headerJson = `{"platform":"${SKPORT_PLATFORM}","timestamp":"${timestamp}","dId":"","vName":"${SKPORT_V_NAME}"}`;
  const toSign = `${path}${body}${timestamp}${headerJson}`;
  const hmac = crypto.createHmac("sha256", salt).update(toSign).digest("hex");
  return crypto.createHash("md5").update(hmac).digest("hex");
}
