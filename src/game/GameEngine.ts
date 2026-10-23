/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { synthAudio } from '../audio/synthAudio';
import { CameraMode, GameStats, TimeOfDay, Upgrades } from '../types/game';
import { AlpineEnvironment } from './Environment';
import { SnowField } from './SnowField';
import { Vehicle } from './Vehicle';

// Pre-allocated math objects to avoid GC in the render loop (Skill directive)
const _cameraTarget = new THREE.Vector3();
const _desiredCameraPos = new THREE.Vector3();

export class GameEngine {
  public container: HTMLElement;
  public renderer!: THREE.WebGLRenderer;
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;

  public vehicle!: Vehicle;
  public environment!: AlpineEnvironment;
  public snowField!: SnowField;

  public cameraMode: CameraMode = 'isometric';
  public isSoftwareGl: boolean = false;

  private frameId: number = 0;
  private lastTime: number = 0;
  private isDestroyed: boolean = false;

  // Screen shake & hitstop
  private shakeAmount: number = 0;
  private hitstopMs: number = 0;

  // Inputs
  private keysHeld: Record<string, boolean> = {};

  // Combo & Game Stats
  public stats: GameStats = {
    score: 0,
    coins: 45, // Starting coins for upgrades
    totalSnowClearedM2: 0,
    clearedPercentage: 0,
    currentCombo: 1.0,
    comboTimer: 0,
    maxCombo: 1.0,
    carsFreed: 0,
    cocoaFound: 0,
    giftsFound: 0,
    currentSpeedKmH: 0,
    boostAvailable: 100,
    isBoosting: false,
  };

  private onStatsUpdate?: (stats: GameStats) => void;
  private onFloatingText?: (text: string, color: string, x: number, y: number) => void;
  private onVictory?: () => void;
  private isVictoryTriggered: boolean = false;

  constructor(
    container: HTMLElement,
    initialUpgrades: Upgrades,
    callbacks?: {
      onStatsUpdate?: (stats: GameStats) => void;
      onFloatingText?: (text: string, color: string, x: number, y: number) => void;
      onVictory?: () => void;
    }
  ) {
    this.container = container;
    this.onStatsUpdate = callbacks?.onStatsUpdate;
    this.onFloatingText = callbacks?.onFloatingText;
    this.onVictory = callbacks?.onVictory;

    this.initThree(initialUpgrades);
    this.initInputs();
  }

  private initThree(initialUpgrades: Upgrades) {
    // 1. Detect software WebGL per Three.js skill directive
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Initialize renderer
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // 3. Scene and Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x94a3b8);
    this.scene.fog = new THREE.FogExp2(0x94a3b8, 0.012);

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 250);
    this.camera.position.set(24, 28, 24);

    // 4. Mandatory Studio Environment Reflection (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 5. Add Game Subsystems
    const mapSize = 90;
    this.environment = new AlpineEnvironment(mapSize);
    this.scene.add(this.environment.group);

    this.snowField = new SnowField(mapSize);
    this.scene.add(this.snowField.group);

    this.vehicle = new Vehicle(initialUpgrades);
    this.vehicle.resetPosition(0, 0, 0);
    this.scene.add(this.vehicle.group);

    // Resize handling
    window.addEventListener('resize', this.handleResize);

