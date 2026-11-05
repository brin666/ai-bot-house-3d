import * as THREE from 'three';

export type PaintingTheme =
  | 'bedroom'
  | 'living'
  | 'kitchen'
  | 'music'
  | 'game'
  | 'study'
  | 'bath'
  | 'garage'
  | 'laundry'
  | 'foyer';

const textureCache = new Map<string, THREE.CanvasTexture>();

const themesByRoom: Record<string, PaintingTheme> = {
  'room-1': 'bedroom',
  'room-2': 'living',
  'room-3': 'kitchen',
  'room-4': 'music',
  'room-5': 'game',
  'room-6': 'study',
  'room-7': 'bath',
  'room-8': 'garage',
  'room-9': 'laundry',
  'room-10': 'foyer',
};

type Random = () => number;
type Drawer = (ctx: CanvasRenderingContext2D, variant: number, random: Random) => void;

function seededRandom(seed: number): Random {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function fill(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function polygon(ctx: CanvasRenderingContext2D, color: string, points: Array<[number, number]>) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
}

function ellipse(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, rx: number, ry: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function line(ctx: CanvasRenderingContext2D, color: string, width: number, points: Array<[number, number]>) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function landscape(ctx: CanvasRenderingContext2D, variant: number, random: Random) {
  const sky = ['#f7bd62', '#315d86', '#f5d596', '#54a7b0'][variant];
  const land = ['#357f63', '#364c6d', '#54745a', '#e78355'][variant];
  fill(ctx, sky, 0, 0, 128, 128);
  if (variant === 1) {
    ellipse(ctx, '#f6e8b5', 91, 29, 15, 15);
    ellipse(ctx, sky, 99, 23, 14, 14);
    for (const [x, y] of [[25, 22], [49, 39], [108, 54], [72, 16]]) ellipse(ctx, '#fff1bd', x, y, 2, 2);
  } else {
    const sunColor = variant === 3 ? '#ffe46b' : '#f35e4c';
    ellipse(ctx, sunColor, variant === 2 ? 64 : 91, variant === 2 ? 52 : 32, variant === 2 ? 22 : 15, variant === 2 ? 22 : 15);
  }
  if (variant === 2) {
    polygon(ctx, '#705d78', [[0, 92], [30, 48], [55, 84], [82, 38], [128, 94], [128, 128], [0, 128]]);
    polygon(ctx, '#e9f0d1', [[20, 62], [30, 48], [40, 64], [34, 59], [29, 66]]);
    polygon(ctx, '#e9f0d1', [[70, 55], [82, 38], [96, 58], [85, 52], [80, 61]]);
    fill(ctx, '#398ca0', 0, 94, 128, 34);
    line(ctx, '#8ad1c2', 4, [[15, 107], [44, 104], [70, 110], [112, 105]]);
  } else {
    polygon(ctx, land, [[0, 91], [24, 61 + random() * 10], [47, 88], [76, 51 + random() * 10], [104, 89], [128, 67], [128, 128], [0, 128]]);
    polygon(ctx, variant === 1 ? '#60836e' : '#58a875', [[0, 104], [36, 83], [66, 103], [100, 78], [128, 98], [128, 128], [0, 128]]);
    if (variant === 3) fill(ctx, '#287e8b', 0, 112, 128, 16);
  }
  for (let i = 0; i < 5; i++) {
    const x = 8 + random() * 112;
    const y = 107 + random() * 14;
    fill(ctx, variant === 1 ? '#b8c879' : '#f6e5a4', x, y, 3, 2);
  }
}

function living(ctx: CanvasRenderingContext2D, variant: number, random: Random) {
  fill(ctx, ['#f2c978', '#70b6a4', '#f1a071', '#e7dfb8'][variant], 0, 0, 128, 128);
  fill(ctx, '#fff0cf', 10, 10, 108, 108);
  fill(ctx, ['#dc694f', '#315f52', '#e3a844', '#bd6754'][variant], 19, 87, 90, 24);
  if (variant === 1 || variant === 3) {
    line(ctx, '#39724a', 7, [[64, 91], [64, 54], [48, 34]]);
    line(ctx, '#39724a', 7, [[64, 71], [81, 48], [91, 30]]);
    line(ctx, '#39724a', 6, [[64, 79], [41, 65], [32, 47]]);
    ellipse(ctx, '#53a95f', 43, 38, 12, 7);
    ellipse(ctx, '#6abb65', 87, 34, 12, 7);
    ellipse(ctx, '#6abb65', 34, 52, 12, 7);
    ellipse(ctx, '#f2c14b', 62, 51, 9, 9);
    polygon(ctx, '#ce7951', [[42, 91], [86, 91], [79, 117], [49, 117]]);
  } else {
    ellipse(ctx, '#ed805b', 63, 42, 17, 17);
    for (let i = 0; i < 7; i++) {
      const angle = (Math.PI * 2 * i) / 7;
      ellipse(ctx, i % 2 ? '#f2b94e' : '#e86352', 63 + Math.cos(angle) * 18, 42 + Math.sin(angle) * 18, 8, 11);
    }
    ellipse(ctx, '#705b86', 63, 42, 8, 8);
    line(ctx, '#3f8653', 6, [[63, 59], [63, 92]]);
    polygon(ctx, '#4fa762', [[61, 77], [40, 67], [34, 78], [54, 87]]);
    polygon(ctx, '#4fa762', [[65, 73], [87, 62], [91, 73], [70, 85]]);
    polygon(ctx, '#be654d', [[42, 91], [86, 91], [79, 117], [49, 117]]);
  }
  for (let i = 0; i < 4; i++) ellipse(ctx, '#397c62', 25 + random() * 78, 22 + random() * 12, 2, 2);
}

function kitchen(ctx: CanvasRenderingContext2D, variant: number, random: Random) {
  fill(ctx, '#fff1cf', 0, 0, 128, 128);
  fill(ctx, '#e25d49', 0, 0, 128, 12);
  fill(ctx, '#f2c14b', 12, 21, 104, 3);
  const fruitColors = ['#e65046', '#f2ae32', '#79b94f', '#d45b8a'];
  if (variant === 0) {
    ellipse(ctx, fruitColors[0], 44, 69, 25, 29);
    ellipse(ctx, fruitColors[0], 80, 69, 25, 29);
    ellipse(ctx, '#f47757', 52, 61, 8, 12);
    ellipse(ctx, '#f47757', 87, 61, 8, 12);
    line(ctx, '#5e7941', 6, [[62, 44], [69, 31], [76, 43]]);
  } else if (variant === 1) {
    ellipse(ctx, fruitColors[1], 64, 72, 27, 31);
    ellipse(ctx, '#ffe06a', 57, 62, 6, 10);
    line(ctx, '#5e7941', 5, [[63, 43], [67, 29]]);
    ellipse(ctx, '#6ca94e', 78, 35, 13, 7);
  } else if (variant === 2) {
    ellipse(ctx, fruitColors[2], 64, 73, 27, 29);
    fill(ctx, '#fff1cf', 59, 43, 10, 14);
    line(ctx, '#426d49', 5, [[64, 44], [69, 30]]);
    ellipse(ctx, '#d94e46', 83, 86, 17, 16);
  } else {
    ellipse(ctx, '#f5a528', 48, 73, 23, 23);
    ellipse(ctx, '#f5a528', 80, 73, 23, 23);
    ellipse(ctx, '#f3c54e', 64, 84, 25, 20);
    ellipse(ctx, '#f8db78', 64, 83, 16, 12);
    for (let i = 0; i < 5; i++) ellipse(ctx, '#fff1cf', 50 + random() * 28, 77 + random() * 15, 2, 2);
  }
  fill(ctx, '#397b69', 20, 111, 88, 7);
  fill(ctx, '#e25d49', 31, 38, 4, 4);
  fill(ctx, '#e25d49', 92, 38, 4, 4);
}

function study(ctx: CanvasRenderingContext2D, variant: number, random: Random) {
  fill(ctx, ['#f5dfaa', '#d6ebc5', '#f4d5b5', '#d7e6df'][variant], 0, 0, 128, 128);
  polygon(ctx, ['#e4bb70', '#b6d79f', '#ebb995', '#b5d1c8'][variant], [[0, 0], [57, 0], [42, 32], [59, 52], [36, 77], [48, 128], [0, 128]]);
  polygon(ctx, '#6ab7be', [[0, 78], [28, 66], [52, 82], [69, 67], [82, 81], [128, 69], [128, 128], [0, 128]]);
  line(ctx, '#f8f0ce', 7, variant % 2 === 0
    ? [[12, 109], [28, 96], [36, 75], [57, 64], [64, 42], [87, 37], [105, 17], [119, 12]]
    : [[9, 23], [31, 38], [45, 55], [70, 57], [81, 79], [102, 87], [117, 112]]);
  line(ctx, '#dc765b', 3, variant < 2
    ? [[12, 109], [28, 96], [36, 75], [57, 64], [64, 42], [87, 37], [105, 17], [119, 12]]
    : [[9, 23], [31, 38], [45, 55], [70, 57], [81, 79], [102, 87], [117, 112]]);
  for (let i = 0; i < 5; i++) {
    const x = 18 + random() * 92;
    const y = 22 + random() * 89;
    fill(ctx, i % 2 ? '#e65d4e' : '#f2c14b', x - 3, y - 3, 7, 7);
    ellipse(ctx, '#fff8df', x, y, 2, 2);
  }
  fill(ctx, '#2c5361', 4, 4, 18, 8);
  fill(ctx, '#2c5361', 102, 114, 22, 8);
}

function music(ctx: CanvasRenderingContext2D, variant: number, random: Random) {
  fill(ctx, variant % 2 ? '#f5c658' : '#ee765c', 0, 0, 128, 128);
  if (variant % 2 === 0) {
    ellipse(ctx, '#252f48', 64, 66, 45, 45);
    for (const radius of [35, 27, 19]) {
      ctx.strokeStyle = '#59667d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(64, 66, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ellipse(ctx, variant === 0 ? '#f2c14b' : '#55c3bd', 64, 66, 12, 12);
    ellipse(ctx, '#fff0cf', 64, 66, 3, 3);
    fill(ctx, '#fff0cf', variant === 0 ? 25 : 80, 10, 21, 6);
  } else {
    for (let i = 0; i < 5; i++) line(ctx, '#31495f', 2, [[18, 42 + i * 11], [111, 42 + i * 11]]);
    const notes = variant === 1 ? [[35, 61], [68, 40], [91, 72]] : [[29, 80], [57, 50], [91, 58]];
    notes.forEach(([x, y], index) => {
      ellipse(ctx, index === 1 ? '#ed5f50' : '#315f86', x, y, 8, 6);
      line(ctx, '#315f86', 4, [[x + 7, y], [x + 7, y - 28], [x + 19, y - 24]]);
    });
    fill(ctx, '#fff0cf', 14 + random() * 20, 14, 25, 11);
  }
  fill(ctx, '#fff0cf', 15, 108, 98, 7);
}

function game(ctx: CanvasRenderingContext2D, variant: number, random: Random) {
  fill(ctx, '#252d54', 0, 0, 128, 128);
  fill(ctx, '#ed5e83', 9, 9, 110, 110);
  fill(ctx, '#342e68', 17, 17, 94, 94);
  if (variant % 2 === 0) {
    ellipse(ctx, '#f4c44d', 42, 65, 28, 19);
    ellipse(ctx, '#f4c44d', 87, 65, 28, 19);
    fill(ctx, '#303e68', 37, 58, 23, 7);
    fill(ctx, '#303e68', 45, 50, 7, 23);
    ellipse(ctx, '#ee5b72', 80, 60, 5, 5);
    ellipse(ctx, '#59c3ba', 94, 70, 5, 5);
    ellipse(ctx, '#f5d567', 81, 76, 5, 5);
    ellipse(ctx, '#9b78d1', 96, 55, 5, 5);
    polygon(ctx, '#fff1cf', [[57, 80], [71, 86], [64, 95], [51, 89]]);
  } else {
    const sprite = variant === 1
      ? [[4, 0, 4], [3, 1, 6], [2, 2, 8], [1, 3, 10], [1, 4, 10], [2, 5, 8], [3, 6, 6], [4, 7, 4]]
      : [[3, 0, 6], [2, 1, 8], [1, 2, 10], [1, 3, 10], [0, 4, 12], [2, 5, 8], [3, 6, 6], [4, 7, 4]];
    sprite.forEach(([row, start, count]) => {
      for (let i = 0; i < count; i++) {
        const color = (row + i + variant) % 3 === 0 ? '#f4c44d' : '#62cfb3';
        fill(ctx, color, 29 + (start + i) * 6, 30 + row * 7, 6, 7);
      }
    });
    fill(ctx, '#fff1cf', 43, 45, 6, 6);
    fill(ctx, '#fff1cf', 73, 45, 6, 6);
    for (let i = 0; i < 4; i++) fill(ctx, '#6a78c8', 25 + random() * 75, 24 + random() * 75, 3, 3);
  }
}

function bath(ctx: CanvasRenderingContext2D, variant: number, random: Random) {
  fill(ctx, ['#76cbd0', '#62b2d3', '#9bd5ca', '#77b9c5'][variant], 0, 0, 128, 128);
  fill(ctx, '#e8f3d7', 12, 13, 104, 102);
  fill(ctx, ['#4baeb8', '#377da7', '#56a8af', '#428eaa'][variant], 12, 70, 104, 45);
  for (let i = 0; i < 4; i++) {
    const y = 73 + i * 10;
    line(ctx, i % 2 ? '#b3e4db' : '#f4efd2', 4, [[15, y], [36, y - 5], [58, y], [80, y - 5], [112, y]]);
  }
  if (variant % 2 === 0) {
    fill(ctx, variant === 0 ? '#f27869' : '#efc64c', 42, 39, 44, 25);
    fill(ctx, '#fff3d8', 46, 34, 36, 7);
    fill(ctx, '#d8a478', 47, 62, 34, 6);
  } else {
    for (let i = 0; i < 7; i++) ellipse(ctx, '#fff5de', 24 + random() * 82, 31 + random() * 38, 5 + random() * 4, 5 + random() * 4);
    ellipse(ctx, '#f7d25c', 64, 51, 12, 12);
  }
  fill(ctx, '#315f72', 26, 105, 76, 6);
}

function garage(ctx: CanvasRenderingContext2D, variant: number, random: Random) {
  fill(ctx, ['#f1c55c', '#81c1c3', '#e58b5d', '#b0c88d'][variant], 0, 0, 128, 128);
  fill(ctx, '#f5edcf', 12, 12, 104, 104);
  if (variant % 2 === 0) {
    const car = variant === 0 ? '#e65f4c' : '#3f7791';
    polygon(ctx, car, [[22, 77], [31, 55], [50, 50], [65, 33], [91, 37], [106, 58], [113, 66], [111, 88], [20, 88]]);
    polygon(ctx, '#a9d9d2', [[54, 53], [67, 39], [87, 42], [98, 57]]);
    ellipse(ctx, '#293b4b', 40, 88, 11, 11);
    ellipse(ctx, '#293b4b', 93, 88, 11, 11);
    ellipse(ctx, '#fff0cf', 40, 88, 4, 4);
    ellipse(ctx, '#fff0cf', 93, 88, 4, 4);
  } else {
    line(ctx, '#3c5360', 14, [[37, 91], [86, 40]]);
    line(ctx, '#3c5360', 14, [[39, 40], [88, 91]]);
    ellipse(ctx, '#e96a50', 63, 65, 14, 14);
    line(ctx, '#fff0cf', 5, [[27, 100], [101, 26]]);
    ellipse(ctx, '#f2c14b', 32 + random() * 55, 37 + random() * 45, 5, 5);
  }
  fill(ctx, '#375967', 22, 105, 84, 7);
}

function laundry(ctx: CanvasRenderingContext2D, variant: number, random: Random) {
  fill(ctx, ['#f6d888', '#87c8d2', '#e8b3ca', '#aad7bb'][variant], 0, 0, 128, 128);
  fill(ctx, '#fff3d8', 12, 12, 104, 104);
  if (variant % 2 === 0) {
    const shirt = variant === 0 ? '#e06c55' : '#4a95ac';
    polygon(ctx, shirt, [[43, 34], [54, 26], [64, 37], [75, 26], [87, 34], [108, 45], [96, 64], [87, 57], [87, 103], [41, 103], [41, 57], [32, 64], [20, 45]]);
    polygon(ctx, '#f6d888', [[54, 27], [64, 39], [75, 27], [70, 48], [58, 48]]);
    fill(ctx, '#f4d360', 59, 57, 4, 32);
  } else {
    for (let i = 0; i < 10; i++) {
      const x = 22 + random() * 84;
      const y = 24 + random() * 80;
      ellipse(ctx, i % 3 === 0 ? '#ef785e' : '#61b8c4', x, y, 5 + random() * 5, 5 + random() * 5);
      ellipse(ctx, '#fff3d8', x - 2, y - 2, 2, 2);
    }
    fill(ctx, '#548b84', 31, 91, 66, 16);
    fill(ctx, '#9dd6d0', 39, 83, 50, 8);
  }
  fill(ctx, '#4a6e70', 23, 108, 82, 6);
}

function foyer(ctx: CanvasRenderingContext2D, variant: number, random: Random) {
  fill(ctx, ['#eaa66c', '#78b7ad', '#eec65f', '#dd8271'][variant], 0, 0, 128, 128);
  fill(ctx, '#fff0ce', 12, 12, 104, 104);
  if (variant % 2 === 0) {
    polygon(ctx, variant === 0 ? '#db6652' : '#528b76', [[28, 58], [64, 28], [100, 58], [92, 58], [92, 96], [36, 96], [36, 58]]);
    fill(ctx, '#f0bd4e', 56, 66, 18, 30);
    ellipse(ctx, '#fff0ce', 69, 80, 2, 2);
    fill(ctx, '#3e5b5a', 31, 100, 66, 7);
  } else {
    fill(ctx, '#3f6674', 25, 29, 78, 69);
    fill(ctx, variant === 1 ? '#efcc60' : '#ef8b63', 34, 38, 60, 51);
    polygon(ctx, '#fff0ce', [[64, 43], [80, 55], [74, 55], [74, 81], [54, 81], [54, 55], [48, 55]]);
    fill(ctx, '#fff0ce', 45, 91, 38, 4);
    for (let i = 0; i < 3; i++) fill(ctx, '#3e5b5a', 41 + i * 22 + random() * 4, 104, 12, 4);
  }
}

const drawers: Record<PaintingTheme, Drawer> = {
  bedroom: landscape,
  living,
  kitchen,
  music,
  game,
  study,
  bath,
  garage,
  laundry,
  foyer,
};

export function paintingThemeForRoom(roomId: string): PaintingTheme {
  return themesByRoom[roomId] ?? 'living';
}

/** Stable hash with a two-bit composition slot to keep all panes in a room distinct. */
export function paintingVariantSeed(pieceId: string, pane: 'pictureA' | 'pictureB') {
  const sideSlot = pieceId.endsWith('-west') ? 2 : 0;
  const paneSlot = pane === 'pictureA' ? 0 : 1;
  return (hashSeed(`${pieceId}:${pane}`) & 0x3fff_ffff) * 4 + sideSlot + paneSlot;
}

export function paintingTexture(theme: PaintingTheme, variantSeed: number, size = 128) {
  const key = `${theme}:${variantSeed}:${size}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create a canvas context for wall painting art.');
  drawers[theme](ctx, variantSeed % 4, seededRandom(variantSeed));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}
