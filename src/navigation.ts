import { footprint } from './furniture';
import { catalog, type Item } from './store';
import { rooms as allRooms, type SceneRoom, type RoomSide } from './scene-types';
import { BOT_RADIUS } from './bot-metrics';

export const GRID_STEP = 0.5;
export const WALL_HALF_THICKNESS = 0.06;
export const FURNITURE_CLEARANCE = BOT_RADIUS + 0.06;
export const WALL_CLEARANCE = BOT_RADIUS + WALL_HALF_THICKNESS + 0.06;
export const DOOR_JAMB_CLEARANCE = BOT_RADIUS + 0.06;
export const WALL_BOX_CLEARANCE = WALL_CLEARANCE - WALL_HALF_THICKNESS;
export const PLACEMENT_CLEARANCE = 0.05;

type Cell = [number, number];
type Rect = { x: number; z: number; w: number; d: number };
export type DecorBlock = Rect & { id?: string; roomId?: string };
type WallBox = Rect & { roomId: string; side: RoomSide };
const key = (x: number, z: number) => `${x},${z}`;

let active: SceneRoom[] = allRooms.filter((room) => room.initial);
const decorBlocks: DecorBlock[] = [];
let cachedWalls: WallBox[] | null = null;
let cachedWallKey = '';

export function setActiveRooms(ids: string[]) {
  active = allRooms.filter((room) => ids.includes(room.id));
  cachedWalls = null;
}

export function getActiveRoomIds() {
  return active.map((room) => room.id);
}

export function setDecorBlocks(blocks: DecorBlock[]) {
  decorBlocks.length = 0;
  decorBlocks.push(...blocks.map((block) => ({ ...block })));
}

export function getDecorBlocks() {
  return decorBlocks.map((block) => ({ ...block }));
}

function pointAabbDistance(x: number, z: number, rect: Rect) {
  const dx = Math.max(Math.abs(x - rect.x) - rect.w / 2, 0);
  const dz = Math.max(Math.abs(z - rect.z) - rect.d / 2, 0);
  return Math.hypot(dx, dz);
}

function roomAt(x: number, z: number) {
  for (const room of active) {
    if (room.walkable === false) continue;
    if (
      Math.abs(x - room.position[0]) <= room.size[0] / 2 + 0.001 &&
      Math.abs(z - room.position[1]) <= room.size[1] / 2 + 0.001
    ) return room;
  }
  return undefined;
}

function poolRect(): Rect | undefined {
  const pool = allRooms.find((room) => room.id === 'pool-main');
  if (!pool || !active.some((room) => room.id === 'yard-main')) return undefined;
  return { x: pool.position[0], z: pool.position[1], w: pool.size[0], d: pool.size[1] };
}

function poolBlock(x: number, z: number) {
  const pool = poolRect();
  return Boolean(pool && pointAabbDistance(x, z, pool) < FURNITURE_CLEARANCE - 1e-8);
}

function openConnections(room: SceneRoom, side: RoomSide) {
  return room.connections.filter((connection) => connection.side === side && active.some((other) => other.id === connection.to));
}

function sideEdge(room: SceneRoom, side: RoomSide) {
  if (side === 'east') return room.position[0] + room.size[0] / 2;
  if (side === 'west') return room.position[0] - room.size[0] / 2;
  if (side === 'south') return room.position[1] + room.size[1] / 2;
  return room.position[1] - room.size[1] / 2;
}

