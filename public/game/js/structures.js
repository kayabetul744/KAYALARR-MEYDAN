/**
 * Atölye - bölge yapıları
 * Fabrika (üretim) alanı, tasarım kampüsü ve fikir paylaşım meydanı.
 * Tüm yapılar seyrek bir harita (Map) içine damgalanır, dünya üretimi bunu okur.
 */

import { BlockType } from './voxel.js';

export const GROUND_Y = 18;      // düz bölgelerin zemin yüksekliği
export const BASE_Y = GROUND_Y + 1;

export const ZONES = [
  { key: 'fabrika',  name: 'ÜRETİM FABRİKASI', x: 0,   z: -96, hx: 34, hz: 28, ground: 'ASPHALT' },
  { key: 'tasarim',  name: 'TASARIM KAMPÜSÜ',  x: 96,  z: 0,   hx: 36, hz: 32, ground: 'TILE' },
  { key: 'fikir',    name: 'FİKİR MEYDANI',    x: 0,   z: 92,  hx: 26, hz: 26, ground: 'CONCRETE' },
  { key: 'topluluk', name: 'TOPLULUK BAHÇESİ', x: -96, z: 0,   hx: 30, hz: 26, ground: 'CONCRETE' },
  { key: 'pazar',    name: 'PAZAR',            x: -92, z: 92,  hx: 26, hz: 24, ground: 'TILE' },
  { key: 'basari',   name: 'BAŞARI SALONU',    x: 92,  z: -92, hx: 26, hz: 24, ground: 'SAND' },
  { key: 'yol_k',    name: '',                 x: 0,   z: -48, hx: 4,  hz: 48, ground: 'ASPHALT' },
  { key: 'yol_g',    name: '',                 x: 0,   z: 46,  hx: 4,  hz: 46, ground: 'ASPHALT' },
  { key: 'yol_d',    name: '',                 x: 48,  z: 0,   hx: 48, hz: 4,  ground: 'ASPHALT' },
  { key: 'yol_b',    name: '',                 x: -48, z: 0,   hx: 48, hz: 4,  ground: 'ASPHALT' },
  { key: 'yol_gb',   name: '',                 x: -46, z: 92,  hx: 46, hz: 4,  ground: 'ASPHALT' },
  { key: 'yol_kd',   name: '',                 x: 46,  z: -92, hx: 46, hz: 4,  ground: 'ASPHALT' },
];


export function findZone(wx, wz) {
  for (const z of ZONES) {
    if (Math.abs(wx - z.x) <= z.hx && Math.abs(wz - z.z) <= z.hz) return z;
  }
  return null;
}

export function zoneTouchesChunk(zone, x0, x1, z0, z1) {
  return x1 >= zone.x - zone.hx && x0 <= zone.x + zone.hx
      && z1 >= zone.z - zone.hz && z0 <= zone.z + zone.hz;
}

/* ============================================
   Yapı damgalama yardımcıları
   ============================================ */
class Stamp {
  constructor() {
    this.blocks = new Map();
    this.smoke = [];
  }
  set(x, y, z, t) {
    if (y < 0 || t === undefined) return;
    this.blocks.set(`${x},${y},${z}`, t);
  }
  box(x0, y0, z0, x1, y1, z1, t) {
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++) this.set(x, y, z, t);
  }
  hollow(x0, y0, z0, x1, y1, z1, t) {
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++) {
          if (x === x0 || x === x1 || z === z0 || z === z1 || y === y0 || y === y1) this.set(x, y, z, t);
        }
  }
  walls(x0, y0, z0, x1, y1, z1, t) {
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++) {
          if (x === x0 || x === x1 || z === z0 || z === z1) this.set(x, y, z, t);
        }
  }
}

