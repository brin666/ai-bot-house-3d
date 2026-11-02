import { BOT_CLEARANCE } from './bot-metrics';
import { footprint } from './furniture';
import type { Item } from './store';
import { rooms as allRooms, type SceneRoom } from './scene-types';

type Cell = [number, number];
const step = 0.5;
const key = (x: number, z: number) => `${x},${z}`;

let active: SceneRoom[] = allRooms.filter((r) => r.initial);
const decorBlocks: { x: number; z: number; w: number; d: number }[] = [];

export function setActiveRooms(ids: string[]) {
  active = allRooms.filter((r) => ids.includes(r.id));
}

export function setDecorBlocks(blocks: { x: number; z: number; w: number; d: number }[]) {
  decorBlocks.length = 0;
  decorBlocks.push(...blocks);
}

function roomAt(x: number, z: number) {
  for (const r of active) {
    if (Math.abs(x - r.position[0]) <= r.size[0] / 2 + 0.001 && Math.abs(z - r.position[1]) <= r.size[1] / 2 + 0.001) {
      if (r.walkable === false) return undefined;
      return r;
    }
  }
  return undefined;
}

function poolBlock(x: number, z: number) {
  const pool = allRooms.find((r) => r.id === 'pool-main');
  if (!pool || !active.some((a) => a.id === 'yard-main')) return false;
  return (
    Math.abs(x - pool.position[0]) <= pool.size[0] / 2 + 0.02 &&
    Math.abs(z - pool.position[1]) <= pool.size[1] / 2 + 0.02
  );
}

function inside(x: number, z: number, padding = BOT_CLEARANCE) {
  return active.some((r) => {
    if (r.walkable === false) return false;
    return (
      Math.abs(x - r.position[0]) <= r.size[0] / 2 - padding &&
      Math.abs(z - r.position[1]) <= r.size[1] / 2 - padding
    );
  });
}

function portal(x: number, z: number, includeLocked = false, padding = BOT_CLEARANCE) {
  for (const r of active) {
    for (const c of r.connections) {
      if (!includeLocked && !active.some((o) => o.id === c.to)) continue;
      const horizontal = c.side === 'east' || c.side === 'west';
      const edge = horizontal
        ? r.position[0] + (c.side === 'east' ? 1 : -1) * (r.size[0] / 2)
        : r.position[1] + (c.side === 'south' ? 1 : -1) * (r.size[1] / 2);
      const normal = horizontal ? x : z;
      const along = horizontal ? z - r.position[1] : x - r.position[0];
      if (
        Math.abs(normal - edge) < 0.7 &&
        Math.abs(along - c.offset) < (includeLocked ? c.width / 2 + 0.4 : c.width / 2 - padding)
      ) {
        return true;
      }
    }
  }
  return false;
}

const itemGrid = new Map<string, Item[]>();

export function rebuildItemGrid(items: Item[]) {
  itemGrid.clear();
  for (const item of items) {
    const [w, d] = footprint(item);
    const minX = Math.floor((item.x - w / 2) / step);
    const maxX = Math.floor((item.x + w / 2) / step);
    const minZ = Math.floor((item.z - d / 2) / step);
    const maxZ = Math.floor((item.z + d / 2) / step);
    for (let gx = minX; gx <= maxX; gx++) {
      for (let gz = minZ; gz <= maxZ; gz++) {
        const k = `${gx},${gz}`;
        const list = itemGrid.get(k) ?? [];
        list.push(item);
        itemGrid.set(k, list);
      }
    }
  }
}

function hitsItem(x: number, z: number, padding: number, items: Item[]) {
  const gx = Math.floor(x / step);
  const gz = Math.floor(z / step);
  const candidates = itemGrid.get(`${gx},${gz}`) ?? items;
  for (const i of candidates) {
    const [w, d] = footprint(i);
    if (Math.abs(x - i.x) < w / 2 + padding && Math.abs(z - i.z) < d / 2 + padding) return true;
  }
  return false;
}

export function blocked(x: number, z: number, items: Item[], padding = BOT_CLEARANCE) {
  if (poolBlock(x, z)) return true;
  if (!inside(x, z, padding) && !portal(x, z, false, padding)) return true;
  if (decorBlocks.some((b) => Math.abs(x - b.x) < b.w / 2 + padding && Math.abs(z - b.z) < b.d / 2 + padding)) {
    return true;
  }
  return hitsItem(x, z, padding, items);
}

export function validPlacement(item: Item, items: Item[]) {
  const [w, d] = footprint(item);
  const room = active.find((r) => r.id === item.roomId);
  if (!room || room.walkable === false) return false;
  if (Math.abs(item.x - room.position[0]) + w / 2 > room.size[0] / 2 - 0.25) return false;
  if (Math.abs(item.z - room.position[1]) + d / 2 > room.size[1] / 2 - 0.25) return false;
  for (let x = item.x - w / 2; x <= item.x + w / 2 + 0.01; x += 0.25) {
    for (let z = item.z - d / 2; z <= item.z + d / 2 + 0.01; z += 0.25) {
      if (portal(x, z, true)) return false;
    }
  }
  if (decorBlocks.some((b) => Math.abs(item.x - b.x) < (w + b.w) / 2 + 0.12 && Math.abs(item.z - b.z) < (d + b.d) / 2 + 0.12)) {
    return false;
  }
  return !items.some((i) => {
    const [a, b] = footprint(i);
    return Math.abs(item.x - i.x) < (w + a) / 2 + 0.12 && Math.abs(item.z - i.z) < (d + b) / 2 + 0.12;
  });
}

