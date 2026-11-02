import * as THREE from 'three';
import { DecorBuilder } from './decor-builder';
import { flatMaterial, look } from './look';
import { decorLayout, type PaletteToken } from './decor-layout';

export type { DecorBlock } from './decor-layout';

function paletteColor(token: PaletteToken) {
  if (token.startsWith('books.')) return look.palette.books[Number(token.slice('books.'.length))];
  return look.palette[token as keyof typeof look.palette] as string;
}

export function buildRoomDecor(unlockedIds: string[], parent: THREE.Group) {
  for (const child of [...parent.children]) {
    child.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
  }
  parent.clear();
  const layout = decorLayout(unlockedIds);
  const builder = new DecorBuilder();
  for (const piece of layout.pieces) {
    for (const shape of piece.shapes) {
      const color = paletteColor(shape.color);
      if (shape.kind === 'box') builder.box(shape.w, shape.h, shape.d, shape.x, shape.y, shape.z, color);
      else if (shape.kind === 'cylinder') builder.cyl(shape.rt, shape.rb, shape.h, shape.x, shape.y, shape.z, color, shape.segments);
      else if (shape.kind === 'sphere') builder.sphere(shape.r, shape.x, shape.y, shape.z, color);
      else builder.torus(shape.r, shape.tube, shape.x, shape.y, shape.z, color);
    }
  }
  builder.flush(parent);
  for (const child of parent.children) child.receiveShadow = true;
  return layout.blocks;
}