function tree(s, x, z, leafType, trunkH = 4, r = 2) {
  for (let y = 0; y < trunkH; y++) s.set(x, BASE_Y + y, z, BlockType.WOOD);
  const top = BASE_Y + trunkH;
  for (let dy = 0; dy < 2; dy++)
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) === r && Math.abs(dz) === r) continue;
        s.set(x + dx, top + dy, z + dz, leafType);
      }
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++)
      if (Math.abs(dx) + Math.abs(dz) < 2) s.set(x + dx, top + 2, z + dz, leafType);
}

function lamp(s, x, z, h = 5) {
  for (let y = 0; y < h; y++) s.set(x, BASE_Y + y, z, BlockType.DARK);
  s.set(x, BASE_Y + h, z, BlockType.LAMP);
}

function buildRoadsideStudio(s, cx, cz, wall, accent) {
  const y = BASE_Y;
  const x0 = cx - 6, x1 = cx + 6, z0 = cz - 5, z1 = cz + 5;
  s.box(x0 - 2, y - 1, z0 - 2, x1 + 2, y - 1, z1 + 2, BlockType.TILE);
  s.walls(x0, y, z0, x1, y + 4, z1, wall);
  for (let x = x0 + 1; x < x1; x++) {
    s.set(x, y + 2, z0, BlockType.GLASS);
    s.set(x, y + 2, z1, BlockType.GLASS);
  }
  s.walls(x0 - 1, y + 5, z0 - 1, x1 + 1, y + 5, z1 + 1, accent);
  s.set(cx, y, z1, BlockType.AIR);
  s.set(cx, y + 1, z1, BlockType.AIR);
  s.box(cx - 3, y, cz, cx + 3, y, cz + 2, BlockType.PLANK);
  s.set(cx - 2, y + 1, cz, BlockType.NEON_PINK);
  s.set(cx + 2, y + 1, cz, BlockType.LAMP);
  tree(s, x0 - 2, z1 + 2, BlockType.CHERRY, 3, 1);
  lamp(s, x1 + 2, z1 + 2, 4);
}

/* ============================================
   Üretim fabrikası (bacalar + duman + bantlar)
   ============================================ */
function buildFactory(s, cx, cz) {
  const y = BASE_Y;

  // Zemin ızgarası: koyu paneller
  for (let x = cx - 30; x <= cx + 30; x++)
    for (let z = cz - 24; z <= cz + 24; z++)
      if ((x + z) % 4 === 0) s.set(x, y - 1, z, BlockType.DARK);

  // Ana üretim binası
  const bx0 = cx - 24, bx1 = cx + 24, bz0 = cz - 8, bz1 = cz + 6;
  s.walls(bx0, y, bz0, bx1, y + 6, bz1, BlockType.DARK);
  s.box(bx0, y + 7, bz0, bx1, y + 7, bz1, BlockType.DARK);          // çatı
  s.box(bx0, y + 4, bz0, bx1, y + 4, bz1, BlockType.RUST);          // kırmızı bant

  // Ön cephe: büyük gri kepenkli kapılar
  for (let d = 0; d < 3; d++) {
    const dx0 = bx0 + 4 + d * 15;
    s.box(dx0, y, bz1, dx0 + 9, y + 3, bz1, BlockType.CONCRETE);
    s.box(dx0, y + 3, bz1, dx0 + 9, y + 3, bz1, BlockType.METAL);
  }

  // Çatı havalandırmaları
  for (let x = bx0 + 3; x <= bx1 - 3; x += 4) {
    s.set(x, y + 8, bz0 + 3, BlockType.METAL);
    s.set(x, y + 8, bz1 - 3, BlockType.METAL);
  }

  // Bacalar (tuğla + beyaz bant) ve duman kaynakları
  const chimneys = [
    [cx - 20, cz - 4, 20], [cx - 8, cz - 5, 16],
    [cx + 6, cz - 4, 22], [cx + 18, cz - 5, 17],
  ];
  for (const [x, z, h] of chimneys) {
    for (let dy = 0; dy < h; dy++) {
      const t = (dy % 6 < 3) ? BlockType.BRICK : BlockType.WHITE;
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) s.set(x + dx, y + dy, z + dz, t);
    }
    s.smoke.push({ x: x + 0.5, y: y + h, z: z + 0.5 });
  }

  // Depolama siloları
  for (const [x, z] of [[cx - 30, cz - 2], [cx + 28, cz - 2]]) {
    for (let dy = 0; dy < 10; dy++)
      for (let dx = -2; dx <= 2; dx++)
        for (let dz = -2; dz <= 2; dz++) {
          if (dx * dx + dz * dz > 5) continue;
          s.set(x + dx, y + dy, z + dz, dy === 9 ? BlockType.METAL : BlockType.CONCRETE);
        }
  }

  // Üretim bandı ve turuncu robot kolları
  const beltZ = cz + 12;
  s.box(cx - 28, y, beltZ - 1, cx + 28, y, beltZ + 1, BlockType.METAL);
  for (let x = cx - 26; x <= cx + 26; x += 8) {
    s.box(x, y + 1, beltZ - 3, x, y + 3, beltZ - 3, BlockType.ORANGE);
    s.box(x, y + 3, beltZ - 3, x + 2, y + 3, beltZ - 3, BlockType.ORANGE);
    s.set(x + 2, y + 2, beltZ - 3, BlockType.RUST);
    s.set(x, y, beltZ + 3, BlockType.GOLD);      // sandık
    s.set(x + 4, y, beltZ + 3, BlockType.PLANK);
  }

  // Turuncu uyarı bandı ve aydınlatma
  for (let x = cx - 30; x <= cx + 30; x += 2) s.set(x, y, cz + 20, BlockType.ORANGE);
  for (let x = cx - 24; x <= cx + 24; x += 12) lamp(s, x, cz + 16, 6);
}

