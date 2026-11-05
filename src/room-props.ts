import * as THREE from 'three';
import { DecorBuilder } from './decor-builder';
import { look } from './look';
import { rooms, type SceneRoom } from './scene-types';
import type { InteractableEffect } from './interaction-types';

export type ThemedProp = {
  id: string;
  label: string;
  roomId: string;
  position: [number, number, number];
  preferredStand: [number, number];
  facingPoint: [number, number, number];
  effectKind: InteractableEffect;
};

type PropStyle = { id: string; label: string; effect: InteractableEffect };

const themedProps: Record<string, PropStyle[]> = {
  'room-1': [
    { id: 'slippers', label: '床邊拖鞋', effect: 'touch' },
    { id: 'alarm-clock', label: '鬧鐘', effect: 'look' },
    { id: 'bedside-lamp', label: '床頭小燈', effect: 'use-for-a-while' },
  ],
  'room-2': [
    { id: 'fruit-bowl', label: '水果碗', effect: 'touch' },
    { id: 'wall-clock', label: '掛鐘', effect: 'look' },
    { id: 'cushion', label: '沙發靠墊', effect: 'sit' },
  ],
  'room-3': [
    { id: 'stockpot', label: '小湯鍋', effect: 'use-for-a-while' },
    { id: 'ladle', label: '木勺', effect: 'touch' },
    { id: 'fruit-crate', label: '蔬果小籃', effect: 'look' },
  ],
  'room-4': [
    { id: 'record-stack', label: '唱片疊', effect: 'use-for-a-while' },
    { id: 'speaker', label: '迷你音箱', effect: 'touch' },
    { id: 'music-notes', label: '音符擺件', effect: 'look' },
  ],
  'room-5': [
    { id: 'dice', label: '彩色骰子', effect: 'hop' },
    { id: 'handheld-console', label: '掌上遊戲機', effect: 'use-for-a-while' },
    { id: 'controller', label: '遊戲手柄', effect: 'touch' },
  ],
  'room-6': [
    { id: 'books', label: '精裝書', effect: 'use-for-a-while' },
    { id: 'globe', label: '小地球儀', effect: 'look' },
    { id: 'pencil-cup', label: '鉛筆筒', effect: 'touch' },
  ],
  'room-7': [
    { id: 'rubber-duck', label: '黃色小鴨', effect: 'hop' },
    { id: 'folded-towels', label: '疊好的毛巾', effect: 'touch' },
    { id: 'soap-pump', label: '洗手液', effect: 'use-for-a-while' },
  ],
  'room-8': [
    { id: 'toolbox', label: '小工具箱', effect: 'use-for-a-while' },
    { id: 'tire', label: '小轮胎', effect: 'look' },
    { id: 'oil-can', label: '機油壺', effect: 'touch' },
  ],
  'room-9': [
    { id: 'laundry-stack', label: '洗衣籃', effect: 'touch' },
    { id: 'detergent', label: '洗衣液', effect: 'use-for-a-while' },
    { id: 'hanger', label: '衣架', effect: 'look' },
  ],
  'room-10': [
    { id: 'entry-shoes', label: '門口鞋子', effect: 'touch' },
    { id: 'key-tray', label: '鑰匙盤', effect: 'look' },
    { id: 'umbrella', label: '長柄傘', effect: 'use-for-a-while' },
  ],
};

const p = look.palette;

function shelf(builder: DecorBuilder, x: number, y: number, z: number) {
  builder.box(0.84, 0.78, 0.055, x, y - 0.14, z - 0.16, p.bookcaseBack);
  builder.box(0.9, 0.045, 0.06, x, y + 0.06, z - 0.16, p.woodDark);
  builder.box(0.92, 0.075, 0.36, x, y, z, p.wood);
  builder.box(0.08, 0.22, 0.2, x - 0.3, y - 0.14, z - 0.04, p.woodDark);
  builder.box(0.08, 0.22, 0.2, x + 0.3, y - 0.14, z - 0.04, p.woodDark);
  builder.box(0.9, 0.025, 0.03, x, y + 0.05, z + 0.17, p.gold);
}

