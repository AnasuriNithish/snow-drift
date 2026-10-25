/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { synthAudio } from '../audio/synthAudio';

export interface HiddenItem {
  id: string;
  type: 'cocoa' | 'gift' | 'snowflake' | 'coin' | 'fuel' | 'salt';
  position: THREE.Vector3;
  mesh: THREE.Group;
  clearedRatio: number;
  isCollected: boolean;
  bounceTime: number;
}

export interface SnowboundCar {
  id: string;
  position: THREE.Vector3;
  rotationY: number;
  mesh: THREE.Group;
  snowMoundMesh: THREE.Mesh;
  isFreed: boolean;
  freedTime: number;
  hazardsLit: boolean;
}

export class SnowField {
  public group: THREE.Group;
  public size: number; // e.g. 100 meters
  private resolution: number = 512; // Snow mask canvas resolution

  // Snow Canvas & Texture
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private snowTexture: THREE.CanvasTexture;
  private snowMesh: THREE.Mesh;
  private roadMesh: THREE.Mesh;

  // Snow pixel tracking for accurate percentage
  private totalSnowPixels: number = 0;
  private clearedSnowPixels: number = 0;
  private sampleStep: number = 8;
  private pixelStatusGrid: Uint8Array; // 0 = uncleared, 1 = cleared

  // Pooled Snow Spray Particles
  private sprayParticles: Array<{
    mesh: THREE.Mesh;
    vel: THREE.Vector3;
    life: number;
    maxLife: number;
  }> = [];

  // Hidden Collectibles & Stuck Cars
  public hiddenItems: HiddenItem[] = [];
  public snowboundCars: SnowboundCar[] = [];

  // Deep snow mounds
  public snowDrifts: Array<{ mesh: THREE.Mesh; radius: number; hp: number }> = [];

