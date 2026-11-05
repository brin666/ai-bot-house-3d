import * as THREE from 'three';
import { look } from './look';

type SurfaceKind = 'wallpaper' | 'floor';
type WallSide = 'north' | 'west';
type Pattern =
  | 'flowers' | 'stripes' | 'plaid' | 'polka' | 'diamonds' | 'stars' | 'waves' | 'sprinkles' | 'leaves' | 'arches' | 'wainscoting'
  | 'brick' | 'planks' | 'checker' | 'tiles' | 'carpet' | 'concrete' | 'grid' | 'entry';
type SurfaceStyle = { pattern: Pattern; base: string; accent: string };
type SurfaceOptions = { wallSide?: WallSide; roomSize?: [number, number] };

const wallpaperStyles: Record<string, SurfaceStyle> = {
  'room-1': { pattern: 'flowers', base: '#f0dfb9', accent: '#dbc488' },
  'room-2': { pattern: 'wainscoting', base: '#d5e8d0', accent: '#adcea6' },
  'room-3': { pattern: 'polka', base: '#efd5c0', accent: '#d9aa8b' },
  'room-4': { pattern: 'diamonds', base: '#d1e7e9', accent: '#a4cbd2' },
  'room-5': { pattern: 'brick', base: '#edd1d9', accent: '#d8aab8' },
  'room-6': { pattern: 'plaid', base: '#e0d7ed', accent: '#bcb1d7' },
  'room-7': { pattern: 'waves', base: '#d1e8dc', accent: '#a9cfbd' },
  'room-8': { pattern: 'sprinkles', base: '#e5e0d5', accent: '#c9c1b3' },
  'room-9': { pattern: 'leaves', base: '#ecddbd', accent: '#d3bd8e' },
  'room-10': { pattern: 'arches', base: '#ead8b5', accent: '#cfb080' },
};

const floorStyles: Record<string, SurfaceStyle> = {
  'room-1': { pattern: 'planks', base: '#e4cc93', accent: '#d1b278' },
  'room-2': { pattern: 'checker', base: '#b9d4b4', accent: '#a2c39c' },
  'room-3': { pattern: 'tiles', base: '#dfb89a', accent: '#c99472' },
  'room-4': { pattern: 'grid', base: '#b4d0d7', accent: '#95bac6' },
  'room-5': { pattern: 'carpet', base: '#dab4c3', accent: '#c996aa' },
  'room-6': { pattern: 'planks', base: '#c7bcdd', accent: '#afa1cb' },
  'room-7': { pattern: 'carpet', base: '#aecdbe', accent: '#98b8a9' },
  'room-8': { pattern: 'concrete', base: '#c9c4b7', accent: '#b5ae9f' },
  'room-9': { pattern: 'planks', base: '#ddc99f', accent: '#c9b282' },
  'room-10': { pattern: 'entry', base: '#d7bb90', accent: '#c3a373' },
};

const WALL_INK = '#2a3d4a';
const SURFACE_LINE_OPACITY = 0.48;
const SURFACE_CANVAS_SCALE = 2;
const SURFACE_LINE_CSS_PIXELS = 1.7;
const WALL_WORLD_HEIGHT = 2.35;
const PAPER_TILE_SIZE = 32;
const BAYER_8 = [
  0, 48, 12, 60, 3, 51, 15, 63,
  32, 16, 44, 28, 35, 19, 47, 31,
  8, 56, 4, 52, 11, 59, 7, 55,
  40, 24, 36, 20, 43, 27, 39, 23,
  2, 50, 14, 62, 1, 49, 13, 61,
  34, 18, 46, 30, 33, 17, 45, 29,
  10, 58, 6, 54, 9, 57, 5, 53,
  42, 26, 38, 22, 41, 25, 37, 21,
];
const textures = new Map<string, THREE.CanvasTexture>();
const materials = new Map<string, THREE.MeshLambertMaterial>();
let sharedPaperTile: HTMLCanvasElement | null = null;
let surfaceAnisotropy = 1;
let surfaceCssPixelsPerWorldUnit = 80;

