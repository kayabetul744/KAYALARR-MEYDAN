import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import {
  CHARACTER,
  DESIGN_CENTER,
  DESIGN_HALF,
  PRODUCTION_CENTER,
  PRODUCTION_HALF,
  MARKET_CENTER,
  MARKET_HALF,
  COMMUNITY_CENTER,
  COMMUNITY_HALF,
  ACHIEVEMENT_CENTER,
  ACHIEVEMENT_HALF,
  IDEA_CENTER,
  IDEA_HALF,
  FACE,
  NPC_LINES,
  REGIONS,
  buildCore,
  buildNpcs,
  buildWorld,
  type HairStyle,
  type Npc,
  type Theme,
  type Voxel,
  type VoxelKind,
  type WalkMap,
} from "@/lib/voxel-world";

import { istanbulClock, type IstanbulClock } from "@/lib/istanbul-time";
import { createSeascape } from "@/lib/seascape";
import { Joystick } from "@/components/Joystick";
import { Sun, Moon, Clock, Footprints, Eye, ChevronsUp, Info } from "lucide-react";

/** N logosunu tuvale çizip doku olarak üretir (bulut varlığı yerel ortamda çözülmediği için) */
function makeLogoTexture(): THREE.CanvasTexture {
  const size = 512;
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext("2d")!;
  const bg = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size / 2);
  bg.addColorStop(0, "#141c3f");
  bg.addColorStop(1, "#070a1a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "#7fe9ff");
  grad.addColorStop(1, "#b56bff");
  ctx.fillStyle = grad;
  ctx.font = "bold 340px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "#8fe9ff";
  ctx.shadowBlur = 46;
  ctx.fillText("N", size / 2, size / 2 + 22);
  ctx.shadowBlur = 0;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
BOX.setAttribute(
  "color",
  new THREE.BufferAttribute(new Float32Array(BOX.attributes["position"]!.count * 3).fill(1), 3),
);

/** Çekirdeğin "fikir analizi" durumları */
const CORE_STATES = [
  { name: "Dinliyor", color: 0x35d6ff },
  { name: "Analiz ediyor", color: 0xa855f7 },
  { name: "Sentezliyor", color: 0x36f2b0 },
  { name: "Fikir üretti", color: 0xffd166 },
] as const;

function makeMaterial(kind: VoxelKind, theme: Theme): THREE.Material {
  const day = theme === "day";
  switch (kind) {
    case "glow":
      return new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    case "lamp":
      return new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    case "water":
      return new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: day ? 0.2 : 0.08,
        metalness: day ? 0.25 : 0.55,
        transparent: true,
        opacity: day ? 0.85 : 0.92,
        emissive: new THREE.Color(day ? 0x2a6fa0 : 0x0a2a66),
        emissiveIntensity: day ? 0.15 : 0.6,
      });
    case "glass":
      return new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.15,
        metalness: 0.2,
        transparent: true,
        opacity: 0.85,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: day ? 0.15 : 0.9,
        toneMapped: !day ? false : true,
      });
    case "leaf":
      return new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.95,
        flatShading: true,
      });
    default:
      return new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.92,
        metalness: 0.04,
      });
  }
}

function instanceGroup(voxels: Voxel[], castShadow: boolean, theme: Theme) {
  const group = new THREE.Group();
  const byKind = new Map<VoxelKind, Voxel[]>();
  for (const v of voxels) {
    const list = byKind.get(v.kind) ?? [];
    list.push(v);
    byKind.set(v.kind, list);
  }
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (const [kind, list] of byKind) {
    const mesh = new THREE.InstancedMesh(BOX, makeMaterial(kind, theme), list.length);
    list.forEach((v, i) => {
      dummy.position.set(v.x, v.y, v.z);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.setHex(v.color).convertSRGBToLinear());
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = castShadow && kind !== "glow" && kind !== "water";
    mesh.receiveShadow = kind !== "glow" && kind !== "lamp";
    mesh.frustumCulled = false;
    group.add(mesh);
  }
  return group;
}

interface CharColors {
  shirt?: number;
  pants?: number;
  skin?: number;
  hair?: number;
  hairStyle?: HairStyle;
}

const flat = (color: number, rough = 0.8) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, flatShading: true });

