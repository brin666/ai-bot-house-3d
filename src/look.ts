import * as THREE from 'three';

/**
 * Art direction knobs for the house.
 * Palette, ordered-dither strength, and ink outlines live here so they can be
 * tuned without hunting through materials or the post shader.
 *
 * dither.levels — fewer steps make the 8×8 Bayer pattern more obvious.
 * dither.blockSize — pattern size in CSS pixels (1 is a fine screen, 2 is chunkier).
 * dither.dotGain — extra ordered-dot contrast on top of quantization (0–0.35).
 * dither.strength — 0 is continuous color, 1 is full dither. The on-screen slider writes this.
 * outline.* — screen-space ink. Raise depthThreshold if lines get noisy.
 */
export const look = {
  background: '#f4efe4',
  dither: {
    strength: 1,
    levels: 7,
    blockSize: 1,
    pattern: 1,
    dotGain: 0.1,
    grain: 0,
    saturation: 1.22,
    contrast: 1.04,
    exposure: 1,
    shoulder: 0.05,
    /** Near-white specular glints (bot highlights) stay above this after quantize. */
    highlightFloor: 0.82,
  },
  outline: {
    color: '#241c18',
    depthThreshold: 0.0032,
    depthStrength: 0.92,
    colorThreshold: 0.22,
    colorStrength: 0.7,
    thickness: 1.15,
  },
  light: {
    // Lambert in this Three.js version divides by PI, so these are about PI
    // times the shading weight you see on screen.
    hemiSky: '#fffaf4',
    hemiGround: '#ffd0ae',
    hemi: 1.15,
    sun: '#fff6e2',
    sunIntensity: 1.45,
    ambient: '#fff8f1',
    ambientIntensity: 0.95,
  },
  palette: {
    floors: {
      'room-1': '#f6d35a',
      'room-2': '#7ed9a4',
      'room-3': '#f3b183',
    } as Record<string, string>,
    floorLines: {
      'room-1': '#e2b12e',
      'room-2': '#49b67c',
      'room-3': '#e08958',
    } as Record<string, string>,
    floorLine: '#e2b12e',
    slab: '#e0b184',
    wall: '#fff8ee',
    wallSide: '#ffe7cf',
    trim: '#3e6e78',
    lowWall: '#f6d7a2',
    wood: '#e08a3c',
    woodDark: '#7a4a32',
    cream: '#fff3cc',
    coral: '#f26d62',
    leaf: '#2f9d55',
    ink: '#2c3338',
    gold: '#f2c14b',
    rugA: '#ef735c',
    rugB: '#49c0d2',
    rugInset: '#fff0cf',
    bookcase: '#e08a3c',
    bookcaseBack: '#fff0d0',
    shelf: '#c56a3a',
    books: ['#2f9d55', '#ef735c', '#f2c14b', '#3aa0c9', '#fff6e4'],
    frame: '#6b4636',
    frameMat: '#fff8ee',
    pictureA: '#7fd0bf',
    pictureB: '#f09a78',
    windowFrame: '#3e6e78',
    windowGlass: '#8fd4ea',
    windowMullion: '#fff8ee',
    sill: '#f0c48a',
    bunting: ['#f26d62', '#f2c14b', '#3cbe78'],
    buntingCord: '#8a7568',
    box: '#e08a3c',
    boxLid: '#fff0d0',
    sideTable: '#d9843f',
    cup: '#f2c14b',
    lampStem: '#5c5148',
    lampShade: '#f2c14b',
    package: '#e39a3c',
    packageStripe: '#fff3cc',
    botBody: '#262b2a',
    botEye: '#fff9e9',
    spark: '#f2c14b',
  },
};

const materials = new Map<string, THREE.MeshLambertMaterial>();

/** Shared flat Lambert material. Lambert keeps faces graphic so the dither stays visible. */
export function flatMaterial(color: string) {
  let material = materials.get(color);
  if (!material) {
    material = new THREE.MeshLambertMaterial({ color });
    materials.set(color, material);
  }
  return material;
}