function wallBoxes(): WallBox[] {
  const activeKey = active.map((room) => room.id).join('|');
  if (cachedWalls && cachedWallKey === activeKey) return cachedWalls;
  const result: WallBox[] = [];
  for (const room of active) {
    if (room.walkable === false) continue;
    for (const side of ['north', 'south', 'east', 'west'] as const) {
      const horizontal = side === 'east' || side === 'west';
      const alongCenter = horizontal ? room.position[1] : room.position[0];
      const half = (horizontal ? room.size[1] : room.size[0]) / 2;
      const low = alongCenter - half;
      const high = alongCenter + half;
      const openings = openConnections(room, side)
        .map((connection) => ({ lo: alongCenter + connection.offset - connection.width / 2, hi: alongCenter + connection.offset + connection.width / 2 }))
        .sort((a, b) => a.lo - b.lo);
      const merged: { lo: number; hi: number }[] = [];
      for (const opening of openings) {
        const last = merged[merged.length - 1];
        if (last && opening.lo <= last.hi) last.hi = Math.max(last.hi, opening.hi);
        else merged.push({ ...opening });
      }
      let cursor = low;
      const edge = sideEdge(room, side);
      const add = (lo: number, hi: number) => {
        if (hi - lo <= 0.001) return;
        result.push(horizontal
          ? { x: edge, z: (lo + hi) / 2, w: WALL_HALF_THICKNESS * 2, d: hi - lo, roomId: room.id, side }
          : { x: (lo + hi) / 2, z: edge, w: hi - lo, d: WALL_HALF_THICKNESS * 2, roomId: room.id, side });
      };
      for (const opening of merged) {
        add(cursor, Math.max(cursor, Math.min(high, opening.lo)));
        cursor = Math.max(cursor, Math.min(high, opening.hi));
      }
      add(cursor, high);
    }
  }
  cachedWalls = result;
  cachedWallKey = activeKey;
  return result;
}

function hitsFurnitureOrDecor(x: number, z: number, items: Item[], furniturePadding = FURNITURE_CLEARANCE) {
  for (const block of decorBlocks) {
    if (pointAabbDistance(x, z, block) < furniturePadding - 1e-8) return true;
  }
  for (const item of items) {
    const [w, d] = footprint(item);
    if (pointAabbDistance(x, z, { x: item.x, z: item.z, w, d }) < furniturePadding - 1e-8) return true;
  }
  return false;
}

function hitsWall(x: number, z: number) {
  return wallBoxes().some((wall) => pointAabbDistance(x, z, wall) < WALL_BOX_CLEARANCE - 1e-8);
}

export function blocked(x: number, z: number, items: Item[], _padding = FURNITURE_CLEARANCE) {
  if (poolBlock(x, z)) return true;
  if (!roomAt(x, z)) return true;
  if (hitsWall(x, z)) return true;
  return hitsFurnitureOrDecor(x, z, items);
}

/** Signed clearance from the bot centre to the closest collision box, minus its radius. */
export function clearanceAt(x: number, z: number, items: Item[]) {
  let nearest = Infinity;
  for (const block of decorBlocks) nearest = Math.min(nearest, pointAabbDistance(x, z, block));
  for (const item of items) {
    const [w, d] = footprint(item);
    nearest = Math.min(nearest, pointAabbDistance(x, z, { x: item.x, z: item.z, w, d }));
  }
  for (const wall of wallBoxes()) nearest = Math.min(nearest, pointAabbDistance(x, z, wall));
  const pool = poolRect();
  if (pool) nearest = Math.min(nearest, pointAabbDistance(x, z, pool));
  return nearest - BOT_RADIUS;
}

function roomBounds(room: SceneRoom, margin = 0.25) {
  return {
    left: room.position[0] - room.size[0] / 2 + margin,
    right: room.position[0] + room.size[0] / 2 - margin,
    top: room.position[1] - room.size[1] / 2 + margin,
    bottom: room.position[1] + room.size[1] / 2 - margin,
  };
}

function intersects(a: Rect, b: Rect, padding = 0) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 + padding - 1e-8 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 + padding - 1e-8;
}

