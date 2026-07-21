import * as THREE from "three";

export class OrbitCamera {
  readonly camera: THREE.PerspectiveCamera;
  yaw = 0.55;
  pitch = 0.35;
  distance = 7.5;

  private readonly minPitch = 0.12;
  private readonly maxPitch = 1.25;
  private readonly minDistance = 3.5;
  private readonly maxDistance = 14;
  private readonly offset = new THREE.Vector3(0, 1.45, 0);
  private readonly desired = new THREE.Vector3();
  private readonly look = new THREE.Vector3();

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.1, 400);
  }

  onPointerMove(dx: number, dy: number): void {
    this.yaw -= dx * 0.0024;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch + dy * 0.002,
      this.minPitch,
      this.maxPitch,
    );
  }

  onWheel(deltaY: number): void {
    this.distance = THREE.MathUtils.clamp(
      this.distance + deltaY * 0.01,
      this.minDistance,
      this.maxDistance,
    );
  }

  update(target: THREE.Vector3, dt: number): void {
    const horizontal = Math.cos(this.pitch) * this.distance;
    this.desired.set(
      target.x + Math.sin(this.yaw) * horizontal,
      target.y + Math.sin(this.pitch) * this.distance + 1.2,
      target.z + Math.cos(this.yaw) * horizontal,
    );

    this.camera.position.lerp(this.desired, 1 - Math.exp(-10 * dt));
    this.look.copy(target).add(this.offset);
    this.camera.lookAt(this.look);
  }

  forwardFlat(out: THREE.Vector3): THREE.Vector3 {
    out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    return out;
  }

  rightFlat(out: THREE.Vector3): THREE.Vector3 {
    out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
    return out;
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