function detail(builder: DecorBuilder, styleId: string, x: number, z: number, y: number) {
  switch (styleId) {
    case 'slippers':
      builder.box(0.28, 0.1, 0.42, x - 0.17, 0.08, z + 0.08, p.coral);
      builder.box(0.28, 0.1, 0.42, x + 0.17, 0.08, z + 0.08, p.rugB);
      builder.box(0.18, 0.045, 0.18, x - 0.17, 0.145, z + 0.02, p.cream);
      builder.box(0.18, 0.045, 0.18, x + 0.17, 0.145, z + 0.02, p.cream);
      break;
    case 'alarm-clock':
      builder.box(0.46, 0.29, 0.14, x, y + 0.16, z + 0.02, p.coral);
      builder.box(0.34, 0.2, 0.035, x, y + 0.17, z + 0.1, p.cream);
      builder.sphere(0.04, x - 0.08, y + 0.18, z + 0.125, p.ink);
      builder.sphere(0.04, x + 0.08, y + 0.18, z + 0.125, p.ink);
      builder.cyl(0.045, 0.045, 0.1, x, y + 0.31, z, p.gold, 8);
      break;
    case 'bedside-lamp':
      builder.cyl(0.18, 0.2, 0.06, x, y + 0.05, z, p.woodDark, 10);
      builder.cyl(0.045, 0.05, 0.28, x, y + 0.11, z, p.lampStem, 10);
      builder.cyl(0.24, 0.14, 0.26, x, y + 0.39, z, p.lampShade, 12);
      builder.sphere(0.07, x, y + 0.36, z + 0.01, p.cream);
      break;
    case 'fruit-bowl':
      builder.cyl(0.25, 0.34, 0.14, x, y + 0.04, z, p.coral, 12);
      builder.sphere(0.11, x - 0.12, y + 0.23, z, p.coral);
      builder.sphere(0.11, x + 0.1, y + 0.24, z - 0.03, p.gold);
      builder.sphere(0.1, x, y + 0.26, z + 0.1, p.leaf);
      break;
    case 'wall-clock':
      builder.cyl(0.25, 0.25, 0.12, x, y + 0.08, z, p.woodDark, 12);
      builder.cyl(0.2, 0.2, 0.04, x, y + 0.2, z, p.cream, 12);
      builder.box(0.025, 0.14, 0.025, x, y + 0.3, z + 0.08, p.ink);
      builder.box(0.1, 0.025, 0.025, x + 0.05, y + 0.25, z + 0.08, p.ink);
      builder.sphere(0.035, x, y + 0.25, z + 0.1, p.coral);
      break;
    case 'cushion':
      builder.box(0.58, 0.22, 0.44, x, y + 0.11, z, p.rugB);
      builder.box(0.38, 0.07, 0.34, x, y + 0.25, z + 0.015, p.cream);
      builder.sphere(0.08, x - 0.17, y + 0.26, z + 0.03, p.gold);
      break;
    case 'stockpot':
      builder.cyl(0.28, 0.25, 0.27, x, y + 0.05, z, p.ink, 12);
      builder.cyl(0.29, 0.29, 0.045, x, y + 0.32, z, p.cream, 12);
      builder.sphere(0.06, x, y + 0.4, z, p.gold);
      builder.box(0.16, 0.07, 0.12, x - 0.29, y + 0.23, z, p.woodDark);
      builder.box(0.16, 0.07, 0.12, x + 0.29, y + 0.23, z, p.woodDark);
      break;
    case 'ladle':
      builder.box(0.09, 0.39, 0.09, x - 0.1, y + 0.2, z, p.wood);
      builder.cyl(0.12, 0.13, 0.09, x - 0.1, y + 0.4, z, p.gold, 10);
      builder.box(0.09, 0.34, 0.09, x + 0.1, y + 0.18, z + 0.02, p.coral);
      builder.sphere(0.07, x + 0.1, y + 0.36, z + 0.02, p.coral);
      break;
    case 'fruit-crate':
      builder.box(0.55, 0.25, 0.36, x, y + 0.13, z, p.wood);
      builder.box(0.58, 0.05, 0.07, x, y + 0.18, z + 0.2, p.woodDark);
      builder.sphere(0.11, x - 0.14, y + 0.34, z, p.coral);
      builder.sphere(0.11, x + 0.05, y + 0.34, z - 0.04, p.gold);
      builder.sphere(0.1, x + 0.16, y + 0.34, z + 0.08, p.leaf);
      break;
    case 'record-stack':
      builder.box(0.5, 0.08, 0.38, x, y + 0.07, z, p.coral);
      builder.box(0.5, 0.08, 0.38, x, y + 0.16, z, p.rugB);
      builder.box(0.5, 0.08, 0.38, x, y + 0.25, z, p.gold);
      builder.cyl(0.13, 0.13, 0.025, x, y + 0.33, z, p.ink, 14);
      builder.cyl(0.04, 0.04, 0.035, x, y + 0.35, z, p.cream, 10);
      break;
    case 'speaker':
      builder.box(0.48, 0.53, 0.34, x, y + 0.27, z, p.woodDark);
      builder.cyl(0.14, 0.14, 0.045, x, y + 0.31, z + 0.18, p.ink, 12);
      builder.cyl(0.075, 0.075, 0.05, x, y + 0.31, z + 0.21, p.cream, 12);
      builder.cyl(0.05, 0.05, 0.035, x, y + 0.5, z + 0.18, p.gold, 10);
      break;
    case 'music-notes':
      builder.box(0.08, 0.32, 0.08, x - 0.12, y + 0.2, z, p.coral);
      builder.box(0.08, 0.42, 0.08, x + 0.12, y + 0.25, z, p.coral);
      builder.box(0.26, 0.07, 0.08, x, y + 0.42, z, p.gold);
      builder.sphere(0.1, x - 0.12, y + 0.06, z, p.woodDark);
      builder.sphere(0.1, x + 0.12, y + 0.11, z, p.woodDark);
      break;
    case 'dice':
      builder.box(0.34, 0.34, 0.34, x - 0.16, y + 0.18, z, p.coral);
      builder.box(0.34, 0.34, 0.34, x + 0.18, y + 0.18, z + 0.04, p.cream);
      for (const [dx, dz] of [[-0.23, -0.07], [-0.09, 0.07], [0.1, -0.06], [0.25, 0.12]] as const) builder.sphere(0.035, x + dx, y + 0.2, z + dz, p.ink);
      break;
    case 'handheld-console':
      builder.box(0.57, 0.35, 0.14, x, y + 0.2, z, p.rugB);
      builder.box(0.28, 0.21, 0.03, x, y + 0.22, z + 0.09, p.ink);
      builder.box(0.045, 0.16, 0.04, x - 0.21, y + 0.21, z + 0.1, p.cream);
      builder.sphere(0.045, x + 0.2, y + 0.18, z + 0.11, p.coral);
      builder.sphere(0.04, x + 0.2, y + 0.27, z + 0.11, p.gold);
      break;
    case 'controller':
      builder.box(0.6, 0.2, 0.28, x, y + 0.16, z, p.cream);
      builder.box(0.13, 0.11, 0.08, x - 0.18, y + 0.2, z + 0.16, p.coral);
      builder.box(0.08, 0.035, 0.08, x - 0.18, y + 0.21, z + 0.21, p.ink);
      builder.sphere(0.04, x + 0.17, y + 0.2, z + 0.14, p.gold);
      builder.sphere(0.04, x + 0.24, y + 0.2, z + 0.2, p.coral);
      break;
    case 'books':
      builder.box(0.54, 0.12, 0.34, x, y + 0.07, z, p.books[0]);
      builder.box(0.49, 0.12, 0.34, x + 0.02, y + 0.2, z, p.books[2]);
      builder.box(0.56, 0.12, 0.34, x - 0.01, y + 0.33, z, p.books[3]);
      builder.box(0.34, 0.025, 0.03, x, y + 0.34, z + 0.18, p.cream);
      break;
    case 'globe':
      builder.cyl(0.18, 0.2, 0.16, x, y + 0.04, z, p.woodDark, 10);
      builder.cyl(0.035, 0.035, 0.26, x, y + 0.19, z, p.gold, 10);
      builder.sphere(0.23, x, y + 0.45, z, p.windowGlass);
      builder.torus(0.25, 0.025, x, y + 0.45, z, p.coral);
      break;
    case 'pencil-cup':
      builder.cyl(0.2, 0.22, 0.29, x, y + 0.04, z, p.coral, 10);
      builder.cyl(0.22, 0.22, 0.045, x, y + 0.32, z, p.woodDark, 10);
      builder.box(0.04, 0.32, 0.04, x - 0.09, y + 0.51, z, p.gold);
      builder.box(0.04, 0.39, 0.04, x, y + 0.54, z, p.leaf);
      builder.box(0.04, 0.29, 0.04, x + 0.09, y + 0.49, z, p.rugB);
      break;
    case 'rubber-duck':
      builder.sphere(0.25, x, y + 0.2, z, p.gold);
      builder.sphere(0.17, x + 0.13, y + 0.39, z + 0.03, p.gold);
      builder.cone(0.1, 0.16, x + 0.27, y + 0.36, z + 0.06, p.coral);
      builder.sphere(0.025, x + 0.18, y + 0.43, z + 0.15, p.ink);
      break;
    case 'folded-towels':
      builder.box(0.56, 0.15, 0.36, x, y + 0.08, z, p.rugB);
      builder.box(0.52, 0.15, 0.36, x + 0.02, y + 0.23, z, p.cream);
      builder.box(0.46, 0.15, 0.36, x, y + 0.38, z, p.coral);
      builder.box(0.08, 0.17, 0.025, x + 0.18, y + 0.39, z + 0.19, p.gold);
      break;
    case 'soap-pump':
      builder.cyl(0.15, 0.18, 0.31, x, y + 0.05, z, p.windowGlass, 10);
      builder.sphere(0.14, x, y + 0.35, z, p.windowGlass);
      builder.box(0.045, 0.17, 0.045, x, y + 0.52, z, p.cream);
      builder.box(0.19, 0.045, 0.045, x + 0.08, y + 0.59, z, p.cream);
      break;
    case 'toolbox':
      builder.box(0.62, 0.3, 0.38, x, y + 0.16, z, p.coral);
      builder.box(0.66, 0.08, 0.42, x, y + 0.35, z, p.woodDark);
      builder.box(0.22, 0.08, 0.06, x, y + 0.43, z + 0.03, p.gold);
      builder.box(0.06, 0.1, 0.035, x - 0.2, y + 0.16, z + 0.2, p.cream);
      builder.box(0.06, 0.1, 0.035, x + 0.2, y + 0.16, z + 0.2, p.cream);
      break;
    case 'tire':
      builder.torus(0.24, 0.09, x, y + 0.2, z, p.ink);
      builder.torus(0.14, 0.025, x, y + 0.2, z, p.gold);
      builder.cyl(0.1, 0.1, 0.05, x, y + 0.18, z, p.woodDark, 10);
      break;
    case 'oil-can':
      builder.cyl(0.18, 0.2, 0.39, x, y + 0.05, z, p.gold, 10);
      builder.box(0.12, 0.07, 0.24, x + 0.18, y + 0.36, z, p.woodDark);
      builder.cyl(0.075, 0.075, 0.07, x, y + 0.44, z, p.ink, 8);
      builder.box(0.06, 0.2, 0.06, x - 0.24, y + 0.27, z, p.woodDark);
      break;
    case 'laundry-stack':
      builder.cyl(0.25, 0.3, 0.35, x, y + 0.05, z, p.rugB, 12);
      builder.cyl(0.3, 0.3, 0.05, x, y + 0.4, z, p.cream, 12);
      builder.box(0.34, 0.035, 0.09, x, y + 0.43, z + 0.22, p.coral);
      break;
    case 'detergent':
      builder.cyl(0.18, 0.2, 0.4, x, y + 0.05, z, p.leaf, 10);
      builder.box(0.26, 0.16, 0.1, x, y + 0.25, z + 0.12, p.cream);
      builder.cyl(0.075, 0.075, 0.1, x, y + 0.45, z, p.gold, 8);
      builder.box(0.1, 0.06, 0.05, x + 0.11, y + 0.52, z, p.gold);
      break;
    case 'hanger':
      builder.torus(0.24, 0.035, x, y + 0.24, z, p.coral);
      builder.box(0.04, 0.25, 0.04, x, y + 0.31, z, p.wood);
      builder.box(0.4, 0.035, 0.04, x, y + 0.14, z, p.wood);
      builder.box(0.13, 0.035, 0.04, x - 0.14, y + 0.08, z, p.wood);
      builder.box(0.13, 0.035, 0.04, x + 0.14, y + 0.08, z, p.wood);
      break;
    case 'entry-shoes':
      builder.box(0.31, 0.16, 0.47, x - 0.17, y + 0.08, z + 0.04, p.woodDark);
      builder.box(0.31, 0.16, 0.47, x + 0.17, y + 0.08, z + 0.04, p.coral);
      builder.box(0.21, 0.045, 0.16, x - 0.17, y + 0.17, z + 0.02, p.cream);
      builder.box(0.21, 0.045, 0.16, x + 0.17, y + 0.17, z + 0.02, p.gold);
      break;
    case 'key-tray':
      builder.cyl(0.27, 0.32, 0.09, x, y + 0.04, z, p.coral, 12);
      builder.torus(0.11, 0.035, x - 0.08, y + 0.18, z, p.gold);
      builder.torus(0.11, 0.035, x + 0.13, y + 0.18, z + 0.06, p.woodDark);
      builder.box(0.25, 0.04, 0.04, x + 0.21, y + 0.17, z + 0.06, p.gold);
      break;
    case 'umbrella':
      builder.cyl(0.035, 0.035, 0.55, x, y + 0.08, z, p.woodDark, 8);
      builder.cyl(0.22, 0.03, 0.28, x, y + 0.62, z, p.coral, 10);
      builder.box(0.045, 0.18, 0.045, x + 0.05, y + 0.04, z, p.woodDark);
      builder.sphere(0.045, x + 0.05, y + 0.13, z, p.woodDark);
      break;
  }
}

