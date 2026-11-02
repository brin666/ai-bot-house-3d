import type { Item } from './store';
import { legacyDefaultRooms, rooms as allRooms } from './scene-types';
import { decorLayout } from './decor-layout';
import {
  blocked,
  getActiveRoomIds,
  getDecorBlocks,
  roomReachability,
  setActiveRooms,
  setDecorBlocks,
  validPlacement,
} from './navigation';

export type SaveV3 = {
  version: 3;
  coins: number;
  items: Item[];
  rooms: string[];
  logs: string[];
  pending: Item | null;
};

export function resolveRoomsFromSave(data: Record<string, unknown>): string[] {
  if (Array.isArray(data.rooms) && data.rooms.length > 0) return [...(data.rooms as string[])];
  return legacyDefaultRooms();
}

export type LayoutMigration = { items: Item[]; pending: Item | null; moved: string[] };

function firstFreeStart(roomIds: string[], items: Item[]): [number, number] {
  const candidates: [number, number][] = [];
  for (const room of allRooms) {
    if (!roomIds.includes(room.id) || room.walkable === false) continue;
    const [x, z] = room.position;
    for (let radius = 0; radius <= 3; radius += 0.5) {
      for (let dx = -radius; dx <= radius; dx += 0.5) for (let dz = -radius; dz <= radius; dz += 0.5) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== radius) continue;
        const point: [number, number] = [x + dx, z + dz];
        if (!blocked(point[0], point[1], items)) return point;
        candidates.push(point);
      }
    }
    break;
  }
  return candidates[0] ?? [0, 0];
}

function reachableCount(items: Item[], roomIds: string[], start: [number, number]) {
  return Object.values(roomReachability(start, items, roomIds)).filter(Boolean).length;
}

function searchPositions(original: Item, rotation: number, items: Item[], roomIds: string[], start: [number, number], minimumReachableRooms: number) {
  const room = allRooms.find((candidate) => candidate.id === original.roomId);
  if (!room || room.walkable === false) return undefined;
  const points: { x: number; z: number; distance: number }[] = [];
  const [halfW, halfD] = [8, 8];
  const bound = Math.ceil(Math.max(halfW, halfD) * 4);
  for (let gx = -bound; gx <= bound; gx++) for (let gz = -bound; gz <= bound; gz++) {
    const x = Math.round(original.x * 4) / 4 + gx * 0.25;
    const z = Math.round(original.z * 4) / 4 + gz * 0.25;
    if (Math.abs(x - room.position[0]) > room.size[0] / 2 + 1 || Math.abs(z - room.position[1]) > room.size[1] / 2 + 1) continue;
    points.push({ x, z, distance: Math.hypot(x - original.x, z - original.z) });
  }
  points.sort((a, b) => a.distance - b.distance || a.x - b.x || a.z - b.z);
  for (const point of points) {
    const candidate = { ...original, x: point.x, z: point.z, rotation };
    const others = items.filter((item) => item.id !== original.id);
    if (!validPlacement(candidate, others)) continue;
    const replaced = items.map((item) => item.id === original.id ? candidate : item);
    if (reachableCount(replaced, roomIds, start) >= minimumReachableRooms) return candidate;
  }
  return undefined;
}

/**
 * Deterministic, data-only repair for save positions made invalid by decor.
 * It returns cloned data and writes nothing; the normal Store commit persists it later.
 */
export function migrateLayout(items: Item[], pending: Item | null, roomIds: string[]): LayoutMigration {
  const previousRooms = getActiveRoomIds();
  const previousBlocks = getDecorBlocks();
  setActiveRooms(roomIds);
  setDecorBlocks(decorLayout(roomIds).blocks);
  try {
    const result = structuredClone(items);
    const pendingWasInItems = Boolean(pending && result.some((item) => item.id === pending.id));
    const pendingTarget = pending ? structuredClone(pending) : null;
    if (pendingTarget) {
      const existing = result.findIndex((item) => item.id === pendingTarget.id);
      if (existing >= 0) result[existing] = structuredClone(pendingTarget);
      else result.push(structuredClone(pendingTarget));
    }
    const moved: string[] = [];
    const start = firstFreeStart(roomIds, result);
    const maximumReachableRooms = allRooms.filter((room) => roomIds.includes(room.id) && room.walkable !== false).length;

    for (let pass = 0; pass <= result.length; pass++) {
      let changed = false;
      for (let i = 0; i < result.length; i++) {
        const current = result[i];
        const others = result.filter((item) => item.id !== current.id);
        const directValid = validPlacement(current, others);
        const currentReachable = reachableCount(result, roomIds, start);
        const baseReachable = reachableCount(others, roomIds, start);
        const connected = currentReachable === maximumReachableRooms;
        if (directValid && connected) continue;

        const minimumReachable = connected || baseReachable === maximumReachableRooms
          ? maximumReachableRooms
          : directValid ? Math.min(maximumReachableRooms, currentReachable + 1) : currentReachable;
        let replacement = searchPositions(current, current.rotation, result, roomIds, start, minimumReachable);
        if (!replacement) replacement = searchPositions(current, current.rotation + Math.PI / 2, result, roomIds, start, minimumReachable);
        if (replacement && (replacement.x !== current.x || replacement.z !== current.z || replacement.rotation !== current.rotation)) {
          result[i] = replacement;
          if (!moved.includes(current.id)) moved.push(current.id);
          changed = true;
        }
      }
      if (!changed) break;
    }

    let nextPending = pending ? structuredClone(pending) : null;
    if (nextPending) {
      const index = result.findIndex((item) => item.id === nextPending!.id);
      if (index >= 0) {
        nextPending = structuredClone(result[index]);
        if (!pendingWasInItems) result.splice(index, 1);
      }
    }
    return { items: result, pending: nextPending, moved };
  } finally {
    setActiveRooms(previousRooms);
    setDecorBlocks(previousBlocks);
  }
}
