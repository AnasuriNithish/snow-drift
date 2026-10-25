/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { synthAudio } from '../audio/synthAudio';
import { AlpineEnvironment } from './Environment';
import { SnowField } from './SnowField';

export interface AICarConfig {
  id: string;
  name: string;
  color: string;
  bladeColor: string;
  topSpeed: number;
  bladeWidth: number;
  waypoints: Array<{ x: number; z: number }>;
}

export class AICar {
  public id: string;
  public name: string;
  public color: string;
  public group: THREE.Group;
  public position: THREE.Vector3 = new THREE.Vector3();
  public rotationY: number = 0;
  public speed: number = 0;
  public steeringAngle: number = 0;

  // Race stats
  public clearedM2: number = 0;
  public score: number = 0;
  public currentRank: number = 2;

  // AI Navigation
  private waypoints: THREE.Vector3[];
  private currentWaypointIndex: number = 0;
  private topSpeed: number;
  private bladeWidth: number;

  // Unstuck / Reverse state
  private isReversing: boolean = false;
  private reverseTimer: number = 0;
  private stuckDetectorTimer: number = 0;
  private lastPositionForStuck: THREE.Vector3 = new THREE.Vector3();

  // Mesh components
  private wheels: THREE.Mesh[] = [];
  private beaconMesh!: THREE.Mesh;
  private beaconLight!: THREE.PointLight;
  private cabMesh!: THREE.Mesh;
  private cabSquashTimer: number = 0;

  // Overhead nameplate billboard
  private nameplateMesh!: THREE.Mesh;
  private nameplateCanvas!: HTMLCanvasElement;
  private nameplateCtx!: CanvasRenderingContext2D;
  private nameplateTexture!: THREE.CanvasTexture;

  // Visual Beep Icons
  private beepIcons: Array<{
    mesh: THREE.Mesh;
    life: number;
    maxLife: number;
  }> = [];

  // Honk timer & cooldown
  private honkCooldown: number = 0;

  constructor(cfg: AICarConfig, startPos: { x: number; z: number; rotY?: number }) {
    this.id = cfg.id;
    this.name = cfg.name;
    this.color = cfg.color;
    this.topSpeed = cfg.topSpeed;
    this.bladeWidth = cfg.bladeWidth;
    this.waypoints = cfg.waypoints.map((p) => new THREE.Vector3(p.x, 0, p.z));

    this.group = new THREE.Group();
    this.position.set(startPos.x, 0, startPos.z);
    this.rotationY = startPos.rotY || 0;
    this.lastPositionForStuck.copy(this.position);

    this.buildMesh(cfg);
    this.buildNameplate();

    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;
  }

