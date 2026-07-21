import * as THREE from "three";
import type { EnemyTier } from "./levels";
import type { World } from "./world";
import type { Player } from "./player";

function makeHpBar(): THREE.Group {
  const group = new THREE.Group();
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.12),
    new THREE.MeshBasicMaterial({
      color: 0x1a100c,
      transparent: true,
      opacity: 0.75,
      depthTest: false,
    }),
  );
  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.04, 0.08),
    new THREE.MeshBasicMaterial({
      color: 0xd3542f,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    }),
  );
  fill.position.z = 0.01;
  fill.name = "hpFill";
  group.add(bg, fill);
  group.position.y = 1.7;
  return group;
}

export class Enemy {
  readonly mesh: THREE.Group;
  readonly position = new THREE.Vector3();
  readonly tier: EnemyTier;
  health: number;
  maxHealth: number;
  alive = true;
  private cooldown = 0;
  private hitFlash = 0;
  private deathTimer = 0;
  private readonly scratch = new THREE.Vector3();
  private readonly bodyMats: THREE.MeshStandardMaterial[] = [];
  private readonly hpBar: THREE.Group;
  private readonly spawnLight: THREE.PointLight;
  private spawnPulse = 0.55;

  constructor(x: number, z: number, world: World, tier: EnemyTier) {
    this.tier = tier;
    this.health = tier.health;
    this.maxHealth = tier.health;
    this.position.set(x, world.heightAt(x, z), z);
    this.mesh = new THREE.Group();
    this.mesh.scale.setScalar(tier.scale);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: tier.bodyColor,
      roughness: 0.85,
    });
    const headMat = new THREE.MeshStandardMaterial({
      color: tier.headColor,
      roughness: 0.8,
    });
    this.bodyMats.push(bodyMat, headMat);

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 0.7, 4, 8),
      bodyMat,
    );
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.55;
    body.castShadow = true;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), headMat);
    head.position.set(0.55, 0.65, 0);
    head.castShadow = true;

    const earL = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.28, 5),
      headMat,
    );
    earL.position.set(0.45, 0.95, 0.12);
    const earR = earL.clone();
    earR.position.z = -0.12;

    const glow = new THREE.PointLight(
      tier.glowColor,
      tier.glowIntensity,
      6,
      2,
    );
    glow.position.set(0.7, 0.7, 0);

    this.spawnLight = new THREE.PointLight(tier.glowColor, 3.5, 10, 2);
    this.spawnLight.position.set(0, 1, 0);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 0.95, 24),
      new THREE.MeshBasicMaterial({
        color: tier.glowColor,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    ring.name = "spawnRing";

    this.hpBar = makeHpBar();

    this.mesh.add(body, head, earL, earR, glow, this.spawnLight, ring, this.hpBar);
    this.mesh.position.copy(this.position);
  }

  update(dt: number, player: Player, world: World): void {
    if (!this.alive) {
      this.deathTimer += dt;
      const t = Math.min(1, this.deathTimer / 0.45);
      this.mesh.scale.setScalar(this.tier.scale * (1 - t * 0.7));
      this.mesh.position.y =
        world.heightAt(this.position.x, this.position.z) + t * 0.8;
      this.mesh.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mat = obj.material as THREE.Material & { opacity?: number };
          if ("opacity" in mat && mat.transparent !== undefined) {
            mat.transparent = true;
            mat.opacity = 1 - t;
          }
        }
      });
      if (t >= 1) this.mesh.visible = false;
      return;
    }

    this.cooldown = Math.max(0, this.cooldown - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.spawnPulse > 0) {
      this.spawnPulse -= dt;
      this.spawnLight.intensity = Math.max(0, this.spawnPulse * 6);
      const ring = this.mesh.getObjectByName("spawnRing") as THREE.Mesh | undefined;
      if (ring) {
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, this.spawnPulse * 1.4);
        ring.scale.setScalar(1 + (0.55 - this.spawnPulse) * 1.8);
      }
    }

    const flash = this.hitFlash > 0;
    for (const mat of this.bodyMats) {
      mat.emissive.setHex(flash ? 0xffeedd : 0x000000);
      mat.emissiveIntensity = flash ? 0.85 : 0;
    }

    this.scratch.copy(player.position).sub(this.position);
    this.scratch.y = 0;
    const dist = this.scratch.length();
    const stopDist = this.tier.attackRange * 0.9;

    if (dist > stopDist && dist < this.tier.aggroRange) {
      this.scratch.normalize().multiplyScalar(this.tier.speed * dt);
      this.position.add(this.scratch);
      this.mesh.rotation.y = Math.atan2(this.scratch.x, this.scratch.z);
    }

    if (dist < this.tier.attackRange && this.cooldown <= 0) {
      player.hurt(this.tier.damage);
      this.cooldown = this.tier.attackCooldown;
    }

    this.position.y = world.heightAt(this.position.x, this.position.z);
    this.mesh.position.copy(this.position);

    const fill = this.hpBar.getObjectByName("hpFill") as THREE.Mesh | undefined;
    if (fill) {
      const ratio = this.health / this.maxHealth;
      fill.scale.x = Math.max(0.001, ratio);
      fill.position.x = -0.52 * (1 - ratio);
      const mat = fill.material as THREE.MeshBasicMaterial;
      mat.color.setHex(ratio > 0.35 ? 0xd3542f : 0xaa2222);
    }
    this.hpBar.quaternion.copy(
      // billboard toward +Z camera-ish; game will face camera each frame via lookAt in Game
      this.hpBar.quaternion,
    );
  }

  faceCamera(camera: THREE.Camera): void {
    this.hpBar.lookAt(camera.position);
  }

  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.health -= amount;
    this.hitFlash = 0.12;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      this.deathTimer = 0;
      this.hpBar.visible = false;
      for (const mat of this.bodyMats) {
        mat.transparent = true;
      }
      return true;
    }
    return false;
  }

  dispose(): void {
    this.mesh.removeFromParent();
  }
}

export class Projectile {
  readonly mesh: THREE.Mesh;
  readonly velocity = new THREE.Vector3();
  life = 1.6;
  alive = true;
  private readonly trail: THREE.PointLight;

  constructor(origin: THREE.Vector3, dir: THREE.Vector3) {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xff7a3a }),
    );
    this.mesh.position.copy(origin).add(new THREE.Vector3(0, 1.3, 0));
    this.velocity.copy(dir).multiplyScalar(22);
    this.trail = new THREE.PointLight(0xff6a2a, 1.4, 5, 2);
    this.mesh.add(this.trail);
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
