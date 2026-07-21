import * as THREE from "three";
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
  attackCooldown = 0;
  boltCooldown = 0;
  invuln = 0;
  private readonly swing = new THREE.Mesh();
  private swingTimer = 0;
  private hitFlash = 0;
  private bob = 0;
  private readonly skin: SkinSprite;
  private readonly baseEmissive = new THREE.Color(0x000000);

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

    void loadSkinTexture(PLAYER_SKIN_URL).then((tex) => {
      applySkinTexture(this.skin, tex, 0.8);
    });
  }

  faceCamera(camera: THREE.Camera): void {
    billboardToCamera(this.skin.root, camera);
  }

  update(dt: number, input: Input, camera: OrbitCamera, world: World): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.boltCooldown = Math.max(0, this.boltCooldown - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.focus = Math.min(100, this.focus + dt * 8);

    const flash =
      this.hitFlash > 0 ||
      (this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0);
    this.skin.material.emissive.setHex(flash ? 0xff4444 : 0x000000);
    this.skin.material.emissiveIntensity = flash ? 0.65 : 0;
    this.skin.material.color.copy(this.baseEmissive.setHex(flash ? 0xffcccc : 0xffffff));

    if (this.swingTimer > 0) {
      this.swingTimer -= dt;
      const mat = this.swing.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, this.swingTimer * 2.5);
      this.swing.rotation.z += dt * 14;
    }

    this.move.set(0, 0, 0);
    camera.forwardFlat(this.forward);
    camera.rightFlat(this.right);

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

    if (input.consumeJump() && this.onGround) {
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
    const bobY = this.onGround ? Math.sin(this.bob) * (moving ? 0.06 : 0.025) : 0;
    this.skin.root.position.y = bobY;
    this.faceCamera(camera.camera);
  }

  tryAttack(): boolean {
    if (this.attackCooldown > 0) return false;
    this.attackCooldown = 0.42;
    this.swingTimer = 0.28;
    this.swing.rotation.z = 0;
    return true;
  }

  tryBolt(): THREE.Vector3 | null {
    if (this.boltCooldown > 0 || this.focus < 18) return null;
    this.boltCooldown = 0.65;
    this.focus -= 18;
    const dir = new THREE.Vector3(
      Math.sin(this.facing),
      0.05,
      Math.cos(this.facing),
    ).normalize();
    return dir;
  }

  hurt(amount: number): void {
    if (this.invuln > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.invuln = 0.55;
    this.hitFlash = 0.15;
  }

  restoreBetweenLevels(): void {
    this.health = Math.min(this.maxHealth, this.health + 35);
    this.focus = Math.min(100, this.focus + 40);
    this.invuln = 0.8;
  }
}