/* ============================================
   Tasarım kampüsü (pembe/mor bloklar + meydan)
   ============================================ */
function buildCampus(s, cx, cz) {
  const y = BASE_Y;

  // Çevre duvarı
  s.walls(cx - 32, y, cz - 28, cx + 32, y + 1, cz + 28, BlockType.TILE);

  // Yollar (haç şeklinde) + orta şerit
  s.box(cx - 32, y - 1, cz - 3, cx + 32, y - 1, cz + 3, BlockType.ASPHALT);
  s.box(cx - 3, y - 1, cz - 28, cx + 3, y - 1, cz + 28, BlockType.ASPHALT);
  for (let x = cx - 30; x <= cx + 30; x += 4) s.set(x, y - 1, cz, BlockType.WHITE);
  for (let z = cz - 26; z <= cz + 26; z += 4) s.set(cx, y - 1, z, BlockType.WHITE);

  // Dört stüdyo binası (görsellerdeki pembe/mor bloklar)
  const studios = [
    { x: cx - 22, z: cz - 18, wall: BlockType.NAVY,    accent: BlockType.NEON_PINK },
    { x: cx + 10, z: cz - 18, wall: BlockType.MAGENTA, accent: BlockType.NEON_PINK },
    { x: cx - 22, z: cz + 6,  wall: BlockType.PURPLE,  accent: BlockType.MAGENTA },
    { x: cx + 10, z: cz + 6,  wall: BlockType.MAGENTA, accent: BlockType.PURPLE },
  ];
  for (const st of studios) {
    const x0 = st.x, x1 = st.x + 16, z0 = st.z, z1 = st.z + 12;
    s.box(x0, y - 1, z0, x1, y - 1, z1, BlockType.WHITE);            // taban
    s.walls(x0, y, z0, x1, y + 4, z1, st.wall);                      // duvarlar
    // cam bant
    for (let x = x0 + 1; x < x1; x++) {
      s.set(x, y + 2, z0, BlockType.GLASS);
      s.set(x, y + 2, z1, BlockType.GLASS);
    }
    for (let z = z0 + 1; z < z1; z++) {
      s.set(x0, y + 2, z, BlockType.GLASS);
      s.set(x1, y + 2, z, BlockType.GLASS);
    }
    // üst korkuluk
    s.walls(x0, y + 5, z0, x1, y + 5, z1, st.accent);
    // giriş
    s.set(st.x + 8, y, z1, BlockType.AIR);
    s.set(st.x + 8, y + 1, z1, BlockType.AIR);
    // içerideki masalar / ekranlar
    for (let x = x0 + 3; x <= x1 - 3; x += 4) {
      for (let z = z0 + 3; z <= z1 - 3; z += 4) {
        s.set(x, y, z, BlockType.PLANK);
        s.set(x + 1, y, z, BlockType.PLANK);
        s.set(x, y + 1, z, BlockType.NEON_PINK);
      }
    }
    // duvarda parlayan ekran panosu
    s.box(x0 + 3, y + 3, z0, x0 + 7, y + 4, z0, BlockType.NEON_PINK);
  }

  // Merkez heykel (mor obelisk + havuz)
  for (let dx = -4; dx <= 4; dx++)
    for (let dz = -4; dz <= 4; dz++)
      if (dx * dx + dz * dz <= 18) s.set(cx + dx, y - 1, cz + dz, BlockType.WHITE);
  for (let h = 0; h < 8; h++) {
    const r = h < 5 ? 1 : 0;
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) s.set(cx + dx, y + h, cz + dz, BlockType.PURPLE);
  }
  s.set(cx, y + 8, cz, BlockType.MAGENTA);

  // Ağaçlar ve lambalar
  for (let x = cx - 28; x <= cx + 28; x += 7) {
    tree(s, x, cz - 26, BlockType.CHERRY, 3, 1);
    tree(s, x, cz + 26, BlockType.LEAVES, 3, 1);
  }
  for (let z = cz - 22; z <= cz + 22; z += 8) {
    lamp(s, cx - 6, z, 4);
    lamp(s, cx + 6, z, 4);
  }
}

