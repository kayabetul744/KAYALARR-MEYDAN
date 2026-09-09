/**
 * Meydan — "Minecraft tarzı" ek katman.
 *
 * Buradaki her şey mevcut 6 bölge ve AI Fikir Çekirdeği sisteminden bağımsızdır:
 *  1) Adanın boş alanlarına serpilen bloklu binalar (ev, dükkân, kule)
 *  2) Meydanın kuzeyinde havada duran kocaman "MEYDAN" blok yazısı
 *  3) Merkezî çekirdeğin yanında, bölge kapılarından ayrı duran dev "İnşa Kapısı"
 */

import type { VoxelKind, WalkMap } from "./voxel-world";

export interface ExtrasCtx {
  put: (x: number, y: number, z: number, kind: VoxelKind, color: number) => void;
  walk: WalkMap;
  occupied: Set<string>;
  isDay: boolean;
  rnd: () => number;
}

const key = (x: number, z: number) => `${x},${z}`;

const mix = (a: number, b: number, t: number) => {
  const ar = (a >> 16) & 255,
    ag = (a >> 8) & 255,
    ab = a & 255;
  const br = (b >> 16) & 255,
    bg = (b >> 8) & 255,
    bb = b & 255;
  return (
    (((ar + (br - ar) * t) | 0) << 16) | (((ag + (bg - ag) * t) | 0) << 8) | ((ab + (bb - ab) * t) | 0)
  );
};

/* ============================================================
   Üretim Atölyesi Kapısı — konum ve ölçüler (etkileşim için dışa açık)
   ============================================================ */

/** Kapı, Üretim Bölgesi'nin (-96, 166) meydana bakan girişinde durur */
export const ATOLYE_GATE_ANGLE = Math.atan2(166, -96);
export const ATOLYE_GATE_RADIUS = 126;
export const ATOLYE_GATE = {
  x: Math.round(Math.cos(ATOLYE_GATE_ANGLE) * ATOLYE_GATE_RADIUS),
  z: Math.round(Math.sin(ATOLYE_GATE_ANGLE) * ATOLYE_GATE_RADIUS),
  /** Etkileşim yarıçapı (bu mesafede E / tıklama çalışır) */
  reach: 12,
  /** Kapı ağzının açıklık genişliği / yüksekliği */
  innerHalf: 7,
  innerTop: 18,
};

/** Kapı düzleminin teğet yönü */
export const ATOLYE_GATE_TANGENT = {
  x: Math.cos(ATOLYE_GATE_ANGLE + Math.PI / 2),
  z: Math.sin(ATOLYE_GATE_ANGLE + Math.PI / 2),
};

/* ============================================================
   5x7 blok font ("MEYDAN" ve tabelalar için)
   ============================================================ */

const FONT: Record<string, string[]> = {
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#", "#...#", "#...#"],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  A: ["..#..", ".#.#.", "#...#", "#####", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  "Ö": ["#.#..", ".###.", "#...#", "#...#", "#...#", "#...#", ".###."],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  G: [".###.", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  " ": ["", "", "", "", "", "", ""],
};

/** Harf hücrelerini (col, row) olarak döndürür; row 0 = en üst satır */
function glyphCells(ch: string): Array<[number, number]> {
  const rows = FONT[ch.toUpperCase()] ?? FONT[" "]!;
  const cells: Array<[number, number]> = [];
  rows.forEach((row, r) => {
    for (let c = 0; c < row.length; c++) if (row[c] === "#") cells.push([c, r]);
  });
  return cells;
}

interface TextOpts {
  cx: number;
  cz: number;
  baseY: number;
  /** Yazı hangi eksende uzanıyor */
  axis: "x" | "z";
  scale: number;
  color: number;
  kind: VoxelKind;
  /** Harf arası boşluk (hücre) */
  gap?: number;
  /** Derinlik (blok kalınlığı) */
  depth?: number;
}

