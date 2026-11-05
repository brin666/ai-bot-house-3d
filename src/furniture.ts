import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { catalog, type Item } from './store';
import { flatMaterial, look } from './look';

const p = look.palette;
const _position = new THREE.Vector3();
const _rotation = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _matrix = new THREE.Matrix4();

class FurnitureBuilder {
  private readonly geometries = new Map<string, THREE.BufferGeometry[]>();

  private add(color: string, geometry: THREE.BufferGeometry, x = 0, y = 0, z = 0, rotationY = 0, scale?: [number, number, number]) {
    _position.set(x, y, z);
    _rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);
    _matrix.compose(_position, _rotation, scale ? _scale.set(...scale) : _scale.set(1, 1, 1));
    geometry.applyMatrix4(_matrix);
    const list = this.geometries.get(color) ?? [];
    list.push(geometry);
    this.geometries.set(color, list);
  }

  box(color: string, w: number, h: number, d: number, x: number, y: number, z: number) {
    this.add(color, new THREE.BoxGeometry(w, h, d), x, y, z);
  }

  cylinder(color: string, rt: number, rb: number, h: number, x: number, y: number, z: number, segments = 10) {
    const geometry = new THREE.CylinderGeometry(rt, rb, h, segments);
    geometry.translate(0, h / 2, 0);
    this.add(color, geometry, x, y, z);
  }

  sphere(color: string, r: number, x: number, y: number, z: number, scale: [number, number, number] = [1, 1, 1], rotationY = 0) {
    this.add(color, new THREE.SphereGeometry(r, 9, 7), x, y, z, rotationY, scale);
  }

  cone(color: string, radius: number, h: number, x: number, y: number, z: number) {
    this.add(color, new THREE.ConeGeometry(radius, h, 10, 1), x, y, z);
  }

  flush(group: THREE.Group) {
    for (const [color, parts] of this.geometries) {
      const merged = mergeGeometries(parts, false);
      for (const geometry of parts) geometry.dispose();
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, flatMaterial(color));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    this.geometries.clear();
  }
}

function buildFurniture(item: Item, group: THREE.Group) {
  const b = new FurnitureBuilder();
  if (item.type === 'bed') {
    b.box(p.woodDark, 1.62, 0.22, 2.18, 0, 0.18, 0);
    b.box(p.cream, 1.52, 0.25, 2.02, 0, 0.4, 0.02);
    b.box(p.coral, 1.48, 0.14, 1.22, 0, 0.58, 0.34);
    b.box(p.rugB, 1.46, 0.08, 0.72, 0, 0.68, 0.58);
    b.box(p.cream, 1.03, 0.16, 0.44, 0, 0.69, -0.68);
    b.box(p.wood, 1.66, 0.72, 0.12, 0, 0.55, -1.04);
    b.box(p.gold, 1.58, 0.1, 0.13, 0, 0.94, -1.04);
    for (const x of [-0.67, 0.67]) for (const z of [-0.88, 0.88]) b.box(p.woodDark, 0.13, 0.24, 0.13, x, 0.12, z);
  } else if (item.type === 'table') {
    b.box(p.wood, 1.72, 0.15, 0.92, 0, 0.82, 0);
    b.box(p.gold, 1.7, 0.04, 0.9, 0, 0.92, 0);
    for (const x of [-0.75, 0.75]) for (const z of [-0.35, 0.35]) b.box(p.woodDark, 0.13, 0.76, 0.13, x, 0.38, z);
    b.box(p.ink, 0.48, 0.34, 0.08, -0.38, 1.14, -0.15);
    b.box(p.windowGlass, 0.39, 0.25, 0.025, -0.38, 1.15, -0.1);
    b.box(p.cream, 0.24, 0.035, 0.18, 0.34, 0.92, 0.16);
    b.cylinder(p.cup, 0.07, 0.08, 0.12, 0.34, 0.96, 0.16, 8);
  } else if (item.type === 'chair') {
    b.box(p.coral, 0.74, 0.14, 0.72, 0, 0.49, 0.02);
    b.box(p.wood, 0.74, 0.66, 0.12, 0, 0.85, -0.31);
    b.box(p.cream, 0.56, 0.42, 0.07, 0, 0.86, -0.22);
    b.box(p.woodDark, 0.1, 0.46, 0.1, -0.29, 0.23, -0.25);
    b.box(p.woodDark, 0.1, 0.46, 0.1, 0.29, 0.23, -0.25);
    b.box(p.woodDark, 0.1, 0.46, 0.1, -0.29, 0.23, 0.29);
    b.box(p.woodDark, 0.1, 0.46, 0.1, 0.29, 0.23, 0.29);
  } else if (item.type === 'lamp') {
    b.box(p.woodDark, 0.5, 0.08, 0.5, 0, 0.04, 0);
    b.cylinder(p.lampStem, 0.045, 0.06, 0.78, 0, 0.08, 0, 10);
    b.cone(p.lampShade, 0.255, 0.32, 0, 0.98, 0);
    b.sphere(p.cream, 0.09, 0, 0.79, 0);
    b.box(p.gold, 0.3, 0.045, 0.3, 0, 0.67, 0);
  } else if (item.type === 'plant') {
    b.cylinder(p.coral, 0.24, 0.2, 0.42, 0, 0, 0, 10);
    b.cylinder(p.woodDark, 0.24, 0.24, 0.05, 0, 0.41, 0, 10);
    b.box(p.wood, 0.1, 0.16, 0.1, 0, 0.54, 0);
    const leaves: [number, number, number, number][] = [
      [-0.11, 0.67, 0, -0.24], [0.11, 0.68, 0, 0.24], [0, 0.7, -0.12, 0],
      [0, 0.7, 0.12, Math.PI / 2], [-0.06, 0.85, -0.04, -0.35], [0.06, 0.86, 0.04, 0.35], [0, 1.02, 0, 0],
    ];
    for (const [x, y, z, yaw] of leaves) b.sphere(p.leaf, 0.135, x, y, z, [0.78, 1.28, 0.7], yaw);
  }
  b.flush(group);
}