/* ============================================
   Fikir paylaşım meydanı
   ============================================ */
function buildIdeaSquare(s, cx, cz) {
  const y = BASE_Y;

  // Dairesel meydan
  for (let dx = -20; dx <= 20; dx++)
    for (let dz = -20; dz <= 20; dz++) {
      const d = dx * dx + dz * dz;
      if (d > 400) continue;
      s.set(cx + dx, y - 1, cz + dz, d > 260 ? BlockType.TILE : BlockType.CONCRETE);
    }

  // Büyük fikir panosu (kuzeye bakar)
  const bz = cz - 6;
  s.box(cx - 7, y, bz, cx + 7, y + 6, bz, BlockType.WHITE);
  s.walls(cx - 8, y, bz, cx + 8, y + 7, bz, BlockType.WOOD);
  s.box(cx - 8, y + 7, bz, cx + 8, y + 7, bz, BlockType.NEON_PINK);
  s.box(cx - 6, y + 5, bz - 1, cx + 6, y + 5, bz - 1, BlockType.LAMP);
  // panoya asılı renkli notlar
  for (let i = -5; i <= 5; i += 2)
    for (let j = 1; j <= 4; j += 2) {
      const t = [BlockType.ORANGE, BlockType.NEON_PINK, BlockType.GOLD, BlockType.MAGENTA][(i + j + 8) % 4];
      s.set(cx + i, y + j, bz - 1, t);
    }

  // Amfi tarzı oturma basamakları
  for (let step = 0; step < 3; step++) {
    for (let dx = -12 + step; dx <= 12 - step; dx++) {
      s.set(cx + dx, y + step, cz + 8 + step * 2, BlockType.PLANK);
      s.set(cx + dx, y + step, cz + 9 + step * 2, BlockType.PLANK);
    }
  }

  // Yuvarlak masalar
  for (const [ox, oz] of [[-10, 0], [10, 0], [0, 4]]) {
    s.set(cx + ox, y, cz + oz, BlockType.PLANK);
    s.set(cx + ox, y + 1, cz + oz, BlockType.WHITE);
    for (const [dx, dz] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) s.set(cx + ox + dx, y, cz + oz + dz, BlockType.WOOD);
  }

  // Ağaçlar ve lambalar
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    const x = cx + Math.round(Math.cos(ang) * 17);
    const z = cz + Math.round(Math.sin(ang) * 17);
    if (a % 2 === 0) tree(s, x, z, BlockType.CHERRY, 4, 2); else lamp(s, x, z, 5);
  }
}