/** Havada duran bloklu yazı yazar (yürünmez, sadece görsel) */
export function putText(ctx: ExtrasCtx, text: string, o: TextOpts) {
  const gap = o.gap ?? 1;
  const depth = o.depth ?? 2;
  const cellW = 5 + gap;
  const totalW = text.length * cellW - gap;
  const startCol = -totalW / 2;
  const height = 7;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    for (const [c, r] of glyphCells(ch)) {
      const col = startCol + i * cellW + c;
      for (let sx = 0; sx < o.scale; sx++)
        for (let sy = 0; sy < o.scale; sy++)
          for (let d = 0; d < depth; d++) {
            const along = Math.round(col * o.scale + sx);
            const y = o.baseY + (height - 1 - r) * o.scale + sy;
            const x = o.axis === "x" ? o.cx + along : o.cx + d;
            const z = o.axis === "x" ? o.cz + d : o.cz + along;
            ctx.put(x, y, z, o.kind, o.color);
          }
    }
  }
}

/* ============================================================
   Bloklu binalar (ilk oyunun şehir hissi)
   ============================================================ */

const WALL_SETS = [
  { wall: 0xcfc7b4, trim: 0x8d7a5c, roof: 0xa3462f },
  { wall: 0xb9a687, trim: 0x6f5a3c, roof: 0x4d5f7a },
  { wall: 0xd9d3c6, trim: 0x7b6f5b, roof: 0x3f6b4c },
  { wall: 0x9fa8ad, trim: 0x5d666c, roof: 0x6c3f57 },
  { wall: 0xc7b299, trim: 0x8a6f4b, roof: 0x2f4f66 },
] as const;

/** Ayak izinin tamamı boş, düz ve aynı yükseklikte mi? */
function siteHeight(ctx: ExtrasCtx, x0: number, z0: number, w: number, d: number): number | null {
  let base: number | null = null;
  for (let x = x0 - 1; x <= x0 + w; x++)
    for (let z = z0 - 1; z <= z0 + d; z++) {
      const k = key(x, z);
      if (ctx.occupied.has(k)) return null;
      const g = ctx.walk.get(k);
      if (g === undefined || g < 0) return null;
      if (base === null) base = g;
      else if (Math.abs(g - base) > 0) return null;
    }
  return base;
}

/** Tek bir Minecraft tarzı bina (taş duvar, cam pencere, kademeli çatı, kapı boşluğu) */
function house(
  ctx: ExtrasCtx,
  x0: number,
  z0: number,
  w: number,
  d: number,
  floors: number,
  baseY: number,
  set: (typeof WALL_SETS)[number],
  doorSide: "n" | "s" | "e" | "w",
) {
  const { put, rnd, isDay, walk, occupied } = ctx;
  const H = floors * 3;

  for (let x = x0; x < x0 + w; x++)
    for (let z = z0; z < z0 + d; z++) {
      const edge = x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1;
      // taban döşemesi
      put(x, baseY, z, "stone", mix(set.trim, 0x000000, 0.25));
      if (!edge) {
        walk.set(key(x, z), baseY);
        occupied.add(key(x, z));
        continue;
      }
      occupied.add(key(x, z));
      walk.delete(key(x, z));

      for (let y = baseY + 1; y <= baseY + H; y++) {
        const local = (y - baseY - 1) % 3;
        // kapı boşluğu
        const onDoorWall =
          (doorSide === "n" && z === z0) ||
          (doorSide === "s" && z === z0 + d - 1) ||
          (doorSide === "w" && x === x0) ||
          (doorSide === "e" && x === x0 + w - 1);
        const mid =
          doorSide === "n" || doorSide === "s"
            ? Math.abs(x - (x0 + (w - 1) / 2)) < 1
            : Math.abs(z - (z0 + (d - 1) / 2)) < 1;
        if (onDoorWall && mid && y <= baseY + 2) continue;

        const corner = (x === x0 || x === x0 + w - 1) && (z === z0 || z === z0 + d - 1);
        const windowRow = local === 1;
        const windowCol = ((x + z) % 3 === 0) as boolean;
        if (!corner && windowRow && windowCol) {
          put(x, y, z, "glass", isDay ? 0x9ed0e6 : 0xffd9a0);
        } else {
          const band = local === 2;
          put(
            x,
            y,
            z,
            "stone",
            band ? set.trim : mix(set.wall, set.trim, rnd() * 0.22),
          );
        }
      }
    }

  // Kademeli (piramidal) çatı
  const top = baseY + H;
  const steps = Math.min(Math.floor(Math.min(w, d) / 2), 4);
  for (let s = 0; s <= steps; s++) {
    for (let x = x0 + s; x < x0 + w - s; x++)
      for (let z = z0 + s; z < z0 + d - s; z++) {
        const ring =
          x === x0 + s || x === x0 + w - s - 1 || z === z0 + s || z === z0 + d - s - 1 || s === steps;
        if (!ring) continue;
        put(x, top + 1 + s, z, "stone", mix(set.roof, 0x000000, s * 0.06));
      }
  }
  // Çatı feneri
  put(x0 + Math.floor(w / 2), top + steps + 2, z0 + Math.floor(d / 2), "lamp", isDay ? 0xfff0c8 : 0xffc06a);
}

