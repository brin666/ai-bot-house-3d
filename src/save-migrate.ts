import type { Item } from './store';
import { legacyDefaultRooms } from './scene-types';

export type SaveV3 = {
  version: 3;
  coins: number;
  items: Item[];
  rooms: string[];
  logs: string[];
  pending: Item | null;
};

export function resolveRoomsFromSave(data: Record<string, unknown>): string[] {
  if (Array.isArray(data.rooms) && data.rooms.length > 0) {
    return [...(data.rooms as string[])];
  }
  return legacyDefaultRooms();
}
