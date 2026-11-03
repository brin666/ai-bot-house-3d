import {
  BOT_BODY_CENTER_Y,
  BOT_CARRY_HOLD_Y,
  BOT_PICKUP_STANDOFF,
  FLOOR_SURFACE_Y,
  RUG_SURFACE_Y,
} from './bot-look';

export {
  BOT_BODY_CENTER_Y,
  BOT_CARRY_HOLD_Y,
  BOT_PICKUP_STANDOFF,
  FLOOR_SURFACE_Y,
  RUG_SURFACE_Y,
} from './bot-look';

export const botMotion = {
  walk: {
    speed: 1.05,
    accel: 4.2,
    decel: 5.5,
    stepBob: 0.045,
    stepHz: 10,
    stepSquash: 0.035,
    lean: 0.15,
    turnRate: 5.8,
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
    bob: 0.022,
    bobHz: 2.1,
    breath: 0.034,
    sleepBob: 0.009,
    sleepBreath: 0.014,
    sleepBreathHz: 0.75,
    faceCameraDelay: 0.8,
    faceCameraDuration: 0.72,
    faceCameraOffset: 0.14,
  },
  carry: {
    bob: 0.04,
    bobHz: 8,
    holdY: BOT_CARRY_HOLD_Y,
  },
  lift: {
    duration: 1.2,
    startY: 0.07,
    holdY: BOT_CARRY_HOLD_Y,
  },
  place: {
    duration: 1.15,
    holdY: BOT_CARRY_HOLD_Y,
    endY: 0.07,
    horizontalThrough: 0.62,
    dropStart: 0.52,
  },
  pickup: {
    standOff: BOT_PICKUP_STANDOFF,
  },
  shadow: {
    groundY: FLOOR_SURFACE_Y + 0.001,
    baseScale: 0.92,
    airFade: 0.72,
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
