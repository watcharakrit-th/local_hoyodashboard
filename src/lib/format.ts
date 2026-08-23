/** Formats a duration in seconds as a compact "5d 2h" / "3h 12m" / "45m" / "Ready" string. */
export function formatDuration(totalSeconds: number): string {
  if (totalSeconds <= 0) return "Ready";

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "<1m";
}

/** Formats an HoYoLAB `{year,month,day,hour,minute,second?}` struct as seconds-until, from now. */
export function secondsUntil(t: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second?: number;
}): number {
  const target = new Date(t.year, t.month - 1, t.day, t.hour, t.minute, t.second ?? 0).getTime();
  return Math.max(0, Math.round((target - Date.now()) / 1000));
}

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/** Converts a small integer difficulty tier (1-10) to a roman numeral, e.g. 5 -> "V". */
export function toRoman(n: number): string {
  return ROMAN[n] ?? String(n);
}

export function clampPercent(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (current / max) * 100));
}
