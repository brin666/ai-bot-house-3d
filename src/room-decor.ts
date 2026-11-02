import * as THREE from 'three';
import { DecorBuilder } from './decor-builder';
import { flatMaterial, look } from './look';

export type DecorBlock = { x: number; z: number; w: number; d: number };

const p = look.palette;

function addBlocks(out: DecorBlock[], x: number, z: number, w: number, d: number) {
  out.push({ x, z, w, d });
}

function roomDecor(
  parent: THREE.Group,
  blocks: DecorBlock[],
  fn: (b: DecorBuilder, blk: (x: number, z: number, w: number, d: number) => void) => void,
) {
  const builder = new DecorBuilder();
  const blk = (x: number, z: number, w: number, d: number) => addBlocks(blocks, x, z, w, d);
  fn(builder, blk);
  builder.flush(parent);
}

export function buildRoomDecor(unlockedIds: string[], parent: THREE.Group): DecorBlock[] {
  parent.clear();
  const u = new Set(unlockedIds);
  const blocks: DecorBlock[] = [];

  if (u.has('room-1')) {
    roomDecor(parent, blocks, (b) => {
      b.box(2.15, 0.018, 1.1, -0.25, 0.078, 1.8, p.rugA);
      b.box(0.5, 0.45, 0.4, -2.8, 0.22, -2.5, p.cream);
      b.box(0.35, 0.55, 0.35, 2.5, 0.28, 2.2, p.leaf);
      b.box(0.9, 0.08, 0.6, 0.5, 0.04, 0.5, p.wood);
      b.box(0.25, 0.35, 0.25, -1.2, 0.18, 2.8, p.trim);
      b.cyl(0.08, 0.1, 0.35, 3.2, 0, -1.5, p.lampStem);
      b.box(0.22, 0.18, 0.22, 3.2, 0.38, -1.5, p.lampShade);
    });
  }
  if (u.has('room-2')) {
    roomDecor(parent, blocks, (b, blk) => {
      b.box(2.5, 0.018, 1.6, 8.2, 0.078, 0.85, p.rugB);
      b.box(2.8, 0.55, 1.1, 6.5, 0.28, -1.2, p.leaf);
      blk(6.5, -1.2, 2.8, 1.1);
      b.box(1.3, 0.35, 0.8, 9.5, 0.18, 1.5, p.wood);
      b.box(1.8, 1.5, 0.35, 9.3, 0.82, -3.67, p.bookcase);
      blk(9.3, -3.67, 1.8, 0.58);
      b.box(2.8, 0.45, 1.1, 7.2, 0.23, 1.8, p.coral);
      b.box(1.3, 0.35, 0.8, 10.2, 0.18, -0.5, p.wood);
      b.box(0.8, 0.25, 0.55, 5.8, 0.13, 2.5, p.sideTable);
      b.cyl(0.06, 0.06, 0.12, 5.7, 0.25, 2.4, p.cup);
      b.box(0.9, 0.08, 0.52, 7.0, 0.67, -3.2, p.sideTable);
    });
  }
  if (u.has('room-3')) {
    roomDecor(parent, blocks, (b, blk) => {
      b.box(4, 0.9, 0.7, 17, 0.45, -1.5, p.cream);
      blk(17, -1.5, 4, 0.7);
      b.box(1, 1.6, 1, 18.5, 0.8, 2, p.cream);
      b.box(1.8, 0.75, 1, 15, 0.38, 1.5, p.wood);
      b.box(0.8, 0.8, 0.8, 16.5, 0.4, -0.5, p.woodDark);
      b.box(0.8, 0.8, 0.8, 14.5, 0.4, -0.5, p.woodDark);
      b.box(1.8, 0.08, 1, 17.5, 0.75, 0.5, p.wood);
      b.cyl(0.35, 0.35, 0.06, 16.8, 0.04, -0.8, p.trim);
      b.box(0.55, 0.45, 0.55, 13.2, 0.23, 2.8, p.leaf);
      b.box(0.7, 0.55, 0.7, 18.8, 0.28, -2.2, p.cream);
    });
  }
  if (u.has('room-4')) {
    roomDecor(parent, blocks, (b, blk) => {
      b.box(2.6, 0.9, 2.1, 8, 0.45, 10, p.ink);
      blk(8, 10, 2.6, 2.1);
      b.box(0.8, 0.45, 0.6, 7, 0.23, 8.5, p.wood);
      b.box(0.5, 0.9, 0.5, 9.5, 0.45, 11, p.trim);
      b.box(0.5, 0.9, 0.5, 6.5, 0.45, 11, p.trim);
      b.box(0.8, 0.35, 0.55, 8, 0.18, 7.5, p.woodDark);
      b.cyl(0.12, 0.12, 0.5, 9.8, 0, 9.2, p.trim);
      b.box(0.35, 0.08, 0.25, 9.8, 0.52, 9.2, p.ink);
    });
  }
  if (u.has('room-5')) {
    roomDecor(parent, blocks, (b, blk) => {
      b.box(1.8, 1.2, 1.1, 8, 0.6, -9, p.coral);
      blk(8, -9, 1.8, 1.1);
      b.box(1, 1.8, 0.8, 10, 0.9, -7, p.leaf);
      b.box(1.6, 0.45, 0.5, 6.5, 0.23, -8.5, p.bookcase);
      b.box(1.8, 0.55, 1.1, 9.5, 0.28, -10.5, p.wood);
      b.box(1, 1.1, 0.8, 7.2, 0.55, -6.5, p.coral);
      b.sphere(0.18, 8.5, 0.85, -8.2, p.trim);
      b.box(0.6, 0.5, 0.45, 10.5, 0.25, -9.8, p.woodDark);
    });
  }
  if (u.has('room-6')) {
    roomDecor(parent, blocks, (b, blk) => {
      b.box(1.8, 0.75, 1, 0, 0.38, 10, p.wood);
      blk(0, 10, 1.8, 1);
      b.box(0.8, 0.8, 0.8, -1.5, 0.4, 9, p.woodDark);
      b.box(1, 0.55, 0.25, 0.5, 0.65, 10.2, p.ink);
      b.box(0.7, 0.7, 0.7, 1.8, 0.35, 8.5, p.leaf);
      b.box(0.55, 0.45, 0.45, -0.8, 0.23, 8.2, p.cream);
      b.cyl(0.05, 0.05, 0.35, 0.2, 0, 10.5, p.lampStem);
      b.box(0.18, 0.12, 0.18, 0.2, 0.38, 10.5, p.lampShade);
    });
  }
  if (u.has('room-7')) {
    roomDecor(parent, blocks, (b, blk) => {
      b.box(2.2, 0.55, 1.1, 0, 0.28, -9, '#e8f8ff');
      blk(0, -9, 2.2, 1.1);
      b.box(0.9, 0.7, 0.7, -1.5, 0.35, -8.5, p.cream);
      b.box(0.7, 0.9, 1.1, 1.2, 0.45, -9.5, p.cream);
      b.cyl(0.25, 0.25, 0.4, -0.5, 0, -8.2, p.cream);
      b.box(0.5, 0.35, 0.45, 1.5, 0.18, -7.8, p.wood);
      b.sphere(0.12, 0.3, 0.55, -9.8, p.trim);
    });
  }
  if (u.has('room-8')) {
    roomDecor(parent, blocks, (b, blk) => {
      b.box(2.8, 0.9, 4.5, 17, 0.45, -9, p.cream);
      blk(17, -9, 2.8, 4.5);
      b.box(1.8, 0.5, 0.45, 15, 0.25, -7.5, p.woodDark);
      b.box(0.55, 0.55, 0.55, 18, 0.28, -10, p.trim);
      b.cyl(0.35, 0.35, 0.35, 16.5, 0.35, -8.5, p.trim);
      b.box(0.4, 0.25, 0.6, 14.2, 0.13, -10.5, p.wood);
      b.box(0.35, 0.35, 0.35, 18.5, 0.18, -7.2, p.trim);
    });
  }
  if (u.has('room-9')) {
    roomDecor(parent, blocks, (b, blk) => {
      b.box(0.9, 1, 1, 17, 0.5, 9, p.cream);
      b.box(0.9, 1, 1, 18.2, 0.5, 10, p.cream);
      blk(17, 9, 0.9, 1);
      b.box(1.6, 0.5, 0.5, 15, 0.25, 8.5, p.wood);
      b.box(1, 0.65, 0.65, 17, 0.33, 7, p.cream);
      b.cyl(0.4, 0.4, 0.08, 16.5, 0.04, 8.8, p.trim);
      b.box(0.45, 0.55, 0.45, 14.5, 0.28, 9.5, p.woodDark);
    });
  }
  if (u.has('room-10')) {
    roomDecor(parent, blocks, (b, blk) => {
      b.box(1.5, 0.35, 0.6, 8, 0.18, 18, p.wood);
      blk(8, 18, 1.5, 0.6);
      b.box(1.6, 0.5, 0.5, 9.5, 0.25, 16.5, p.woodDark);
      b.box(0.45, 0.55, 0.45, 6.5, 0.28, 17, p.trim);
      b.box(2.2, 0.02, 1.2, 8, 0.05, 17.2, p.rugA);
      b.cyl(0.2, 0.22, 0.55, 7.2, 0, 17.5, p.trim);
      b.box(0.35, 0.08, 0.25, 9, 0.04, 15.8, p.wood);
    });
  }
  if (u.has('yard-main')) {
    roomDecor(parent, blocks, (b, blk) => {
      b.box(1.2, 0.22, 1.2, 9, 0.11, 25, p.woodDark);
      blk(9, 25, 1.4, 1.4);
      b.box(1.5, 0.35, 0.55, 8, 0.18, 21.2, p.wood);
      b.cyl(0.35, 0.4, 0.15, 9, 0, 25.5, p.trim);
      b.cyl(0.08, 0.08, 0.25, 9, 0.15, 25.5, p.ink);
    });
    const tramp = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.07, 8, 18), flatMaterial(p.ink));
    tramp.rotation.x = Math.PI / 2;
    tramp.position.set(4, 0.1, 26);
    tramp.castShadow = false;
    parent.add(tramp);
    addBlocks(blocks, 4, 26, 2.8, 2.8);
    const scope = new THREE.Group();
    const sb = new DecorBuilder();
    sb.box(0.22, 0.22, 0.22, 0, 0.12, 0, p.trim);
    sb.box(0.1, 2.8, 0.1, 0, 1.5, 0, p.trim);
    sb.box(0.32, 0.32, 0.65, 0, 3.05, 0.35, p.ink);
    sb.flush(scope);
    scope.position.set(13, 0, 26);
    parent.add(scope);
  }

  return blocks;
}
