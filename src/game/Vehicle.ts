/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { Upgrades } from '../types/game';

// Vehicle Physics & Composite 3D Procedural Model
export class Vehicle {
  public group: THREE.Group;
  public position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public rotationY: number = 0;
  public speed: number = 0;
  public steeringAngle: number = 0;
  public isBraking: boolean = false;
  public isBoosting: boolean = false;
  public boostMeter: number = 100; // 0..100
  public isReversing: boolean = false;

  // Collision bounding box / dimensions
  public length = 3.6;
  public width = 1.8;

  // Upgrades
  public upgrades: Upgrades;

  // Dynamic mesh parts for animation & customization
  private wheels: THREE.Mesh[] = [];
  private bladeGroup!: THREE.Group;
  private bladeMesh!: THREE.Mesh;
  private beaconLight!: THREE.PointLight;
  private beaconMesh!: THREE.Mesh;
  private headlightLeft!: THREE.SpotLight;
  private headlightRight!: THREE.SpotLight;
  private brakeLightMat!: THREE.MeshStandardMaterial;
  private cabMaterial!: THREE.MeshStandardMaterial;
  private cabMesh!: THREE.Mesh;
  private cabSquashTimer: number = 0;
  private exhaustPuffs: Array<{ mesh: THREE.Mesh; life: number; maxLife: number }> = [];
  private exhaustSpawnTimer: number = 0;

  // Visual Beep Icons & Soundwave rings
  private beepIcons: Array<{
    mesh: THREE.Mesh;
    life: number;
    maxLife: number;
    initialY: number;
    offset: THREE.Vector3;
  }> = [];
  private soundwaveRings: Array<{
    mesh: THREE.Mesh;
    life: number;
    maxLife: number;
    initialScale: number;
  }> = [];
  private static cachedBeepTexture: THREE.CanvasTexture | null = null;

  // Heated blade glow mesh
  private heatedElementMesh!: THREE.Mesh;

  constructor(initialUpgrades: Upgrades) {
    this.upgrades = initialUpgrades;
    this.group = new THREE.Group();
    this.buildVehicleMesh();
  }

