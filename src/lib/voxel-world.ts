/**
 * Fikir Meydanı - voxel dünya üreticisi.
 * Merkez yuvarlak meydan, su hendeği, dört köprü, ışınsal yollar, ağaçlar ve
 * etrafında bloklu bir şehir. Gündüz / gece paletleri ayrı ayrı üretilir.
 */

export type VoxelKind = "stone" | "water" | "glow" | "lamp" | "leaf" | "glass";
export type Theme = "day" | "night";

export interface Voxel {
  x: number;
  y: number;
  z: number;
  kind: VoxelKind;
  color: number;
}

/** Yürünebilir yüzeyler: "x,z" -> üst blok yüksekliği */
export type WalkMap = Map<string, number>;

export interface World {
  voxels: Voxel[];
  walk: WalkMap;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerpHex = (a: number, b: number, t: number) => {
  const ar = (a >> 16) & 255,
    ag = (a >> 8) & 255,
    ab = a & 255;
  const br = (b >> 16) & 255,
    bg = (b >> 8) & 255,
    bb = b & 255;
  return (
    (((ar + (br - ar) * t) | 0) << 16) |
    (((ag + (bg - ag) * t) | 0) << 8) |
    ((ab + (bb - ab) * t) | 0)
  );
};

export const PLAZA_R = 42;
export const MOAT_R = 64;
export const CITY_R = 125;

/** Ada yarıçapı: tüm şehir ve bölgeler bu tropik adanın üzerinde durur */
export const ISLAND_R = 335;
/** Deniz yüzeyi yüksekliği (voxel merkezi) */
export const SEA_LEVEL = -1.35;

/** Tasarım Bölgesi: meydanın Tasarım kapısından çıkan bulvarın ucundaki mahalle */
export const DESIGN_CENTER = { x: 96, z: 166 };
export const DESIGN_HALF = 60;

/** Üretim Bölgesi: Üretim kapısından çıkan bulvarın ucundaki sanayi mahallesi */
export const PRODUCTION_CENTER = { x: -96, z: 166 };
export const PRODUCTION_HALF = 60;

/** Pazar Bölgesi: Pazar kapısından çıkan bulvarın ucundaki yeşil pazar meydanı */
export const MARKET_CENTER = { x: -96, z: -166 };
export const MARKET_HALF = 60;

/** Topluluk Bölgesi: Topluluk kapısından çıkan bulvarın ucundaki buluşma terası */
export const COMMUNITY_CENTER = { x: -214, z: 0 };
export const COMMUNITY_HALF = 60;

/** Başarı Bölgesi: Topluluk aksının karşısındaki altın ödül galerisi */
export const ACHIEVEMENT_CENTER = { x: 96, z: -166 };
export const ACHIEVEMENT_HALF = 60;

/** Fikir Bölgesi: Fikir kapısından çıkan doğu bulvarının ucundaki mor fikir meydanı */
export const IDEA_CENTER = { x: 214, z: 0 };
export const IDEA_HALF = 60;


/** NSosyal fikir akışının altı bölgesi (meydandan çıkan kapılar) */
export const REGIONS = [
  { name: "Fikir", color: 0x35d6ff },
  { name: "Tasarım", color: 0xa855f7 },
  { name: "Üretim", color: 0xffa53a },
  { name: "Topluluk", color: 0x36f2b0 },
  { name: "Pazar", color: 0xffd166 },
  { name: "Başarı", color: 0xffc928 },
] as const;


interface Palette {
  stoneA: number;
  stoneB: number;
  stoneC: number;
  stoneD: number;
  plazaTint: number;
  road: number;
  roadLine: number;
  grass: number;
  ground: number;
  water: [number, number];
  wallA: number;
  wallB: number;
  roof: number;
  window: number[];
  windowChance: number;
  trunk: number;
  leafGreen: number;
  leafAccent: number;
  glow: number;
}

const PALETTES: Record<Theme, Palette> = {
  night: {
    stoneA: 0x8d93a8,
    stoneB: 0x6a7086,
    stoneC: 0x4a5068,
    stoneD: 0x343a52,
    plazaTint: 0x9fb4ff,
    road: 0x3d4256,
    roadLine: 0xf0d78a,
    grass: 0x24503a,
    ground: 0x424766,
    water: [0x123a7a, 0x1f6fd0],
    wallA: 0x8f97b0,
    wallB: 0x5b6280,
    roof: 0x3a3f57,
    window: [0xffb04a, 0xffd08a, 0xff8f3a],
    windowChance: 0.45,
    trunk: 0x3a2c22,
    leafGreen: 0x2f7a3a,
    leafAccent: 0x8b46d8,
    glow: 0x36c8ff,
  },
  day: {
    stoneA: 0xe8e3d6,
    stoneB: 0xd2ccbd,
    stoneC: 0xb8b2a4,
    stoneD: 0x9a948a,
    plazaTint: 0xfff6e2,
    road: 0xb9b3a8,
    roadLine: 0xfaf3df,
    grass: 0x6cbf5a,
    ground: 0x8fd07a,
    water: [0x3fa8dd, 0x86dcf2],
    wallA: 0xf3ede1,
    wallB: 0xd9b48f,
    roof: 0xc0603f,
    window: [0x8fd4ef, 0xbfe8f7, 0x6cb8dd],
    windowChance: 0.15,
    trunk: 0x7a5638,
    leafGreen: 0x4fae46,
    leafAccent: 0xf0a3c8,
    glow: 0x2fb6ff,
  },
};

export function buildWorld(theme: Theme = "night"): World {
  const P = PALETTES[theme];
  const isDay = theme === "day";
  const rnd = mulberry32(20260823);
  const out: Voxel[] = [];
  const walk: WalkMap = new Map();
  const put = (x: number, y: number, z: number, kind: VoxelKind, color: number) =>
    out.push({ x, y, z, kind, color });

  const occupied = new Set<string>();
  const key = (x: number, z: number) => `${x},${z}`;
  const setWalk = (x: number, z: number, y: number) => walk.set(key(x, z), y);

  /* ---------- 6 köprü yönü (her bölgeye bir köprü) ---------- */
  const BRIDGES = 6;
  const BRIDGE_HALF = 4;
  const dirs = Array.from({ length: BRIDGES }, (_, i) => {
    const a = (i / BRIDGES) * Math.PI * 2;
    return { dx: Math.cos(a), dz: Math.sin(a), a };
  });
  /** Nokta köprü koridorunda mı? (merkeze göre) */
  const inBridgeLane = (x: number, z: number, half = BRIDGE_HALF) =>
    dirs.some(({ dx, dz }) => {
      const along = x * dx + z * dz;
      const perp = -x * dz + z * dx;
      return along > 0 && Math.abs(perp) <= half;
    });

  /* ---------- Merkez meydan: kademeli taş halkalar + ışınsal enerji ---------- */
  for (let x = -PLAZA_R; x <= PLAZA_R; x++) {
    for (let z = -PLAZA_R; z <= PLAZA_R; z++) {
      const d = Math.hypot(x, z);
      if (d > PLAZA_R) continue;
      occupied.add(key(x, z));

      const tier = d < 8 ? 2 : d < 16 ? 1 : 0;
      const ringPhase = Math.floor(d) % 3;
      const shade = ringPhase === 0 ? P.stoneA : ringPhase === 1 ? P.stoneB : P.stoneC;
      const jitter = (rnd() - 0.5) * 0.18;
      let color = lerpHex(shade, P.plazaTint, 0.12 + jitter * 0.5);

      // 6 köprüye hizalı ışınsal enerji çizgileri
      const radial = d > 3 && inBridgeLane(x, z, 0.75);
      const glowRing = Math.abs(d - 12) < 0.5 || Math.abs(d - 20) < 0.5;
      const diamond = Math.abs(Math.abs(x) + Math.abs(z) - 4) < 0.5;
      if (radial || glowRing || diamond) {
        put(x, tier, z, "glow", P.glow);
        for (let y = tier - 1; y >= 0; y--) put(x, y, z, "stone", P.stoneC);
        setWalk(x, z, tier);
        continue;
      }

      if (d < 6) color = lerpHex(color, P.plazaTint, 0.35);
      for (let y = 0; y <= tier; y++) {
        put(x, y, z, "stone", y === tier ? color : lerpHex(color, 0x000000, 0.45));
      }
      setWalk(x, z, tier);
    }
  }

  /* ---------- Su hendeği ---------- */
  for (let x = -MOAT_R; x <= MOAT_R; x++) {
    for (let z = -MOAT_R; z <= MOAT_R; z++) {
      const d = Math.hypot(x, z);
      if (d <= PLAZA_R || d > MOAT_R) continue;
      if (inBridgeLane(x, z, BRIDGE_HALF - 0.5)) continue;
      occupied.add(key(x, z));
      put(x, -1, z, "stone", lerpHex(P.stoneC, P.stoneD, rnd() * 0.5));
      setWalk(x, z, -1);
    }
  }

  /* ---------- Altı köprü + ışıklı enerji kanalı ---------- */
  const bridgeDone = new Set<string>();
  for (const { dx, dz } of dirs) {
    for (let t = PLAZA_R - 3; t <= MOAT_R + 5; t += 0.34) {
      for (let w = -BRIDGE_HALF; w <= BRIDGE_HALF; w++) {
        const x = Math.round(dx * t - dz * w);
        const z = Math.round(dz * t + dx * w);
        const k = key(x, z);
        if (bridgeDone.has(k)) continue;
        bridgeDone.add(k);
        if (Math.hypot(x, z) < PLAZA_R - 1) continue;
        occupied.add(k);
        const edge = Math.abs(w) === BRIDGE_HALF;
        const chan = Math.abs(w) <= 1;
        if (chan) {
          put(x, 0, z, "glow", P.glow);
          setWalk(x, z, 0);
        } else if (edge) {
          put(x, 0, z, "stone", P.stoneA);
          put(x, 1, z, "stone", P.stoneA);
          walk.delete(k);
        } else {
          put(x, 0, z, "stone", lerpHex(P.stoneB, P.stoneA, rnd() * 0.4));
          setWalk(x, z, 0);
        }
        put(x, -1, z, "stone", P.stoneD);
      }
    }
  }

  /* ---------- Fener direkleri ---------- */
  const lamp = (x: number, z: number) => {
    for (let y = 1; y <= 4; y++) put(x, y, z, "stone", P.stoneD);
    put(x, 5, z, "lamp", isDay ? 0xfff1c4 : 0xffc36b);
    walk.delete(key(x, z));
  };
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    lamp(Math.round(Math.cos(a) * (PLAZA_R - 2)), Math.round(Math.sin(a) * (PLAZA_R - 2)));
  }
  // Köprü başları ve çıkışlarına fener
  for (const { dx, dz } of dirs) {
    for (const t of [PLAZA_R + 2, MOAT_R + 3]) {
      for (const w of [-BRIDGE_HALF, BRIDGE_HALF]) {
        lamp(Math.round(dx * t - dz * w), Math.round(dz * t + dx * w));
      }
    }
  }


  /* ---------- Yollar: ışınsal bulvarlar + çevre yolu ---------- */
  const roadTiles = new Set<string>();
  const paveRoad = (x: number, z: number, center: boolean) => {
    const k = key(x, z);
    if (occupied.has(k) && !roadTiles.has(k)) return;
    if (Math.hypot(x, z) < MOAT_R - 1) return;
    occupied.add(k);
    roadTiles.add(k);
    const color = center && (Math.abs(x) + Math.abs(z)) % 6 < 3 ? P.roadLine : P.road;
    put(x, -1, z, "stone", lerpHex(color, 0x000000, rnd() * 0.08));
    setWalk(x, z, -1);
  };

