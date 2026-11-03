import * as THREE from 'three';
import { flatMaterial, look } from './look';
import { mergeRoomFloorBoards } from './decor-builder';
import { rooms as allRooms, type SceneRoom } from './scene-types';

type WallSide = 'north' | 'west' | 'south' | 'east';

const WALL_THICKNESS = 0.12;
const BACK_WALL_HEIGHT = 2.35;
const CUTAWAY_SILL_HEIGHT = 0.22;
const DOOR_POST_HEIGHT = 0.28;
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

function sharesRoomEdge(room: SceneRoom, side: WallSide) {
  const [rx, rz] = room.position;
  const [w, d] = room.size;
  const overlaps = (a0: number, a1: number, b0: number, b1: number) =>
    Math.min(a1, b1) - Math.max(a0, b0) > 0.05;

  return allRooms.some((other) => {
    if (other.id === room.id) return false;
    const [ox, oz] = other.position;
    const [ow, od] = other.size;
    if (side === 'north') {
      return Math.abs(rz - d / 2 - (oz + od / 2)) < 0.02 && overlaps(rx - w / 2, rx + w / 2, ox - ow / 2, ox + ow / 2);
    }
    if (side === 'south') {
      return Math.abs(rz + d / 2 - (oz - od / 2)) < 0.02 && overlaps(rx - w / 2, rx + w / 2, ox - ow / 2, ox + ow / 2);
    }
    if (side === 'east') {
      return Math.abs(rx + w / 2 - (ox - ow / 2)) < 0.02 && overlaps(rz - d / 2, rz + d / 2, oz - od / 2, oz + od / 2);
    }
    return Math.abs(rx - w / 2 - (ox + ow / 2)) < 0.02 && overlaps(rz - d / 2, rz + d / 2, oz - od / 2, oz + od / 2);
  });
}

function drawWallSpan(
  room: SceneRoom,
  side: WallSide,
  start: number,
  length: number,
  height: number,
  color: string,
  parent: THREE.Object3D,
  cast: boolean,
) {
  if (length <= 0.05) return;
  const [rx, rz] = room.position;
  const [w, d] = room.size;
  if (side === 'east' || side === 'west') {
    const edge = rx + (side === 'east' ? 1 : -1) * (w / 2);
    cube(WALL_THICKNESS, height, length, edge, height / 2, start + length / 2, color, parent, cast);
  } else {
    const edge = rz + (side === 'south' ? 1 : -1) * (d / 2);
    cube(length, height, WALL_THICKNESS, start + length / 2, height / 2, edge, color, parent, cast);
  }
}

function drawDoorFrame(
  edge: number,
  mid: number,
  width: number,
  horizontal: boolean,
  p: typeof look.palette,
  parent: THREE.Object3D,
) {
  for (const postMid of [mid - width / 2, mid + width / 2]) {
    if (horizontal) cube(WALL_THICKNESS, DOOR_POST_HEIGHT, WALL_THICKNESS, edge, DOOR_POST_HEIGHT / 2, postMid, p.trim, parent, false);
    else cube(WALL_THICKNESS, DOOR_POST_HEIGHT, WALL_THICKNESS, postMid, DOOR_POST_HEIGHT / 2, edge, p.trim, parent, false);
  }
  // A thin contrasting threshold keeps the open doorway legible without blocking the path.
  if (horizontal) cube(WALL_THICKNESS, 0.025, width, edge, 0.0725, mid, p.trim, parent, false);
  else cube(width, 0.025, WALL_THICKNESS, mid, 0.0725, edge, p.trim, parent, false);
}

function drawWallEdge(
  room: SceneRoom,
  side: WallSide,
  doors: SceneRoom['connections'],
  p: typeof look.palette,
  parent: THREE.Object3D,
) {
  const [rx, rz] = room.position;
  const [w, d] = room.size;
  const horizontal = side === 'east' || side === 'west';
  const edge = horizontal
    ? rx + (side === 'east' ? 1 : -1) * (w / 2)
    : rz + (side === 'south' ? 1 : -1) * (d / 2);
  const axisCenter = horizontal ? rz : rx;
  const edgeLength = horizontal ? d : w;
  const edgeStart = axisCenter - edgeLength / 2;
  const edgeEnd = edgeStart + edgeLength;
  const near = side === 'south' || side === 'east';
  // Shared edges become low too: from +X,+Z a tall neighbor wall can sit in front of this room.
  const cutaway = near || sharesRoomEdge(room, side);
  const wallHeight = cutaway ? CUTAWAY_SILL_HEIGHT : BACK_WALL_HEIGHT;
  const color = cutaway ? p.lowWall : side === 'west' ? p.wallSide : p.wall;
  const openings = doors
    .map((door) => {
      const mid = axisCenter + door.offset;
      return { mid, start: Math.max(edgeStart, mid - door.width / 2), end: Math.min(edgeEnd, mid + door.width / 2) };
    })
    .filter((door) => door.end - door.start > 0.05)
    .sort((a, b) => a.start - b.start);

  let cursor = edgeStart;
  for (const opening of openings) {
    drawWallSpan(room, side, cursor, opening.start - cursor, wallHeight, color, parent, !cutaway);
    drawDoorFrame(edge, opening.mid, opening.end - opening.start, horizontal, p, parent);
    cursor = Math.max(cursor, opening.end);
  }
  drawWallSpan(room, side, cursor, edgeEnd - cursor, wallHeight, color, parent, !cutaway);

  if (!cutaway) {
    const trimY = wallHeight + 0.03;
    if (side === 'north') cube(w + 0.14, 0.06, 0.15, rx, trimY, edge, p.trim, parent, false);
    else if (side === 'west') cube(0.15, 0.06, d, edge, trimY, rz, p.trim, parent, false);
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
    for (const side of ['north', 'west', 'south', 'east'] as const) {
      const doors = room.connections.filter((c) => c.side === side && unlocked.has(c.to));
      if (room.walls.includes(side) || doors.length) drawWallEdge(room, side, doors, p, roomGroup);
    }
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