/** Bloklu ağaç */
function tree(ctx: ExtrasCtx, x: number, z: number, baseY: number) {
  const h = 4 + Math.floor(ctx.rnd() * 3);
  for (let y = baseY + 1; y <= baseY + h; y++) ctx.put(x, y, z, "stone", 0x59422c);
  const leaf = mix(0x3f7d3a, 0x2b5c2c, ctx.rnd() * 0.6);
  for (let dy = 0; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++) {
        const r = Math.abs(dx) + Math.abs(dz) + dy;
        if (r > 3) continue;
        ctx.put(x + dx, baseY + h + dy, z + dz, "leaf", mix(leaf, 0x000000, ctx.rnd() * 0.22));
      }
  ctx.walk.delete(key(x, z));
  ctx.occupied.add(key(x, z));
}

/* ============================================================
   Dev İnşa Kapısı (portal çerçevesi)
   ============================================================ */

function buildAtolyeGate(ctx: ExtrasCtx) {
  const { put, walk, occupied } = ctx;
  const ux = ATOLYE_GATE_TANGENT.x;
  const uz = ATOLYE_GATE_TANGENT.z;
  const nx = Math.cos(ATOLYE_GATE_ANGLE);
  const nz = Math.sin(ATOLYE_GATE_ANGLE);
  const HALF = ATOLYE_GATE.innerHalf + 3; // toplam yarı genişlik
  const TOP = ATOLYE_GATE.innerTop + 4; // toplam yükseklik
  const FRAME = 0xffa53a;
  const FRAME_DEEP = 0xb05e14;

  const at = (along: number, depth: number) => ({
    x: Math.round(ATOLYE_GATE.x + ux * along + nx * depth),
    z: Math.round(ATOLYE_GATE.z + uz * along + nz * depth),
  });

  for (let a = -HALF; a <= HALF; a++) {
    for (let y = 2; y <= TOP; y++) {
      const insideOpening = Math.abs(a) <= ATOLYE_GATE.innerHalf && y <= ATOLYE_GATE.innerTop;
      if (insideOpening) continue;
      if (Math.abs(a) > HALF - 1 && y > TOP - 2) continue;
      for (let dep = -1; dep <= 1; dep++) {
        const p = at(a, dep);
        const rim =
          Math.abs(Math.abs(a) - (ATOLYE_GATE.innerHalf + 1)) < 0.6 ||
          Math.abs(y - (ATOLYE_GATE.innerTop + 1)) < 0.6;
        put(p.x, y, p.z, rim ? "glow" : "stone", rim ? FRAME : mix(FRAME_DEEP, 0x2a1608, 0.55));
        walk.delete(key(p.x, p.z));
        occupied.add(key(p.x, p.z));
      }
    }
  }

  // Kapının önünde parlayan eşik
  for (let a = -ATOLYE_GATE.innerHalf - 1; a <= ATOLYE_GATE.innerHalf + 1; a++) {
    for (let dep = -3; dep <= 3; dep++) {
      const p = at(a, dep);
      put(p.x, 2, p.z, "glow", mix(FRAME, 0xffffff, 0.2));
      walk.set(key(p.x, p.z), 2);
    }
  }
  // Yanlarda kısa işaret fenerleri
  for (const side of [-1, 1]) {
    const p = at(side * (HALF + 2), 0);
    for (let y = 3; y <= 12; y++) put(p.x, y, p.z, "stone", mix(FRAME_DEEP, 0x000000, 0.4));
    put(p.x, 13, p.z, "lamp", FRAME);
    walk.delete(key(p.x, p.z));
    occupied.add(key(p.x, p.z));
  }

  // Kapının üstünde tabela yazısı
  const labelPos = at(0, 0);
  putText(ctx, "ATÖLYE", {
    cx: labelPos.x,
    cz: labelPos.z,
    baseY: TOP + 3,
    axis: Math.abs(ux) > Math.abs(uz) ? "x" : "z",
    scale: 1,
    color: FRAME,
    kind: "glow",
    depth: 2,
  });
}


