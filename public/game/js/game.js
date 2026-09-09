/**
 *  -
 */

import * as THREE from 'three';
import {
  World, Chunk, BlockType, BlockNames, isSolid,
  CHUNK_SIZE, CHUNK_HEIGHT, RENDER_DISTANCE, getBlockColor,
  isMobileDevice, getRenderDistance, EXTRA_BLOCKS,
} from './voxel.js';
import { findZone, ZONES } from './structures.js';
import { AnimalManager } from './animals.js';

/* ============================================
   Oyuncu sinifi - birinci sahis kontrol
   ============================================ */
class Player {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;

    this.position = new THREE.Vector3(5.4, -27.0, 22.6);
    this.velocity = new THREE.Vector3(0, 0, 0);

    this.pitch = 0;
    this.yaw = 0;

    this.gravity = -25;
    this.jumpSpeed = 12;
    this.moveSpeed = 5.5;
    this.onGround = false;

    this.width = 0.6;
    this.height = 1.75;
    this.eyeHeight = 1.6;

    this.keys = {};
    this.mouseDX = 0;
    this.mouseDY = 0;

    this.reachDistance = 7;
    this.selectedBlock = BlockType.GRASS;

    this.targetBlock = null;
    this.targetFace = null;
  }

  /**  */
  onMouseMove(dx, dy) {
    const sensitivity = 0.002;
    this.yaw -= dx * sensitivity;
    this.pitch -= dy * sensitivity;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }

  /**  */
  update(dt) {
    dt = Math.min(dt, 0.05);

    const forward = new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    ).normalize();

    const right = new THREE.Vector3(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    ).normalize();

    const moveDir = new THREE.Vector3(0, 0, 0);
    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveDir.add(forward);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveDir.sub(forward);
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveDir.sub(right);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveDir.add(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
    }

    this.velocity.x = moveDir.x * this.moveSpeed;
    this.velocity.z = moveDir.z * this.moveSpeed;

    const footBlock = this.world.getBlock(
      Math.floor(this.position.x),
      Math.floor(this.position.y),
      Math.floor(this.position.z)
    );
    const eyeBlock = this.world.getBlock(
      Math.floor(this.position.x),
      Math.floor(this.position.y + this.eyeHeight),
      Math.floor(this.position.z)
    );
    const inWater = (footBlock === BlockType.WATER || eyeBlock === BlockType.WATER);

    const effectiveGravity = inWater ? this.gravity * 0.15 : this.gravity;
    this.velocity.y += effectiveGravity * dt;

    if (inWater && (this.keys['Space'] || this.keys['KeyK'])) {
      this.velocity.y = 3;
      this.onGround = false;
    }

    if (!inWater && (this.keys['Space'] || this.keys['KeyK']) && this.onGround) {
      this.velocity.y = this.jumpSpeed;
      this.onGround = false;
    }

    if (inWater) {
      this.velocity.x *= 0.5;
      this.velocity.z *= 0.5;
    }

    this.onGround = false;

    this.position.x += this.velocity.x * dt;
    this._resolveCollision('x');

    this.position.y += this.velocity.y * dt;
    this._resolveCollision('y');

    this.position.z += this.velocity.z * dt;
    this._resolveCollision('z');

    if (this.position.y < -10) {
      this.position.y = 50;
      this.velocity.y = 0;
    }

    this.camera.position.set(
      this.position.x,
      this.position.y + this.eyeHeight,
      this.position.z
    );

    const lookDir = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    this.camera.lookAt(
      this.camera.position.x + lookDir.x,
      this.camera.position.y + lookDir.y,
      this.camera.position.z + lookDir.z
    );

    this._raycast();
  }

  /**
   * AABB
   */
  _resolveCollision(axis) {
    const halfW = this.width / 2;
    const min = new THREE.Vector3(
      this.position.x - halfW,
      this.position.y,
      this.position.z - halfW
    );
    const max = new THREE.Vector3(
      this.position.x + halfW,
      this.position.y + this.height,
      this.position.z + halfW
    );

    const startX = Math.floor(min.x);
    const endX = Math.floor(max.x);
    const startY = Math.floor(min.y);
    const endY = Math.floor(max.y);
    const startZ = Math.floor(min.z);
    const endZ = Math.floor(max.z);

    for (let bx = startX; bx <= endX; bx++) {
      for (let by = startY; by <= endY; by++) {
        for (let bz = startZ; bz <= endZ; bz++) {
          const blockType = this.world.getBlock(bx, by, bz);
          if (blockType === BlockType.AIR) continue;

          const isWater = blockType === BlockType.WATER;

          if (isWater) {
            if (axis !== 'y' || this.velocity.y >= 0) continue;
            const blockMinW = { x: bx, y: by, z: bz };
            const blockMaxW = { x: bx + 1, y: by + 1, z: bz + 1 };
            if (min.x < blockMaxW.x && max.x > blockMinW.x &&
                min.y < blockMaxW.y && max.y > blockMinW.y &&
                min.z < blockMaxW.z && max.z > blockMinW.z) {
              this.position.y = blockMaxW.y;
              this.velocity.y = 0;
              this.onGround = true;
              min.y = this.position.y;
              max.y = this.position.y + this.height;
            }
            continue;
          }

          const blockMin = { x: bx, y: by, z: bz };
          const blockMax = { x: bx + 1, y: by + 1, z: bz + 1 };

          if (min.x < blockMax.x && max.x > blockMin.x &&
              min.y < blockMax.y && max.y > blockMin.y &&
              min.z < blockMax.z && max.z > blockMin.z) {

            if (axis === 'x') {
              if (this.velocity.x > 0) {
                this.position.x = blockMin.x - halfW;
              } else {
                this.position.x = blockMax.x + halfW;
              }
              this.velocity.x = 0;
            } else if (axis === 'y') {
              if (this.velocity.y > 0) {
                this.position.y = blockMin.y - this.height;
              } else {
                this.position.y = blockMax.y;
                this.onGround = true;
              }
              this.velocity.y = 0;
            } else if (axis === 'z') {
              if (this.velocity.z > 0) {
                this.position.z = blockMin.z - halfW;
              } else {
                this.position.z = blockMax.z + halfW;
              }
              this.velocity.z = 0;
            }

            min.x = this.position.x - halfW;
            max.x = this.position.x + halfW;
            min.y = this.position.y;
            max.y = this.position.y + this.height;
            min.z = this.position.z - halfW;
            max.z = this.position.z + halfW;
          }
        }
      }
    }
  }

  /**
   * DDA
   */
  _raycast() {
    const origin = this.camera.position.clone();
    const direction = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).normalize();

    this.targetBlock = null;
    this.targetFace = null;

    const step = 0.05;
    const maxSteps = this.reachDistance / step;
    let prevX = Math.floor(origin.x);
    let prevY = Math.floor(origin.y);
    let prevZ = Math.floor(origin.z);

    for (let i = 0; i < maxSteps; i++) {
      const t = i * step;
      const x = Math.floor(origin.x + direction.x * t);
      const y = Math.floor(origin.y + direction.y * t);
      const z = Math.floor(origin.z + direction.z * t);

      if (x === prevX && y === prevY && z === prevZ) continue;

      const block = this.world.getBlock(x, y, z);
      if (isSolid(block)) {
        this.targetBlock = { x, y, z, type: block };

        this.targetFace = {
          x: prevX - x,
          y: prevY - y,
          z: prevZ - z,
        };
        return;
      }

      prevX = x;
      prevY = y;
      prevZ = z;
    }
  }

  /**  */
  placeBlock() {
    if (!this.targetBlock || !this.targetFace) return false;

    const px = this.targetBlock.x + this.targetFace.x;
    const py = this.targetBlock.y + this.targetFace.y;
    const pz = this.targetBlock.z + this.targetFace.z;

    const halfW = this.width / 2;
    const playerMin = {
      x: this.position.x - halfW, y: this.position.y, z: this.position.z - halfW
    };
    const playerMax = {
      x: this.position.x + halfW, y: this.position.y + this.height, z: this.position.z + halfW
    };

    if (px + 1 > playerMin.x && px < playerMax.x &&
        py + 1 > playerMin.y && py < playerMax.y &&
        pz + 1 > playerMin.z && pz < playerMax.z) {
      return false;
    }

    if (py < 0 || py >= CHUNK_HEIGHT) return false;
    if (this.world.getBlock(px, py, pz) !== BlockType.AIR) return false;

    this.world.setBlock(px, py, pz, this.selectedBlock);
    return true;
  }

  /**  */
  breakBlock() {
    if (!this.targetBlock) return false;

    const { x, y, z } = this.targetBlock;
    if (y < 0 || y >= CHUNK_HEIGHT) return false;

    this.world.setBlock(x, y, z, BlockType.AIR);
    return true;
  }
}

