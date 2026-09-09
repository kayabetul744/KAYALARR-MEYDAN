import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Link } from "@tanstack/react-router";
import { Joystick } from "@/components/Joystick";

/** Yerleştirilebilir blok türleri */
const BLOCKS = [
  { id: "grass", label: "Çim", color: "#5fa044" },
  { id: "dirt", label: "Toprak", color: "#8a5a33" },
  { id: "stone", label: "Taş", color: "#8d8d94" },
  { id: "wood", label: "Ahşap", color: "#a9743f" },
  { id: "glass", label: "Cam", color: "#9fd8ef" },
  { id: "lamp", label: "Lamba", color: "#ffd37a" },
] as const;

type BlockId = (typeof BLOCKS)[number]["id"];

const YARD = 24; // arazi yarıçapı (blok)

/** Kişisel inşa alanı: düz arazide gez, blok koy, blok kır */
export function BuildYard() {
  const hostRef = useRef<HTMLDivElement>(null);
  const moveRef = useRef({ x: 0, y: 0 });
  const jumpRef = useRef(false);
  const blockRef = useRef<BlockId>("stone");
  const [block, setBlock] = useState<BlockId>("stone");
  const [locked, setLocked] = useState(false);

  const onMove = useCallback((v: { x: number; y: number }) => {
    moveRef.current = v;
  }, []);

  const pickBlock = useCallback((id: BlockId) => {
    blockRef.current = id;
    setBlock(id);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#8ec5e8");
    scene.fog = new THREE.Fog("#8ec5e8", 40, 130);

    const camera = new THREE.PerspectiveCamera(
      70,
      host.clientWidth / host.clientHeight,
      0.1,
      500,
    );

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x557744, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.1);
    sun.position.set(30, 60, 20);
    scene.add(sun);

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const materials = new Map<BlockId, THREE.MeshLambertMaterial>();
    for (const b of BLOCKS) {
      materials.set(
        b.id,
        new THREE.MeshLambertMaterial({
          color: new THREE.Color(b.color),
          transparent: b.id === "glass",
          opacity: b.id === "glass" ? 0.45 : 1,
          emissive: new THREE.Color(b.id === "lamp" ? "#a06a00" : "#000000"),
        }),
      );
    }

    /** anahtar: "x,y,z" -> mesh */
    const cubes = new Map<string, THREE.Mesh>();
    const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

    const addBlock = (x: number, y: number, z: number, id: BlockId) => {
      const k = key(x, y, z);
      if (cubes.has(k)) return;
      const mesh = new THREE.Mesh(geo, materials.get(id)!);
      mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
      mesh.userData['k'] = k;
      scene.add(mesh);
      cubes.set(k, mesh);
    };

    const removeBlock = (mesh: THREE.Mesh) => {
      const k = mesh.userData['k'] as string;
      const y = Number(k.split(",")[1]);
      if (y < 0) return; // zemin kırılmaz
      scene.remove(mesh);
      cubes.delete(k);
    };

    // düz zemin
    for (let x = -YARD; x <= YARD; x++) {
      for (let z = -YARD; z <= YARD; z++) addBlock(x, -1, z, "grass");
    }

    // yükseklik sorgusu (basit sütun taraması)
    const heightAt = (x: number, z: number) => {
      const gx = Math.floor(x);
      const gz = Math.floor(z);
      let top = -100;
      for (let y = 40; y >= -1; y--) {
        if (cubes.has(key(gx, y, gz))) {
          top = y + 1;
          break;
        }
      }
      return top;
    };

    // oyuncu
    const player = { x: 0, y: 1.7, z: 8, vy: 0, yaw: 0, pitch: -0.15 };

    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);

    const highlight = new THREE.Mesh(
      new THREE.BoxGeometry(1.02, 1.02, 1.02),
      new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true }),
    );
    highlight.visible = false;
    scene.add(highlight);

    const canvas = renderer.domElement;
    canvas.style.cursor = "crosshair";

    const onClickCanvas = () => {
      if (document.pointerLockElement !== canvas) void canvas.requestPointerLock();
    };
    canvas.addEventListener("click", onClickCanvas);

    const onLockChange = () => setLocked(document.pointerLockElement === canvas);
    document.addEventListener("pointerlockchange", onLockChange);

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      player.yaw -= e.movementX * 0.0022;
      player.pitch = Math.max(
        -1.4,
        Math.min(1.4, player.pitch - e.movementY * 0.0022),
      );
    };
    document.addEventListener("mousemove", onMouseMove);

    const hitTarget = () => {
      raycaster.setFromCamera(center, camera);
      raycaster.far = 7;
      const hits = raycaster.intersectObjects([...cubes.values()], false);
      return hits[0] ?? null;
    };

    const doAction = (breakIt: boolean) => {
      const hit = hitTarget();
      if (!hit) return;
      const mesh = hit.object as THREE.Mesh;
      if (breakIt) {
        removeBlock(mesh);
        return;
      }
      const n = hit.face?.normal ?? new THREE.Vector3(0, 1, 0);
      const x = Math.floor(mesh.position.x + n.x);
      const y = Math.floor(mesh.position.y + n.y);
      const z = Math.floor(mesh.position.z + n.z);
      // oyuncunun içine blok koyma
      if (
        Math.floor(player.x) === x &&
        Math.floor(player.z) === z &&
        (y === Math.floor(player.y - 1.7) || y === Math.floor(player.y - 0.7))
      )
        return;
      addBlock(x, y, z, blockRef.current);
    };

    const onPointerDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      e.preventDefault();
      doAction(e.button === 0);
    };
    canvas.addEventListener("mousedown", onPointerDown);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.code);
      if (e.code === "Space") jumpRef.current = true;
      const num = Number(e.key);
      if (num >= 1 && num <= BLOCKS.length) pickBlock(BLOCKS[num - 1]!.id);
    };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const onResize = () => {
      if (!host.clientWidth) return;
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const clock = new THREE.Clock();

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);

      let mx = moveRef.current.x;
      let mz = moveRef.current.y;
      if (keys.has("KeyW") || keys.has("ArrowUp")) mz -= 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) mz += 1;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) mx -= 1;
      if (keys.has("KeyD") || keys.has("ArrowRight")) mx += 1;
      const len = Math.hypot(mx, mz);
      if (len > 1) {
        mx /= len;
        mz /= len;
      }

      const speed = 7;
      const sin = Math.sin(player.yaw);
      const cos = Math.cos(player.yaw);
      const dx = (mx * cos - mz * sin) * speed * dt;
      const dz = (mx * sin + mz * cos) * speed * dt;

      const nx = player.x + dx;
      const nz = player.z + dz;
      const feet = player.y - 1.7;
      if (heightAt(nx, player.z) <= feet + 0.6) player.x = nx;
      if (heightAt(player.x, nz) <= feet + 0.6) player.z = nz;

      const ground = heightAt(player.x, player.z);
      if (jumpRef.current && Math.abs(feet - ground) < 0.08) player.vy = 6.4;
      jumpRef.current = false;

      player.vy -= 20 * dt;
      let fy = feet + player.vy * dt;
      if (fy <= ground) {
        fy = ground;
        player.vy = 0;
      }
      player.y = fy + 1.7;

      camera.position.set(player.x, player.y, player.z);
      camera.rotation.set(0, 0, 0, "YXZ");
      camera.rotateY(player.yaw);
      camera.rotateX(player.pitch);

      const hit = hitTarget();
      if (hit) {
        highlight.visible = true;
        highlight.position.copy((hit.object as THREE.Mesh).position);
      } else {
        highlight.visible = false;
      }

      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChange);
      canvas.removeEventListener("click", onClickCanvas);
      canvas.removeEventListener("mousedown", onPointerDown);
      renderer.dispose();
      geo.dispose();
      materials.forEach((m) => m.dispose());
      if (canvas.parentNode === host) host.removeChild(canvas);
    };
  }, [pickBlock]);

  return (
    <div className="relative h-full w-full touch-none">
      <div ref={hostRef} className="h-full w-full" />

      {/* nişangâh */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-foreground/70" />
        <div className="absolute top-1/2 left-0 h-px w-4 -translate-y-1/2 bg-foreground/70" />
      </div>

      <Link
        to="/"
        className="absolute left-4 top-4 rounded-full border border-border/60 bg-card/80 px-4 py-2 text-xs font-semibold text-card-foreground shadow-lg backdrop-blur-md"
      >
        ← Meydana dön
      </Link>

      {!locked && (
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-10 rounded-2xl border border-border/60 bg-card/85 px-5 py-3 text-center text-sm text-card-foreground shadow-xl backdrop-blur-md">
          Bakmak için ekrana tıkla · Sol tık kır, sağ tık koy · WASD yürü, Boşluk zıpla
        </div>
      )}

      {/* blok paleti */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-2xl border border-border/60 bg-card/80 p-2 shadow-xl backdrop-blur-md">
        {BLOCKS.map((b, i) => (
          <button
            key={b.id}
            onClick={() => pickBlock(b.id)}
            className={`flex h-14 w-14 flex-col items-center justify-center gap-1 rounded-xl border text-[10px] font-semibold transition-colors ${
              block === b.id
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border/50 text-muted-foreground hover:bg-accent/50"
            }`}
          >
            <span
              className="h-5 w-5 rounded-[4px] border border-border/60"
              style={{ backgroundColor: b.color }}
            />
            {i + 1}. {b.label}
          </button>
        ))}
      </div>

      {/* mobil yürüyüş kolu */}
      <div className="absolute bottom-24 left-4 sm:hidden">
        <Joystick onChange={onMove} />
      </div>
      <button
        onClick={() => {
          jumpRef.current = true;
        }}
        className="absolute bottom-28 right-4 h-16 w-16 rounded-full border border-border/60 bg-card/80 text-xs font-semibold text-card-foreground shadow-lg backdrop-blur-md sm:hidden"
      >
        Zıpla
      </button>
    </div>
  );
}