/** Mark room finishes in the existing RGBA color target so the paper pass can skip screen dither. */
export function markRoomSurfaceMaterial<T extends THREE.Material>(material: T): T {
  if (material.userData.roomSurfaceAlphaMarker) return material;
  material.onBeforeCompile = (shader) => {
    const outputChunk = '#include <opaque_fragment>';
    shader.fragmentShader = shader.fragmentShader.replace(
      outputChunk,
      outputChunk + '\n  gl_FragColor.a = 0.0;',
    );
  };
  material.customProgramCacheKey = () => 'room-surface-alpha-marker-v1';
  material.userData.roomSurfaceAlphaMarker = true;
  return material;
}

function logicalLineWidth(texelsPerWorldUnit: number) {
  // Texture coverage and CSS projection set the stroke width; DPR cancels because
  // a source texel projects to the same CSS width on the composited canvas.
  return (SURFACE_LINE_CSS_PIXELS * texelsPerWorldUnit / surfaceCssPixelsPerWorldUnit) / SURFACE_CANVAS_SCALE;
}

function mixColor(first: string, second: string, amount: number) {
  const channel = (color: string, index: number) => parseInt(color.slice(index, index + 2), 16);
  const toHex = (value: number) => Math.round(value).toString(16).padStart(2, '0');
  return '#' + [1, 3, 5].map((index) => toHex(channel(first, index) * (1 - amount) + channel(second, index) * amount)).join('');
}

function rgbaColor(color: string, alpha: number) {
  const channels = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16)).join(', ');
  return 'rgba(' + channels + ', ' + alpha + ')';
}

function randomFor(seed: string) {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function paperFiberTile() {
  if (sharedPaperTile) return sharedPaperTile;
  const tile = document.createElement('canvas');
  tile.width = PAPER_TILE_SIZE;
  tile.height = PAPER_TILE_SIZE;
  const ctx = tile.getContext('2d');
  if (!ctx) return null;
  const random = randomFor('room-paper-fibres-v1');
  const wrapped = (draw: (x: number, y: number) => void, x: number, y: number) => {
    for (const ox of [-PAPER_TILE_SIZE, 0, PAPER_TILE_SIZE]) {
      for (const oy of [-PAPER_TILE_SIZE, 0, PAPER_TILE_SIZE]) draw(x + ox, y + oy);
    }
  };

  for (let i = 0; i < 78; i++) {
    const x = random() * PAPER_TILE_SIZE;
    const y = random() * PAPER_TILE_SIZE;
    const length = 2 + random() * 7;
    const angle = (random() - 0.5) * Math.PI;
    ctx.strokeStyle = rgbaColor(random() > 0.23 ? WALL_INK : '#fff8e9', 0.035 + random() * 0.045);
    ctx.lineWidth = 0.35 + random() * 0.45;
    wrapped((px, py) => {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + Math.cos(angle) * length, py + Math.sin(angle) * length);
      ctx.stroke();
    }, x, y);
  }

  for (let i = 0; i < 92; i++) {
    const x = random() * PAPER_TILE_SIZE;
    const y = random() * PAPER_TILE_SIZE;
    const radius = 0.25 + random() * 0.55;
    ctx.fillStyle = rgbaColor(random() > 0.18 ? WALL_INK : '#fff8e9', 0.025 + random() * 0.045);
    wrapped((px, py) => {
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }, x, y);
  }

  // Low-frequency pigment flecks keep the printed tone from looking perfectly flat.
  for (let i = 0; i < 24; i++) {
    const x = random() * PAPER_TILE_SIZE;
    const y = random() * PAPER_TILE_SIZE;
    const radius = 0.8 + random() * 1.4;
    ctx.fillStyle = rgbaColor(WALL_INK, 0.018 + random() * 0.025);
    wrapped((px, py) => {
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }, x, y);
  }

  sharedPaperTile = tile;
  return tile;
}