  // Composite 3-12 part procedural model for AI snowplow
  private buildMesh(cfg: AICarConfig) {
    // 1. CHASSIS (Dark metallic industrial steel)
    const chassisGeo = new THREE.BoxGeometry(1.5, 0.42, 3.0);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.4,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.52;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    this.group.add(chassis);

    // 2. CABIN (Driver's signature vibrant color)
    const cabGeo = new THREE.BoxGeometry(1.4, 1.05, 1.3);
    const cabMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cfg.color),
      metalness: 0.5,
      roughness: 0.3,
    });
    this.cabMesh = new THREE.Mesh(cabGeo, cabMat);
    this.cabMesh.position.set(0, 1.25, -0.25);
    this.cabMesh.castShadow = true;
    this.cabMesh.receiveShadow = true;
    this.group.add(this.cabMesh);

    // Cabin Windshield & Side Windows
    const winGeo = new THREE.PlaneGeometry(1.2, 0.55);
    const winMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.1 });
    const windshield = new THREE.Mesh(winGeo, winMat);
    windshield.position.set(0, 1.35, 0.41);
    this.group.add(windshield);

    // 3. ENGINE HOOD & FRONT GRILLE
    const hoodGeo = new THREE.BoxGeometry(1.3, 0.55, 1.0);
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.4 });
    const hood = new THREE.Mesh(hoodGeo, hoodMat);
    hood.position.set(0, 0.8, 0.75);
    hood.castShadow = true;
    this.group.add(hood);

    // 4. ROOFTOP AMBER BEACON
    const beaconGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.14, 8);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.0,
      roughness: 0.2,
    });
    this.beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    this.beaconMesh.position.set(0, 1.88, -0.25);
    this.group.add(this.beaconMesh);

    this.beaconLight = new THREE.PointLight(0xf59e0b, 1.2, 8, 1.8);
    this.beaconLight.position.set(0, 2.0, -0.25);
    this.group.add(this.beaconLight);

    // 5. RUGGED TREADED WHEELS (4 wheels)
    const tireGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.32, 12);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.8, roughness: 0.3 });

    const wheelPositions = [
      { x: -0.85, y: 0.4, z: 0.85 },
      { x: 0.85, y: 0.4, z: 0.85 },
      { x: -0.85, y: 0.4, z: -0.85 },
      { x: 0.85, y: 0.4, z: -0.85 },
    ];

    wheelPositions.forEach((pos) => {
      const wGroup = new THREE.Group();
      wGroup.position.set(pos.x, pos.y, pos.z);

      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wGroup.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 8), rimMat);
      rim.rotation.z = Math.PI / 2;
      wGroup.add(rim);

      this.group.add(wGroup);
      this.wheels.push(tire);
    });

    // 6. FRONT SNOW PLOW BLADE
    const bladeW = this.bladeWidth;
    const bladeGeo = new THREE.BoxGeometry(bladeW, 0.6, 0.2);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cfg.bladeColor || '#f59e0b'),
      metalness: 0.6,
      roughness: 0.35,
    });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0, 0.38, 1.6);
    blade.rotation.y = 0.12; // angled blade
    blade.castShadow = true;
    blade.receiveShadow = true;
    this.group.add(blade);

    // 7. DUAL HEADLIGHTS
    const hLightL = new THREE.SpotLight(0xfffbeb, 2.5, 18, Math.PI / 5, 0.3);
    hLightL.position.set(-0.45, 0.8, 1.25);
    hLightL.target.position.set(-0.45, 0, 8);
    this.group.add(hLightL);
    this.group.add(hLightL.target);

    const hLightR = new THREE.SpotLight(0xfffbeb, 2.5, 18, Math.PI / 5, 0.3);
    hLightR.position.set(0.45, 0.8, 1.25);
    hLightR.target.position.set(0.45, 0, 8);
    this.group.add(hLightR);
    this.group.add(hLightR.target);

    // Contact shadow
    const shadowGeo = new THREE.PlaneGeometry(2.2, 3.8);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 64;
    shadowCanvas.height = 64;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(32, 32, 5, 32, 32, 30);
    grad.addColorStop(0, 'rgba(10, 15, 25, 0.55)');
    grad.addColorStop(1, 'rgba(10, 15, 25, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 64, 64);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.position.y = 0.02;
    this.group.add(shadow);
  }

  // Overhead floating nameplate & position badge
  private buildNameplate() {
    this.nameplateCanvas = document.createElement('canvas');
    this.nameplateCanvas.width = 256;
    this.nameplateCanvas.height = 64;
    this.nameplateCtx = this.nameplateCanvas.getContext('2d')!;

    this.nameplateTexture = new THREE.CanvasTexture(this.nameplateCanvas);
    this.nameplateTexture.colorSpace = THREE.SRGBColorSpace;

    const geo = new THREE.PlaneGeometry(2.2, 0.55);
    const mat = new THREE.MeshBasicMaterial({
      map: this.nameplateTexture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.nameplateMesh = new THREE.Mesh(geo, mat);
    this.nameplateMesh.position.set(0, 2.65, -0.25);
    this.group.add(this.nameplateMesh);

    this.updateNameplate(2);
  }

  public updateNameplate(rank: number) {
    this.currentRank = rank;
    const ctx = this.nameplateCtx;
    ctx.clearRect(0, 0, 256, 64);

    // Background badge pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(8, 8, 240, 48, 14);
    ctx.fill();

    // Border with car's signature color
    ctx.lineWidth = 3;
    ctx.strokeStyle = this.color;
    ctx.stroke();

    // Rank Circle
    const rankColors: Record<number, string> = {
      1: '#f59e0b', // Gold
      2: '#cbd5e1', // Silver
      3: '#b45309', // Bronze
      4: '#94a3b8',
      5: '#64748b',
    };
    ctx.fillStyle = rankColors[rank] || '#94a3b8';
    ctx.beginPath();
    ctx.arc(36, 32, 16, 0, Math.PI * 2);
    ctx.fill();

    // Rank number
    ctx.font = '800 20px "Outfit", sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${rank}`, 36, 33);

    // Racer Name
    ctx.font = '700 21px "Outfit", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(this.name, 62, 33);

    this.nameplateTexture.needsUpdate = true;
  }

  // Returns the world-space segment for the AI's plow blade
  public getBladeWorldSegment(): { start: THREE.Vector3; end: THREE.Vector3; center: THREE.Vector3 } {
    const forwardOffset = 1.9;
    const cos = Math.cos(this.rotationY);
    const sin = Math.sin(this.rotationY);

    const cx = this.position.x + sin * forwardOffset;
    const cz = this.position.z + cos * forwardOffset;

    const halfW = this.bladeWidth / 2;
    const px = cos * halfW;
    const pz = -sin * halfW;

    return {
      center: new THREE.Vector3(cx, 0, cz),
      start: new THREE.Vector3(cx - px, 0, cz - pz),
      end: new THREE.Vector3(cx + px, 0, cz + pz),
    };
  }

  // Autonomous Driving & AI Physics
  public update(
    dt: number,
    environment: AlpineEnvironment,
    snowField: SnowField,
    playerPos: THREE.Vector3,
    otherAICars: AICar[],
    camera?: THREE.Camera
  ) {
    if (this.honkCooldown > 0) this.honkCooldown -= dt;

    // Check stuck state every 1.5 seconds
    this.stuckDetectorTimer += dt;
    if (this.stuckDetectorTimer > 1.5) {
      this.stuckDetectorTimer = 0;
      const movedDist = this.position.distanceTo(this.lastPositionForStuck);
      if (movedDist < 0.8 && !this.isReversing) {
        // Trigger reverse to dislodge
        this.isReversing = true;
        this.reverseTimer = 1.4;
      }
      this.lastPositionForStuck.copy(this.position);
    }

    // 1. Waypoint Navigation
    const targetWp = this.waypoints[this.currentWaypointIndex];
    const distToWp = this.position.distanceTo(targetWp);

    if (distToWp < 5.0) {
      // Advance to next waypoint
      this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
    }

    // Desired heading
    const dx = targetWp.x - this.position.x;
    const dz = targetWp.z - this.position.z;
    let targetAngle = Math.atan2(dx, dz);

    // 2. Obstacle & Vehicle Avoidance
    const lookAheadDist = 4.5;
    const forwardX = this.position.x + Math.sin(this.rotationY) * lookAheadDist;
    const forwardZ = this.position.z + Math.cos(this.rotationY) * lookAheadDist;
    const forwardPos = new THREE.Vector3(forwardX, 0, forwardZ);

    const obstacleAhead = environment.checkCollision(forwardPos, 2.0);
    const distToPlayer = forwardPos.distanceTo(playerPos);
    let vehicleAhead = distToPlayer < 3.2;

    for (const other of otherAICars) {
      if (other.id !== this.id && forwardPos.distanceTo(other.position) < 3.2) {
        vehicleAhead = true;
        break;
      }
    }

    // Handle reverse maneuvering if blocked
    if (this.isReversing) {
      this.reverseTimer -= dt;
      this.speed = THREE.MathUtils.damp(this.speed, -3.5, 4, dt);
      this.rotationY += 1.8 * dt; // turn while reversing
      if (this.reverseTimer <= 0) {
        this.isReversing = false;
      }
    } else {
      if (obstacleAhead || vehicleAhead) {
        // Steer away
        targetAngle += 1.2;
        this.speed = THREE.MathUtils.damp(this.speed, this.topSpeed * 0.45, 4, dt);

        // If very close to obstacle, initiate reverse
        if (obstacleAhead && this.position.distanceTo(forwardPos) < 2.0) {
          this.isReversing = true;
          this.reverseTimer = 1.2;
        }
      } else {
        // Accelerate smoothly
        this.speed = THREE.MathUtils.damp(this.speed, this.topSpeed, 2.5, dt);
      }

      // Smooth steering towards targetAngle
      let angleDiff = targetAngle - this.rotationY;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      this.steeringAngle = THREE.MathUtils.damp(this.steeringAngle, angleDiff, 4.0, dt);
      this.rotationY += this.steeringAngle * 2.2 * dt;
    }

    // 3. Movement Integration
    const moveDist = this.speed * dt;
    this.position.x += Math.sin(this.rotationY) * moveDist;
    this.position.z += Math.cos(this.rotationY) * moveDist;

    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;

    // 4. Wheels rotation
    this.wheels.forEach((w) => {
      w.rotation.x += (this.speed / 0.4) * dt;
    });

    // 5. Rooftop beacon rotation
    if (this.beaconMesh) {
      this.beaconMesh.rotation.y += dt * 6;
      this.beaconLight.intensity = 1.0 + Math.sin(this.beaconMesh.rotation.y) * 0.6;
    }

    // 6. Nameplate Billboard: faces camera
    if (this.nameplateMesh && camera) {
      const invQuat = this.group.quaternion.clone().invert();
      this.nameplateMesh.quaternion.copy(camera.quaternion).premultiply(invQuat);
    }

    // 7. Real Snow Plowing
    const blade = this.getBladeWorldSegment();
    const { newlyClearedAreaM2 } = snowField.plowSnow(
      blade.start,
      blade.end,
      blade.center,
      this.speed,
      false
    );

    if (newlyClearedAreaM2 > 0) {
      this.clearedM2 += newlyClearedAreaM2;
      this.score += Math.round(newlyClearedAreaM2 * 15);
    }

    // 8. Playful honking when passing near player
    const playerDist = this.position.distanceTo(playerPos);
    if (playerDist < 10.0 && this.honkCooldown <= 0 && Math.random() < 0.02) {
      this.triggerHonk(camera, playerDist);
    }

    // 9. Update honk effects & squashes
    this.updateHonkEffects(dt, camera);
  }

  // Trigger AI honk with visual 'BEEP!' icon and distance-attenuated audio
  public triggerHonk(camera?: THREE.Camera, distToPlayer: number = 5) {
    this.honkCooldown = 4.0 + Math.random() * 3.0; // Don't spam

    // Attenuate sound based on distance
    if (distToPlayer < 24) {
      synthAudio.playHorn();
    }

    // Spawn 3D 'BEEP!' badge
    const badgeGeo = new THREE.PlaneGeometry(2.0, 1.0);
    const badgeMat = new THREE.MeshBasicMaterial({
      map: this.getBeepTexture(),
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const badge = new THREE.Mesh(badgeGeo, badgeMat);
    badge.position.set(0, 3.2, -0.25);
    badge.scale.set(0.1, 0.1, 0.1);
    this.group.add(badge);

    this.beepIcons.push({
      mesh: badge,
      life: 0,
      maxLife: 0.85,
    });

    this.cabSquashTimer = 0.14;
  }

  private getBeepTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Speech bubble with AI car's theme color
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(14, 10, 228, 92, 22);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Pointer
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(116, 102);
    ctx.lineTo(128, 120);
    ctx.lineTo(140, 102);
    ctx.closePath();
    ctx.fill();

    // Horn icon & "BEEP!"
    ctx.font = '900 36px "Outfit", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('BEEP! 📯', 128, 66);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private updateHonkEffects(dt: number, camera?: THREE.Camera) {
    if (this.cabSquashTimer > 0 && this.cabMesh) {
      this.cabSquashTimer -= dt;
      const progress = Math.max(0, this.cabSquashTimer / 0.14);
      this.cabMesh.scale.set(1 + progress * 0.1, 1 - progress * 0.12, 1 + progress * 0.1);
    } else if (this.cabMesh && this.cabMesh.scale.y !== 1) {
      this.cabMesh.scale.set(1, 1, 1);
    }

    for (let i = this.beepIcons.length - 1; i >= 0; i--) {
      const b = this.beepIcons[i];
      b.life += dt;

      if (camera) {
        const invQuat = this.group.quaternion.clone().invert();
        b.mesh.quaternion.copy(camera.quaternion).premultiply(invQuat);
      }

      b.mesh.position.y += dt * 1.4;

      if (b.life < 0.12) {
        const s = 0.1 + (b.life / 0.12) * 1.2;
        b.mesh.scale.set(s, s, s);
      } else {
        b.mesh.scale.set(1, 1, 1);
      }

      const mat = b.mesh.material as THREE.MeshBasicMaterial;
      if (b.life > 0.4) {
        mat.opacity = Math.max(0, 1 - (b.life - 0.4) / (b.maxLife - 0.4));
      }

      if (b.life >= b.maxLife) {
        this.group.remove(b.mesh);
        b.mesh.geometry.dispose();
        mat.dispose();
        this.beepIcons.splice(i, 1);
      }
    }
  }

  public getSpeedKmH(): number {
    return Math.round(Math.abs(this.speed) * 3.6);
  }
}