/* ============================================
   Topluluk bahçesi (yeşil avlu + ortak ev)
   ============================================ */
function buildCommunity(s, cx, cz) {
  const y = BASE_Y;

  // Yeşil avlu ve karo yürüyüş yolları
  for (let dx = -26; dx <= 26; dx++)
    for (let dz = -22; dz <= 22; dz++) {
      const t = (Math.abs(dx) % 9 === 0 || Math.abs(dz) % 9 === 0) ? BlockType.TILE : BlockType.GRASS;
      s.set(cx + dx, y - 1, cz + dz, t);
    }

  // Ortak ev (ahşap + cam, açık giriş)
  const x0 = cx - 12, x1 = cx + 12, z0 = cz - 16, z1 = cz - 4;
  s.box(x0, y - 1, z0, x1, y - 1, z1, BlockType.PLANK);
  s.walls(x0, y, z0, x1, y + 4, z1, BlockType.WOOD);
  for (let x = x0 + 2; x < x1 - 1; x += 2) {
    s.set(x, y + 2, z0, BlockType.GLASS);
    s.set(x, y + 2, z1, BlockType.GLASS);
  }
  s.box(x0 - 1, y + 5, z0 - 1, x1 + 1, y + 5, z1 + 1, BlockType.RUST);   // çatı
  for (let dy = 0; dy < 2; dy++) {
    s.set(cx, y + dy, z1, BlockType.AIR);
    s.set(cx + 1, y + dy, z1, BlockType.AIR);
  }

  // Ortak ateş çukuru
  for (let dx = -3; dx <= 3; dx++)
    for (let dz = -3; dz <= 3; dz++)
      if (dx * dx + dz * dz <= 9) s.set(cx + dx, y - 1, cz + dz + 6, BlockType.GRAVEL);
  s.set(cx, y, cz + 6, BlockType.LAMP);
  s.set(cx + 1, y, cz + 6, BlockType.ORANGE);

  // Piknik masaları ve banklar
  for (const [ox, oz] of [[-16, 6], [16, 6], [-16, 16], [16, 16], [0, 16]]) {
    s.box(cx + ox - 1, y, cz + oz, cx + ox + 1, y, cz + oz, BlockType.PLANK);
    s.set(cx + ox - 2, y, cz + oz, BlockType.WOOD);
    s.set(cx + ox + 2, y, cz + oz, BlockType.WOOD);
  }

  // Sebze tarhları
  for (let i = -1; i <= 1; i++) {
    const bx = cx + i * 8;
    s.walls(bx - 2, y, cz + 10, bx + 2, y, cz + 13, BlockType.WOOD);
    s.box(bx - 1, y, cz + 11, bx + 1, y, cz + 12, BlockType.LEAVES);
  }

  // Ağaç ve lambalar
  for (let x = cx - 24; x <= cx + 24; x += 8) {
    tree(s, x, cz + 20, BlockType.LEAVES, 4, 2);
    lamp(s, x, cz - 20, 5);
  }
}

/* ============================================
   Pazar (yeşil tezgâhlar + tenteler)
   ============================================ */
