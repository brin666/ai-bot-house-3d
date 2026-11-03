import * as THREE from 'three';
import { flatMaterial, look } from './look';
import { mergeRoomFloorBoards } from './decor-builder';
import { rooms as allRooms } from './scene-types';

const WALL_THICKNESS = 0.12;
const BACK_WALL_HEIGHT = 2.35;
const CUTAWAY_SILL_HEIGHT = 0.22;
const YARD_FENCE_HEIGHT = 1.1;

function cube(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string,
  parent: THREE.Object3D,
  cast = true,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flatMaterial(color));
  mesh.position.set(x, y, z);
  if (cast) mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function drawRooms(roomGroup: THREE.Group, unlockedIds: string[]) {
  roomGroup.clear();
  const unlocked = new Set(unlockedIds);
  const p = look.palette;
  for (const room of allRooms) {
    const active = unlocked.has(room.id);
    const [rx, rz] = room.position;
    const [w, d] = room.size;
    const floor = p.floors[room.id] ?? room.floor;
    const line = p.floorLines[room.id] ?? p.floorLine;
    if (!active) {
      const ghost = flatMaterial(floor);
      ghost.transparent = true;
      ghost.opacity = 0.22;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), ghost);
      slab.position.set(rx, 0.02, rz);
      roomGroup.add(slab);
      const dash = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(w, 0.1, d)),
        new THREE.LineBasicMaterial({ color: p.trim, transparent: true, opacity: 0.55 }),
      );
      dash.position.set(rx, 0.06, rz);
      roomGroup.add(dash);
      continue;
    }
    if (room.kind === 'pool') {
      cube(w, 0.14, d, rx, -0.02, rz, '#2a90c8', roomGroup);
      cube(w - 0.2, 0.04, d - 0.2, rx, 0.08, rz, '#5ec8f0', roomGroup, false);
      continue;
    }
    cube(w + 0.16, 0.16, d + 0.16, rx, -0.1, rz, p.slab, roomGroup);
    cube(w, 0.12, d, rx, 0, rz, floor, roomGroup);
    const boardCount = Math.max(8, Math.floor(Math.max(w, d) * 2));
    mergeRoomFloorBoards(roomGroup, rx, rz, w, d, line, boardCount);
    if (room.kind === 'yard') {
      const posts = Math.floor(w / 2);
      const postMat = flatMaterial(p.trim);
      const farPosts = new THREE.InstancedMesh(
        new THREE.BoxGeometry(0.08, YARD_FENCE_HEIGHT, 0.08),
        postMat,
        posts + 1,
      );
      const nearPosts = new THREE.InstancedMesh(
        new THREE.BoxGeometry(0.08, CUTAWAY_SILL_HEIGHT, 0.08),
        postMat,
        posts + 1,
      );
      const m = new THREE.Matrix4();
      for (let i = 0; i <= posts; i++) {
        const fx = rx - w / 2 + (i * w) / posts;
        m.makeTranslation(fx, YARD_FENCE_HEIGHT / 2, rz - d / 2);
        farPosts.setMatrixAt(i, m);
        m.makeTranslation(fx, CUTAWAY_SILL_HEIGHT / 2, rz + d / 2);
        nearPosts.setMatrixAt(i, m);
      }
      farPosts.instanceMatrix.needsUpdate = true;
      nearPosts.instanceMatrix.needsUpdate = true;
      farPosts.castShadow = false;
      nearPosts.castShadow = false;
      roomGroup.add(farPosts, nearPosts);
      for (let i = 0; i <= Math.floor(d / 2); i++) {
        const fz = rz - d / 2 + (i * d) / Math.floor(d / 2);
        const farRailHeight = YARD_FENCE_HEIGHT * 0.35;
        cube(0.06, farRailHeight, d / Math.floor(d / 2), rx - w / 2, YARD_FENCE_HEIGHT * 0.55, fz, '#f8f4e8', roomGroup, false);
        cube(0.06, CUTAWAY_SILL_HEIGHT, d / Math.floor(d / 2), rx + w / 2, CUTAWAY_SILL_HEIGHT / 2, fz, '#f8f4e8', roomGroup, false);
      }
      const gate = room.connections.find((c) => c.to === 'room-10');
      if (gate) {
        const gx = rx + gate.offset;
        cube(gate.width, CUTAWAY_SILL_HEIGHT, 0.12, gx, CUTAWAY_SILL_HEIGHT / 2, rz - d / 2, p.wood, roomGroup, false);
      }
    }
  }
  if (unlocked.size) {
    const { minX, maxX, minZ, maxZ } = worldBoundsForRooms(unlockedIds);
    const width = maxX - minX;
    const depth = maxZ - minZ;
    cube(width, BACK_WALL_HEIGHT, WALL_THICKNESS, (minX + maxX) / 2, BACK_WALL_HEIGHT / 2, minZ, p.wall, roomGroup);
    cube(WALL_THICKNESS, BACK_WALL_HEIGHT, depth, minX, BACK_WALL_HEIGHT / 2, (minZ + maxZ) / 2, p.wallSide, roomGroup);
    cube(width + 0.12, 0.06, 0.15, (minX + maxX) / 2, BACK_WALL_HEIGHT + 0.03, minZ, p.trim, roomGroup, false);
    cube(0.15, 0.06, depth + 0.12, minX, BACK_WALL_HEIGHT + 0.03, (minZ + maxZ) / 2, p.trim, roomGroup, false);
    if (unlocked.has('room-1')) {
      const x = Math.max(minX + 1, Math.min(maxX - 1, 0.2));
      cube(1.7, 1.15, .06, x, 1.48, minZ + .11, p.windowFrame, roomGroup);
      cube(1.54, .99, .07, x, 1.48, minZ + .18, p.windowGlass, roomGroup);
      cube(.05, 1, .08, x, 1.48, minZ + .25, p.windowMullion, roomGroup);
      cube(1.55, .05, .08, x, 1.48, minZ + .25, p.windowMullion, roomGroup);
      cube(1.85, .08, .2, x, .91, minZ + .25, p.sill, roomGroup);
    }
  }
}

export function worldBoundsForRooms(unlockedIds: string[], extraHeights: number[] = []) {
  const unlocked = new Set(unlockedIds);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  let maxY = 2.4;
  for (const room of allRooms) {
    if (!unlocked.has(room.id)) continue;
    minX = Math.min(minX, room.position[0] - room.size[0] / 2);
    maxX = Math.max(maxX, room.position[0] + room.size[0] / 2);
    minZ = Math.min(minZ, room.position[1] - room.size[1] / 2);
    maxZ = Math.max(maxZ, room.position[1] + room.size[1] / 2);
    if (room.kind === 'yard') maxY = Math.max(maxY, 7.5);
  }
  for (const h of extraHeights) maxY = Math.max(maxY, h);
  return { minX, maxX, minZ, maxZ, maxY, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2 };
}
