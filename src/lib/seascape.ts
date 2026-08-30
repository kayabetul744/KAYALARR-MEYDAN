/**
 * Adanın çevresindeki deniz hayatı: dalgalı okyanus, köpük hattı, yelkenli
 * gemiler, sürü halinde zıplayan balıklar, yunuslar, ahtapotlar ve martılar.
 * Hepsi voxel/bloklu üslupta, tek bir update(t) ile canlandırılır.
 */

import * as THREE from "three";
import { ISLAND_R, SEA_LEVEL, mulberry32, type Theme } from "@/lib/voxel-world";

interface SeaTheme {
  deep: number;
  shallow: number;
  foam: number;
  sail: number;
  emissive: number;
  emissiveIntensity: number;
}

const SEA: Record<Theme, SeaTheme> = {
  day: {
    deep: 0x0d6ea8,
    shallow: 0x36b7d8,
    foam: 0xf4feff,
    sail: 0xfff8ec,
    emissive: 0x0a3d63,
    emissiveIntensity: 0.15,
  },
  night: {
    deep: 0x061b3f,
    shallow: 0x11487e,
    foam: 0x9fe2ff,
    sail: 0xd8e6ff,
    emissive: 0x08234f,
    emissiveIntensity: 0.55,
  },
};

const box = (
  parent: THREE.Object3D,
  color: number,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  mat?: "std" | "basic",
) => {
  const material =
    mat === "basic"
      ? new THREE.MeshBasicMaterial({ color, toneMapped: false })
      : new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true });
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = mat !== "basic";
  parent.add(m);
  return m;
};

export interface Seascape {
  group: THREE.Group;
  update: (t: number, dt: number) => void;
  dispose: () => void;
}

