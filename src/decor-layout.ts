import { rooms } from './scene-types';

export type PaletteToken =
  | 'wood' | 'woodDark' | 'cream' | 'coral' | 'leaf' | 'ink' | 'gold' | 'rugA' | 'rugB'
  | 'rugInset' | 'bookcase' | 'bookcaseBack' | 'shelf' | 'books.0' | 'books.1' | 'books.2' | 'books.3'
  | 'frame' | 'frameMat' | 'pictureA' | 'pictureB' | 'trim' | 'sideTable' | 'cup' | 'lampStem'
  | 'lampShade' | 'windowGlass';

export type DecorShape =
  | { kind: 'box'; w: number; h: number; d: number; x: number; y: number; z: number; color: PaletteToken }
  | { kind: 'cylinder'; rt: number; rb: number; h: number; x: number; y: number; z: number; color: PaletteToken; segments?: number }
  | { kind: 'sphere'; r: number; x: number; y: number; z: number; color: PaletteToken }
  | { kind: 'torus'; r: number; tube: number; x: number; y: number; z: number; color: PaletteToken };

export type DecorBlock = { id: string; roomId: string; x: number; z: number; w: number; d: number };
export type DecorPiece = { id: string; roomId: string; shapes: DecorShape[]; block?: DecorBlock; wallArt?: boolean };
export type DecorLayout = { pieces: DecorPiece[]; blocks: DecorBlock[] };

const box = (w: number, h: number, d: number, x: number, y: number, z: number, color: PaletteToken): DecorShape => ({ kind: 'box', w, h, d, x, y, z, color });
const cyl = (rt: number, rb: number, h: number, x: number, y: number, z: number, color: PaletteToken, segments = 12): DecorShape => ({ kind: 'cylinder', rt, rb, h, x, y, z, color, segments });
const sphere = (r: number, x: number, y: number, z: number, color: PaletteToken): DecorShape => ({ kind: 'sphere', r, x, y, z, color });
const torus = (r: number, tube: number, x: number, y: number, z: number, color: PaletteToken): DecorShape => ({ kind: 'torus', r, tube, x, y, z, color });

function floorPiece(id: string, roomId: string, x: number, z: number, w: number, d: number, shapes: DecorShape[]): DecorPiece {
  return { id, roomId, shapes, block: { id, roomId, x, z, w, d } };
}

function artPiece(id: string, roomId: string, shapes: DecorShape[]): DecorPiece {
  return { id, roomId, shapes, wallArt: true };
}

function moveRotateShapes(
  shapes: DecorShape[],
  from: [number, number],
  to: [number, number],
  rotation: number,
): DecorShape[] {
  // Orthogonal turns keep boxes axis-aligned by swapping their floor dimensions.
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  return shapes.map((shape): DecorShape => {
    const dx = shape.x - from[0];
    const dz = shape.z - from[1];
    const x = to[0] + dx * c + dz * s;
    const z = to[1] - dx * s + dz * c;
    if (shape.kind === 'box' && Math.abs(s) > 0.5) return { ...shape, x, z, w: shape.d, d: shape.w };
    return { ...shape, x, z };
  });
}

function makeWallArt(roomId: string, side: 'north' | 'west', x: number, z: number, wallEdge: number): DecorPiece {
  const id = `${roomId}-wall-art-${side}`;
  if (side === 'north') {
    return artPiece(id, roomId, [
      box(1.42, 1.02, 0.1, x, 1.78, wallEdge + 0.09, 'frame'),
      box(1.2, 0.8, 0.035, x, 1.78, wallEdge + 0.15, 'frameMat'),
      box(0.52, 0.52, 0.025, x - 0.27, 1.78, wallEdge + 0.173, 'pictureA'),
      box(0.48, 0.42, 0.025, x + 0.31, 1.75, wallEdge + 0.173, 'pictureB'),
      box(0.12, 0.12, 0.025, x + 0.18, 2.03, wallEdge + 0.174, 'gold'),
    ]);
  }
  return artPiece(id, roomId, [
    box(0.1, 1.02, 1.42, wallEdge + 0.09, 1.78, z, 'frame'),
    box(0.035, 0.8, 1.2, wallEdge + 0.15, 1.78, z, 'frameMat'),
    box(0.025, 0.52, 0.52, wallEdge + 0.173, 1.78, z - 0.27, 'pictureA'),
    box(0.025, 0.42, 0.48, wallEdge + 0.173, 1.75, z + 0.31, 'pictureB'),
    box(0.025, 0.12, 0.12, wallEdge + 0.174, 2.03, z + 0.18, 'gold'),
  ]);
}

