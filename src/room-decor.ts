import * as THREE from 'three';
import { flatMaterial, look } from './look';

export type DecorBlock = { x: number; z: number; w: number; d: number };

const p = look.palette;

function box(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string,
  cast = false,
) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flatMaterial(color));
  m.position.set(x, y, z);
  if (cast) m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
}

function addBlocks(out: DecorBlock[], x: number, z: number, w: number, d: number) {
  out.push({ x, z, w, d });
}

export function buildRoomDecor(unlockedIds: string[], parent: THREE.Group): DecorBlock[] {
  parent.clear();
  const u = new Set(unlockedIds);
  const blocks: DecorBlock[] = [];

  if (u.has('room-1')) {
    box(parent, 2.15, 0.018, 1.1, -0.25, 0.078, 1.8, p.rugA, false);
  }
  if (u.has('room-2')) {
    box(parent, 2.5, 0.018, 1.6, 8.2, 0.078, 0.85, p.rugB, false);
    box(parent, 2.8, 0.55, 1.1, 6.5, 0.28, -1.2, p.leaf, true);
    box(parent, 1.3, 0.35, 0.8, 9.5, 0.18, 1.5, p.wood, true);
    addBlocks(blocks, 6.5, -1.2, 2.8, 1.1);
    addBlocks(blocks, 9.3, -3.67, 1.8, 0.58);
    box(parent, 1.8, 1.5, 0.35, 9.3, 0.82, -3.67, p.bookcase, true);
  }
  if (u.has('room-3')) {
    box(parent, 4, 0.9, 0.7, 17, 0.45, -1.5, p.cream, true);
    box(parent, 1, 1.6, 1, 18.5, 0.8, 2, p.cream, true);
    box(parent, 1.8, 0.75, 1, 15, 0.38, 1.5, p.wood, true);
    box(parent, 0.8, 0.8, 0.8, 16.5, 0.4, -0.5, p.woodDark, true);
    box(parent, 0.8, 0.8, 0.8, 14.5, 0.4, -0.5, p.woodDark, true);
    addBlocks(blocks, 17, -1.5, 4, 0.7);
  }
  if (u.has('room-4')) {
    box(parent, 2.6, 0.9, 2.1, 8, 0.45, 10, p.ink, true);
    box(parent, 0.8, 0.45, 0.6, 7, 0.23, 8.5, p.wood, true);
    box(parent, 0.5, 0.9, 0.5, 9.5, 0.45, 11, p.trim, true);
    box(parent, 0.5, 0.9, 0.5, 6.5, 0.45, 11, p.trim, true);
    addBlocks(blocks, 8, 10, 2.6, 2.1);
  }
  if (u.has('room-5')) {
    box(parent, 1.8, 1.2, 1.1, 8, 0.6, -9, p.coral, true);
    box(parent, 1, 1.8, 0.8, 10, 0.9, -7, p.leaf, true);
    box(parent, 1.6, 0.45, 0.5, 6.5, 0.23, -8.5, p.bookcase, true);
    box(parent, 1.8, 0.55, 1.1, 9.5, 0.28, -10.5, p.wood, true);
    addBlocks(blocks, 8, -9, 1.8, 1.1);
  }
  if (u.has('room-6')) {
    box(parent, 1.8, 0.75, 1, 0, 0.38, 10, p.wood, true);
    box(parent, 0.8, 0.8, 0.8, -1.5, 0.4, 9, p.woodDark, true);
    box(parent, 1, 0.55, 0.25, 0.5, 0.65, 10.2, p.ink, true);
    box(parent, 0.7, 0.7, 0.7, 1.8, 0.35, 8.5, p.leaf, true);
    addBlocks(blocks, 0, 10, 1.8, 1);
  }
  if (u.has('room-7')) {
    box(parent, 2.2, 0.55, 1.1, 0, 0.28, -9, '#e8f8ff', true);
    box(parent, 0.9, 0.7, 0.7, -1.5, 0.35, -8.5, p.cream, true);
    box(parent, 0.7, 0.9, 1.1, 1.2, 0.45, -9.5, p.cream, true);
    addBlocks(blocks, 0, -9, 2.2, 1.1);
  }
  if (u.has('room-8')) {
    box(parent, 2.8, 0.9, 4.5, 17, 0.45, -9, p.cream, true);
    box(parent, 1.8, 0.5, 0.45, 15, 0.25, -7.5, p.woodDark, true);
    box(parent, 0.55, 0.55, 0.55, 18, 0.28, -10, p.trim, true);
    addBlocks(blocks, 17, -9, 2.8, 4.5);
  }
  if (u.has('room-9')) {
    box(parent, 0.9, 1, 1, 17, 0.5, 9, p.cream, true);
    box(parent, 0.9, 1, 1, 18.2, 0.5, 10, p.cream, true);
    box(parent, 1.6, 0.5, 0.5, 15, 0.25, 8.5, p.wood, true);
    box(parent, 1, 0.65, 0.65, 17, 0.33, 7, p.cream, true);
    addBlocks(blocks, 17, 9, 0.9, 1);
  }
  if (u.has('room-10')) {
    box(parent, 1.5, 0.35, 0.6, 8, 0.18, 18, p.wood, true);
    box(parent, 1.6, 0.5, 0.5, 9.5, 0.25, 16.5, p.woodDark, true);
    box(parent, 0.45, 0.55, 0.45, 6.5, 0.28, 17, p.trim, true);
    box(parent, 2.2, 0.02, 1.2, 8, 0.05, 17.2, p.rugA, false);
    addBlocks(blocks, 8, 18, 1.5, 0.6);
  }
  if (u.has('yard-main')) {
    const tramp = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.08, 8, 20), flatMaterial(p.ink));
    tramp.rotation.x = Math.PI / 2;
    tramp.position.set(4, 0.12, 30);
    parent.add(tramp);
    addBlocks(blocks, 4, 30, 3, 3);
    box(parent, 1.4, 0.25, 1.4, 12, 0.13, 32, p.woodDark, true);
    const scope = new THREE.Group();
    box(scope, 0.25, 0.25, 0.25, 0, 0.12, 0, p.trim, true);
    box(scope, 0.12, 3.2, 0.12, 0, 1.7, 0, p.trim, true);
    box(scope, 0.35, 0.35, 0.8, 0, 3.4, 0.4, p.ink, true);
    scope.position.set(14, 0, 34);
    parent.add(scope);
  }

  return blocks;
}
