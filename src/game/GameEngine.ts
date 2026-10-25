/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { synthAudio } from '../audio/synthAudio';
import { BladeAngle, CameraMode, GameStats, RacerStanding, TimeOfDay, Upgrades } from '../types/game';
import { AlpineEnvironment } from './Environment';
import { SnowField } from './SnowField';
import { Vehicle } from './Vehicle';
import { AICar, AICarConfig } from './AICar';

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
  public aiCars: AICar[] = [];

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
    playerRank: 1,
    racers: [],
    // Heavy Machine Simulation telemetry
    dieselLevel: 100,
    rpm: 850,
    diffLockActive: false,
    bladeAngle: 'straight',
    saltSpreaderActive: false,
    saltRemaining: 100,
    weather: 'blizzard',
    truckHealth: 100,
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

    // Initialize 4 automated AI competitor snowplow cars
    this.initAICars();

    // Resize handling
    window.addEventListener('resize', this.handleResize);

    // Start simulation loop
    this.lastTime = performance.now();
    this.loop();
  }

  // Spawns 4 distinct automated AI competitor snowplow cars
  private initAICars() {
    const aiConfigs: AICarConfig[] = [
      {
        id: 'ai-bob',
        name: 'Blizzard Bob',
        color: '#2563eb', // Blue
        bladeColor: '#3b82f6',
        topSpeed: 6.8,
        bladeWidth: 2.3,
        waypoints: [
          { x: -24, z: -20 },
          { x: 0, z: -25 },
          { x: 22, z: -18 },
          { x: 25, z: 0 },
          { x: 20, z: 22 },
          { x: 0, z: 24 },
          { x: -22, z: 20 },
          { x: -25, z: 0 },
        ],
      },
      {
        id: 'ai-sven',
        name: 'Turbo Sven',
        color: '#dc2626', // Crimson Red
        bladeColor: '#ef4444',
        topSpeed: 8.0,
        bladeWidth: 2.2,
        waypoints: [
          { x: -8, z: -10 },
          { x: 10, z: -8 },
          { x: 12, z: 10 },
          { x: -10, z: 12 },
          { x: 0, z: -18 },
          { x: 18, z: 0 },
          { x: 0, z: 18 },
          { x: -18, z: 0 },
        ],
      },
      {
        id: 'ai-fiona',
        name: 'Frosty Fiona',
        color: '#059669', // Emerald
        bladeColor: '#10b981',
        topSpeed: 7.2,
        bladeWidth: 2.5,
        waypoints: [
          { x: -16, z: 8 },
          { x: -12, z: -16 },
          { x: 8, z: -20 },
          { x: 16, z: -10 },
          { x: 22, z: 12 },
          { x: 6, z: 20 },
          { x: -8, z: 14 },
        ],
      },
      {
        id: 'ai-ava',
        name: 'Alpine Ava',
        color: '#7c3aed', // Violet
        bladeColor: '#a855f7',
        topSpeed: 7.0,
        bladeWidth: 2.4,
        waypoints: [
          { x: 14, z: -22 },
          { x: 20, z: 0 },
          { x: 14, z: 22 },
          { x: -14, z: 22 },
          { x: -20, z: 0 },
          { x: -14, z: -22 },
        ],
      },
    ];

    const startPositions = [
      { x: -12, z: -4, rotY: 0 },
      { x: 12, z: -4, rotY: Math.PI },
      { x: -8, z: 14, rotY: Math.PI / 2 },
      { x: 8, z: 14, rotY: -Math.PI / 2 },
    ];

    this.aiCars = aiConfigs.map((cfg, idx) => {
      const car = new AICar(cfg, startPositions[idx]);
      this.scene.add(car.group);
      return car;
    });
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

    if (e.repeat) return;

    // Honk on H or B key press
    if (e.code === 'KeyH' || e.code === 'KeyB') {
      this.honk();
    }

    // Blade Angle hydraulic controls: Q = Left, E = Right, Z = Straight
    if (e.code === 'KeyQ') {
      this.setBladeAngle('left');
    } else if (e.code === 'KeyE') {
      this.setBladeAngle('right');
    } else if (e.code === 'KeyZ') {
      this.setBladeAngle('straight');
    }

    // Differential Lock toggle: X or L
    if (e.code === 'KeyX' || e.code === 'KeyL') {
      this.toggleDiffLock();
    }

    // Road Salt Spreader toggle: F
    if (e.code === 'KeyF') {
      this.toggleSalt();
    }
  };

  // Triggers the retro synth horn audio and visual 'beep' icon
  public honk() {
    synthAudio.playHorn();
    this.vehicle.triggerHonk(this.camera);

    if (this.onFloatingText) {
      this.onFloatingText('📢 BEEP!', '#f59e0b', window.innerWidth / 2, window.innerHeight * 0.42);
    }

    // Nearby AI competitor cars honk back playfully in friendly alpine camaraderie!
    this.aiCars.forEach((ai) => {
      const dist = ai.position.distanceTo(this.vehicle.position);
      if (dist < 18 && Math.random() < 0.75) {
        setTimeout(() => {
          if (!this.isDestroyed) {
            ai.triggerHonk(this.camera, dist);
          }
        }, 180 + Math.random() * 380);
      }
    });
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
      if (collectedItem.type === 'fuel') {
        this.vehicle.refuel(45);
        this.stats.coins += 35;
        this.stats.score += 750;
        if (this.onFloatingText) {
          this.onFloatingText('+45L 🛢️ DIESEL DRUM!', '#f59e0b', window.innerWidth / 2, window.innerHeight * 0.4);
        }
      } else if (collectedItem.type === 'salt') {
        this.vehicle.saltRemaining = Math.min(100, this.vehicle.saltRemaining + 40);
        this.stats.coins += 25;
        this.stats.score += 500;
        if (this.onFloatingText) {
          this.onFloatingText('+40% 🧂 ROAD SALT SUPPLY!', '#38bdf8', window.innerWidth / 2, window.innerHeight * 0.4);
        }
      } else if (collectedItem.type === 'cocoa') {
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

    // Update autonomous AI competitor snowplow cars
    this.aiCars.forEach((ai) => {
      ai.update(dt, this.environment, this.snowField, this.vehicle.position, this.aiCars, this.camera);
    });

    // 8. Compute Real-time Race Standings (Player + 4 AI Competitors)
    const racers: RacerStanding[] = [
      {
        id: 'player',
        name: 'You (Plow Master)',
        color: this.vehicle.upgrades.paintColor || '#f97316',
        clearedM2: Math.round(this.stats.totalSnowClearedM2),
        score: this.stats.score,
        isPlayer: true,
        rank: 1,
        currentSpeedKmH: Math.round(Math.abs(this.vehicle.speed) * 3.6),
      },
      ...this.aiCars.map((ai) => ({
        id: ai.id,
        name: ai.name,
        color: ai.color,
        clearedM2: Math.round(ai.clearedM2),
        score: ai.score,
        isPlayer: false,
        rank: 2,
        currentSpeedKmH: ai.getSpeedKmH(),
      })),
    ];

    // Sort descending by snow cleared (who cleared the most m²!)
    racers.sort((a, b) => b.clearedM2 - a.clearedM2);
    racers.forEach((r, idx) => {
      r.rank = idx + 1;
      if (!r.isPlayer) {
        const aiCar = this.aiCars.find((c) => c.id === r.id);
        if (aiCar) aiCar.updateNameplate(r.rank);
      }
    });

    const playerRacer = racers.find((r) => r.isPlayer);
    this.stats.playerRank = playerRacer ? playerRacer.rank : 1;
    this.stats.racers = racers;

    // 9. Camera Update (Smooth spring / exponential damping)
    this.updateCamera(dt);

    // 10. Update stats & notify React HUD
    this.stats.clearedPercentage = this.snowField.getClearedPercentage();
    this.stats.currentSpeedKmH = Math.round(Math.abs(this.vehicle.speed) * 3.6);
    this.stats.boostAvailable = Math.round(this.vehicle.boostMeter);
    this.stats.isBoosting = this.vehicle.isBoosting;
    this.stats.dieselLevel = Math.round(this.vehicle.dieselFuel);
    this.stats.rpm = Math.round(this.vehicle.rpm);
    this.stats.diffLockActive = this.vehicle.diffLock;
    this.stats.bladeAngle = this.vehicle.bladeAngleMode;
    this.stats.saltSpreaderActive = this.vehicle.saltActive;
    this.stats.saltRemaining = Math.round(this.vehicle.saltRemaining);
    this.stats.truckHealth = Math.round(this.vehicle.truckHealth);

    if (this.onStatsUpdate) {
      this.onStatsUpdate({ ...this.stats });
    }

    // Check Victory (85% snow cleared together)
    if (this.stats.clearedPercentage >= 85 && !this.isVictoryTriggered) {
      this.isVictoryTriggered = true;
      if (this.stats.playerRank === 1) {
        this.stats.coins += 100;
        this.stats.score += 5000;
      }
      if (this.onVictory) this.onVictory();
    }

    // 11. Render Frame
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
    const startPositions = [
      { x: -12, z: -4, rotY: 0 },
      { x: 12, z: -4, rotY: Math.PI },
      { x: -8, z: 14, rotY: Math.PI / 2 },
      { x: 8, z: 14, rotY: -Math.PI / 2 },
    ];
    this.aiCars.forEach((ai, idx) => {
      const p = startPositions[idx];
      ai.position.set(p.x, 0, p.z);
      ai.rotationY = p.rotY;
      ai.speed = 0;
      ai.clearedM2 = 0;
      ai.score = 0;
      ai.group.position.copy(ai.position);
      ai.group.rotation.y = ai.rotationY;
      ai.updateNameplate(idx + 2);
    });
  }

  public applyUpgrades(upgrades: Upgrades) {
    this.vehicle.upgrades = upgrades;
    this.vehicle.updateBladeMesh();
    this.vehicle.updatePaintColor(upgrades.paintColor);
  }

  public setBladeAngle(angle: BladeAngle) {
    this.vehicle.setBladeAngle(angle);
    if (this.onFloatingText) {
      const label = angle === 'left' ? '◄ BLADE LEFT' : angle === 'right' ? 'BLADE RIGHT ►' : 'BLADE CENTER';
      this.onFloatingText(label, '#38bdf8', window.innerWidth / 2, window.innerHeight * 0.44);
    }
  }

  public toggleDiffLock(): boolean {
    const active = this.vehicle.toggleDiffLock();
    if (this.onFloatingText) {
      this.onFloatingText(
        active ? '⚙️ DIFF-LOCK: ON (CRAWLER TORQUE)' : '⚙️ DIFF-LOCK: OFF (HIGH GEAR)',
        active ? '#ef4444' : '#94a3b8',
        window.innerWidth / 2,
        window.innerHeight * 0.44
      );
    }
    return active;
  }

  public toggleSalt(): boolean {
    const active = this.vehicle.toggleSalt();
    if (this.onFloatingText) {
      this.onFloatingText(
        active ? '🧂 SALT SPREADER ACTIVE' : '🧂 SALT SPREADER OFF',
        active ? '#38bdf8' : '#94a3b8',
        window.innerWidth / 2,
        window.innerHeight * 0.44
      );
    }
    return active;
  }

  public refuel(amount: number = 40) {
    this.vehicle.refuel(amount);
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
