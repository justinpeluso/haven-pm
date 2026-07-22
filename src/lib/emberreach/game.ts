import * as THREE from "three";
import { ABILITIES, type AbilityId } from "./abilities";
import { OrbitCamera } from "./camera";
import { Enemy, Projectile } from "./enemies";
import { Input } from "./input";
import { LEVELS } from "./levels";
import { Player } from "./player";
import { World } from "./world";

export type EmberreachHud = {
  hp: HTMLElement;
  focus: HTMLElement;
  quest: HTMLElement;
  toast: HTMLElement;
  level: HTMLElement;
  objective: HTMLElement;
  abilityRoot: HTMLElement;
};

type Phase = "intro" | "fight" | "clear" | "victory" | "defeat";

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly cameraRig: OrbitCamera;
  private readonly input: Input;
  private readonly world = new World();
  private readonly player = new Player();
  private enemies: Enemy[] = [];
  private readonly bolts: Projectile[] = [];
  private readonly clock = new THREE.Clock();
  private levelIndex = 0;
  private killsThisLevel = 0;
  private phase: Phase = "intro";
  private phaseTimer = 0;
  private disposed = false;
  private toastHide = 0;

  private readonly container: HTMLElement;
  private readonly hud: EmberreachHud;
  private readonly scratch = new THREE.Vector3();
  private readonly onResize: () => void;
  private readonly onPointerMove: (e: MouseEvent) => void;
  private readonly onWheel: (e: WheelEvent) => void;
  private resizeObserver: ResizeObserver | null = null;
  private readonly abilitySlots = new Map<
    AbilityId,
    { el: HTMLElement; cd: HTMLElement; lock: HTMLElement }
  >();

  constructor(
    canvas: HTMLCanvasElement,
    container: HTMLElement,
    hud: EmberreachHud,
  ) {
    this.container = container;
    this.hud = hud;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene.background = new THREE.Color(0x87a0b8);
    this.scene.fog = new THREE.FogExp2(0x9bb0c2, 0.012);

    const { width, height } = this.measure();
    this.cameraRig = new OrbitCamera(width / Math.max(height, 1));
    this.input = new Input(canvas);
    this.renderer.setSize(width, height, false);

    this.scene.add(this.world.root);
    this.scene.add(this.player.mesh);

    this.bindAbilityHud();

    this.onResize = () => this.syncSize();
    this.onPointerMove = (e) => {
      if (!this.input.pointerLocked) return;
      this.cameraRig.onPointerMove(e.movementX, e.movementY);
    };
    this.onWheel = (e) => {
      if (!this.input.pointerLocked) return;
      this.cameraRig.onWheel(e.deltaY);
    };

    window.addEventListener("resize", this.onResize);
    window.addEventListener("mousemove", this.onPointerMove);
    window.addEventListener("wheel", this.onWheel, { passive: true });
    this.resizeObserver = new ResizeObserver(() => this.syncSize());
    this.resizeObserver.observe(container);

    this.phase = "intro";
    this.phaseTimer = 1.6;
    this.player.setUnlockedForLevel(1);
    this.syncLevelHud();
    this.syncAbilityHud();
    this.showToast("Click to enter · 10 levels await", 2.8);
  }

  start(): void {
    this.clock.start();
    this.renderer.setAnimationLoop(() => this.tick());
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("mousemove", this.onPointerMove);
    window.removeEventListener("wheel", this.onWheel);
    this.resizeObserver?.disconnect();
    this.input.dispose();
    this.clearEnemies();
    this.renderer.dispose();
  }

  private bindAbilityHud(): void {
    for (const def of ABILITIES) {
      const el = this.hud.abilityRoot.querySelector<HTMLElement>(
        `[data-ability="${def.id}"]`,
      );
      if (!el) continue;
      const cd = el.querySelector<HTMLElement>(".emberreach-ability-cd")!;
      const lock = el.querySelector<HTMLElement>(".emberreach-ability-lock")!;
      this.abilitySlots.set(def.id, { el, cd, lock });
    }
  }

  private measure(): { width: number; height: number } {
    return {
      width: Math.max(1, this.container.clientWidth),
      height: Math.max(1, this.container.clientHeight),
    };
  }

  private syncSize(): void {
    const { width, height } = this.measure();
    this.renderer.setSize(width, height, false);
    this.cameraRig.resize(width / height);
  }

  private tick(): void {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.toastHide > 0) {
      this.toastHide -= dt;
      if (this.toastHide <= 0) this.hud.toast.classList.add("hidden");
    }

    if (this.phase === "intro") {
      this.phaseTimer -= dt;
      this.player.update(dt, this.input, this.cameraRig, this.world);
      this.input.drainAbilities();
      if (this.phaseTimer <= 0 || this.input.pointerLocked) {
        this.beginLevel(0);
      }
    } else if (this.phase === "fight") {
      this.tickFight(dt);
    } else if (this.phase === "clear") {
      this.phaseTimer -= dt;
      this.player.update(dt, this.input, this.cameraRig, this.world);
      this.input.drainAbilities();
      for (const enemy of this.enemies) {
        enemy.update(dt, this.player, this.world);
        enemy.faceCamera(this.cameraRig.camera);
      }
      if (this.phaseTimer <= 0) {
        const next = this.levelIndex + 1;
        if (next >= LEVELS.length) {
          this.phase = "victory";
          this.hud.objective.textContent =
            "Ashtrail conquered. All 10 levels cleared.";
          this.showToast("Victory — Ashtrail Watch complete", 4);
        } else {
          this.player.restoreBetweenLevels();
          this.beginLevel(next);
        }
      }
    } else {
      this.player.update(dt, this.input, this.cameraRig, this.world);
      this.input.drainAbilities();
    }

    this.cameraRig.update(this.player.position, dt);
    this.syncBars();
    this.syncAbilityHud();
    this.renderer.render(this.scene, this.cameraRig.camera);
  }

  private tickFight(dt: number): void {
    this.player.update(dt, this.input, this.cameraRig, this.world);
    this.resolveAbilities();

    for (const enemy of this.enemies) {
      enemy.update(dt, this.player, this.world);
      enemy.faceCamera(this.cameraRig.camera);
    }

    for (const bolt of this.bolts) {
      bolt.update(dt);
      if (!bolt.alive) continue;
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        if (
          bolt.mesh.position.distanceTo(enemy.position) <
          1.25 * enemy.tier.scale
        ) {
          if (enemy.takeDamage(bolt.damage)) this.onEnemyDown();
          bolt.alive = false;
          bolt.mesh.visible = false;
          break;
        }
      }
    }

    if (this.player.health <= 0) {
      this.phase = "defeat";
      this.hud.objective.textContent =
        "You fell. Refresh to try the Ashtrail again.";
      this.showToast("Defeated…", 3.5);
    }
  }

  private resolveAbilities(): void {
    if (this.input.consumeAbility("strike") && this.player.tryStrike()) {
      this.resolveMelee(26, 2.6);
    }
    if (this.input.consumeAbility("emberbolt")) {
      const dir = this.player.tryEmberbolt();
      if (dir) this.spawnBolt(dir, 32);
    }
    if (this.input.consumeAbility("dash") && this.player.tryDash()) {
      this.resolveMelee(18, 3.2);
    }
    if (this.input.consumeAbility("ward") && this.player.tryWard()) {
      this.resolveAoe(34, 3.6);
    }
    if (this.input.consumeAbility("ashstorm")) {
      const dirs = this.player.tryAshstorm();
      if (dirs) {
        for (const dir of dirs) this.spawnBolt(dir, 26);
      }
    }
  }

  private spawnBolt(dir: THREE.Vector3, damage: number): void {
    const bolt = new Projectile(this.player.position, dir, damage);
    this.bolts.push(bolt);
    this.scene.add(bolt.mesh);
  }

  private beginLevel(index: number): void {
    this.levelIndex = index;
    this.killsThisLevel = 0;
    this.clearEnemies();
    this.phase = "fight";

    const def = LEVELS[index];
    this.player.setUnlockedForLevel(def.level);
    const spots = this.spawnSpots(def.count);
    for (const [x, z] of spots) {
      const enemy = new Enemy(x, z, this.world, def.enemy);
      this.enemies.push(enemy);
      this.scene.add(enemy.mesh);
    }

    this.syncLevelHud();
    this.syncAbilityHud();
    this.showToast(def.title, 2.4);
  }

  private spawnSpots(count: number): Array<[number, number]> {
    const cx = 0;
    const cz = -28;
    const radius = 8.5;
    const spots: Array<[number, number]> = [];
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (i - (count - 1) / 2) * 0.9;
      spots.push([
        cx + Math.cos(angle) * radius,
        cz + Math.sin(angle) * radius,
      ]);
    }
    return spots;
  }

  private clearEnemies(): void {
    for (const enemy of this.enemies) enemy.dispose();
    this.enemies = [];
    for (const bolt of this.bolts) {
      bolt.mesh.removeFromParent();
      bolt.alive = false;
    }
    this.bolts.length = 0;
  }

  private resolveMelee(damage: number, reach: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      this.scratch.copy(enemy.position).sub(this.player.position);
      this.scratch.y = 0;
      if (
        this.scratch.length() >
        reach * Math.max(1, enemy.tier.scale * 0.85)
      ) {
        continue;
      }
      const facing = new THREE.Vector3(
        Math.sin(this.player.facing),
        0,
        Math.cos(this.player.facing),
      );
      if (this.scratch.normalize().dot(facing) < 0.05) continue;
      if (enemy.takeDamage(damage)) this.onEnemyDown();
    }
  }

  private resolveAoe(damage: number, radius: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      this.scratch.copy(enemy.position).sub(this.player.position);
      this.scratch.y = 0;
      if (this.scratch.length() > radius) continue;
      if (enemy.takeDamage(damage)) this.onEnemyDown();
    }
  }

  private onEnemyDown(): void {
    this.killsThisLevel += 1;
    const def = LEVELS[this.levelIndex];
    this.hud.objective.textContent = `Defeat ${def.enemy.label}s (${this.killsThisLevel}/${def.count})`;

    if (this.killsThisLevel >= def.count) {
      this.phase = "clear";
      this.phaseTimer = 2.0;
      if (this.levelIndex >= LEVELS.length - 1) {
        this.showToast("Final level cleared!", 2.2);
      } else {
        this.showToast(`Level ${def.level} clear — next wave inbound`, 2.0);
      }
    }
  }

  private syncLevelHud(): void {
    const def = LEVELS[this.levelIndex];
    this.hud.level.textContent = `Level ${def.level} / ${LEVELS.length}`;
    this.hud.quest.textContent = def.title;
    this.hud.objective.textContent = `${def.blurb} (0/${def.count})`;
  }

  private syncBars(): void {
    this.hud.hp.style.transform = `scaleX(${this.player.health / this.player.maxHealth})`;
    this.hud.focus.style.transform = `scaleX(${this.player.focus / 100})`;
  }

  private syncAbilityHud(): void {
    for (const def of ABILITIES) {
      const slot = this.abilitySlots.get(def.id);
      if (!slot) continue;
      const unlocked = this.player.isUnlocked(def.id);
      slot.el.dataset.locked = unlocked ? "false" : "true";
      slot.lock.hidden = unlocked;
      const ratio = this.player.cooldownRatio(def.id);
      slot.cd.style.transform = `scaleY(${ratio})`;
      const ready =
        unlocked &&
        ratio <= 0 &&
        this.player.focus >= def.focusCost;
      slot.el.dataset.ready = ready ? "true" : "false";
    }
  }

  private showToast(text: string, seconds = 2.4): void {
    this.hud.toast.textContent = text;
    this.hud.toast.classList.remove("hidden");
    this.toastHide = seconds;
  }
}
