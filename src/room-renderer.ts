import * as THREE from 'three';
import { flatMaterial, look } from './look';
import { mergeRoomFloorBoards } from './decor-builder';
import { rooms as allRooms, type SceneRoom } from './scene-types';
import { roomSurfaceMaterial } from './room-surfaces';

const WALL_THICKNESS = 0.12;
const BACK_WALL_HEIGHT = 2.35;
const CUTAWAY_SILL_HEIGHT = 0.22;
const YARD_FENCE_HEIGHT = 1.1;
const BASEBOARD_COLOR = '#ad9a83';

function cube(
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  color: string | THREE.Material,
  parent: THREE.Object3D,
  cast = true,
) {
  const material = typeof color === 'string' ? flatMaterial(color) : color;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  if (cast) mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Rear-facing edges follow the actual unlocked footprint, including steps. */
function drawRearEdge(room: SceneRoom, side: 'north' | 'west', active: SceneRoom[], parent: THREE.Group) {
  const north = side === 'north';
  const [x, z] = room.position, [w, d] = room.size;
  const edge = north ? z - d / 2 : x - w / 2;
  const start = north ? x - w / 2 : z - d / 2;
  const end = north ? x + w / 2 : z + d / 2;
  const adjoining = active.filter((other) => {
    if (other.id === room.id || other.kind === 'pool') return false;
    const [ox, oz] = other.position, [ow, od] = other.size;
    const opposite = north ? oz + od / 2 : ox + ow / 2;
    const a = north ? ox - ow / 2 : oz - od / 2;
    const b = north ? ox + ow / 2 : oz + od / 2;
    return Math.abs(edge - opposite) < 0.02 && Math.min(end, b) - Math.max(start, a) > 0.05;
  });
  const spans = adjoining.map((other) => {
    const center = north ? other.position[0] : other.position[1];
    const half = (north ? other.size[0] : other.size[1]) / 2;
    const ownDoor = room.connections.find((c) => c.to === other.id);
    const theirDoor = other.connections.find((c) => c.to === room.id);
    const door = ownDoor || theirDoor;
    const doorCenter = door ? (ownDoor ? (north ? x : z) : center) + door.offset : 0;
    return { start: Math.max(start, center - half), end: Math.min(end, center + half),
      doorStart: door ? doorCenter - door.width / 2 : Infinity,
      doorEnd: door ? doorCenter + door.width / 2 : Infinity };
  });
  const cuts = [start, end];
  for (const span of spans) for (const v of [span.start, span.end, span.doorStart, span.doorEnd]) {
    if (v > start && v < end) cuts.push(v);
  }
  cuts.sort((a, b) => a - b);
  for (let i = 1; i < cuts.length; i++) {
    const a = cuts[i - 1], b = cuts[i], middle = (a + b) / 2;
    if (b - a < 0.01) continue;
    const shared = spans.find((span) => middle > span.start && middle < span.end);
    if (shared && middle > shared.doorStart && middle < shared.doorEnd) continue;
    const h = shared ? CUTAWAY_SILL_HEIGHT : BACK_WALL_HEIGHT;
    const color = shared
      ? look.palette.lowWall
      : roomSurfaceMaterial(room.id, 'wallpaper', { wallSide: side });
    if (north) cube(b - a, h, WALL_THICKNESS, middle, h / 2, edge, color, parent, !shared);
    else cube(WALL_THICKNESS, h, b - a, edge, h / 2, middle, color, parent, !shared);
    if (!shared) {
      if (north) cube(b - a, .06, .15, middle, h + .03, edge, look.palette.trim, parent, false);
      else cube(.15, .06, b - a, edge, h + .03, middle, look.palette.trim, parent, false);
      if (north) cube(b - a, .12, .08, middle, .12, edge + WALL_THICKNESS * .65, BASEBOARD_COLOR, parent, false);
      else cube(.08, .12, b - a, edge + WALL_THICKNESS * .65, .12, middle, BASEBOARD_COLOR, parent, false);
    }
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
    cube(w, 0.12, d, rx, 0, rz, roomSurfaceMaterial(room.id, 'floor', { roomSize: room.size }), roomGroup);
    if (room.kind === 'yard') {
      const line = p.floorLines[room.id] ?? p.floorLine;
      const boardCount = Math.max(8, Math.floor(Math.max(w, d) * 2));
      mergeRoomFloorBoards(roomGroup, rx, rz, w, d, line, boardCount);
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
    const active = allRooms.filter((room) => unlocked.has(room.id));
    for (const room of active) {
      if (room.kind === 'yard' || room.kind === 'pool') continue;
      drawRearEdge(room, 'north', active, roomGroup);
      drawRearEdge(room, 'west', active, roomGroup);
    }
    if (unlocked.has('room-1')) {
      const x = 0.2;
      const backRoom = active.filter((room) => room.kind !== 'yard' && room.kind !== 'pool' &&
        x > room.position[0] - room.size[0] / 2 && x < room.position[0] + room.size[0] / 2)
        .sort((a, b) => (a.position[1] - a.size[1] / 2) - (b.position[1] - b.size[1] / 2))[0];
      const minZ = backRoom.position[1] - backRoom.size[1] / 2;
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
