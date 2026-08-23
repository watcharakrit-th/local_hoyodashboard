import crypto from "crypto";

// Salt confirmed working against the Battle Chronicle / event endpoints as of 2026-08.
// This is the "DS v1" dynamic secret scheme HoYoLAB's own web client uses.
const DS_SALT = "6s25p5ox5y14umn1p61aqyyvbvvl3lrt";
const DS_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomString(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += DS_CHARS.charAt(Math.floor(Math.random() * DS_CHARS.length));
  }
  return out;
}

/** Builds the `DS` header value HoYoLAB's Battle Chronicle API requires on every request. */
export function buildDsHeader(): string {
  const t = Math.floor(Date.now() / 1000).toString();
  const r = randomString(6);
  const raw = `salt=${DS_SALT}&t=${t}&r=${r}`;
  const hash = crypto.createHash("md5").update(raw).digest("hex");
  return `${t},${r},${hash}`;
}
