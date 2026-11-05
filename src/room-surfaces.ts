import * as THREE from 'three';
import { look } from './look';

type SurfaceKind = 'wallpaper' | 'floor';
type Pattern =
  | 'flowers' | 'stripes' | 'plaid' | 'polka' | 'diamonds' | 'stars' | 'waves' | 'sprinkles' | 'leaves' | 'arches'
  | 'planks' | 'checker' | 'tiles' | 'carpet' | 'parquet' | 'grid' | 'mosaic' | 'brick' | 'basket' | 'entry';

type SurfaceStyle = { pattern: Pattern; base: string; accent: string; detail: string };

const wallpaperStyles: Record<string, SurfaceStyle> = {
  'room-1': { pattern: 'flowers', base: '#ffeab4', accent: '#ed7f6b', detail: '#3b9a67' },
  'room-2': { pattern: 'stripes', base: '#b7edc9', accent: '#45aa80', detail: '#f7dc74' },
  'room-3': { pattern: 'polka', base: '#ffc69a', accent: '#df694f', detail: '#fff0c8' },
  'room-4': { pattern: 'diamonds', base: '#d2eff0', accent: '#438da0', detail: '#ef8b69' },
  'room-5': { pattern: 'stars', base: '#f8c2d7', accent: '#bd5b83', detail: '#f2c44b' },
  'room-6': { pattern: 'plaid', base: '#ded2f4', accent: '#8170bb', detail: '#f0a16e' },
  'room-7': { pattern: 'waves', base: '#c6eee2', accent: '#4f9c91', detail: '#f8d87b' },
  'room-8': { pattern: 'sprinkles', base: '#eee9df', accent: '#c47b45', detail: '#4d91a0' },
  'room-9': { pattern: 'leaves', base: '#f5dfbd', accent: '#568b58', detail: '#e68167' },
  'room-10': { pattern: 'arches', base: '#ffedc9', accent: '#d48750', detail: '#3c8f95' },
};

const floorStyles: Record<string, SurfaceStyle> = {
  'room-1': { pattern: 'planks', base: '#f7d968', accent: '#d9a83a', detail: '#f8e9a1' },
  'room-2': { pattern: 'checker', base: '#78d59a', accent: '#b8edac', detail: '#398b69' },
  'room-3': { pattern: 'tiles', base: '#f4af7c', accent: '#ffe0aa', detail: '#d97b55' },
  'room-4': { pattern: 'parquet', base: '#bce5e9', accent: '#6cb7c1', detail: '#f1f0d5' },
  'room-5': { pattern: 'carpet', base: '#ed9abd', accent: '#f7c5d4', detail: '#b85e88' },
  'room-6': { pattern: 'grid', base: '#c9b9ec', accent: '#a497d2', detail: '#766db0' },
  'room-7': { pattern: 'mosaic', base: '#9edbcd', accent: '#e4ecb0', detail: '#4f9b91' },
  'room-8': { pattern: 'brick', base: '#d7d2c8', accent: '#b7b1a7', detail: '#f0e8d4' },
  'room-9': { pattern: 'basket', base: '#edcfaa', accent: '#d8a875', detail: '#f8e6c8' },
  'room-10': { pattern: 'entry', base: '#f6d9a6', accent: '#e3a765', detail: '#f9edce' },
};

const textures = new Map<string, THREE.CanvasTexture>();
const materials = new Map<string, THREE.MeshLambertMaterial>();