function buildMarket(s, cx, cz) {
  const y = BASE_Y;

  // Koyu yeşil taban ve çerçeve
  for (let dx = -22; dx <= 22; dx++)
    for (let dz = -20; dz <= 20; dz++)
      s.set(cx + dx, y - 1, cz + dz, ((dx + dz) % 6 === 0) ? BlockType.LEAVES : BlockType.DARK);
  s.walls(cx - 22, y, cz - 20, cx + 22, y, cz + 20, BlockType.LEAVES);

  // Çevre direkleri (görseldeki dikmeler)
  for (let dx = -22; dx <= 22; dx += 3) {
    for (const dz of [-20, 20]) {
      s.box(cx + dx, y, cz + dz, cx + dx, y + 2, cz + dz, BlockType.DARK);
      s.set(cx + dx, y + 3, cz + dz, BlockType.LEAVES);
    }
  }
  for (let dz = -20; dz <= 20; dz += 3) {
    for (const dx of [-22, 22]) {
      s.box(cx + dx, y, cz + dz, cx + dx, y + 2, cz + dz, BlockType.DARK);
      s.set(cx + dx, y + 3, cz + dz, BlockType.LEAVES);
    }
  }

  // Uzun kapalı tezgâhlar (siyah gövde + ahşap tente)
  for (const ox of [-14, 14]) {
    s.box(cx + ox - 5, y, cz + 4, cx + ox + 5, y + 3, cz + 9, BlockType.DARK);
    s.box(cx + ox - 6, y + 4, cz + 3, cx + ox + 6, y + 4, cz + 10, BlockType.WOOD);
    for (let x = -5; x <= 5; x += 2) s.set(cx + ox + x, y + 5, cz + 3, BlockType.LEAVES);
  }

  // Küçük beyaz kutu tezgâhlar
  for (const [ox, oz] of [[-10, -10], [-2, -4], [6, -10], [12, -4], [-14, -2], [2, 6]]) {
    s.hollow(cx + ox - 2, y, cz + oz - 2, cx + ox + 2, y + 2, cz + oz + 2, BlockType.WHITE);
    s.box(cx + ox - 2, y + 3, cz + oz - 2, cx + ox + 2, y + 3, cz + oz + 2, BlockType.METAL);
  }

  // Merkez çeşme / heykel
  for (let h = 0; h < 5; h++) {
    const r = h < 2 ? 3 : (h < 4 ? 2 : 1);
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++)
        s.set(cx + dx, y + h, cz + dz, (h % 2 === 0) ? BlockType.DARK : BlockType.LEAVES);
  }
  s.set(cx, y + 5, cz, BlockType.LAMP);

  // Giriş kapısı (kuzey)
  s.box(cx - 6, y, cz - 20, cx - 6, y + 4, cz - 20, BlockType.WOOD);
  s.box(cx + 6, y, cz - 20, cx + 6, y + 4, cz - 20, BlockType.WOOD);
  s.box(cx - 6, y + 5, cz - 20, cx + 6, y + 5, cz - 20, BlockType.WOOD);

  // Lambalar
  for (const [ox, oz] of [[-18, -16], [18, -16], [-18, 16], [18, 16]]) lamp(s, cx + ox, cz + oz, 5);
}

/* ============================================
   Başarı salonu (altın avlu + sütunlar + kupalar)
   ============================================ */
