import * as THREE from "three";
import { OrbitCamera } from "./camera";
import { CinderWolf, Projectile } from "./enemies";
import { Input } from "./input";
import { Player } from "./player";
import { World } from "./world";

export type EmberreachHud = {
  hp: HTMLElement;
  focus: HTMLElement;
  quest: HTMLElement;
  toast: HTMLElement;
};

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly cameraRig: OrbitCamera;
  private readonly input: Input;
  private readonly world = new World();
  private readonly player = new Player();
  private readonly wolves: CinderWolf[] = [];
  private readonly bolts: Projectile[] = [];
  private readonly clock = new THREE.Clock();
  private kills = 0;
  private readonly questGoal = 3;
  private done = false;
  private disposed = false;

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

    const spawns: Array<[number, number]> = [
      [-6, -24],
      [7, -30],
      [2, -20],
      [-10, -34],
    ];
    for (const [x, z] of spawns) {
      const wolf = new CinderWolf(x, z, this.world);
      this.wolves.push(wolf);
      this.scene.add(wolf.mesh);
    }

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

    this.showToast("Click to enter the Ashtrail");
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
    this.renderer.dispose();
  }

  private measure(): { width: number; height: number } {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    return { width, height };
  }

  private syncSize(): void {
    const { width, height } = this.measure();
    this.renderer.setSize(width, height, false);
    this.cameraRig.resize(width / height);
  }

  private tick(): void {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
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

    for (const wolf of this.wolves) {
      wolf.update(dt, this.player, this.world);
    }

    for (const bolt of this.bolts) {
      bolt.update(dt);
      if (!bolt.alive) continue;
      for (const wolf of this.wolves) {
        if (!wolf.alive) continue;
        if (bolt.mesh.position.distanceTo(wolf.position) < 1.2) {
          if (wolf.takeDamage(28)) this.onKill();
          bolt.alive = false;
          bolt.mesh.visible = false;
          break;
        }
      }
    }

    this.cameraRig.update(this.player.position, dt);
    this.syncHud();
    this.renderer.render(this.scene, this.cameraRig.camera);

    if (this.player.health <= 0 && !this.done) {
      this.done = true;
      this.showToast("You fell on the Ashtrail… refresh to try again");
    }
  }

  private resolveMelee(): void {
    const reach = 2.4;
    for (const wolf of this.wolves) {
      if (!wolf.alive) continue;
      this.scratch.copy(wolf.position).sub(this.player.position);
      this.scratch.y = 0;
      if (this.scratch.length() > reach) continue;
      const facing = new THREE.Vector3(
        Math.sin(this.player.facing),
        0,
        Math.cos(this.player.facing),
      );
      if (this.scratch.normalize().dot(facing) < 0.15) continue;
      if (wolf.takeDamage(22)) this.onKill();
    }
  }

  private onKill(): void {
    this.kills += 1;
    if (this.kills >= this.questGoal && !this.done) {
      this.done = true;
      this.hud.quest.textContent =
        "Ashtrail cleared. The standing stones burn quiet again.";
      this.showToast("Quest complete — Ashtrail Watch");
    } else {
      this.hud.quest.textContent = `Defeat the cinder wolves near the standing stones (${this.kills}/${this.questGoal}).`;
    }
  }

  private syncHud(): void {
    this.hud.hp.style.transform = `scaleX(${this.player.health / 100})`;
    this.hud.focus.style.transform = `scaleX(${this.player.focus / 100})`;
  }

  private showToast(text: string): void {
    this.hud.toast.textContent = text;
    this.hud.toast.classList.remove("hidden");
    window.setTimeout(() => {
      if (!this.disposed) this.hud.toast.classList.add("hidden");
    }, 2400);
  }
}
