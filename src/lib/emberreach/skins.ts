import * as THREE from "three";

export const PLAYER_SKIN_URL = "/emberreach/skins/ashtrail-warden.svg";

export const ENEMY_SKIN_URLS: Record<string, string> = {
  "ash-whelp": "/emberreach/skins/ash-whelp.svg",
  "cinder-wolf": "/emberreach/skins/cinder-wolf.svg",
  "ember-brute": "/emberreach/skins/ember-brute.svg",
  "night-howler": "/emberreach/skins/night-howler.svg",
  ashlord: "/emberreach/skins/ashlord.svg",
};

const textureCache = new Map<string, THREE.Texture>();
let loader: THREE.TextureLoader | null = null;

function getLoader(): THREE.TextureLoader {
  if (!loader) loader = new THREE.TextureLoader();
  return loader;
}

export function loadSkinTexture(url: string): Promise<THREE.Texture> {
  const hit = textureCache.get(url);
  if (hit) return Promise.resolve(hit);

  return new Promise((resolve, reject) => {
    getLoader().load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        textureCache.set(url, tex);
        resolve(tex);
      },
      undefined,
      reject,
    );
  });
}

export type SkinSprite = {
  root: THREE.Group;
  plane: THREE.Mesh;
  material: THREE.MeshStandardMaterial;
  height: number;
};

/** Painted character plane — billboarded toward camera each frame. */
export function createSkinSprite(
  height: number,
  aspect = 0.78,
): SkinSprite {
  const root = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    alphaTest: 0.08,
    side: THREE.DoubleSide,
    roughness: 0.72,
    metalness: 0.04,
    depthWrite: true,
  });
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(height * aspect, height),
    material,
  );
  plane.position.y = height * 0.5;
  plane.castShadow = true;
  root.add(plane);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(height * 0.28, 20),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  root.add(shadow);

  return { root, plane, material, height };
}

export function applySkinTexture(
  sprite: SkinSprite,
  texture: THREE.Texture,
  aspect?: number,
): void {
  sprite.material.map = texture;
  sprite.material.needsUpdate = true;
  if (aspect) {
    const h = sprite.height;
    sprite.plane.geometry.dispose();
    sprite.plane.geometry = new THREE.PlaneGeometry(h * aspect, h);
  }
}

export function billboardToCamera(
  root: THREE.Object3D,
  camera: THREE.Camera,
): void {
  root.lookAt(camera.position.x, root.position.y + 1.2, camera.position.z);
}