export function decorLayout(unlockedIds: string[]): DecorLayout {
  const unlocked = new Set(unlockedIds);
  const pieces: DecorPiece[] = [];
  const add = (...next: DecorPiece[]) => pieces.push(...next);

  if (unlocked.has('room-1')) {
    add(
      { id: 'room-1-rug', roomId: 'room-1', shapes: [box(2.8, 0.02, 2.65, -2.45, 0.012, -2.25, 'rugA'), box(2.4, 0.012, 2.25, -2.45, 0.028, -2.25, 'rugInset')] },
      floorPiece('room-1-nightstand', 'room-1', -1.02, -3.02, 0.78, 0.78, [
        box(0.78, 0.12, 0.78, -1.02, 0.68, -3.02, 'wood'),
        box(0.64, 0.5, 0.62, -1.02, 0.37, -3.02, 'woodDark'),
        box(0.08, 0.4, 0.52, -0.68, 0.38, -3.02, 'wood'),
        sphere(0.08, -1.02, 0.79, -3.02, 'gold'),
      ]),
      // Against the west wall, with the doors facing east into clear floor.
      floorPiece('room-1-wardrobe', 'room-1', -3.15, -0.2, 1.54, 1.15, moveRotateShapes([
        box(1.15, 1.92, 1.25, 2.72, 1.02, 2.55, 'woodDark'),
        box(1.02, 1.72, 0.06, 2.72, 1.03, 1.9, 'wood'),
        box(0.48, 1.58, 0.035, 2.46, 1.02, 1.86, 'cream'),
        box(0.48, 1.58, 0.035, 2.98, 1.02, 1.86, 'cream'),
        cyl(0.035, 0.035, 0.12, 2.72, 1.02, 1.82, 'gold', 8),
      ], [2.72, 2.55], [-3.15, -0.2], -Math.PI / 2)),
    );
  }

  if (unlocked.has('room-2')) {
    add(
      { id: 'room-2-rug', roomId: 'room-2', shapes: [box(3.4, 0.02, 3.7, 9.15, 0.012, 0.45, 'rugB'), box(3.05, 0.012, 3.35, 9.15, 0.028, 0.45, 'rugInset')] },
      // Half-turn puts the backrest away from the TV and the seat toward it.
      floorPiece('room-2-sofa', 'room-2', 9.15, 1.3, 3.05, 1.72, moveRotateShapes([
        box(2.65, 0.3, 1.48, 8, 0.2, 1.35, 'woodDark'),
        box(2.55, 0.42, 1.18, 8, 0.48, 1.48, 'coral'),
        box(2.62, 0.95, 0.32, 8, 0.78, 0.66, 'coral'),
        box(0.38, 0.72, 1.23, 6.68, 0.58, 1.47, 'coral'),
        box(0.38, 0.72, 1.23, 9.32, 0.58, 1.47, 'coral'),
        box(0.66, 0.16, 0.58, 7.28, 0.76, 1.48, 'cream'),
        box(0.66, 0.16, 0.58, 8, 0.76, 1.48, 'gold'),
        box(0.66, 0.16, 0.58, 8.72, 0.76, 1.48, 'cream'),
      ], [8, 1.3], [9.15, 1.3], Math.PI)),
      floorPiece('room-2-tv-stand', 'room-2', 9.15, -2.48, 2.05, 0.94, [
        box(2.05, 0.48, 0.72, 9.15, 0.3, -2.55, 'wood'),
        box(1.95, 0.09, 0.78, 9.15, 0.57, -2.55, 'gold'),
        box(1.7, 0.96, 0.14, 9.15, 1.14, -2.82, 'ink'),
        box(1.48, 0.72, 0.035, 9.15, 1.15, -2.73, 'windowGlass'),
        box(0.14, 0.14, 0.14, 9.15, 0.72, -2.72, 'gold'),
      ]),
      floorPiece('room-2-floor-lamp', 'room-2', 10.9, 3, 0.62, 0.62, [
        cyl(0.24, 0.28, 0.09, 10.9, 0.045, 3, 'woodDark'),
        cyl(0.055, 0.055, 1.2, 10.9, 0.12, 3, 'lampStem', 10),
        cyl(0.31, 0.17, 0.38, 10.9, 1.16, 3, 'lampShade', 12),
        sphere(0.12, 10.9, 1.04, 3, 'cream'),
      ]),
      floorPiece('room-2-plant', 'room-2', 5.42, 2.75, 1.1, 1.1, [
        cyl(0.28, 0.21, 0.42, 5.42, 0.21, 2.75, 'coral', 10),
        cyl(0.21, 0.21, 0.07, 5.42, 0.43, 2.75, 'woodDark', 10),
        sphere(0.26, 5.22, 0.68, 2.75, 'leaf'), sphere(0.27, 5.62, 0.7, 2.75, 'leaf'),
        sphere(0.25, 5.42, 0.92, 2.55, 'leaf'), sphere(0.23, 5.42, 0.92, 2.95, 'leaf'),
        sphere(0.22, 5.42, 1.12, 2.75, 'leaf'),
      ]),
    );
  }

  if (unlocked.has('room-3')) {
    add(
      // A single east-wall run; the rotated fridge door opens west into clear floor.
      floorPiece('room-3-counter-stove', 'room-3', 19.1, 0.2, 1.1, 3.1, moveRotateShapes([
        box(2.9, 0.82, 0.9, 18.45, 0.48, -1.5, 'cream'),
        box(3.02, 0.14, 1.02, 18.45, 0.94, -1.5, 'wood'),
        box(1.0, 0.06, 0.68, 17.82, 1.04, -1.5, 'ink'),
        cyl(0.17, 0.17, 0.045, 17.58, 1.09, -1.71, 'woodDark', 12),
        cyl(0.17, 0.17, 0.045, 18.05, 1.09, -1.71, 'woodDark', 12),
        cyl(0.17, 0.17, 0.045, 17.58, 1.09, -1.29, 'woodDark', 12),
        cyl(0.17, 0.17, 0.045, 18.05, 1.09, -1.29, 'woodDark', 12),
        box(0.22, 0.12, 0.07, 18.9, 1.04, -1.07, 'gold'),
      ], [18.45, -1.5], [19.1, 0.2], -Math.PI / 2)),
      floorPiece('room-3-fridge', 'room-3', 19.15, -2.6, 1.4, 1.05, moveRotateShapes([
        box(0.92, 2.05, 1.28, 18.85, 1.04, -3.05, 'windowGlass'),
        box(0.98, 0.08, 1.34, 18.85, 2.08, -3.05, 'cream'),
        box(0.08, 0.52, 0.08, 19.18, 1.32, -2.4, 'gold'),
        box(0.08, 0.7, 0.08, 19.18, 0.68, -2.4, 'gold'),
      ], [18.85, -3.05], [19.15, -2.6], -Math.PI / 2)),
      { id: 'room-3-rug', roomId: 'room-3', shapes: [box(3.35, 0.02, 2.1, 15.25, 0.012, 1.5, 'rugA')] },
      floorPiece('room-3-dining-table', 'room-3', 15.25, 1.5, 1.6, 1.25, [
        box(1.6, 0.16, 1.25, 15.25, 0.82, 1.5, 'wood'),
        box(0.15, 0.72, 0.15, 14.62, 0.39, 1.03, 'woodDark'), box(0.15, 0.72, 0.15, 15.88, 0.39, 1.03, 'woodDark'),
        box(0.15, 0.72, 0.15, 14.62, 0.39, 1.97, 'woodDark'), box(0.15, 0.72, 0.15, 15.88, 0.39, 1.97, 'woodDark'),
        box(0.7, 0.08, 0.36, 15.25, 0.94, 1.5, 'cream'),
      ]),
      floorPiece('room-3-chair-west', 'room-3', 14.0, 1.5, 0.72, 0.62, moveRotateShapes([
        box(0.62, 0.16, 0.65, 14, 0.48, 1.5, 'coral'), box(0.62, 0.72, 0.14, 14, 0.87, 1.22, 'wood'),
        box(0.1, 0.46, 0.1, 13.78, 0.23, 1.28, 'woodDark'), box(0.1, 0.46, 0.1, 14.22, 0.23, 1.28, 'woodDark'),
        box(0.1, 0.46, 0.1, 13.78, 0.23, 1.72, 'woodDark'), box(0.1, 0.46, 0.1, 14.22, 0.23, 1.72, 'woodDark'),
      ], [14, 1.5], [14, 1.5], Math.PI / 2)),
      floorPiece('room-3-chair-east', 'room-3', 16.48, 1.5, 0.72, 0.62, moveRotateShapes([
        box(0.62, 0.16, 0.65, 16.48, 0.48, 1.5, 'coral'), box(0.62, 0.72, 0.14, 16.48, 0.87, 1.78, 'wood'),
        box(0.1, 0.46, 0.1, 16.26, 0.23, 1.28, 'woodDark'), box(0.1, 0.46, 0.1, 16.7, 0.23, 1.28, 'woodDark'),
        box(0.1, 0.46, 0.1, 16.26, 0.23, 1.72, 'woodDark'), box(0.1, 0.46, 0.1, 16.7, 0.23, 1.72, 'woodDark'),
      ], [16.48, 1.5], [16.48, 1.5], Math.PI / 2)),
    );
  }

  if (unlocked.has('room-4')) {
    add(
      floorPiece('room-4-music-console', 'room-4', 8, 6, 2.6, 0.9, moveRotateShapes([
        box(2.6, 0.18, 0.9, 5.4, 0.78, 5.5, 'wood'),
        box(2.38, 0.6, 0.72, 5.4, 0.38, 5.5, 'ink'),
        box(1.0, 0.08, 0.18, 5.4, 0.92, 5.5, 'gold'),
        box(0.12, 0.18, 0.12, 4.85, 1.04, 5.5, 'coral'), box(0.12, 0.18, 0.12, 5.95, 1.04, 5.5, 'leaf'),
        cyl(0.16, 0.16, 0.16, 4.65, 0.95, 5.5, 'cream', 12), cyl(0.16, 0.16, 0.16, 6.15, 0.95, 5.5, 'cream', 12),
      ], [5.4, 5.5], [8, 6], 0)),
      floorPiece('room-4-speaker-left', 'room-4', 6.15, 6, 0.62, 0.62, moveRotateShapes([box(0.62, 1.1, 0.62, 6.25, 0.55, 10.9, 'woodDark'), cyl(0.16, 0.16, 0.08, 6.25, 0.78, 10.9, 'ink'), cyl(0.1, 0.1, 0.08, 6.25, 0.32, 10.9, 'gold')], [6.25, 10.9], [6.15, 6], 0)),
      floorPiece('room-4-speaker-right', 'room-4', 9.85, 6, 0.62, 0.62, moveRotateShapes([box(0.62, 1.1, 0.62, 9.75, 0.55, 10.9, 'woodDark'), cyl(0.16, 0.16, 0.08, 9.75, 0.78, 10.9, 'ink'), cyl(0.1, 0.1, 0.08, 9.75, 0.32, 10.9, 'gold')], [9.75, 10.9], [9.85, 6], 0)),
      floorPiece('room-4-guitar', 'room-4', 11.1, 5.85, 0.75, 0.75, moveRotateShapes([
        sphere(0.34, 10.75, 0.36, 7.1, 'coral'), box(0.14, 0.72, 0.14, 10.75, 0.75, 7.1, 'wood'), box(0.32, 0.14, 0.2, 10.75, 1.1, 7.1, 'gold'),
      ], [10.75, 7.1], [11.1, 5.85], 0)),
      floorPiece('room-4-plant', 'room-4', 5.35, 10.9, 1.1, 1.1, [cyl(0.28, 0.2, 0.42, 5.35, 0.21, 10.9, 'cream'), sphere(0.3, 5.15, 0.75, 10.9, 'leaf'), sphere(0.28, 5.55, 0.76, 10.9, 'leaf'), sphere(0.24, 5.35, 1.05, 10.9, 'leaf')]),
    );
  }

  if (unlocked.has('room-5')) {
    add(
      floorPiece('room-5-arcade', 'room-5', 9.55, -10.4, 1.55, 1.24, [
        box(1.55, 1.78, 0.9, 9.55, 0.89, -10.45, 'coral'),
        box(1.18, 0.78, 0.08, 9.55, 1.33, -9.96, 'ink'),
        box(0.96, 0.56, 0.035, 9.55, 1.34, -9.91, 'windowGlass'),
        box(1.0, 0.12, 0.12, 9.55, 0.71, -9.93, 'gold'),
        cyl(0.1, 0.1, 0.12, 9.18, 0.76, -9.91, 'leaf', 10), cyl(0.1, 0.1, 0.12, 9.88, 0.76, -9.91, 'cream', 10),
      ]),
      floorPiece('room-5-beanbag', 'room-5', 9.55, -8.6, 1.05, 1.05, [sphere(0.52, 9.55, 0.42, -8.6, 'rugB'), sphere(0.38, 9.55, 0.64, -8.6, 'coral')]),
      floorPiece('room-5-plant', 'room-5', 10.8, -5.2, 1.1, 1.1, [cyl(0.27, 0.2, 0.4, 10.8, 0.2, -5.2, 'wood'), sphere(0.29, 10.6, 0.7, -5.2, 'leaf'), sphere(0.29, 11, 0.72, -5.2, 'leaf'), sphere(0.25, 10.8, 1.0, -5.2, 'leaf')]),
      { id: 'room-5-rug', roomId: 'room-5', shapes: [box(2.6, 0.02, 3.0, 9.55, 0.012, -9.55, 'rugA')] },
    );
  }

  if (unlocked.has('room-6')) {
    add(
      floorPiece('room-6-study-desk', 'room-6', -1.55, 9.45, 2.35, 1.02, [
        box(2.35, 0.16, 1.02, -1.55, 0.82, 9.45, 'wood'),
        box(0.13, 0.76, 0.13, -2.5, 0.38, 9.05, 'woodDark'), box(0.13, 0.76, 0.13, -0.6, 0.38, 9.05, 'woodDark'),
        box(0.13, 0.76, 0.13, -2.5, 0.38, 9.85, 'woodDark'), box(0.13, 0.76, 0.13, -0.6, 0.38, 9.85, 'woodDark'),
        box(0.86, 0.62, 0.06, -1.55, 1.2, 9.1, 'ink'), box(0.68, 0.42, 0.025, -1.55, 1.21, 9.06, 'pictureA'),
        box(0.42, 0.06, 0.32, -2.05, 0.94, 9.42, 'cream'),
      ]),
      // Back panel sits at the west wall; the books face the desk to the east.
      floorPiece('room-6-bookshelf', 'room-6', -3.45, 10, 1.0, 1.08, moveRotateShapes([
        box(1.08, 1.86, 0.82, -2.9, 0.93, 10.85, 'bookcase'),
        box(0.9, 1.62, 0.07, -2.9, 0.94, 10.4, 'bookcaseBack'),
        box(0.98, 0.1, 0.86, -2.9, 0.36, 10.85, 'shelf'), box(0.98, 0.1, 0.86, -2.9, 0.98, 10.85, 'shelf'), box(0.98, 0.1, 0.86, -2.9, 1.6, 10.85, 'shelf'),
        box(0.15, 0.42, 0.28, -3.24, 0.62, 10.62, 'books.0'), box(0.14, 0.48, 0.28, -3.02, 0.65, 10.62, 'books.1'),
        box(0.14, 0.38, 0.28, -2.79, 0.6, 10.62, 'books.2'), box(0.15, 0.5, 0.28, -2.56, 0.66, 10.62, 'books.3'),
        box(0.15, 0.42, 0.28, -3.14, 1.24, 10.62, 'books.2'), box(0.15, 0.44, 0.28, -2.89, 1.25, 10.62, 'books.0'), box(0.15, 0.37, 0.28, -2.64, 1.22, 10.62, 'books.1'),
      ], [-2.9, 10.85], [-3.45, 10], Math.PI / 2)),
      floorPiece('room-6-study-chair', 'room-6', -1.55, 10.7, 0.78, 0.82, moveRotateShapes([
        box(0.78, 0.16, 0.72, 0.05, 0.53, 9.45, 'coral'), box(0.78, 0.72, 0.15, 0.05, 0.9, 9.12, 'wood'),
        box(0.1, 0.48, 0.1, -0.23, 0.24, 9.14, 'woodDark'), box(0.1, 0.48, 0.1, 0.33, 0.24, 9.14, 'woodDark'),
        box(0.1, 0.48, 0.1, -0.23, 0.24, 9.76, 'woodDark'), box(0.1, 0.48, 0.1, 0.33, 0.24, 9.76, 'woodDark'),
      ], [0.05, 9.45], [-1.55, 10.7], Math.PI)),
      floorPiece('room-6-plant', 'room-6', 3, 5.75, 1.1, 1.1, [cyl(0.27, 0.2, 0.4, 3, 0.2, 5.75, 'coral'), sphere(0.3, 2.8, 0.7, 5.75, 'leaf'), sphere(0.3, 3.2, 0.72, 5.75, 'leaf'), sphere(0.24, 3, 1, 5.75, 'leaf')]),
    );
  }

  if (unlocked.has('room-7')) {
    add(
      floorPiece('room-7-tub', 'room-7', -0.8, -10.85, 2.65, 1.75, moveRotateShapes([
        box(2.65, 0.56, 1.62, -1.25, 0.28, -9.75, 'windowGlass'),
        box(2.45, 0.36, 1.42, -1.25, 0.52, -9.75, 'cream'),
        box(2.08, 0.14, 1.03, -1.25, 0.72, -9.75, 'windowGlass'),
        cyl(0.11, 0.11, 0.22, -2.25, 0.72, -9.0, 'gold', 8),
      ], [-1.25, -9.75], [-0.8, -10.85], 0)),
      floorPiece('room-7-vanity-sink', 'room-7', 1.55, -10.85, 1.42, 1.08, moveRotateShapes([
        box(1.3, 0.84, 0.9, 2, 0.42, -5.65, 'wood'),
        box(1.42, 0.14, 1.02, 2, 0.91, -5.65, 'cream'),
        box(0.72, 0.18, 0.55, 2, 1.05, -5.65, 'windowGlass'),
        cyl(0.05, 0.05, 0.4, 2, 1.14, -5.34, 'trim', 10),
        cyl(0.045, 0.045, 0.28, 2, 1.34, -5.49, 'gold', 10),
      ], [2, -5.65], [1.55, -10.85], 0)),
      { id: 'room-7-bath-mat', roomId: 'room-7', shapes: [box(1.5, 0.02, 0.9, -0.8, 0.012, -9.2, 'rugB')] },
      floorPiece('room-7-plant', 'room-7', -3.05, -5.75, 1.1, 1.1, [cyl(0.27, 0.2, 0.42, -3.05, 0.21, -5.75, 'cream'), sphere(0.29, -3.25, 0.71, -5.75, 'leaf'), sphere(0.29, -2.85, 0.72, -5.75, 'leaf'), sphere(0.24, -3.05, 1.02, -5.75, 'leaf')]),
      artPiece('room-7-mirror', 'room-7', [box(1.22, 1.0, 0.08, 2, 1.78, -3.91, 'frame'), box(1.02, 0.8, 0.035, 2, 1.78, -3.85, 'windowGlass')]),
    );
  }

  if (unlocked.has('room-8')) {
    add(
      floorPiece('room-8-workbench', 'room-8', 18.25, -6.25, 2.7, 0.9, [
        box(2.7, 0.16, 0.9, 18.25, 0.83, -6.25, 'wood'),
        box(0.16, 0.78, 0.16, 17.15, 0.39, -6.58, 'woodDark'), box(0.16, 0.78, 0.16, 19.35, 0.39, -6.58, 'woodDark'),
        box(0.16, 0.78, 0.16, 17.15, 0.39, -5.92, 'woodDark'), box(0.16, 0.78, 0.16, 19.35, 0.39, -5.92, 'woodDark'),
        cyl(0.24, 0.24, 0.12, 17.75, 0.98, -6.25, 'ink', 12), cyl(0.24, 0.24, 0.12, 18.75, 0.98, -6.25, 'gold', 12),
      ]),
      floorPiece('room-8-tire-stack', 'room-8', 15.0, -9.7, 0.88, 0.88, [cyl(0.43, 0.43, 0.24, 15, 0.12, -9.7, 'ink', 14), cyl(0.43, 0.43, 0.24, 15, 0.36, -9.7, 'woodDark', 14), cyl(0.43, 0.43, 0.24, 15, 0.6, -9.7, 'ink', 14)]),
      floorPiece('room-8-plant', 'room-8', 18.7, -10.65, 1.1, 1.1, [cyl(0.27, 0.2, 0.4, 18.7, 0.2, -10.65, 'coral'), sphere(0.3, 18.5, 0.72, -10.65, 'leaf'), sphere(0.3, 18.9, 0.72, -10.65, 'leaf'), sphere(0.24, 18.7, 1.02, -10.65, 'leaf')]),
      { id: 'room-8-rug', roomId: 'room-8', shapes: [box(1.9, 0.02, 1.35, 17, 0.012, -8.25, 'rugA')] },
    );
  }

  if (unlocked.has('room-9')) {
    add(
      floorPiece('room-9-washer', 'room-9', 17.85, 10.45, 1.0, 1.9, [
        box(1.0, 1.62, 1.12, 17.85, 0.81, 10.45, 'cream'),
        box(0.76, 0.32, 0.05, 17.85, 1.42, 9.87, 'wood'),
        cyl(0.34, 0.34, 0.07, 17.85, 0.75, 9.86, 'windowGlass', 16), cyl(0.24, 0.24, 0.08, 17.85, 0.75, 9.81, 'ink', 16),
      ]),
      floorPiece('room-9-dryer', 'room-9', 19.0, 10.45, 0.92, 1.82, [
        box(0.92, 1.58, 1.08, 19, 0.79, 10.45, 'windowGlass'),
        box(0.7, 0.25, 0.05, 19, 1.4, 9.89, 'wood'), cyl(0.31, 0.31, 0.07, 19, 0.72, 9.88, 'cream', 16),
      ]),
      floorPiece('room-9-laundry-shelf', 'room-9', 14.2, 10.65, 1.25, 0.72, [
        box(1.25, 0.14, 0.72, 14.2, 1.3, 10.65, 'wood'), box(1.25, 0.14, 0.72, 14.2, 0.34, 10.65, 'wood'),
        box(0.12, 1.0, 0.12, 13.67, 0.82, 10.65, 'woodDark'), box(0.12, 1.0, 0.12, 14.73, 0.82, 10.65, 'woodDark'),
        box(0.38, 0.42, 0.34, 13.93, 0.55, 10.65, 'coral'), box(0.38, 0.48, 0.34, 14.42, 0.58, 10.65, 'rugB'),
      ]),
      floorPiece('room-9-plant', 'room-9', 14.5, 5.45, 1.1, 1.1, [cyl(0.27, 0.2, 0.4, 14.5, 0.2, 5.45, 'wood'), sphere(0.3, 14.3, 0.7, 5.45, 'leaf'), sphere(0.3, 14.7, 0.72, 5.45, 'leaf'), sphere(0.24, 14.5, 1.0, 5.45, 'leaf')]),
      { id: 'room-9-rug', roomId: 'room-9', shapes: [box(1.6, 0.02, 1.2, 16, 0.012, 7.35, 'rugB')] },
    );
  }

  if (unlocked.has('room-10')) {
    add(
      { id: 'room-10-rug', roomId: 'room-10', shapes: [box(2.0, 0.02, 1.35, 8, 0.012, 16.45, 'rugA'), box(1.62, 0.012, 1.0, 8, 0.028, 16.45, 'rugInset')] },
      floorPiece('room-10-entry-bench', 'room-10', 10.3, 16.5, 1.65, 0.78, [
        box(1.65, 0.16, 0.78, 10.3, 0.52, 16.5, 'wood'),
        box(0.12, 0.44, 0.62, 9.68, 0.22, 16.5, 'woodDark'), box(0.12, 0.44, 0.62, 10.92, 0.22, 16.5, 'woodDark'),
        box(0.62, 0.12, 0.48, 10.05, 0.69, 16.5, 'coral'), box(0.62, 0.12, 0.48, 10.65, 0.69, 16.5, 'cream'),
      ]),
      floorPiece('room-10-plant', 'room-10', 5.65, 17.45, 1.1, 1.1, [cyl(0.27, 0.2, 0.4, 5.65, 0.2, 17.45, 'cream'), sphere(0.3, 5.45, 0.7, 17.45, 'leaf'), sphere(0.3, 5.85, 0.72, 17.45, 'leaf'), sphere(0.24, 5.65, 1.0, 17.45, 'leaf')]),
    );
  }

  if (unlocked.has('yard-main')) {
    add(
      floorPiece('yard-trampoline', 'yard-main', 4, 26, 2.85, 2.85, [
        cyl(1.05, 1.05, 0.12, 4, 0.12, 26, 'ink', 20),
        torus(1.12, 0.075, 4, 0.23, 26, 'trim'),
        cyl(0.98, 0.98, 0.035, 4, 0.2, 26, 'rugB', 20),
        box(0.08, 0.52, 0.08, 3.05, 0.28, 26, 'woodDark'), box(0.08, 0.52, 0.08, 4.95, 0.28, 26, 'woodDark'),
        box(0.08, 0.52, 0.08, 4, 0.28, 25.05, 'woodDark'), box(0.08, 0.52, 0.08, 4, 0.28, 26.95, 'woodDark'),
      ]),
      floorPiece('yard-bench', 'yard-main', 2.6, 22.2, 1.8, 0.86, [
        box(1.8, 0.16, 0.86, 2.6, 0.5, 22.2, 'wood'), box(1.8, 0.58, 0.14, 2.6, 0.82, 21.84, 'woodDark'),
        box(0.14, 0.42, 0.14, 1.85, 0.21, 21.9, 'woodDark'), box(0.14, 0.42, 0.14, 3.35, 0.21, 21.9, 'woodDark'),
        box(0.14, 0.42, 0.14, 1.85, 0.21, 22.5, 'woodDark'), box(0.14, 0.42, 0.14, 3.35, 0.21, 22.5, 'woodDark'),
      ]),
      floorPiece('yard-telescope', 'yard-main', 2.5, 23.55, 1.4, 0.75, [
        box(0.32, 0.18, 0.32, 2.4, 0.1, 23.55, 'trim'),
        box(0.12, 1.55, 0.12, 2.4, 0.84, 23.55, 'trim'),
        box(0.85, 0.32, 0.32, 2.65, 1.58, 23.7, 'ink'),
        cyl(0.28, 0.28, 0.08, 2.4, 0.09, 23.55, 'woodDark', 8),
      ]),
      floorPiece('yard-plant', 'yard-main', 6.5, 21.8, 1.1, 1.1, [cyl(0.27, 0.2, 0.4, 6.5, 0.2, 21.8, 'wood'), sphere(0.3, 6.3, 0.72, 21.8, 'leaf'), sphere(0.3, 6.7, 0.72, 21.8, 'leaf'), sphere(0.24, 6.5, 1.02, 21.8, 'leaf')]),
    );
  }

  for (const room of rooms) {
    if (!unlocked.has(room.id) || room.kind === 'yard' || room.kind === 'pool') continue;
    const [rx, rz] = room.position;
    const [w, d] = room.size;
    for (const side of room.walls) {
      if (side !== 'north' && side !== 'west') continue;
      if (side === 'north') {
        const opening = room.connections.find((connection) => connection.side === side && unlocked.has(connection.to));
        const offset = opening?.offset ?? 0;
        const sign = offset >= 0 ? -1 : 1;
        const x = rx + sign * Math.min(w / 4, Math.abs(offset) + 1.45);
        add(makeWallArt(room.id, side, x, rz - d / 2, rz - d / 2));
      } else {
        const opening = room.connections.find((connection) => connection.side === side && unlocked.has(connection.to));
        const offset = opening?.offset ?? 0;
        const sign = offset >= 0 ? -1 : 1;
        const z = rz + sign * Math.min(d / 4, Math.abs(offset) + 1.45);
        add(makeWallArt(room.id, side, rx - w / 2, z, rx - w / 2));
      }
    }
  }

  return { pieces, blocks: pieces.flatMap((piece) => piece.block ? [piece.block] : []) };
}