  constructor(size: number = 100) {
    this.size = size;
    this.group = new THREE.Group();

    // 1. Create Road / Asphalt Ground Mesh
    const roadGeo = new THREE.PlaneGeometry(size, size);
    roadGeo.rotateX(-Math.PI / 2);

    // Procedural asphalt texture with painted road markings
    const roadCanvas = document.createElement('canvas');
    roadCanvas.width = 512;
    roadCanvas.height = 512;
    const rCtx = roadCanvas.getContext('2d')!;

    // Dark slate asphalt
    rCtx.fillStyle = '#1e2530';
    rCtx.fillRect(0, 0, 512, 512);

    // Subtle stone pebble noise
    for (let i = 0; i < 4000; i++) {
      const nx = Math.random() * 512;
      const ny = Math.random() * 512;
      const gray = Math.floor(40 + Math.random() * 25);
      rCtx.fillStyle = `rgb(${gray}, ${gray + 4}, ${gray + 10})`;
      rCtx.fillRect(nx, ny, 2, 2);
    }

    // Painted yellow road center dashed lines and white crosswalks
    rCtx.strokeStyle = '#f59e0b';
    rCtx.lineWidth = 4;
    rCtx.setLineDash([24, 18]);
    rCtx.beginPath();
    rCtx.moveTo(256, 30);
    rCtx.lineTo(256, 482);
    rCtx.stroke();

    rCtx.beginPath();
    rCtx.moveTo(30, 256);
    rCtx.lineTo(482, 256);
    rCtx.stroke();

    const roadTex = new THREE.CanvasTexture(roadCanvas);
    roadTex.colorSpace = THREE.SRGBColorSpace;
    roadTex.wrapS = THREE.RepeatWrapping;
    roadTex.wrapT = THREE.RepeatWrapping;
    roadTex.repeat.set(4, 4);

    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.6,
      metalness: 0.15,
    });
    this.roadMesh = new THREE.Mesh(roadGeo, roadMat);
    this.roadMesh.receiveShadow = true;
    this.group.add(this.roadMesh);

    // 2. Create Snow Canvas & Texture Mask
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.resolution;
    this.canvas.height = this.resolution;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;

    // Fill with pristine fluffy white snow
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.resolution, this.resolution);

    // Add subtle procedural sparkle noise in snow
    for (let i = 0; i < 6000; i++) {
      const sx = Math.random() * this.resolution;
      const sy = Math.random() * this.resolution;
      this.ctx.fillStyle = Math.random() > 0.5 ? '#f8fafc' : '#e2e8f0';
      this.ctx.fillRect(sx, sy, 2, 2);
    }

    this.snowTexture = new THREE.CanvasTexture(this.canvas);
    this.snowTexture.colorSpace = THREE.SRGBColorSpace;

    // Snow plane placed precisely 0.04m above road so tires / blade cleanly erase
    const snowGeo = new THREE.PlaneGeometry(size, size, 64, 64);
    snowGeo.rotateX(-Math.PI / 2);

    const snowMat = new THREE.MeshStandardMaterial({
      map: this.snowTexture,
      transparent: true,
      roughness: 0.85,
      metalness: 0.05,
    });

    this.snowMesh = new THREE.Mesh(snowGeo, snowMat);
    this.snowMesh.position.y = 0.04;
    this.snowMesh.receiveShadow = true;
    this.group.add(this.snowMesh);

    // Initialize grid tracking
    const gridRes = Math.floor(this.resolution / this.sampleStep);
    this.totalSnowPixels = gridRes * gridRes;
    this.pixelStatusGrid = new Uint8Array(this.totalSnowPixels);

    // Populate collectibles and stuck vehicles
    this.spawnCollectibles();
    this.spawnSnowboundCars();
    this.spawnSnowDriftMounds();
  }

  // Converts world position (x, z) to canvas pixel (cx, cy)
  private worldToCanvas(x: number, z: number): { cx: number; cy: number } {
    const u = (x + this.size / 2) / this.size;
    const v = (z + this.size / 2) / this.size;
    return {
      cx: Math.max(0, Math.min(this.resolution - 1, u * this.resolution)),
      cy: Math.max(0, Math.min(this.resolution - 1, v * this.resolution)),
    };
  }

  // Plow snow along the segment defined by the plow blade
  public plowSnow(
    bladeStart: THREE.Vector3,
    bladeEnd: THREE.Vector3,
    bladeCenter: THREE.Vector3,
    speed: number,
    isHeated: boolean
  ): { newlyClearedAreaM2: number; sprayLocation: THREE.Vector3 } {
    if (Math.abs(speed) < 0.2) {
      return { newlyClearedAreaM2: 0, sprayLocation: bladeCenter };
    }

    const p1 = this.worldToCanvas(bladeStart.x, bladeStart.z);
    const p2 = this.worldToCanvas(bladeEnd.x, bladeEnd.z);

    // Thickness in canvas pixels proportional to speed and blade depth
    const strokeWidth = (2.2 / this.size) * this.resolution;

    // Erase snow in the canvas
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.strokeStyle = 'rgba(0,0,0,1)';
    this.ctx.lineWidth = strokeWidth * (isHeated ? 1.25 : 1.0);
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(p1.cx, p1.cy);
    this.ctx.lineTo(p2.cx, p2.cy);
    this.ctx.stroke();

    // Tire tracks behind the plow
    this.ctx.restore();

    this.snowTexture.needsUpdate = true;

    // Sample newly cleared cells around blade center to calculate combo/score
    const sample = this.worldToCanvas(bladeCenter.x, bladeCenter.z);
    const gridRes = Math.floor(this.resolution / this.sampleStep);
    const gx = Math.floor(sample.cx / this.sampleStep);
    const gy = Math.floor(sample.cy / this.sampleStep);

    let newlyClearedCount = 0;
    const radius = 2;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = gx + dx;
        const ny = gy + dy;
        if (nx >= 0 && nx < gridRes && ny >= 0 && ny < gridRes) {
          const idx = ny * gridRes + nx;
          if (this.pixelStatusGrid[idx] === 0) {
            this.pixelStatusGrid[idx] = 1;
            this.clearedSnowPixels++;
            newlyClearedCount++;
          }
        }
      }
    }

    // Convert cleared count to square meters
    const m2PerCell = (this.size / gridRes) * (this.size / gridRes);
    const newlyClearedAreaM2 = newlyClearedCount * m2PerCell;

    // Spawn 3D snow spray particles
    if (newlyClearedCount > 0 || Math.abs(speed) > 2) {
      this.spawnSnowSpray(bladeEnd, bladeCenter, speed);
    }

    // Check interaction with snow drifts
    this.checkDriftCollisions(bladeCenter);

    // Check hidden items
    this.checkItemUncovering(bladeCenter);

    // Check stuck cars
    this.checkSnowboundCars(bladeCenter);

    return { newlyClearedAreaM2, sprayLocation: bladeEnd };
  }

  // Spawns bursting snow spray particles arcing from the plow edge
  private spawnSnowSpray(bladeEnd: THREE.Vector3, bladeCenter: THREE.Vector3, speed: number) {
    if (this.sprayParticles.length >= 60) return;

    const count = Math.min(4, Math.floor(Math.abs(speed) * 0.8));
    const dir = new THREE.Vector3().subVectors(bladeEnd, bladeCenter).normalize();

    for (let i = 0; i < count; i++) {
      const sprayGeo = new THREE.DodecahedronGeometry(0.12 + Math.random() * 0.1, 0);
      const sprayMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
      });
      const mesh = new THREE.Mesh(sprayGeo, sprayMat);
      mesh.position.copy(bladeEnd);
      mesh.position.y = 0.3 + Math.random() * 0.2;

      // Arc outward and upward with realistic physics
      const vel = dir.clone().multiplyScalar(2.5 + Math.random() * 3.5);
      vel.y = 2.0 + Math.random() * 2.5;
      vel.x += (Math.random() - 0.5) * 1.5;
      vel.z += (Math.random() - 0.5) * 1.5;

      this.group.add(mesh);
      this.sprayParticles.push({
        mesh,
        vel,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.35,
      });
    }
  }

  // Update animated snow particles and collectibles
  public update(dt: number) {
    // 1. Update snow spray physics
    for (let i = this.sprayParticles.length - 1; i >= 0; i--) {
      const p = this.sprayParticles[i];
      p.life += dt;

      // Gravity & position
      p.vel.y -= 9.8 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 5;
      p.mesh.rotation.y += dt * 4;

      // Ground hit
      if (p.mesh.position.y <= 0.05) {
        p.mesh.position.y = 0.05;
        p.vel.set(0, 0, 0);
      }

      // Fade out
      const mat = p.mesh.material as THREE.MeshStandardMaterial;
      const progress = p.life / p.maxLife;
      p.mesh.scale.setScalar(Math.max(0.01, 1 - progress));

      if (p.life >= p.maxLife) {
        this.group.remove(p.mesh);
        p.mesh.geometry.dispose();
        mat.dispose();
        this.sprayParticles.splice(i, 1);
      }
    }

    // 2. Animate hidden collectibles
    this.hiddenItems.forEach((item) => {
      if (!item.isCollected && item.clearedRatio > 0.6) {
        // Uncovered! Gentle bobbing and spinning
        item.bounceTime += dt;
        item.mesh.position.y = 0.4 + Math.sin(item.bounceTime * 3) * 0.15;
        item.mesh.rotation.y += dt * 2;
      }
    });

    // 3. Animate freed cars hazard lights
    this.snowboundCars.forEach((car) => {
      if (car.isFreed) {
        car.freedTime += dt;
        // Blink hazards every 0.35s
        const blink = Math.floor(car.freedTime * 3) % 2 === 0;
        if (blink !== car.hazardsLit) {
          car.hazardsLit = blink;
          car.mesh.traverse((child) => {
            if ((child as THREE.Mesh).isMesh && child.name === 'hazard') {
              const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
              mat.emissiveIntensity = blink ? 1.8 : 0.1;
            }
          });
        }
      }
    });
  }

  public getClearedPercentage(): number {
    if (this.totalSnowPixels === 0) return 0;
    return Math.min(100, Math.floor((this.clearedSnowPixels / this.totalSnowPixels) * 100));
  }

  // --- SPAWN PROCEDURAL COLLECTIBLES (Cozy & Heavy Diesel Supplies) ---
  private spawnCollectibles() {
    const itemData: Array<{ type: HiddenItem['type']; x: number; z: number }> = [
      { type: 'fuel', x: -18, z: 10 },
      { type: 'fuel', x: 20, z: -16 },
      { type: 'salt', x: 10, z: 22 },
      { type: 'salt', x: -24, z: -18 },
      { type: 'cocoa', x: -12, z: 14 },
      { type: 'cocoa', x: 24, z: -10 },
      { type: 'gift', x: -26, z: -22 },
      { type: 'gift', x: 16, z: 16 },
      { type: 'snowflake', x: 28, z: -6 },
      { type: 'snowflake', x: -20, z: 26 },
    ];

    itemData.forEach((d, idx) => {
      const itemGroup = new THREE.Group();
      itemGroup.position.set(d.x, 0.2, d.z);

      if (d.type === 'fuel') {
        // Heavy 55-gallon steel diesel drum
        const drumGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.85, 12);
        const drumMat = new THREE.MeshStandardMaterial({
          color: 0xdc2626, // Bright industrial red
          metalness: 0.8,
          roughness: 0.3,
        });
        const drum = new THREE.Mesh(drumGeo, drumMat);
        drum.castShadow = true;
        itemGroup.add(drum);

        // Black hazard ribs
        const ribGeo = new THREE.TorusGeometry(0.39, 0.04, 6, 16);
        ribGeo.rotateX(Math.PI / 2);
        const ribMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 });
        const r1 = new THREE.Mesh(ribGeo, ribMat);
        r1.position.y = 0.2;
        itemGroup.add(r1);
        const r2 = r1.clone();
        r2.position.y = -0.2;
        itemGroup.add(r2);
      } else if (d.type === 'salt') {
        // Industrial road salt supply crate
        const crateGeo = new THREE.BoxGeometry(0.75, 0.6, 0.75);
        const crateMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
        const crate = new THREE.Mesh(crateGeo, crateMat);
        crate.castShadow = true;
        itemGroup.add(crate);

        // White salt bag top
        const bagGeo = new THREE.CylinderGeometry(0.3, 0.32, 0.25, 8);
        const bagMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 });
        const bag = new THREE.Mesh(bagGeo, bagMat);
        bag.position.y = 0.38;
        itemGroup.add(bag);
      } else if (d.type === 'cocoa') {
        // Hot cocoa mug
        const mugGeo = new THREE.CylinderGeometry(0.35, 0.3, 0.6, 12);
        const mugMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.2, metalness: 0.1 });
        const mug = new THREE.Mesh(mugGeo, mugMat);
        mug.castShadow = true;
        itemGroup.add(mug);

        const mGeo = new THREE.SphereGeometry(0.25, 8, 8);
        const mMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
        const m = new THREE.Mesh(mGeo, mMat);
        m.position.y = 0.28;
        itemGroup.add(m);
      } else if (d.type === 'gift') {
        // Festive wrapped gift with ribbon
        const boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const boxMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3 });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.castShadow = true;
        itemGroup.add(box);

        const ribGeo = new THREE.BoxGeometry(0.84, 0.84, 0.2);
        const ribMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.6, roughness: 0.2 });
        const rib = new THREE.Mesh(ribGeo, ribMat);
        itemGroup.add(rib);
      } else {
        // Crystalline golden snowflake star
        const starGeo = new THREE.OctahedronGeometry(0.5, 0);
        const starMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.8,
          metalness: 0.8,
          roughness: 0.1,
        });
        const star = new THREE.Mesh(starGeo, starMat);
        star.castShadow = true;
        itemGroup.add(star);
      }

      this.group.add(itemGroup);
      this.hiddenItems.push({
        id: `item-${idx}`,
        type: d.type,
        position: new THREE.Vector3(d.x, 0.2, d.z),
        mesh: itemGroup,
        clearedRatio: 0,
        isCollected: false,
        bounceTime: 0,
      });
    });
  }

  // --- SPAWN SNOWBOUND CARS TO RESCUE ---
  private spawnSnowboundCars() {
    const carData = [
      { x: -14, z: -10, rot: 0.4, color: 0x3b82f6 }, // Blue Sedan
      { x: 12, z: 16, rot: -0.6, color: 0xec4899 },  // Pink Hatchback
      { x: -24, z: 18, rot: 1.57, color: 0x14b8a6 }, // Teal Postal Van
    ];

    carData.forEach((d, idx) => {
      const carGroup = new THREE.Group();
      carGroup.position.set(d.x, 0, d.z);
      carGroup.rotation.y = d.rot;

      // Car body
      const bodyGeo = new THREE.BoxGeometry(1.8, 0.7, 3.4);
      const bodyMat = new THREE.MeshStandardMaterial({ color: d.color, metalness: 0.5, roughness: 0.3 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.65;
      body.castShadow = true;
      carGroup.add(body);

      // Cabin roof
      const roofGeo = new THREE.BoxGeometry(1.6, 0.6, 1.8);
      const roof = new THREE.Mesh(roofGeo, bodyMat);
      roof.position.set(0, 1.25, -0.2);
      roof.castShadow = true;
      carGroup.add(roof);

      // Hazard blinkers
      const hazardGeo = new THREE.SphereGeometry(0.1, 8, 8);
      const hazardMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.2,
      });
      const hL = new THREE.Mesh(hazardGeo, hazardMat);
      hL.name = 'hazard';
      hL.position.set(-0.8, 0.7, 1.7);
      carGroup.add(hL);

      const hR = hL.clone();
      hR.position.x = 0.8;
      carGroup.add(hR);

      // Thick snow blanket on top of car
      const snowBlanketGeo = new THREE.BoxGeometry(1.9, 0.35, 3.5);
      const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
      const snowBlanket = new THREE.Mesh(snowBlanketGeo, snowMat);
      snowBlanket.position.y = 1.6;
      carGroup.add(snowBlanket);

      this.group.add(carGroup);
      this.snowboundCars.push({
        id: `car-${idx}`,
        position: new THREE.Vector3(d.x, 0, d.z),
        rotationY: d.rot,
        mesh: carGroup,
        snowMoundMesh: snowBlanket,
        isFreed: false,
        freedTime: 0,
        hazardsLit: false,
      });
    });
  }

  // --- SPAWN DEEP SNOW DRIFT MOUNDS ---
  private spawnSnowDriftMounds() {
    const driftPositions = [
      { x: -5, z: 8, r: 2.5 },
      { x: 10, z: -6, r: 3.0 },
      { x: -18, z: -14, r: 2.8 },
      { x: 24, z: 8, r: 3.2 },
      { x: 0, z: -22, r: 2.6 },
    ];

    driftPositions.forEach((dp) => {
      const geo = new THREE.CylinderGeometry(dp.r * 0.4, dp.r, 0.9, 12);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.95,
        metalness: 0.05,
      });
      const drift = new THREE.Mesh(geo, mat);
      drift.position.set(dp.x, 0.45, dp.z);
      drift.castShadow = true;
      drift.receiveShadow = true;
      this.group.add(drift);
      this.snowDrifts.push({ mesh: drift, radius: dp.r, hp: 100 });
    });
  }

  private checkDriftCollisions(bladeCenter: THREE.Vector3) {
    this.snowDrifts.forEach((drift, idx) => {
      if (drift.hp > 0) {
        const dist = bladeCenter.distanceTo(drift.mesh.position);
        if (dist < drift.radius + 1.2) {
          drift.hp -= 35;
          drift.mesh.scale.y = Math.max(0.1, drift.hp / 100);
          drift.mesh.scale.x = Math.max(0.2, (drift.hp / 100) * 1.1);
          drift.mesh.scale.z = drift.mesh.scale.x;
          if (drift.hp <= 0) {
            this.group.remove(drift.mesh);
            synthAudio.playItemPickup(true);
            this.snowDrifts.splice(idx, 1);
          }
        }
      }
    });
  }

  private checkItemUncovering(bladeCenter: THREE.Vector3) {
    this.hiddenItems.forEach((item) => {
      if (!item.isCollected) {
        const dist = bladeCenter.distanceTo(item.position);
        if (dist < 2.5) {
          item.clearedRatio = Math.min(1.0, item.clearedRatio + 0.35);
        }
      }
    });
  }

  private checkSnowboundCars(bladeCenter: THREE.Vector3) {
    this.snowboundCars.forEach((car) => {
      if (!car.isFreed) {
        const dist = bladeCenter.distanceTo(car.position);
        if (dist < 3.2) {
          car.isFreed = true;
          // Dissolve car snow blanket
          car.snowMoundMesh.visible = false;
          synthAudio.playCarFreed();
        }
      }
    });
  }

  // Collect item when driver runs over it
  public collectItem(vehiclePos: THREE.Vector3, magnetRange: number): HiddenItem | null {
    for (const item of this.hiddenItems) {
      if (!item.isCollected && item.clearedRatio >= 0.5) {
        const dist = vehiclePos.distanceTo(item.position);
        if (dist < 2.2 + magnetRange * 0.8) {
          item.isCollected = true;
          this.group.remove(item.mesh);
          synthAudio.playItemPickup(item.type === 'snowflake' || item.type === 'gift');
          return item;
        }
      }
    }
    return null;
  }
}
