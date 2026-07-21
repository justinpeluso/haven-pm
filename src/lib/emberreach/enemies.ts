import * as THREE from "three";
import type { EnemyTier } from "./levels";
import {
  applySkinTexture,
  billboardToCamera,
  createSkinSprite,
  ENEMY_SKIN_URLS,
  loadSkinTexture,
  type SkinSprite,
} from "./skins";
import type { World } from "./world";
import type { Player } from "./player";

function makeHpBar(y: number): THREE.Group {
  const group = new THREE.Group();
  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.12),
    new THREE.MeshBasicMaterial({
      color: 0x1a100c,
      transparent: true,
      opacity: 0.75,
      depthTest: false,
    }),
  );
  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.08, 0.08),
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
  group.position.y = y;
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
  private bob = Math.random() * Math.PI * 2;
  private readonly scratch = new THREE.Vector3();
  private readonly skin: SkinSprite;
  private readonly hpBar: THREE.Group;
  private readonly spawnLight: THREE.PointLight;
  private spawnPulse = 0.55;
  private readonly baseColor = new THREE.Color(0xffffff);

  constructor(x: number, z: number, world: World, tier: EnemyTier) {
    this.tier = tier;
    this.health = tier.health;
    this.maxHealth = tier.health;
    this.position.set(x, world.heightAt(x, z), z);
    this.mesh = new THREE.Group();

    const height = 1.55 * tier.scale;
    this.skin = createSkinSprite(height, 1.05);
    this.mesh.add(this.skin.root);

    this.spawnLight = new THREE.PointLight(tier.glowColor, 3.5, 10, 2);
    this.spawnLight.position.set(0, height * 0.55, 0);
    this.mesh.add(this.spawnLight);

    const glow = new THREE.PointLight(tier.glowColor, tier.glowIntensity, 6, 2);
    glow.position.set(0, height * 0.5, 0.2);
    this.mesh.add(glow);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.95, 24),
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
    this.mesh.add(ring);

    this.hpBar = makeHpBar(height + 0.25);
    this.mesh.add(this.hpBar);
    this.mesh.position.copy(this.position);

    const url = ENEMY_SKIN_URLS[tier.id] ?? ENEMY_SKIN_URLS["cinder-wolf"];
    void loadSkinTexture(url).then((tex) => {
      applySkinTexture(this.skin, tex, 1.05);
    });
  }

  update(dt: number, player: Player, world: World): void {
    if (!this.alive) {
      this.deathTimer += dt;
      const t = Math.min(1, this.deathTimer / 0.5);
      this.skin.root.scale.setScalar(1 - t * 0.55);
      this.skin.root.position.y = t * 0.9;
      this.skin.material.transparent = true;
      this.skin.material.opacity = 1 - t;
      if (t >= 1) this.mesh.visible = false;
      return;
    }

    this.cooldown = Math.max(0, this.cooldown - dt);
    this.hitFlash = Math.max(0, this.hitFlash - dt);
    this.bob += dt * 3.2;

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
    this.skin.material.emissive.setHex(flash ? 0xffeedd : 0x000000);
    this.skin.material.emissiveIntensity = flash ? 0.9 : 0;
    this.skin.material.color.copy(
      this.baseColor.setHex(flash ? 0xffdddd : 0xffffff),
    );

    this.scratch.copy(player.position).sub(this.position);
    this.scratch.y = 0;
    const dist = this.scratch.length();
    const stopDist = this.tier.attackRange * 0.9;
    let moving = false;

    if (dist > stopDist && dist < this.tier.aggroRange) {
      this.scratch.normalize().multiplyScalar(this.tier.speed * dt);
      this.position.add(this.scratch);
      moving = true;
    }

    if (dist < this.tier.attackRange && this.cooldown <= 0) {
      player.hurt(this.tier.damage);
      this.cooldown = this.tier.attackCooldown;
    }

    this.position.y = world.heightAt(this.position.x, this.position.z);
    this.mesh.position.copy(this.position);
    this.skin.root.position.y = Math.sin(this.bob) * (moving ? 0.07 : 0.03);

    const fill = this.hpBar.getObjectByName("hpFill") as THREE.Mesh | undefined;
    if (fill) {
      const ratio = this.health / this.maxHealth;
      fill.scale.x = Math.max(0.001, ratio);
      fill.position.x = -0.54 * (1 - ratio);
      const mat = fill.material as THREE.MeshBasicMaterial;
      mat.color.setHex(ratio > 0.35 ? 0xd3542f : 0xaa2222);
    }
  }

  faceCamera(camera: THREE.Camera): void {
    billboardToCamera(this.skin.root, camera);
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
      this.skin.material.transparent = true;
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
