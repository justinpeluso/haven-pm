import * as THREE from "three";
import type { World } from "./world";
import type { Player } from "./player";

export class CinderWolf {
  readonly mesh: THREE.Group;
  readonly position = new THREE.Vector3();
  health = 40;
  alive = true;
  private cooldown = 0;
  private readonly scratch = new THREE.Vector3();

  constructor(x: number, z: number, world: World) {
    this.position.set(x, world.heightAt(x, z), z);
    this.mesh = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.7, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a1c18, roughness: 0.85 }),
    );
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.55;
    body.castShadow = true;

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x3a241c }),
    );
    head.position.set(0.55, 0.65, 0);
    head.castShadow = true;

    const glow = new THREE.PointLight(0xff5522, 0.9, 5, 2);
    glow.position.set(0.7, 0.7, 0);

    this.mesh.add(body, head, glow);
    this.mesh.position.copy(this.position);
  }

  update(dt: number, player: Player, world: World): void {
    if (!this.alive) return;
    this.cooldown = Math.max(0, this.cooldown - dt);

    this.scratch.copy(player.position).sub(this.position);
    this.scratch.y = 0;
    const dist = this.scratch.length();

    if (dist > 1.4 && dist < 28) {
      this.scratch.normalize().multiplyScalar(3.6 * dt);
      this.position.add(this.scratch);
      this.mesh.rotation.y = Math.atan2(this.scratch.x, this.scratch.z);
    }

    if (dist < 1.55 && this.cooldown <= 0) {
      player.hurt(8);
      this.cooldown = 1.1;
    }

    this.position.y = world.heightAt(this.position.x, this.position.z);
    this.mesh.position.copy(this.position);
  }

  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.health -= amount;
    if (this.health <= 0) {
      this.alive = false;
      this.mesh.visible = false;
      return true;
    }
    return false;
  }
}

export class Projectile {
  readonly mesh: THREE.Mesh;
  readonly velocity = new THREE.Vector3();
  life = 1.6;
  alive = true;

  constructor(origin: THREE.Vector3, dir: THREE.Vector3) {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xff7a3a }),
    );
    this.mesh.position.copy(origin).add(new THREE.Vector3(0, 1.3, 0));
    this.velocity.copy(dir).multiplyScalar(22);
  }

  update(dt: number): void {
    if (!this.alive) return;
    this.life -= dt;
    this.mesh.position.addScaledVector(this.velocity, dt);
    if (this.life <= 0) {
      this.alive = false;
      this.mesh.visible = false;
    }
  }
}