  // Assembles composite 10-part procedural model adhering to skill directives
  private buildVehicleMesh() {
    // 1. CHASSIS / FRAME (Heavy dark industrial steel)
    const chassisGeo = new THREE.BoxGeometry(1.6, 0.45, 3.2);
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.85,
      roughness: 0.35,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.55;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    this.group.add(chassis);

    // 2. DRIVER'S CABIN (Solid painted body)
    const cabGeo = new THREE.BoxGeometry(1.5, 1.1, 1.4);
    this.cabMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(this.upgrades.paintColor || '#f97316'),
      metalness: 0.4,
      roughness: 0.25,
    });
    this.cabMesh = new THREE.Mesh(cabGeo, this.cabMaterial);
    this.cabMesh.position.set(0, 1.3, -0.3);
    this.cabMesh.castShadow = true;
    this.cabMesh.receiveShadow = true;
    this.group.add(this.cabMesh);

    // Cabin Windows (tinted semi-reflective glass)
    const frontWindshieldGeo = new THREE.PlaneGeometry(1.3, 0.6);
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.1,
    });
    const frontWindshield = new THREE.Mesh(frontWindshieldGeo, windowMat);
    frontWindshield.position.set(0, 1.4, 0.41);
    this.group.add(frontWindshield);

    // Side windows
    const sideWinGeo = new THREE.PlaneGeometry(0.8, 0.45);
    const sideWinL = new THREE.Mesh(sideWinGeo, windowMat);
    sideWinL.rotation.y = Math.PI / 2;
    sideWinL.position.set(-0.76, 1.4, -0.3);
    this.group.add(sideWinL);

    const sideWinR = sideWinL.clone();
    sideWinR.rotation.y = -Math.PI / 2;
    sideWinR.position.x = 0.76;
    this.group.add(sideWinR);

    // 3. ENGINE HOOD (Sloped front compartment)
    const hoodGeo = new THREE.BoxGeometry(1.4, 0.6, 1.1);
    const hoodMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.6,
      roughness: 0.4,
    });
    const hood = new THREE.Mesh(hoodGeo, hoodMat);
    hood.position.set(0, 0.85, 0.85);
    hood.castShadow = true;
    hood.receiveShadow = true;
    this.group.add(hood);

    // Hood Grille
    const grilleGeo = new THREE.PlaneGeometry(0.9, 0.35);
    const grilleMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.9,
      roughness: 0.7,
    });
    const grille = new THREE.Mesh(grilleGeo, grilleMat);
    grille.position.set(0, 0.85, 1.41);
    this.group.add(grille);

    // 4. ROOFTOP ROTATING AMBER BEACON
    const beaconBaseGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.12, 12);
    const beaconBaseMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
    const beaconBase = new THREE.Mesh(beaconBaseGeo, beaconBaseMat);
    beaconBase.position.set(0, 1.9, -0.3);
    this.group.add(beaconBase);

    const beaconGeo = new THREE.CylinderGeometry(0.09, 0.1, 0.16, 12);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9,
      roughness: 0.1,
    });
    this.beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    this.beaconMesh.position.set(0, 2.02, -0.3);
    this.group.add(this.beaconMesh);

    this.beaconLight = new THREE.PointLight(0xf59e0b, 1.8, 12, 1.5);
    this.beaconLight.position.set(0, 2.2, -0.3);
    this.group.add(this.beaconLight);

    // 5. WHEELS & SUSPENSION (4 Rugged Deep-Tread Snow Tires with Chrome Rim Nuts)
    const tireGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.36, 16);
    tireGeo.rotateZ(Math.PI / 2);
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.85,
      metalness: 0.1,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xd4d4d8,
      roughness: 0.25,
      metalness: 0.9,
    });

    const wheelPositions = [
      { x: -0.9, y: 0.44, z: 0.95 },  // Front Left
      { x: 0.9, y: 0.44, z: 0.95 },   // Front Right
      { x: -0.9, y: 0.44, z: -0.95 }, // Rear Left
      { x: 0.9, y: 0.44, z: -0.95 },  // Rear Right
    ];

    this.wheels = [];
    wheelPositions.forEach((pos) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(pos.x, pos.y, pos.z);

      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.castShadow = true;
      wheelGroup.add(tire);

      // Hubcap / Rim
      const rimGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.38, 8);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      wheelGroup.add(rim);

      this.group.add(wheelGroup);
      this.wheels.push(tire);
    });

    // 6. FRONT HYDRAULIC MOUNT & HEAVY SNOW-PLOW BLADE
    this.bladeGroup = new THREE.Group();
    this.bladeGroup.position.set(0, 0.4, 1.85);

    // Hydraulic push arms
    const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 8);
    armGeo.rotateX(Math.PI / 2);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const armL = new THREE.Mesh(armGeo, armMat);
    armL.position.set(-0.45, 0.1, -0.3);
    this.bladeGroup.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.45;
    this.bladeGroup.add(armR);

    // Curved Snow-Plow Blade (Curved shape facing forward)
    this.updateBladeMesh();
    this.group.add(this.bladeGroup);

    // 7. DUAL HEADLIGHTS & ROOF FLOOD LIGHTS
    this.headlightLeft = new THREE.SpotLight(0xfffbeb, 4, 25, Math.PI / 5, 0.3, 1.2);
    this.headlightLeft.position.set(-0.55, 0.85, 1.4);
    this.headlightLeft.target.position.set(-0.55, 0, 10);
    this.group.add(this.headlightLeft);
    this.group.add(this.headlightLeft.target);

    this.headlightRight = new THREE.SpotLight(0xfffbeb, 4, 25, Math.PI / 5, 0.3, 1.2);
    this.headlightRight.position.set(0.55, 0.85, 1.4);
    this.headlightRight.target.position.set(0.55, 0, 10);
    this.group.add(this.headlightRight);
    this.group.add(this.headlightRight.target);

    // Headlight Lens caps
    const lensGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 12);
    lensGeo.rotateX(Math.PI / 2);
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfffbeb,
      emissiveIntensity: 1.2,
      roughness: 0.1,
    });
    const lensL = new THREE.Mesh(lensGeo, lensMat);
    lensL.position.set(-0.55, 0.85, 1.4);
    this.group.add(lensL);
    const lensR = lensL.clone();
    lensR.position.x = 0.55;
    this.group.add(lensR);

    // 8. REAR BRAKE LIGHTS
    const brakeGeo = new THREE.BoxGeometry(0.24, 0.12, 0.05);
    this.brakeLightMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0x991b1b,
      emissiveIntensity: 0.4,
      roughness: 0.3,
    });
    const brakeL = new THREE.Mesh(brakeGeo, this.brakeLightMat);
    brakeL.position.set(-0.65, 0.65, -1.61);
    this.group.add(brakeL);
    const brakeR = brakeL.clone();
    brakeR.position.x = 0.65;
    this.group.add(brakeR);

    // 9. EXHAUST SMOKESTACK
    const stackGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8);
    const stackMat = new THREE.MeshStandardMaterial({ color: 0x27272a, metalness: 0.9, roughness: 0.3 });
    const stack = new THREE.Mesh(stackGeo, stackMat);
    stack.position.set(0.68, 1.6, -0.9);
    this.group.add(stack);

    // 10. REAR SALT HOPPER & SPREADER
    const hopperGeo = new THREE.ConeGeometry(0.5, 0.6, 4);
    hopperGeo.rotateX(Math.PI);
    const hopperMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.4 });
    const hopper = new THREE.Mesh(hopperGeo, hopperMat);
    hopper.position.set(0, 0.7, -1.4);
    this.group.add(hopper);

    // Ground Contact Shadow Disc (Directly grounds the vehicle without Z-fighting)
    const shadowGeo = new THREE.PlaneGeometry(2.4, 4.2);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d')!;
    const grad = sCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, 'rgba(10, 15, 25, 0.65)');
    grad.addColorStop(0.7, 'rgba(10, 15, 25, 0.25)');
    grad.addColorStop(1, 'rgba(10, 15, 25, 0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.position.y = 0.02;
    this.group.add(shadowMesh);
  }

  // Updates plow blade geometry when upgraded (widens and angles)
  public updateBladeMesh() {
    if (this.bladeMesh) {
      this.bladeGroup.remove(this.bladeMesh);
      if (this.bladeMesh.geometry) this.bladeMesh.geometry.dispose();
    }
    if (this.heatedElementMesh) {
      this.bladeGroup.remove(this.heatedElementMesh);
      if (this.heatedElementMesh.geometry) this.heatedElementMesh.geometry.dispose();
    }

    // Blade width scaled by upgrade level (Level 1: 2.2m -> Level 5: 3.6m)
    const bladeW = 2.0 + this.upgrades.bladeWidth * 0.35;
    const bladeH = 0.65;
    const bladeD = 0.25;

    // Curved front snow-plow shape
    const shape = new THREE.Shape();
    shape.moveTo(-bladeW / 2, 0);
    shape.lineTo(bladeW / 2, 0);
    shape.lineTo(bladeW / 2, bladeH);
    shape.lineTo(-bladeW / 2, bladeH);
    shape.closePath();

    const extrudeSettings = {
      depth: bladeD,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    };

    const bladeGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    bladeGeo.center();

    // Procedural hazard stripes canvas texture
    const hazardCanvas = document.createElement('canvas');
    hazardCanvas.width = 256;
    hazardCanvas.height = 64;
    const hCtx = hazardCanvas.getContext('2d')!;
    hCtx.fillStyle = '#f59e0b'; // Amber yellow
    hCtx.fillRect(0, 0, 256, 64);
    hCtx.fillStyle = '#1e293b'; // Slate dark stripes
    for (let i = -64; i < 320; i += 32) {
      hCtx.beginPath();
      hCtx.moveTo(i, 0);
      hCtx.lineTo(i + 24, 0);
      hCtx.lineTo(i - 8, 64);
      hCtx.lineTo(i - 32, 64);
      hCtx.closePath();
      hCtx.fill();
    }
    const hazardTex = new THREE.CanvasTexture(hazardCanvas);
    hazardTex.colorSpace = THREE.SRGBColorSpace;

    const bladeMat = new THREE.MeshStandardMaterial({
      map: hazardTex,
      metalness: 0.7,
      roughness: 0.3,
    });

    this.bladeMesh = new THREE.Mesh(bladeGeo, bladeMat);
    this.bladeMesh.rotation.y = 0.12; // Slight plow clearing angle to right
    this.bladeMesh.castShadow = true;
    this.bladeMesh.receiveShadow = true;
    this.bladeGroup.add(this.bladeMesh);

    // Heated Blade glow element if upgrade >= 2
    if (this.upgrades.heatedBlade >= 2) {
      const heatGeo = new THREE.BoxGeometry(bladeW * 0.95, 0.08, 0.08);
      const heatMat = new THREE.MeshStandardMaterial({
        color: 0xff3b00,
        emissive: 0xff4500,
        emissiveIntensity: 1.5 * (this.upgrades.heatedBlade / 4),
        roughness: 0.2,
      });
      this.heatedElementMesh = new THREE.Mesh(heatGeo, heatMat);
      this.heatedElementMesh.position.set(0, -bladeH / 2 + 0.05, 0.16);
      this.bladeGroup.add(this.heatedElementMesh);
    }
  }

  public updatePaintColor(color: string) {
    this.upgrades.paintColor = color;
    if (this.cabMaterial) {
      this.cabMaterial.color.set(color);
    }
  }

  // Gets the world-space bounding points for the plow blade (to calculate snow clearing)
  public getBladeWorldSegment(): { start: THREE.Vector3; end: THREE.Vector3; center: THREE.Vector3; width: number } {
    const bladeW = 2.0 + this.upgrades.bladeWidth * 0.35;
    const forwardOffset = 2.1;

    const cos = Math.cos(this.rotationY);
    const sin = Math.sin(this.rotationY);

    const cx = this.position.x + sin * forwardOffset;
    const cz = this.position.z + cos * forwardOffset;

    // Perpendicular vector
    const halfW = bladeW / 2;
    const px = cos * halfW;
    const pz = -sin * halfW;

    return {
      center: new THREE.Vector3(cx, 0, cz),
      start: new THREE.Vector3(cx - px, 0, cz - pz),
      end: new THREE.Vector3(cx + px, 0, cz + pz),
      width: bladeW,
    };
  }

  // Physics and kinematic update
  public update(
    dt: number,
    inputs: { forward: boolean; backward: boolean; left: boolean; right: boolean; boost: boolean },
    onIcePatch: boolean = false,
    camera?: THREE.Camera
  ) {
    // 1. Acceleration and speed calculations
    const maxSpeed = (8 + this.upgrades.enginePower * 2.2) * (this.isBoosting ? 1.65 : 1.0);
    const reverseMaxSpeed = -4.5;
    const accelRate = (12 + this.upgrades.enginePower * 3.5) * (this.isBoosting ? 1.8 : 1.0);
    const friction = onIcePatch ? 0.985 : 0.92;

    this.isBraking = false;
    this.isReversing = false;

    // Handle Boost Meter
    if (inputs.boost && this.boostMeter > 5) {
      this.isBoosting = true;
      this.boostMeter = Math.max(0, this.boostMeter - dt * (32 / (1 + this.upgrades.boostCapacity * 0.3)));
    } else {
      this.isBoosting = false;
      this.boostMeter = Math.min(100, this.boostMeter + dt * (14 + this.upgrades.boostCapacity * 4));
    }

    if (inputs.forward) {
      this.speed += accelRate * dt;
      if (this.speed > maxSpeed) this.speed = maxSpeed;
    } else if (inputs.backward) {
      if (this.speed > 0.5) {
        this.speed -= accelRate * 1.5 * dt;
        this.isBraking = true;
      } else {
        this.speed -= accelRate * 0.7 * dt;
        this.isReversing = true;
        if (this.speed < reverseMaxSpeed) this.speed = reverseMaxSpeed;
      }
    } else {
      // Natural roll down
      this.speed *= Math.pow(friction, dt * 60);
      if (Math.abs(this.speed) < 0.05) this.speed = 0;
    }

    // 2. Steering & Turning
    const targetSteer = (inputs.left ? 1 : 0) - (inputs.right ? 1 : 0);
    const steerSpeed = onIcePatch ? 2.5 : 5.0;
    this.steeringAngle = THREE.MathUtils.damp(this.steeringAngle, targetSteer * 0.55, steerSpeed, dt);

    if (Math.abs(this.speed) > 0.05) {
      const turnFactor = (this.speed / maxSpeed) * (this.speed < 0 ? -1 : 1);
      this.rotationY += this.steeringAngle * turnFactor * (onIcePatch ? 1.8 : 2.4) * dt;
    }

    // 3. Movement integration
    const moveDist = this.speed * dt;
    this.position.x += Math.sin(this.rotationY) * moveDist;
    this.position.z += Math.cos(this.rotationY) * moveDist;

    // Sync group position and rotation
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;

    // 4. Wheels rotation and steering
    this.wheels.forEach((wheel, idx) => {
      wheel.rotation.x += (this.speed / 0.44) * dt;
      // Front wheels turn with steering
      if (idx < 2) {
        wheel.parent!.rotation.y = this.steeringAngle;
      }
    });

    // 5. Rooftop Beacon rotation & lighting
    if (this.beaconMesh) {
      this.beaconMesh.rotation.y += dt * 8;
      // Subtle pulse on beacon light
      this.beaconLight.intensity = 1.4 + Math.sin(this.beaconMesh.rotation.y) * 0.8;
    }

    // 6. Brake lights visual feedback
    if (this.brakeLightMat) {
      const isLit = this.isBraking || this.isReversing;
      this.brakeLightMat.emissiveIntensity = isLit ? 1.8 : 0.35;
      this.brakeLightMat.color.setHex(isLit ? 0xef4444 : 0x7f1d1d);
    }

    // 7. Exhaust smoke puffs
    this.updateExhaust(dt);

    // 8. Visual Beep & Honk Animations
    this.updateHonkEffects(dt, camera);
  }

  // Generate procedural retro 'beep' icon badge texture
  public static getBeepTexture(): THREE.CanvasTexture {
    if (Vehicle.cachedBeepTexture) return Vehicle.cachedBeepTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Soft drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // Rounded speech badge container
    ctx.fillStyle = '#f59e0b'; // Amber yellow
    ctx.beginPath();
    ctx.roundRect(14, 10, 228, 92, 22);
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Crisp white border
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Bottom pointer notch
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(116, 102);
    ctx.lineTo(128, 120);
    ctx.lineTo(140, 102);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    // Horn / Megaphone icon graphic
    ctx.fillStyle = '#0f172a'; // Deep slate
    ctx.beginPath();
    ctx.moveTo(40, 56);
    ctx.lineTo(62, 40);
    ctx.lineTo(62, 72);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(32, 48, 10, 16);

    // Radiating soundwave arcs
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(64, 56, 10, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(64, 56, 18, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();

    // Bold retro "BEEP!" text
    ctx.font = '900 36px "Outfit", system-ui, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('BEEP!', 96, 68);

    // Tiny accent musical notes
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('♫', 204, 46);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    Vehicle.cachedBeepTexture = tex;
    return tex;
  }

  // Triggers the visual 'beep' icon above the snowplow with squash-and-stretch
  public triggerHonk(camera?: THREE.Camera) {
    const tex = Vehicle.getBeepTexture();
    const badgeGeo = new THREE.PlaneGeometry(2.4, 1.2);
    const badgeMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);

    // Spawn above vehicle roof beacon
    badgeMesh.position.set(0, 3.0, -0.3);
    badgeMesh.scale.set(0.1, 0.1, 0.1);
    if (camera) {
      badgeMesh.quaternion.copy(camera.quaternion);
    }
    this.group.add(badgeMesh);

    this.beepIcons.push({
      mesh: badgeMesh,
      life: 0,
      maxLife: 0.95,
      initialY: 3.0,
      offset: new THREE.Vector3(0, 3.0, -0.3),
    });

    // Expanding 3D Soundwave ring around roof beacon
    const ringGeo = new THREE.RingGeometry(0.3, 0.42, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0, 2.05, -0.3);
    this.group.add(ringMesh);

    this.soundwaveRings.push({
      mesh: ringMesh,
      life: 0,
      maxLife: 0.45,
      initialScale: 1.0,
    });

    // Vehicle cab squash feedback
    this.cabSquashTimer = 0.14;
  }

  private updateHonkEffects(dt: number, camera?: THREE.Camera) {
    // 1. Cab squash-and-stretch animation
    if (this.cabSquashTimer > 0 && this.cabMesh) {
      this.cabSquashTimer -= dt;
      const progress = Math.max(0, this.cabSquashTimer / 0.14);
      // Squash Y, bulge X and Z
      this.cabMesh.scale.set(1 + progress * 0.12, 1 - progress * 0.14, 1 + progress * 0.12);
    } else if (this.cabMesh && (this.cabMesh.scale.y !== 1 || this.cabMesh.scale.x !== 1)) {
      this.cabMesh.scale.set(1, 1, 1);
    }

    // 2. Animate visual 'beep' icons
    for (let i = this.beepIcons.length - 1; i >= 0; i--) {
      const b = this.beepIcons[i];
      b.life += dt;

      // Always billboard directly facing active camera
      if (camera) {
        // Transform camera rotation into local vehicle coordinates
        const invQuat = this.group.quaternion.clone().invert();
        b.mesh.quaternion.copy(camera.quaternion).premultiply(invQuat);
      }

      // Float upward
      b.mesh.position.y += dt * 1.5;

      // Pop and scale curve
      const p = b.life / b.maxLife;
      if (b.life < 0.12) {
        // Quick energetic pop-in (0.1 to 1.35)
        const popScale = 0.1 + (b.life / 0.12) * 1.25;
        b.mesh.scale.set(popScale, popScale, popScale);
      } else if (b.life < 0.22) {
        // Settle down to 1.0
        const settle = 1.35 - ((b.life - 0.12) / 0.1) * 0.35;
        b.mesh.scale.set(settle, settle, settle);
      } else {
        b.mesh.scale.set(1.0, 1.0, 1.0);
      }

      // Fade out opacity
      const mat = b.mesh.material as THREE.MeshBasicMaterial;
      if (b.life > 0.4) {
        const fade = 1 - (b.life - 0.4) / (b.maxLife - 0.4);
        mat.opacity = Math.max(0, fade);
      }

      if (b.life >= b.maxLife) {
        this.group.remove(b.mesh);
        b.mesh.geometry.dispose();
        mat.dispose();
        this.beepIcons.splice(i, 1);
      }
    }

    // 3. Animate expanding 3D soundwave rings
    for (let i = this.soundwaveRings.length - 1; i >= 0; i--) {
      const ring = this.soundwaveRings[i];
      ring.life += dt;
      const progress = ring.life / ring.maxLife;

      // Expand outward rapidly
      const scale = 1.0 + progress * 4.5;
      ring.mesh.scale.set(scale, 1, scale);

      const rMat = ring.mesh.material as THREE.MeshBasicMaterial;
      rMat.opacity = Math.max(0, (1 - progress) * 0.85);

      if (ring.life >= ring.maxLife) {
        this.group.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        rMat.dispose();
        this.soundwaveRings.splice(i, 1);
      }
    }
  }

  private updateExhaust(dt: number) {
    this.exhaustSpawnTimer += dt;
    const spawnInterval = this.isBoosting ? 0.04 : 0.12;

    if (this.exhaustSpawnTimer >= spawnInterval && this.exhaustPuffs.length < 24) {
      this.exhaustSpawnTimer = 0;
      const puffGeo = new THREE.SphereGeometry(this.isBoosting ? 0.12 : 0.08, 6, 6);
      const puffMat = new THREE.MeshBasicMaterial({
        color: this.isBoosting ? 0x60a5fa : 0xd1d5db,
        transparent: true,
        opacity: 0.6,
      });
      const puff = new THREE.Mesh(puffGeo, puffMat);

      // Spawn at stack position in world coords
      const stackLocal = new THREE.Vector3(0.68, 2.1, -0.9);
      stackLocal.applyMatrix4(this.group.matrixWorld);
      puff.position.copy(stackLocal);

      this.group.parent?.add(puff);
      this.exhaustPuffs.push({
        mesh: puff,
        life: 0,
        maxLife: this.isBoosting ? 0.4 : 0.7,
      });
    }

    // Update existing puffs
    for (let i = this.exhaustPuffs.length - 1; i >= 0; i--) {
      const p = this.exhaustPuffs[i];
      p.life += dt;
      p.mesh.position.y += dt * 0.8;
      p.mesh.scale.multiplyScalar(1 + dt * 1.5);
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - p.life / p.maxLife) * 0.5;

      if (p.life >= p.maxLife) {
        this.group.parent?.remove(p.mesh);
        p.mesh.geometry.dispose();
        mat.dispose();
        this.exhaustPuffs.splice(i, 1);
      }
    }
  }

  public resetPosition(x: number, z: number, rotationY: number = 0) {
    this.position.set(x, 0, z);
    this.rotationY = rotationY;
    this.speed = 0;
    this.steeringAngle = 0;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;
  }
}