  const RADIALS = 6;
  for (let i = 0; i < RADIALS; i++) {
    const a = (i / RADIALS) * Math.PI * 2;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    for (let r = MOAT_R - 2; r <= CITY_R + 8; r += 0.4) {
      for (let w = -3; w <= 3; w++) {
        const x = Math.round(dx * r - dz * w);
        const z = Math.round(dz * r + dx * w);
        paveRoad(x, z, w === 0);
      }
    }
  }
  const RING_R = MOAT_R + 18;
  for (let a = 0; a < Math.PI * 2; a += 0.006) {
    for (let w = -3; w <= 3; w++) {
      const r = RING_R + w;
      paveRoad(Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r), w === 0);
    }
  }

  /* ---------- Bloklu şehir ---------- */
  const placeBuilding = (cx: number, cz: number, w: number, dph: number, h: number) => {
    const base = lerpHex(P.wallA, P.wallB, rnd());
    for (let x = cx - w; x <= cx + w; x++) {
      for (let z = cz - dph; z <= cz + dph; z++) {
        occupied.add(key(x, z));
        walk.delete(key(x, z));
        put(x, -1, z, "stone", P.stoneD);
        for (let y = 0; y <= h; y++) {
          const shell =
            x === cx - w || x === cx + w || z === cz - dph || z === cz + dph || y === h || y === 0;
          if (!shell) continue;
          const wall = lerpHex(base, y === h ? P.roof : 0xffffff, y === h ? 0.6 : rnd() * 0.12);
          const isWall =
            y > 1 && y < h && (x === cx - w || x === cx + w || z === cz - dph || z === cz + dph);
          if (isWall && (x + z + y) % 3 === 0 && rnd() > P.windowChance) {
            const c = P.window[Math.abs(x + z) % 3]!;
            put(x, y, z, isDay ? "glass" : "lamp", c);
          } else {
            put(x, y, z, "stone", wall);
          }
        }
      }
    }
    for (let y = h + 1; y <= h + Math.max(2, Math.floor(w / 2)); y++) {
      const shrink = y - h;
      for (let x = cx - w + shrink; x <= cx + w - shrink; x++) {
        for (let z = cz - dph + shrink; z <= cz + dph - shrink; z++) {
          if (x < cx - w + shrink || z < cz - dph + shrink) continue;
          put(x, y, z, "stone", lerpHex(P.roof, 0x000000, rnd() * 0.45));
        }
      }
    }
  };

  /* ---------- Ağaçlar: 3 tür, katmanlı gövde + hacimli taç ---------- */
  type TreeKind = "broad" | "pine" | "blossom";
  const tree = (cx: number, cz: number, kind: TreeKind = "broad") => {
    const h = kind === "pine" ? 6 + Math.floor(rnd() * 3) : 4 + Math.floor(rnd() * 3);
    for (let y = 0; y <= h; y++) {
      put(cx, y, cz, "stone", lerpHex(P.trunk, 0x000000, rnd() * 0.25));
      // gövde dibinde hafif kök kalınlaşması
      if (y === 0) {
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          if (rnd() > 0.55) put(cx + dx, 0, cz + dz, "stone", lerpHex(P.trunk, 0x000000, 0.35));
        }
      }
    }
    walk.delete(key(cx, cz));
    occupied.add(key(cx, cz));

    const base =
      kind === "blossom" ? P.leafAccent : lerpHex(P.leafGreen, P.grass, rnd() * 0.35);

    if (kind === "pine") {
      // konik katmanlar
      let r = 3;
      for (let layer = 0; layer < 4; layer++) {
        const y = h - 1 + layer * 1;
        for (let dx = -r; dx <= r; dx++)
          for (let dz = -r; dz <= r; dz++) {
            if (Math.hypot(dx, dz) > r + 0.2) continue;
            put(cx + dx, y, cz + dz, "leaf", lerpHex(base, 0x000000, rnd() * 0.35));
          }
        r = Math.max(1, r - 1);
      }
      put(cx, h + 4, cz, "leaf", lerpHex(base, 0xffffff, 0.2));
      return;
    }

    // geniş yapraklı / çiçekli: küresel taç + düzensiz kenar
    const R = kind === "blossom" ? 2.7 : 3.1;
    for (let dx = -4; dx <= 4; dx++)
      for (let dz = -4; dz <= 4; dz++)
        for (let dy = -1; dy <= 4; dy++) {
          const d = Math.hypot(dx * 0.95, (dy - 1.4) * 1.15, dz * 0.95);
          if (d > R + rnd() * 0.55) continue;
          const shade = lerpHex(base, dy >= 3 ? 0xffffff : 0x000000, rnd() * 0.3);
          put(cx + dx, h + dy, cz + dz, "leaf", shade);
        }
  };

  /* ---------- Şehir mobilyası: bank, saksı, tabela, tente ---------- */
  const bench = (x: number, z: number, along: "x" | "z") => {
    const wood = lerpHex(P.trunk, 0xffffff, 0.25);
    for (let i = -1; i <= 1; i++) {
      const bx = along === "x" ? x + i : x;
      const bz = along === "z" ? z + i : z;
      const g = walk.get(key(bx, bz));
      if (g === undefined) continue;
      put(bx, g + 1, bz, "stone", wood);
      put(bx, g + 2, bz, "stone", lerpHex(wood, 0x000000, 0.2));
      walk.delete(key(bx, bz));
    }
  };

  const planter = (x: number, z: number) => {
    const g = walk.get(key(x, z));
    if (g === undefined) return;
    put(x, g + 1, z, "stone", P.stoneD);
    put(x, g + 2, z, "leaf", lerpHex(P.leafGreen, 0xffffff, rnd() * 0.3));
    walk.delete(key(x, z));
  };

  /** Renkli tenteli tezgâh (meydan pazarı / fikir standı) */
  const stall = (x: number, z: number, accent: number) => {
    const g = walk.get(key(x, z));
    if (g === undefined) return;
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const gg = walk.get(key(x + dx, z + dz));
        if (gg === undefined) continue;
        // tezgâh tahtası
        if (dz === -1 || dz === 1 || dx === -1 || dx === 1)
          put(x + dx, gg + 1, z + dz, "stone", lerpHex(P.trunk, 0xffffff, 0.3));
        // direkler
        if (Math.abs(dx) === 1 && Math.abs(dz) === 1)
          for (let y = gg + 2; y <= gg + 4; y++) put(x + dx, y, z + dz, "stone", P.stoneD);
        // tente
        put(x + dx, gg + 5, z + dz, "glow", lerpHex(accent, 0xffffff, 0.15));
        walk.delete(key(x + dx, z + dz));
      }
  };


  const free = (cx: number, cz: number, w: number, d: number) => {
    for (let x = cx - w - 1; x <= cx + w + 1; x++)
      for (let z = cz - d - 1; z <= cz + d + 1; z++) {
        if (occupied.has(key(x, z))) return false;
        if (Math.hypot(x, z) < MOAT_R + 3) return false;
      }
    return true;
  };

  for (let i = 0; i < 260; i++) {
    const a = rnd() * Math.PI * 2;
    const r = MOAT_R + 5 + rnd() * (CITY_R - MOAT_R - 5);
    const cx = Math.round(Math.cos(a) * r);
    const cz = Math.round(Math.sin(a) * r);
    const w = 3 + Math.floor(rnd() * 4);
    const d = 3 + Math.floor(rnd() * 4);
    if (!free(cx, cz, w, d)) continue;
    placeBuilding(cx, cz, w, d, 5 + Math.floor(rnd() * 12));
  }

  /* ---------- Zemin plakası (çim / kaldırım) ---------- */
  for (let x = -CITY_R - 10; x <= CITY_R + 10; x++) {
    for (let z = -CITY_R - 10; z <= CITY_R + 10; z++) {
      const d = Math.hypot(x, z);
      if (d < MOAT_R || d > CITY_R + 10) continue;
      if (occupied.has(key(x, z))) continue;
      const grass = lerpHex(P.grass, P.ground, rnd());
      put(x, -1, z, "stone", grass);
      setWalk(x, z, -1);
    }
  }

  /* ---------- Yol kenarı ağaçları ---------- */
  for (let i = 0; i < 120; i++) {
    const a = rnd() * Math.PI * 2;
    const r = MOAT_R + 4 + rnd() * (CITY_R - MOAT_R);
    const cx = Math.round(Math.cos(a) * r);
    const cz = Math.round(Math.sin(a) * r);
    if (occupied.has(key(cx, cz))) continue;
    let nearRoad = false;
    for (let dx = -3; dx <= 3 && !nearRoad; dx++)
      for (let dz = -3; dz <= 3; dz++)
        if (roadTiles.has(key(cx + dx, cz + dz))) {
          nearRoad = true;
          break;
        }
    if (!nearRoad && rnd() > 0.35) continue;
    if (!free(cx, cz, 2, 2)) continue;
    const k = rnd();
    tree(cx, cz, k > 0.82 ? "blossom" : k > 0.62 ? "pine" : "broad");
  }

  /* ---------- Meydan çevresi: ağaç kuşağı, banklar, saksılar ---------- */
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2 + 0.12;
    const r = PLAZA_R - 5;
    const cx = Math.round(Math.cos(a) * r);
    const cz = Math.round(Math.sin(a) * r);
    if (inBridgeLane(cx, cz, BRIDGE_HALF + 1)) continue;
    if (walk.get(key(cx, cz)) === undefined) continue;
    tree(cx, cz, i % 3 === 0 ? "blossom" : "broad");
  }
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + 0.3;
    const r = PLAZA_R - 9;
    const cx = Math.round(Math.cos(a) * r);
    const cz = Math.round(Math.sin(a) * r);
    if (inBridgeLane(cx, cz, BRIDGE_HALF + 1)) continue;
    bench(cx, cz, Math.abs(Math.cos(a)) > 0.7 ? "z" : "x");
  }
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 11 + rnd() * (PLAZA_R - 14);
    const cx = Math.round(Math.cos(a) * r);
    const cz = Math.round(Math.sin(a) * r);
    if (inBridgeLane(cx, cz, 2)) continue;
    planter(cx, cz);
  }

  /* ---------- Beş bölge kapısı + fikir standları ---------- */
  REGIONS.forEach((reg, idx) => {
    const dir = dirs[idx]!;
    const t = PLAZA_R - 4;
    const cx = Math.round(dir.dx * t);
    const cz = Math.round(dir.dz * t);
    const px = -dir.dz;
    const pz = dir.dx;
    // iki sütun + üstte renkli kemer/afiş
    for (const s of [-3, 3]) {
      const sx = Math.round(cx + px * s);
      const sz = Math.round(cz + pz * s);
      const g = walk.get(key(sx, sz)) ?? 0;
      for (let y = g + 1; y <= g + 7; y++) put(sx, y, sz, "stone", P.stoneA);
      walk.delete(key(sx, sz));
    }
    for (let s = -3; s <= 3; s++) {
      const sx = Math.round(cx + px * s);
      const sz = Math.round(cz + pz * s);
      const g = walk.get(key(sx, sz)) ?? 0;
      put(sx, g + 8, sz, "glow", reg.color);
      put(sx, g + 9, sz, "stone", lerpHex(reg.color, 0x000000, 0.5));
    }
    // kapı önünde bölge rengiyle standlar
    stall(Math.round(cx - dir.dx * 5 + px * 5), Math.round(cz - dir.dz * 5 + pz * 5), reg.color);
    stall(Math.round(cx - dir.dx * 5 - px * 5), Math.round(cz - dir.dz * 5 - pz * 5), reg.color);
  });

  /* ================= TASARIM BÖLGESİ ================= *
   * Meydandan Tasarım kapısından çıkan bulvarın ucunda, geniş ve ferah
   * yerleşen izometrik stüdyo mahallesi: 4 açık tavanlı tasarım ofisi,
   * ortada heykelli meydan, geniş bulvarlar, kanal ve fenerler.           */
  {
    const DC = DESIGN_CENTER;
    const S = DESIGN_HALF;
    const PAVE_A = isDay ? 0xdcd6ea : 0x777392;
    const PAVE_B = isDay ? 0xc9c2dc : 0x666280;
    const ROAD = isDay ? 0x5f5b70 : 0x3a3748;
    const LINE = isDay ? 0xf6f2e8 : 0xe8e2d2;
    const GRASS = isDay ? 0x62bd55 : 0x2c6b40;
    const HEDGE = isDay ? 0x4fa845 : 0x27603a;
    const PURPLE = 0x7c4ddb;
    const PURPLE_D = 0x55309e;
    const PINK = 0xe87ab8;
    const PINK_D = 0xc0508c;
    const LILAC = 0xcfc3ea;
    const WHITE = 0xf6f2fb;
    const DARK = 0x241f33;

    const gk = (lx: number, lz: number) => key(DC.x + lx, DC.z + lz);
    const dput = (lx: number, y: number, lz: number, kind: VoxelKind, color: number) =>
      put(DC.x + lx, y, DC.z + lz, kind, color);
    const dfloor = (lx: number, lz: number, color: number, kind: VoxelKind = "stone") => {
      dput(lx, -1, lz, kind, color);
      walk.set(gk(lx, lz), -1);
      occupied.add(gk(lx, lz));
    };
    const dblock = (lx: number, lz: number) => walk.delete(gk(lx, lz));

    const inWater = (lz: number) => lz >= S - 11;
    const inPlaza = (lx: number, lz: number) => Math.hypot(lx, lz) <= 13;
    const onRoad = (lx: number, lz: number) => Math.abs(lx) <= 7 || Math.abs(lz) <= 7;

    /* --- Bağlantı bulvarı: şehirden bölgeye, açık taş ve kesintisiz --- */
    {
      const dx = DC.x / Math.hypot(DC.x, DC.z);
      const dz = DC.z / Math.hypot(DC.x, DC.z);
      const total = Math.hypot(DC.x, DC.z);
      for (let r = MOAT_R + 6; r <= total; r += 0.4) {
        for (let w = -6; w <= 6; w++) {
          const x = Math.round(dx * r - dz * w);
          const z = Math.round(dz * r + dx * w);
          const lx = x - DC.x;
          const lz = z - DC.z;
          if (Math.abs(lx) <= S && Math.abs(lz) <= S) continue;
          const k = key(x, z);
          occupied.add(k);
          put(x, -1, z, "stone", Math.abs(w) === 0 && r % 6 < 3 ? LINE : PAVE_B);
          walk.set(k, -1);
        }
      }
    }

    /* --- Zemin: bulvarlar, kaldırım, çim, kanal --- */
    for (let lx = -S; lx <= S; lx++) {
      for (let lz = -S; lz <= S; lz++) {
        if (inWater(lz)) {
          dfloor(lx, lz, lerpHex(PAVE_A, PAVE_B, rnd()));
          continue;
        }
        if (inPlaza(lx, lz)) {
          const ring = Math.floor(Math.hypot(lx, lz)) % 3;
          dfloor(lx, lz, ring === 0 ? LILAC : ring === 1 ? PAVE_A : WHITE);
          continue;
        }
        if (onRoad(lx, lz)) {
          const center = Math.abs(lx) < 1 || Math.abs(lz) < 1;
          const dash = (Math.abs(lx) + Math.abs(lz)) % 8 < 4;
          dfloor(lx, lz, center && dash ? LINE : lerpHex(ROAD, 0x000000, rnd() * 0.07));
          continue;
        }
        const edge = Math.abs(lx) > S - 4 || Math.abs(lz) > S - 4;
        const band = Math.abs(Math.abs(lx) - 10) < 2 || Math.abs(Math.abs(lz) - 10) < 2;
        if (edge || band) {
          dfloor(lx, lz, lerpHex(GRASS, 0x000000, rnd() * 0.18));
        } else {
          dfloor(lx, lz, (lx + lz) % 4 === 0 ? PAVE_B : lerpHex(PAVE_A, 0x000000, rnd() * 0.05));
        }
      }
    }

    /* --- Rıhtım korkuluğu --- */
    for (let lx = -S; lx <= S; lx++) {
      const lz = S - 11;
      dfloor(lx, lz, PAVE_A);
      if (lx % 3 === 0) {
        dput(lx, 0, lz, "stone", WHITE);
        dput(lx, 1, lz, "stone", WHITE);
        dblock(lx, lz);
      } else {
        dput(lx, 1, lz, "stone", WHITE);
      }
    }

    /* --- Fener direği --- */
    const dlamp = (lx: number, lz: number) => {
      for (let y = 0; y <= 4; y++) dput(lx, y, lz, "stone", DARK);
      dput(lx, 5, lz, "lamp", isDay ? 0xfff2cd : 0xffd88a);
      dblock(lx, lz);
    };

    /* --- Ağaç / çalı --- */
    const dtree = (lx: number, lz: number, blossom = false) => {
      const h = 3 + Math.floor(rnd() * 2);
      for (let y = 0; y <= h; y++) dput(lx, y, lz, "stone", 0x6b4a2f);
      const base = blossom ? PINK : lerpHex(HEDGE, GRASS, rnd() * 0.5);
      for (let dx = -2; dx <= 2; dx++)
        for (let dz = -2; dz <= 2; dz++)
          for (let dy = 0; dy <= 3; dy++) {
            if (Math.hypot(dx, (dy - 1.3) * 1.2, dz) > 2.3 + rnd() * 0.4) continue;
            dput(lx + dx, h + dy, lz + dz, "leaf", lerpHex(base, dy >= 2 ? 0xffffff : 0x000000, rnd() * 0.28));
          }
      dblock(lx, lz);
    };
    const dhedge = (lx: number, lz: number) => {
      dput(lx, 0, lz, "leaf", lerpHex(HEDGE, 0xffffff, rnd() * 0.25));
      dblock(lx, lz);
    };

    /* --- Açık tavanlı tasarım stüdyosu --- */
    const studio = (
      cx: number,
      cz: number,
      wallCol: number,
      accent: number,
      doorSide: "north" | "south",
    ) => {
      const w = 16;
      const d = 13;
      const h = 9;
      const floorCol = lerpHex(wallCol, WHITE, 0.72);
      for (let x = -w; x <= w; x++) {
        for (let z = -d; z <= d; z++) {
          const lx = cx + x;
          const lz = cz + z;
          occupied.add(gk(lx, lz));
          dput(lx, -1, lz, "stone", (x + z) % 2 === 0 ? floorCol : lerpHex(floorCol, accent, 0.12));
          walk.set(gk(lx, lz), -1);
        }
      }
      // duvarlar (tavansız, izometrik kesit görünümü)
      const doorZ = doorSide === "north" ? -d : d;
      for (let x = -w; x <= w; x++) {
        for (const z of [-d, d]) {
          const lx = cx + x;
          const lz = cz + z;
          if (z === doorZ && Math.abs(x) <= 3) continue; // kapı
          for (let y = 0; y <= h; y++) {
            const glass = y >= 2 && y <= 6 && Math.abs(x) % 4 !== 0 && z === doorZ;
            dput(
              lx,
              y,
              lz,
              glass ? "glass" : "stone",
              glass
                ? lerpHex(0x9fd8f5, accent, 0.35)
                : y === h
                  ? WHITE
                  : lerpHex(wallCol, 0xffffff, rnd() * 0.1),
            );
          }
          dblock(lx, lz);
        }
      }
      for (let z = -d + 1; z <= d - 1; z++) {
        for (const x of [-w, w]) {
          const lx = cx + x;
          const lz = cz + z;
          for (let y = 0; y <= h; y++) {
            const glass = y >= 2 && y <= 6 && Math.abs(z) % 5 !== 0;
            dput(
              lx,
              y,
              lz,
              glass ? "glass" : "stone",
              glass ? lerpHex(0xbfe6fa, accent, 0.3) : y === h ? WHITE : wallCol,
            );
          }
          dblock(lx, lz);
        }
      }

      // arka duvarda dev sunum ekranı + renk paleti panosu
      const backZ = doorSide === "north" ? d - 1 : -d + 1;
      for (let x = -10; x <= 10; x++)
        for (let y = 3; y <= 7; y++) {
          const pal = x > 2;
          const col = pal
            ? lerpHex(x % 2 ? PURPLE : PINK, 0xffffff, ((y - 3) / 4) * 0.7)
            : lerpHex(DARK, accent, (x + 10) % 3 === 0 ? 0.5 : 0.06);
          dput(cx + x, y, cz + backZ, pal ? "glow" : "glass", col);
        }

      // masa + monitör + sandalye sıraları
      const rowZ = doorSide === "north" ? [-4, 4] : [-4, 4];
      for (const rz of rowZ) {
        for (let x = -11; x <= 11; x += 6) {
          const dx = cx + x;
          const dz = cz + rz;
          for (let i = -2; i <= 2; i++) {
            dput(dx + i, 0, dz, "stone", 0x8a5f3c); // masa tablası
            dblock(dx + i, dz);
          }
          dput(dx - 2, 1, dz, "glass", lerpHex(DARK, accent, 0.35)); // monitör
          dput(dx - 2, 2, dz, "glow", lerpHex(accent, WHITE, 0.35));
          dput(dx + 1, 1, dz, "glass", lerpHex(DARK, PURPLE, 0.3));
          dput(dx + 1, 2, dz, "glow", lerpHex(PINK, WHITE, 0.3));
          // sandalye
          const sz = rz < 0 ? dz - 2 : dz + 2;
          dput(dx, 0, sz, "stone", DARK);
          dput(dx, 1, sz, "stone", lerpHex(accent, 0x000000, 0.25));
          dblock(dx, sz);
        }
      }

      // orta sunum masası + hologram voxel model
      for (let x = -3; x <= 3; x++)
        for (let z = -1; z <= 1; z++) {
          dput(cx + x, 0, cz + z, "stone", 0x8a5f3c);
          dblock(cx + x, cz + z);
        }
      for (let x = -1; x <= 1; x++)
        for (let z = -1; z <= 1; z++)
          for (let y = 1; y <= 3; y++) {
            if (Math.abs(x) + Math.abs(z) + (y - 2) * 0 > 2) continue;
            dput(cx + x, y, cz + z, "glow", lerpHex(PURPLE, PINK, (y - 1) / 2));
          }

      // köşe saksıları
      for (const sx of [-w + 2, w - 2])
        for (const sz of [-d + 2, d - 2]) {
          dput(cx + sx, 0, cz + sz, "stone", PAVE_B);
          dput(cx + sx, 1, cz + sz, "leaf", lerpHex(HEDGE, 0xffffff, 0.2));
          dblock(cx + sx, cz + sz);
        }

      // dış cephe: çatı parapeti ve zemin kat vitrini önünde çalılar
      for (let x = -w; x <= w; x++) {
        dput(cx + x, h + 1, cz - d, "stone", accent);
        dput(cx + x, h + 1, cz + d, "stone", accent);
      }
      for (let z = -d; z <= d; z++) {
        dput(cx - w, h + 1, cz + z, "stone", accent);
        dput(cx + w, h + 1, cz + z, "stone", accent);
      }
    };

    studio(-27, -27, PURPLE, PINK, "south");
    studio(27, -27, PINK, PURPLE, "south");
    studio(-27, 25, LILAC, PURPLE, "north");
    studio(27, 25, PINK_D, PINK, "north");

    /* --- Meydanın ortasındaki voxel heykel --- */
    for (let x = -5; x <= 5; x++)
      for (let z = -5; z <= 5; z++) {
        if (Math.hypot(x, z) > 5.2) continue;
        dput(x, -1, z, "stone", LILAC);
        dput(x, 0, z, "stone", lerpHex(PAVE_A, WHITE, 0.5));
        dblock(x, z);
      }
    for (let y = 1; y <= 14; y++) {
      const t = y / 14;
      const r = 3.4 * Math.sin(Math.PI * (0.18 + t * 0.82));
      for (let x = -4; x <= 4; x++)
        for (let z = -4; z <= 4; z++) {
          const dd = Math.hypot(x, z);
          if (dd > r || dd < r - 1.5) continue;
          dput(x, y, z, y > 11 ? "glow" : "stone", lerpHex(PURPLE, PINK, t * 0.9 + rnd() * 0.1));
        }
    }
    for (let y = 15; y <= 17; y++) dput(0, y, 0, "glow", lerpHex(PINK, WHITE, (y - 15) / 3));

    /* --- Fenerler, ağaçlar, çalı şeritleri --- */
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      dlamp(9, i * 12);
      dlamp(-9, i * 12);
      dlamp(i * 12, 9);
      dlamp(i * 12, -9);
    }
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2 + 0.4;
      dtree(Math.round(Math.cos(ang) * 17), Math.round(Math.sin(ang) * 17), a % 2 === 0);
    }
    for (let i = -S + 6; i <= S - 6; i += 4) {
      if (Math.abs(i) < 9) continue;
      dhedge(i, 10);
      dhedge(i, -10);
      if (!inWater(i) && i < S - 12) {
        dhedge(10, i);
        dhedge(-10, i);
      }
    }
    for (let i = -S + 8; i <= S - 8; i += 9) {
      dtree(i, -S + 6, i % 2 === 0);
      if (Math.abs(i) > 12) dtree(i, S - 14);
    }
    for (let lx = -S + 5; lx <= S - 5; lx += 7) dlamp(lx, S - 12);
  }

  /* ================= ÜRETİM BÖLGESİ ================= *
   * Üretim kapısının bulvarının ucunda, turuncu-gri sanayi mahallesi:
   * bacalı fabrika holleri, silolar, konveyör hatları, robot kollar,
   * kasalar ve depo rafları. Ferah bırakmak için geniş yürüme koridorları. */
  {
    const PC = PRODUCTION_CENTER;
    const S = PRODUCTION_HALF;
    const SLAB_A = isDay ? 0xb9bcc0 : 0x6e737e;
    const SLAB_B = isDay ? 0xa5a9ae : 0x5d626d;
    const DARKG = isDay ? 0x4a4e55 : 0x30343c;
    const DEEP = isDay ? 0x33373d : 0x22252b;
    const ORANGE = 0xf28b23;
    const ORANGE_D = 0xc26410;
    const YELLOW = 0xf5c518;
    const STEEL = isDay ? 0xd6d9dc : 0x9aa0a8;
    const HOT = 0xffb54a;

    const pk = (lx: number, lz: number) => key(PC.x + lx, PC.z + lz);
    const pput = (lx: number, y: number, lz: number, kind: VoxelKind, color: number) =>
      put(PC.x + lx, y, PC.z + lz, kind, color);
    const pfloor = (lx: number, lz: number, color: number) => {
      pput(lx, -1, lz, "stone", color);
      walk.set(pk(lx, lz), -1);
      occupied.add(pk(lx, lz));
    };
    const pblock = (lx: number, lz: number) => walk.delete(pk(lx, lz));

    /* --- Bağlantı bulvarı --- */
    {
      const len = Math.hypot(PC.x, PC.z);
      const dx = PC.x / len;
      const dz = PC.z / len;
      for (let r = MOAT_R + 6; r <= len; r += 0.4) {
        for (let w = -6; w <= 6; w++) {
          const x = Math.round(dx * r - dz * w);
          const z = Math.round(dz * r + dx * w);
          if (Math.abs(x - PC.x) <= S && Math.abs(z - PC.z) <= S) continue;
          const k = key(x, z);
          occupied.add(k);
          put(x, -1, z, "stone", w === 0 && r % 6 < 3 ? YELLOW : SLAB_A);
          walk.set(k, -1);
        }
      }
    }

    /* --- Beton platform zemini + kenar bordürü --- */
    for (let lx = -S; lx <= S; lx++) {
      for (let lz = -S; lz <= S; lz++) {
        const edge = Math.abs(lx) > S - 2 || Math.abs(lz) > S - 2;
        if (edge) {
          pfloor(lx, lz, DEEP);
          pput(lx, 0, lz, "stone", DARKG);
          pblock(lx, lz);
          continue;
        }
        const tile = (Math.floor((lx + 100) / 4) + Math.floor((lz + 100) / 4)) % 2 === 0;
        const seam = (lx + 100) % 4 === 0 || (lz + 100) % 4 === 0;
        pfloor(
          lx,
          lz,
          seam ? DARKG : lerpHex(tile ? SLAB_A : SLAB_B, 0x000000, rnd() * 0.06),
        );
      }
    }

    /* --- Sarı-siyah uyarı şeritli yürüyüş koridorları --- */
    for (let lx = -S + 3; lx <= S - 3; lx++) {
      for (const lz of [-2, 2, 22, 26]) {
        pfloor(lx, lz, (lx + 100) % 6 < 3 ? YELLOW : DEEP);
      }
    }

    /* --- Fabrika holü (açık cepheli, bacalı) --- */
    const hall = (
      cx: number,
      cz: number,
      w: number,
      d: number,
      h: number,
      body: number,
      accent: number,
    ) => {
      for (let x = -w; x <= w; x++)
        for (let z = -d; z <= d; z++) {
          occupied.add(pk(cx + x, cz + z));
          pput(cx + x, -1, cz + z, "stone", DEEP);
          walk.set(pk(cx + x, cz + z), -1);
        }
      for (let x = -w; x <= w; x++)
        for (let z = -d; z <= d; z++)
          for (let y = 0; y <= h; y++) {
            const side = x === -w || x === w || z === -d || z === d;
            const top = y === h;
            if (!side && !top) continue;
            // ön cephede dev açıklık (kapı) — z === d
            if (z === d && Math.abs(x) <= w - 3 && y <= h - 3) {
              if (y === 0 && Math.abs(x) <= w - 4) continue;
              if (Math.abs(x) <= w - 4) {
                pput(cx + x, y, cz + z, "glass", lerpHex(DEEP, HOT, 0.15));
                continue;
              }
            }
            const frame = y === 0 || y === h - 1 || Math.abs(x) === w || Math.abs(z) === d;
            let col = top
              ? lerpHex(DARKG, 0x000000, rnd() * 0.2)
              : y < 2 || y > h - 3
                ? lerpHex(accent, 0xffffff, rnd() * 0.12)
                : lerpHex(body, 0x000000, rnd() * 0.12);
            if (side && !top && y > 2 && y < h - 3 && (x + z) % 3 !== 0) {
              pput(cx + x, y, cz + z, "glass", lerpHex(DEEP, STEEL, 0.35));
              continue;
            }
            if (frame && !top) col = lerpHex(accent, 0x000000, 0.08);
            pput(cx + x, y, cz + z, "stone", col);
            pblock(cx + x, cz + z);
          }
      // içeride sıcak fırın parıltısı
      for (let x = -w + 3; x <= w - 3; x += 4) {
        pput(cx + x, 0, cz + d - 2, "glow", HOT);
        pput(cx + x, 1, cz + d - 2, "glow", lerpHex(HOT, 0xffffff, 0.3));
      }
      // çatı üstü üniteleri
      for (let x = -w + 3; x <= w - 3; x += 5) {
        pput(cx + x, h + 1, cz - 2, "stone", STEEL);
        pput(cx + x, h + 1, cz + 2, "stone", DARKG);
      }
    };

    /* --- Baca + duman --- */
    const chimney = (lx: number, lz: number, hh: number) => {
      for (let y = 0; y <= hh; y++) {
        const band = y % 4 < 2;
        for (const [ox, oz] of [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ] as const) {
          pput(lx + ox, y, lz + oz, "stone", band ? ORANGE : STEEL);
        }
      }
      for (let i = 0; i < 10; i++) {
        const y = hh + 1 + i;
        const sx = Math.round(Math.sin(i * 0.8) * (1 + i * 0.35));
        const sz = Math.round(Math.cos(i * 0.6) * (i * 0.3));
        const r = i < 4 ? 0 : 1;
        for (let ax = -r; ax <= r; ax++)
          for (let az = -r; az <= r; az++)
            if (rnd() > 0.35) pput(lx + sx + ax, y, lz + sz + az, "stone", 0xf2f4f6);
      }
      pblock(lx, lz);
    };

    /* --- Silo --- */
    const silo = (lx: number, lz: number, hh: number) => {
      for (let y = 0; y <= hh; y++)
        for (let x = -2; x <= 2; x++)
          for (let z = -2; z <= 2; z++) {
            if (Math.hypot(x, z) > 2.2) continue;
            const band = y % 5 === 0 || y === hh;
            pput(lx + x, y, lz + z, "stone", band ? ORANGE : STEEL);
            pblock(lx + x, lz + z);
          }
    };

    /* --- Konveyör hattı (x ekseni boyunca) --- */
    const conveyor = (lz: number, x0: number, x1: number) => {
      for (let x = x0; x <= x1; x++) {
        pput(x, 0, lz, "stone", DEEP);
        pput(x, 0, lz - 1, "stone", DARKG);
        pput(x, 0, lz + 1, "stone", DARKG);
        pput(x, 1, lz, "stone", x % 2 === 0 ? DARKG : lerpHex(DEEP, STEEL, 0.25));
        pblock(x, lz);
        pblock(x, lz - 1);
        pblock(x, lz + 1);
        if (x % 7 === 0) {
          // taşınan kasa
          for (let y = 2; y <= 3; y++)
            for (const ox of [-1, 0, 1])
              pput(x + ox, y, lz, "stone", y === 3 ? YELLOW : lerpHex(YELLOW, 0x000000, 0.25));
        }
      }
    };

    /* --- Robot kol --- */
    const robot = (lx: number, lz: number, flip: boolean) => {
      const s = flip ? -1 : 1;
      for (let x = -1; x <= 1; x++)
        for (let z = -1; z <= 1; z++) {
          pput(lx + x, 0, lz + z, "stone", DARKG);
          pput(lx + x, 1, lz + z, "stone", ORANGE_D);
          pblock(lx + x, lz + z);
        }
      for (let y = 2; y <= 5; y++) pput(lx, y, lz, "stone", ORANGE);
      for (let i = 1; i <= 4; i++) pput(lx + s * i, 5 + Math.min(i, 2), lz, "stone", ORANGE);
      for (let i = 1; i <= 3; i++) pput(lx + s * (4 + i), 7 - i, lz, "stone", ORANGE);
      pput(lx + s * 7, 3, lz, "stone", DARKG);
      pput(lx + s * 7, 2, lz, "glow", HOT);
      // kıvılcımlar
      for (let i = 0; i < 6; i++)
        pput(
          lx + s * 7 + Math.round((rnd() - 0.5) * 3),
          1 + Math.floor(rnd() * 2),
          lz + Math.round((rnd() - 0.5) * 3),
          "glow",
          lerpHex(YELLOW, HOT, rnd()),
        );
    };

    /* --- Kasa / palet --- */
    const crate = (lx: number, lz: number, hh: number, col: number) => {
      for (let y = 0; y <= hh; y++)
        for (let x = 0; x <= 1; x++)
          for (let z = 0; z <= 1; z++)
            pput(lx + x, y, lz + z, "stone", y === hh ? lerpHex(col, 0xffffff, 0.2) : col);
      pblock(lx, lz);
      pblock(lx + 1, lz);
      pblock(lx, lz + 1);
      pblock(lx + 1, lz + 1);
    };

    /* --- Depo rafı (önü açık, içi ışıklı) --- */
    const rack = (lx: number, lz: number) => {
      const w = 3;
      const h = 5;
      for (let x = -w; x <= w; x++)
        for (let y = 0; y <= h; y++)
          for (let z = -2; z <= 2; z++) {
            const shell = x === -w || x === w || z === -2 || y === h;
            if (!shell) continue;
            pput(lx + x, y, lz + z, "stone", y === h ? STEEL : lerpHex(STEEL, 0x000000, 0.12));
            pblock(lx + x, lz + z);
          }
      for (let x = -w + 1; x <= w - 1; x++) {
        pput(lx + x, 0, lz - 1, "glow", HOT);
        pput(lx + x, 1, lz - 1, "stone", YELLOW);
        pput(lx + x, 3, lz - 1, "stone", lerpHex(ORANGE, 0x000000, 0.2));
      }
    };

    /* --- Yerleşim --- */
    hall(-24, -30, 15, 11, 13, DARKG, ORANGE);
    hall(22, -30, 14, 10, 11, DARKG, ORANGE);
    hall(0, -34, 8, 8, 15, YELLOW, ORANGE_D);

    chimney(-32, -40, 24);
    chimney(-25, -40, 28);
    chimney(28, -40, 18);
    chimney(34, -40, 16);
    silo(10, -20, 14);
    silo(16, -20, 12);

    conveyor(4, -40, 40);
    conveyor(14, -40, 40);
    for (let x = -34; x <= 34; x += 17) {
      robot(x, 8, x < 0);
      robot(x + 8, 18, x >= 0);
    }

    rack(-26, 34);
    rack(-10, 34);
    rack(8, 34);
    rack(26, 34);

    for (let i = 0; i < 26; i++) {
      const lx = Math.round((rnd() - 0.5) * 80);
      const lz = 30 + Math.round(rnd() * 14);
      if (Math.abs(lz - 34) < 4 && Math.abs((lx + 100) % 18) < 8) continue;
      crate(lx, lz, 1 + Math.floor(rnd() * 2), rnd() > 0.5 ? ORANGE : YELLOW);
    }

    /* --- Sanayi fenerleri --- */
    const plamp = (lx: number, lz: number) => {
      for (let y = 0; y <= 5; y++) pput(lx, y, lz, "stone", DARKG);
      pput(lx, 6, lz, "lamp", isDay ? 0xfff0c8 : 0xffc46b);
      pblock(lx, lz);
    };
    for (let lx = -S + 8; lx <= S - 8; lx += 14) {
      plamp(lx, -8);
      plamp(lx, 44);
    }
    for (let lz = -8; lz <= 44; lz += 13) {
      plamp(-S + 6, lz);
      plamp(S - 6, lz);
    }
  }

  /* ================= PAZAR BÖLGESİ ================= *
   * Referans görseldeki izometrik yeşil pazar meydanı: kademeli taş
   * platform, yeşil tenteli tezgâhlar, ürün kasaları, amblemli ana dükkân,
   * köşelerde amblemli sancaklar + parlayan yeşil fenerler, çiçek saksıları. */
  {
    const MC = MARKET_CENTER;
    const S = MARKET_HALF;
    const TILE_A = isDay ? 0xdedbd4 : 0xa9a7a2;
    const TILE_B = isDay ? 0xcfccc4 : 0x9a988f;
    const SEAM = isDay ? 0xb6b3aa : 0x807e78;
    const RIM = isDay ? 0x9d9a92 : 0x6d6b66;
    const LEAF = 0x69b23a;
    const LEAF_D = 0x3f7f2a;
    const LEAF_L = 0x8fd15c;
    const AWN = 0x57a83c;
    const AWN_D = 0x2f6b27;
    const CREAM = 0xefead2;
    const WOOD = 0xb98a4c;
    const WOOD_D = 0x8a6231;
    const GLOWG = 0x7ff05a;

    const mk = (lx: number, lz: number) => key(MC.x + lx, MC.z + lz);
    const mput = (lx: number, y: number, lz: number, kind: VoxelKind, color: number) =>
      put(MC.x + lx, y, MC.z + lz, kind, color);
    const mfloor = (lx: number, lz: number, color: number) => {
      mput(lx, -1, lz, "stone", color);
      walk.set(mk(lx, lz), -1);
      occupied.add(mk(lx, lz));
    };
    const mblock = (lx: number, lz: number) => walk.delete(mk(lx, lz));

    /* --- Bağlantı bulvarı --- */
    {
      const len = Math.hypot(MC.x, MC.z);
      const dx = MC.x / len;
      const dz = MC.z / len;
      for (let r = MOAT_R + 6; r <= len; r += 0.4) {
        for (let w = -6; w <= 6; w++) {
          const x = Math.round(dx * r - dz * w);
          const z = Math.round(dz * r + dx * w);
          if (Math.abs(x - MC.x) <= S && Math.abs(z - MC.z) <= S) continue;
          const k = key(x, z);
          if (occupied.has(k)) continue;
          occupied.add(k);
          put(x, -1, z, "stone", w === 0 && r % 6 < 3 ? CREAM : TILE_B);
          walk.set(k, -1);
        }
      }
    }

    /* --- Kademeli taş platform (referanstaki basamaklı kaide) --- */
    for (let lx = -S - 3; lx <= S + 3; lx++) {
      for (let lz = -S - 3; lz <= S + 3; lz++) {
        const d = Math.max(Math.abs(lx), Math.abs(lz));
        if (d > S) {
          // dış basamak kuşağı
          mput(lx, -2, lz, "stone", RIM);
          mfloor(lx, lz, lerpHex(RIM, 0xffffff, d === S + 1 ? 0.18 : 0.05));
          continue;
        }
        const tile = (Math.floor((lx + 200) / 3) + Math.floor((lz + 200) / 3)) % 2 === 0;
        const seam = (lx + 200) % 3 === 0 || (lz + 200) % 3 === 0;
        mfloor(lx, lz, seam ? SEAM : lerpHex(tile ? TILE_A : TILE_B, 0x000000, rnd() * 0.04));
      }
    }

    /* --- Ürün kasası (yeşil/krem/sarı küpler) --- */
    const produce = (lx: number, y: number, lz: number, w: number, d: number) => {
      for (let x = 0; x < w; x++)
        for (let z = 0; z < d; z++) {
          const r = rnd();
          const col = r > 0.78 ? CREAM : r > 0.62 ? 0xe8cf4a : lerpHex(LEAF, LEAF_L, rnd());
          mput(lx + x, y, lz + z, "stone", col);
        }
      // kasa kenarı
      for (let x = -1; x <= w; x++) {
        mput(lx + x, y - 1, lz - 1, "stone", WOOD_D);
        mput(lx + x, y - 1, lz + d, "stone", WOOD_D);
      }
      for (let z = -1; z <= d; z++) {
        mput(lx - 1, y - 1, lz + z, "stone", WOOD_D);
        mput(lx + w, y - 1, lz + z, "stone", WOOD_D);
      }
    };

    /* --- Tenteli tezgâh: w x d taban, yeşil-beyaz çizgili tente --- */
    const marketStall = (
      cx: number,
      cz: number,
      w: number,
      d: number,
      striped: boolean,
    ) => {
      for (let x = -w; x <= w; x++)
        for (let z = -d; z <= d; z++) {
          occupied.add(mk(cx + x, cz + z));
          mblock(cx + x, cz + z);
          // tezgâh tahtası
          mput(cx + x, 0, cz + z, "stone", (x + z) % 2 === 0 ? WOOD : WOOD_D);
          mput(cx + x, 1, cz + z, "stone", LEAF_D);
        }
      // direkler
      for (const sx of [-w, w])
        for (const sz of [-d, d])
          for (let y = 2; y <= 4; y++) mput(cx + sx, y, cz + sz, "stone", LEAF_D);
      // tente (bir yana eğimli)
      for (let x = -w - 1; x <= w + 1; x++)
        for (let z = -d - 1; z <= d + 1; z++) {
          const y = 5 + (z > d - 1 ? -1 : 0);
          const col = striped
            ? (x + 100) % 4 < 2
              ? AWN
              : CREAM
            : lerpHex(AWN, 0x000000, 0.05);
          mput(cx + x, y, cz + z, "stone", col);
        }
      // tente ön saçağı
      for (let x = -w - 1; x <= w + 1; x++)
        mput(cx + x, 4, cz + d + 1, "stone", (x + 100) % 4 < 2 ? AWN_D : lerpHex(CREAM, 0, 0.1));
      // ürünler
      produce(cx - w + 1, 2, cz - d + 1, Math.max(1, 2 * w - 1), Math.max(1, 2 * d - 1));
    };

    /* --- Amblemli ana dükkân (referanstaki arka bina) --- */
    const shop = (cx: number, cz: number) => {
      const w = 6;
      const d = 5;
      for (let x = -w; x <= w; x++)
        for (let z = -d; z <= d; z++) {
          occupied.add(mk(cx + x, cz + z));
          mblock(cx + x, cz + z);
          for (let y = 0; y <= 7; y++) {
            const side = Math.abs(x) === w || Math.abs(z) === d;
            const top = y === 7;
            if (!side && !top) continue;
            // ön cephe açıklığı
            if (z === d && Math.abs(x) <= w - 2 && y <= 4) continue;
            mput(
              cx + x,
              y,
              cz + z,
              "stone",
              top ? lerpHex(AWN, 0xffffff, 0.1) : lerpHex(LEAF_D, 0x000000, rnd() * 0.12),
            );
          }
        }
      // çizgili tente
      for (let x = -w; x <= w; x++)
        for (let z = 1; z <= 3; z++)
          mput(cx + x, 5 - (z > 2 ? 1 : 0), cz + d + z, "stone", (x + 100) % 4 < 2 ? AWN : CREAM);
      // içeride tezgâh + ürün
      for (let x = -w + 1; x <= w - 1; x++) {
        mput(cx + x, 0, cz + d - 2, "stone", WOOD);
        mput(cx + x, 1, cz + d - 2, "stone", WOOD_D);
      }
      produce(cx - w + 2, 2, cz + d - 3, 2 * w - 3, 2);
      // çatı amblemi (elmas)
      for (let x = -3; x <= 3; x++)
        for (let z = -3; z <= 3; z++) {
          const m = Math.abs(x) + Math.abs(z);
          if (m > 3) continue;
          mput(cx + x, 8, cz + z, m === 0 ? "glow" : "stone", m === 0 ? GLOWG : m < 3 ? CREAM : LEAF);
        }
      // fenerler
      mput(cx - w + 1, 5, cz + d, "lamp", isDay ? 0xfff0c8 : 0xffd27a);
      mput(cx + w - 1, 5, cz + d, "lamp", isDay ? 0xfff0c8 : 0xffd27a);
    };

    /* --- Amblemli sancak + parlayan fener direği --- */
    const bannerPole = (lx: number, lz: number) => {
      for (let y = 0; y <= 8; y++) mput(lx, y, lz, "stone", LEAF_D);
      mput(lx, 9, lz, "glow", GLOWG);
      mput(lx, 10, lz, "stone", LEAF);
      // sancak bezi
      for (let y = 2; y <= 7; y++)
        for (let s = 1; s <= 3; s++) {
          const emblem = Math.abs(s - 2) + Math.abs(y - 4.5) < 1.6;
          mput(lx + s, y, lz, "stone", emblem ? CREAM : lerpHex(LEAF, LEAF_D, (y % 2) * 0.4));
        }
      mblock(lx, lz);
    };

    /* --- Çiçekli saksı / çalı --- */
    const bush = (lx: number, lz: number, tall: boolean) => {
      mput(lx, 0, lz, "stone", WOOD_D);
      mput(lx, 1, lz, "leaf", LEAF_D);
      mput(lx, 2, lz, "leaf", lerpHex(LEAF, LEAF_L, rnd()));
      if (tall) {
        mput(lx, 3, lz, "leaf", LEAF_L);
        mput(lx, 4, lz, "leaf", CREAM);
      }
      mblock(lx, lz);
    };

    /* --- Alçak taş duvar / satış bankosu --- */
    const counter = (lx: number, lz: number, len: number, along: "x" | "z") => {
      for (let i = 0; i < len; i++) {
        const x = along === "x" ? lx + i : lx;
        const z = along === "z" ? lz + i : lz;
        mput(x, 0, z, "stone", LEAF_D);
        mput(x, 1, z, "stone", CREAM);
        mblock(x, z);
      }
    };

    /* --- Yerleşim (referans kompozisyonu) --- */
    shop(0, -18);
    marketStall(-20, -8, 4, 2, false);
    marketStall(20, -8, 4, 2, false);
    marketStall(0, 2, 6, 3, true);
    marketStall(-22, 12, 3, 2, true);
    marketStall(22, 12, 3, 2, true);

    bannerPole(-20, 18);
    bannerPole(16, 18);
    counter(-26, 24, 14, "x");
    counter(10, 24, 14, "x");

    /* --- Sarmaşıklı yeşil sütun (referanstaki köşe direkleri) --- */
    const vineColumn = (lx: number, lz: number, h = 7) => {
      for (let y = 0; y <= h; y++)
        mput(lx, y, lz, "stone", y % 2 === 0 ? LEAF_D : lerpHex(LEAF_D, 0x000000, 0.15));
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const)
        for (let y = 1; y <= h - 1; y++) {
          if (rnd() > 0.72) continue;
          mput(lx + dx, y, lz + dz, "leaf", lerpHex(LEAF, LEAF_L, rnd()));
        }
      mput(lx, h + 1, lz, "leaf", LEAF_L);
      mblock(lx, lz);
    };

    /* --- Yıldızlı tabela (merkezî tezgâhın üstü) --- */
    const starSign = (cx: number, cz: number, w: number) => {
      for (let x = -w; x <= w; x++) {
        mput(cx + x, 7, cz, "stone", LEAF_D);
        mput(cx + x, 8, cz, "stone", (x + 100) % 4 < 2 ? AWN : CREAM);
        mput(cx + x, 9, cz, "stone", LEAF_D);
      }
      for (let s = -2; s <= 2; s++) {
        const sx = cx + s * 3;
        mput(sx, 8, cz - 1, "glow", 0xf5d64a);
        mput(sx, 7, cz - 1, "stone", 0xe8c33a);
      }
    };

    /* --- Saksılı ağaççık --- */
    const potTree = (lx: number, lz: number) => {
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          mput(lx + dx, 0, lz + dz, "stone", WOOD_D);
          mblock(lx + dx, lz + dz);
        }
      for (let y = 1; y <= 3; y++) mput(lx, y, lz, "stone", WOOD_D);
      for (let dx = -2; dx <= 2; dx++)
        for (let dz = -2; dz <= 2; dz++)
          for (let dy = 0; dy <= 2; dy++) {
            if (Math.hypot(dx, (dy - 1) * 1.3, dz) > 2.1 + rnd() * 0.4) continue;
            mput(lx + dx, 4 + dy, lz + dz, "leaf", lerpHex(LEAF_D, LEAF_L, rnd()));
          }
    };

    /* --- Yeşil fener direği --- */
    const marketLamp = (lx: number, lz: number) => {
      for (let y = 0; y <= 4; y++) mput(lx, y, lz, "stone", LEAF_D);
      mput(lx, 5, lz, "glow", GLOWG);
      mput(lx, 6, lz, "stone", LEAF);
      mblock(lx, lz);
    };

    /* --- Ön giriş merdiveni (güney) --- */
    for (let i = 0; i < 3; i++) {
      const lz = S + 1 + i;
      for (let lx = -7; lx <= 7; lx++) {
        mput(lx, -2 - i, lz, "stone", RIM);
        mput(lx, -1 - i, lz, "stone", lerpHex(TILE_A, 0xffffff, 0.1));
        walk.set(mk(lx, lz), -1 - i);
        occupied.add(mk(lx, lz));
      }
    }

    starSign(0, -2, 7);
    vineColumn(-10, -20);
    vineColumn(10, -20);
    vineColumn(-28, -10);
    vineColumn(28, -10);
    vineColumn(-28, 14);
    vineColumn(28, 14);

    marketStall(-14, -20, 3, 2, true);
    marketStall(14, -20, 3, 2, true);
    counter(-6, 28, 12, "x");

    for (const [px, pz] of [
      [-30, -22],
      [30, -22],
      [-30, 2],
      [30, 2],
      [-18, 24],
      [18, 24],
      [-6, -28],
      [6, -28],
    ] as const)
      potTree(px, pz);

    for (const [lx, lz] of [
      [-26, -16],
      [26, -16],
      [-26, 20],
      [26, 20],
      [-8, 20],
      [8, 20],
    ] as const)
      marketLamp(lx, lz);

    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 12 + rnd() * (S - 6);
      const lx = Math.round(Math.cos(a) * r);
      const lz = Math.round(Math.sin(a) * r);
      if (!walk.has(mk(lx, lz))) continue;
      bush(lx, lz, rnd() > 0.55);
    }
    for (let lx = -S + 4; lx <= S - 4; lx += 12) {
      bush(lx, S - 3, false);
      bush(lx, -S + 3, true);
    }
  }

  
  /* ================= TOPLULUK BÖLGESİ ================= *
   * Referans görseldeki turkuaz izometrik topluluk platformu:
   * kademeli kare platform, önde merdiven, arkada üç panelli dev veri ekranı,
   * ortada ışıldayan kristal çeşme, üç yuvarlak toplantı masası + sandalyeler,
   * kenarlarda dokunmatik kioskler, ağaçlar, çalı şeritleri ve logo kemeri. */
  {
    const CC = COMMUNITY_CENTER;
    const S = COMMUNITY_HALF;
    const TILE_A = isDay ? 0xeef1ef : 0xb9c6c8;
    const TILE_B = isDay ? 0xdfe4e2 : 0xa5b3b6;
    const RIM = isDay ? 0x1f9aa6 : 0x156f7c;
    const TEAL = 0x1f9aa6;
    const TEAL_D = 0x11626e;
    const TEAL_L = 0x63d6da;
    const CYAN = 0x8ff2f7;
    const ICE = 0xd7fbff;
    const GRASS_C = isDay ? 0x4fae46 : 0x2a6b3c;
    const LEAFC = isDay ? 0x49a83f : 0x2c7a3d;
    const TRUNK = isDay ? 0x6b4a2f : 0x40301f;

    const ck = (lx: number, lz: number) => key(CC.x + lx, CC.z + lz);
    const cput = (lx: number, y: number, lz: number, kind: VoxelKind, color: number) =>
      put(CC.x + lx, y, CC.z + lz, kind, color);
    const cfloor = (lx: number, lz: number, y: number, color: number) => {
      cput(lx, y, lz, "stone", color);
      walk.set(ck(lx, lz), y);
      occupied.add(ck(lx, lz));
    };
    const cblock = (lx: number, lz: number) => walk.delete(ck(lx, lz));

    /* --- Bağlantı bulvarı: şehirden bölgeye --- */
    {
      const total = Math.hypot(CC.x, CC.z);
      const dx = CC.x / total;
      const dz = CC.z / total;
      for (let r = MOAT_R + 6; r <= total; r += 0.4) {
        for (let w = -6; w <= 6; w++) {
          const x = Math.round(dx * r - dz * w);
          const z = Math.round(dz * r + dx * w);
          if (Math.abs(x - CC.x) <= S + 2 && Math.abs(z - CC.z) <= S + 2) continue;
          const k = key(x, z);
          occupied.add(k);
          put(x, -1, z, "stone", Math.abs(w) === 0 && r % 7 < 3 ? ICE : TILE_B);
          walk.set(k, -1);
        }
      }
    }

    /* --- Kademeli platform: dış çim bandı, iki taş basamak, üst teras --- */
    const TOP = 2; // üst platform yüksekliği
    for (let lx = -S; lx <= S; lx++) {
      for (let lz = -S; lz <= S; lz++) {
        const m = Math.max(Math.abs(lx), Math.abs(lz));
        if (m > S) continue;
        if (m > S - 4) {
          // çevredeki çim şeridi
          cfloor(lx, lz, -1, lerpHex(GRASS_C, 0x000000, rnd() * 0.2));
          continue;
        }
        if (m > S - 7) {
          // alt basamak (turkuaz kenarlı taş)
          cput(lx, -1, lz, "stone", TILE_B);
          cfloor(lx, lz, 0, m === S - 5 ? RIM : TILE_B);
          continue;
        }
        if (m > S - 10) {
          cput(lx, -1, lz, "stone", TILE_B);
          cput(lx, 0, lz, "stone", TILE_B);
          cfloor(lx, lz, 1, m === S - 8 ? RIM : lerpHex(TILE_A, TILE_B, 0.5));
          continue;
        }
        // üst teras: açık gri fayans, hafif damalı
        for (let y = -1; y < TOP; y++) cput(lx, y, lz, "stone", TILE_B);
        const checker = (lx + lz) % 2 === 0;
        cfloor(lx, lz, TOP, checker ? TILE_A : lerpHex(TILE_A, TILE_B, 0.45));
      }
    }

    /* --- Ön cephe merdiveni (güney: +z) --- */
    for (let i = 0; i < 8; i++) {
      const lz = S - 3 - i;
      const y = Math.round((i / 7) * (TOP + 1)) - 1;
      for (let lx = -6; lx <= 6; lx++) {
        for (let yy = -1; yy <= y; yy++) cput(lx, yy, lz, "stone", yy === y ? TILE_A : TILE_B);
        walk.set(ck(lx, lz), y);
        occupied.add(ck(lx, lz));
      }
      cput(-7, y, lz, "stone", RIM);
      cput(7, y, lz, "stone", RIM);
    }

    /* --- Ana aksla üst terası birleştiren doğu rampası --- */
    for (let step = 0; step <= 10; step++) {
      const lx = S - step;
      const y = step < 4 ? -1 : step < 7 ? 0 : step < 9 ? 1 : TOP;
      for (let lz = -6; lz <= 6; lz++) {
        for (let yy = -1; yy <= y; yy++) cput(lx, yy, lz, "stone", yy === y ? TILE_A : TILE_B);
        walk.set(ck(lx, lz), y);
        occupied.add(ck(lx, lz));
      }
    }

    /* --- Turkuaz platform kenar şeridi --- */
    for (let lx = -(S - 10); lx <= S - 10; lx++) {
      for (const lz of [-(S - 10), S - 10]) {
        if (Math.abs(lx) <= 6 && lz > 0) continue;
        cput(lx, TOP + 1, lz, "stone", TEAL);
        cblock(lx, lz);
      }
    }
    for (let lz = -(S - 10); lz <= S - 10; lz++) {
      for (const lx of [-(S - 10), S - 10]) {
        cput(lx, TOP + 1, lz, "stone", TEAL);
        cblock(lx, lz);
      }
    }

    /* --- Arkada üç panelli dev veri ekranı (kuzey: -z) --- */
    {
      const baseZ = -(S - 13);
      const panels: Array<{ cx: number; z: number; w: number; h: number; chart: number }> = [
        { cx: -9, z: baseZ - 1, w: 8, h: 11, chart: 0 },
        { cx: 1, z: baseZ, w: 6, h: 9, chart: 1 },
        { cx: 10, z: baseZ + 1, w: 6, h: 7, chart: 2 },
      ];
      for (const p of panels) {
        const y0 = TOP + 4;
        // çerçeve
        for (let x = p.cx - p.w; x <= p.cx + p.w; x++) {
          for (let y = y0 - 1; y <= y0 + p.h + 1; y++) {
            const border =
              x === p.cx - p.w || x === p.cx + p.w || y === y0 - 1 || y === y0 + p.h + 1;
            if (!border) continue;
            cput(x, y, p.z, "stone", TEAL);
          }
        }
        // ekran yüzeyi + grafikler
        for (let x = p.cx - p.w + 1; x <= p.cx + p.w - 1; x++) {
          for (let y = y0; y <= y0 + p.h; y++) {
            const lx2 = x - p.cx;
            const ly = y - y0;
            let on = false;
            if (p.chart === 0) {
              const d = Math.hypot(lx2 * 0.9, (ly - p.h / 2) * 0.85);
              on = d > 2.1 && d < 3.6;
            } else if (p.chart === 1) {
              const bar = ((lx2 + 20) % 3 === 0) && ly < 2 + ((Math.abs(lx2 * 7) % 5) + 1) * 1.4;
              on = bar || ly === 0;
            } else {
              on = (lx2 + ly) % 2 === 0 && ly > 1 && ly < p.h - 1;
            }
            cput(x, y, p.z, on ? "glow" : "glass", on ? CYAN : ICE);
          }
        }
        // ekran ayakları
        for (let y = TOP + 1; y < y0 - 1; y++) {
          cput(p.cx - p.w + 2, y, p.z, "stone", TEAL_D);
          cput(p.cx + p.w - 2, y, p.z, "stone", TEAL_D);
        }
      }
      // ekran duvarının arkasındaki beyaz taş sırt
      for (let x = -(S - 11); x <= S - 11; x++) {
        for (let y = TOP + 1; y <= TOP + 4; y++) {
          cput(x, y, baseZ - 3, "stone", y === TOP + 4 ? TEAL : TILE_A);
        }
        cblock(x, baseZ - 3);
      }
    }

    /* --- Işıklı cam sütunlar (ekranın iki yanı) --- */
    const glassPillar = (lx: number, lz: number) => {
      for (let y = TOP + 1; y <= TOP + 12; y++) {
        const glow = y > TOP + 2 && y < TOP + 11;
        cput(lx, y, lz, glow ? "glow" : "stone", glow ? CYAN : TILE_A);
      }
      cput(lx, TOP + 13, lz, "stone", TEAL);
      cblock(lx, lz);
    };
    glassPillar(-19, -(S - 15));
    glassPillar(19, -(S - 15));

    /* --- Yuvarlak toplantı masası + sandalyeler --- */
    const roundTable = (cx: number, cz: number) => {
      // halka zemin deseni
      for (let x = -7; x <= 7; x++)
        for (let z = -7; z <= 7; z++) {
          const d = Math.hypot(x, z);
          if (d > 7) continue;
          if (Math.abs(d - 6.5) < 0.6) cfloor(cx + x, cz + z, TOP, lerpHex(TILE_A, TEAL_L, 0.35));
        }
      // masa tablası
      for (let x = -3; x <= 3; x++)
        for (let z = -3; z <= 3; z++) {
          const d = Math.hypot(x, z);
          if (d > 3.4) continue;
          const inner = d < 1.8;
          cput(cx + x, TOP + 1, cz + z, inner ? "glow" : "stone", inner ? CYAN : ICE);
          cblock(cx + x, cz + z);
        }
      // sandalyeler
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.35;
        const sx = cx + Math.round(Math.cos(a) * 5);
        const sz = cz + Math.round(Math.sin(a) * 5);
        cput(sx, TOP + 1, sz, "stone", TEAL);
        cput(sx, TOP + 2, sz, "stone", TEAL_D);
        cblock(sx, sz);
      }
    };
    roundTable(-17, -2);
    roundTable(17, -2);
    roundTable(0, 16);

    /* --- Merkezdeki kristal çeşme --- */
    {
      for (let x = -9; x <= 9; x++)
        for (let z = -9; z <= 9; z++) {
          const d = Math.hypot(x, z);
          if (d > 9) continue;
          if (d > 6.5) {
            if (Math.abs(d - 8) < 0.7) cfloor(x, z, TOP, lerpHex(TILE_A, TEAL_L, 0.4));
            continue;
          }
          cput(x, TOP + 1, z, "stone", d > 5 ? TEAL : lerpHex(ICE, TEAL_L, 0.3));
          walk.set(ck(x, z), TOP + 1);
          if (d <= 4.6) {
            cput(x, TOP + 2, z, "water", lerpHex(0x2fbfd8, CYAN, rnd() * 0.7));
            cblock(x, z);
          }
        }
      // basamaklı kaide
      for (let x = -3; x <= 3; x++)
        for (let z = -3; z <= 3; z++) {
          const d = Math.hypot(x, z);
          if (d > 3.2) continue;
          cput(x, TOP + 3, z, "stone", lerpHex(ICE, TEAL_L, 0.25));
          cblock(x, z);
        }
      // ışıldayan çekirdek: gradyanlı logo küpü ("N")
      {
        const LOGO_CYAN = 0x0fc6d8;
        const LOGO_BLUE = 0x2b4bf5;
        const WHITE = 0xf7fbff;
        // 5 geniş x 7 yüksek "N" maskesi (üstten alta)
        const N = [
          "X...X",
          "XX..X",
          "XX..X",
          "X.X.X",
          "X..XX",
          "X..XX",
          "X...X",
        ];
        const on = (col: number, row: number) => N[row]?.[col] === "X";
        const baseY = TOP + 4;
        for (let row = 0; row < 7; row++) {
          const y = baseY + (6 - row);
          for (let x = -2; x <= 2; x++)
            for (let z = -2; z <= 2; z++) {
              const t = (x + 2) / 4;
              const grad = lerpHex(LOGO_CYAN, LOGO_BLUE, t);
              // yüzlerde beyaz "N", içeride gradyan
              const frontBack = Math.abs(z) === 2 && on(x + 2, row);
              const sides = Math.abs(x) === 2 && on(2 - z + 0, row);
              const isLetter = frontBack || sides;
              cput(x, y, z, "glow", isLetter ? WHITE : grad);
            }
        }
        // çekirdeğin tepesindeki ışık hüzmesi
        for (let y = 7; y <= 9; y++)
          cput(0, baseY + y, 0, "glow", lerpHex(LOGO_CYAN, ICE, (y - 7) / 2));
      }

    }

    /* --- Dokunmatik kiosk terminalleri --- */
    const kiosk = (lx: number, lz: number, face: 1 | -1) => {
      cput(lx, TOP + 1, lz, "stone", TEAL_D);
      cput(lx, TOP + 2, lz, "stone", TEAL);
      cput(lx, TOP + 3, lz, "glow", CYAN);
      cput(lx, TOP + 4, lz, "glow", lerpHex(CYAN, ICE, 0.4));
      cput(lx + face, TOP + 4, lz, "glass", ICE);
      cblock(lx, lz);
    };
    for (const lz of [-8, 2, 12]) {
      kiosk(-(S - 12), lz, 1);
      kiosk(S - 12, lz, -1);
    }

    /* --- Logo kemeri (batı girişi) --- */
    {
      const lx = -(S - 11);
      for (const lz of [-16, -8]) {
        for (let y = TOP + 1; y <= TOP + 9; y++) cput(lx, y, lz, "stone", TILE_A);
        cblock(lx, lz);
      }
      for (let lz = -16; lz <= -8; lz++) {
        cput(lx, TOP + 10, lz, "stone", TEAL);
        cput(lx, TOP + 11, lz, "stone", TEAL_D);
      }
      // kemerin üstünde parlayan topluluk simgesi
      for (let lz = -14; lz <= -10; lz++)
        for (let y = TOP + 12; y <= TOP + 15; y++) {
          const on = (lz + y) % 2 === 0;
          cput(lx, y, lz, on ? "glow" : "stone", on ? CYAN : TEAL);
        }
    }

    /* --- Logo sütunu (doğu) --- */
    {
      const lx = S - 11;
      const lz = -14;
      for (let y = TOP + 1; y <= TOP + 8; y++) cput(lx, y, lz, "stone", TILE_A);
      for (let x = -2; x <= 2; x++)
        for (let z = -2; z <= 2; z++)
          for (let y = 0; y <= 4; y++) {
            const shell =
              Math.abs(x) === 2 || Math.abs(z) === 2 || y === 0 || y === 4;
            if (!shell) continue;
            cput(lx + x, TOP + 9 + y, lz + z, "stone", TEAL);
          }
      cput(lx, TOP + 11, lz, "glow", CYAN);
      cblock(lx, lz);
    }

    /* --- Ağaçlar ve çalı şeritleri --- */
    const ctree = (lx: number, lz: number, y: number) => {
      const h = 3 + Math.floor(rnd() * 2);
      for (let i = 1; i <= h; i++) cput(lx, y + i, lz, "stone", TRUNK);
      for (let dx = -2; dx <= 2; dx++)
        for (let dz = -2; dz <= 2; dz++)
          for (let dy = 0; dy <= 3; dy++) {
            if (Math.hypot(dx, (dy - 1.3) * 1.2, dz) > 2.2 + rnd() * 0.4) continue;
            cput(
              lx + dx,
              y + h + dy,
              lz + dz,
              "leaf",
              lerpHex(LEAFC, dy >= 2 ? 0xffffff : 0x000000, rnd() * 0.28),
            );
          }
      cblock(lx, lz);
    };
    // üst terasın köşelerinde ağaçlar
    for (const [tx, tz] of [
      [-(S - 13), -(S - 13)],
      [S - 13, -(S - 13)],
      [-(S - 13), S - 14],
      [S - 13, S - 14],
      [-24, 14],
      [24, 14],
    ] as const) {
      ctree(tx, tz, TOP);
    }
    // dış çim bandında ağaçlar ve çalılar
    for (let i = -(S - 6); i <= S - 6; i += 7) {
      if (Math.abs(i) < 8) continue;
      ctree(i, S - 2, -1);
      ctree(i, -(S - 2), -1);
      cput(-(S - 2), 0, i, "leaf", lerpHex(LEAFC, 0xffffff, rnd() * 0.25));
      cput(S - 2, 0, i, "leaf", lerpHex(LEAFC, 0xffffff, rnd() * 0.25));
      cblock(-(S - 2), i);
      cblock(S - 2, i);
    }

    /* --- Küçük ışık direkleri (çim bandı) --- */
    const clamp2 = (lx: number, lz: number) => {
      for (let y = 0; y <= 2; y++) cput(lx, y, lz, "stone", TEAL_D);
      cput(lx, 3, lz, "lamp", CYAN);
      cblock(lx, lz);
    };
    for (let i = -(S - 8); i <= S - 8; i += 11) {
      clamp2(i, S - 5);
      clamp2(i, -(S - 5));
    }

    /* --- Teras kenarındaki bitki tavaları --- */
    const planter = (lx: number, lz: number, len: number, along: "x" | "z") => {
      for (let i = 0; i < len; i++) {
        const x = along === "x" ? lx + i : lx;
        const z = along === "z" ? lz + i : lz;
        cput(x, TOP + 1, z, "stone", TILE_A);
        cput(x, TOP + 2, z, "leaf", lerpHex(LEAFC, 0xffffff, rnd() * 0.3));
        cblock(x, z);
      }
    };
    planter(-(S - 12), -(S - 16), 10, "x");
    planter(S - 22, -(S - 16), 10, "x");
    planter(-(S - 12), S - 18, 9, "x");
    planter(S - 21, S - 18, 9, "x");

    /* --- Bank sıraları (çeşmenin çevresi) --- */
    const bench = (lx: number, lz: number, len: number, along: "x" | "z") => {
      for (let i = 0; i < len; i++) {
        const x = along === "x" ? lx + i : lx;
        const z = along === "z" ? lz + i : lz;
        cput(x, TOP + 1, z, "stone", TEAL_D);
        cput(x, TOP + 2, z, "stone", TEAL_L);
        cblock(x, z);
      }
    };
    bench(-5, -12, 10, "x");
    bench(-5, 11, 10, "x");
    bench(-12, -4, 8, "z");
    bench(12, -4, 8, "z");

    /* --- Ek ışık sütunları ve kioskler --- */
    glassPillar(-27, -(S - 22));
    glassPillar(27, -(S - 22));
    for (const lz of [-18, 20]) {
      kiosk(-(S - 12), lz, 1);
      kiosk(S - 12, lz, -1);
    }

    /* --- Terasın ortasına yönlendirici turkuaz halka çizgileri --- */
    for (let a = 0; a < 360; a += 2) {
      const rad = (a * Math.PI) / 180;
      for (const r of [12, 21]) {
        const lx = Math.round(Math.cos(rad) * r);
        const lz = Math.round(Math.sin(rad) * r);
        if (walk.get(ck(lx, lz)) !== TOP) continue;
        cfloor(lx, lz, TOP, lerpHex(TILE_A, TEAL_L, 0.28));
      }
    }

  }

  /* ================= BAŞARI BÖLGESİ ================= *
   * Referanstaki açık cepheli anıt salonu: sütunlu taş galeri, altın
   * sancaklar ve spotlar, merkezde kademeli kaide üstünde dev kupa,
   * iki yanda başarı ürünleri ve önde kırmızı tören halısı. */
  {
    const AC = ACHIEVEMENT_CENTER;
    const S = ACHIEVEMENT_HALF;
    const MARBLE = isDay ? 0xe9e4d9 : 0xaaa79f;
    const MARBLE_D = isDay ? 0xc9c3b7 : 0x77756f;
    const MARBLE_L = isDay ? 0xf8f5ed : 0xc7c5bd;
    const GOLD = 0xffc51f;
    const GOLD_D = 0xc98700;
    const GOLD_L = 0xffe56d;
    const RED = 0xb6251f;
    const RED_D = 0x741713;
    const SCREEN = 0x16a9d1;
    const DARK = 0x38332c;

    const ak = (lx: number, lz: number) => key(AC.x + lx, AC.z + lz);
    const aput = (lx: number, y: number, lz: number, kind: VoxelKind, color: number) =>
      put(AC.x + lx, y, AC.z + lz, kind, color);
    const afloor = (lx: number, lz: number, y: number, color: number) => {
      aput(lx, y, lz, "stone", color);
      walk.set(ak(lx, lz), y);
      occupied.add(ak(lx, lz));
    };
    const ablock = (lx: number, lz: number) => walk.delete(ak(lx, lz));

    /* açık taş bağlantı bulvarı */
    {
      const len = Math.hypot(AC.x, AC.z);
      const dx = AC.x / len;
      const dz = AC.z / len;
      for (let r = MOAT_R + 6; r <= len; r += 0.35) {
        for (let w = -6; w <= 6; w++) {
          const x = Math.round(dx * r - dz * w);
          const z = Math.round(dz * r + dx * w);
          if (Math.abs(x - AC.x) <= S && Math.abs(z - AC.z) <= S) continue;
          put(x, 0, z, "stone", w === 0 && r % 7 < 3 ? GOLD_L : MARBLE_D);
          walk.set(key(x, z), 0);
          occupied.add(key(x, z));
        }
      }
    }

    /* kare avlu ve yükseltilmiş salon zemini */
    for (let lx = -S; lx <= S; lx++) {
      for (let lz = -S; lz <= S; lz++) {
        const edge = Math.max(Math.abs(lx), Math.abs(lz));
        const y = edge > S - 4 ? -1 : edge > S - 7 ? 0 : 1;
        for (let yy = -1; yy <= y; yy++) aput(lx, yy, lz, "stone", yy === y ? MARBLE : MARBLE_D);
        afloor(lx, lz, y, (lx + lz) % 5 === 0 ? MARBLE_L : MARBLE);
      }
    }

    /* güney giriş rampası ve kırmızı tören halısı */
    for (let lz = S; lz >= -4; lz--) {
      const y = lz > S - 4 ? -1 : lz > S - 7 ? 0 : 1;
      for (let lx = -5; lx <= 5; lx++) afloor(lx, lz, y, Math.abs(lx) <= 4 ? RED : MARBLE_L);
    }
    for (let lz = -4; lz <= 18; lz++)
      for (let lx = -4; lx <= 4; lx++) afloor(lx, lz, 1, lz % 5 === 0 ? RED_D : RED);

    /* arka ve yan duvarlar, klasik sütunlar */
    const column = (lx: number, lz: number) => {
      for (let y = 2; y <= 18; y++) {
        const wide = y <= 3 || y >= 16;
        for (let dx = wide ? -1 : 0; dx <= (wide ? 1 : 0); dx++)
          for (let dz = wide ? -1 : 0; dz <= (wide ? 1 : 0); dz++)
            aput(lx + dx, y, lz + dz, "stone", y % 4 === 0 ? MARBLE_D : MARBLE_L);
      }
      ablock(lx, lz);
    };
    for (let lx = -S + 5; lx <= S - 5; lx++)
      for (let y = 2; y <= 20; y++) {
        if (y < 16 && lx % 9 !== 0) continue;
        aput(lx, y, -S + 5, "stone", y === 19 ? GOLD_D : MARBLE_D);
      }
    for (const lx of [-31, -21, -11, 11, 21, 31]) column(lx, -S + 3);
    for (const lz of [-29, -18, -7, 7, 18]) {
      column(-S + 3, lz);
      column(S - 3, lz);
    }
    for (let lx = -S + 4; lx <= S - 4; lx++) {
      aput(lx, 20, -S + 4, "stone", MARBLE_L);
      aput(lx, 21, -S + 4, "stone", lx % 6 < 3 ? GOLD_D : MARBLE_D);
    }

    /* altın sancaklar ve rozetler */
    const banner = (lx: number) => {
      for (let x = -3; x <= 3; x++)
        for (let y = 8; y <= 17; y++) {
          const notch = y < 10 && Math.abs(x) > y - 8;
          if (!notch) aput(lx + x, y, -S + 2, "stone", x === 0 || y % 5 === 0 ? GOLD_L : GOLD_D);
        }
      for (let x = -2; x <= 2; x++)
        for (let y = 11; y <= 15; y++)
          if (Math.hypot(x, y - 13) < 2.4) aput(lx + x, y, -S + 1, "glow", GOLD);
    };
    for (const lx of [-24, -8, 8, 24]) banner(lx);

    /* merkez kaidesi */
    for (let tier = 0; tier < 4; tier++) {
      const r = 10 - tier * 2;
      for (let x = -r; x <= r; x++)
        for (let z = -r; z <= r; z++) {
          aput(x, 2 + tier, z - 6, "stone", tier % 2 === 0 ? MARBLE_L : GOLD_D);
          ablock(x, z - 6);
        }
    }
    for (let y = 6; y <= 10; y++)
      for (let x = -3; x <= 3; x++)
        for (let z = -3; z <= 3; z++) aput(x, y, z - 6, "stone", y === 10 ? GOLD : DARK);

    /* büyük voxel kupa: gövde, kâse, kulplar ve kapak */
    for (let y = 11; y <= 22; y++) {
      const r = y < 15 ? 2 : y < 19 ? 4 : 6 - Math.floor((y - 19) / 2);
      for (let x = -r; x <= r; x++)
        for (let z = -r; z <= r; z++) {
          const d = Math.hypot(x, z);
          if (d > r + 0.3 || (y >= 17 && d < Math.max(0, r - 1.5))) continue;
          aput(x, y, z - 6, y === 22 ? "glow" : "stone", lerpHex(GOLD_D, GOLD_L, (y - 11) / 11));
        }
    }
    for (const side of [-1, 1])
      for (let y = 15; y <= 20; y++) {
        const reach = 6 + Math.round(Math.sin(((y - 15) / 5) * Math.PI) * 4);
        aput(side * reach, y, -6, "stone", GOLD);
        aput(side * (reach - 1), y, -6, "stone", GOLD_D);
      }
    for (let x = -4; x <= 4; x++)
      for (let z = -4; z <= 4; z++)
        if (Math.hypot(x, z) <= 4.2) aput(x, 23, z - 6, "glow", GOLD_L);

    /* ürün başarı kaideleri: kamera, dizüstü, telefon, yazıcı */
    const pedestal = (lx: number, lz: number, kind: number) => {
      for (let x = -4; x <= 4; x++)
        for (let z = -4; z <= 4; z++)
          for (let y = 2; y <= 6; y++)
            if (y === 6 || Math.abs(x) === 4 || Math.abs(z) === 4)
              aput(lx + x, y, lz + z, "stone", y === 6 ? MARBLE_L : MARBLE_D);
      if (kind === 0) {
        for (let x = -3; x <= 3; x++) for (let y = 7; y <= 10; y++) aput(lx + x, y, lz, "stone", DARK);
        aput(lx, 8, lz + 1, "glass", SCREEN);
      } else if (kind === 1) {
        for (let x = -3; x <= 3; x++) for (let y = 7; y <= 10; y++) aput(lx + x, y, lz, "stone", y === 10 ? MARBLE_D : SCREEN);
        for (let x = -3; x <= 3; x++) aput(lx + x, 7, lz + 2, "stone", MARBLE_L);
      } else if (kind === 2) {
        for (let y = 7; y <= 13; y++) for (let x = -2; x <= 2; x++) aput(lx + x, y, lz, y < 12 ? "glow" : "stone", y < 12 ? SCREEN : DARK);
      } else {
        for (let x = -3; x <= 3; x++) for (let z = -2; z <= 2; z++) for (let y = 7; y <= 10; y++) aput(lx + x, y, lz + z, "stone", y === 10 ? MARBLE_L : MARBLE_D);
      }
      for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) ablock(lx + x, lz + z);
    };
    pedestal(-24, 13, 0);
    pedestal(-10, 18, 1);
    pedestal(10, 18, 2);
    pedestal(24, 13, 3);

    /* salon spotları ve bahçe ağaçları */
    for (const lx of [-28, -14, 0, 14, 28]) {
      aput(lx, 19, -S + 1, "lamp", GOLD_L);
      for (let y = 2; y <= 5; y++) aput(lx, y, 29, "stone", DARK);
      aput(lx, 6, 29, "lamp", GOLD_L);
      ablock(lx, 29);
    }
    for (const [lx, lz] of [[-32, 28], [32, 28], [-32, -27], [32, -27]] as const) {
      for (let y = 2; y <= 6; y++) aput(lx, y, lz, "stone", 0x6b4a2f);
      for (let dx = -3; dx <= 3; dx++)
        for (let dz = -3; dz <= 3; dz++)
          for (let dy = 0; dy <= 4; dy++)
            if (Math.hypot(dx, dz, (dy - 2) * 1.1) < 3.5)
              aput(lx + dx, 6 + dy, lz + dz, "leaf", lerpHex(P.leafGreen, 0xffffff, rnd() * 0.2));
      ablock(lx, lz);
    }
  }

  /* ================= FİKİR BÖLGESİ ================= *
   * Referans görseldeki mor izometrik fikir meydanı: girişte dev taş kemer,
   * ortada hologram ampul çeşmesi (turkuaz su), doğuda ışıklı fikir panoları
   * dizisi, yanlarda ampul amblemli sancaklar, kenarlarda kanal, köprü,
   * fenerler ve kioskler.                                                  */
  {
    const IC = IDEA_CENTER;
    const S = IDEA_HALF;
    const PAVE_A = isDay ? 0xe6def5 : 0x6f5f96;
    const PAVE_B = isDay ? 0xd3c8ea : 0x5d4e82;
    const PAVE_D = isDay ? 0xb9aad8 : 0x453a63;
    const STONE_L = isDay ? 0xefe9f7 : 0x9a8dc0;
    const VIOLET = 0x8b46d8;
    const VIOLET_D = 0x4c2585;
    const VIOLET_L = 0xc79cff;
    const CYAN = 0x35d6ff;
    const ICE = 0xd8f7ff;
    const GOLD = 0xffd166;
    const DARK = 0x241a3a;
    const GRASS_I = isDay ? 0x5cb54f : 0x27603a;

    const ik = (lx: number, lz: number) => key(IC.x + lx, IC.z + lz);
    const iput = (lx: number, y: number, lz: number, kind: VoxelKind, color: number) =>
      put(IC.x + lx, y, IC.z + lz, kind, color);
    const ifloor = (lx: number, lz: number, y: number, color: number) => {
      iput(lx, y, lz, "stone", color);
      walk.set(ik(lx, lz), y);
      occupied.add(ik(lx, lz));
    };
    const iblock = (lx: number, lz: number) => walk.delete(ik(lx, lz));

    /* --- Bağlantı bulvarı: şehirden bölgeye --- */
    {
      const total = Math.hypot(IC.x, IC.z);
      const dx = IC.x / total;
      const dz = IC.z / total;
      for (let r = MOAT_R + 6; r <= total; r += 0.4) {
        for (let w = -6; w <= 6; w++) {
          const x = Math.round(dx * r - dz * w);
          const z = Math.round(dz * r + dx * w);
          if (Math.abs(x - IC.x) <= S + 2 && Math.abs(z - IC.z) <= S + 2) continue;
          const k = key(x, z);
          occupied.add(k);
          put(x, -1, z, "stone", Math.abs(w) === 0 && r % 7 < 3 ? VIOLET_L : PAVE_B);
          walk.set(k, -1);
        }
      }
    }

    /* --- Zemin: mor taş meydan, kenarlarda kanal ve çim şeridi --- */
    const inCanal = (lx: number, lz: number) =>
      Math.abs(lz) > S - 7 && lx > -S + 6 && lx < S - 6;
    for (let lx = -S; lx <= S; lx++) {
      for (let lz = -S; lz <= S; lz++) {
        if (inCanal(lx, lz)) {
          ifloor(lx, lz, 0, lerpHex(PAVE_B, PAVE_D, rnd()));
          continue;
        }
        const m = Math.max(Math.abs(lx), Math.abs(lz));
        if (m > S - 3) {
          ifloor(lx, lz, 0, lerpHex(GRASS_I, 0x000000, rnd() * 0.2));
          continue;
        }
        const d = Math.hypot(lx, lz);
        if (d <= 15) {
          const ring = Math.floor(d) % 3;
          ifloor(lx, lz, 0, ring === 0 ? VIOLET_L : ring === 1 ? PAVE_A : STONE_L);
          continue;
        }
        const grid = lx % 6 === 0 || lz % 6 === 0;
        ifloor(lx, lz, 0, grid ? PAVE_D : lerpHex(PAVE_A, PAVE_B, rnd() * 0.6));
      }
    }

    /* --- Fener direği --- */
    const ilamp = (lx: number, lz: number, col = GOLD) => {
      for (let y = 1; y <= 4; y++) iput(lx, y, lz, "stone", DARK);
      iput(lx, 5, lz, "lamp", col);
      iblock(lx, lz);
    };

    /* --- Giriş kemeri (batı, şehre bakan yön) --- */
    {
      const lx = -S + 8;
      for (const lz of [-9, 9]) {
        for (let y = 1; y <= 14; y++)
          for (let t = -2; t <= 2; t++)
            for (let w = -2; w <= 2; w++) {
              if (Math.abs(t) === 2 && Math.abs(w) === 2) continue;
              iput(lx + t, y, lz + w, "stone", y % 4 === 0 ? PAVE_D : STONE_L);
            }
        for (let t = -2; t <= 2; t++) for (let w = -2; w <= 2; w++) iblock(lx + t, lz + w);
      }
      // kemer tacı
      for (let lz = -11; lz <= 11; lz++) {
        const h = 15 + Math.round(Math.cos((lz / 11) * Math.PI * 0.5) * 2);
        for (let y = 15; y <= h + 2; y++)
          for (let t = -2; t <= 2; t++) iput(lx + t, y, lz, "stone", y === h + 2 ? PAVE_D : STONE_L);
      }
      // kemerin altındaki ışıklı yazı bandı
      for (let lz = -10; lz <= 10; lz++) iput(lx - 2, 18, lz, "glow", VIOLET_L);
      for (let lz = -10; lz <= 10; lz += 2) iput(lx - 2, 19, lz, "glow", CYAN);
      // kemer içindeki kavis (geçit boşluğu)
      for (let lz = -8; lz <= 8; lz++) {
        const top = 14 - Math.round(Math.sqrt(Math.max(0, 64 - lz * lz)) * 0.45);
        for (let y = top; y <= 14; y++)
          for (let t = -2; t <= 2; t++) iput(lx + t, y, lz, "stone", STONE_L);
      }
      ilamp(lx - 4, -13, VIOLET_L);
      ilamp(lx - 4, 13, VIOLET_L);
    }

    /* --- Işıklı fikir panosu (dikey ekran) --- */
    const board = (lx: number, lz: number, w: number, h: number, seed: number) => {
      const y0 = 4;
      for (let z = lz - w; z <= lz + w; z++)
        for (let y = y0 - 1; y <= y0 + h + 1; y++) {
          const border = z === lz - w || z === lz + w || y === y0 - 1 || y === y0 + h + 1;
          if (border) iput(lx, y, z, "stone", VIOLET);
        }
      for (let z = lz - w + 1; z <= lz + w - 1; z++)
        for (let y = y0; y <= y0 + h; y++) {
          const rz = z - lz;
          const ry = y - y0;
          const headline = ry >= h - 2;
          const row = ry % 3 === 1 && Math.abs(rz) < w - 2;
          const card = (rz + seed) % 4 !== 0 && ry % 4 !== 0;
          const on = headline || (row && card);
          iput(lx, y, z, on ? "glow" : "glass", on ? (headline ? CYAN : VIOLET_L) : ICE);
        }
      // direkler
      for (const z of [lz - w, lz + w]) {
        for (let y = 1; y < y0 - 1; y++) iput(lx, y, z, "stone", DARK);
        iblock(lx, z);
      }
    };

    /* doğu cephesindeki pano dizisi (referanstaki fikir panoları) */
    board(S - 6, -22, 6, 9, 0);
    board(S - 6, -8, 5, 11, 1);
    board(S - 6, 7, 5, 10, 2);
    board(S - 6, 21, 6, 8, 3);
    /* kuzey cephesinde iki büyük pano */
    for (const lz of [-S + 7]) {
      for (const lx of [-14, 14]) {
        const y0 = 4;
        for (let x = lx - 7; x <= lx + 7; x++)
          for (let y = y0 - 1; y <= y0 + 10; y++) {
            const border = x === lx - 7 || x === lx + 7 || y === y0 - 1 || y === y0 + 10;
            if (border) {
              iput(x, y, lz, "stone", VIOLET);
              continue;
            }
            const on = (x + y) % 3 !== 0 && y > y0 + 1;
            iput(x, y, lz, on ? "glow" : "glass", on ? VIOLET_L : ICE);
          }
        for (const x of [lx - 7, lx + 7]) {
          for (let y = 1; y < y0 - 1; y++) iput(x, y, lz, "stone", DARK);
          iblock(x, lz);
        }
      }
    }

    /* --- Ampul amblemli sancaklar --- */
    const banner = (lx: number, lz: number) => {
      for (let y = 1; y <= 12; y++) iput(lx, y, lz, "stone", DARK);
      for (let y = 5; y <= 11; y++)
        for (let w = -2; w <= 2; w++) {
          const ry = y - 5;
          const bulb = Math.hypot(w, ry - 4) < 1.8 || (Math.abs(w) <= 1 && ry >= 1 && ry <= 2);
          iput(lx, y, lz + w, bulb ? "glow" : "stone", bulb ? GOLD : VIOLET_D);
        }
      iblock(lx, lz);
    };
    banner(-S + 16, -S + 12);
    banner(-S + 16, S - 12);
    banner(S - 16, -S + 12);
    banner(S - 16, S - 12);

    /* --- Hologram ampul çeşmesi --- */
    {
      for (let lx = -8; lx <= 8; lx++)
        for (let lz = -8; lz <= 8; lz++) {
          const d = Math.hypot(lx, lz);
          if (d > 8) continue;
          occupied.add(ik(lx, lz));
          if (d > 6.4) {
            iput(lx, 1, lz, "stone", STONE_L);
            iput(lx, 2, lz, "stone", VIOLET);
            iblock(lx, lz);
            continue;
          }
          iput(lx, 1, lz, "water", lerpHex(0x1f7fd0, CYAN, rnd() * 0.8));
          iblock(lx, lz);
        }
      // ampul gövdesi
      for (let y = 3; y <= 14; y++) {
        const t = (y - 3) / 11;
        const r = y < 6 ? 1.4 + t * 1.2 : 3.4 - Math.pow((y - 8) / 6, 2) * 2.2;
        for (let lx = -4; lx <= 4; lx++)
          for (let lz = -4; lz <= 4; lz++) {
            const d = Math.hypot(lx, lz);
            if (d > r) continue;
            const shell = d > r - 1.1;
            iput(lx, y, lz, shell ? "glass" : "glow", shell ? VIOLET_L : ICE);
          }
      }
      for (let y = 2; y <= 3; y++)
        for (let lx = -1; lx <= 1; lx++)
          for (let lz = -1; lz <= 1; lz++) iput(lx, y, lz, "glow", CYAN);
    }

    /* --- Fikir kioskleri --- */
    const kiosk = (lx: number, lz: number) => {
      for (let y = 1; y <= 2; y++)
        for (let x = -1; x <= 1; x++)
          for (let z = -1; z <= 1; z++) iput(lx + x, y, lz + z, "stone", VIOLET_D);
      for (let y = 3; y <= 5; y++)
        for (let x = -1; x <= 1; x++) iput(lx + x, y, lz, "glow", y === 5 ? CYAN : VIOLET_L);
      for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) iblock(lx + x, lz + z);
    };
    kiosk(-18, -14);
    kiosk(-18, 14);
    kiosk(18, -18);
    kiosk(18, 18);
    kiosk(-26, 0);

    /* --- Fenerler ve ağaçlar --- */
    for (const lz of [-26, -13, 13, 26]) {
      ilamp(-S + 26, lz);
      ilamp(S - 14, lz, VIOLET_L);
    }
    for (const [lx, lz] of [
      [-S + 12, -S + 26],
      [-S + 12, S - 26],
      [S - 24, -S + 10],
      [S - 24, S - 10],
    ] as const) {
      for (let y = 1; y <= 5; y++) iput(lx, y, lz, "stone", 0x5a3f2a);
      for (let dx = -3; dx <= 3; dx++)
        for (let dz = -3; dz <= 3; dz++)
          for (let dy = 0; dy <= 4; dy++)
            if (Math.hypot(dx, dz, (dy - 2) * 1.1) < 3.4)
              iput(lx + dx, 5 + dy, lz + dz, "leaf", lerpHex(P.leafGreen, VIOLET_L, rnd() * 0.25));
      iblock(lx, lz);
    }

    /* --- Beyin fırtınası masaları (tabure + hologram küp) --- */
    const brainTable = (lx: number, lz: number) => {
      for (let x = -2; x <= 2; x++)
        for (let z = -2; z <= 2; z++) {
          if (Math.abs(x) === 2 && Math.abs(z) === 2) continue;
          iput(lx + x, 3, lz + z, "stone", VIOLET_D);
          iblock(lx + x, lz + z);
        }
      for (const [x, z] of [
        [-2, -2],
        [2, -2],
        [-2, 2],
        [2, 2],
      ] as const) {
        for (let y = 1; y <= 2; y++) iput(lx + x, y, lz + z, "stone", DARK);
        iput(lx + x, 3, lz + z, "glow", VIOLET_L);
        iblock(lx + x, lz + z);
      }
      for (let y = 5; y <= 7; y++)
        for (let x = -1; x <= 1; x++)
          for (let z = -1; z <= 1; z++)
            if (Math.abs(x) + Math.abs(z) < 2 || y === 6)
              iput(lx + x, y, lz + z, "glow", y === 7 ? GOLD : CYAN);
    };
    brainTable(-14, -22);
    brainTable(14, -22);
    brainTable(-14, 22);
    brainTable(14, 22);
    brainTable(-30, -22);
    brainTable(-30, 22);

    /* --- Hologram fikir sütunları (havada dönen küpler) --- */
    const holoPillar = (lx: number, lz: number) => {
      for (let y = 1; y <= 6; y++)
        for (let x = -1; x <= 1; x++)
          for (let z = -1; z <= 1; z++)
            if (Math.abs(x) + Math.abs(z) <= 1) iput(lx + x, y, lz + z, "stone", STONE_L);
      for (let y = 7; y <= 11; y++) {
        const r = y === 9 ? 2 : 1;
        for (let x = -r; x <= r; x++)
          for (let z = -r; z <= r; z++)
            if (Math.hypot(x, z) <= r + 0.2)
              iput(lx + x, y, lz + z, "glow", y % 2 ? VIOLET_L : CYAN);
      }
      for (let x = -1; x <= 1; x++) for (let z = -1; z <= 1; z++) iblock(lx + x, lz + z);
    };
    for (const lz of [-30, -16, 16, 30]) {
      holoPillar(-6, lz);
      holoPillar(6, lz);
    }

    /* --- Banklar --- */
    const bench = (lx: number, lz: number, along: "x" | "z") => {
      for (let i = -3; i <= 3; i++) {
        const x = along === "x" ? lx + i : lx;
        const z = along === "x" ? lz : lz + i;
        iput(x, 1, z, "stone", DARK);
        iput(x, 2, z, "stone", VIOLET);
        iput(x, 3, z, "glow", VIOLET_L);
        iblock(x, z);
      }
    };
    bench(-20, -8, "z");
    bench(20, -8, "z");
    bench(-20, 8, "z");
    bench(20, 8, "z");
    bench(-8, -34, "x");
    bench(8, -34, "x");
    bench(-8, 34, "x");
    bench(8, 34, "x");

    /* --- Fikir standları (tenteli tezgâhlar) --- */
    const stall = (lx: number, lz: number) => {
      for (let x = -3; x <= 3; x++)
        for (let z = -2; z <= 2; z++) {
          if (Math.abs(x) === 3 && Math.abs(z) === 2) {
            for (let y = 1; y <= 4; y++) iput(lx + x, y, lz + z, "stone", DARK);
          }
          iput(lx + x, 5, lz + z, "stone", (x + z) % 2 ? VIOLET : VIOLET_D);
          iblock(lx + x, lz + z);
        }
      for (let x = -2; x <= 2; x++) {
        iput(lx + x, 1, lz - 1, "stone", VIOLET_D);
        iput(lx + x, 2, lz - 1, "glow", x % 2 ? CYAN : GOLD);
      }
    };
    stall(-24, -32);
    stall(24, -32);
    stall(-24, 32);
    stall(24, 32);

    /* --- Saksılar / mor çalılar --- */
    for (const [lx, lz] of [
      [-16, -30],
      [16, -30],
      [-16, 30],
      [16, 30],
      [-34, -6],
      [-34, 6],
      [34, -14],
      [34, 14],
    ] as const) {
      for (let x = -1; x <= 1; x++)
        for (let z = -1; z <= 1; z++) {
          iput(lx + x, 1, lz + z, "stone", STONE_L);
          iput(lx + x, 2, lz + z, "leaf", lerpHex(P.leafGreen, VIOLET_L, 0.4 + rnd() * 0.4));
          iblock(lx + x, lz + z);
        }
    }
  }


  /* ================= TROPİK ADA + ÇEVRESİ ================= *
   * Tüm şehir ve bölgeler tek bir tropik adanın üzerinde durur; kıyı kumsalı,
   * palmiyeler, iskeleler, resif kayaları ve açıkta küçük adacıklar.        */
  {
    const SAND_A = isDay ? 0xf2dfae : 0xb9a479;
    const SAND_B = isDay ? 0xe6cf95 : 0xa8946b;
    const WET = isDay ? 0xcdb884 : 0x8e7d5c;
    const ROCK = isDay ? 0x9c9689 : 0x565b70;
    const PALM_TRUNK = isDay ? 0x8a6134 : 0x4a3626;
    const PALM_LEAF = isDay ? 0x3fa84e : 0x256b3c;
    const COCO = isDay ? 0x7a4b22 : 0x4a3018;

    /** Dalgalı kıyı çizgisi */
    const coast = (a: number) =>
      ISLAND_R +
      Math.sin(a * 3 + 0.4) * 13 +
      Math.cos(a * 5 - 1.1) * 8 +
      Math.sin(a * 8 + 2.3) * 4;

    const surface = new Map<string, number>();

    for (let x = -ISLAND_R - 34; x <= ISLAND_R + 34; x++) {
      for (let z = -ISLAND_R - 34; z <= ISLAND_R + 34; z++) {
        const d = Math.hypot(x, z);
        if (d > ISLAND_R + 34) continue;
        const R = coast(Math.atan2(z, x));
        if (d > R + 9) continue;
        const k = key(x, z);
        if (occupied.has(k) || walk.has(k)) continue;

        if (d > R) {
          // sığ resif tabanı (su altında kalır)
          put(x, -3, z, "stone", lerpHex(WET, ROCK, rnd() * 0.4));
          continue;
        }
        if (d > R - 3) {
          put(x, -2, z, "stone", lerpHex(WET, SAND_B, rnd()));
          surface.set(k, -2);
          setWalk(x, z, -2);
          continue;
        }
        if (d > R - 16) {
          const c = lerpHex(SAND_A, SAND_B, rnd());
          put(x, -1, z, "stone", c);
          surface.set(k, -1);
          setWalk(x, z, -1);
          continue;
        }
        const t = Math.min(1, (R - 16 - d) / 14);
        const c = lerpHex(lerpHex(SAND_A, SAND_B, rnd()), lerpHex(P.grass, P.ground, rnd()), t);
        put(x, -1, z, "stone", c);
        surface.set(k, -1);
        setWalk(x, z, -1);
      }
    }

    /** Bloklu palmiye ağacı */
    const palm = (cx: number, cz: number, base: number, h: number, lean = 0) => {
      let tx = cx;
      let tz = cz;
      for (let y = base + 1; y <= base + h; y++) {
        if (lean !== 0 && y > base + h - 3) {
          tx += lean > 0 ? 1 : -1;
        }
        put(tx, y, tz, "stone", y % 2 ? PALM_TRUNK : lerpHex(PALM_TRUNK, 0x000000, 0.18));
      }
      const top = base + h;
      const dirsP = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ] as const;
      put(tx, top + 1, tz, "leaf", PALM_LEAF);
      dirsP.forEach(([dx, dz], i) => {
        const len = i < 4 ? 4 : 3;
        for (let s = 1; s <= len; s++) {
          const y = top + 1 - (s >= 3 ? 1 : 0);
          put(tx + dx * s, y, tz + dz * s, "leaf", lerpHex(PALM_LEAF, 0x000000, s * 0.06));
        }
      });
      // hindistan cevizleri
      put(tx + 1, top, tz, "leaf", COCO);
      put(tx, top, tz - 1, "leaf", COCO);
      walk.delete(key(tx, tz));
    };

    // kıyı boyunca palmiye kuşağı
    for (let i = 0; i < 210; i++) {
      const a = (i / 210) * Math.PI * 2 + rnd() * 0.02;
      const R = coast(a);
      const r = R - 5 - rnd() * 12;
      const cx = Math.round(Math.cos(a) * r);
      const cz = Math.round(Math.sin(a) * r);
      const base = surface.get(key(cx, cz));
      if (base === undefined) continue;
      palm(cx, cz, base, 5 + Math.floor(rnd() * 4), rnd() > 0.6 ? (rnd() > 0.5 ? 1 : -1) : 0);
    }

    // kumsal kayaları + çalılar
    for (let i = 0; i < 260; i++) {
      const a = rnd() * Math.PI * 2;
      const R = coast(a);
      const r = R - 2 - rnd() * 20;
      const cx = Math.round(Math.cos(a) * r);
      const cz = Math.round(Math.sin(a) * r);
      const base = surface.get(key(cx, cz));
      if (base === undefined) continue;
      if (rnd() > 0.45) {
        for (let x = -1; x <= 1; x++)
          for (let z = -1; z <= 1; z++) {
            if (Math.abs(x) + Math.abs(z) > 1 && rnd() > 0.4) continue;
            put(cx + x, base + 1, cz + z, "stone", lerpHex(ROCK, SAND_B, rnd() * 0.5));
          }
        put(cx, base + 2, cz, "stone", ROCK);
        walk.delete(key(cx, cz));
      } else {
        put(cx, base + 1, cz, "leaf", lerpHex(P.leafGreen, PALM_LEAF, rnd()));
      }
    }

    /* --- İskeleler: dört yöne uzanan ahşap pontonlar --- */
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const dx = Math.cos(a);
      const dz = Math.sin(a);
      const R = coast(a);
      for (let t = R - 10; t <= R + 26; t += 0.5) {
        for (let w = -2; w <= 2; w++) {
          const x = Math.round(dx * t - dz * w);
          const z = Math.round(dz * t + dx * w);
          const k = key(x, z);
          if (occupied.has(k)) continue;
          put(x, 0, z, "stone", (x + z) % 2 ? 0x8b5e34 : 0x7a5230);
          setWalk(x, z, 0);
          if (Math.abs(w) === 2 && Math.round(t) % 6 === 0) {
            put(x, 1, z, "stone", 0x6b4526);
            put(x, 2, z, "lamp", isDay ? 0xfff0c8 : 0xffcf7a);
            walk.delete(k);
          }
        }
      }
    }

    /* --- Açıktaki adacıklar --- */
    const islet = (cx: number, cz: number, rad: number, kind: "palm" | "rock" | "lighthouse") => {
      for (let x = -rad - 4; x <= rad + 4; x++)
        for (let z = -rad - 4; z <= rad + 4; z++) {
          const d = Math.hypot(x, z);
          if (d > rad + 4) continue;
          const k = key(cx + x, cz + z);
          if (occupied.has(k)) continue;
          if (d > rad) {
            put(cx + x, -3, cz + z, "stone", lerpHex(WET, ROCK, rnd() * 0.5));
            continue;
          }
          const h = d > rad - 2 ? -2 : d > rad * 0.55 ? -1 : 0;
          for (let y = -2; y <= h; y++)
            put(cx + x, y, cz + z, "stone", y === h ? lerpHex(SAND_A, SAND_B, rnd()) : SAND_B);
          surface.set(k, h);
          setWalk(cx + x, cz + z, h);
        }
      if (kind === "palm") {
        for (let i = 0; i < Math.max(2, rad - 2); i++) {
          const a = rnd() * Math.PI * 2;
          const r = rnd() * (rad - 3);
          const px = cx + Math.round(Math.cos(a) * r);
          const pz = cz + Math.round(Math.sin(a) * r);
          const base = surface.get(key(px, pz));
          if (base === undefined) continue;
          palm(px, pz, base, 5 + Math.floor(rnd() * 4), rnd() > 0.5 ? 1 : -1);
        }
      } else if (kind === "rock") {
        for (let y = 1; y <= 5 + Math.floor(rnd() * 5); y++) {
          const s = y > 3 ? 0 : 1;
          for (let x = -s; x <= s; x++)
            for (let z = -s; z <= s; z++)
              put(cx + x, y, cz + z, "stone", lerpHex(ROCK, 0x000000, rnd() * 0.25));
        }
      } else {
        for (let y = 1; y <= 14; y++) {
          const s = y < 10 ? 2 : 1;
          for (let x = -s; x <= s; x++)
            for (let z = -s; z <= s; z++) {
              if (Math.abs(x) === s && Math.abs(z) === s && y > 3) continue;
              const band = Math.floor(y / 2) % 2 === 0;
              put(cx + x, y, cz + z, "stone", band ? 0xf2f2f0 : 0xd6483a);
            }
        }
        for (let x = -2; x <= 2; x++)
          for (let z = -2; z <= 2; z++)
            put(cx + x, 15, cz + z, x * x + z * z <= 2 ? "lamp" : "stone", x * x + z * z <= 2 ? 0xfff0b0 : 0x35405c);
      }
    };

    const isletSpots: Array<[number, number, number, "palm" | "rock" | "lighthouse"]> = [
      [268, 96, 13, "palm"],
      [-250, 150, 10, "palm"],
      [120, -286, 15, "palm"],
      [-296, -110, 11, "palm"],
      [318, -60, 8, "rock"],
      [-180, -300, 7, "rock"],
      [40, 300, 6, "rock"],
      [-330, 40, 5, "rock"],
      [232, 214, 9, "lighthouse"],
    ];
    for (const [cx, cz, rad, kind] of isletSpots) islet(cx, cz, rad, kind);
  }

  return { voxels: out, walk };



}


