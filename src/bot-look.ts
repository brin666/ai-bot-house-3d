import * as THREE from 'three';

/**
 * Bot size, clearance, and appearance tunables (single place).
 * Navigation imports BOT_RADIUS / BOT_CLEARANCE from here via bot-metrics.ts.
 */
export const BOT_RADIUS = 0.52;
export const BOT_CLEARANCE = BOT_RADIUS + 0.04;

export const FLOOR_SURFACE_Y = 0.06;
export const RUG_SURFACE_Y = 0.094;
export const BOT_BODY_CENTER_Y = FLOOR_SURFACE_Y + BOT_RADIUS + 0.035;
/** Parcel height while carrying / before drop — must clear scaled head. */
export const BOT_CARRY_HOLD_Y = BOT_BODY_CENTER_Y + BOT_RADIUS + 0.42;
export const BOT_PICKUP_STANDOFF = BOT_RADIUS + 0.16;
/** Min horizontal bot–parcel separation while carryY is high during Place. */
export const BOT_PLACE_CLEAR_RADIUS = BOT_RADIUS + 0.22;

export const botLook = {
  body: '#151922',
  outline: '#1b3144',
  eye: '#fffaf4',
  highlight: '#ffffff',
  /** Specular glints on the body (local space on unit sphere, before radius scale). */
  glints: [
    { azimuth: -0.42, polar: 0.62, size: 0.085 },
    { azimuth: 0.38, polar: 0.58, size: 0.078 },
  ] as const,
  eyes: {
    radius: 0.055,
    length: 0.17,
    spacing: 0.19,
    polar: 1.05,
    azimuth: 0,
    gazeSlide: 0.11,
    blinkMin: 2.4,
    blinkMax: 6.8,
    blinkClose: 0.11,
    doubleBlinkChance: 0.22,
    cameraGlanceChance: 0.004,
  },
  shadow: {
    groundY: FLOOR_SURFACE_Y + 0.001,
    radiusScale: 0.95,
    baseOpacity: 0.28,
    airFade: 0.72,
    halftoneCell: 4,
  },
};

function bayer8(x: number, y: number) {
  const bx = ((Math.floor(x) % 8) + 8) % 8;
  const by = ((Math.floor(y) % 8) + 8) % 8;
  const m = [
    [0, 48, 12, 60, 3, 51, 15, 63],
    [32, 16, 44, 28, 35, 19, 47, 31],
    [8, 56, 4, 52, 11, 59, 7, 55],
    [40, 24, 36, 20, 43, 27, 39, 23],
    [2, 50, 14, 62, 1, 49, 13, 61],
    [34, 18, 46, 30, 33, 17, 45, 29],
    [10, 58, 6, 54, 9, 57, 5, 53],
    [42, 26, 38, 22, 41, 25, 37, 21],
  ];
  return m[by][bx] / 64;
}

export function createBotShadowTexture() {
  const cell = botLook.shadow.halftoneCell;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = bayer8(x / cell, y / cell);
      const dist = Math.hypot(x - size / 2, y - size / 2) / (size / 2);
      const edge = Math.max(0, 1 - dist * dist);
      const a = Math.floor(255 * edge * (0.35 + t * 0.65));
      const i = (y * size + x) * 4;
      img.data[i] = 20;
      img.data[i + 1] = 24;
      img.data[i + 2] = 32;
      img.data[i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.Texture(canvas);
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/** Point on sphere surface in body-local space (Y up, +Z forward). */
export function sphereSurface(azimuth: number, polar: number, radius = BOT_RADIUS) {
  const s = Math.sin(polar);
  return new THREE.Vector3(radius * s * Math.sin(azimuth), BOT_BODY_CENTER_Y + radius * Math.cos(polar), radius * s * Math.cos(azimuth));
}