function crossable(ax: number, az: number, bx: number, bz: number) {
  const a = roomAt(ax, az);
  const b = roomAt(bx, bz);
  if (!a || !b || a.id === b.id) return true;
  return a.connections.some((c) => {
    if (c.to !== b.id) return false;
    const horizontal = c.side === 'east' || c.side === 'west';
    const along = horizontal ? az - a.position[1] : ax - a.position[0];
    return Math.abs(along - c.offset) <= c.width / 2 - BOT_CLEARANCE;
  });
}

export function path(sx: number, sz: number, tx: number, tz: number, items: Item[]): Cell[] {
  rebuildItemGrid(items);
  const start: Cell = [Math.round(sx / step), Math.round(sz / step)];
  const end: Cell = [Math.round(tx / step), Math.round(tz / step)];
  if (blocked(end[0] * step, end[1] * step, items)) return [];
  const queue: Cell[] = [start];
  let head = 0;
  const prev = new Map<string, string | null>([[key(...start), null]]);
  let found: Cell | undefined;
  while (head < queue.length) {
    const c = queue[head++];
    if (c[0] === end[0] && c[1] === end[1]) {
      found = c;
      break;
    }
    for (const [dx, dz, diag] of [
      [1, 0, false],
      [-1, 0, false],
      [0, 1, false],
      [0, -1, false],
      [1, 1, true],
      [1, -1, true],
      [-1, 1, true],
      [-1, -1, true],
    ] as const) {
      const x = c[0] + dx;
      const z = c[1] + dz;
      const k = key(x, z);
      if (prev.has(k) || blocked(x * step, z * step, items)) continue;
      if (diag && (blocked((c[0] + dx) * step, c[1] * step, items) || blocked(c[0] * step, (c[1] + dz) * step, items))) {
        continue;
      }
      if (!crossable(c[0] * step, c[1] * step, x * step, z * step)) continue;
      prev.set(k, key(...c));
      queue.push([x, z]);
    }
  }
  if (!found) return [];
  const out: Cell[] = [];
  let k: string | null = key(...found);
  while (k && k !== key(...start)) {
    const [x, z] = k.split(',').map(Number);
    out.unshift([x * step, z * step]);
    k = prev.get(k) ?? null;
  }
  return out;
}

export function trimPathEnd(waypoints: Cell[], end: Cell, minDist = 0.5) {
  const out = waypoints.slice();
  while (out.length && Math.hypot(out[out.length - 1][0] - end[0], out[out.length - 1][1] - end[1]) < minDist) {
    out.pop();
  }
  return out;
}

export function segmentClear(x0: number, z0: number, x1: number, z1: number, items: Item[]) {
  rebuildItemGrid(items);
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.12));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const z = z0 + (z1 - z0) * t;
    if (blocked(x, z, items)) return false;
  }
  return true;
}

export function preservesConnectivity(start: Cell, delivery: Cell, items: Item[]) {
  rebuildItemGrid(items);
  const sx = Math.round(start[0] / step);
  const sz = Math.round(start[1] / step);
  const dx = Math.round(delivery[0] / step);
  const dz = Math.round(delivery[1] / step);
  if (blocked(sx * step, sz * step, items) || blocked(dx * step, dz * step, items)) return false;
  const queue: Cell[] = [[sx, sz]];
  let head = 0;
  const seen = new Set([key(sx, sz)]);
  const visitedRooms = new Set<string>();
  let deliveryReached = false;
  while (head < queue.length) {
    const [x, z] = queue[head++];
    if (x === dx && z === dz) deliveryReached = true;
    const room = roomAt(x * step, z * step);
    if (room) visitedRooms.add(room.id);
    for (const [ox, oz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = x + ox;
      const nz = z + oz;
      const k = key(nx, nz);
      if (seen.has(k) || blocked(nx * step, nz * step, items) || !crossable(x * step, z * step, nx * step, nz * step)) {
        continue;
      }
      seen.add(k);
      queue.push([nx, nz]);
    }
  }
  return deliveryReached && active.every((room) => visitedRooms.has(room.id));
}

export function canUnlockRoom(id: string, start: Cell, items: Item[]) {
  const previous = active;
  try {
    active = allRooms.filter((room) => previous.some((a) => a.id === room.id) || room.id === id);
    return preservesConnectivity(start, start, items);
  } finally {
    active = previous;
  }
}

export function freeTarget(items: Item[]) {
  rebuildItemGrid(items);
  for (let i = 0; i < 200; i++) {
    const r = active[Math.floor(Math.random() * active.length)];
    if (!r || r.walkable === false) continue;
    const x = Math.round((r.position[0] - r.size[0] / 2 + 0.5 + Math.random() * (r.size[0] - 1)) / step) * step;
    const z = Math.round((r.position[1] - r.size[1] / 2 + 0.5 + Math.random() * (r.size[1] - 1)) / step) * step;
    if (!blocked(x, z, items)) return [x, z] as Cell;
  }
  return [0, 2] as Cell;
}

/** All indoor+yard rooms reachable when every room is unlocked (QA). */
export function allRoomsReachableFrom(start: Cell, items: Item[], unlockedIds: string[]) {
  const previous = active;
  try {
    active = allRooms.filter((r) => unlockedIds.includes(r.id) && r.walkable !== false);
    return preservesConnectivity(start, start, items);
  } finally {
    active = previous;
  }
}

export function doorPairsValid(unlockedIds: string[]) {
  const unlocked = new Set(unlockedIds);
  for (const r of allRooms) {
    if (!unlocked.has(r.id)) continue;
    for (const c of r.connections) {
      if (!unlocked.has(c.to)) continue;
      const other = allRooms.find((o) => o.id === c.to);
      if (!other) return false;
      const back = other.connections.some((b) => b.to === r.id);
      if (!back) return false;
    }
  }
  return true;
}