function chooseShelfXs(room: SceneRoom) {
  const half = room.size[0] / 2;
  const desired = [-2.45, 0, 2.45].map((offset) => room.position[0] + offset);
  const candidates = [-3.25, -2.7, -2.1, -1.4, -0.7, 0, 0.7, 1.4, 2.1, 2.7, 3.25]
    .map((offset) => room.position[0] + offset)
    .filter((x) => Math.abs(x - room.position[0]) <= half - 0.62)
    .filter((x) => !room.connections.some((connection) => {
      if (connection.side !== 'north') return false;
      const center = room.position[0] + connection.offset;
      return Math.abs(x - center) < connection.width / 2 + 0.58;
    }))
    .filter((x) => room.id !== 'room-1' || Math.abs(x - 0.2) > 1.25);
  const selected: number[] = [];
  for (const x of desired) {
    const choice = candidates.filter((candidate) => selected.every((used) => Math.abs(candidate - used) >= 1.15))
      .sort((a, b) => Math.abs(a - x) - Math.abs(b - x))[0];
    selected.push(choice ?? x);
  }
  return selected;
}

export function buildRoomProps(unlockedIds: string[], parent: THREE.Group): ThemedProp[] {
  for (const child of [...parent.children]) {
    child.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
  }
  parent.clear();
  const unlocked = new Set(unlockedIds);
  const builder = new DecorBuilder();
  const result: ThemedProp[] = [];
  for (const room of rooms) {
    const styles = themedProps[room.id];
    if (!unlocked.has(room.id) || room.kind !== 'indoor' || !styles) continue;
    const [rx, rz] = room.position;
    const north = rz - room.size[1] / 2;
    const xs = chooseShelfXs(room);
    styles.forEach((style, index) => {
      const x = xs[index];
      const z = north + 0.3;
      const floorProp = style.id === 'slippers' || style.id === 'entry-shoes';
      if (floorProp) detail(builder, style.id, x, z, 0);
      else {
        const shelfY = room.id === 'room-1' ? 0.53 : 0.62;
        shelf(builder, x, shelfY, z);
        detail(builder, style.id, x, z, shelfY + 0.04);
      }
      const y = floorProp ? 0.16 : 1.05;
      result.push({
        id: `${room.id}-${style.id}`,
        label: style.label,
        roomId: room.id,
        position: [x, y, z],
        preferredStand: [x, north + 1.05],
        facingPoint: [x, y, z],
        effectKind: style.effect,
      });
    });
  }
  builder.flush(parent);
  for (const child of parent.children) {
    if (child instanceof THREE.Mesh) { child.castShadow = false; child.receiveShadow = true; }
  }
  return result;
}