function intersectsDoorCorridor(item: Item, w: number, d: number, room: SceneRoom) {
  for (const connection of room.connections) {
    const horizontal = connection.side === 'east' || connection.side === 'west';
    const edge = sideEdge(room, connection.side);
    const alongCenter = horizontal ? room.position[1] + connection.offset : room.position[0] + connection.offset;
    const normalCenter = horizontal ? item.x : item.z;
    const alongItem = horizontal ? item.z : item.x;
    const normalHalf = (horizontal ? w : d) / 2;
    const alongHalf = (horizontal ? d : w) / 2;
    if (
      Math.abs(normalCenter - edge) < normalHalf + 0.7 &&
      Math.abs(alongItem - alongCenter) < alongHalf + connection.width / 2 + PLACEMENT_CLEARANCE
    ) return true;
  }
  return false;
}

export function validPlacement(item: Item, items: Item[]) {
  const [w, d] = footprint(item);
  const room = active.find((candidate) => candidate.id === item.roomId);
  if (!room || room.walkable === false) return false;
  const bounds = roomBounds(room);
  if (item.x - w / 2 < bounds.left || item.x + w / 2 > bounds.right || item.z - d / 2 < bounds.top || item.z + d / 2 > bounds.bottom) return false;
  if (intersectsDoorCorridor(item, w, d, room)) return false;
  const candidate = { x: item.x, z: item.z, w, d };
  if (decorBlocks.some((block) => intersects(candidate, block, PLACEMENT_CLEARANCE))) return false;
  for (const other of items) {
    if (other.id === item.id) continue;
    const [ow, od] = footprint(other);
    if (intersects(candidate, { x: other.x, z: other.z, w: ow, d: od }, PLACEMENT_CLEARANCE)) return false;
  }
  return true;
}

function crossable(ax: number, az: number, bx: number, bz: number) {
  const a = roomAt(ax, az);
  const b = roomAt(bx, bz);
  if (!a || !b) return false;
  if (a.id === b.id) return true;
  return a.connections.some((connection) => {
    if (connection.to !== b.id || !active.some((room) => room.id === connection.to)) return false;
    const horizontal = connection.side === 'east' || connection.side === 'west';
    const along = horizontal ? (az + bz) / 2 - a.position[1] : (ax + bx) / 2 - a.position[0];
    return Math.abs(along - connection.offset) <= connection.width / 2 - DOOR_JAMB_CLEARANCE + 1e-8;
  });
}

/** Conservative sampled visibility: 4 cm spacing, with all nav clearances already applied. */
export function segmentClear(x0: number, z0: number, x1: number, z1: number, items: Item[]) {
  const length = Math.hypot(x1 - x0, z1 - z0);
  const count = Math.max(1, Math.ceil(length / 0.04));
  let previous: Cell | undefined;
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const x = x0 + (x1 - x0) * t;
    const z = z0 + (z1 - z0) * t;
    if (blocked(x, z, items)) return false;
    if (previous && !crossable(previous[0], previous[1], x, z)) return false;
    previous = [x, z];
  }
  return true;
}