/** Merkezdeki hologram küpün voxelleri (yerel koordinat) */
export function buildCore(size = 8): Voxel[] {
  const rnd = mulberry32(99);
  const out: Voxel[] = [];
  const h = size / 2;
  for (let x = 0; x < size; x++)
    for (let y = 0; y < size; y++)
      for (let z = 0; z < size; z++) {
        const shell =
          x === 0 || y === 0 || z === 0 || x === size - 1 || y === size - 1 || z === size - 1;
        if (!shell) continue;
        const t = y / (size - 1);
        const color = lerpHex(0x21b6ff, 0xa855f7, t * 0.9 + rnd() * 0.12);
        out.push({ x: x - h + 0.5, y: y - h + 0.5, z: z - h + 0.5, kind: "glass", color });
      }
  return out;
}

/** Basit voxel karakter (yerel koordinat, blok = 0.5 birim ölçekli kullanılır) */
export interface CharPart {
  name: "head" | "body" | "armL" | "armR" | "legL" | "legR";
  size: [number, number, number];
  pos: [number, number, number];
  color: number;
}

export const CHARACTER: CharPart[] = [
  { name: "legL", size: [0.34, 0.75, 0.34], pos: [-0.19, 0.375, 0], color: 0x2d3550 },
  { name: "legR", size: [0.34, 0.75, 0.34], pos: [0.19, 0.375, 0], color: 0x2d3550 },
  { name: "body", size: [0.8, 0.85, 0.44], pos: [0, 1.18, 0], color: 0xf2622a },
  { name: "armL", size: [0.24, 0.8, 0.28], pos: [-0.52, 1.2, 0], color: 0xff8c4a },
  { name: "armR", size: [0.24, 0.8, 0.28], pos: [0.52, 1.2, 0], color: 0xff8c4a },
  { name: "head", size: [0.62, 0.6, 0.62], pos: [0, 1.9, 0], color: 0xd9a86a },
];

