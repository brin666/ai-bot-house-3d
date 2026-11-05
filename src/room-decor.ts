import * as THREE from 'three';
import { DecorBuilder } from './decor-builder';
import { flatMaterial, look } from './look';
import { decorLayout, type DecorShape, type PaletteToken } from './decor-layout';
import { paintingTexture, paintingThemeForRoom, paintingVariantSeed } from './painting-textures';

export type { DecorBlock } from './decor-layout';

type PaintingPane = Extract<DecorShape, { kind: 'box' }>;

function paletteColor(token: PaletteToken) {
  if (token.startsWith('books.')) return look.palette.books[Number(token.slice('books.'.length))];
  return look.palette[token as keyof typeof look.palette] as string;
}

function addPaintingPane(
  shape: PaintingPane,
  roomId: string,
  pieceId: string,
  parent: THREE.Group,
) {
  const pane = shape.color as 'pictureA' | 'pictureB';
  const westWall = shape.w < shape.d;
  const texture = paintingTexture(
    paintingThemeForRoom(roomId),
    paintingVariantSeed(pieceId, pane),
  );
  const width = westWall ? shape.d : shape.w;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, shape.h),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  if (westWall) {
    mesh.position.set(shape.x + shape.w / 2 + 0.001, shape.y, shape.z);
    mesh.rotation.y = Math.PI / 2;
  } else {
    mesh.position.set(shape.x, shape.y, shape.z + shape.d / 2 + 0.001);
  }
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.wallPainting = true;
  parent.add(mesh);
}

export function buildRoomDecor(unlockedIds: string[], parent: THREE.Group) {
  for (const child of [...parent.children]) {
    child.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (object.userData.wallPainting) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) material.dispose();
        }
      }
    });
  }
  parent.clear();
  const layout = decorLayout(unlockedIds);
  const builder = new DecorBuilder();
  for (const piece of layout.pieces) {
    for (const shape of piece.shapes) {
      if (
        piece.wallArt &&
        shape.kind === 'box' &&
        (shape.color === 'pictureA' || shape.color === 'pictureB')
      ) {
        addPaintingPane(shape, piece.roomId, piece.id, parent);
        continue;
      }
      const color = paletteColor(shape.color);
      if (shape.kind === 'box') builder.box(shape.w, shape.h, shape.d, shape.x, shape.y, shape.z, color);
      else if (shape.kind === 'cylinder') builder.cyl(shape.rt, shape.rb, shape.h, shape.x, shape.y, shape.z, color, shape.segments);
      else if (shape.kind === 'sphere') builder.sphere(shape.r, shape.x, shape.y, shape.z, color);
      else builder.torus(shape.r, shape.tube, shape.x, shape.y, shape.z, color);
    }
  }
  builder.flush(parent);
  for (const child of parent.children) {
    child.receiveShadow = !child.userData.wallPainting;
  }
  return layout.blocks;
}