export function path(sx: number, sz: number, tx: number, tz: number, items: Item[]): Cell[] {
  const start: Cell = [Math.round(sx / GRID_STEP), Math.round(sz / GRID_STEP)];
  const end: Cell = [Math.round(tx / GRID_STEP), Math.round(tz / GRID_STEP)];
  if (blocked(tx, tz, items) || blocked(end[0] * GRID_STEP, end[1] * GRID_STEP, items)) return [];
  const queue: Cell[] = [start];
  let head = 0;
  const prev = new Map<string, string | null>([[key(...start), null]]);
  let found: Cell | undefined;
  while (head < queue.length) {
    const cell = queue[head++];
    if (cell[0] === end[0] && cell[1] === end[1]) { found = cell; break; }
    for (const [dx, dz, diagonal] of [
      [1, 0, false], [-1, 0, false], [0, 1, false], [0, -1, false],
      [1, 1, true], [1, -1, true], [-1, 1, true], [-1, -1, true],
    ] as const) {
      const gx = cell[0] + dx;
      const gz = cell[1] + dz;
      const k = key(gx, gz);
      const x = gx * GRID_STEP;
      const z = gz * GRID_STEP;
      if (prev.has(k) || blocked(x, z, items)) continue;
      if (diagonal && (blocked((cell[0] + dx) * GRID_STEP, cell[1] * GRID_STEP, items) || blocked(cell[0] * GRID_STEP, (cell[1] + dz) * GRID_STEP, items))) continue;
      if (!crossable(cell[0] * GRID_STEP, cell[1] * GRID_STEP, x, z)) continue;
      prev.set(k, key(...cell));
      queue.push([gx, gz]);
    }
  }
  if (!found) return [];
  const raw: Cell[] = [];
  let cursor: string | null = key(...found);
  while (cursor && cursor !== key(...start)) {
    const [x, z] = cursor.split(',').map(Number);
    raw.unshift([x * GRID_STEP, z * GRID_STEP]);
    cursor = prev.get(cursor) ?? null;
  }
  const candidates: Cell[] = [[sx, sz], ...raw];
  if (Math.hypot(candidates[candidates.length - 1][0] - tx, candidates[candidates.length - 1][1] - tz) > 1e-5) candidates.push([tx, tz]);
  const smoothed: Cell[] = [];
  let at = 0;
  while (at < candidates.length - 1) {
    let farthest = at + 1;
    for (let i = candidates.length - 1; i > at + 1; i--) {
      if (segmentClear(candidates[at][0], candidates[at][1], candidates[i][0], candidates[i][1], items)) { farthest = i; break; }
    }
    smoothed.push(candidates[farthest]);
    at = farthest;
  }
  return smoothed;
}

export function trimPathEnd(waypoints: Cell[], end: Cell, minDist = 0.5) {
  const out = waypoints.slice();
  while (out.length && Math.hypot(out[out.length - 1][0] - end[0], out[out.length - 1][1] - end[1]) < minDist) out.pop();
  return out;
}