/** Yüz detayları: göz / ağız / kaş voxelleri (kafa merkezine göre yerel) */
export interface FaceBit {
  size: [number, number, number];
  pos: [number, number, number];
  tone: "dark" | "light" | "mouth";
}

export const FACE: FaceBit[] = [
  { size: [0.13, 0.13, 0.06], pos: [-0.14, 0.07, 0.32], tone: "light" },
  { size: [0.13, 0.13, 0.06], pos: [0.14, 0.07, 0.32], tone: "light" },
  { size: [0.06, 0.07, 0.05], pos: [-0.14, 0.06, 0.35], tone: "dark" },
  { size: [0.06, 0.07, 0.05], pos: [0.14, 0.06, 0.35], tone: "dark" },
  { size: [0.16, 0.04, 0.05], pos: [-0.14, 0.19, 0.33], tone: "dark" },
  { size: [0.16, 0.04, 0.05], pos: [0.14, 0.19, 0.33], tone: "dark" },
  { size: [0.2, 0.06, 0.05], pos: [0, -0.16, 0.33], tone: "mouth" },
];

export type HairStyle = "short" | "long" | "cap" | "bald" | "bun";

/** Meydanda dolaşan, sohbet eden voxel insanlar */
export interface Npc {
  x: number;
  y: number;
  z: number;
  yaw: number;
  shirt: number;
  pants: number;
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  phase: number;
  speed: number;
  /** Dolaşma yarıçapının merkezi */
  homeX: number;
  homeZ: number;
  scale: number;
}

