import { BOT_RADIUS } from './bot-metrics';

/** Top of walkable floor slab (room-renderer floor mesh). */
export const FLOOR_SURFACE_Y = 0.06;
/** Rug tops sit slightly above the floor (details.ts). */
export const RUG_SURFACE_Y = 0.094;
/** Sphere centre Y so the bottom clears floor/rugs with a tiny gap. */
export const BOT_BODY_CENTER_Y = FLOOR_SURFACE_Y + BOT_RADIUS + 0.035;

export const botMotion = {
  walk: {
    speed: 1.05,
    accel: 4.2,
    decel: 5.5,
    stepBob: 0.028,
    stepHz: 9.5,
    lean: 0.11,
    turnRate: 7.5,
  },
  jump: {
    duration: 2.35,
    anticipation: 0.18,
    takeoff: 0.12,
    air: 0.55,
    land: 0.14,
    settle: 0.2,
    height: 0.34,
    anticipationSquash: 0.86,
    stretch: 1.14,
    landSquash: 0.88,
  },
  idle: {
    bob: 0.012,
    bobHz: 1.6,
  },
  carry: {
    bob: 0.04,
    bobHz: 8,
    holdY: 1.02,
  },
  lift: {
    duration: 1.2,
    startY: 0.07,
    holdY: 1.02,
  },
  place: {
    duration: 1.15,
    holdY: 1.02,
    endY: 0.07,
    /** Horizontal travel must finish before the parcel drops (fraction of timeline). */
    horizontalThrough: 0.62,
    dropStart: 0.52,
  },
  pickup: {
    standOff: 0.5,
  },
  shadow: {
    groundY: FLOOR_SURFACE_Y + 0.001,
    baseScale: 0.92,
    airFade: 0.72,
  },
  eyes: {
    blinkMin: 2.4,
    blinkMax: 6.8,
    blinkClose: 0.11,
    doubleBlinkChance: 0.22,
    lookStrength: 0.028,
    cameraGlanceChance: 0.004,
    pupilRadius: 0.022,
  },
  badge: {
    /** Keep icons readable without punching through walls. */
    renderOrder: 12,
    depthOffset: 0.02,
  },
};

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function lerpAngle(current: number, target: number, t: number) {
  let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * t;
}

export function jumpOffset(phase: number) {
  const m = botMotion.jump;
  const p = Math.min(1, Math.max(0, phase));
  const tAnt = m.anticipation / m.duration;
  const tTake = tAnt + m.takeoff / m.duration;
  const tAirEnd = tTake + m.air / m.duration;
  const tLandEnd = tAirEnd + m.land / m.duration;
  let y = 0;
  let sy = 1;
  let sxz = 1;
  if (p < tAnt) {
    const u = p / tAnt;
    sy = THREE_like_lerp(1, m.anticipationSquash, smoothstep(0, 1, u));
    sxz = THREE_like_lerp(1, 1.06, u);
  } else if (p < tTake) {
    const u = (p - tAnt) / (tTake - tAnt);
    sy = THREE_like_lerp(m.anticipationSquash, m.stretch, smoothstep(0, 1, u));
    sxz = THREE_like_lerp(1.06, 0.94, u);
    y = m.height * 0.08 * u;
  } else if (p < tAirEnd) {
    const u = (p - tTake) / (tAirEnd - tTake);
    y = m.height * Math.sin(u * Math.PI);
    sy = THREE_like_lerp(m.stretch, 1.02, u);
  } else if (p < tLandEnd) {
    const u = (p - tAirEnd) / (tLandEnd - tAirEnd);
    y = m.height * (1 - u) * 0.35;
    sy = THREE_like_lerp(1.02, m.landSquash, smoothstep(0, 1, u));
    sxz = THREE_like_lerp(1, 1.08, smoothstep(0, 1, u));
  } else {
    const u = (p - tLandEnd) / Math.max(0.001, 1 - tLandEnd);
    sy = THREE_like_lerp(m.landSquash, 1, smoothstep(0, 1, u));
    sxz = THREE_like_lerp(1.08, 1, smoothstep(0, 1, u));
  }
  return { y, scaleY: sy, scaleXZ: sxz };
}

function THREE_like_lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
