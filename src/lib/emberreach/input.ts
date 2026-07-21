export class Input {
  readonly keys = new Set<string>();
  pointerLocked = false;
  attackPressed = false;
  boltPressed = false;
  jumpPressed = false;

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
        this.jumpPressed = true;
      }
      if (e.code === "KeyQ") this.boltPressed = true;
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
      if (e.button === 0) this.attackPressed = true;
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

  consumeBolt(): boolean {
    const v = this.boltPressed;
    this.boltPressed = false;
    return v;
  }

  consumeJump(): boolean {
    const v = this.jumpPressed;
    this.jumpPressed = false;
    return v;
  }
}