/* ============================================
   Hedef blok cercevesi
   ============================================ */
class BlockHighlight {
  constructor(scene) {
    const geo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const edges = new THREE.EdgesGeometry(geo);
    const mat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2, transparent: true, opacity: 0.6 });
    this.mesh = new THREE.LineSegments(edges, mat);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  update(targetBlock) {
    if (targetBlock) {
      this.mesh.position.set(targetBlock.x + 0.5, targetBlock.y + 0.5, targetBlock.z + 0.5);
      this.mesh.visible = true;
    } else {
      this.mesh.visible = false;
    }
  }
}

/* ============================================
   Dokunmatik kontrolcu (mobil)
   ============================================ */
class TouchController {
  constructor(player, game) {
    this.player = player;
    this.game = game;
    this.moveX = 0;
    this.moveZ = 0;
    this._joystickId = null;
    this._lookTouchId = null;
    this._lastTouchX = 0;
    this._lastTouchY = 0;
    this._init();
  }

  _init() {
    const zone = document.getElementById('joystickZone');
    const thumb = document.getElementById('joystickThumb');
    const canvas = this.game.canvas;

    this._joystickId = null;
    this._lookTouchId = null;

    const findJoystickTouch = (e) => {
      if (this._joystickId === null) return null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this._joystickId) return e.touches[i];
      }
      return null;
    };

    zone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this._joystickId === null) {
        this._joystickId = e.changedTouches[0].identifier;
      }
      const t = findJoystickTouch(e);
      if (t) this._updateJoystick(t, zone, thumb);
    }, { passive: false });
    zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = findJoystickTouch(e);
      if (t) this._updateJoystick(t, zone, thumb);
    }, { passive: false });
    zone.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (this._joystickId === e.changedTouches[0].identifier) {
        this._joystickId = null;
      }
      this.moveX = 0;
      this.moveZ = 0;
      thumb.style.transform = 'translate(-50%, -50%)';
    });
    zone.addEventListener('touchcancel', (e) => {
      if (this._joystickId === e.changedTouches[0].identifier) {
        this._joystickId = null;
      }
      this.moveX = 0;
      this.moveZ = 0;
      thumb.style.transform = 'translate(-50%, -50%)';
    });

    const findLookTouch = (e) => {
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (t.identifier !== this._joystickId && t.clientX > window.innerWidth * 0.35) {
          return t;
        }
      }
      return null;
    };

    canvas.addEventListener('touchstart', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.target && t.target.closest && t.target.closest('#actionButtons, #joystickZone, #mobileHotbar')) continue;
        if (t.identifier !== this._joystickId && t.clientX > window.innerWidth * 0.35) {
          this._lookTouchId = t.identifier;
          this._lastTouchX = t.clientX;
          this._lastTouchY = t.clientY;
          break;
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      if (this._lookTouchId === null) return;
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        if (t.identifier === this._lookTouchId) {
          const dx = t.clientX - this._lastTouchX;
          const dy = t.clientY - this._lastTouchY;
          this.player.onMouseMove(dx * 1.8, dy * 1.8);
          this._lastTouchX = t.clientX;
          this._lastTouchY = t.clientY;
          break;
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this._lookTouchId) {
          this._lookTouchId = null;
          break;
        }
      }
    });
    canvas.addEventListener('touchcancel', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this._lookTouchId) {
          this._lookTouchId = null;
          break;
        }
      }
    });

    const btnJump = document.getElementById('btnJump');
    const btnPlace = document.getElementById('btnPlace');
    const btnBreak = document.getElementById('btnBreak');

    const _flashBtn = (btn, isError) => {
      if (!btn) return;
      const bg = isError ? 'rgba(255, 80, 80, 0.4)' : 'rgba(255, 255, 255, 0.35)';
      const border = isError ? 'rgba(255, 80, 80, 0.7)' : 'rgba(255, 255, 255, 0.6)';
      btn.style.background = bg;
      btn.style.borderColor = border;
      btn.style.transition = 'background 0.1s, border-color 0.1s';
      setTimeout(() => {
        btn.style.background = 'rgba(255, 255, 255, 0.12)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.25)';
      }, 150);
    };

    const _haptic = (pattern) => {
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    };

    if (btnJump) {
      const _jumpDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.player.keys['Space'] = true;
        _flashBtn(btnJump);
      };
      const _jumpUp = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.player.keys['Space'] = false;
      };
      btnJump.addEventListener('pointerdown', _jumpDown);
      btnJump.addEventListener('pointerup', _jumpUp);
      btnJump.addEventListener('pointercancel', _jumpUp);
      btnJump.addEventListener('pointerleave', _jumpUp);
    }

    if (btnPlace) {
      const _placeDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = this.player.placeBlock();
        _flashBtn(btnPlace, !ok);
        if (!ok) _haptic(10);
      };
      btnPlace.addEventListener('pointerdown', _placeDown);
    }

    if (btnBreak) {
      const _breakDown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ok = this.player.breakBlock();
        _flashBtn(btnBreak, !ok);
        if (!ok) _haptic(10);
      };
      btnBreak.addEventListener('pointerdown', _breakDown);
    }
  }

  _updateJoystick(touch, zone, thumb) {
    const rect = zone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width / 2 - 25;

    let dx = touch.clientX - cx;
    let dy = touch.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxR) {
      dx = dx / dist * maxR;
      dy = dy / dist * maxR;
    }

    this.moveX = dx / maxR;
    this.moveZ = dy / maxR;

    thumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
}

