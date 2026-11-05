import { catalog, type Item, type Kind } from './store';
import { interactionStandPoints } from './navigation';
import { path, validPlacement, preservesConnectivity, trimPathEnd } from './navigation';
import { BOT_PICKUP_STANDOFF } from './bot-look';
import data from './scene.json';

type Room = typeof data.rooms[number];
export type DeliveryPlan = { item: Item; pickup: [number, number]; toPickup: [number, number][]; toTarget: [number, number][] };

export function planDelivery(kind: Kind, rooms: Room[], items: Item[], botX: number, botZ: number): DeliveryPlan | null {
  const info = catalog[kind];
  const pickups: [number, number][] = [[0, 3], [1, 3], [-1, 3], [0, 2]];
  for (const pickup of pickups) {
    const routeToPickup = path(botX, botZ, pickup[0], pickup[1], items);
    const toPickup = trimPathEnd(routeToPickup, pickup, BOT_PICKUP_STANDOFF);
    if (!toPickup.length && Math.hypot(botX - pickup[0], botZ - pickup[1]) > BOT_PICKUP_STANDOFF + 0.05) continue;

    for (const room of [...rooms].reverse()) {
      const startX = Math.ceil((room.position[0] - room.size[0] / 2 + 0.75) * 4) / 4;
      const endX = Math.floor((room.position[0] + room.size[0] / 2 - 0.75) * 4) / 4;
      const startZ = Math.ceil((room.position[1] - room.size[1] / 2 + 0.75) * 4) / 4;
      const endZ = Math.floor((room.position[1] + room.size[1] / 2 - 0.75) * 4) / 4;
      for (let z = endZ; z >= startZ; z -= 0.25) for (let x = endX; x >= startX; x -= 0.25) {
        const item: Item = { id: `${kind}-${Date.now()}`, type: kind, roomId: room.id, x, z, rotation: 0, purchased: true, price: info.price };
        if (!validPlacement(item, items) || Math.hypot(x - pickup[0], z - pickup[1]) < 1.1) continue;
        const withItem = [...items, item];
        const stands = interactionStandPoints(item, withItem);
        for (const [tx, tz] of stands) {
          const toTarget = path(pickup[0], pickup[1], tx, tz, items);
          if (!toTarget.length || !preservesConnectivity([tx, tz], pickup, withItem)) continue;
          return { item, pickup, toPickup, toTarget };
        }
      }
    }
  }
  return null;
}