function buildAchievement(s, cx, cz) {
  const y = BASE_Y;

  // Kum/altın döşeme
  for (let dx = -22; dx <= 22; dx++)
    for (let dz = -20; dz <= 20; dz++) {
      const edge = Math.abs(dx) > 19 || Math.abs(dz) > 17;
      const t = edge ? BlockType.RUST : (((dx + dz) % 8 === 0) ? BlockType.GOLD : BlockType.SAND);
      s.set(cx + dx, y - 1, cz + dz, t);
    }

  // Sütun galerisi + üst kiriş
  for (let dx = -20; dx <= 20; dx += 4) {
    for (const dz of [-18, 18]) {
      s.box(cx + dx, y, cz + dz, cx + dx, y + 5, cz + dz, BlockType.SAND);
      s.set(cx + dx, y + 6, cz + dz, BlockType.WOOD);
    }
  }
  for (let dz = -18; dz <= 18; dz += 4) {
    for (const dx of [-20, 20]) {
      s.box(cx + dx, y, cz + dz, cx + dx, y + 5, cz + dz, BlockType.SAND);
      s.set(cx + dx, y + 6, cz + dz, BlockType.WOOD);
    }
  }
  s.box(cx - 20, y + 7, cz - 18, cx + 20, y + 7, cz - 18, BlockType.WOOD);
  s.box(cx - 20, y + 7, cz + 18, cx + 20, y + 7, cz + 18, BlockType.WOOD);
  s.box(cx - 20, y + 7, cz - 18, cx - 20, y + 7, cz + 18, BlockType.WOOD);
  s.box(cx + 20, y + 7, cz - 18, cx + 20, y + 7, cz + 18, BlockType.WOOD);

  // Merkez kupa kaidesi
  for (let h = 0; h < 3; h++) {
    const r = 5 - h;
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++) s.set(cx + dx, y + h, cz + dz, BlockType.DARK);
  }
  for (let h = 3; h < 6; h++) {
    const r = h === 5 ? 3 : 2;
    for (let dx = -r; dx <= r; dx++)
      for (let dz = -r; dz <= r; dz++)
        if (dx * dx + dz * dz <= r * r + 1) s.set(cx + dx, y + h, cz + dz, BlockType.GOLD);
  }
  s.set(cx, y + 6, cz, BlockType.LAMP);

  // Duvar madalyaları (kuzey duvarında altın panolar)
  for (let i = -12; i <= 12; i += 6) {
    s.box(cx + i - 1, y + 2, cz - 18, cx + i + 1, y + 4, cz - 18, BlockType.GOLD);
    s.set(cx + i, y + 3, cz - 17, BlockType.LAMP);
  }

  // Ödül masaları ve ağaçlar
  for (const [ox, oz] of [[-12, 6], [12, 6], [-12, -6], [12, -6]]) {
    s.box(cx + ox - 2, y, cz + oz, cx + ox + 2, y, cz + oz + 2, BlockType.GOLD);
    s.set(cx + ox, y + 1, cz + oz + 1, BlockType.LAMP);
  }
  for (const [ox, oz] of [[-6, 12], [6, 12], [-6, -12], [6, -12]]) tree(s, cx + ox, cz + oz, BlockType.LEAVES, 3, 1);
}

/* ============================================
   Tüm yapıları üret
   ============================================ */
export function buildStructures() {
  const s = new Stamp();
  const zone = (k) => ZONES.find(z => z.key === k);
  const fabrika = zone('fabrika');
  const tasarim = zone('tasarim');
  const fikir = zone('fikir');
  const topluluk = zone('topluluk');
  const pazar = zone('pazar');
  const basari = zone('basari');

  buildFactory(s, fabrika.x, fabrika.z);
  buildCampus(s, tasarim.x, tasarim.z);
  buildIdeaSquare(s, fikir.x, fikir.z);
  buildCommunity(s, topluluk.x, topluluk.z);
  buildMarket(s, pazar.x, pazar.z);
  buildAchievement(s, basari.x, basari.z);

  // Bölgeler arasında gezerken karşılaşılan küçük, açık avlulu atölyeler
  buildRoadsideStudio(s, 46, 14, BlockType.NAVY, BlockType.NEON_PINK);
  buildRoadsideStudio(s, -46, -14, BlockType.MAGENTA, BlockType.PURPLE);

  // Bölgeleri birbirine bağlayan yollar
  for (let z = -94; z <= 92; z += 4) s.set(0, GROUND_Y, z, BlockType.WHITE);
  for (let x = -94; x <= 94; x += 4) s.set(x, GROUND_Y, 0, BlockType.WHITE);
  for (let x = -90; x <= 0; x += 4) s.set(x, GROUND_Y, 92, BlockType.WHITE);
  for (let x = 0; x <= 90; x += 4) s.set(x, GROUND_Y, -92, BlockType.WHITE);

  return {
    blocks: s.blocks,
    smoke: s.smoke,
    ideaSpot: { x: fikir.x, y: BASE_Y, z: fikir.z - 3 },
  };
}