/* ============================================
   Ana oyun sinifi
   ============================================ */
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.isRunning = false;
    this.isPointerLocked = false;

    this.isMobile = isMobileDevice();
    this.renderDistance = getRenderDistance();

    this.scene = null;
    this.camera = null;
    this.renderer = null;

    this.world = null;
    this.player = null;
    this.highlight = null;
    this.touchController = null;
    this.animalManager = null;

    this.clock = new THREE.Clock();
    this.frameCount = 0;
    this.fpsTime = 0;
    this.fps = 0;

    this.ui = {
      crosshair: document.getElementById('crosshair'),
      hotbar: document.getElementById('hotbar'),
      selectedBlockName: document.getElementById('selectedBlockName'),
      debugInfo: document.getElementById('debugInfo'),
      blockHighlight: document.getElementById('blockHighlight'),
      startScreen: document.getElementById('startScreen'),
      pauseScreen: document.getElementById('pauseScreen'),
      loadingBar: document.getElementById('loadingBar'),
      loadingFill: document.getElementById('loadingFill'),
      controlsPanel: document.getElementById('controlsPanel'),
      zoneBanner: document.getElementById('zoneBanner'),
      interactHint: document.getElementById('interactHint'),
      ideaBoard: document.getElementById('ideaBoard'),
      ideaStatus: document.getElementById('ideaStatus'),
    };

    // Meydan uygulamasına (iframe parent) gerçek fikir gönderimi köprüsü.
    // Bağımsız Atölye dağıtımında (meydan-atolye) parent bu mesajları
    // dinlemez; bu durumda liste boş kalır ve gönderim "sunucuya
    // ulaşılamadı" hatası gösterir — açıkça, sessizce sahtelenmez.
    this._remoteIdeas = [];

    // Genişletilmiş blok çubuğu: temel bloklar + tüm ek bloklar
    this.blockTypes = [
      BlockType.GRASS, BlockType.DIRT, BlockType.STONE,
      BlockType.SAND, BlockType.WOOD, BlockType.LEAVES,
      BlockType.WATER, BlockType.COZE_CYAN,
      ...EXTRA_BLOCKS.map(b => b.id),
    ];
    this.selectedSlot = 0;

    this.currentZoneKey = null;
    this.ideaOpen = false;
    this.smoke = null;
    this.cameraDistance = 0;
    this.targetCameraDistance = 0;
    this.cameraLookTarget = new THREE.Vector3();
  }

  /**  */
  async init() {
    this._initRenderer();
    this._initScene();
    this._initPlayer();
    this._initHighlight();
    this._initHotbar();
    if (this.isMobile) this._initMobileHotbar();
    this._initEvents();
    this._initSmoke();
    this._initIdeaBoard();

    this.camera.position.set(0, 23, 12);
    this.camera.lookAt(0, 25, 0);

    this.ui.loadingBar.style.display = 'block';

    const radius = this.renderDistance;

    const chunksToLoad = [];
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        if (dx * dx + dz * dz > radius * radius) continue;
        chunksToLoad.push([dx, dz]);
      }
    }
    chunksToLoad.sort((a, b) => {
      const dA = a[0] * a[0] + a[1] * a[1];
      const dB = b[0] * b[0] + b[1] * b[1];
      return dA - dB;
    });

    const needed = chunksToLoad.length;
    let generated = 0;
    let firstFrameDone = false;

    for (const [cx, cz] of chunksToLoad) {
      const key = this.world.chunkKey(cx, cz);
      if (!this.world.chunks.has(key)) {
        const chunk = await this._createChunk(cx, cz);
        if (chunk.mesh) this.scene.add(chunk.mesh);
        if (chunk.waterMesh) this.scene.add(chunk.waterMesh);
        generated++;
        this.ui.loadingFill.style.width = `${(generated / needed * 100) | 0}%`;

        if (!firstFrameDone && cx * cx + cz * cz <= 4) {
          this.renderer.render(this.scene, this.camera);
          firstFrameDone = true;
        }

        this.renderer.render(this.scene, this.camera);
        if (generated % (this.isMobile ? 1 : 3) === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }
    }

    this._spawnX = 5.4;
    this._spawnZ = 22.6;
    this._spawnY = -27.0;
    this.player.position.set(this._spawnX, this._spawnY, this._spawnZ);
    this.player.yaw = 0;
    this.player.pitch = -0.3;


    this.ui.loadingBar.style.display = 'none';

    this.animalManager.spawnAnimals();
  }

  /**  */
  _createChunk(cx, cz) {
    const key = this.world.chunkKey(cx, cz);
    if (this.world.chunks.has(key)) return this.world.chunks.get(key);

    const chunk = new Chunk(cx, cz);
    this.world.generateChunkData(chunk);
    chunk.buildMesh((wx, wy, wz) => this.world.getBlock(wx, wy, wz), this.world.material, this.world.waterMaterial);
    this.world.chunks.set(key, chunk);
    return chunk;
  }

  /**  */
  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: this.isMobile ? 'low-power' : 'default',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    const maxPixelRatio = this.isMobile ? 1.2 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    this.renderer.setClearColor(0x87CEEB);
  }

  /**  */
  _initScene() {
    this.scene = new THREE.Scene();

    const fogFar = this.renderDistance * CHUNK_SIZE + 4;
    const fogNear = this.isMobile ? Math.max(25, fogFar - 20) : Math.max(15, fogFar - 40);
    this.scene.fog = new THREE.Fog(0x87CEEB, fogNear, fogFar);

    const ambientLight = new THREE.AmbientLight(0xcccccc, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(50, 100, 30);
    this.scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x556633, 0.3);
    this.scene.add(hemiLight);

    this.world = new World(this.scene);
    this.world.renderDistance = this.renderDistance;
    this.world.init();

    this.animalManager = new AnimalManager(this.scene, this.world, this.isMobile);

    this.defaultFov = this.isMobile ? 90 : 75;
    this.fov = this.defaultFov;
    this.fovMin = 15;
    this.fovMax = 130;
    this.camera = new THREE.PerspectiveCamera(
      this.fov, window.innerWidth / window.innerHeight, 0.1, 1000
    );
  }

  /**  */
  _initPlayer() {
    this.player = new Player(this.camera, this.world);
  }

  /**  */
  _initHighlight() {
    this.highlight = new BlockHighlight(this.scene);
  }

  /** UI */
  _initHotbar() {
    const hotbar = this.ui.hotbar;
    hotbar.innerHTML = '';

    this.blockTypes.forEach((type, i) => {
      const slot = document.createElement('div');
      slot.className = `hotbar-slot${i === 0 ? ' selected' : ''}`;
      slot.dataset.index = i;

      const preview = document.createElement('div');
      preview.className = 'block-preview';
      preview.style.background = getBlockColor(type);
      preview.style.boxShadow = 'inset -3px -3px 0 rgba(0,0,0,0.25), inset 3px 3px 0 rgba(255,255,255,0.15)';
      slot.appendChild(preview);

      const keyLabel = document.createElement('span');
      keyLabel.className = 'slot-key';
      keyLabel.textContent = i + 1;
      slot.appendChild(keyLabel);

      slot.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedSlot = i;
        this._updateHotbar();
      });

      hotbar.appendChild(slot);
    });
  }

  /**  */
  _updateHotbar() {
    const slots = this.ui.hotbar.querySelectorAll('.hotbar-slot');
    slots.forEach((slot, i) => {
      slot.classList.toggle('selected', i === this.selectedSlot);
    });
    this.player.selectedBlock = this.blockTypes[this.selectedSlot];

    const name = BlockNames[this.blockTypes[this.selectedSlot]] || '';
    const nameEl = this.ui.selectedBlockName;
    if (nameEl) {
      nameEl.textContent = name;
      nameEl.style.transform = 'translateX(-50%) scale(1.15)';
      nameEl.style.opacity = '1';
      setTimeout(() => {
        nameEl.style.transform = 'translateX(-50%) scale(1)';
      }, 120);
    }

    if (this.isMobile) this._updateMobileHotbar();
  }

  /**  */
  _initMobileHotbar() {
    const mobileHotbar = document.getElementById('mobileHotbar');
    if (!mobileHotbar) return;
    mobileHotbar.innerHTML = '';

    this.blockTypes.forEach((type, i) => {
      const slot = document.createElement('div');
      slot.className = `m-slot${i === 0 ? ' selected' : ''}`;
      slot.dataset.index = i;

      const preview = document.createElement('div');
      preview.className = 'm-block-preview';
      preview.style.background = getBlockColor(type);
      preview.style.boxShadow = 'inset -2px -2px 0 rgba(0,0,0,0.25), inset 2px 2px 0 rgba(255,255,255,0.15)';
      slot.appendChild(preview);

      slot.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.selectedSlot = i;
        this._updateHotbar();
      });

      mobileHotbar.appendChild(slot);
    });
  }

  /**  */
  _updateMobileHotbar() {
    const slots = document.querySelectorAll('#mobileHotbar .m-slot');
    slots.forEach((slot, i) => {
      slot.classList.toggle('selected', i === this.selectedSlot);
    });
  }

  /**  */
  _initEvents() {
    document.addEventListener('keydown', (e) => {
      const typing = e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
      if (this.ideaOpen) {
        if (e.code === 'Escape') this._closeIdeaBoard();
        if (typing) return;
        if (e.code === 'KeyE') this._closeIdeaBoard();
        return;
      }
      this.player.keys[e.code] = true;

      if (e.code === 'KeyE' && this.isRunning && this._nearIdeaSpot()) {
        this._openIdeaBoard();
        return;
      }

      if (e.code >= 'Digit1' && e.code <= 'Digit9') {
        const idx = parseInt(e.code.charAt(5)) - 1;
        if (idx < this.blockTypes.length) {
          this.selectedSlot = idx;
          this._updateHotbar();
        }
      }

      if (e.code === 'Escape' && this.isRunning) {
        if (this.isMobile) {
          this.isRunning = false;
          this.ui.pauseScreen.style.display = 'flex';
          this._showGameUI(false);
        }
      }

      if (e.code === 'Equal') {
        this._adjustFOV(-5);
      }
      if (e.code === 'Minus') {
        this._adjustFOV(5);
      }
      if (e.code === 'Digit0' || e.code === 'Numpad0') {
        this._resetFOV();
      }
    });

    document.addEventListener('keyup', (e) => {
      this.player.keys[e.code] = false;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      this.player.onMouseMove(e.movementX, e.movementY);
    });

    document.addEventListener('mousedown', (e) => {
      if (!this.isPointerLocked) return;
      if (e.button === 0) {
        this.player.placeBlock();
      } else if (e.button === 2) {
        this.player.breakBlock();
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('wheel', (e) => {
      if (!this.isPointerLocked) return;

      e.preventDefault();
      this.targetCameraDistance = Math.max(0, Math.min(42,
        this.targetCameraDistance + (e.deltaY > 0 ? 5 : -5)
      ));
      this._showCameraHint();
    }, { passive: false });

    if (!this.isMobile) {
      document.addEventListener('pointerlockchange', () => {
        this.isPointerLocked = document.pointerLockElement === this.canvas;
        if (this.isPointerLocked) {
          this.ui.pauseScreen.style.display = 'none';
          this._showGameUI(true);
        } else if (this.isRunning) {
          this.ui.pauseScreen.style.display = 'flex';
        }
      });

      document.addEventListener('pointerlockerror', () => {
        // iframe içinde bazı tarayıcılarda pointer lock hiç çalışmaz (WrongDocumentError).
        // Oyunu kilitlemek yerine WASD ile oynanabilir modda devam et.
        console.warn('[ATÖLYE] Pointer lock kullanılamıyor, WASD ile oynanabilir modda devam ediliyor.');
        this.isPointerLocked = false;
        if (this.isRunning) {
          this.ui.pauseScreen.style.display = 'none';
          this._showGameUI(true);
        }
      });

      const requestLock = () => {
        if (!this.isPointerLocked && this.isRunning) {
          try {
            const p = this.canvas.requestPointerLock();
            if (p && typeof p.catch === 'function') {
              p.catch(() => {
                this.isPointerLocked = false;
                this.ui.pauseScreen.style.display = 'none';
                this._showGameUI(true);
              });
            }
          } catch {
            this.isPointerLocked = false;
            this.ui.pauseScreen.style.display = 'none';
            this._showGameUI(true);
          }
        }
      };

      this.ui.startScreen.addEventListener('click', () => {
        this.isRunning = true;
        this.ui.startScreen.style.display = 'none';
        this._showGameUI(true);
        this.camera.position.set(this._spawnX, this._spawnY + this.player.eyeHeight, this._spawnZ);
        const lookDir = new THREE.Vector3(
          -Math.sin(this.player.yaw) * Math.cos(this.player.pitch),
          Math.sin(this.player.pitch),
          -Math.cos(this.player.yaw) * Math.cos(this.player.pitch)
        );
        this.camera.lookAt(
          this.camera.position.x + lookDir.x,
          this.camera.position.y + lookDir.y,
          this.camera.position.z + lookDir.z
        );
        requestLock();
      });

      this.ui.pauseScreen.addEventListener('click', requestLock);
      this.canvas.addEventListener('click', requestLock);
    }

    if (this.isMobile) {
      this.ui.startScreen.addEventListener('click', () => {
        this.isRunning = true;
        this.ui.startScreen.style.display = 'none';
        this.camera.position.set(this._spawnX, this._spawnY + this.player.eyeHeight, this._spawnZ);
        const lookDir = new THREE.Vector3(
          -Math.sin(this.player.yaw) * Math.cos(this.player.pitch),
          Math.sin(this.player.pitch),
          -Math.cos(this.player.yaw) * Math.cos(this.player.pitch)
        );
        this.camera.lookAt(
          this.camera.position.x + lookDir.x,
          this.camera.position.y + lookDir.y,
          this.camera.position.z + lookDir.z
        );
        this._showGameUI(true);
      });

      this.ui.pauseScreen.addEventListener('click', () => {
        this.isRunning = true;
        this.ui.pauseScreen.style.display = 'none';
        this._showGameUI(true);
      });

      this.touchController = new TouchController(this.player, this);
    }

    window.addEventListener('resize', () => this._onResize());
  }

  /** /HUD */
  _showGameUI(show) {
    const display = show ? 'flex' : 'none';
    this.ui.crosshair.style.display = show ? 'block' : 'none';
    this.ui.selectedBlockName.style.display = show ? 'block' : 'none';
    this.ui.hotbar.style.display = this.isMobile ? 'none' : display;
    this.ui.debugInfo.style.display = show ? 'block' : 'none';
    this.ui.blockHighlight.style.display = 'none';
    if (!this.isMobile) {
      this.ui.controlsPanel.style.display = show ? 'flex' : 'none';
    }
    if (this.isMobile) {
      const mobileControls = document.getElementById('mobileControls');
      if (mobileControls) mobileControls.style.display = show ? 'block' : 'none';
    }
  }

  _updateZoomCamera(dt) {
    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * (1 - Math.exp(-8 * dt));
    if (this.cameraDistance < 0.05) return;
    const p = this.player.position;
    const distance = this.cameraDistance;
    const backX = Math.sin(this.player.yaw) * distance;
    const backZ = Math.cos(this.player.yaw) * distance;
    const height = 2.2 + distance * 0.62;
    this.camera.position.set(p.x + backX, p.y + height, p.z + backZ);
    this.cameraLookTarget.set(p.x, p.y + this.player.eyeHeight, p.z);
    this.camera.lookAt(this.cameraLookTarget);
  }

  _showCameraHint() {
    let hint = document.getElementById('cameraHint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'cameraHint';
      document.body.appendChild(hint);
    }
    hint.textContent = this.targetCameraDistance === 0
      ? 'OYUNCU GÖRÜNÜMÜ'
      : `UZAK GÖRÜNÜM · ${Math.round(this.targetCameraDistance)} m`;
    hint.classList.add('show');
    if (this._cameraHintTimer) clearTimeout(this._cameraHintTimer);
    this._cameraHintTimer = setTimeout(() => hint.classList.remove('show'), 1100);
  }

  /**  */
  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  /** FOV */
  _adjustFOV(delta) {
    this.fov = Math.max(this.fovMin, Math.min(this.fovMax, this.fov + delta));
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
    this._showFOVHint();
  }

  /**  */
  _resetFOV() {
    this._adjustFOV(this.defaultFov - this.fov);
  }

  /**  FOV  */
  _showFOVHint() {
    if (this._fovHintTimer) clearTimeout(this._fovHintTimer);
    let hint = document.getElementById('fovHint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'fovHint';
      hint.style.cssText =
        'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'color:#fff;font-size:28px;font-weight:bold;' +
        'text-shadow:0 2px 8px rgba(0,0,0,0.6);pointer-events:none;z-index:100;' +
        'transition:opacity 0.3s;';
      document.body.appendChild(hint);
    }
    hint.textContent = `FOV: ${this.fov.toFixed(0)}°`;
    hint.style.opacity = '1';
    this._fovHintTimer = setTimeout(() => {
      hint.style.opacity = '0';
    }, 1200);
  }

  /**  */
  _updateDebugInfo() {
    const pos = this.player.position;
    const cx = Math.floor(pos.x / CHUNK_SIZE);
    const cz = Math.floor(pos.z / CHUNK_SIZE);
    const chunks = this.world.chunks.size;

    this.ui.debugInfo.innerHTML =
      `FPS: ${this.fps}<br>` +
      `FOV: ${this.fov.toFixed(0)}°<br>` +
      `XYZ: ${pos.x.toFixed(1)} / ${pos.y.toFixed(1)} / ${pos.z.toFixed(1)}<br>` +
      `Bolge: ${cx}, ${cz} | Yuklendi: ${chunks}<br>` +
      `Robot: ${this.animalManager ? this.animalManager.animals.length : 0}`;

    this.ui.blockHighlight.style.display = 'none';
  }


  /* ============================================
     Bacalardan çıkan duman efekti
     ============================================ */
  _initSmoke() {
    const spots = (this.world.structures && this.world.structures.smoke) || [];
    if (!spots.length) return;

    const perSpot = this.isMobile ? 10 : 22;
    const count = spots.length * perSpot;
    const positions = new Float32Array(count * 3);
    this._smokeData = [];

    let i = 0;
    for (const sp of spots) {
      for (let k = 0; k < perSpot; k++) {
        const d = {
          ox: sp.x, oy: sp.y, oz: sp.z,
          t: Math.random(),
          speed: 0.5 + Math.random() * 0.5,
          drift: (Math.random() - 0.5) * 0.6,
        };
        this._smokeData.push(d);
        positions[i * 3] = sp.x;
        positions[i * 3 + 1] = sp.y;
        positions[i * 3 + 2] = sp.z;
        i++;
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xd8d8d8,
      size: 1.6,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.smoke = new THREE.Points(geo, mat);
    this.smoke.frustumCulled = false;
    this.scene.add(this.smoke);
  }

  _updateSmoke(dt) {
    if (!this.smoke) return;
    const pos = this.smoke.geometry.attributes.position;
    const arr = pos.array;
    for (let i = 0; i < this._smokeData.length; i++) {
      const d = this._smokeData[i];
      d.t += dt * d.speed * 0.12;
      if (d.t > 1) d.t -= 1;
      const rise = d.t * 14;
      arr[i * 3] = d.ox + Math.sin(d.t * 6 + i) * (0.6 + d.t * 2) + d.drift * rise * 0.3;
      arr[i * 3 + 1] = d.oy + rise;
      arr[i * 3 + 2] = d.oz + Math.cos(d.t * 5 + i) * (0.6 + d.t * 2);
    }
    pos.needsUpdate = true;
  }

  /* ============================================
     Bölge tanıtım afişi
     ============================================ */
  _updateZoneBanner() {
    const p = this.player.position;
    const zone = findZone(p.x, p.z);
    const key = zone && zone.name ? zone.key : null;
    if (key === this.currentZoneKey) return;
    this.currentZoneKey = key;

    const el = this.ui.zoneBanner;
    if (!el) return;
    if (!key) { el.classList.remove('show'); return; }

    el.textContent = zone.name;
    el.classList.add('show');
    if (this._zoneTimer) clearTimeout(this._zoneTimer);
    this._zoneTimer = setTimeout(() => el.classList.remove('show'), 3500);
  }

  /* ============================================
     Fikir panosu
     ============================================ */
  _initIdeaBoard() {
    const submit = document.getElementById('ideaSubmit');
    const close = document.getElementById('ideaClose');
    if (submit) submit.addEventListener('click', () => this._submitIdea());
    if (close) close.addEventListener('click', () => this._closeIdeaBoard());
    const btnIdea = document.getElementById('btnIdea');
    if (btnIdea) btnIdea.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.ideaOpen ? this._closeIdeaBoard() : this._openIdeaBoard();
    });

    window.addEventListener('message', (e) => this._onParentMessage(e));
    this._renderIdeas();
  }

  _onParentMessage(e) {
    const data = e.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'atolye:ideas') {
      this._remoteIdeas = Array.isArray(data.ideas) ? data.ideas : [];
      this._renderIdeas();
    } else if (data.type === 'atolye:idea-created') {
      const idea = data.idea || {};
      const kaynak = data.source === 'ai' ? 'AI Fikir Çekirdeği' : 'yedek sınıflandırıcı';
      this._setIdeaStatus(
        `Paylaşıldı → "${idea.title || idea.baslik || ''}" · ${idea.region || idea.bolge || ''} bölgesi · ${idea.suggestedKp ?? idea.onerilenKatkiPuani ?? '?'} KP (${kaynak})`,
        'success',
      );
      const t = document.getElementById('ideaText');
      if (t) t.value = '';
    } else if (data.type === 'atolye:idea-error') {
      this._setIdeaStatus(data.message || 'Fikir gönderilemedi.', 'error');
    } else if (data.type === 'atolye:contribution-created') {
      this._setIdeaStatus('Katkın gönderildi, fikir sahibinin onayını bekliyor.', 'success');
    } else if (data.type === 'atolye:contribution-error') {
      this._setIdeaStatus(data.message || 'Katkı gönderilemedi.', 'error');
    }
  }

  _setIdeaStatus(msg, kind) {
    const el = this.ui.ideaStatus;
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'idea-status' + (kind ? ' ' + kind : '');
  }

  _requestIdeas() {
    try {
      window.parent.postMessage({ type: 'atolye:request-ideas' }, window.location.origin);
    } catch {}
  }

  _renderIdeas() {
    const list = document.getElementById('ideaList');
    if (!list) return;
    const ideas = this._remoteIdeas;
    if (!ideas.length) {
      list.innerHTML = '<div class="idea-empty">Henüz fikir yok. İlk fikri sen paylaş!</div>';
      return;
    }
    // Sadece gerçek (kalıcı ID'si olan) fikirlere katkı sunulabilir.
    list.innerHTML = ideas.slice(0, 20).map(i => {
      const author = i.ownerName || i.author || 'Anonim';
      const region = i.region || i.bolge || '';
      const kp = i.suggestedKp ?? i.onerilenKatkiPuani;
      const contributeBtn = i.id != null
        ? `<button class="idea-contribute-btn" data-idea-id="${i.id}">Atölyede inşa ettiğinle katkı sun</button>
           <div class="idea-contribute-form" data-idea-id="${i.id}">
             <textarea placeholder="Bu fikre ne katkı sunuyorsun? (Atölyede inşa ettiğin şeyi anlat)" maxlength="1000"></textarea>
             <button class="idea-contribute-submit" data-idea-id="${i.id}">Gönder</button>
           </div>`
        : '';
      return `<div class="idea-item"><div class="idea-author">${this._esc(author)}</div><div class="idea-body">${this._esc(i.text)}</div><div class="idea-meta">${this._esc(region)}${kp != null ? ' · ' + this._esc(String(kp)) + ' KP' : ''}</div>${contributeBtn}</div>`;
    }).join('');

    list.querySelectorAll('.idea-contribute-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const form = list.querySelector(`.idea-contribute-form[data-idea-id="${btn.dataset.ideaId}"]`);
        if (form) form.classList.toggle('open');
      });
    });
    list.querySelectorAll('.idea-contribute-submit').forEach((btn) => {
      btn.addEventListener('click', () => {
        const form = btn.closest('.idea-contribute-form');
        const textarea = form && form.querySelector('textarea');
        const description = textarea ? textarea.value.trim() : '';
        if (description.length < 3) {
          this._setIdeaStatus('Katkı açıklamasını biraz daha uzun yaz.', 'error');
          return;
        }
        this._submitContribution(Number(btn.dataset.ideaId), description);
      });
    });
  }

  _submitContribution(ideaId, description) {
    const a = document.getElementById('ideaAuthor');
    const contributorName = (a && a.value.trim()) || 'Anonim';
    this._setIdeaStatus('Katkı gönderiliyor...', 'pending');
    try {
      window.parent.postMessage(
        { type: 'atolye:propose-contribution', ideaId, contributorName, description },
        window.location.origin,
      );
    } catch {
      this._setIdeaStatus('Sunucuya ulaşılamadı.', 'error');
    }
  }

  _esc(t) {
    return String(t).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  _submitIdea() {
    const a = document.getElementById('ideaAuthor');
    const t = document.getElementById('ideaText');
    if (!t || !t.value.trim()) return;
    const author = (a && a.value.trim()) || 'Anonim';
    const text = t.value.trim();
    this._setIdeaStatus('Gönderiliyor... (AI Fikir Çekirdeği analiz ediyor)', 'pending');
    try {
      window.parent.postMessage({ type: 'atolye:submit-idea', author, text }, window.location.origin);
    } catch {
      this._setIdeaStatus('Sunucuya ulaşılamadı.', 'error');
    }
  }

  _nearIdeaSpot() {
    const spot = this.world.structures && this.world.structures.ideaSpot;
    if (!spot) return false;
    const p = this.player.position;
    const dx = p.x - spot.x, dz = p.z - spot.z;
    return dx * dx + dz * dz < 100;   // 10 blok yarıçap
  }

  _updateInteractHint() {
    const el = this.ui.interactHint;
    if (!el) return;
    const show = !this.ideaOpen && this.isRunning && this._nearIdeaSpot();
    el.style.display = show ? 'block' : 'none';
  }

  _openIdeaBoard() {
    if (!this.ui.ideaBoard) return;
    this.ideaOpen = true;
    this._setIdeaStatus('', null);
    this._renderIdeas();
    this._requestIdeas();
    this.ui.ideaBoard.classList.add('open');
    if (this.ui.interactHint) this.ui.interactHint.style.display = 'none';
    if (document.pointerLockElement) document.exitPointerLock();
  }

  _closeIdeaBoard() {
    if (!this.ui.ideaBoard) return;
    this.ideaOpen = false;
    this.ui.ideaBoard.classList.remove('open');
  }

  /**  */
  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = this.clock.getDelta();

    this.frameCount++;
    this.fpsTime += dt;
    if (this.fpsTime >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    if (this.isMobile && this.touchController && this.isRunning) {
      const tc = this.touchController;
      const deadZone = 0.15;
      const absX = Math.abs(tc.moveX);
      const absZ = Math.abs(tc.moveZ);
      this.player.keys['KeyW'] = tc.moveZ < -deadZone;
      this.player.keys['KeyS'] = tc.moveZ > deadZone;
      this.player.keys['KeyA'] = tc.moveX < -deadZone;
      this.player.keys['KeyD'] = tc.moveX > deadZone;
    }

    // iframe içinde pointer lock her zaman başarılı olmayabilir (ör. WrongDocumentError);
    // dünya/oyuncu güncellemesi buna bağlı kalmasın, aksi halde ekran mavi/boş kalır.
    if (this.isRunning) {
      this.player.update(dt);
      this.world.update(this.player.position.x, this.player.position.z);
      this.highlight.update(this.player.targetBlock);
    }

    if (this.isRunning) this._updateZoomCamera(dt);

    if (this.animalManager) {
      this.animalManager.update(dt);
    }

    this._updateSmoke(dt);
    if (this.isRunning) {
      this._updateZoneBanner();
      this._updateInteractHint();
    }

    this.renderer.render(this.scene, this.camera);

    if (this.frameCount % 10 === 0) {
      this._updateDebugInfo();
    }
  }
}

/* ============================================
   Oyunu baslat
   ============================================ */
window.addEventListener('DOMContentLoaded', async () => {
  const game = new Game();
  await game.init();
  game.animate();
});