export function createSeascape(theme: Theme): Seascape {
  const C = SEA[theme];
  const isDay = theme === "day";
  const rnd = mulberry32(77123);
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  /* ---------------- Okyanus: bloklu dalga kabartmalı dev düzlem ---------------- */
  const oceanGeo = new THREE.PlaneGeometry(2600, 2600, 220, 220);
  oceanGeo.rotateX(-Math.PI / 2);
  const oceanMat = new THREE.MeshStandardMaterial({
    color: C.shallow,
    roughness: isDay ? 0.75 : 0.6,
    metalness: 0.05,
    transparent: true,
    opacity: 0.94,
    emissive: new THREE.Color(C.emissive),
    emissiveIntensity: C.emissiveIntensity,
    flatShading: true,
  });
  const waveUniform = { value: 0 };
  oceanMat.onBeforeCompile = (shader) => {
    shader.uniforms["uTime"] = waveUniform;
    shader.uniforms["uDeep"] = { value: new THREE.Color(C.deep) };
    shader.uniforms["uShallow"] = { value: new THREE.Color(C.shallow) };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        [
          "#include <common>",
          "uniform float uTime;",
          "varying float vWave;",
          "varying float vDist;",
        ].join("\n"),
      )
      .replace(
        "#include <begin_vertex>",
        [
          "#include <begin_vertex>",
          "float wx = floor(position.x / 4.0) * 4.0;",
          "float wz = floor(position.z / 4.0) * 4.0;",
          "float w = sin(wx * 0.055 + uTime * 0.9) * 0.55",
          "        + cos(wz * 0.041 - uTime * 0.7) * 0.45",
          "        + sin((wx + wz) * 0.021 + uTime * 0.45) * 0.6;",
          "transformed.y += w;",
          "vWave = w;",
          "vDist = length(position.xz);",
        ].join("\n"),
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        [
          "#include <common>",
          "uniform vec3 uDeep;",
          "uniform vec3 uShallow;",
          "varying float vWave;",
          "varying float vDist;",
        ].join("\n"),
      )
      .replace(
        "#include <color_fragment>",
        [
          "#include <color_fragment>",
          "if (vDist < INNER_CUTOFF) discard;",
          "float shore = smoothstep(SHORE_FAR, SHORE_NEAR, vDist);",
          "float band = step(0.18, fract(vWave * 1.6));",
          "vec3 sea = mix(uDeep, uShallow, clamp(shore * 0.85 + vWave * 0.16 + 0.1, 0.0, 1.0));",
          "sea = mix(sea, sea * 1.12, band);",
          "diffuseColor.rgb = sea;",
        ]
          .join("\n")
          .replace("SHORE_FAR", (ISLAND_R + 90).toFixed(1))
          .replace("SHORE_NEAR", (ISLAND_R - 30).toFixed(1))
          .replace("INNER_CUTOFF", (ISLAND_R - 55).toFixed(1)),
      );
  };
  const ocean = new THREE.Mesh(oceanGeo, oceanMat);
  ocean.position.y = SEA_LEVEL;
  ocean.receiveShadow = false;
  ocean.frustumCulled = false;
  group.add(ocean);
  disposables.push(oceanGeo, oceanMat);

  /* ---------------- Kıyı köpüğü ---------------- */
  const foamMat = new THREE.MeshBasicMaterial({
    color: C.foam,
    transparent: true,
    opacity: isDay ? 0.4 : 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const foams: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.RingGeometry(ISLAND_R - 12 + i * 7, ISLAND_R + 2 + i * 8, 128);
    const ring = new THREE.Mesh(geo, foamMat.clone());
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = SEA_LEVEL + 0.35 + i * 0.02;
    group.add(ring);
    foams.push(ring);
    disposables.push(geo);
  }

  /* ---------------- Savaş gemileri (fırkateyn) ---------------- */
  interface Ship {
    root: THREE.Group;
    radius: number;
    speed: number;
    phase: number;
    sails: THREE.Mesh[];
  }
  const HULL_DARK = 0x4a5560;
  const HULL_LIGHT = 0x9aa5ad;
  const DECK = 0x7c8790;

  const buildShip = (scale: number) => {
    const root = new THREE.Group();
    const hull = new THREE.Group();

    // Uzun keskin gövde (pruva önde, +Z)
    for (let i = -12; i <= 12; i++) {
      const tz = i / 12;
      const w = 6.2 * (1 - Math.pow(Math.max(0, tz), 2) * 0.85) * (1 - Math.max(0, -tz) * 0.25);
      const h = 4.6 + Math.max(0, tz) * 2.6;
      const b = box(hull, HULL_DARK, w, h, 2.1, 0, h / 2 - 3.2, i * 2.05);
      b.receiveShadow = true;
    }
    // Su altı kırmızı şerit
    box(hull, 0x7a3a34, 6.0, 1.2, 48, 0, -3.4, 0);
    // Güverte
    box(hull, DECK, 6.4, 0.6, 50, 0, 1.5, 0);
    // Pruva yükseltisi
    box(hull, HULL_DARK, 3.2, 3.0, 6, 0, 3.0, 21);
    // Üst yapı (stealth eğimli kademeler)
    box(hull, HULL_LIGHT, 5.6, 4.0, 16, 0, 3.8, 1);
    box(hull, HULL_LIGHT, 4.6, 3.2, 11, 0, 7.2, 2);
    box(hull, HULL_DARK, 3.6, 2.6, 7, 0, 10.0, 3);
    // Köprüüstü camları
    box(hull, 0x1b2733, 3.8, 1.0, 0.4, 0, 10.2, 6.6, "basic");
    // Ana direk / radar kulesi
    box(hull, HULL_LIGHT, 2.6, 7.0, 2.6, 0, 14.6, 1.5);
    box(hull, HULL_DARK, 3.4, 0.8, 3.4, 0, 17.0, 1.5);
    box(hull, HULL_LIGHT, 1.6, 5.0, 1.6, 0, 20.0, 1.5);
    box(hull, 0x2c3742, 2.2, 2.2, 0.5, 0, 21.6, 1.9);
    box(hull, HULL_LIGHT, 0.4, 4.0, 0.4, 0, 24.0, 1.5);
    // Yan radar panelleri
    for (const sx of [-1.5, 1.5]) box(hull, 0x30414f, 0.5, 2.2, 2.2, sx * 1.6, 12.4, 4.4);
    // Bacalar
    box(hull, HULL_DARK, 2.4, 4.0, 3.2, 0, 8.4, -6);
    box(hull, 0x1f272e, 2.0, 0.5, 2.6, 0, 10.6, -6);
    // Helikopter güvertesi
    box(hull, 0x3d474f, 6.0, 0.5, 12, 0, 2.0, -18);
    box(hull, 0xd8dde0, 0.6, 0.1, 5, 0, 2.3, -18, "basic");
    box(hull, 0xd8dde0, 4, 0.1, 0.6, 0, 2.3, -18, "basic");
    // Hangar
    box(hull, HULL_LIGHT, 4.6, 3.4, 6, 0, 3.9, -11);
    // Top kulesi
    box(hull, HULL_LIGHT, 3.0, 1.8, 3.4, 0, 3.0, 15);
    box(hull, 0x2c3742, 0.5, 0.5, 6, 0, 3.6, 19);
    // Dikey füze hücreleri
    for (let gx = -1; gx <= 1; gx++)
      for (let gz = 0; gz < 3; gz++)
        box(hull, 0x33414c, 1.1, 0.4, 1.1, gx * 1.4, 2.0, 10 + gz * 1.5);
    // Küpeşteler
    for (const sx of [-1, 1]) box(hull, 0x5d6871, 0.35, 1.0, 40, sx * 3.1, 2.3, -2);
    // Türk bayrağı (kıç)
    box(hull, 0xd12b2b, 3.0, 1.8, 0.2, 0, 6.0, -25, "basic");
    box(hull, 0xffffff, 0.9, 0.9, 0.3, 0.2, 6.0, -25.1, "basic");
    // Pruva bayrak direği
    box(hull, 0xb9c2c8, 0.3, 4.0, 0.3, 0, 6.0, 24);

    hull.scale.setScalar(scale);
    root.add(hull);
    return { root, hull, sails: [] as THREE.Mesh[] };
  };

  // Küçük sandallar
  const buildBoat = (scale: number, col: number, accent: number) => {
    const root = new THREE.Group();
    const b = new THREE.Group();
    for (let i = -3; i <= 3; i++) {
      const w = 2.2 - Math.abs(i) * 0.22;
      box(b, col, w, 1.0, 1.1, 0, 0, i * 1.05);
    }
    box(b, accent, 2.0, 0.3, 7, 0, 0.6, 0);
    for (const sz of [-1.4, 1.4]) box(b, accent, 2.1, 0.35, 0.7, 0, 0.85, sz);
    // kürekler
    box(b, 0x8b6b45, 4.4, 0.2, 0.2, 0, 1.0, 0.2);
    box(b, 0x8b6b45, 0.25, 0.2, 1.4, -2.2, 0.9, 0.2);
    box(b, 0x8b6b45, 0.25, 0.2, 1.4, 2.2, 0.9, 0.2);
    b.scale.setScalar(scale);
    root.add(b);
    return root;
  };

  const ships: Ship[] = [];
  const shipDefs: Array<[number, number, number, number, number]> = [
    [2.4, 0, 0, 320, 0.03],
    [2.8, 0, 0, 380, -0.022],
    [2.1, 0, 0, 440, 0.018],
    [3.2, 0, 0, 510, -0.014],
    [1.8, 0, 0, 270, 0.042],
    [2.0, 0, 0, 240, -0.05],
    [2.6, 0, 0, 560, 0.012],
    [1.9, 0, 0, 350, -0.034],
    [1.5, 0, 0, 205, 0.058],
    [3.0, 0, 0, 620, -0.01],
  ];
  for (const [s, , , radius, speed] of shipDefs) {
    const { root, sails } = buildShip(s);
    group.add(root);
    ships.push({ root, radius, speed, phase: rnd() * Math.PI * 2, sails });
  }

  // Sandallar kıyıya yakın dolaşır
  const boatCols: Array<[number, number]> = [
    [0x8a5a30, 0xd8b070],
    [0x5c6b3a, 0xe8dfa8],
    [0x8a3f3f, 0xf2c9a0],
    [0x40566e, 0xcfe2f5],
  ];
  for (let i = 0; i < 10; i++) {
    const [c, a] = boatCols[i % boatCols.length]!;
    const root = buildBoat(1.6 + rnd() * 1.2, c, a);
    group.add(root);
    ships.push({
      root,
      radius: ISLAND_R + 25 + rnd() * 70,
      speed: (rnd() > 0.5 ? 1 : -1) * (0.05 + rnd() * 0.06),
      phase: rnd() * Math.PI * 2,
      sails: [],
    });
  }


  /* ---------------- Balık sürüleri ---------------- */
  const fishGeo = new THREE.BoxGeometry(1.6, 0.9, 0.7);
  const fishColors = [0xffb347, 0xff6b6b, 0x4fd1c5, 0xffe066, 0xc084fc, 0x7dd3fc];
  const schools: Array<{
    mesh: THREE.InstancedMesh;
    cx: number;
    cz: number;
    r: number;
    speed: number;
    count: number;
    seeds: number[];
  }> = [];
  for (let s = 0; s < 20; s++) {
    const count = 24;
    const mat = new THREE.MeshStandardMaterial({
      color: fishColors[s % fishColors.length]!,
      roughness: 0.5,
      metalness: 0.25,
      emissive: new THREE.Color(fishColors[s % fishColors.length]!),
      emissiveIntensity: isDay ? 0.12 : 0.5,
      flatShading: true,
    });
    const mesh = new THREE.InstancedMesh(fishGeo, mat, count);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    group.add(mesh);
    const a = (s / 20) * Math.PI * 2 + rnd();
    const rr = ISLAND_R + 45 + rnd() * 140;
    schools.push({
      mesh,
      cx: Math.cos(a) * rr,
      cz: Math.sin(a) * rr,
      r: 10 + rnd() * 16,
      speed: 0.5 + rnd() * 0.5,
      count,
      seeds: Array.from({ length: count }, () => rnd()),
    });
    disposables.push(mat);
  }
  disposables.push(fishGeo);

  /* ---------------- Ahtapotlar ---------------- */
  interface Octo {
    root: THREE.Group;
    tentacles: THREE.Object3D[][];
    phase: number;
    baseY: number;
  }
  const octos: Octo[] = [];
  const octoColors = [0xb5417a, 0x8b3fb0, 0xd4577a, 0x6f4bd8];
  for (let i = 0; i < 16; i++) {
    const col = octoColors[i % octoColors.length]!;
    const root = new THREE.Group();
    const head = box(root, col, 4.4, 3.4, 4.4, 0, 1.9, 0);
    head.receiveShadow = true;
    box(root, col, 3.4, 1, 3.4, 0, 3.7, 0);
    box(root, 0xffffff, 1, 1, 0.5, -1.1, 2.2, 2.3, "basic");
    box(root, 0xffffff, 1, 1, 0.5, 1.1, 2.2, 2.3, "basic");
    box(root, 0x11121a, 0.5, 0.5, 0.4, -1.1, 2.15, 2.55, "basic");
    box(root, 0x11121a, 0.5, 0.5, 0.4, 1.1, 2.15, 2.55, "basic");
    const tentacles: THREE.Object3D[][] = [];
    for (let t = 0; t < 8; t++) {
      const a = (t / 8) * Math.PI * 2;
      const segs: THREE.Object3D[] = [];
      for (let s = 0; s < 4; s++) {
        const seg = box(
          root,
          s % 2 ? col : 0xe07aa8,
          1.1 - s * 0.15,
          1.1 - s * 0.15,
          1.1 - s * 0.15,
          Math.cos(a) * (2 + s * 1.1),
          0.4 - s * 0.15,
          Math.sin(a) * (2 + s * 1.1),
        );
        seg.userData["a"] = a;
        seg.userData["s"] = s;
        segs.push(seg);
      }
      tentacles.push(segs);
    }
    const a = (i / 16) * Math.PI * 2 + 0.7;
    const rr = ISLAND_R + 55 + rnd() * 110;
    root.position.set(Math.cos(a) * rr, SEA_LEVEL - 0.6, Math.sin(a) * rr);
    group.add(root);
    octos.push({ root, tentacles, phase: rnd() * 6, baseY: SEA_LEVEL - 0.6 });
  }

  /* ---------------- Yunus sürüsü ---------------- */
  interface Dolphin {
    root: THREE.Group;
    cx: number;
    cz: number;
    r: number;
    speed: number;
    phase: number;
  }
  const dolphins: Dolphin[] = [];
  const dolphinBody = isDay ? 0x5c7a95 : 0x35506c;
  const dolphinBelly = isDay ? 0xe7f2f7 : 0x9fb6c4;
  for (let i = 0; i < 9; i++) {
    const pod = new THREE.Group();
    const podCount = 3 + Math.floor(rnd() * 2);
    for (let d = 0; d < podCount; d++) {
      const dolphin = new THREE.Group();
      box(dolphin, dolphinBody, 3.2, 1.4, 1.3, 0, 0, 0).receiveShadow = true;
      box(dolphin, dolphinBelly, 2.6, 0.7, 1.15, 0, -0.4, 0);
      box(dolphin, dolphinBody, 1.1, 0.9, 0.9, -1.9, 0.05, 0);
      box(dolphin, dolphinBody, 0.35, 1.1, 0.15, 2.1, 0.9, 0);
      box(dolphin, dolphinBody, 1.3, 0.15, 0.5, -2.55, 0, 0);
      box(dolphin, dolphinBody, 0.15, 0.7, 0.7, 0.1, -0.15, 0);
      dolphin.position.set((rnd() - 0.5) * 6, 0, (rnd() - 0.5) * 4);
      dolphin.userData["seed"] = rnd();
      pod.add(dolphin);
    }
    const a = (i / 9) * Math.PI * 2 + rnd();
    const rr = ISLAND_R + 40 + rnd() * 70;
    dolphins.push({ root: pod, cx: Math.cos(a) * rr, cz: Math.sin(a) * rr, r: 14 + rnd() * 10, speed: 0.35 + rnd() * 0.2, phase: rnd() * Math.PI * 2 });
    group.add(pod);
  }

  /* ---------------- Balinalar ---------------- */
  interface Whale {
    root: THREE.Group;
    spout: THREE.Group;
    cx: number;
    cz: number;
    r: number;
    speed: number;
    phase: number;
  }
  const whales: Whale[] = [];
  const whaleBody = isDay ? 0x2f4f6d : 0x1b2f47;
  const whaleBelly = isDay ? 0xcfdde6 : 0x7f95a6;
  for (let i = 0; i < 5; i++) {
    const root = new THREE.Group();
    for (let s = -4; s <= 4; s++) {
      const w = 7 - Math.abs(s) * 1.1;
      box(root, whaleBody, w, w * 0.75, 3.2, 0, 0, s * 3.1);
    }
    box(root, whaleBelly, 5, 1.2, 20, 0, -2.4, 0);
    box(root, whaleBody, 1, 3.4, 3.4, 0, 3.4, 2, "std");
    box(root, whaleBody, 10, 0.9, 3.6, 0, 0.4, -15);
    box(root, whaleBody, 3.2, 0.7, 6, -4.6, -1.4, 3);
    box(root, whaleBody, 3.2, 0.7, 6, 4.6, -1.4, 3);
    box(root, 0x0d1117, 0.7, 0.7, 0.6, -2.6, 1.2, 11.4, "basic");
    box(root, 0x0d1117, 0.7, 0.7, 0.6, 2.6, 1.2, 11.4, "basic");
    const spout = new THREE.Group();
    for (let s = 0; s < 5; s++) {
      box(spout, 0xeafaff, 1.2 - s * 0.15, 1.2 - s * 0.15, 1.2 - s * 0.15, (s % 2 ? 1 : -1) * s * 0.4, 4 + s * 1.6, 4, "basic");
    }
    root.add(spout);
    const a = (i / 5) * Math.PI * 2 + 1.3;
    const rr = ISLAND_R + 130 + rnd() * 190;
    whales.push({
      root,
      spout,
      cx: Math.cos(a) * rr,
      cz: Math.sin(a) * rr,
      r: 30 + rnd() * 25,
      speed: 0.12 + rnd() * 0.08,
      phase: rnd() * Math.PI * 2,
    });
    group.add(root);
  }

  /* ---------------- Deniz kaplumbağaları ---------------- */
  interface Turtle {
    root: THREE.Group;
    fins: THREE.Mesh[];
    cx: number;
    cz: number;
    r: number;
    speed: number;
    phase: number;
  }
  const turtles: Turtle[] = [];
  for (let i = 0; i < 10; i++) {
    const root = new THREE.Group();
    box(root, 0x3f6b46, 3.4, 1.2, 3, 0, 0, 0);
    box(root, 0x5c8f56, 2.4, 0.7, 2.1, 0, 0.9, 0);
    box(root, 0x8fb36a, 0.9, 0.5, 3.4, 0, 0.7, 1.9);
    const fins = [
      box(root, 0x4e7d4f, 2.1, 0.35, 0.9, -2.1, 0, 0.9),
      box(root, 0x4e7d4f, 2.1, 0.35, 0.9, 2.1, 0, 0.9),
      box(root, 0x4e7d4f, 1.5, 0.3, 0.7, -1.8, 0, -1.2),
      box(root, 0x4e7d4f, 1.5, 0.3, 0.7, 1.8, 0, -1.2),
    ];
    root.scale.setScalar(1.3 + rnd() * 0.8);
    const a = rnd() * Math.PI * 2;
    const rr = ISLAND_R + 30 + rnd() * 160;
    turtles.push({
      root,
      fins,
      cx: Math.cos(a) * rr,
      cz: Math.sin(a) * rr,
      r: 8 + rnd() * 12,
      speed: 0.2 + rnd() * 0.2,
      phase: rnd() * Math.PI * 2,
    });
    group.add(root);
  }

  /* ---------------- Denizanaları ---------------- */
  const jellies: Array<{ root: THREE.Group; base: number; phase: number; tents: THREE.Object3D[] }> = [];
  const jellyColors = [0xff9ecb, 0x9ad7ff, 0xd6a8ff, 0xa8ffe4];
  for (let i = 0; i < 18; i++) {
    const col = jellyColors[i % jellyColors.length]!;
    const root = new THREE.Group();
    box(root, col, 2.6, 1.4, 2.6, 0, 0, 0, "basic");
    box(root, col, 1.8, 0.8, 1.8, 0, 0.9, 0, "basic");
    const tents: THREE.Object3D[] = [];
    for (let t = 0; t < 5; t++) {
      const tx = (t - 2) * 0.6;
      tents.push(box(root, col, 0.3, 2.4, 0.3, tx, -1.6, 0, "basic"));
    }
    const a = rnd() * Math.PI * 2;
    const rr = ISLAND_R + 25 + rnd() * 180;
    root.position.set(Math.cos(a) * rr, SEA_LEVEL - 1, Math.sin(a) * rr);
    group.add(root);
    jellies.push({ root, base: SEA_LEVEL - 1, phase: rnd() * 6, tents });
  }

  /* ---------------- Köpekbalığı yüzgeçleri ---------------- */
  const sharks: Array<{ root: THREE.Group; cx: number; cz: number; r: number; speed: number; phase: number }> = [];
  for (let i = 0; i < 7; i++) {
    const root = new THREE.Group();
    box(root, 0x54636f, 6.4, 1.6, 2.2, 0, -0.6, 0);
    box(root, 0x8b9aa5, 4.4, 0.7, 1.8, 0, -1.3, 0);
    box(root, 0x54636f, 1.2, 2.4, 0.5, 0, 0.9, 0);
    box(root, 0x54636f, 0.5, 2, 1.8, -3.6, 0, 0);
    const a = rnd() * Math.PI * 2;
    const rr = ISLAND_R + 70 + rnd() * 170;
    sharks.push({
      root,
      cx: Math.cos(a) * rr,
      cz: Math.sin(a) * rr,
      r: 18 + rnd() * 20,
      speed: 0.3 + rnd() * 0.25,
      phase: rnd() * Math.PI * 2,
    });
    group.add(root);
  }

  /* ---------------- Kayalıklar ve şamandıralar ---------------- */
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = ISLAND_R + 20 + rnd() * 240;
    const rock = new THREE.Group();
    const h = 3 + rnd() * 7;
    box(rock, isDay ? 0x6b7280 : 0x39424f, 4 + rnd() * 5, h, 4 + rnd() * 5, 0, h / 2 - 1.5, 0);
    box(rock, isDay ? 0x8a929c : 0x4c5766, 3, 1.6, 3, 1, h - 1.2, -0.6);
    rock.position.set(Math.cos(a) * rr, SEA_LEVEL - 1, Math.sin(a) * rr);
    rock.rotation.y = rnd() * Math.PI;
    group.add(rock);
  }

  /* ---------------- Kum sığlıkları ve yosun tarlaları ---------------- */
  const weeds: THREE.Object3D[] = [];
  const sandCols = isDay ? [0xe8d8a8, 0xdcc890, 0xf0e4bc] : [0x7d7357, 0x6b6249, 0x8b8062];
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const rr = ISLAND_R + 15 + rnd() * 260;
    const cx = Math.cos(a) * rr;
    const cz = Math.sin(a) * rr;
    // kum yaması: birkaç düz blok
    const patch = new THREE.Group();
    const blocks = 3 + Math.floor(rnd() * 4);
    for (let b = 0; b < blocks; b++) {
      const w = 8 + rnd() * 16;
      const d = 8 + rnd() * 16;
      box(
        patch,
        sandCols[Math.floor(rnd() * sandCols.length)]!,
        w,
        0.8,
        d,
        (rnd() - 0.5) * 14,
        0,
        (rnd() - 0.5) * 14,
      );
    }
    patch.position.set(cx, SEA_LEVEL - 2.2, cz);
    group.add(patch);

    // yosunlar
    const weedCols = isDay ? [0x2f7d4f, 0x3f9b5e, 0x6aa84f] : [0x1c4a30, 0x24623c, 0x3d6b34];
    const n = 4 + Math.floor(rnd() * 6);
    for (let w = 0; w < n; w++) {
      const stalk = new THREE.Group();
      const segs = 2 + Math.floor(rnd() * 3);
      for (let s = 0; s < segs; s++) {
        box(
          stalk,
          weedCols[Math.floor(rnd() * weedCols.length)]!,
          0.7,
          1.8,
          0.7,
          Math.sin(s) * 0.3,
          0.9 + s * 1.7,
          0,
        );
      }
      stalk.position.set(cx + (rnd() - 0.5) * 22, SEA_LEVEL - 2.0, cz + (rnd() - 0.5) * 22);
      stalk.rotation.y = rnd() * Math.PI;
      stalk.userData["p"] = rnd() * 6;
      group.add(stalk);
      weeds.push(stalk);
    }
  }



  /* ---------------- Martılar ---------------- */
  interface Bird {
    root: THREE.Group;
    wings: THREE.Mesh[];
    r: number;
    y: number;
    speed: number;
    phase: number;
  }
  const birds: Bird[] = [];
  for (let i = 0; i < 18; i++) {
    const root = new THREE.Group();
    box(root, 0xf6f8fb, 1.4, 0.7, 0.8, 0, 0, 0);
    box(root, 0xffc14d, 0.5, 0.25, 0.25, 0.9, 0, 0);
    const wings = [
      box(root, 0xeef3fa, 0.8, 0.2, 2.6, 0, 0.3, 1.6),
      box(root, 0xeef3fa, 0.8, 0.2, 2.6, 0, 0.3, -1.6),
    ];
    root.scale.setScalar(1.4);
    group.add(root);
    birds.push({
      root,
      wings,
      r: 90 + rnd() * 260,
      y: 34 + rnd() * 44,
      speed: 0.08 + rnd() * 0.1,
      phase: rnd() * Math.PI * 2,
    });
  }

  /* ---------------- Animasyon ---------------- */
  const dummy = new THREE.Object3D();
  const update = (t: number) => {
    waveUniform.value = t;

    foams.forEach((ring, i) => {
      const m = ring.material as THREE.MeshBasicMaterial;
      m.opacity = (isDay ? 0.34 : 0.22) * (0.55 + 0.45 * Math.sin(t * 0.9 - i * 1.1));
      ring.scale.setScalar(1 + Math.sin(t * 0.7 + i) * 0.005);
    });

    for (const s of ships) {
      const a = s.phase + t * s.speed * 0.2;
      s.root.position.set(Math.cos(a) * s.radius, SEA_LEVEL + 0.9, Math.sin(a) * s.radius);
      s.root.rotation.y = -a + (s.speed > 0 ? Math.PI / 2 : -Math.PI / 2);
      s.root.position.y += Math.sin(t * 1.3 + s.phase) * 0.55;
      s.root.rotation.z = Math.sin(t * 1.1 + s.phase) * 0.05;
      s.root.rotation.x = Math.cos(t * 0.9 + s.phase) * 0.035;
      s.sails.forEach((sail, i) => {
        sail.scale.x = 1 + Math.sin(t * 1.6 + i) * 0.05;
      });
    }

    for (const school of schools) {
      for (let i = 0; i < school.count; i++) {
        const seed = school.seeds[i]!;
        const a = t * school.speed + seed * Math.PI * 2;
        const r = school.r * (0.5 + seed * 0.7);
        const jump = Math.sin(t * 1.6 + seed * 9);
        const y = SEA_LEVEL - 0.5 + Math.max(0, jump) * 3.4;
        dummy.position.set(
          school.cx + Math.cos(a) * r,
          y,
          school.cz + Math.sin(a) * r * 0.75,
        );
        dummy.rotation.set(-jump * 0.7, -a + Math.PI / 2, Math.sin(t * 8 + seed * 5) * 0.25);
        const sc = 0.8 + seed * 0.9;
        dummy.scale.set(sc, sc, sc);
        dummy.updateMatrix();
        school.mesh.setMatrixAt(i, dummy.matrix);
      }
      school.mesh.instanceMatrix.needsUpdate = true;
    }

    for (const o of octos) {
      o.root.position.y = o.baseY + Math.sin(t * 0.9 + o.phase) * 0.7;
      o.root.rotation.y = Math.sin(t * 0.25 + o.phase) * 0.8;
      o.tentacles.forEach((segs, ti) => {
        segs.forEach((seg) => {
          const a = seg.userData["a"] as number;
          const s = seg.userData["s"] as number;
          const wob = Math.sin(t * 2.4 + ti * 0.8 + s * 0.9 + o.phase);
          const reach = 2 + s * 1.1 + wob * 0.35;
          seg.position.set(Math.cos(a) * reach, 0.4 - s * 0.35 + wob * 0.55, Math.sin(a) * reach);
        });
      });
    }

    for (const b of birds) {
      const a = b.phase + t * b.speed;
      b.root.position.set(Math.cos(a) * b.r, b.y + Math.sin(t * 0.8 + b.phase) * 3.5, Math.sin(a) * b.r);
      b.root.rotation.y = -a + Math.PI / 2;
      const flap = Math.sin(t * 7 + b.phase);
      b.wings[0]!.rotation.x = flap * 0.6;
      b.wings[1]!.rotation.x = -flap * 0.6;
    }

    for (const pod of dolphins) {
      const a = pod.phase + t * pod.speed * 0.25;
      pod.root.position.set(pod.cx + Math.cos(a) * pod.r, 0, pod.cz + Math.sin(a) * pod.r);
      pod.root.rotation.y = -a + Math.PI / 2;
      pod.root.children.forEach((dolphin) => {
        const seed = dolphin.userData["seed"] as number;
        const arc = Math.sin(t * 1.1 + seed * 8);
        dolphin.position.y = SEA_LEVEL - 0.3 + Math.max(0, arc) * 4.2;
        dolphin.rotation.x = arc * 0.55;
        dolphin.rotation.z = Math.sin(t * 3 + seed * 6) * 0.08;
      });
    }

    for (const w of whales) {
      const a = w.phase + t * w.speed * 0.2;
      const dive = Math.sin(t * 0.35 + w.phase);
      w.root.position.set(
        w.cx + Math.cos(a) * w.r,
        SEA_LEVEL - 3.5 + Math.max(0, dive) * 5,
        w.cz + Math.sin(a) * w.r,
      );
      w.root.rotation.y = -a + Math.PI / 2;
      w.root.rotation.x = dive * 0.18;
      const spouting = dive > 0.75;
      w.spout.visible = spouting;
      w.spout.scale.setScalar(spouting ? 0.7 + Math.sin(t * 6) * 0.25 : 0.001);
    }

    for (const tu of turtles) {
      const a = tu.phase + t * tu.speed * 0.3;
      tu.root.position.set(
        tu.cx + Math.cos(a) * tu.r,
        SEA_LEVEL - 0.4 + Math.sin(t * 0.9 + tu.phase) * 0.5,
        tu.cz + Math.sin(a) * tu.r,
      );
      tu.root.rotation.y = -a + Math.PI / 2;
      tu.fins.forEach((f, i) => {
        f.rotation.z = Math.sin(t * 3 + i * 1.4 + tu.phase) * 0.55 * (i % 2 ? -1 : 1);
      });
    }

    for (const j of jellies) {
      const pulse = Math.sin(t * 1.6 + j.phase);
      j.root.position.y = j.base + pulse * 1.6;
      j.root.scale.set(1 + pulse * 0.14, 1 - pulse * 0.12, 1 + pulse * 0.14);
      j.tents.forEach((seg, i) => {
        seg.rotation.z = Math.sin(t * 2.2 + i + j.phase) * 0.3;
      });
    }

    for (const sh of sharks) {
      const a = sh.phase + t * sh.speed * 0.3;
      sh.root.position.set(
        sh.cx + Math.cos(a) * sh.r,
        SEA_LEVEL - 0.2 + Math.sin(t * 1.4 + sh.phase) * 0.35,
        sh.cz + Math.sin(a) * sh.r,
      );
      sh.root.rotation.y = -a + Math.PI / 2;
      sh.root.rotation.z = Math.sin(t * 2 + sh.phase) * 0.08;
    }

    for (const w of weeds) {
      const p = w.userData["p"] as number;
      w.rotation.z = Math.sin(t * 1.1 + p) * 0.22;
      w.rotation.x = Math.cos(t * 0.9 + p) * 0.16;
    }
  };


  const dispose = () => {
    for (const d of disposables) d.dispose();
    group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      }
    });
  };

  return { group, update, dispose };
}
