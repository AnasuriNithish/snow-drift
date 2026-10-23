/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { TimeOfDay } from '../types/game';

export interface Obstacle {
  box: THREE.Box3;
  type: 'building' | 'fence' | 'lamp' | 'tree';
}

export class AlpineEnvironment {
  public group: THREE.Group;
  public obstacles: Obstacle[] = [];

  // Lighting elements
  public dirLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public streetLights: THREE.PointLight[] = [];
  public windowLights: THREE.PointLight[] = [];

  // Chimney smoke particles
  private smokeParticles: Array<{ mesh: THREE.Mesh; life: number; maxLife: number }> = [];
  private chimneyPositions: THREE.Vector3[] = [];

  // Falling snow particle system
  private fallingSnow: THREE.Points;
  private snowPositions: Float32Array;
  private snowVelocities: Float32Array;

  // Sky / Fog colors per time of day
  public currentTimeOfDay: TimeOfDay = 'day';

  constructor(sceneSize: number = 100) {
    this.group = new THREE.Group();

    // 1. Lighting Setup
    this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x1e293b, 1.2);
    this.group.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffedd5, 2.2);
    this.dirLight.position.set(40, 60, 30);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 160;
    const d = sceneSize * 0.65;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.02;
    this.group.add(this.dirLight);

    // 2. Build Cozy Alpine Village Props
    this.buildChalets();
    this.buildPineForest(sceneSize);
    this.buildStreetLamps();
    this.buildFencesAndObstacles();
    this.buildSnowmen();

    // 3. Falling Snow Particle System (1500 gentle flakes)
    const flakeCount = 1500;
    const flakeGeo = new THREE.BufferGeometry();
    this.snowPositions = new Float32Array(flakeCount * 3);
    this.snowVelocities = new Float32Array(flakeCount * 3);

    for (let i = 0; i < flakeCount; i++) {
      const idx = i * 3;
      this.snowPositions[idx] = (Math.random() - 0.5) * sceneSize * 1.2;
      this.snowPositions[idx + 1] = Math.random() * 25 + 1;
      this.snowPositions[idx + 2] = (Math.random() - 0.5) * sceneSize * 1.2;

      this.snowVelocities[idx] = (Math.random() - 0.5) * 0.8;
      this.snowVelocities[idx + 1] = -1.5 - Math.random() * 2.0;
      this.snowVelocities[idx + 2] = (Math.random() - 0.5) * 0.8;
    }

    flakeGeo.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3));

    // Snowflake texture circle
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 32;
    sCanvas.height = 32;
    const sCtx = sCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(16, 16, 2, 16, 16, 14);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.6, 'rgba(240, 248, 255, 0.6)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 32, 32);
    const sTex = new THREE.CanvasTexture(sCanvas);

    const flakeMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.35,
      map: sTex,
      transparent: true,
      depthWrite: false,
    });
    this.fallingSnow = new THREE.Points(flakeGeo, flakeMat);
    this.group.add(this.fallingSnow);

    this.setTimeOfDay('day');
  }

  // --- 1. ALPINE CHALETS WITH GLOWING WINDOWS & SMOKING CHIMNEYS ---
  private buildChalets() {
    const chaletConfigs = [
      { x: -28, z: -28, rot: 0.2, scale: 1.2, name: 'Chalet West' },
      { x: 26, z: -26, rot: -0.4, scale: 1.1, name: 'Town Hall' },
      { x: -32, z: 22, rot: 1.4, scale: 1.0, name: 'Ski Lodge' },
      { x: 28, z: 28, rot: -1.2, scale: 1.15, name: 'Bakery Chalet' },
      { x: 0, z: -36, rot: 0, scale: 1.3, name: 'Mountain Inn' },
    ];

    chaletConfigs.forEach((cfg) => {
      const houseGroup = new THREE.Group();
      houseGroup.position.set(cfg.x, 0, cfg.z);
      houseGroup.rotation.y = cfg.rot;
      houseGroup.scale.setScalar(cfg.scale);

      // Stone Foundation
      const stoneGeo = new THREE.BoxGeometry(6.2, 0.6, 6.2);
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      stone.position.y = 0.3;
      stone.castShadow = true;
      stone.receiveShadow = true;
      houseGroup.add(stone);

      // Timber Wood Log Cabin Walls
      const wallsGeo = new THREE.BoxGeometry(5.8, 3.2, 5.8);
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
      const walls = new THREE.Mesh(wallsGeo, woodMat);
      walls.position.y = 2.2;
      walls.castShadow = true;
      walls.receiveShadow = true;
      houseGroup.add(walls);

      // Steep Pitched Roof (A-Frame)
      const roofGeo = new THREE.ConeGeometry(5.2, 2.8, 4);
      roofGeo.rotateY(Math.PI / 4);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = 5.2;
      roof.castShadow = true;
      houseGroup.add(roof);

      // Thick Snow Layer on Roof
      const snowRoofGeo = new THREE.ConeGeometry(5.4, 2.85, 4);
      snowRoofGeo.rotateY(Math.PI / 4);
      const snowRoofMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });
      const snowRoof = new THREE.Mesh(snowRoofGeo, snowRoofMat);
      snowRoof.position.y = 5.35;
      snowRoof.castShadow = true;
      houseGroup.add(snowRoof);

      // Glowing Warm Amber Windows
      const winGeo = new THREE.PlaneGeometry(1.0, 1.2);
      const winMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.2,
        roughness: 0.2,
      });

      // Front windows
      const win1 = new THREE.Mesh(winGeo, winMat);
      win1.position.set(-1.4, 2.2, 2.92);
      houseGroup.add(win1);

      const win2 = new THREE.Mesh(winGeo, winMat);
      win2.position.set(1.4, 2.2, 2.92);
      houseGroup.add(win2);

      // Cozy front door
      const doorGeo = new THREE.PlaneGeometry(1.2, 2.0);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x3f1e09, roughness: 0.7 });
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(0, 1.6, 2.92);
      houseGroup.add(door);

      // Stone Chimney with warm smoke puff origin
      const chimGeo = new THREE.BoxGeometry(0.8, 2.6, 0.8);
      const chimMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
      const chimney = new THREE.Mesh(chimGeo, chimMat);
      chimney.position.set(1.6, 5.4, -0.8);
      chimney.castShadow = true;
      houseGroup.add(chimney);

      this.group.add(houseGroup);

      // Record chimney position in world space
      const chimWorld = new THREE.Vector3(1.6, 6.7, -0.8);
      chimWorld.applyMatrix4(houseGroup.matrixWorld);
      this.chimneyPositions.push(chimWorld);

      // Add collision box
      const box = new THREE.Box3();
      box.setFromCenterAndSize(
        new THREE.Vector3(cfg.x, 2.5, cfg.z),
        new THREE.Vector3(7 * cfg.scale, 5, 7 * cfg.scale)
      );
      this.obstacles.push({ box, type: 'building' });
    });
  }

  // --- 2. DENSE PROCEDURAL PINE FOREST BORDER & DRIVEWAY TREES ---
  private buildPineForest(sceneSize: number) {
    // Generate perimeter trees around borders + internal garden clusters
    const treePositions: Array<{ x: number; z: number; scale: number }> = [];

    // Outer border natural barrier
    const half = sceneSize / 2 - 4;
    for (let x = -half; x <= half; x += 4.5) {
      treePositions.push({ x, z: -half, scale: 0.8 + Math.random() * 0.4 });
      treePositions.push({ x, z: half, scale: 0.8 + Math.random() * 0.4 });
    }
    for (let z = -half; z <= half; z += 4.5) {
      treePositions.push({ x: -half, z, scale: 0.8 + Math.random() * 0.4 });
      treePositions.push({ x: half, z, scale: 0.8 + Math.random() * 0.4 });
    }

    // Interior park/chalet clusters
    const clusters = [
      { cx: -15, cz: -18, n: 4 },
      { cx: 16, cz: -15, n: 5 },
      { cx: -18, cz: 10, n: 4 },
      { cx: 18, cz: 12, n: 6 },
    ];
    clusters.forEach((c) => {
      for (let i = 0; i < c.n; i++) {
        treePositions.push({
          x: c.cx + (Math.random() - 0.5) * 8,
          z: c.cz + (Math.random() - 0.5) * 8,
          scale: 0.7 + Math.random() * 0.5,
        });
      }
    });

    // Materials
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const pineMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.7 });
    const snowCapMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.9 });

    treePositions.forEach((pos) => {
      const treeGroup = new THREE.Group();
      treeGroup.position.set(pos.x, 0, pos.z);
      treeGroup.scale.setScalar(pos.scale);

      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, 1.4, 8);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 0.7;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      // 3 Tiers of Pine Cones with Snow Caps
      const tiers = [
        { r: 1.8, h: 2.0, y: 2.2 },
        { r: 1.4, h: 1.8, y: 3.4 },
        { r: 1.0, h: 1.5, y: 4.5 },
      ];

      tiers.forEach((t) => {
        // Green pine needles
        const coneGeo = new THREE.ConeGeometry(t.r, t.h, 7);
        const cone = new THREE.Mesh(coneGeo, pineMat);
        cone.position.y = t.y;
        cone.castShadow = true;
        cone.receiveShadow = true;
        treeGroup.add(cone);

        // Snow layer on top of branch tier
        const snowGeo = new THREE.ConeGeometry(t.r * 1.02, t.h * 0.45, 7);
        const snow = new THREE.Mesh(snowGeo, snowCapMat);
        snow.position.y = t.y + t.h * 0.28;
        snow.castShadow = true;
        treeGroup.add(snow);
      });

      this.group.add(treeGroup);

      // Add tree collision box
      const box = new THREE.Box3();
      box.setFromCenterAndSize(
        new THREE.Vector3(pos.x, 2, pos.z),
        new THREE.Vector3(1.4 * pos.scale, 4, 1.4 * pos.scale)
      );
      this.obstacles.push({ box, type: 'tree' });
    });
  }

  // --- 3. STREET LAMPS WITH WARM POOLS OF AMBER LIGHT ---
  private buildStreetLamps() {
    const lampPositions = [
      { x: -12, z: -4 },
      { x: 12, z: -4 },
      { x: -12, z: 12 },
      { x: 12, z: 12 },
      { x: 0, z: -16 },
      { x: 0, z: 20 },
    ];

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.8,
      roughness: 0.1,
    });

    lampPositions.forEach((pos) => {
      const lampGroup = new THREE.Group();
      lampGroup.position.set(pos.x, 0, pos.z);

      // Pole
      const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 3.8, 8);
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 1.9;
      pole.castShadow = true;
      lampGroup.add(pole);

      // Lantern Hood
      const hoodGeo = new THREE.ConeGeometry(0.35, 0.25, 4);
      const hood = new THREE.Mesh(hoodGeo, poleMat);
      hood.position.y = 3.9;
      lampGroup.add(hood);

      // Lantern Glass Bulb
      const bulbGeo = new THREE.SphereGeometry(0.18, 8, 8);
      const bulb = new THREE.Mesh(bulbGeo, glassMat);
      bulb.position.y = 3.7;
      lampGroup.add(bulb);

      // Amber Point Light pool
      const pLight = new THREE.PointLight(0xf59e0b, 1.8, 14, 1.6);
      pLight.position.set(0, 3.6, 0);
      lampGroup.add(pLight);
      this.streetLights.push(pLight);

      this.group.add(lampGroup);

      // Obstacle collision
      const box = new THREE.Box3();
      box.setFromCenterAndSize(new THREE.Vector3(pos.x, 2, pos.z), new THREE.Vector3(0.5, 4, 0.5));
      this.obstacles.push({ box, type: 'lamp' });
    });
  }

  // --- 4. WOODEN SPLIT-RAIL FENCES ---
  private buildFencesAndObstacles() {
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    const fenceConfigs = [
      { x: -16, z: -20, len: 10, rot: 0 },
      { x: 16, z: -20, len: 10, rot: 0 },
      { x: -20, z: 4, len: 8, rot: Math.PI / 2 },
      { x: 20, z: 4, len: 8, rot: Math.PI / 2 },
    ];

    fenceConfigs.forEach((cfg) => {
      const fGroup = new THREE.Group();
      fGroup.position.set(cfg.x, 0, cfg.z);
      fGroup.rotation.y = cfg.rot;

      // Posts & rails
      for (let i = -cfg.len / 2; i <= cfg.len / 2; i += 2.5) {
        const postGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.1, 6);
        const post = new THREE.Mesh(postGeo, fenceMat);
        post.position.set(i, 0.55, 0);
        post.castShadow = true;
        fGroup.add(post);
      }

      const railGeo = new THREE.BoxGeometry(cfg.len, 0.08, 0.08);
      const rail1 = new THREE.Mesh(railGeo, fenceMat);
      rail1.position.set(0, 0.45, 0);
      fGroup.add(rail1);

      const rail2 = rail1.clone();
      rail2.position.y = 0.85;
      fGroup.add(rail2);

      this.group.add(fGroup);

      const box = new THREE.Box3();
      box.setFromCenterAndSize(
        new THREE.Vector3(cfg.x, 0.6, cfg.z),
        cfg.rot === 0 ? new THREE.Vector3(cfg.len, 1.2, 0.6) : new THREE.Vector3(0.6, 1.2, cfg.len)
      );
      this.obstacles.push({ box, type: 'fence' });
    });
  }

  // --- 5. COZY SNOWMEN ---
  private buildSnowmen() {
    const snowmanPositions = [
      { x: -8, z: -14 },
      { x: 10, z: -12 },
      { x: -6, z: 16 },
    ];

    const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
    const carrotMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.5 });
    const scarfMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });

    snowmanPositions.forEach((pos) => {
      const smGroup = new THREE.Group();
      smGroup.position.set(pos.x, 0, pos.z);

      // Bottom sphere
      const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.7, 12, 12), snowMat);
      b1.position.y = 0.65;
      b1.castShadow = true;
      smGroup.add(b1);

      // Mid sphere
      const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 12), snowMat);
      b2.position.y = 1.6;
      b2.castShadow = true;
      smGroup.add(b2);

      // Scarf
      const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.1, 8, 16), scarfMat);
      scarf.rotation.x = Math.PI / 2;
      scarf.position.y = 1.95;
      smGroup.add(scarf);

      // Head
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 12), snowMat);
      head.position.y = 2.25;
      head.castShadow = true;
      smGroup.add(head);

      // Carrot nose
      const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 6), carrotMat);
      carrot.rotation.x = Math.PI / 2;
      carrot.position.set(0, 2.25, 0.45);
      smGroup.add(carrot);

      // Top hat
      const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 12), hatMat);
      hatBrim.position.y = 2.6;
      smGroup.add(hatBrim);
      const hatTop = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.5, 12), hatMat);
      hatTop.position.y = 2.85;
      smGroup.add(hatTop);

      this.group.add(smGroup);
    });
  }

  // --- TIME OF DAY SWITCH ---
  public setTimeOfDay(time: TimeOfDay) {
    this.currentTimeOfDay = time;
    switch (time) {
      case 'day':
        this.dirLight.intensity = 2.4;
        this.dirLight.color.setHex(0xffedd5);
        this.hemiLight.intensity = 1.2;
        this.hemiLight.color.setHex(0xbae6fd);
        this.streetLights.forEach((l) => (l.intensity = 0.5));
        break;
      case 'dusk':
        this.dirLight.intensity = 1.5;
        this.dirLight.color.setHex(0xf97316); // Amber Sunset
        this.hemiLight.intensity = 0.8;
        this.hemiLight.color.setHex(0x9333ea); // Violet twilight
        this.streetLights.forEach((l) => (l.intensity = 2.4));
        break;
      case 'night':
        this.dirLight.intensity = 0.45;
        this.dirLight.color.setHex(0x60a5fa); // Cool blue moonlight
        this.hemiLight.intensity = 0.3;
        this.hemiLight.color.setHex(0x1e1b4b);
        this.streetLights.forEach((l) => (l.intensity = 3.2));
        break;
      case 'aurora':
        this.dirLight.intensity = 0.6;
        this.dirLight.color.setHex(0x34d399); // Emerald Aurora
        this.hemiLight.intensity = 0.7;
        this.hemiLight.color.setHex(0xa855f7); // Violet sky
        this.streetLights.forEach((l) => (l.intensity = 2.8));
        break;
    }
  }

  // --- ANIMATE FALLING SNOW & CHIMNEY SMOKE ---
  public update(dt: number) {
    // 1. Falling Snow loop
    const count = this.snowPositions.length / 3;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      this.snowPositions[idx] += this.snowVelocities[idx] * dt;
      this.snowPositions[idx + 1] += this.snowVelocities[idx + 1] * dt;
      this.snowPositions[idx + 2] += this.snowVelocities[idx + 2] * dt;

      // Wrap around
      if (this.snowPositions[idx + 1] <= 0.2) {
        this.snowPositions[idx + 1] = 25;
      }
    }
    this.fallingSnow.geometry.attributes.position.needsUpdate = true;

    // 2. Chimney Smoke puffs
    if (this.chimneyPositions.length > 0 && Math.random() < 0.25 && this.smokeParticles.length < 30) {
      const chim = this.chimneyPositions[Math.floor(Math.random() * this.chimneyPositions.length)];
      const smokeGeo = new THREE.SphereGeometry(0.25, 6, 6);
      const smokeMat = new THREE.MeshBasicMaterial({
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.4,
      });
      const mesh = new THREE.Mesh(smokeGeo, smokeMat);
      mesh.position.copy(chim);
      this.group.add(mesh);
      this.smokeParticles.push({ mesh, life: 0, maxLife: 2.5 });
    }

    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const p = this.smokeParticles[i];
      p.life += dt;
      p.mesh.position.y += dt * 0.9;
      p.mesh.position.x += dt * 0.4;
      p.mesh.scale.multiplyScalar(1 + dt * 0.7);
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - p.life / p.maxLife) * 0.4;

      if (p.life >= p.maxLife) {
        this.group.remove(p.mesh);
        p.mesh.geometry.dispose();
        mat.dispose();
        this.smokeParticles.splice(i, 1);
      }
    }
  }

  // Check collision between a vehicle bounding box and environment obstacles
  public checkCollision(pos: THREE.Vector3, radius: number = 1.4): Obstacle | null {
    for (const obs of this.obstacles) {
      // Check if distance from obstacle center is close enough
      const closestPoint = new THREE.Vector3();
      obs.box.clampPoint(pos, closestPoint);
      if (pos.distanceTo(closestPoint) < radius) {
        return obs;
      }
    }
    return null;
  }
}