function buildCharacter(colors: CharColors = {}) {
  const root = new THREE.Group();
  const parts: Record<string, THREE.Object3D> = {};
  let head: THREE.Mesh | null = null;
  for (const p of CHARACTER) {
    let color = p.color;
    if (colors.shirt && (p.name === "body" || p.name === "armL" || p.name === "armR")) {
      color = p.name === "body" ? colors.shirt : colors.shirt;
    }
    if (colors.pants && (p.name === "legL" || p.name === "legR")) color = colors.pants;
    if (colors.skin && p.name === "head") color = colors.skin;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]),
      flat(color),
    );
    mesh.position.set(p.pos[0], p.pos[1], p.pos[2]);
    mesh.castShadow = true;
    root.add(mesh);
    parts[p.name] = mesh;
    if (p.name === "head") head = mesh;
  }

  /* Yüz: göz akı + göz bebeği + kaş + ağız voxelleri */
  if (head) {
    const h: THREE.Mesh = head;
    const skin = colors.skin ?? 0xd9a86a;
    for (const bit of FACE) {
      const c = bit.tone === "dark" ? 0x1b1b22 : bit.tone === "mouth" ? 0x8c4a45 : 0xf7f3ec;
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(bit.size[0], bit.size[1], bit.size[2]),
        flat(c, 0.6),
      );
      m.position.set(bit.pos[0], bit.pos[1], bit.pos[2]);
      h.add(m);
    }


    /* Saç / şapka */
    const hair = colors.hair ?? 0x2a1e18;
    const style = colors.hairStyle ?? "short";
    const addHair = (
      sx: number,
      sy: number,
      sz: number,
      px: number,
      py: number,
      pz: number,
      col = hair,
    ) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), flat(col, 0.85));
      m.position.set(px, py, pz);
      m.castShadow = true;
      h.add(m);
    };
    if (style !== "bald") {
      addHair(0.66, 0.14, 0.66, 0, 0.31, 0, style === "cap" ? 0xe0533a : hair);
      if (style === "cap") addHair(0.5, 0.07, 0.24, 0, 0.25, 0.36, 0xe0533a);
      if (style === "short") addHair(0.66, 0.16, 0.16, 0, 0.18, -0.28);
      if (style === "long") {
        addHair(0.66, 0.5, 0.16, 0, 0.02, -0.28);
        addHair(0.16, 0.42, 0.5, -0.29, 0.04, 0);
        addHair(0.16, 0.42, 0.5, 0.29, 0.04, 0);
      }
      if (style === "bun") addHair(0.24, 0.24, 0.24, 0, 0.36, -0.28);
    }
    // kulaklar
    addHair(0.06, 0.14, 0.14, -0.33, 0.02, 0, skin);
    addHair(0.06, 0.14, 0.14, 0.33, 0.02, 0, skin);
  }

  return { root, parts };
}

/** NPC başının üstünde çıkan sohbet balonu */
function makeBubble(text: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "rgba(12,16,28,0.82)";
  ctx.beginPath();
  ctx.roundRect(4, 4, 504, 104, 28);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,215,255,0.9)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#eaf6ff";
  ctx.font = "600 42px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, 58, 470);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }),
  );
  sprite.scale.set(4.4, 1.1, 1);
  sprite.position.y = 2.85;
  return sprite;
}


const THEMES = {
  night: {
    bg: 0x0c1836,
    fog: 0x14224a,
    fogDensity: 0.0009,
    hemiSky: 0x8fabff,
    hemiGround: 0x2a3560,
    hemiIntensity: 2.7,
    sun: 0xdfe8ff,
    sunIntensity: 3.2,
    sunPos: [70, 110, 40] as const,
    ambient: 0x5c6cb0,
    ambientIntensity: 1.3,
    exposure: 1.45,
    bloom: 0.85,
    bloomThreshold: 0.62,
  },
  day: {
    bg: 0x7ec8ee,
    fog: 0xc7e6f5,
    fogDensity: 0.00035,
    hemiSky: 0xbfe4ff,
    hemiGround: 0x6f8a58,
    hemiIntensity: 1.35,
    sun: 0xfff2cf,
    sunIntensity: 2.8,
    sunPos: [90, 130, 60] as const,
    ambient: 0xffffff,
    ambientIntensity: 0.35,
    exposure: 0.92,
    bloom: 0.0,
    bloomThreshold: 0.98,
  },
} satisfies Record<Theme, unknown>;

type Mode = "orbit" | "walk";

interface SceneProps {
  theme: Theme;
  mode: Mode;
  moveRef: React.RefObject<{ x: number; y: number }>;
  jumpRef: React.RefObject<boolean>;
  onCoreState: (name: string) => void;
  onCamDist: (d: number) => void;
  onZone: (name: string | null) => void;
}