function flood(start: Cell, items: Item[]) {
  const sx = Math.round(start[0] / GRID_STEP);
  const sz = Math.round(start[1] / GRID_STEP);
  const queue: Cell[] = [[sx, sz]];
  let head = 0;
  const seen = new Set([key(sx, sz)]);
  const visitedRooms = new Set<string>();
  while (head < queue.length) {
    const [x, z] = queue[head++];
    const room = roomAt(x * GRID_STEP, z * GRID_STEP);
    if (room) visitedRooms.add(room.id);
    for (const [ox, oz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      const nx = x + ox;
      const nz = z + oz;
      const k = key(nx, nz);
      if (seen.has(k) || blocked(nx * GRID_STEP, nz * GRID_STEP, items)) continue;
      if (ox !== 0 && oz !== 0 && (blocked((x + ox) * GRID_STEP, z * GRID_STEP, items) || blocked(x * GRID_STEP, (z + oz) * GRID_STEP, items))) continue;
      if (!crossable(x * GRID_STEP, z * GRID_STEP, nx * GRID_STEP, nz * GRID_STEP)) continue;
      seen.add(k);
      queue.push([nx, nz]);
    }
  }
  return { seen, visitedRooms };
}

export function preservesConnectivity(start: Cell, delivery: Cell, items: Item[]) {
  if (blocked(start[0], start[1], items) || blocked(delivery[0], delivery[1], items)) return false;
  const { seen, visitedRooms } = flood(start, items);
  const dx = Math.round(delivery[0] / GRID_STEP);
  const dz = Math.round(delivery[1] / GRID_STEP);
  return seen.has(key(dx, dz)) && active.filter((room) => room.walkable !== false).every((room) => visitedRooms.has(room.id));
}

export function canUnlockRoom(id: string, start: Cell, items: Item[]) {
  const previous = active;
  try {
    active = allRooms.filter((room) => previous.some((a) => a.id === room.id) || room.id === id);
    return preservesConnectivity(start, start, items);
  } finally { active = previous; }
}

export function freeTarget(items: Item[]) {
  const free: Cell[] = [];
  for (const room of active) {
    if (room.walkable === false) continue;
    const bounds = roomBounds(room, 0.75);
    for (let x = Math.ceil(bounds.left / GRID_STEP); x <= Math.floor(bounds.right / GRID_STEP); x++) {
      for (let z = Math.ceil(bounds.top / GRID_STEP); z <= Math.floor(bounds.bottom / GRID_STEP); z++) {
        if (!blocked(x * GRID_STEP, z * GRID_STEP, items)) free.push([x * GRID_STEP, z * GRID_STEP]);
      }
    }
  }
  return free.length ? free[Math.floor(Math.random() * free.length)] : [0, 2] as Cell;
}

export function interactionStandPoints(item: Item, items: Item[]): Cell[] {
  const [w, d] = footprint(item);
  const preferred = [0, 0] as Cell;
  const [localX, localZ] = catalog[item.type].interaction;
  preferred[0] = item.x + localX * Math.cos(item.rotation) + localZ * Math.sin(item.rotation);
  preferred[1] = item.z - localX * Math.sin(item.rotation) + localZ * Math.cos(item.rotation);
  const desiredDx = preferred[0] - item.x;
  const desiredDz = preferred[1] - item.z;
  const points: { point: Cell; score: number; distance: number }[] = [];
  const left = Math.floor((item.x - w / 2 - 1.5) / GRID_STEP);
  const right = Math.ceil((item.x + w / 2 + 1.5) / GRID_STEP);
  const top = Math.floor((item.z - d / 2 - 1.5) / GRID_STEP);
  const bottom = Math.ceil((item.z + d / 2 + 1.5) / GRID_STEP);
  for (let gx = left; gx <= right; gx++) for (let gz = top; gz <= bottom; gz++) {
    const x = gx * GRID_STEP;
    const z = gz * GRID_STEP;
    const distance = pointAabbDistance(x, z, { x: item.x, z: item.z, w, d });
    if (distance < FURNITURE_CLEARANCE - 1e-8 || distance > FURNITURE_CLEARANCE + 0.75 || blocked(x, z, items)) continue;
    const length = Math.hypot(x - item.x, z - item.z) || 1;
    const alignment = ((x - item.x) * desiredDx + (z - item.z) * desiredDz) / (length * (Math.hypot(desiredDx, desiredDz) || 1));
    points.push({ point: [x, z], score: -alignment, distance });
  }
  return points.sort((a, b) => a.score - b.score || a.distance - b.distance).map(({ point }) => point);
}

/** All unlocked walkable rooms reachable from a start; pool-main remains blocked. */
export function allRoomsReachableFrom(start: Cell, items: Item[], unlockedIds: string[]) {
  const previous = active;
  try {
    active = allRooms.filter((room) => unlockedIds.includes(room.id) && room.walkable !== false);
    if (blocked(start[0], start[1], items)) return false;
    const { visitedRooms } = flood(start, items);
    return active.every((room) => visitedRooms.has(room.id));
  } finally { active = previous; }
}

export function roomReachability(start: Cell, items: Item[], unlockedIds: string[]) {
  const previous = active;
  try {
    active = allRooms.filter((room) => unlockedIds.includes(room.id) && room.walkable !== false);
    if (blocked(start[0], start[1], items)) return Object.fromEntries(active.map((room) => [room.id, false])) as Record<string, boolean>;
    const { visitedRooms } = flood(start, items);
    return Object.fromEntries(active.map((room) => [room.id, visitedRooms.has(room.id)])) as Record<string, boolean>;
  } finally { active = previous; }
}

export function doorPairsValid(unlockedIds: string[]) {
  const unlocked = new Set(unlockedIds);
  for (const room of allRooms) {
    if (!unlocked.has(room.id)) continue;
    for (const connection of room.connections) {
      if (!unlocked.has(connection.to)) continue;
      const other = allRooms.find((candidate) => candidate.id === connection.to);
      if (!other || !other.connections.some((back) => back.to === room.id)) return false;
    }
  }
  return true;
}