function drawPaperLayer(ctx: CanvasRenderingContext2D, logicalSize: [number, number]) {
  const tile = paperFiberTile();
  const pattern = tile && ctx.createPattern(tile, 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, logicalSize[0], logicalSize[1]);
  ctx.restore();
}

function ditherCellSize(kind: SurfaceKind, canvasWidth: number, roomSize: [number, number]) {
  const texturePixelsPerWorld = (kind === 'wallpaper' ? canvasWidth * 3 : canvasWidth) / roomSize[0];
  const ideal = texturePixelsPerWorld * look.dither.blockSize / surfaceCssPixelsPerWorldUnit;
  return [2, 4, 8].reduce((closest, candidate) =>
    Math.abs(candidate - ideal) < Math.abs(closest - ideal) ? candidate : closest, 4);
}

/** Bake a texture-anchored, 8x8 Bayer pattern at approximately the furniture block size. */
function bakeSurfaceDither(canvas: HTMLCanvasElement, kind: SurfaceKind, roomId: string, roomSize: [number, number]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = image.data;
  const cellSize = ditherCellSize(kind, canvas.width, roomSize);
  const steps = Math.max(look.dither.levels - 1, 1);
  const phase = randomFor(roomId + ':' + kind + ':bayer');
  const phaseX = Math.floor(phase() * 8);
  const phaseY = Math.floor(phase() * 8);
  const dotGain = look.dither.dotGain;
  const strength = look.dither.strength;

  for (let top = 0, row = 0; top < canvas.height; top += cellSize, row++) {
    const bottom = Math.min(canvas.height, top + cellSize);
    for (let left = 0, column = 0; left < canvas.width; left += cellSize, column++) {
      const right = Math.min(canvas.width, left + cellSize);
      const sample = ((Math.floor((top + bottom - 1) / 2) * canvas.width) + Math.floor((left + right - 1) / 2)) * 4;
      const threshold = (BAYER_8[((row + phaseY) & 7) * 8 + ((column + phaseX) & 7)] + 0.5) / 64;
      const screen = 1 - dotGain + threshold * (dotGain * 1.35);
      const quantize = (value: number) => {
        const original = value / 255;
        const quantized = Math.max(0, Math.min(1, Math.floor(original * steps + threshold) / steps * screen));
        return Math.round((original + (quantized - original) * strength) * 255);
      };
      const red = quantize(pixels[sample]);
      const green = quantize(pixels[sample + 1]);
      const blue = quantize(pixels[sample + 2]);
      for (let y = top; y < bottom; y++) {
        for (let x = left; x < right; x++) {
          const index = (y * canvas.width + x) * 4;
          pixels[index] = red;
          pixels[index + 1] = green;
          pixels[index + 2] = blue;
        }
      }
    }
  }
  ctx.putImageData(image, 0, 0);
}

function wobblyLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  random: () => number,
  jitter: number,
) {
  const horizontal = Math.abs(x2 - x1) >= Math.abs(y2 - y1);
  const length = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(2, Math.ceil(length / 24));
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  for (let step = 1; step < steps; step++) {
    const t = step / steps;
    const x = x1 + (x2 - x1) * t + (horizontal ? 0 : (random() - 0.5) * jitter);
    const y = y1 + (y2 - y1) * t + (horizontal ? (random() - 0.5) * jitter : 0);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawWallPattern(
  ctx: CanvasRenderingContext2D,
  style: SurfaceStyle,
  seed: string,
  wallSide: WallSide,
  logicalSize: [number, number],
  roomSize: [number, number],
) {
  const [width, height] = logicalSize;
  const random = randomFor(seed);
  // North is the back-lit wall in the default view; west is the lit side.
  const backLit = wallSide === 'north';
  const wallStyle = {
    base: mixColor(style.base, backLit ? '#2a3d4a' : '#fff8eb', backLit ? 0.11 : 0.035),
    accent: mixColor(style.accent, backLit ? '#344955' : '#fff8eb', backLit ? 0.1 : 0.035),
  };
  const tint = mixColor(wallStyle.base, wallStyle.accent, 0.68);
  const faintInk = mixColor(wallStyle.base, WALL_INK, 0.3);

  ctx.fillStyle = wallStyle.base;
  ctx.fillRect(0, 0, width, height);

  const floorGradient = ctx.createLinearGradient(0, height * 0.38, 0, height);
  floorGradient.addColorStop(0, 'rgba(42, 61, 74, 0)');
  floorGradient.addColorStop(0.55, `rgba(42, 61, 74, ${backLit ? 0.08 : 0.055})`);
  floorGradient.addColorStop(1, `rgba(42, 61, 74, ${backLit ? 0.27 : 0.21})`);
  ctx.fillStyle = floorGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.strokeStyle = faintInk;
  ctx.fillStyle = tint;
  const horizontalTexelsPerWorld = logicalSize[0] * SURFACE_CANVAS_SCALE * 3 / roomSize[0];
  const verticalTexelsPerWorld = logicalSize[1] * SURFACE_CANVAS_SCALE / WALL_WORLD_HEIGHT;
  ctx.lineWidth = logicalLineWidth((horizontalTexelsPerWorld + verticalTexelsPerWorld) / 2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (style.pattern === 'stripes') {
    ctx.globalAlpha = 0.16;
    for (let x = 18; x < width; x += 48) ctx.fillRect(x, 0, 2.5, height);
  } else if (style.pattern === 'wainscoting') {
    const railY = Math.round(height * 0.66);
    ctx.globalAlpha = 0.16;
    ctx.fillRect(0, railY, width, height - railY);
    ctx.strokeStyle = WALL_INK;
    ctx.globalAlpha = SURFACE_LINE_OPACITY;
    wobblyLine(ctx, 0, railY, width, railY, random, 0.55);
    wobblyLine(ctx, 0, railY + 3, width, railY + 3, random, 0.45);
    for (let x = 32; x < width; x += 48) wobblyLine(ctx, x, railY + 5, x, height, random, 0.5);
  } else if (style.pattern === 'flowers') {
    const petalInk = mixColor(wallStyle.base, WALL_INK, 0.42);
    const petalEdge = mixColor(wallStyle.base, WALL_INK, 0.3);
    const flowerCenter = mixColor(wallStyle.accent, '#c56a54', 0.42);
    ctx.globalAlpha = 0.74;
    ctx.lineWidth = Math.max(0.75, logicalLineWidth((horizontalTexelsPerWorld + verticalTexelsPerWorld) / 2) * 0.22);
    for (let y = 32; y + 27 < height; y += 56) for (let x = 32; x < width; x += 64) {
      const cx = x + (random() - 0.5) * 2.4;
      const cy = y + (random() - 0.5) * 2.4;
      ctx.strokeStyle = petalEdge;
      ctx.fillStyle = petalInk;
      for (let petal = 0; petal < 5; petal++) {
        const angle = petal * Math.PI * 2 / 5 + (random() - 0.5) * 0.1;
        ctx.save();
        ctx.translate(cx + Math.cos(angle) * 5, cy + Math.sin(angle) * 5);
        ctx.rotate(angle + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(-2.3, 1.2);
        ctx.quadraticCurveTo(-5.5, -3.8, -1.4, -11 + random() * 2);
        ctx.quadraticCurveTo(3.5, -10 + random() * 2, 2.4, 1.2);
        ctx.quadraticCurveTo(0, 3.2, -2.3, 1.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = flowerCenter;
      ctx.beginPath();
      ctx.arc(cx, cy, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = petalEdge;
      ctx.beginPath();
      ctx.moveTo(cx + 1, cy + 7);
      ctx.quadraticCurveTo(cx + 5, cy + 14, cx + 2, cy + 23);
      ctx.stroke();
      ctx.fillStyle = petalInk;
      ctx.beginPath();
      ctx.ellipse(cx + 5, cy + 15, 4.3, 2.2, -0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style.pattern === 'polka') {
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = faintInk;
    for (let y = 28; y < height; y += 56) for (let x = 28 + (y % 112 ? 0 : 28); x < width; x += 56) {
      ctx.beginPath();
      ctx.arc(x + (random() - 0.5) * 2, y + (random() - 0.5) * 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style.pattern === 'diamonds') {
    ctx.strokeStyle = WALL_INK;
    ctx.globalAlpha = 0.25;
    for (let y = 0; y < height + 64; y += 64) for (let x = 0; x < width + 64; x += 64) {
      const skew = (random() - 0.5) * 2;
      wobblyLine(ctx, x, y - 10, x + 10 + skew, y, random, 1.1);
      wobblyLine(ctx, x + 10 + skew, y, x, y + 10, random, 1.1);
      wobblyLine(ctx, x, y + 10, x - 10 + skew, y, random, 1.1);
      wobblyLine(ctx, x - 10 + skew, y, x, y - 10, random, 1.1);
    }
  } else if (style.pattern === 'stars') {
    ctx.strokeStyle = WALL_INK;
    ctx.globalAlpha = 0.19;
    for (let y = 28; y < height; y += 72) for (let x = 28 + (y % 144 ? 0 : 36); x < width; x += 72) {
      ctx.beginPath();
      ctx.moveTo(x - 3, y);
      ctx.lineTo(x + 3, y);
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x, y + 3);
      ctx.stroke();
    }
  } else if (style.pattern === 'plaid') {
    ctx.globalAlpha = 0.1;
    for (let p = 24; p < width; p += 64) {
      ctx.fillRect(p, 0, 2, height);
      ctx.fillRect(0, p, width, 2);
    }
  } else if (style.pattern === 'waves') {
    ctx.strokeStyle = WALL_INK;
    ctx.globalAlpha = 0.18;
    for (let y = 28; y < height; y += 52) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < width; x += 24) ctx.quadraticCurveTo(x + 6, y - 3.5, x + 12, y);
      ctx.stroke();
    }
  } else if (style.pattern === 'sprinkles') {
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 18; i++) {
      const x = random() * width;
      const y = random() * height;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((random() - 0.5) * 0.7);
      ctx.fillRect(-0.8, -2.5, 1.6, 5);
      ctx.restore();
    }
  } else if (style.pattern === 'leaves') {
    ctx.globalAlpha = 0.18;
    for (let y = 42; y < height; y += 88) for (let x = 42; x < width; x += 88) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((x + y) % 2 ? -0.5 : 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, 2, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (style.pattern === 'arches') {
    ctx.strokeStyle = WALL_INK;
    ctx.globalAlpha = 0.17;
    for (let x = 16; x < width; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x, height * 0.34);
      ctx.quadraticCurveTo(x, height * 0.19, x + 16, height * 0.19);
      ctx.quadraticCurveTo(x + 32, height * 0.19, x + 32, height * 0.34);
      ctx.lineTo(x + 32, height);
      ctx.stroke();
    }
  } else if (style.pattern === 'brick') {
    ctx.strokeStyle = WALL_INK;
    ctx.globalAlpha = 0.2;
    for (let y = 0, row = 0; y <= height; y += 32, row++) {
      wobblyLine(ctx, 0, y, width, y, random, 0.35);
      const offset = row % 2 ? 24 : 0;
      for (let x = offset; x < width; x += 48) {
        wobblyLine(ctx, x, y, x, Math.min(height, y + 32), random, 0.3);
      }
    }
  }

  ctx.restore();
}

function drawFloorPattern(
  ctx: CanvasRenderingContext2D,
  style: SurfaceStyle,
  seed: string,
  logicalSize: [number, number],
  roomSize: [number, number],
) {
  const [width, height] = logicalSize;
  const random = randomFor(seed);
  ctx.fillStyle = style.base;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const horizontalTexelsPerWorld = width * SURFACE_CANVAS_SCALE / roomSize[0];
  const verticalTexelsPerWorld = height * SURFACE_CANVAS_SCALE / roomSize[1];
  const floorLineWidth = logicalLineWidth((horizontalTexelsPerWorld + verticalTexelsPerWorld) / 2);
  if (style.pattern === 'planks') {
    const rows: Array<{ y: number; height: number; joints: number[] }> = [];
    let y = 0;
    let row = 0;
    while (y < height) {
      const rowHeight = 48 + random() * 14;
      const bandHeight = Math.min(rowHeight, height - y);
      const joints: number[] = [];
      let x = row % 2 ? -74 - random() * 36 : -18 - random() * 34;
      while (x < width) {
        const plankLength = 118 + random() * 74;
        const plankTone = mixColor(style.base, style.accent, 0.16 + random() * 0.58);
        const finishedTone = random() > 0.56
          ? mixColor(plankTone, '#fff5dc', 0.015 + random() * 0.03)
          : mixColor(plankTone, '#38271d', 0.008 + random() * 0.026);
        ctx.globalAlpha = 1;
        ctx.fillStyle = finishedTone;
        ctx.fillRect(x, y, plankLength, bandHeight);

        // A few long, fine grain marks follow each board instead of a flat color band.
        ctx.lineWidth = Math.max(0.45, floorLineWidth * 0.22);
        for (let grain = 0, count = 2 + Math.floor(random() * 3); grain < count; grain++) {
          const grainY = y + 7 + random() * Math.max(2, bandHeight - 14);
          const start = x + 8 + random() * 12;
          const end = Math.min(x + plankLength - 5, start + plankLength * (0.52 + random() * 0.35));
          ctx.strokeStyle = rgbaColor(mixColor(finishedTone, WALL_INK, 0.24), 0.1 + random() * 0.07);
          ctx.beginPath();
          ctx.moveTo(start, grainY);
          ctx.quadraticCurveTo(start + (end - start) * 0.38, grainY + (random() - 0.5) * 2.4, start + (end - start) * 0.68, grainY + (random() - 0.5) * 2.2);
          ctx.quadraticCurveTo(end - 4, grainY + (random() - 0.5) * 1.8, end, grainY + (random() - 0.5) * 1.4);
          ctx.stroke();
        }

        if (random() < 0.16 && plankLength > 130) {
          const knotX = x + plankLength * (0.35 + random() * 0.3);
          const knotY = y + bandHeight * (0.35 + random() * 0.3);
          ctx.strokeStyle = rgbaColor(WALL_INK, 0.25);
          ctx.lineWidth = Math.max(0.5, floorLineWidth * 0.25);
          ctx.beginPath();
          ctx.ellipse(knotX, knotY, 7 + random() * 2, 2.3 + random(), (random() - 0.5) * 0.12, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(knotX, knotY, 3.8, 1.2, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = rgbaColor(WALL_INK, 0.16);
          ctx.beginPath();
          ctx.ellipse(knotX, knotY, 1.3, 0.75, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        if (x > 0) joints.push(x);
        x += plankLength;
      }
      rows.push({ y, height: bandHeight, joints });
      y += rowHeight;
      row++;
    }

    // Deep blue, gently wandering joints keep the boards hand-laid and readable.
    ctx.strokeStyle = WALL_INK;
    ctx.lineWidth = floorLineWidth;
    ctx.globalAlpha = SURFACE_LINE_OPACITY;
    for (let index = 0; index < rows.length; index++) {
      const plankRow = rows[index];
      if (index > 0) wobblyLine(ctx, 0, plankRow.y, width, plankRow.y, random, 1.25);
      for (const joint of plankRow.joints) {
        wobblyLine(ctx, joint, plankRow.y + 2, joint, plankRow.y + plankRow.height - 2, random, 1.45);
      }
    }
  } else if (style.pattern === 'checker') {
    const cell = 112;
    const checkerTint = mixColor(style.base, style.accent, 0.68);
    for (let y = 0, row = 0; y < height; y += cell, row++) {
      for (let x = 0, column = 0; x < width; x += cell, column++) {
        if ((row + column) % 2 === 0) {
          ctx.fillStyle = checkerTint;
        } else {
          ctx.fillStyle = style.base;
        }
        ctx.globalAlpha = 1;
        ctx.fillRect(x, y, cell, cell);
      }
    }
    drawTileWear(ctx, width, height, cell, style, random);
    ctx.strokeStyle = WALL_INK;
    ctx.lineWidth = floorLineWidth * 0.78;
    ctx.globalAlpha = 0.34;
    for (let x = 0; x <= width; x += cell) wobblyLine(ctx, x, 0, x, height, random, 0.65);
    for (let y = 0; y <= height; y += cell) wobblyLine(ctx, 0, y, width, y, random, 0.65);
  } else if (style.pattern === 'tiles' || style.pattern === 'grid' || style.pattern === 'entry') {
    const cell = style.pattern === 'entry' ? 112 : style.pattern === 'grid' ? 96 : 128;
    const tileTint = mixColor(style.base, style.accent, style.pattern === 'grid' ? 0.52 : 0.38);
    for (let y = 0, row = 0; y < height; y += cell, row++) {
      for (let x = 0, column = 0; x < width; x += cell, column++) {
        if ((row + column) % 2 === 0) {
          ctx.fillStyle = tileTint;
          ctx.globalAlpha = 1;
          ctx.fillRect(x, y, cell, cell);
        }
      }
    }
    drawTileWear(ctx, width, height, cell, style, random);
    ctx.strokeStyle = WALL_INK;
    ctx.lineWidth = floorLineWidth * 0.78;
    ctx.globalAlpha = 0.34;
    for (let x = 0; x <= width; x += cell) wobblyLine(ctx, x, 0, x, height, random, 0.65);
    for (let y = 0; y <= height; y += cell) wobblyLine(ctx, 0, y, width, y, random, 0.65);
  } else if (style.pattern === 'carpet' || style.pattern === 'concrete') {
    ctx.fillStyle = style.accent;
    ctx.globalAlpha = 0.12;
    const count = Math.floor((width * height) / 1100);
    for (let i = 0; i < count; i++) {
      ctx.beginPath();
      ctx.arc(random() * width, random() * height, 0.45 + random() * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawTileWear(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cell: number,
  style: SurfaceStyle,
  random: () => number,
) {
  const highlight = mixColor(style.base, '#fffaf0', 0.56);
  const scuff = mixColor(style.base, WALL_INK, 0.34);
  for (let top = 0; top < height; top += cell) {
    for (let left = 0; left < width; left += cell) {
      for (let speck = 0, count = 2 + Math.floor(random() * 3); speck < count; speck++) {
        const x = left + 5 + random() * Math.max(2, cell - 10);
        const y = top + 5 + random() * Math.max(2, cell - 10);
        const radius = 1 + random() * 1.2;
        ctx.fillStyle = rgbaColor(random() > 0.28 ? highlight : scuff, random() > 0.28 ? 0.32 : 0.12);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      if (random() > 0.55) {
        const x = left + 8 + random() * Math.max(2, cell - 16);
        const y = top + 8 + random() * Math.max(2, cell - 16);
        ctx.strokeStyle = rgbaColor(scuff, 0.1);
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 2, y - 0.8, x + 4 + random() * 3, y + (random() - 0.5) * 1.8);
        ctx.stroke();
      }
    }
  }
}

function addFloorEdgeTreatment(ctx: CanvasRenderingContext2D, style: SurfaceStyle, logicalSize: [number, number]) {
  const [width, height] = logicalSize;
  const edge = Math.max(8, Math.min(width, height) * 0.07);
  const shadowTint = mixColor(style.base, '#000000', 0.8);
  ctx.save();
  const gradients = [
    { gradient: ctx.createLinearGradient(0, 0, edge, 0), x: 0, y: 0, w: edge, h: height },
    { gradient: ctx.createLinearGradient(width, 0, width - edge, 0), x: width - edge, y: 0, w: edge, h: height },
    { gradient: ctx.createLinearGradient(0, 0, 0, edge), x: 0, y: 0, w: width, h: edge },
    { gradient: ctx.createLinearGradient(0, height, 0, height - edge), x: 0, y: height - edge, w: width, h: edge },
  ];
  for (const { gradient, x, y, w, h } of gradients) {
    gradient.addColorStop(0, rgbaColor(shadowTint, 0.07));
    gradient.addColorStop(0.7, rgbaColor(shadowTint, 0.02));
    gradient.addColorStop(1, rgbaColor(shadowTint, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
  }
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = style.accent;
  ctx.lineWidth = 0.8;
  ctx.strokeRect(0.4, 0.4, width - 0.8, height - 0.8);
  ctx.restore();
}

function textureFor(
  roomId: string,
  kind: SurfaceKind,
  roomSize: [number, number] = [8, 8],
  wallSide: WallSide = 'north',
) {
  const key = roomId + ':' + kind + (kind === 'wallpaper' ? ':' + wallSide : '');
  let texture = textures.get(key);
  if (texture) return texture;
  const style = (kind === 'floor' ? floorStyles : wallpaperStyles)[roomId];
  if (!style) return null;

  const canvas = document.createElement('canvas');
  const scale = SURFACE_CANVAS_SCALE;
  canvas.width = kind === 'floor' ? Math.max(256, Math.round(roomSize[0] * 128)) : 512;
  canvas.height = kind === 'floor' ? Math.max(256, Math.round(roomSize[1] * 128)) : 512;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.scale(scale, scale);
  const logicalSize: [number, number] = [canvas.width / scale, canvas.height / scale];
  if (kind === 'floor') {
    drawFloorPattern(context, style, roomId, logicalSize, roomSize);
    addFloorEdgeTreatment(context, style, logicalSize);
  } else {
    drawWallPattern(context, style, roomId, wallSide, logicalSize, roomSize);
  }
  bakeSurfaceDither(canvas, kind, roomId, roomSize);
  drawPaperLayer(context, logicalSize);

  texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = kind === 'floor' ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  texture.wrapT = kind === 'floor' ? THREE.ClampToEdgeWrapping : THREE.ClampToEdgeWrapping;
  texture.repeat.set(kind === 'floor' ? 1 : 3, 1);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = surfaceAnisotropy;
  texture.needsUpdate = true;
  textures.set(key, texture);
  return texture;
}

export function roomSurfaceMaterial(roomId: string, kind: SurfaceKind, options: SurfaceOptions = {}) {
  const wallSide = kind === 'wallpaper' ? options.wallSide ?? 'north' : undefined;
  const key = roomId + ':' + kind + ':' + (wallSide ?? 'default');
  let material = materials.get(key);
  if (!material) {
    const texture = textureFor(roomId, kind, options.roomSize, wallSide ?? 'north');
    if (!texture) {
      const color = kind === 'floor'
        ? look.palette.floors[roomId]
        : wallSide === 'north' ? '#f2f0eb' : '#faf7f1';
      return markRoomSurfaceMaterial(new THREE.MeshLambertMaterial({ color }));
    }
    const color = '#ffffff';
    material = markRoomSurfaceMaterial(new THREE.MeshLambertMaterial({ map: texture, color }));
    materials.set(key, material);
  }
  return material;
}

/** Set once from the active renderer so oblique floor and wall textures stay sharp. */
export function setSurfaceAnisotropy(anisotropy: number) {
  surfaceAnisotropy = Math.max(1, Math.floor(anisotropy));
  for (const texture of textures.values()) {
    if (texture.anisotropy === surfaceAnisotropy) continue;
    texture.anisotropy = surfaceAnisotropy;
    texture.needsUpdate = true;
  }
}

/** Set once from the initial orthographic fit before the room textures are made. */
export function setSurfaceCssPixelsPerWorldUnit(value: number) {
  surfaceCssPixelsPerWorldUnit = Math.max(1, value);
}