const SHIRTS = [
  0xf2622a, 0x2f8fe0, 0x46b36b, 0xd94f8a, 0x9a6ce0, 0xe0b93a, 0x39c7c0, 0xe05252, 0xf5f0e6,
  0x2b3a55,
];
const PANTS = [0x2d3550, 0x3b3f4d, 0x4a3a2c, 0x27405e, 0x6b6f7a];
const SKINS = [0xd9a86a, 0xf0c9a0, 0xa9754a, 0x7a5236, 0xc98f5f, 0x5d3a24];
const HAIRS = [0x2a1e18, 0x4a2f1c, 0x8a6534, 0xd8c07a, 0x1b1b22, 0x9a3f2a, 0xb8b3ad];
const HAIR_STYLES: HairStyle[] = ["short", "long", "cap", "bald", "bun", "short", "cap"];

/** Meydanda NPC'lerin söyleyebileceği kısa cümleler */
export const NPC_LINES = [
  "Fikrimi çekirdeğe gönderdim!",
  "Bunu Tasarım bölgesine yönlendirdi.",
  "Katkı puanım 120 oldu 🎉",
  "Üretim'de prototipi bekliyoruz.",
  "Topluluk oylaması bu akşam.",
  "Pazar'da ilk ürünü gördün mü?",
  "Gel birlikte geliştirelim.",
  "Çekirdek şimdi analiz ediyor.",
];