/* ============================================================
   Tümünü ekleyen giriş noktası
   ============================================================ */

export function addMinecraftExtras(ctx: ExtrasCtx) {
  /* 1) Adanın boş alanlarına bloklu binalar + ağaçlar */
  let placed = 0;
  for (let i = 0; i < 2600 && placed < 96; i++) {
    const a = ctx.rnd() * Math.PI * 2;
    const r = 78 + ctx.rnd() * 208;
    const x0 = Math.round(Math.cos(a) * r);
    const z0 = Math.round(Math.sin(a) * r);
    const w = 7 + Math.floor(ctx.rnd() * 6);
    const d = 7 + Math.floor(ctx.rnd() * 6);
    const base = siteHeight(ctx, x0, z0, w, d);
    if (base === null) continue;
    const floors = 1 + Math.floor(ctx.rnd() * (r > 150 ? 3 : 4));
    const set = WALL_SETS[Math.floor(ctx.rnd() * WALL_SETS.length)]!;
    const toCenter = Math.hypot(x0, z0);
    const doorSide: "n" | "s" | "e" | "w" =
      Math.abs(x0) > Math.abs(z0) ? (x0 > 0 ? "w" : "e") : z0 > 0 ? "n" : "s";
    house(ctx, x0, z0, w, d, floors, base, set, doorSide);
    placed++;
    // yanına 0-2 ağaç
    const trees = Math.floor(ctx.rnd() * 3);
    for (let t = 0; t < trees; t++) {
      const tx = x0 - 2 + Math.floor(ctx.rnd() * (w + 4));
      const tz = z0 - 2 + Math.floor(ctx.rnd() * (d + 4));
      const k = key(tx, tz);
      if (ctx.occupied.has(k)) continue;
      const g = ctx.walk.get(k);
      if (g === undefined || g < 0) continue;
      tree(ctx, tx, tz, g);
    }
    if (toCenter < 0) break;
  }

  /* 2) Kocaman "MEYDAN" blok yazısı (meydanın kuzeyinde, havada) */
  putText(ctx, "MEYDAN", {
    cx: 0,
    cz: -96,
    baseY: 18,
    axis: "x",
    scale: 3,
    color: 0x8ef0ff,
    kind: "glow",
    depth: 2,
  });

  /* 3) Üretim Atölyesi Kapısı */
  buildAtolyeGate(ctx);
}
