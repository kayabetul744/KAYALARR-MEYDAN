import type { Theme } from "./voxel-world";

export interface IstanbulClock {
  hour: number;
  minute: number;
  time: string;
  theme: Theme;
}

/** Türkiye saatine (Europe/Istanbul) göre saat ve gündüz/gece modu */
export function istanbulClock(date = new Date()): IstanbulClock {
  const parts = new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "12") % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  // 07:00 - 19:59 arası gündüz
  const theme: Theme = hour >= 7 && hour < 20 ? "day" : "night";
  return { hour, minute, time, theme };
}
