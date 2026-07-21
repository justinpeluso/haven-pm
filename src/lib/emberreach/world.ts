import * as THREE from "three";

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class World {
  readonly root = new THREE.Group();
  readonly stones: THREE.Object3D[] = [];

  constructor() {
    this.buildGround();
    this.buildTrees();
    this.buildStandingStones();
    this.buildRuins();
    this.buildSky();
  }

  private buildGround(): void {
    const geo = new THREE.PlaneGeometry(180, 180, 96, 96);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h =
        Math.sin(x * 0.08) * 0.6 +
        Math.cos(z * 0.07) * 0.5 +
        Math.sin((x + z) * 0.03) * 1.4;
      pos.setY(i, h);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x3d4f38,
      roughness: 0.92,
      metalness: 0.02,
      flatShading: false,
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.receiveShadow = true;
    this.root.add(ground);

    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 70),
      new THREE.MeshStandardMaterial({
        color: 0x6b5a42,
        roughness: 1,
        metalness: 0,
      }),
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.08, -18);
    path.receiveShadow = true;
    this.root.add(path);
  }

  private buildTrees(): void {
    const rand = mulberry32(42);
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.32, 2.4, 6);
    const canopyGeo = new THREE.ConeGeometry(1.4, 3.2, 7);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x4a3424,
      roughness: 0.95,
    });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x1f3d2c,
      roughness: 0.85,
    });

    for (let i = 0; i < 70; i++) {
      const x = (rand() - 0.5) * 150;
      const z = (rand() - 0.5) * 150;
      if (Math.hypot(x, z) < 12) continue;

      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.2;
      trunk.castShadow = true;
      const canopy = new THREE.Mesh(canopyGeo, canopyMat);
      canopy.position.y = 3.4;
      canopy.castShadow = true;
      tree.add(trunk, canopy);
      tree.position.set(x, this.heightAt(x, z), z);
      const s = 0.75 + rand() * 0.7;
      tree.scale.setScalar(s);
      this.root.add(tree);
    }
  }

  private buildStandingStones(): void {
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x6d6a63,
      roughness: 0.9,
      metalness: 0.05,
    });

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const r = 10;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r - 28;
      const h = 3.5 + (i % 3) * 0.4;
      const stone = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, h, 0.55),
        stoneMat,
      );
      stone.position.set(x, this.heightAt(x, z) + h / 2, z);
      stone.rotation.y = -angle;
      stone.castShadow = true;
      stone.receiveShadow = true;
      this.root.add(stone);
      this.stones.push(stone);
    }

    const altar = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 2.6, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a4036, roughness: 0.9 }),
    );
    altar.position.set(0, this.heightAt(0, -28) + 0.35, -28);
    altar.castShadow = true;
    this.root.add(altar);

    const ember = new THREE.PointLight(0xff6a2a, 2.2, 18, 2);
    ember.position.set(0, this.heightAt(0, -28) + 1.4, -28);
    this.root.add(ember);
  }

  private buildRuins(): void {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x7a7266,
      roughness: 0.88,
    });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(14, 3.2, 1.2), mat);
    wall.position.set(-18, this.heightAt(-18, 8) + 1.6, 8);
    wall.castShadow = true;
    this.root.add(wall);

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.55, 4.5, 8),
      mat,
    );
    pillar.position.set(-12, this.heightAt(-12, 10) + 2.25, 10);
    pillar.castShadow = true;
    this.root.add(pillar);
  }

  private buildSky(): void {
    const hemi = new THREE.HemisphereLight(0xc9dff0, 0x3a2a18, 0.85);
    this.root.add(hemi);

    const sun = new THREE.DirectionalLight(0xffe1b5, 1.35);
    sun.position.set(40, 60, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 160;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    this.root.add(sun);

    const fill = new THREE.DirectionalLight(0x6aa8c8, 0.25);
    fill.position.set(-30, 20, -40);
    this.root.add(fill);
  }

  heightAt(x: number, z: number): number {
    return (
      Math.sin(x * 0.08) * 0.6 +
      Math.cos(z * 0.07) * 0.5 +
      Math.sin((x + z) * 0.03) * 1.4
    );
  }
}