    // Start simulation loop
    this.lastTime = performance.now();
    this.loop();
  }

  private handleResize = () => {
    if (!this.container || this.isDestroyed) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private initInputs() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keysHeld[e.code] = true;

    // Honk on H or B key press (edge-triggered, ignore auto-repeat)
    if ((e.code === 'KeyH' || e.code === 'KeyB') && !e.repeat) {
      this.honk();
    }
  };

  // Triggers the retro synth horn audio and visual 'beep' icon
  public honk() {
    synthAudio.playHorn();
    this.vehicle.triggerHonk(this.camera);

    if (this.onFloatingText) {
      this.onFloatingText('📢 BEEP!', '#f59e0b', window.innerWidth / 2, window.innerHeight * 0.42);
    }
  }

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keysHeld[e.code] = false;
  };

  private handleBlur = () => {
    this.keysHeld = {};
  };

  // Main game tick
  private tick() {
    if (this.isDestroyed) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Clamped frame delta per game craft guidelines
    const dt = Math.min(rawDt, 0.05);

    // Hitstop freeze on heavy collisions
    if (this.hitstopMs > 0) {
      this.hitstopMs -= dt * 1000;
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // 1. Read input state
    const forward = !!(this.keysHeld['KeyW'] || this.keysHeld['ArrowUp']);
    const backward = !!(this.keysHeld['KeyS'] || this.keysHeld['ArrowDown']);
    const left = !!(this.keysHeld['KeyA'] || this.keysHeld['ArrowLeft']);
    const right = !!(this.keysHeld['KeyD'] || this.keysHeld['ArrowRight']);
    const boost = !!(this.keysHeld['Space'] || this.keysHeld['ShiftLeft']);

    // 2. Update Vehicle Kinematics
    this.vehicle.update(dt, { forward, backward, left, right, boost }, false, this.camera);

    // 3. Collision with Environment Obstacles
    const collision = this.environment.checkCollision(this.vehicle.position, 1.4);
    if (collision) {
      synthAudio.playObstacleBump();
      this.shakeAmount = 0.45;
      this.hitstopMs = 40; // 40ms simulation hitstop

      // Bounce back slightly
      this.vehicle.speed = -this.vehicle.speed * 0.4;
      this.vehicle.position.x -= Math.sin(this.vehicle.rotationY) * 0.4;
      this.vehicle.position.z -= Math.cos(this.vehicle.rotationY) * 0.4;
      this.vehicle.group.position.copy(this.vehicle.position);
    }

    // 4. Snow Plowing & Clearing Logic
    const bladeSegment = this.vehicle.getBladeWorldSegment();
    const isHeated = this.vehicle.upgrades.heatedBlade >= 2;
    const { newlyClearedAreaM2 } = this.snowField.plowSnow(
      bladeSegment.start,
      bladeSegment.end,
      bladeSegment.center,
      this.vehicle.speed,
      isHeated
    );

    // Audio & Combo System Updates
    const isPlowing = newlyClearedAreaM2 > 0.05 && Math.abs(this.vehicle.speed) > 0.4;
    synthAudio.updateEngine(Math.abs(this.vehicle.speed) / 14, forward || backward);
    synthAudio.updateSnowCrunch(isPlowing ? Math.abs(this.vehicle.speed) / 8 : 0);

    if (isPlowing) {
      // Build combo
      this.stats.comboTimer = 2.4; // seconds before combo decays
      const prevComboTier = Math.floor(this.stats.currentCombo);
      this.stats.currentCombo = Math.min(10.0, this.stats.currentCombo + newlyClearedAreaM2 * 0.15);
      const newComboTier = Math.floor(this.stats.currentCombo);

      // Play musical chime on combo tier up
      if (newComboTier > prevComboTier) {
        synthAudio.playComboChime(newComboTier);
        if (this.onFloatingText) {
          const rank = this.getComboRank(this.stats.currentCombo);
          this.onFloatingText(`${this.stats.currentCombo.toFixed(1)}x ${rank}!`, '#f59e0b', window.innerWidth / 2, window.innerHeight / 3);
        }
      }

      // Add to score and coins
      const scoreGain = newlyClearedAreaM2 * 15 * this.stats.currentCombo;
      const coinGain = newlyClearedAreaM2 * 0.4 * (1 + this.stats.currentCombo * 0.2);

      this.stats.score += Math.round(scoreGain);
      this.stats.coins += coinGain;
      this.stats.totalSnowClearedM2 += newlyClearedAreaM2;

      if (this.stats.currentCombo > this.stats.maxCombo) {
        this.stats.maxCombo = this.stats.currentCombo;
      }
    } else {
      // Combo decay when not plowing
      if (this.stats.comboTimer > 0) {
        this.stats.comboTimer -= dt;
      } else if (this.stats.currentCombo > 1.0) {
        this.stats.currentCombo = Math.max(1.0, this.stats.currentCombo - dt * 2.2);
      }
    }

    // 5. Magnet / Item Pickups
    const collectedItem = this.snowField.collectItem(this.vehicle.position, this.vehicle.upgrades.snowMagnet);
    if (collectedItem) {
      if (collectedItem.type === 'cocoa') {
        this.stats.cocoaFound++;
        this.stats.coins += 25;
        this.stats.score += 500;
        if (this.onFloatingText) {
          this.onFloatingText('+25 ☕ HOT COCOA!', '#f97316', window.innerWidth / 2, window.innerHeight * 0.4);
        }
      } else if (collectedItem.type === 'gift') {
        this.stats.giftsFound++;
        this.stats.coins += 50;
        this.stats.score += 1000;
        if (this.onFloatingText) {
          this.onFloatingText('+50 🎁 HOLIDAY GIFT!', '#10b981', window.innerWidth / 2, window.innerHeight * 0.4);
        }
      } else {
        this.stats.coins += 80;
        this.stats.score += 1500;
        this.stats.currentCombo = Math.min(10, this.stats.currentCombo + 1.5);
        if (this.onFloatingText) {
          this.onFloatingText('+80 ⭐ GOLDEN SNOWFLAKE!', '#38bdf8', window.innerWidth / 2, window.innerHeight * 0.4);
        }
      }
    }

    // 6. Check Freed Cars
    const freedCount = this.snowField.snowboundCars.filter((c) => c.isFreed).length;
    if (freedCount > this.stats.carsFreed) {
      const diff = freedCount - this.stats.carsFreed;
      this.stats.carsFreed = freedCount;
      this.stats.coins += diff * 40;
      this.stats.score += diff * 800;
      if (this.onFloatingText) {
        this.onFloatingText(`+${diff * 40} 🚗 CAR RESCUED!`, '#3b82f6', window.innerWidth / 2, window.innerHeight * 0.35);
      }
    }

    // 7. Update Subsystems
    this.snowField.update(dt);
    this.environment.update(dt);

    // 8. Camera Update (Smooth spring / exponential damping)
    this.updateCamera(dt);

    // 9. Update stats & notify React HUD
    this.stats.clearedPercentage = this.snowField.getClearedPercentage();
    this.stats.currentSpeedKmH = Math.round(Math.abs(this.vehicle.speed) * 3.6);
    this.stats.boostAvailable = Math.round(this.vehicle.boostMeter);
    this.stats.isBoosting = this.vehicle.isBoosting;

    if (this.onStatsUpdate) {
      this.onStatsUpdate({ ...this.stats });
    }

    // Check Victory
    if (this.stats.clearedPercentage >= 85 && !this.isVictoryTriggered) {
      this.isVictoryTriggered = true;
      if (this.onVictory) this.onVictory();
    }

    // 10. Render Frame
    this.renderer.render(this.scene, this.camera);
  }

  // Smooth camera follow with damping
  private updateCamera(dt: number) {
    const vPos = this.vehicle.position;

    if (this.cameraMode === 'isometric') {
      // Classic cozy isometric angle (tilted 45 degrees)
      const offset = 22;
      _desiredCameraPos.set(vPos.x + offset, 24, vPos.z + offset);
      _cameraTarget.set(vPos.x, 1.2, vPos.z);
    } else if (this.cameraMode === 'topdown') {
      _desiredCameraPos.set(vPos.x, 34, vPos.z + 0.1);
      _cameraTarget.set(vPos.x, 0, vPos.z);
    } else {
      // Chase camera
      const dist = 9;
      const angle = this.vehicle.rotationY;
      _desiredCameraPos.set(
        vPos.x - Math.sin(angle) * dist,
        4.5,
        vPos.z - Math.cos(angle) * dist
      );
      _cameraTarget.set(vPos.x, 1.5, vPos.z);
    }

    // Apply camera shake if any
    if (this.shakeAmount > 0.01) {
      _desiredCameraPos.x += (Math.random() - 0.5) * this.shakeAmount;
      _desiredCameraPos.y += (Math.random() - 0.5) * this.shakeAmount;
      _desiredCameraPos.z += (Math.random() - 0.5) * this.shakeAmount;
      this.shakeAmount = THREE.MathUtils.damp(this.shakeAmount, 0, 10, dt);
    }

    // Frame-rate independent exponential damping (Skill directive)
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _desiredCameraPos.x, 4.5, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _desiredCameraPos.y, 4.5, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _desiredCameraPos.z, 4.5, dt);

    this.camera.lookAt(_cameraTarget);
  }

  // Loop execution with Software WebGL guard
  private loop = () => {
    if (this.isDestroyed) return;

    if (this.isSoftwareGl) {
      this.afterDraw(() => {
        this.tick();
        this.loop();
      });
    } else {
      this.tick();
      this.frameId = requestAnimationFrame(this.loop);
    }
  };

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 60);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  public getComboRank(combo: number): string {
    if (combo >= 7.0) return 'ARCTIC TITAN';
    if (combo >= 5.0) return 'WHITE-OUT';
    if (combo >= 3.5) return 'AVALANCHE';
    if (combo >= 2.2) return 'BLIZZARD';
    if (combo >= 1.5) return 'FLURRY';
    return 'POWDER';
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraMode = mode;
  }

  public setTimeOfDay(time: TimeOfDay) {
    this.environment.setTimeOfDay(time);
    // Adjust scene fog and background to match
    switch (time) {
      case 'day':
        this.scene.background = new THREE.Color(0x94a3b8);
        (this.scene.fog as THREE.FogExp2).color.setHex(0x94a3b8);
        break;
      case 'dusk':
        this.scene.background = new THREE.Color(0x4c1d95);
        (this.scene.fog as THREE.FogExp2).color.setHex(0x4c1d95);
        break;
      case 'night':
        this.scene.background = new THREE.Color(0x090d16);
        (this.scene.fog as THREE.FogExp2).color.setHex(0x090d16);
        break;
      case 'aurora':
        this.scene.background = new THREE.Color(0x064e3b);
        (this.scene.fog as THREE.FogExp2).color.setHex(0x064e3b);
        break;
    }
  }

  public resetVehicle() {
    this.vehicle.resetPosition(0, 0, 0);
  }

  public applyUpgrades(upgrades: Upgrades) {
    this.vehicle.upgrades = upgrades;
    this.vehicle.updateBladeMesh();
    this.vehicle.updatePaintColor(upgrades.paintColor);
  }

  public dispose() {
    this.isDestroyed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);

    synthAudio.updateEngine(0, false);
    synthAudio.updateSnowCrunch(0);

    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