export function buildNpcs(walk: WalkMap): Npc[] {
  const rnd = mulberry32(4242);
  const list: Npc[] = [];
  const groups = 14;
  for (let g = 0; g < groups; g++) {
    const a = (g / groups) * Math.PI * 2 + rnd() * 0.35;
    const r = 9 + rnd() * 14;
    const gx = Math.cos(a) * r;
    const gz = Math.sin(a) * r;
    const count = 2 + Math.floor(rnd() * 3);
    for (let i = 0; i < count; i++) {
      const ia = (i / count) * Math.PI * 2 + rnd();
      const x = gx + Math.cos(ia) * 1.6;
      const z = gz + Math.sin(ia) * 1.6;
      const ground = walk.get(`${Math.round(x)},${Math.round(z)}`);
      if (ground === undefined) continue;
      list.push({
        x,
        y: ground + 1,
        z,
        yaw: Math.atan2(gx - x, gz - z),
        shirt: SHIRTS[Math.floor(rnd() * SHIRTS.length)]!,
        pants: PANTS[Math.floor(rnd() * PANTS.length)]!,
        skin: SKINS[Math.floor(rnd() * SKINS.length)]!,
        hair: HAIRS[Math.floor(rnd() * HAIRS.length)]!,
        hairStyle: HAIR_STYLES[Math.floor(rnd() * HAIR_STYLES.length)]!,
        phase: rnd() * Math.PI * 2,
        speed: 1.1 + rnd() * 1.5,
        homeX: gx,
        homeZ: gz,
        scale: 0.8 + rnd() * 0.16,
      });
    }
  }

  /* --- Bölge kalabalıkları: meydanlar ve çalışma alanları --- */
  const zoneCrowd = (
    center: { x: number; z: number },
    spots: Array<[number, number]>,
    perSpot: number,
  ) => {
    for (const [ox, oz] of spots) {
      const gx = center.x + ox;
      const gz = center.z + oz;
      const count = perSpot + Math.floor(rnd() * 2);
      for (let i = 0; i < count; i++) {
        const ia = (i / count) * Math.PI * 2 + rnd() * 0.8;
        const rr = 1.4 + rnd() * 1.6;
        const x = gx + Math.cos(ia) * rr;
        const z = gz + Math.sin(ia) * rr;
        const ground = walk.get(`${Math.round(x)},${Math.round(z)}`);
        if (ground === undefined) continue;
        list.push({
          x,
          y: ground + 1,
          z,
          yaw: Math.atan2(gx - x, gz - z),
          shirt: SHIRTS[Math.floor(rnd() * SHIRTS.length)]!,
          pants: PANTS[Math.floor(rnd() * PANTS.length)]!,
          skin: SKINS[Math.floor(rnd() * SKINS.length)]!,
          hair: HAIRS[Math.floor(rnd() * HAIRS.length)]!,
          hairStyle: HAIR_STYLES[Math.floor(rnd() * HAIR_STYLES.length)]!,
          phase: rnd() * Math.PI * 2,
          speed: 1.0 + rnd() * 1.4,
          homeX: gx,
          homeZ: gz,
          scale: 0.8 + rnd() * 0.16,
        });
      }
    }
  };

  zoneCrowd(
    MARKET_CENTER,
    [
      [0, -10],
      [-20, -2],
      [20, -2],
      [0, 8],
      [-14, 16],
      [14, 16],
      [-24, 6],
      [24, 6],
      [0, 22],
    ],
    3,
  );

  zoneCrowd(
    COMMUNITY_CENTER,
    [
      [-17, -2],
      [17, -2],
      [0, 16],
      [0, -14],
      [-9, 6],
      [9, 6],
      [-26, 4],
      [26, 4],
      [-8, -20],
      [8, -20],
      [0, 26],
    ],
    3,
  );

  zoneCrowd(
    DESIGN_CENTER,
    [
      [-27, -8], [27, -8], [-27, 9], [27, 9],
      [-13, 0], [13, 0], [0, -18], [0, 20],
    ],
    3,
  );

  zoneCrowd(
    PRODUCTION_CENTER,
    [
      [-38, -5], [-20, -5], [0, -5], [20, -5], [38, -5],
      [-30, 25], [-12, 25], [8, 25], [28, 25],
    ],
    3,
  );

  zoneCrowd(
    ACHIEVEMENT_CENTER,
    [
      [-18, 2], [18, 2], [-25, 22], [25, 22],
      [-9, 12], [9, 12], [0, 27], [0, -24],
    ],
    4,
  );

  zoneCrowd(
    IDEA_CENTER,
    [
      [-12, 0], [12, 0], [0, -13], [0, 13],
      [30, -20], [30, -6], [30, 8], [30, 20],
      [-30, -10], [-30, 10], [-20, 0], [16, 24],
      [-14, -18], [14, -18], [-14, 18], [14, 18],
      [-30, -18], [-30, 18], [-6, -26], [6, -26],
      [-6, 26], [6, 26], [-20, -8], [20, -8],
      [-20, 8], [20, 8], [-24, -28], [24, -28],
      [-24, 28], [24, 28], [-34, 0], [22, 0],
      [0, 32], [0, -32], [-8, -36], [8, 36],
    ],
    5,
  );


  return list;

}


