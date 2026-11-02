import * as THREE from 'three';
import { flatMaterial, look } from './look';
import { mergeRoomFloorBoards } from './decor-builder';
import { rooms as allRooms, type SceneRoom } from './scene-types';

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

function drawDoorSegments(
  room: SceneRoom,
  c: SceneRoom['connections'][number],
  p: typeof look.palette,
  parent: THREE.Object3D,
) {
  if (c.side !== 'north' && c.side !== 'south' && c.side !== 'east' && c.side !== 'west') return;
  const horizontal = c.side === 'east' || c.side === 'west';
  const edge = horizontal
    ? room.position[0] + (c.side === 'east' ? 1 : -1) * (room.size[0] / 2)
    : room.position[1] + (c.side === 'south' ? 1 : -1) * (room.size[1] / 2);
  const mid = (horizontal ? room.position[1] : room.position[0]) + c.offset;
  const half = (horizontal ? room.size[1] : room.size[0]) / 2;
  const start = (horizontal ? room.position[1] : room.position[0]) - half;
  const left = mid - c.width / 2 - start;
  const right = start + half * 2 - (mid + c.width / 2);
  if (left > 0.05) {
    if (horizontal) cube(0.12, 0.48, left, edge, 0.26, start + left / 2, p.lowWall, parent);
    else cube(left, 0.48, 0.12, start + left / 2, 0.26, edge, p.lowWall, parent);
  }
  if (right > 0.05) {
    if (horizontal) cube(0.12, 0.48, right, edge, 0.26, mid + c.width / 2 + right / 2, p.lowWall, parent);
    else cube(right, 0.48, 0.12, mid + c.width / 2 + right / 2, 0.26, edge, p.lowWall, parent);
  }
}

function drawFullWall(
  room: SceneRoom,
  side: 'north' | 'west' | 'south' | 'east',
  p: typeof look.palette,
  parent: THREE.Object3D,
) {
  const [rx, rz] = room.position;
  const [w, d] = room.size;
  /** Default iso camera sits at +X,+Z — south/east walls stay low for dollhouse view. */
  const near = side === 'south' || side === 'east';
  const wallH = near ? 0.48 : 2.35;
  const y = near ? 0.26 : 1.18;
  const trimY = near ? 0.52 : 2.37;
  const trimH = near ? 0.06 : 0.06;
  if (side === 'north') {
    cube(w + 0.12, wallH, 0.12, rx, y, rz - d / 2, p.wall, parent, !near);
    if (!near) cube(w + 0.14, trimH, 0.15, rx, trimY, rz - d / 2, p.trim, parent, false);
  } else if (side === 'west') {
    cube(0.12, wallH, d, rx - w / 2, y, rz, p.wallSide, parent, !near);
    if (!near) cube(0.15, trimH, d, rx - w / 2, trimY, rz, p.trim, parent, false);
  } else if (side === 'south') {
    cube(w + 0.12, wallH, 0.12, rx, y, rz + d / 2, p.lowWall, parent, false);
  } else if (side === 'east') {
    cube(0.12, wallH, d, rx + w / 2, y, rz, p.lowWall, parent, false);
  }
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
    for (const side of room.walls) drawFullWall(room, side, p, roomGroup);
    for (const c of room.connections) {
      if (!unlocked.has(c.to)) continue;
      drawDoorSegments(room, c, p, roomGroup);
    }
    if (room.kind === 'yard') {
      const fenceH = 1.1;
      const posts = Math.floor(w / 2);
      const postGeo = new THREE.BoxGeometry(0.08, fenceH, 0.08);
      const postMat = flatMaterial(p.trim);
      const northPosts = new THREE.InstancedMesh(postGeo, postMat, posts + 1);
      const southPosts = new THREE.InstancedMesh(postGeo, postMat, posts + 1);
      const m = new THREE.Matrix4();
      for (let i = 0; i <= posts; i++) {
        const fx = rx - w / 2 + (i * w) / posts;
        m.makeTranslation(fx, fenceH / 2, rz + d / 2);
        northPosts.setMatrixAt(i, m);
        m.makeTranslation(fx, fenceH / 2, rz - d / 2);
        southPosts.setMatrixAt(i, m);
      }
      northPosts.instanceMatrix.needsUpdate = true;
      southPosts.instanceMatrix.needsUpdate = true;
      northPosts.castShadow = false;
      southPosts.castShadow = false;
      roomGroup.add(northPosts, southPosts);
      for (let i = 0; i <= Math.floor(d / 2); i++) {
        const fz = rz - d / 2 + (i * d) / Math.floor(d / 2);
        cube(0.06, fenceH * 0.35, d / Math.floor(d / 2), rx - w / 2, fenceH * 0.55, fz, '#f8f4e8', roomGroup, false);
        cube(0.06, fenceH * 0.35, d / Math.floor(d / 2), rx + w / 2, fenceH * 0.55, fz, '#f8f4e8', roomGroup, false);
      }
      const gate = room.connections.find((c) => c.to === 'room-10');
      if (gate) {
        const gx = rx + gate.offset;
        cube(gate.width, fenceH * 0.5, 0.12, gx, fenceH * 0.25, rz - d / 2, p.wood, roomGroup);
      }
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
