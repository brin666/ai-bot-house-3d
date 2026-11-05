import * as THREE from 'three';
import { look } from './look';

type SurfaceKind = 'wallpaper' | 'floor';
type WallSide = 'north' | 'west';
type Pattern =
  | 'flowers' | 'stripes' | 'plaid' | 'polka' | 'diamonds' | 'stars' | 'waves' | 'sprinkles' | 'leaves' | 'arches' | 'wainscoting'
  | 'planks' | 'checker' | 'tiles' | 'carpet' | 'concrete' | 'grid' | 'entry';
type SurfaceStyle = { pattern: Pattern; base: string; accent: string };
type SurfaceOptions = { wallSide?: WallSide; roomSize?: [number, number] };

const wallpaperStyles: Record<string, SurfaceStyle> = {
  'room-1': { pattern: 'flowers', base: '#f0e6d0', accent: '#e2d4b8' },
  'room-2': { pattern: 'wainscoting', base: '#e4efe3', accent: '#d3e3d1' },
  'room-3': { pattern: 'polka', base: '#f2e4d8', accent: '#e5d3c4' },
  'room-4': { pattern: 'diamonds', base: '#e4eef1', accent: '#d2e2e7' },
  'room-5': { pattern: 'stars', base: '#f0e2e8', accent: '#e3d1da' },
  'room-6': { pattern: 'plaid', base: '#ebe5f2', accent: '#ddd4ea' },
  'room-7': { pattern: 'waves', base: '#e3efe9', accent: '#d1e3da' },
  'room-8': { pattern: 'sprinkles', base: '#ebe9e3', accent: '#ddd9d0' },
  'room-9': { pattern: 'leaves', base: '#f0e7d8', accent: '#e2d6c2' },
  'room-10': { pattern: 'arches', base: '#f1ead9', accent: '#e3d8c2' },
};

const floorStyles: Record<string, SurfaceStyle> = {
  'room-1': { pattern: 'planks', base: '#e6d7b4', accent: '#d5c39a' },
  'room-2': { pattern: 'checker', base: '#cfe3cf', accent: '#bdd6bc' },
  'room-3': { pattern: 'tiles', base: '#e7d0b8', accent: '#d6bda2' },
  'room-4': { pattern: 'grid', base: '#d0e2e7', accent: '#bcd3da' },
  'room-5': { pattern: 'carpet', base: '#e6d0da', accent: '#d5bdc9' },
  'room-6': { pattern: 'planks', base: '#d9d2e6', accent: '#c7bed8' },
  'room-7': { pattern: 'carpet', base: '#d0e4db', accent: '#bcd6cb' },
  'room-8': { pattern: 'concrete', base: '#ddd9d0', accent: '#ccc7bc' },
  'room-9': { pattern: 'planks', base: '#e5d6c0', accent: '#d4c3a8' },
  'room-10': { pattern: 'entry', base: '#e8d9c0', accent: '#d7c6aa' },
};

const WALL_INK = '#344955';
const textures = new Map<string, THREE.CanvasTexture>();
const materials = new Map<string, THREE.MeshLambertMaterial>();

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