export function furniture(item: Item) {
  const group = new THREE.Group();
  group.name = item.id;
  buildFurniture(item, group);
  group.position.set(item.x, 0, item.z);
  group.rotation.y = item.rotation;

  // Keep the independently built furniture until a configured GLB loads successfully.
  const model = catalog[item.type].model;
  if (model) {
    const fallback = [...group.children];
    new GLTFLoader().load(import.meta.env.BASE_URL + model.url, (loaded) => {
      const replacement = loaded.scene;
      if (group.userData.disposed) { releaseGlb(replacement); return; }
      replacement.scale.setScalar(model.scale);
      replacement.rotation.y = model.rotation;
      replacement.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = true;
        object.receiveShadow = true;
        if (!object.geometry.attributes.normal) object.geometry.computeVertexNormals();
        const source = Array.isArray(object.material) ? object.material : [object.material];
        const replacementMaterials = source.map((material) => {
          const colored = material as THREE.MeshStandardMaterial;
          return new THREE.MeshLambertMaterial({ color: colored.color ?? p.gold, map: colored.map ?? null, vertexColors: colored.vertexColors });
        });
        object.material = replacementMaterials.length === 1 ? replacementMaterials[0] : replacementMaterials;
      });
      for (const child of fallback) {
        child.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
        group.remove(child);
      }
      group.userData.glbLoaded = true;
      group.add(replacement);
    }, undefined, () => { /* Keep the procedural geometry if loading fails. */ });
  }
  return group;
}

function releaseGlb(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
      material.dispose();
    }
  });
}

export function disposeFurniture(root: THREE.Object3D) {
  root.userData.disposed = true;
  if (root.userData.glbLoaded) releaseGlb(root);
  else root.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
}

// The footprint is an axis-aligned conservative bound for any furniture rotation.
export function footprint(item: Item): [number, number] {
  const [w, d] = catalog[item.type].size;
  const c = Math.abs(Math.cos(item.rotation));
  const s = Math.abs(Math.sin(item.rotation));
  return [w * c + d * s, w * s + d * c];
}

export function interactionCandidates(item: Item): [number, number][] {
  const [x, z] = catalog[item.type].interaction;
  const standOff = 0.65;
  const c = Math.cos(item.rotation);
  const s = Math.sin(item.rotation);
  const local: [number, number][] = [[x, z], [catalog[item.type].size[0] / 2 + standOff, catalog[item.type].size[1] / 2 + standOff], [0, catalog[item.type].size[1] / 2 + standOff], [catalog[item.type].size[0] / 2 + standOff, 0], [-catalog[item.type].size[0] / 2 - standOff, 0], [0, -catalog[item.type].size[1] / 2 - standOff]];
  return local.map(([lx, lz]) => [item.x + lx * c + lz * s, item.z - lx * s + lz * c]);
}

export async function loadGlb(url: string) { return (await new GLTFLoader().loadAsync(url)).scene; }
