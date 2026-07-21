import * as THREE from "three";
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
    this.syncLevelHud();
    this.showToast("Click to enter · Level 1 awaits", 2.8);
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
      // Drain inputs during intro
      this.input.consumeAttack();
      this.input.consumeBolt();
      if (this.phaseTimer <= 0 || this.input.pointerLocked) {
        this.beginLevel(0);
      }
    } else if (this.phase === "fight") {
      this.tickFight(dt);
    } else if (this.phase === "clear") {
      this.phaseTimer -= dt;
      this.player.update(dt, this.input, this.cameraRig, this.world);
      this.input.consumeAttack();
      this.input.consumeBolt();
      for (const enemy of this.enemies) {
        enemy.update(dt, this.player, this.world);
        enemy.faceCamera(this.cameraRig.camera);
      }
      if (this.phaseTimer <= 0) {
        const next = this.levelIndex + 1;
        if (next >= LEVELS.length) {
          this.phase = "victory";
          this.hud.objective.textContent =
            "Ashtrail conquered. The stones burn quiet.";
          this.showToast("Victory — all levels cleared", 4);
        } else {
          this.player.restoreBetweenLevels();
          this.beginLevel(next);
        }
      }
    } else {
      // victory / defeat — still allow look + idle move
      this.player.update(dt, this.input, this.cameraRig, this.world);
      this.input.consumeAttack();
      this.input.consumeBolt();
    }

    this.cameraRig.update(this.player.position, dt);
    this.syncBars();
    this.renderer.render(this.scene, this.cameraRig.camera);
  }

  private tickFight(dt: number): void {
    this.player.update(dt, this.input, this.cameraRig, this.world);

    if (this.input.consumeAttack() && this.player.tryAttack()) {
      this.resolveMelee();
    }

    if (this.input.consumeBolt()) {
      const dir = this.player.tryBolt();
      if (dir) {
        const bolt = new Projectile(this.player.position, dir);
        this.bolts.push(bolt);
        this.scene.add(bolt.mesh);
      }
    }

    for (const enemy of this.enemies) {
      enemy.update(dt, this.player, this.world);
      enemy.faceCamera(this.cameraRig.camera);
    }

    for (const bolt of this.bolts) {
      bolt.update(dt);
      if (!bolt.alive) continue;
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        if (bolt.mesh.position.distanceTo(enemy.position) < 1.25 * enemy.tier.scale) {
          if (enemy.takeDamage(28)) this.onEnemyDown();
          bolt.alive = false;
          bolt.mesh.visible = false;
          break;
        }
      }
    }

    if (this.player.health <= 0) {
      this.phase = "defeat";
      this.hud.objective.textContent = "You fell. Refresh to try the Ashtrail again.";
      this.showToast("Defeated…", 3.5);
    }
  }

  private beginLevel(index: number): void {
    this.levelIndex = index;
    this.killsThisLevel = 0;
    this.clearEnemies();
    this.phase = "fight";

    const def = LEVELS[index];
    const spots = this.spawnSpots(def.count);
    for (const [x, z] of spots) {
      const enemy = new Enemy(x, z, this.world, def.enemy);
      this.enemies.push(enemy);
      this.scene.add(enemy.mesh);
    }

    this.syncLevelHud();
    this.showToast(def.title, 2.4);
  }

  private spawnSpots(count: number): Array<[number, number]> {
    const cx = 0;
    const cz = -28;
    const radius = 8.5;
    const spots: Array<[number, number]> = [];
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (i - (count - 1) / 2) * 0.9;
      spots.push([cx + Math.cos(angle) * radius, cz + Math.sin(angle) * radius]);
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

  private resolveMelee(): void {
    const reach = 2.5;
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      this.scratch.copy(enemy.position).sub(this.player.position);
      this.scratch.y = 0;
      if (this.scratch.length() > reach * Math.max(1, enemy.tier.scale * 0.85)) {
        continue;
      }
      const facing = new THREE.Vector3(
        Math.sin(this.player.facing),
        0,
        Math.cos(this.player.facing),
      );
      if (this.scratch.normalize().dot(facing) < 0.1) continue;
      if (enemy.takeDamage(24)) this.onEnemyDown();
    }
  }

  private onEnemyDown(): void {
    this.killsThisLevel += 1;
    const def = LEVELS[this.levelIndex];
    this.hud.objective.textContent = `Defeat ${def.enemy.label}s (${this.killsThisLevel}/${def.count})`;

    if (this.killsThisLevel >= def.count) {
      this.phase = "clear";
      this.phaseTimer = 2.2;
      if (this.levelIndex >= LEVELS.length - 1) {
        this.showToast("Final level cleared!", 2.2);
      } else {
        this.showToast(`Level ${def.level} clear — harder foes inbound`, 2.2);
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

  private showToast(text: string, seconds = 2.4): void {
    this.hud.toast.textContent = text;
    this.hud.toast.classList.remove("hidden");
    this.toastHide = seconds;
  }
}