function Scene({ theme, mode, moveRef, jumpRef, onCoreState, onCamDist, onZone }: SceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<Mode>(mode);
  modeRef.current = mode;
  const stateCb = useRef(onCoreState);
  stateCb.current = onCoreState;
  const distCb = useRef(onCamDist);
  distCb.current = onCamDist;
  const zoneCb = useRef(onZone);
  zoneCb.current = onZone;



  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const T = THEMES[theme];
    const isDay = theme === "day";

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = T.exposure;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(T.bg);
    scene.fog = new THREE.FogExp2(T.fog, T.fogDensity);

    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / host.clientHeight, 0.1, 3000);
    camera.position.set(140, 110, 140);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 8, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 30;
    controls.maxDistance = 650;
    controls.zoomToCursor = true;
    controls.minPolarAngle = 0.25;
    controls.maxPolarAngle = 1.32;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.22;

    scene.add(new THREE.HemisphereLight(T.hemiSky, T.hemiGround, T.hemiIntensity));
    const sun = new THREE.DirectionalLight(T.sun, T.sunIntensity);
    sun.position.set(T.sunPos[0], T.sunPos[1], T.sunPos[2]);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.8;
    const c = sun.shadow.camera;
    c.left = -180;
    c.right = 180;
    c.top = 180;
    c.bottom = -180;
    c.far = 500;
    scene.add(sun);
    scene.add(new THREE.AmbientLight(T.ambient, T.ambientIntensity));

    const coreLight = new THREE.PointLight(0x5cc8ff, isDay ? 280 : 1000, 170, 2);
    coreLight.position.set(0, 26, 0);
    scene.add(coreLight);

    /* Dünya */
    const { voxels, walk } = buildWorld(theme);
    scene.add(instanceGroup(voxels, true, theme));

    /* Ada çevresindeki deniz: okyanus, gemiler, balıklar, ahtapotlar, bulutlar */
    const seascape = createSeascape(theme);
    scene.add(seascape.group);

    /* ---------- Meydandaki voxel insanlar: yüz detaylı, dolaşan, sohbet eden ---------- */
    const groundAtMap = (x: number, z: number) => walk.get(`${Math.round(x)},${Math.round(z)}`);
    const npcs = buildNpcs(walk);
    interface NpcNode {
      n: Npc;
      root: THREE.Group;
      parts: Record<string, THREE.Object3D>;
      bubble: THREE.Sprite;
      tx: number;
      tz: number;
      wait: number;
      talk: number;
      phase: number;
    }
    const pickTarget = (n: Npc) => {
      const zoneNpc = Math.hypot(n.homeX, n.homeZ) > 60;
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * (zoneNpc ? 5 : 9);
        const tx = n.homeX + Math.cos(a) * r;
        const tz = n.homeZ + Math.sin(a) * r;
        if (!zoneNpc && (Math.hypot(tx, tz) > 23 || Math.hypot(tx, tz) < 7)) continue;
        if (groundAtMap(tx, tz) === undefined) continue;
        return { tx, tz };
      }
      return { tx: n.x, tz: n.z };
    };

    const npcNodes: NpcNode[] = npcs.map((n) => {
      const { root, parts } = buildCharacter({
        shirt: n.shirt,
        pants: n.pants,
        skin: n.skin,
        hair: n.hair,
        hairStyle: n.hairStyle,
      });
      root.position.set(n.x, n.y, n.z);
      root.rotation.y = n.yaw;
      root.scale.setScalar(n.scale);
      const bubble = makeBubble(NPC_LINES[Math.floor(Math.random() * NPC_LINES.length)]!);
      root.add(bubble);
      scene.add(root);
      const t = pickTarget(n);
      return {
        n,
        root,
        parts,
        bubble,
        tx: t.tx,
        tz: t.tz,
        wait: Math.random() * 4,
        talk: 2 + Math.random() * 20,
        phase: n.phase,
      };
    });


    /* ---------- Merkez: dairesel hologram platformu ---------- */
    const platform = new THREE.Group();
    platform.position.set(0, 3.05, 0);
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(7.2, 7.8, 0.5, 48),
      new THREE.MeshStandardMaterial({
        color: 0x2a3355,
        roughness: 0.5,
        metalness: 0.35,
        emissive: new THREE.Color(0x0d2a55),
        emissiveIntensity: isDay ? 0.25 : 0.8,
      }),
    );
    disc.receiveShadow = true;
    platform.add(disc);
    const platformGlow = new THREE.Mesh(
      new THREE.RingGeometry(4.2, 6.6, 64),
      new THREE.MeshBasicMaterial({
        color: 0x35d6ff,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    platformGlow.rotation.x = -Math.PI / 2;
    platformGlow.position.y = 0.28;
    platform.add(platformGlow);
    scene.add(platform);

    /* ---------- Merkez hologram küp + 6 yöne enerji ışını ---------- */
    const coreGroup = new THREE.Group();
    coreGroup.position.set(0, 26, 0);
    const coreVox = instanceGroup(buildCore(12), false, theme);
    /* Kristal kabuk yarı saydam olsun ki içindeki logo net görünsün */
    coreVox.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !Array.isArray(m.material)) {
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.transparent = true;
        mat.opacity = isDay ? 0.26 : 0.32;
        mat.depthWrite = false;
      }
    });
    coreGroup.add(coreVox);

    /* ---------- Çekirdeğin içinde N logosu: görsel voxele çevrilmeden, düz haliyle küp yüzeylerinde ---------- */
    const logoTex = makeLogoTexture();
    const logoMat = new THREE.MeshBasicMaterial({ map: logoTex, toneMapped: false });
    const logoCube = new THREE.Mesh(new THREE.BoxGeometry(8.4, 8.4, 8.4), logoMat);
    coreGroup.add(logoCube);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x6ad8ff,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const tipMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const AXES: [number, number, number][] = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
    const beamLen = 16;
    const arms: THREE.Group[] = [];
    for (const [ax, ay, az] of AXES) {
      const arm = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.9, beamLen, 0.9), beamMat);
      shaft.position.y = beamLen / 2 + 4.5;
      arm.add(shaft);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 2.6), tipMat);
      tip.position.y = beamLen + 5.1;
      arm.add(tip);
      arm.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(ax, ay, az).normalize(),
      );
      arms.push(arm);
      coreGroup.add(arm);
    }
    scene.add(coreGroup);

    /* ---------- Uçuşan veri partikülleri ---------- */
    const PCOUNT = 420;
    const pPos = new Float32Array(PCOUNT * 3);
    const pSeed: { r: number; a: number; y: number; s: number }[] = [];
    for (let i = 0; i < PCOUNT; i++) {
      pSeed.push({
        r: 4 + Math.random() * 12,
        a: Math.random() * Math.PI * 2,
        y: 6 + Math.random() * 26,
        s: 0.2 + Math.random() * 0.7,
      });
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x8fe6ff,
      size: 0.42,
      transparent: true,
      opacity: isDay ? 0.55 : 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    particles.frustumCulled = false;
    scene.add(particles);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 4.2, 22, 6, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x35d6ff,
        transparent: true,
        opacity: isDay ? 0.08 : 0.22,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    beam.position.set(0, 13, 0);
    scene.add(beam);

    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(4, 4.7, 64),
        new THREE.MeshBasicMaterial({
          color: 0x5ee2ff,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 3.45;
      rings.push(ring);
      scene.add(ring);
    }

    /* Çekirdek durum renkleri için materyal listesi */
    const coreMats: THREE.Material[] = [];
    coreVox.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !Array.isArray(m.material)) coreMats.push(m.material);
    });

    /* ---------- Bölge tabelaları (kapıların üstünde) ---------- */
    REGIONS.forEach((reg, idx) => {
      const a = (idx / 6) * Math.PI * 2;
      const r = 22;
      const label = makeBubble(reg.name);
      const mat = label.material as THREE.SpriteMaterial;
      mat.opacity = 0.9;
      label.scale.set(6.2, 1.55, 1);
      label.position.set(Math.cos(a) * r, 12.5, Math.sin(a) * r);
      label.material.color.setHex(reg.color).convertSRGBToLinear();
      scene.add(label);
    });

    /* ---------- Oyuncu ---------- */
    const { root: avatar, parts } = buildCharacter({ hairStyle: "short", hair: 0x2a1e18 });
    scene.add(avatar);

    const groundAt = (walkMap: WalkMap, x: number, z: number) =>
      walkMap.get(`${Math.round(x)},${Math.round(z)}`);

    // #tasarim adresiyle doğrudan Tasarım Bölgesi'nde başla (kısayol)
    const atDesign = typeof window !== "undefined" && window.location.hash === "#tasarim";
    const atProd = typeof window !== "undefined" && window.location.hash === "#uretim";
    const atMarket = typeof window !== "undefined" && window.location.hash === "#pazar";
    const atComm = typeof window !== "undefined" && window.location.hash === "#topluluk";
    const atAchievement = typeof window !== "undefined" && window.location.hash === "#basari";
    const atIdea = typeof window !== "undefined" && window.location.hash === "#fikir";
    const pos = atDesign
      ? new THREE.Vector3(DESIGN_CENTER.x, 0, DESIGN_CENTER.z - 24)
      : atProd
        ? new THREE.Vector3(PRODUCTION_CENTER.x, 0, PRODUCTION_CENTER.z + 40)
        : atMarket
          ? new THREE.Vector3(MARKET_CENTER.x, 0, MARKET_CENTER.z + 40)
          : atComm
            ? new THREE.Vector3(COMMUNITY_CENTER.x, 0, COMMUNITY_CENTER.z + COMMUNITY_HALF - 2)
            : atAchievement
              ? new THREE.Vector3(ACHIEVEMENT_CENTER.x, 0, ACHIEVEMENT_CENTER.z + ACHIEVEMENT_HALF - 2)
              : atIdea
                ? new THREE.Vector3(IDEA_CENTER.x - IDEA_HALF + 14, 0, IDEA_CENTER.z)
                : new THREE.Vector3(0, 0, 20);
    const startY = groundAt(walk, pos.x, pos.z) ?? 2;
    pos.y = startY + 1;
    avatar.position.copy(pos);
    // Başlangıçta meydanın merkezine bak
    let yaw = 0;
    let camYaw = 0;

    let camPitch = -0.06;
    let walkPhase = 0;
    /* Zıplama durumu */
    let velY = 0;
    let onGround = true;
    const GRAVITY = 26;
    const JUMP_V = 9.2;
    /** Yürüyüş modunda omuz üstü (0) ↔ kuş bakışı (60) arası kademesiz mesafe */
    let camDist = 0;
    let camDistTarget = 0;
    /** Tasarım Bölgesi'nde otomatik kuş bakışı mesafesi */
    const BIRD_CAM = 58;
    let inDesign: string | null = null;

    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase());
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase()))
        e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
    const onBlur = () => keys.clear();
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    // Yürüyüş modunda sürükleyerek bak
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const onDown = (e: PointerEvent) => {
      if (modeRef.current !== "walk") return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      camYaw -= (e.clientX - lastX) * 0.005;
      camPitch = THREE.MathUtils.clamp(camPitch - (e.clientY - lastY) * 0.004, -1.1, 0.85);
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    renderer.domElement.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    /* ---------- Kademesiz zoom: tekerlek (pasif olmayan) + iki parmak tutam ---------- */
    const MAX_CAM = 78;
    const applyZoom = (deltaPx: number) => {
      // exp tabanlı ölçek (offset'li): 0 = birinci şahıs, 78 = kuş bakışı
      const z = (camDistTarget + 1.2) * Math.exp(deltaPx * 0.0016);
      camDistTarget = THREE.MathUtils.clamp(z - 1.2, 0, MAX_CAM);
    };
    const onWheel = (e: WheelEvent) => {
      if (modeRef.current !== "walk") return;
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      applyZoom(dy);
    };
    renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

    // Mobil: iki parmak tutam
    const touches = new Map<number, { x: number; y: number }>();
    let pinchStart = 0;
    const pinchDist = () => {
      const [a, b] = [...touches.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };
    const onTouchStart = (e: TouchEvent) => {
      touches.clear();
      for (const t of Array.from(e.touches))
        touches.set(t.identifier, { x: t.clientX, y: t.clientY });
      pinchStart = pinchDist();
    };
    const onTouchMove = (e: TouchEvent) => {
      if (modeRef.current !== "walk" || e.touches.length < 2) return;
      e.preventDefault();
      for (const t of Array.from(e.touches))
        touches.set(t.identifier, { x: t.clientX, y: t.clientY });
      const d = pinchDist();
      if (pinchStart > 0 && d > 0) {
        applyZoom((pinchStart - d) * 1.4);
        pinchStart = d;
      }
    };
    const onTouchEnd = () => {
      touches.clear();
      pinchStart = 0;
    };
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: true });
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });
    renderer.domElement.addEventListener("touchend", onTouchEnd, { passive: true });

    const canStand = (x: number, z: number, fromY: number) => {
      const g = groundAt(walk, x, z);
      if (g === undefined) return null;
      if (g + 1 - fromY > 1.25) return null;
      return g + 1;
    };


    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(host.clientWidth, host.clientHeight),
      T.bloom,
      0.7,
      T.bloomThreshold,
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloom.setSize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const clock = new THREE.Clock();
    let raf = 0;
    let lastState = -1;
    const stateColor = new THREE.Color(CORE_STATES[0].color);
    const targetColor = new THREE.Color(CORE_STATES[0].color);
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.getElapsedTime();

      /* --- Deniz, gemiler, balıklar, ahtapotlar, bulutlar --- */
      seascape.update(t, dt);

      /* --- Çekirdek durum animasyonu --- */
      const stateIdx = Math.floor(t / 5) % CORE_STATES.length;
      if (stateIdx !== lastState) {
        lastState = stateIdx;
        targetColor.setHex(CORE_STATES[stateIdx]!.color);
        stateCb.current(CORE_STATES[stateIdx]!.name);
      }
      stateColor.lerp(targetColor, 1 - Math.pow(0.001, dt));
      const pulse = 0.75 + Math.sin(t * 3.1) * 0.25;

      for (const m of coreMats) {
        const mm = m as THREE.MeshStandardMaterial;
        if (mm.color) mm.color.copy(stateColor);
        if (mm.emissive) mm.emissive.copy(stateColor);
      }
      beamMat.color.copy(stateColor);
      beamMat.opacity = 0.35 + pulse * 0.3;
      tipMat.color.copy(stateColor).offsetHSL(0.08, 0, 0);
      (platformGlow.material as THREE.MeshBasicMaterial).color.copy(stateColor);
      (platformGlow.material as THREE.MeshBasicMaterial).opacity =
        (isDay ? 0.35 : 0.6) * (0.7 + pulse * 0.4);
      particleMat.color.copy(stateColor).lerp(new THREE.Color(0xffffff), 0.35);
      coreLight.color.copy(stateColor);

      coreGroup.rotation.y = t * 0.32;
      coreGroup.rotation.x = Math.sin(t * 0.4) * 0.12;
      coreGroup.position.y = 26 + Math.sin(t * 0.8) * 0.7;
      arms.forEach((arm, i) => {
        arm.scale.setScalar(0.9 + Math.sin(t * 2.4 + i) * 0.12);
      });
      coreLight.intensity = (isDay ? 220 : 800) + Math.sin(t * 2.2) * 160;
      const beamBase = isDay ? 0.07 : 0.18;
      (beam.material as THREE.MeshBasicMaterial).opacity = beamBase + Math.sin(t * 1.7) * 0.05;
      rings.forEach((ring, i) => {
        const p = (t * 0.35 + i / 3) % 1;
        ring.scale.setScalar(0.6 + p * 4.2);
        const rm = ring.material as THREE.MeshBasicMaterial;
        rm.color.copy(stateColor);
        rm.opacity = (isDay ? 0.3 : 0.55) * (1 - p);
      });

      /* --- Çekirdek LOD: kameraya yakınken sade küp + hafif hale --- */
      const camToCore = camera.position.distanceTo(coreGroup.position);
      const near = THREE.MathUtils.clamp((camToCore - 12) / 26, 0, 1); // 0 = çok yakın
      const farFade = near; // uzak = 1
      beamMat.opacity *= 0.15 + farFade * 0.85;
      tipMat.opacity = 0.2 + farFade * 0.7;
      arms.forEach((arm) => {
        arm.visible = farFade > 0.06;
        arm.scale.multiplyScalar(0.55 + farFade * 0.45);
      });
      beam.visible = farFade > 0.1;
      (beam.material as THREE.MeshBasicMaterial).opacity *= farFade;
      particleMat.opacity = (isDay ? 0.55 : 0.95) * (0.1 + farFade * 0.9);
      particles.visible = farFade > 0.05;
      rings.forEach((ring) => {
        const rm = ring.material as THREE.MeshBasicMaterial;
        rm.opacity *= 0.25 + farFade * 0.75;
      });
      coreLight.intensity *= 0.35 + farFade * 0.65;

      /* --- Veri partikülleri --- */
      if (particles.visible) {
        for (let i = 0; i < PCOUNT; i++) {
          const s = pSeed[i]!;
          const a = s.a + t * s.s * 0.5;
          const y = 6 + ((s.y - 6 + t * s.s * 2.4) % 26);
          pPos[i * 3] = Math.cos(a) * s.r;
          pPos[i * 3 + 1] = y;
          pPos[i * 3 + 2] = Math.sin(a) * s.r;
        }
        particleGeo.attributes["position"]!.needsUpdate = true;
      }

      /* --- NPC'ler: hedefe yürüme, kol/bacak salınımı, ara sıra sohbet --- */
      for (const node of npcNodes) {
        const { n, root, parts: np, bubble } = node;
        const p = t * 2.1 + node.phase;
        const dx = node.tx - n.x;
        const dz = node.tz - n.z;
        const dist = Math.hypot(dx, dz);

        if (node.wait > 0) {
          node.wait -= dt;
        } else if (dist < 0.5) {
          node.wait = 1.5 + Math.random() * 6;
          const nt = pickTarget(n);
          node.tx = nt.tx;
          node.tz = nt.tz;
        } else {
          const step = (n.speed * dt) / dist;
          const nx = n.x + dx * step;
          const nz = n.z + dz * step;
          const g = groundAtMap(nx, nz);
          if (g !== undefined && Math.abs(g + 1 - n.y) < 1.3) {
            n.x = nx;
            n.z = nz;
            n.y += (g + 1 - n.y) * 0.25;
          } else {
            node.wait = 0.6;
            const nt = pickTarget(n);
            node.tx = nt.tx;
            node.tz = nt.tz;
          }
          n.yaw = Math.atan2(dx, dz);
        }

        const stepping = node.wait <= 0 && dist >= 0.5;
        const swing = stepping ? Math.sin(p * 1.7) * 0.75 : Math.sin(p * 0.5) * 0.12;
        np["legL"]!.rotation.x = swing;
        np["legR"]!.rotation.x = -swing;
        np["armL"]!.rotation.x = stepping ? -swing * 0.8 : Math.sin(p) * 0.5 - 0.2;
        np["armR"]!.rotation.x = stepping ? swing * 0.8 : Math.sin(p + 1.4) * 0.45 - 0.2;
        np["head"]!.rotation.y = Math.sin(p * 0.5) * 0.3;
        root.position.set(n.x, n.y + (stepping ? Math.abs(Math.sin(p * 1.7)) * 0.045 : 0), n.z);
        root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, n.yaw, 0.12);

        /* Sohbet balonu: ara sıra 4 sn görünür */
        node.talk -= dt;
        const bm = bubble.material as THREE.SpriteMaterial;
        if (node.talk <= 0) {
          node.talk = 14 + Math.random() * 26;
          node.phase = Math.random() * 6.28;
          const fresh = makeBubble(NPC_LINES[Math.floor(Math.random() * NPC_LINES.length)]!);
          bm.map?.dispose();
          bm.map = (fresh.material as THREE.SpriteMaterial).map;
          bm.needsUpdate = true;
          bubble.userData["until"] = t + 4.5;
        }
        const until = (bubble.userData["until"] as number) ?? 0;
        const want = t < until ? 0.95 : 0;
        bm.opacity += (want - bm.opacity) * Math.min(1, dt * 6);
        bubble.visible = bm.opacity > 0.02;
      }


      const walking = modeRef.current === "walk";

      if (walking) {
        let ix = moveRef.current?.x ?? 0;
        let iz = -(moveRef.current?.y ?? 0);
        if (keys.has("w") || keys.has("arrowup")) iz += 1;
        if (keys.has("s") || keys.has("arrowdown")) iz -= 1;
        if (keys.has("a") || keys.has("arrowleft")) ix -= 1;
        if (keys.has("d") || keys.has("arrowright")) ix += 1;
        const len = Math.hypot(ix, iz);
        if (len > 1) {
          ix /= len;
          iz /= len;
        }
        const moving = Math.hypot(ix, iz) > 0.05;

        /* --- Zıplama: Space veya mobil düğme --- */
        const wantJump = keys.has(" ") || jumpRef.current === true;
        if (wantJump && onGround) {
          velY = JUMP_V;
          onGround = false;
        }
        if (jumpRef.current) jumpRef.current = false;

        /* Ayağın altındaki gerçek zemin (havadayken de doğru okunur) */
        const gBelow = groundAt(walk, pos.x, pos.z);
        const groundY = gBelow !== undefined ? gBelow + 1 : pos.y;
        if (!onGround) {
          velY -= GRAVITY * dt;
          pos.y += velY * dt;
          // yalnızca düşerken zemine otur
          if (velY <= 0 && pos.y <= groundY) {
            pos.y = groundY;
            velY = 0;
            onGround = true;
          }
        } else {
          // zemine yumuşak oturma / basamak çıkma
          pos.y += (groundY - pos.y) * Math.min(1, dt * 12);
          velY = 0;
          // zemin ayağın çok altında kaldıysa serbest düşüşe geç
          if (pos.y - groundY > 1.6) onGround = false;
        }

        if (moving) {
          // Temel hız zaten hızlı; shift ekstra sprint
          const speed = (keys.has("shift") ? 22 : 14) * dt * (onGround ? 1 : 0.85);
          const sin = Math.sin(camYaw);
          const cos = Math.cos(camYaw);
          // ileri = (-sin, -cos), sağ = (cos, -sin)
          const dx = -sin * iz + cos * ix;
          const dz = -cos * iz - sin * ix;
          const nx = pos.x + dx * speed;
          const nz = pos.z + dz * speed;
          // havadayken daha yüksek adım toleransı (zıplayarak blok çıkma)
          const tol = onGround ? pos.y : pos.y + 1.2;
          const yx = canStand(nx, pos.z, tol);
          if (yx !== null) pos.x = nx;
          const yz = canStand(pos.x, nz, tol);
          if (yz !== null) pos.z = nz;
          yaw = Math.atan2(dx, dz);
          walkPhase += dt * 11;
        } else {
          walkPhase += dt * 2;
        }

        /* --- Karakter animasyonu --- */
        const swingW = onGround && moving ? Math.sin(walkPhase) * 0.7 : 0;
        parts["legL"]!.rotation.x = onGround ? swingW : -0.4;
        parts["legR"]!.rotation.x = onGround ? -swingW : 0.3;
        parts["armL"]!.rotation.x = onGround ? -swingW * 0.7 : -1.5;
        parts["armR"]!.rotation.x = onGround ? swingW * 0.7 : -1.5;
        avatar.position.set(pos.x, pos.y, pos.z);
        avatar.rotation.y = THREE.MathUtils.lerp(avatar.rotation.y, yaw, 0.2);

        /* --- Bölgeler: yaklaşınca kamera kendiliğinden kuş bakışına çıkar --- */
        const inDesignNow =
          Math.abs(pos.x - DESIGN_CENTER.x) < DESIGN_HALF + 14 &&
          Math.abs(pos.z - DESIGN_CENTER.z) < DESIGN_HALF + 14;
        const inProdNow =
          Math.abs(pos.x - PRODUCTION_CENTER.x) < PRODUCTION_HALF + 14 &&
          Math.abs(pos.z - PRODUCTION_CENTER.z) < PRODUCTION_HALF + 14;
        const inMarketNow =
          Math.abs(pos.x - MARKET_CENTER.x) < MARKET_HALF + 14 &&
          Math.abs(pos.z - MARKET_CENTER.z) < MARKET_HALF + 14;
        const inCommNow =
          Math.abs(pos.x - COMMUNITY_CENTER.x) < COMMUNITY_HALF + 14 &&
          Math.abs(pos.z - COMMUNITY_CENTER.z) < COMMUNITY_HALF + 14;
        const inAchievementNow =
          Math.abs(pos.x - ACHIEVEMENT_CENTER.x) < ACHIEVEMENT_HALF + 14 &&
          Math.abs(pos.z - ACHIEVEMENT_CENTER.z) < ACHIEVEMENT_HALF + 14;
        const inIdeaNow =
          Math.abs(pos.x - IDEA_CENTER.x) < IDEA_HALF + 14 &&
          Math.abs(pos.z - IDEA_CENTER.z) < IDEA_HALF + 14;
        const zoneName = inDesignNow
          ? "Tasarım Bölgesi"
          : inProdNow
            ? "Üretim Bölgesi"
            : inMarketNow
              ? "Pazar Bölgesi"
              : inCommNow
                ? "Topluluk Bölgesi"
                : inAchievementNow
                  ? "Başarı Bölgesi"
                  : inIdeaNow
                    ? "Fikir Bölgesi"
                    : null;
        if (zoneName !== inDesign) {
          inDesign = zoneName;
          zoneCb.current(zoneName);
        }
        const inZone = zoneName !== null;
        const effTarget = inZone ? Math.max(camDistTarget, BIRD_CAM) : camDistTarget;

        /* --- Kademesiz kamera: omuz üstü ↔ kuş bakışı --- */
        camDist += (effTarget - camDist) * Math.min(1, dt * (inZone ? 2.2 : 8));
        distCb.current(camDist);
        // yakınlaştıkça birinci şahıs, uzaklaşınca karakter görünür
        avatar.visible = camDist > 0.75;
        const eye = pos.y + 1.62 + (moving && onGround ? Math.sin(walkPhase * 2) * 0.06 : 0);
        camera.rotation.order = "YXZ";
        if (camDist < 0.05) {
          camera.position.set(pos.x, eye, pos.z);
          camera.rotation.set(camPitch, camYaw, 0);
        } else {
          // uzaklaşırken bakış açısı kademeli olarak yukarıya kayar (kuş bakışı)
          const k = THREE.MathUtils.clamp(camDist / MAX_CAM, 0, 1);
          const pitch = THREE.MathUtils.lerp(camPitch, -0.95, k * k);
          const target = new THREE.Vector3(pos.x, pos.y + 1.4 + k * 4, pos.z);
          const dirV = new THREE.Vector3(
            Math.sin(camYaw) * Math.cos(pitch),
            -Math.sin(pitch),
            Math.cos(camYaw) * Math.cos(pitch),
          );
          const want = target.clone().add(dirV.multiplyScalar(camDist));
          // zemine gömülmeyi engelle
          const gy = groundAt(walk, want.x, want.z);
          if (gy !== undefined) want.y = Math.max(want.y, gy + 2.2);
          camera.position.copy(want);
          camera.lookAt(target);
        }
      } else {
        avatar.visible = true;
        const swing = Math.sin(walkPhase) * 0.03;
        parts["legL"]!.rotation.x = swing;
        parts["legR"]!.rotation.x = -swing;
        avatar.position.set(pos.x, pos.y, pos.z);
        avatar.rotation.y = yaw;
        controls.update();
      }


      composer.render();
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      seascape.dispose();
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("wheel", onWheel);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      controls.dispose();
      composer.dispose();
      renderer.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          const mat = m.material;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose();
        }
      });
      host.removeChild(renderer.domElement);
    };
  }, [theme, moveRef, jumpRef]);


  return <div ref={hostRef} className="h-full w-full" />;
}