function drawPattern(ctx: CanvasRenderingContext2D, style: SurfaceStyle) {
  const { pattern, base, accent, detail } = style;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 64, 64);
  ctx.lineWidth = 2;
  ctx.strokeStyle = accent;
  ctx.fillStyle = accent;

  if (pattern === 'flowers') {
    for (const [x, y] of [[8, 9], [24, 25], [40, 9], [56, 25], [8, 41], [40, 57]] as const) {
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.2, 3, a, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = detail; ctx.beginPath(); ctx.arc(x, y, 1.7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = accent;
    }
  } else if (pattern === 'stripes') {
    for (let x = 5; x < 64; x += 12) { ctx.fillRect(x, 0, 3, 64); ctx.fillStyle = detail; ctx.fillRect(x + 4, 0, 1, 64); ctx.fillStyle = accent; }
  } else if (pattern === 'plaid') {
    ctx.globalAlpha = 0.62;
    for (let p = 7; p < 64; p += 16) { ctx.fillRect(p, 0, 4, 64); ctx.fillRect(0, p, 4, 64); }
    ctx.globalAlpha = 0.45; ctx.fillStyle = detail;
    for (let p = 15; p < 64; p += 16) { ctx.fillRect(p, 0, 2, 64); ctx.fillRect(0, p, 2, 64); }
    ctx.globalAlpha = 1;
  } else if (pattern === 'polka') {
    for (let y = 8; y < 64; y += 16) for (let x = (y % 32 ? 8 : 16); x < 64; x += 16) {
      ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = detail; ctx.beginPath(); ctx.arc(x + 1, y - 1, 1, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = accent;
    }
  } else if (pattern === 'diamonds') {
    for (let y = -32; y < 96; y += 16) for (let x = -32; x < 96; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 5, y); ctx.closePath(); ctx.stroke();
    }
    ctx.fillStyle = detail; for (let y = 8; y < 64; y += 32) for (let x = 8; x < 64; x += 32) ctx.fillRect(x - 1, y - 1, 2, 2);
  } else if (pattern === 'stars') {
    for (let y = 6; y < 64; y += 16) for (let x = (y % 32 ? 7 : 15); x < 64; x += 16) {
      ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 1.5, y - 1.5); ctx.lineTo(x + 5, y); ctx.lineTo(x + 1.5, y + 1.5); ctx.lineTo(x, y + 5); ctx.lineTo(x - 1.5, y + 1.5); ctx.lineTo(x - 5, y); ctx.lineTo(x - 1.5, y - 1.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = detail; ctx.fillRect(x - 1, y - 1, 2, 2);
    }
  } else if (pattern === 'waves') {
    for (let y = 6; y < 64; y += 14) {
      ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x < 64; x += 16) {
        ctx.quadraticCurveTo(x + 4, y - 6, x + 8, y);
        ctx.quadraticCurveTo(x + 12, y + 6, x + 16, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = detail; for (let x = 8; x < 64; x += 24) { ctx.beginPath(); ctx.arc(x, (x * 3) % 48 + 8, 1.5, 0, Math.PI * 2); ctx.fill(); }
  } else if (pattern === 'sprinkles') {
    for (let y = 7; y < 64; y += 14) for (let x = (y % 28 ? 5 : 12); x < 64; x += 14) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(((x + y) % 5 - 2) * 0.18); ctx.fillStyle = (x + y) % 2 ? accent : detail; ctx.fillRect(-1.5, -4, 3, 8); ctx.restore();
    }
  } else if (pattern === 'leaves') {
    for (let y = 4; y < 64; y += 18) for (let x = (y % 36 ? 8 : 17); x < 64; x += 18) {
      ctx.save(); ctx.translate(x, y); ctx.rotate((x + y) % 2 ? -0.6 : 0.6); ctx.beginPath(); ctx.ellipse(0, 0, 3, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = detail; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 4); ctx.stroke(); ctx.restore();
    }
  } else if (pattern === 'arches') {
    for (let x = 4; x < 64; x += 16) {
      ctx.beginPath(); ctx.moveTo(x, 62); ctx.lineTo(x, 21); ctx.quadraticCurveTo(x, 4, x + 6, 4); ctx.quadraticCurveTo(x + 12, 4, x + 12, 21); ctx.lineTo(x + 12, 62); ctx.stroke();
      ctx.fillStyle = detail; ctx.beginPath(); ctx.arc(x + 6, 24, 2, 0, Math.PI * 2); ctx.fill();
    }
  } else if (pattern === 'planks') {
    for (let y = 0; y < 64; y += 16) {
      ctx.fillStyle = y % 32 ? detail : base; ctx.fillRect(0, y, 64, 15);
      ctx.strokeStyle = accent; ctx.beginPath(); ctx.moveTo(0, y + 15); ctx.lineTo(64, y + 15); ctx.stroke();
      const offset = y % 32 ? 16 : 0;
      for (let x = offset; x < 64; x += 32) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 15); ctx.stroke(); }
    }
  } else if (pattern === 'checker') {
    for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) if ((x + y) % 32 === 0) ctx.fillRect(x, y, 16, 16);
  } else if (pattern === 'tiles' || pattern === 'grid' || pattern === 'mosaic' || pattern === 'entry') {
    const step = pattern === 'mosaic' ? 12 : 16;
    ctx.strokeStyle = accent;
    for (let y = 0; y <= 64; y += step) for (let x = 0; x <= 64; x += step) {
      ctx.strokeRect(x + 1, y + 1, step - 2, step - 2);
      if (pattern === 'mosaic' && (x + y) % 3 === 0) { ctx.fillStyle = detail; ctx.fillRect(x + 3, y + 3, 3, 3); }
      if (pattern === 'entry' && (x / step + y / step) % 2 === 0) { ctx.fillStyle = detail; ctx.fillRect(x + 5, y + 5, step - 10, step - 10); }
    }
    if (pattern === 'tiles') { ctx.fillStyle = detail; for (let y = 8; y < 64; y += 16) for (let x = 8; x < 64; x += 16) ctx.fillRect(x - 1, y - 1, 2, 2); }
  } else if (pattern === 'parquet') {
    for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) {
      ctx.fillStyle = ((x + y) / 16) % 2 ? base : accent; ctx.fillRect(x + 1, y + 1, 14, 14);
      ctx.strokeStyle = detail; ctx.beginPath(); ctx.moveTo(x + 3, y + 13); ctx.lineTo(x + 13, y + 3); ctx.stroke();
    }
  } else if (pattern === 'carpet') {
    ctx.strokeStyle = accent;
    for (let x = -64; x < 128; x += 12) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 64, 64); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, 64); ctx.lineTo(x + 64, 0); ctx.stroke(); }
    ctx.fillStyle = detail; for (let y = 8; y < 64; y += 16) for (let x = 8; x < 64; x += 16) ctx.fillRect(x - 1, y - 1, 2, 2);
  } else if (pattern === 'brick') {
    ctx.strokeStyle = accent;
    for (let y = 0; y < 64; y += 16) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(64, y); ctx.stroke();
      const offset = y % 32 ? 16 : 0;
      for (let x = offset; x < 64; x += 32) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 16); ctx.stroke(); }
    }
    ctx.fillStyle = detail; ctx.globalAlpha = 0.45; for (let y = 4; y < 64; y += 16) for (let x = 6; x < 64; x += 32) ctx.fillRect(x, y, 5, 2); ctx.globalAlpha = 1;
  } else if (pattern === 'basket') {
    ctx.strokeStyle = accent;
    for (let p = 4; p < 64; p += 12) { ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 64); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(64, p); ctx.stroke(); }
    ctx.fillStyle = detail; for (let y = 7; y < 64; y += 24) for (let x = 7; x < 64; x += 24) ctx.fillRect(x - 1, y - 1, 3, 3);
  }
}

function textureFor(roomId: string, kind: SurfaceKind) {
  const key = `${roomId}:${kind}`;
  let texture = textures.get(key);
  if (texture) return texture;
  const style = (kind === 'floor' ? floorStyles : wallpaperStyles)[roomId];
  if (!style) return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (!context) return null;
  drawPattern(context, style);
  texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'floor' ? 5 : 3, kind === 'floor' ? 5 : 2);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  textures.set(key, texture);
  return texture;
}

export function roomSurfaceMaterial(roomId: string, kind: SurfaceKind) {
  const key = `${roomId}:${kind}`;
  let material = materials.get(key);
  if (!material) {
    const texture = textureFor(roomId, kind);
    if (!texture) return new THREE.MeshLambertMaterial({ color: kind === 'floor' ? look.palette.floors[roomId] : look.palette.wall });
    material = new THREE.MeshLambertMaterial({ map: texture, color: '#ffffff' });
    materials.set(key, material);
  }
  return material;
}
