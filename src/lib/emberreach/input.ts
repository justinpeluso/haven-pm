import type { AbilityId } from "./abilities";

export class Input {
  readonly keys = new Set<string>();
  pointerLocked = false;
  attackPressed = false;
  jumpPressed = false;
  private readonly abilityPressed = new Set<AbilityId>();

  private readonly canvas: HTMLCanvasElement;
  private readonly onKeyDown: (e: KeyboardEvent) => void;
  private readonly onKeyUp: (e: KeyboardEvent) => void;
  private readonly onMouseDown: (e: MouseEvent) => void;
  private readonly onPointerLockChange: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    this.onKeyDown = (e) => {
      this.keys.add(e.code);
      if (e.code === "Space") {
        e.preventDefault();
        if (!e.repeat) this.jumpPressed = true;
      }
      // Ignore OS key-repeat so abilities don't queue while held.
      if (e.repeat) return;
      if (e.code === "Digit1" || e.code === "Numpad1") {
        this.abilityPressed.add("strike");
      }
      if (e.code === "Digit2" || e.code === "Numpad2" || e.code === "KeyQ") {
        this.abilityPressed.add("emberbolt");
      }
      if (e.code === "Digit3" || e.code === "Numpad3" || e.code === "KeyE") {
        this.abilityPressed.add("dash");
      }
      if (e.code === "Digit4" || e.code === "Numpad4" || e.code === "KeyR") {
        this.abilityPressed.add("ward");
      }
      if (e.code === "Digit5" || e.code === "Numpad5" || e.code === "KeyF") {
        this.abilityPressed.add("ashstorm");
      }
      if (e.code === "Escape" && document.pointerLockElement) {
        document.exitPointerLock();
      }
    };

    this.onKeyUp = (e) => {
      this.keys.delete(e.code);
    };

    this.onMouseDown = (e) => {
      if (!this.pointerLocked) {
        void canvas.requestPointerLock();
        return;
      }
      if (e.button === 0) {
        this.attackPressed = true;
        this.abilityPressed.add("strike");
      }
    };

    this.onPointerLockChange = () => {
      this.pointerLocked = document.pointerLockElement === canvas;
    };

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    canvas.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
  }

  dispose(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    if (document.pointerLockElement === this.canvas) {
      document.exitPointerLock();
    }
  }

  consumeAttack(): boolean {
    const v = this.attackPressed;
    this.attackPressed = false;
    return v;
  }

  consumeAbility(id: AbilityId): boolean {
    if (!this.abilityPressed.has(id)) return false;
    this.abilityPressed.delete(id);
    return true;
  }

  drainAbilities(): void {
    this.attackPressed = false;
    this.abilityPressed.clear();
  }

  consumeJump(): boolean {
    const v = this.jumpPressed;
    this.jumpPressed = false;
    return v;
  }
}
