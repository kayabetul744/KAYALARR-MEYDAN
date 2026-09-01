/**
 * AI Fikir Çekirdeği — paylaşılan bir fikri altı bölgeden birine yönlendiren,
 * Zod ile doğrulanan yapılandırılmış bir plana dönüştüren katman.
 *
 * Şema ve koordinat kuralları (8-88 aralığı, 14-26 yapı, #rrggbb renk, altı
 * kelimeyi geçmeyen başlık) projenin teknik raporundaki AI akışı bölümüyle
 * birebir uyumludur. `analyzeIdeaWithAi` (src/server/idea-core.ts, sunucu
 * tarafı) başarısız olursa veya yapılandırılmamışsa, buradaki deterministik
 * `fallbackPlan` devreye girer — oyun akışı yapay zekâ olmadan da kırılmaz.
 */

import { z } from "zod";

import {
  REGIONS,
  mulberry32,
  DESIGN_CENTER,
  PRODUCTION_CENTER,
  MARKET_CENTER,
  COMMUNITY_CENTER,
  ACHIEVEMENT_CENTER,
  IDEA_CENTER,
  type Voxel,
} from "./voxel-world";

export type RegionName = (typeof REGIONS)[number]["name"];
const regionNameTuple = REGIONS.map((r) => r.name) as [RegionName, ...RegionName[]];

export const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/**
 * AI çekirdeğinin uyması gereken şema: sistem promptundaki oyun kuralları
 * (8-88 koordinat, 14-26 yapı, #rrggbb renk, ≤6 kelimelik başlık) burada
 * doğrulanır — şema dışı çıktı asla oyun motoruna parametre olamaz.
 */
export const ideaStructurePointSchema = z.object({
  x: z.number().int().min(8).max(88),
  y: z.number().int().min(0).max(8),
  z: z.number().int().min(8).max(88),
});

export const ideaPlanSchema = z.object({
  bolge: z.enum(regionNameTuple),
  tema: z.string().min(2).max(40),
  baslik: z
    .string()
    .min(2)
    .max(60)
    .refine(
      (s) => s.trim().split(/\s+/).filter(Boolean).length <= 6,
      "Başlık en fazla altı kelime olmalı",
    ),
  renk: z.string().regex(HEX_COLOR_RE, "Renk #rrggbb biçiminde olmalı"),
  onerilenKatkiPuani: z.number().int().min(1).max(100),
  yapilar: z.array(ideaStructurePointSchema).min(14).max(26),
});

export type IdeaStructurePoint = z.infer<typeof ideaStructurePointSchema>;
export type IdeaPlan = z.infer<typeof ideaPlanSchema>;

export interface IdeaAnalysis {
  plan: IdeaPlan;
  /** Plan gerçek bir modelden mi geldi, yoksa deterministik fallback'ten mi? */
  source: "ai" | "fallback";
}

export function regionColor(name: RegionName): number {
  return REGIONS.find((r) => r.name === name)?.color ?? 0x35d6ff;
}

export function toHexColor(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}

/* ---------------- Deterministik fallback ---------------- */

function hashText(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const REGION_KEYWORDS: Record<RegionName, string[]> = {
  Fikir: [],
  Tasarım: ["tasarım", "görsel", "arayüz", "renk", "logo", "çizim", "prototip görsel"],
  Üretim: ["üret", "prototip", "inşa", "yazılım", "kod", "geliştir", "makine", "sistem kur"],
  Topluluk: ["topluluk", "geri bildirim", "tartış", "yorum", "birlikte", "gönüllü", "buluş"],
  Pazar: ["sat", "pazar", "gelir", "müşteri", "fiyat", "yatırım", "pazarla", "abonelik"],
  Başarı: ["tamamla", "ödül", "başar", "bitir", "lansman", "yayınla", "kazandı"],
};

function guessRegion(text: string): RegionName {
  const lower = text.toLocaleLowerCase("tr-TR");
  let best: RegionName = "Fikir";
  let bestScore = 0;
  for (const name of REGIONS.map((r) => r.name)) {
    const score = REGION_KEYWORDS[name].reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = name;
    }
  }
  return best;
}

function titleFromText(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).slice(0, 6);
  return words.length > 0 ? words.join(" ") : "Yeni fikir";
}

/**
 * Yapay zekâ servisine erişilemediğinde (anahtar yok, ağ hatası, zaman aşımı)
 * devreye giren kural tabanlı üretici. Aynı metin her zaman aynı planı üretir.
 */
export function fallbackPlan(text: string): IdeaPlan {
  const region = guessRegion(text);
  const rnd = mulberry32(hashText(text));
  const count = 14 + Math.floor(rnd() * 13); // 14..26
  const yapilar: IdeaStructurePoint[] = Array.from({ length: count }, () => ({
    x: 8 + Math.floor(rnd() * 81),
    y: Math.floor(rnd() * 7),
    z: 8 + Math.floor(rnd() * 81),
  }));
  const kp = Math.max(5, Math.min(100, 10 + Math.round(text.trim().length / 4)));
  return {
    bolge: region,
    tema: region,
    baslik: titleFromText(text),
    renk: toHexColor(regionColor(region)),
    onerilenKatkiPuani: kp,
    yapilar,
  };
}

/* ---------------- Plandan 3B dünyaya ---------------- */

const REGION_CENTERS: Record<RegionName, { x: number; z: number }> = {
  Fikir: IDEA_CENTER,
  Tasarım: DESIGN_CENTER,
  Üretim: PRODUCTION_CENTER,
  Topluluk: COMMUNITY_CENTER,
  Pazar: MARKET_CENTER,
  Başarı: ACHIEVEMENT_CENTER,
};

/** Katkı yapılarının çatıların üstünde, çarpışmasız süzüldüğü taban yüksekliği. */
const CONTRIBUTION_HOVER_HEIGHT = 22;

/**
 * Doğrulanmış bir planı, doğru bölgenin üstünde süzülen hologram bir katkı
 * yapısına (Voxel[]) çevirir — AI/fallback çıktısının "doğrudan oyun
 * motoruna parametre olması" burada gerçekleşir.
 */
export function planToVoxels(plan: IdeaPlan): Voxel[] {
  const center = REGION_CENTERS[plan.bolge];
  const color = Number.parseInt(plan.renk.slice(1), 16);
  return plan.yapilar.map((p) => ({
    x: center.x + (p.x - 48),
    y: CONTRIBUTION_HOVER_HEIGHT + p.y,
    z: center.z + (p.z - 48),
    kind: "glow" as const,
    color,
  }));
}