function drawWallPattern(ctx: CanvasRenderingContext2D, style: SurfaceStyle, seed: string, wallSide: WallSide) {
  const { width, height } = ctx.canvas;
  const random = randomFor(seed);
  const wallStyle = wallSide === 'north'
    ? {
      ...style,
      base: mixColor(style.base, '#e6edef', 0.05),
      accent: mixColor(style.accent, '#e1e9eb', 0.05),
    }
    : style;
  const tint = mixColor(wallStyle.base, wallStyle.accent, 0.45);
  const faintInk = mixColor(wallStyle.base, WALL_INK, 0.18);

  ctx.fillStyle = wallStyle.base;
  ctx.fillRect(0, 0, width, height);

  const floorGradient = ctx.createLinearGradient(0, height * 0.58, 0, height);
  floorGradient.addColorStop(0, 'rgba(49, 60, 64, 0)');
  floorGradient.addColorStop(1, 'rgba(49, 60, 64, 0.05)');
  ctx.fillStyle = floorGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.strokeStyle = faintInk;
  ctx.fillStyle = tint;
  ctx.lineWidth = 1;

  if (style.pattern === 'stripes') {
    ctx.globalAlpha = 0.1;
    for (let x = 18; x < width; x += 48) ctx.fillRect(x, 0, 4, height);
  } else if (style.pattern === 'wainscoting') {
    const railY = Math.round(height * 0.66);
    ctx.globalAlpha = 0.11;
    ctx.fillRect(0, railY, width, height - railY);
    ctx.globalAlpha = 0.15;
    wobblyLine(ctx, 0, railY, width, railY, random, 0.45);
    wobblyLine(ctx, 0, railY + 3, width, railY + 3, random, 0.35);
    for (let x = 32; x < width; x += 48) wobblyLine(ctx, x, railY + 5, x, height, random, 0.4);
  } else if (style.pattern === 'flowers') {
    ctx.globalAlpha = 0.15;
    for (let y = 40; y < height; y += 88) for (let x = 38; x < width; x += 88) {
      for (let petal = 0; petal < 4; petal++) {
        const angle = petal * Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(angle) * 3, y + Math.sin(angle) * 3, 1.6, 2.2, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fillStyle = faintInk;
      ctx.fill();
      ctx.fillStyle = tint;
    }
  } else if (style.pattern === 'polka') {
    ctx.globalAlpha = 0.14;
    for (let y = 28; y < height; y += 56) for (let x = 28 + (y % 112 ? 0 : 28); x < width; x += 56) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style.pattern === 'diamonds') {
    ctx.globalAlpha = 0.12;
    for (let y = 0; y < height + 64; y += 64) for (let x = 0; x < width + 64; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, y - 5);
      ctx.lineTo(x + 5, y);
      ctx.lineTo(x, y + 5);
      ctx.lineTo(x - 5, y);
      ctx.closePath();
      ctx.stroke();
    }
  } else if (style.pattern === 'stars') {
    ctx.globalAlpha = 0.12;
    for (let y = 28; y < height; y += 72) for (let x = 28 + (y % 144 ? 0 : 36); x < width; x += 72) {
      ctx.beginPath();
      ctx.moveTo(x - 3, y);
      ctx.lineTo(x + 3, y);
      ctx.moveTo(x, y - 3);
      ctx.lineTo(x, y + 3);
      ctx.stroke();
    }
  } else if (style.pattern === 'plaid') {
    ctx.globalAlpha = 0.06;
    for (let p = 24; p < width; p += 64) {
      ctx.fillRect(p, 0, 2, height);
      ctx.fillRect(0, p, width, 2);
    }
  } else if (style.pattern === 'waves') {
    ctx.globalAlpha = 0.11;
    for (let y = 28; y < height; y += 52) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x < width; x += 24) ctx.quadraticCurveTo(x + 6, y - 3.5, x + 12, y);
      ctx.stroke();
    }
  } else if (style.pattern === 'sprinkles') {
    ctx.globalAlpha = 0.13;
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
    ctx.globalAlpha = 0.12;
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
    ctx.globalAlpha = 0.1;
    for (let x = 16; x < width; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x, height * 0.34);
      ctx.quadraticCurveTo(x, height * 0.19, x + 16, height * 0.19);
      ctx.quadraticCurveTo(x + 32, height * 0.19, x + 32, height * 0.34);
      ctx.lineTo(x + 32, height);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawFloorPattern(ctx: CanvasRenderingContext2D, style: SurfaceStyle, seed: string) {
  const { width, height } = ctx.canvas;
  const random = randomFor(seed);
  ctx.fillStyle = style.base;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  if (style.pattern === 'planks') {
    let y = 0;
    let row = 0;
    while (y < height) {
      const rowHeight = 70 + random() * 12;
      const bandHeight = Math.min(rowHeight, height - y);
      const occasionalDarkPlank = row % 7 === 5;
      const plankTone = mixColor(style.base, '#000000', occasionalDarkPlank ? 0.06 : row % 2 ? 0.035 : 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = plankTone;
      ctx.fillRect(0, y, width, bandHeight);

      // Stagger small, softened end-joints without drawing continuous seams.
      ctx.fillStyle = mixColor(plankTone, '#000000', 0.08);
      ctx.globalAlpha = 0.35;
      let joint = (row % 2 ? 112 : 42) + random() * 28;
      while (joint < width) {
        ctx.fillRect(joint, y + bandHeight * 0.34, 2, Math.min(8, bandHeight * 0.18));
        joint += 150 + random() * 48;
      }
      y += rowHeight;
      row++;
    }
  } else if (style.pattern === 'checker') {
    const cell = 112;
    for (let y = 0, row = 0; y < height; y += cell, row++) {
      for (let x = 0, column = 0; x < width; x += cell, column++) {
        if ((row + column) % 2 === 0) {
          ctx.fillStyle = style.accent;
          ctx.globalAlpha = 0.1;
          ctx.fillRect(x, y, cell, cell);
        }
      }
    }
  } else if (style.pattern === 'tiles' || style.pattern === 'grid' || style.pattern === 'entry') {
    const cell = style.pattern === 'entry' ? 112 : 128;
    ctx.fillStyle = style.accent;
    ctx.globalAlpha = 0.2;
    for (let y = 0; y < height; y += cell) {
      for (let x = 0; x < width; x += cell) {
        const right = Math.min(width, x + cell);
        const bottom = Math.min(height, y + cell);
        for (const [dotX, dotY] of [
          [x + 6, y + 6],
          [right - 6, y + 6],
          [x + 6, bottom - 6],
          [right - 6, bottom - 6],
        ]) {
          ctx.beginPath();
          ctx.arc(dotX, dotY, 1.25, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
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

function addFloorEdgeTreatment(ctx: CanvasRenderingContext2D, style: SurfaceStyle) {
  const { width, height } = ctx.canvas;
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
  canvas.width = kind === 'floor' ? Math.max(128, Math.round(roomSize[0] * 64)) : 256;
  canvas.height = kind === 'floor' ? Math.max(128, Math.round(roomSize[1] * 64)) : 256;
  const context = canvas.getContext('2d');
  if (!context) return null;
  if (kind === 'floor') {
    drawFloorPattern(context, style, roomId);
    addFloorEdgeTreatment(context, style);
  } else {
    drawWallPattern(context, style, roomId, wallSide);
  }

  texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = kind === 'floor' ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  texture.wrapT = kind === 'floor' ? THREE.ClampToEdgeWrapping : THREE.ClampToEdgeWrapping;
  texture.repeat.set(kind === 'floor' ? 1 : 3, 1);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
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
      return new THREE.MeshLambertMaterial({ color });
    }
    const color = '#ffffff';
    material = new THREE.MeshLambertMaterial({ map: texture, color });
    materials.set(key, material);
  }
  return material;
}
