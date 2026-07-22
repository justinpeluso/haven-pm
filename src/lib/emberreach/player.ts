import * as THREE from "three";
import { ABILITIES, type AbilityId } from "./abilities";
import type { Input } from "./input";
import type { OrbitCamera } from "./camera";
import {
  applySkinTexture,
  billboardToCamera,
  createSkinSprite,
  loadSkinTexture,
  PLAYER_SKIN_URL,
  type SkinSprite,
} from "./skins";
import type { World } from "./world";

export class Player {
  readonly mesh: THREE.Group;
  readonly position = new THREE.Vector3(0, 0, 8);
  velocityY = 0;
  onGround = true;
  health = 100;
  maxHealth = 100;
  focus = 100;
  facing = 0;
  invuln = 0;
  unlockedLevel = 1;
  readonly cooldowns: Record<AbilityId, number> = {
    strike: 0,
    emberbolt: 0,
    dash: 0,
    ward: 0,
    ashstorm: 0,
  };

  private dashTimer = 0;
  private readonly dashVel = new THREE.Vector3();
  private readonly swing = new THREE.Mesh();
  private swingTimer = 0;
  private hitFlash = 0;
  private bob = 0;
  private readonly skin: SkinSprite;
  private readonly scratchColor = new THREE.Color(0xffffff);
  private readonly wardRing: THREE.Mesh;

  private readonly move = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();

