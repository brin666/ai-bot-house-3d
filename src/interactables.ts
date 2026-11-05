import { blocked, interactionStandPoints } from './navigation';
import { catalog, type Item } from './store';
import { rooms } from './scene-types';
import type { Interactable, InteractableActivity, InteractableEffect } from './interaction-types';
import type { ThemedProp } from './room-props';

const furnitureActivity: Record<Item['type'], { effectKind: InteractableEffect; activity: InteractableActivity }> = {
  bed: { effectKind: 'use-for-a-while', activity: 'Sleep' },
  table: { effectKind: 'use-for-a-while', activity: 'Read' },
  plant: { effectKind: 'look', activity: 'Plant' },
  chair: { effectKind: 'sit', activity: 'Sit' },
  lamp: { effectKind: 'look', activity: 'Light' },
};

const activityForEffect: Record<InteractableEffect, InteractableActivity> = {
  look: 'Look',
  touch: 'Touch',
  sit: 'Sit',
  hop: 'Hop',
  'use-for-a-while': 'Use',
};

function pointKey(point: [number, number]) {
  return `${point[0]},${point[1]}`;
}

function walkableCandidates(
  roomId: string,
  items: Item[],
  preferred: [number, number],
  objectPoint: [number, number],
  used: Set<string>,
  maxDistance = 2.2,
) {
  const room = rooms.find((entry) => entry.id === roomId);
  if (!room) return [] as [number, number][];
  const [cx, cz] = room.position;
  const [w, d] = room.size;
  const result: { point: [number, number]; score: number; distance: number }[] = [];
  for (let x = Math.ceil((cx - w / 2 + 0.25) * 2) / 2; x <= cx + w / 2 - 0.25; x += 0.5) {
    for (let z = Math.ceil((cz - d / 2 + 0.25) * 2) / 2; z <= cz + d / 2 - 0.25; z += 0.5) {
      const point: [number, number] = [x, z];
      const distance = Math.hypot(x - objectPoint[0], z - objectPoint[1]);
      if (distance < 0.55 || distance > maxDistance || blocked(x, z, items)) continue;
      const preference = Math.hypot(x - preferred[0], z - preferred[1]);
      result.push({ point, distance, score: preference + Math.abs(distance - 0.9) * 0.3 + (used.has(pointKey(point)) ? 2 : 0) });
    }
  }
  result.sort((a, b) => a.score - b.score || a.distance - b.distance);
  return result.map((entry) => entry.point);
}

function anyWalkableSpot(roomId: string, items: Item[], preferred: [number, number]) {
  const room = rooms.find((entry) => entry.id === roomId);
  if (!room) return [] as [number, number][];
  const [cx, cz] = room.position;
  const [w, d] = room.size;
  const result: { point: [number, number]; distance: number }[] = [];
  for (let x = Math.ceil((cx - w / 2 + 0.25) * 2) / 2; x <= cx + w / 2 - 0.25; x += 0.5) {
    for (let z = Math.ceil((cz - d / 2 + 0.25) * 2) / 2; z <= cz + d / 2 - 0.25; z += 0.5) {
      if (blocked(x, z, items)) continue;
      result.push({ point: [x, z], distance: Math.hypot(x - preferred[0], z - preferred[1]) });
    }
  }
  return result.sort((a, b) => a.distance - b.distance).map((entry) => entry.point);
}

export function createInteractables(unlockedIds: string[], items: Item[], props: ThemedProp[]): Interactable[] {
  const unlocked = new Set(unlockedIds);
  const usedByRoom = new Map<string, Set<string>>();
  const usedFor = (roomId: string) => {
    let used = usedByRoom.get(roomId);
    if (!used) { used = new Set(); usedByRoom.set(roomId, used); }
    return used;
  };
  const targets: Interactable[] = [];

  for (const item of items) {
    if (!unlocked.has(item.roomId)) continue;
    const preferred = interactionStandPoints(item, items);
    const objectPoint: [number, number] = [item.x, item.z];
    const used = usedFor(item.roomId);
    let candidates = preferred.filter(([x, z]) => !blocked(x, z, items));
    if (!candidates.length) candidates = walkableCandidates(item.roomId, items, [item.x, item.z], objectPoint, used, 2.6);
    if (!candidates.length) candidates = anyWalkableSpot(item.roomId, items, [item.x, item.z]);
    if (!candidates.length) continue;
    candidates = [...candidates.filter((point) => !used.has(pointKey(point))), ...candidates.filter((point) => used.has(pointKey(point)))];
    used.add(pointKey(candidates[0]));
    const mapping = furnitureActivity[item.type];
    targets.push({
      id: item.id,
      label: catalog[item.type].name,
      roomId: item.roomId,
      standSpot: candidates[0],
      standCandidates: candidates,
      facingPoint: [item.x, 1, item.z],
      effectKind: mapping.effectKind,
      activity: mapping.activity,
      source: 'furniture',
      furnitureKind: item.type,
    });
  }

  for (const prop of props) {
    if (!unlocked.has(prop.roomId)) continue;
    const used = usedFor(prop.roomId);
    const objectPoint: [number, number] = [prop.position[0], prop.position[2]];
    let candidates = walkableCandidates(prop.roomId, items, prop.preferredStand, objectPoint, used);
    if (!candidates.length) candidates = anyWalkableSpot(prop.roomId, items, prop.preferredStand);
    if (!candidates.length) continue;
    candidates = [...candidates.filter((point) => !used.has(pointKey(point))), ...candidates.filter((point) => used.has(pointKey(point)))];
    used.add(pointKey(candidates[0]));
    targets.push({
      id: prop.id,
      label: prop.label,
      roomId: prop.roomId,
      standSpot: candidates[0],
      standCandidates: candidates,
      facingPoint: prop.facingPoint,
      effectKind: prop.effectKind,
      activity: activityForEffect[prop.effectKind],
      source: 'prop',
    });
  }
  return targets;
}