const PLAY_STEPS = [
  { title: "Fikir", desc: "Fikrini paylaş, yapay zekâ çekirdeği analiz etsin." },
  { title: "Tasarım", desc: "Topluluk fikrini birlikte şekillendirsin." },
  { title: "Üretim", desc: "Tasarımı gerçek bir ürüne dönüştürün." },
  { title: "Topluluk", desc: "Diğer kullanıcılarla buluş, geri bildirim al." },
  { title: "Pazar", desc: "Ürününü paylaş, değer kazanmaya başla." },
  { title: "Başarı", desc: "Katkını gör, ödülünü topla." },
] as const;

export function IdeaSquare() {
  const [clock, setClock] = useState<IstanbulClock>(() => istanbulClock());
  const [override, setOverride] = useState<Theme | null>(null);
  const [mode, setMode] = useState<Mode>("orbit");
  const [coreState, setCoreState] = useState<string>(CORE_STATES[0].name);
  const [view, setView] = useState<"1. şahıs" | "omuz üstü" | "kuş bakışı">("1. şahıs");
  const [zone, setZone] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const moveRef = useRef({ x: 0, y: 0 });
  const jumpRef = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setClock(istanbulClock()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const theme = override ?? clock.theme;
  const onMove = useCallback((v: { x: number; y: number }) => {
    moveRef.current = v;
  }, []);
  const onCoreState = useCallback((name: string) => setCoreState(name), []);
  const onZone = useCallback((name: string | null) => setZone(name), []);
  const onCamDist = useCallback((d: number) => {
    setView((prev) => {
      const next = d < 0.8 ? "1. şahıs" : d < 18 ? "omuz üstü" : "kuş bakışı";
      return next === prev ? prev : next;
    });
  }, []);


  return (
    <div className="relative h-screen w-full touch-none">
      <Scene
        key={theme}
        theme={theme}
        mode={mode}
        moveRef={moveRef}
        jumpRef={jumpRef}
        onCoreState={onCoreState}
        onZone={onZone}
        onCamDist={onCamDist}
      />

      {/* Üst bilgi paneli */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="pointer-events-auto w-64 max-w-[80vw] overflow-hidden rounded-2xl border border-border/40 bg-card/80 text-card-foreground shadow-lg backdrop-blur-md">
          <div className="flex items-start justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                NSosyal
              </p>
              <p className="text-sm font-semibold leading-tight">Fikir Meydanı</p>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-lg font-semibold tabular-nums">{clock.time}</span>
                <span className="text-[11px] font-normal text-muted-foreground">TSİ</span>
              </div>
              <p className="mt-1.5 text-xs font-medium text-primary">Çekirdek: {coreState}</p>
              {mode === "walk" && (
                <p className="text-xs text-muted-foreground">Kamera: {view}</p>
              )}
            </div>
            <button
              onClick={() => setShowHelp((v) => !v)}
              aria-label="Nasıl oynanır?"
              className={`shrink-0 rounded-full p-1.5 transition-colors ${
                showHelp
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent/60 text-muted-foreground hover:bg-accent"
              }`}
            >
              <Info className="h-4 w-4" />
            </button>
          </div>

          {showHelp && (
            <div className="border-t border-border/40 bg-card/60 px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Nasıl oynanır?
              </p>
              <ol className="space-y-1.5">
                {PLAY_STEPS.map((s, i) => (
                  <li key={s.title} className="flex gap-2 text-[11px] leading-snug">
                    <span className="mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                      {i + 1}
                    </span>
                    <span>
                      <span className="font-semibold text-card-foreground">{s.title}: </span>
                      <span className="text-muted-foreground">{s.desc}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        <div className="pointer-events-auto flex gap-1 rounded-2xl border border-border/40 bg-card/70 p-1.5 shadow-lg backdrop-blur-md">
          {(["auto", "day", "night"] as const).map((opt) => {
            const active = opt === "auto" ? override === null : override === opt;
            const Icon = opt === "auto" ? Clock : opt === "day" ? Sun : Moon;
            return (
              <button
                key={opt}
                onClick={() => setOverride(opt === "auto" ? null : opt)}
                aria-label={opt === "auto" ? "Otomatik" : opt === "day" ? "Gündüz" : "Gece"}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </div>


      {/* Bölgeye giriş bildirimi */}
      {mode === "walk" && zone && (
        <div className="pointer-events-none absolute left-1/2 top-36 -translate-x-1/2 animate-fade-in rounded-2xl border border-border/40 bg-card/75 px-5 py-2 text-center shadow-lg backdrop-blur-md">
          <p className="text-sm font-semibold text-card-foreground">{zone}</p>
          <p className="text-[11px] text-muted-foreground">Kuş bakışı görünüme geçildi</p>
        </div>
      )}


      {/* Nişangâh (birinci şahıs) */}
      {mode === "walk" && view === "1. şahıs" && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/70" />
      )}

      {/* Mod değiştirme */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
        {mode === "walk" ? (
          <Joystick onChange={onMove} />
        ) : (
          <div className="rounded-2xl border border-border/40 bg-card/70 px-4 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur-md">
            Şehri döndürmek için sürükle, yakınlaşmak için tekerleği kullan.
          </div>
        )}

        <div className="flex flex-col items-end gap-2">
          {mode === "walk" && (
            <>
              <div className="rounded-2xl border border-border/40 bg-card/70 px-4 py-2 text-xs text-muted-foreground shadow-lg backdrop-blur-md">
                W A S D ile yürü · Space zıpla · tekerlek/pinch ile uzaklaş
              </div>
              <button
                onPointerDown={() => {
                  jumpRef.current = true;
                }}
                aria-label="Zıpla"
                className="flex items-center gap-2 rounded-full border border-border/40 bg-card/70 px-5 py-3.5 text-sm font-semibold text-card-foreground shadow-lg backdrop-blur-md active:scale-95"
              >
                <ChevronsUp className="h-5 w-5" />
                <span className="hidden sm:inline">Zıpla</span>
              </button>
            </>
          )}
          <button
            onClick={() => setMode((m) => (m === "walk" ? "orbit" : "walk"))}
            aria-label={mode === "walk" ? "Kuş bakışı" : "Şehirde yürü"}
            className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.03]"
          >
            {mode === "walk" ? <Eye className="h-5 w-5" /> : <Footprints className="h-5 w-5" />}
            <span className="hidden sm:inline">
              {mode === "walk" ? "Kuş bakışı" : "Şehirde yürü"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