  constructor() {
    this.mesh = new THREE.Group();
    this.skin = createSkinSprite(2.35, 0.8);
    this.mesh.add(this.skin.root);

    this.swing.geometry = new THREE.TorusGeometry(1.15, 0.06, 6, 22, Math.PI * 1.1);
    this.swing.material = new THREE.MeshBasicMaterial({
      color: 0xffd27a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.swing.position.set(0, 1.25, 0.35);
    this.swing.rotation.x = Math.PI / 2;
    this.mesh.add(this.swing);

    this.wardRing = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 2.4, 32),
      new THREE.MeshBasicMaterial({
        color: 0x7ec8ff,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.wardRing.rotation.x = -Math.PI / 2;
    this.wardRing.position.y = 0.1;
    this.mesh.add(this.wardRing);

    void loadSkinTexture(PLAYER_SKIN_URL).then((tex) => {
      applySkinTexture(this.skin, tex, 0.8);
    });
  }

  isUnlocked(id: AbilityId): boolean {
    const def = ABILITIES.find((a) => a.id === id)!;
    return this.unlockedLevel >= def.unlockLevel;
  }

  cooldownRatio(id: AbilityId): number {
    const def = ABILITIES.find((a) => a.id === id)!;
    if (def.cooldown <= 0) return 0;
    return Math.min(1, this.cooldowns[id] / def.cooldown);
  }

  setUnlockedForLevel(level: number): void {
    this.unlockedLevel = level;
  }

  faceCamera(camera: THREE.Camera): void {
    billboardToCamera(this.skin.root, camera);
  }

  update(dt: number, input: Input, camera: OrbitCamera, world: World): void {
    for (const id of Object.keys(this.cooldowns) as AbilityId[]) {
      this.cooldowns[id] = Math.max(0, this.cooldowns[id] - dt);
    }
    this.invuln = Math.max(0, this.invuln - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.focus = Math.min(100, this.focus + dt * 10);

    const flash =
      this.hitFlash > 0 ||
      (this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0);
    this.skin.material.emissive.setHex(flash ? 0xff4444 : 0x000000);
    this.skin.material.emissiveIntensity = flash ? 0.65 : 0;
    this.skin.material.color.copy(
      this.scratchColor.setHex(flash ? 0xffcccc : 0xffffff),
    );

    if (this.swingTimer > 0) {
      this.swingTimer -= dt;
      const mat = this.swing.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, this.swingTimer * 2.5);
      this.swing.rotation.z += dt * 14;
    }

    const wardMat = this.wardRing.material as THREE.MeshBasicMaterial;
    if (wardMat.opacity > 0) {
      wardMat.opacity = Math.max(0, wardMat.opacity - dt * 1.8);
      this.wardRing.scale.addScalar(dt * 1.4);
    }

    this.move.set(0, 0, 0);
    camera.forwardFlat(this.forward);
    camera.rightFlat(this.right);

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.position.addScaledVector(this.dashVel, dt);
    } else {
      if (input.keys.has("KeyW")) this.move.add(this.forward);
      if (input.keys.has("KeyS")) this.move.sub(this.forward);
      if (input.keys.has("KeyD")) this.move.add(this.right);
      if (input.keys.has("KeyA")) this.move.sub(this.right);

      const moving = this.move.lengthSq() > 0;
      const speed = input.keys.has("ShiftLeft") ? 9.5 : 6.2;
      if (moving) {
        this.move.normalize().multiplyScalar(speed * dt);
        this.position.add(this.move);
        this.facing = Math.atan2(this.move.x, this.move.z);
        this.bob += dt * 10;
      } else {
        this.bob += dt * 2.2;
      }
    }

    if (input.consumeJump() && this.onGround && this.dashTimer <= 0) {
      this.velocityY = 7.5;
      this.onGround = false;
    }

    this.velocityY -= 18 * dt;
    this.position.y += this.velocityY * dt;
    const ground = world.heightAt(this.position.x, this.position.z);
    if (this.position.y <= ground) {
      this.position.y = ground;
      this.velocityY = 0;
      this.onGround = true;
    }

    this.position.x = THREE.MathUtils.clamp(this.position.x, -85, 85);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -85, 85);

    this.mesh.position.copy(this.position);
    const bobY = this.onGround ? Math.sin(this.bob) * 0.04 : 0;
    this.skin.root.position.y = bobY;
    this.faceCamera(camera.camera);
  }

  private canCast(id: AbilityId): boolean {
    const def = ABILITIES.find((a) => a.id === id)!;
    if (!this.isUnlocked(id)) return false;
    if (this.cooldowns[id] > 0) return false;
    if (this.focus < def.focusCost) return false;
    return true;
  }

  private spend(id: AbilityId): void {
    const def = ABILITIES.find((a) => a.id === id)!;
    this.focus -= def.focusCost;
    this.cooldowns[id] = def.cooldown;
  }

  tryStrike(): boolean {
    if (!this.canCast("strike")) return false;
    this.spend("strike");
    this.swingTimer = 0.28;
    this.swing.rotation.z = 0;
    return true;
  }

  tryEmberbolt(): THREE.Vector3 | null {
    if (!this.canCast("emberbolt")) return null;
    this.spend("emberbolt");
    return new THREE.Vector3(
      Math.sin(this.facing),
      0.05,
      Math.cos(this.facing),
    ).normalize();
  }

  tryDash(): boolean {
    if (!this.canCast("dash") || this.dashTimer > 0) return false;
    this.spend("dash");
    this.dashTimer = 0.22;
    this.dashVel.set(Math.sin(this.facing), 0, Math.cos(this.facing)).multiplyScalar(28);
    this.invuln = Math.max(this.invuln, 0.35);
    return true;
  }

  tryWard(): boolean {
    if (!this.canCast("ward")) return false;
    this.spend("ward");
    this.health = Math.min(this.maxHealth, this.health + 28);
    this.invuln = Math.max(this.invuln, 0.7);
    this.wardRing.scale.setScalar(1);
    const mat = this.wardRing.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.75;
    return true;
  }

  tryAshstorm(): THREE.Vector3[] | null {
    if (!this.canCast("ashstorm")) return null;
    this.spend("ashstorm");
    const base = this.facing;
    return [-0.28, 0, 0.28].map((offset) =>
      new THREE.Vector3(
        Math.sin(base + offset),
        0.05,
        Math.cos(base + offset),
      ).normalize(),
    );
  }

  hurt(amount: number): void {
    if (this.invuln > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.invuln = 0.55;
    this.hitFlash = 0.15;
  }

  restoreBetweenLevels(): void {
    this.health = Math.min(this.maxHealth, this.health + 45);
    this.focus = Math.min(100, this.focus + 50);
    this.invuln = 0.8;
  }
}
