import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { flatMaterial } from './look';

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);

export class DecorBuilder {
  private geos = new Map<string, THREE.BufferGeometry[]>();

  box(w: number, h: number, d: number, x: number, y: number, z: number, color: string) {
    const g = new THREE.BoxGeometry(w, h, d);
    _m.compose(_p.set(x, y, z), _q.identity(), _s);
    g.applyMatrix4(_m);
    const list = this.geos.get(color) ?? [];
    list.push(g);
    this.geos.set(color, list);
  }

  cyl(
    rt: number,
    rb: number,
    h: number,
    x: number,
    y: number,
    z: number,
    color: string,
    seg = 10,
  ) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg);
    _m.compose(_p.set(x, y + h / 2, z), _q.identity(), _s);
    g.applyMatrix4(_m);
    const list = this.geos.get(color) ?? [];
    list.push(g);
    this.geos.set(color, list);
  }

  cone(radius: number, h: number, x: number, y: number, z: number, color: string, seg = 10) {
    const g = new THREE.ConeGeometry(radius, h, seg, 1);
    g.translate(0, h / 2, 0);
    _m.compose(_p.set(x, y, z), _q.identity(), _s);
    g.applyMatrix4(_m);
    const list = this.geos.get(color) ?? [];
    list.push(g);
    this.geos.set(color, list);
  }

  sphere(r: number, x: number, y: number, z: number, color: string) {
    const g = new THREE.SphereGeometry(r, 10, 8);
    _m.compose(_p.set(x, y, z), _q.identity(), _s);
    g.applyMatrix4(_m);
    const list = this.geos.get(color) ?? [];
    list.push(g);
    this.geos.set(color, list);
  }

  torus(r: number, tube: number, x: number, y: number, z: number, color: string) {
    const g = new THREE.TorusGeometry(r, tube, 8, 20);
    g.rotateX(Math.PI / 2);
    _m.compose(_p.set(x, y, z), _q.identity(), _s);
    g.applyMatrix4(_m);
    const list = this.geos.get(color) ?? [];
    list.push(g);
    this.geos.set(color, list);
  }

  flush(parent: THREE.Object3D) {
    for (const [color, list] of this.geos) {
      if (!list.length) continue;
      const merged = mergeGeometries(list, false);
      for (const g of list) g.dispose();
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, flatMaterial(color));
      mesh.receiveShadow = true;
      mesh.castShadow = false;
      parent.add(mesh);
    }
    this.geos.clear();
  }
}

export function mergeRoomFloorBoards(
  parent: THREE.Object3D,
  rx: number,
  rz: number,
  w: number,
  d: number,
  lineColor: string,
  boardCount: number,
) {
  const geos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < boardCount; i++) {
    const g = new THREE.BoxGeometry(w, 0.008, 0.018);
    _m.compose(_p.set(rx, 0.064, rz - d / 2 + (i * d) / boardCount), _q.identity(), _s);
    g.applyMatrix4(_m);
    geos.push(g);
  }
  const merged = mergeGeometries(geos, false);
  for (const g of geos) g.dispose();
  if (merged) {
    const mesh = new THREE.Mesh(merged, flatMaterial(lineColor));
    mesh.receiveShadow = false;
    mesh.castShadow = false;
    parent.add(mesh);
  }
}
