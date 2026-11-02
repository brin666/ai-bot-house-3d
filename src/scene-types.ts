import sceneData from './scene.json';

export type RoomSide = 'north' | 'south' | 'east' | 'west';
export type RoomConnection = { to: string; side: RoomSide; offset: number; width: number };
export type SceneRoom = {
  id: string;
  position: [number, number];
  size: [number, number];
  walls: RoomSide[];
  connections: RoomConnection[];
  doorways: unknown[];
  floor: string;
  buildCost: number;
  initial: boolean;
  label: string;
  unlockOrder?: number;
  walkable?: boolean;
  kind?: 'indoor' | 'yard' | 'pool';
};

export const rooms = sceneData.rooms as unknown as SceneRoom[];

export function roomById(id: string) {
  return rooms.find((r) => r.id === id);
}

/** Next purchasable room by explicit unlockOrder, not array order. */
export function nextUnlockCandidate(unlockedIds: string[]) {
  const unlocked = new Set(unlockedIds);
  return [...rooms]
    .filter((r) => r.unlockOrder !== undefined && !unlocked.has(r.id))
    .sort((a, b) => (a.unlockOrder ?? 0) - (b.unlockOrder ?? 0))
    .find((r) => r.connections.some((c) => unlocked.has(c.to)));
}

export function defaultRoomsForNewGame() {
  return rooms.filter((r) => r.initial).map((r) => r.id);
}

/** Old saves without a rooms array: only the original two starter rooms. */
export function legacyDefaultRooms() {
  return ['room-1', 'room-2'];
}
