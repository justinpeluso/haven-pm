import * as THREE from "three";
import type { Input } from "./input";
import type { OrbitCamera } from "./camera";
import type { World } from "./world";

export class Player {
  readonly mesh: THREE.Group;
  readonly position = new THREE.Vector3(0, 0, 8);
  velocityY = 0;
  onGround = true;
  health = 100;
  focus = 100;
  facing = 0;
  attackCooldown = 0;
  boltCooldown = 0;
  invuln = 0;
  private readonly swing = new THREE.Mesh();
  private swingTimer = 0;

  private readonly move = new THREE.Vector3();
  private readonly forward = new THREE.Vector3();
  private readonly right = new THREE.Vector3();

  constructor() {
    this.mesh = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.42, 0.95, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x2c3f55, roughness: 0.7 }),
    );
    body.position.y = 1.15;
    body.castShadow = true;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xd4b08c, roughness: 0.75 }),
    );
    head.position.y = 2.05;
    head.castShadow = true;

    const cloak = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 1.4, 8, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x8b2e1a,
        side: THREE.DoubleSide,
        roughness: 0.9,
      }),
    );
    cloak.position.set(0, 1.35, -0.15);
    cloak.rotation.x = Math.PI;

    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 1.35),
      new THREE.MeshStandardMaterial({
        color: 0xc0c8d4,
        metalness: 0.7,
        roughness: 0.25,
      }),
    );
    blade.position.set(0.55, 1.2, 0.35);
    blade.castShadow = true;

    this.swing.geometry = new THREE.TorusGeometry(1.1, 0.05, 6, 20, Math.PI);
    this.swing.material = new THREE.MeshBasicMaterial({
      color: 0xffd27a,
      transparent: true,
      opacity: 0,
    });
    this.swing.position.set(0, 1.2, 0.4);
    this.swing.rotation.x = Math.PI / 2;

    this.mesh.add(body, head, cloak, blade, this.swing);
  }

  update(dt: number, input: Input, camera: OrbitCamera, world: World): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.boltCooldown = Math.max(0, this.boltCooldown - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.focus = Math.min(100, this.focus + dt * 8);

    if (this.swingTimer > 0) {
      this.swingTimer -= dt;
      const mat = this.swing.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, this.swingTimer * 2.5);
    }

    this.move.set(0, 0, 0);
    camera.forwardFlat(this.forward);
    camera.rightFlat(this.right);

    if (input.keys.has("KeyW")) this.move.add(this.forward);
    if (input.keys.has("KeyS")) this.move.sub(this.forward);
    if (input.keys.has("KeyD")) this.move.add(this.right);
    if (input.keys.has("KeyA")) this.move.sub(this.right);

    const speed = input.keys.has("ShiftLeft") ? 9.5 : 6.2;
    if (this.move.lengthSq() > 0) {
      this.move.normalize().multiplyScalar(speed * dt);
      this.position.add(this.move);
      this.facing = Math.atan2(this.move.x, this.move.z);
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
    this.mesh.rotation.y = THREE.MathUtils.lerp(
      this.mesh.rotation.y,
      this.facing,
      1 - Math.exp(-12 * dt),
    );
  }

  tryAttack(): boolean {
    if (this.attackCooldown > 0) return false;
    this.attackCooldown = 0.45;
    this.swingTimer = 0.28;
    return true;
  }

  tryBolt(): THREE.Vector3 | null {
    if (this.boltCooldown > 0 || this.focus < 18) return null;
    this.boltCooldown = 0.7;
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
    this.invuln = 0.6;
  }
}
