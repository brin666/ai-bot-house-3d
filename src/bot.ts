import * as THREE from 'three';
import { BOT_RADIUS } from './bot-metrics';
import { flatMaterial, look } from './look';
import { BOT_BODY_CENTER_Y, botMotion, jumpOffset, smoothstep } from './bot-motion';

export type BotState = 'Idle' | 'Move' | 'Jump' | 'Sleep' | 'Interact' | 'Approach' | 'Lift' | 'Carry' | 'Place';
export type BotActivity = '' | 'Sleep' | 'Read' | 'Plant' | 'Admire';
export type BotExpression = 'neutral' | 'happy' | 'sleepy' | 'surprised';

export type BotMotionInput = {
  moveSpeed: number;
  moveDir: THREE.Vector2 | null;
  jumpPhase: number;
  gaze: THREE.Vector3 | null;
  cameraPos: THREE.Vector3;
};

type EyeRig = { white: THREE.Mesh; pupil: THREE.Mesh; base: THREE.Vector3; pupilBase: THREE.Vector3 };

export function createBot() {
  const root = new THREE.Group();
  const visual = new THREE.Group();
  root.add(visual);

  const body = new THREE.Mesh(new THREE.SphereGeometry(BOT_RADIUS, 24, 16), flatMaterial(look.palette.botBody));
  body.position.y = BOT_BODY_CENTER_Y;
  body.castShadow = true;
  visual.add(body);

  const eyes: EyeRig[] = [];
  for (const x of [-.13, .13]) {
    const white = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 8), flatMaterial(look.palette.botEye));
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(botMotion.eyes.pupilRadius, 8, 6),
      flatMaterial(look.palette.botBody),
    );
    white.position.set(x, BOT_BODY_CENTER_Y + .07, .335);
    pupil.position.set(x, BOT_BODY_CENTER_Y + .07, .395);
    visual.add(white, pupil);
    eyes.push({
      white,
      pupil,
      base: white.position.clone(),
      pupilBase: pupil.position.clone(),
    });
  }

  const book = new THREE.Group();
  function part(w: number, h: number, d: number, y: number, color: string) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flatMaterial(color));
    mesh.position.y = y;
    book.add(mesh);
  }
  part(.4, .04, .28, 0, look.palette.coral);
  part(.37, .015, .25, .03, look.palette.cream);
  book.position.set(0, .33, .46);
  book.rotation.x = -.22;
  book.visible = false;
  visual.add(book);

  const sparkles = new THREE.Group();
  const sparkleInk = new THREE.MeshBasicMaterial({ color: look.palette.spark });
  for (const [x, y, z] of [[-.48, .88, .15], [.46, 1.02, .05]] as const) {
    const star = new THREE.Group();
    for (const angle of [0, Math.PI / 2]) {
      const ray = new THREE.Mesh(new THREE.BoxGeometry(.16, .035, .035), sparkleInk);
      ray.rotation.z = angle;
      star.add(ray);
    }
    star.position.set(x, y, z);
    sparkles.add(star);
  }
  sparkles.visible = false;
  visual.add(sparkles);

  const badge = new THREE.Group();
  const icons: Record<'Sleep' | 'Read' | 'Plant', THREE.Group> = {
    Sleep: new THREE.Group(),
    Read: new THREE.Group(),
    Plant: new THREE.Group(),
  };
  badge.position.set(0, 1.15, 0);
  root.add(badge);

  function flat(parent: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, color: string, angle = 0) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        depthTest: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    mesh.position.set(x, y, z + botMotion.badge.depthOffset);
    mesh.rotation.z = angle;
    mesh.renderOrder = botMotion.badge.renderOrder;
    parent.add(mesh);
  }
  flat(badge, .55, .43, 0, 0, 0, look.palette.ink);
  flat(badge, .5, .38, 0, 0, .001, look.palette.frameMat);
  for (const [x, y, w, h, a] of [[0, .1, .2, .035, 0], [0, 0, .22, .035, Math.PI / 4], [0, -.1, .2, .035, 0]] as const)
    flat(icons.Sleep, w, h, x, y, .003, '#566f80', a);
  flat(icons.Read, .29, .23, 0, 0, .003, '#b67f6a');
  flat(icons.Read, .12, .17, -.07, 0, .005, '#fbf3df');
  flat(icons.Read, .12, .17, .07, 0, .005, '#fbf3df');
  flat(icons.Read, .012, .17, 0, 0, .006, '#8c7d6e');
  flat(icons.Plant, .025, .22, 0, -.015, .003, '#6d836b');
  flat(icons.Plant, .14, .08, -.065, .04, .004, '#91ad86', -.5);
  flat(icons.Plant, .14, .08, .065, .075, .004, '#91ad86', .5);
  for (const icon of Object.values(icons)) badge.add(icon);
  badge.visible = false;

  const contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(BOT_RADIUS * .88, 24),
    new THREE.MeshBasicMaterial({ color: '#1a1410', transparent: true, opacity: .22, depthWrite: false }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = botMotion.shadow.groundY;
  root.add(contactShadow);

  root.position.set(0, 0, 2);
  root.rotation.y = Math.PI / 4;

  let blinkAt = 2.8;
  let blinkCloseUntil = 0;
  let blinkStage = 0;
  let glanceAt = 0;

  function expressionFor(state: BotState, activity: BotActivity): BotExpression {
    if (state === 'Sleep' || activity === 'Sleep') return 'sleepy';
    if (state === 'Lift' || state === 'Approach') return 'surprised';
    if (state === 'Jump') return 'happy';
    if (state === 'Interact' && activity === 'Admire') return 'happy';
    return 'neutral';
  }

  function applyExpression(expr: BotExpression, blinkScale: number) {
    for (const eye of eyes) {
      if (expr === 'sleepy') {
        eye.white.scale.set(1, .14 * blinkScale, 1);
      } else if (expr === 'surprised') {
        eye.white.scale.set(1.12 * blinkScale, 1.18 * blinkScale, 1.08);
        eye.pupil.scale.set(.75, .75, .75);
      } else if (expr === 'happy') {
        eye.white.scale.set(1.04 * blinkScale, .82 * blinkScale, 1);
      } else {
        eye.white.scale.set(1, blinkScale, 1);
        eye.pupil.scale.set(1, 1, 1);
      }
    }
  }

  function updateBlink(time: number) {
    if (time >= blinkAt) {
      blinkCloseUntil = time + botMotion.eyes.blinkClose;
      blinkStage = Math.random() < botMotion.eyes.doubleBlinkChance ? 2 : 1;
      blinkAt = time + botMotion.eyes.blinkMin + Math.random() * (botMotion.eyes.blinkMax - botMotion.eyes.blinkMin);
    }
    if (blinkStage > 0 && time > blinkCloseUntil + .08) {
      if (blinkStage > 1) {
        blinkStage = 1;
        blinkCloseUntil = time + botMotion.eyes.blinkClose * .85;
      } else blinkStage = 0;
    }
    return time < blinkCloseUntil ? .08 : 1;
  }

  function updateEyes(time: number, motion: BotMotionInput, expr: BotExpression) {
    let target = motion.gaze?.clone() ?? null;
    if (!target && motion.moveDir && motion.moveDir.lengthSq() > .01) {
      target = root.localToWorld(new THREE.Vector3(motion.moveDir.x, 0, motion.moveDir.y));
    }
    if (!target && time > glanceAt) {
      target = motion.cameraPos.clone();
      glanceAt = time + 2.5 + Math.random() * 4;
    } else if (Math.random() < botMotion.eyes.cameraGlanceChance) glanceAt = time;

    const blinkScale = updateBlink(time);
    applyExpression(expr, blinkScale);

    for (const eye of eyes) {
      eye.white.position.copy(eye.base);
      eye.pupil.position.copy(eye.pupilBase);
      if (!target) continue;
      const local = root.worldToLocal(target.clone());
      const dir = new THREE.Vector3(local.x - eye.base.x, local.y - eye.base.y, local.z - eye.base.z).normalize();
      const offset = botMotion.eyes.lookStrength;
      eye.pupil.position.x += dir.x * offset * 2.2;
      eye.pupil.position.y += dir.y * offset * 1.4;
      eye.pupil.position.z += dir.z * offset * .6;
    }
  }

  function update(
    state: BotState,
    activity: BotActivity,
    time: number,
    cameraRotation: THREE.Quaternion,
    motion: BotMotionInput,
  ) {
    const expr = expressionFor(state, activity);
    updateEyes(time, motion, expr);

    let yOff = 0;
    let scaleY = 1;
    let scaleXZ = 1;
    let lean = 0;

    if (state === 'Jump') {
      const j = jumpOffset(motion.jumpPhase);
      yOff = j.y;
      scaleY = j.scaleY;
      scaleXZ = j.scaleXZ;
    } else if (state === 'Move' || state === 'Approach' || state === 'Carry') {
      const bob = state === 'Carry' ? botMotion.carry.bob : botMotion.walk.stepBob;
      const hz = state === 'Carry' ? botMotion.carry.bobHz : botMotion.walk.stepHz;
      yOff = Math.abs(Math.sin(time * hz)) * bob * smoothstep(0, .25, motion.moveSpeed);
      if (motion.moveDir) lean = -motion.moveDir.x * botMotion.walk.lean * motion.moveSpeed;
    } else if (state === 'Interact' && activity === 'Admire') {
      yOff = Math.abs(Math.sin(time * 3)) * .04;
    } else if (state === 'Sleep') {
      yOff = Math.sin(time * .7) * .008;
    } else {
      yOff = Math.sin(time * botMotion.idle.bobHz) * botMotion.idle.bob;
    }

    visual.position.y = yOff;
    visual.rotation.z = lean || (state === 'Sleep' ? .1 * Math.sin(time * .7) : activity === 'Plant' ? .1 * Math.sin(time * 2) : activity === 'Admire' ? .07 * Math.sin(time * 3) : 0);
    visual.scale.set(scaleXZ, scaleY, scaleXZ);
    if (state === 'Sleep') visual.scale.y *= .92;

    sparkles.visible = state === 'Interact' && activity === 'Admire';
    sparkles.scale.setScalar(.8 + .2 * Math.sin(time * 5));
    book.visible = state === 'Interact' && activity === 'Read';

    const activeIcon = state === 'Sleep' ? 'Sleep' : state === 'Interact' && (activity === 'Read' || activity === 'Plant') ? activity : null;
    badge.visible = activeIcon !== null;
    for (const [name, icon] of Object.entries(icons)) icon.visible = name === activeIcon;
    badge.quaternion.copy(root.quaternion).invert().multiply(cameraRotation);
    badge.position.y = 1.12 + Math.sin(time * 2) * .02 + yOff * .35;

    const air = Math.max(0, yOff);
    const shadowScale = botMotion.shadow.baseScale * (1 - Math.min(botMotion.shadow.airFade, air * 1.4));
    contactShadow.scale.set(shadowScale, shadowScale, 1);
    (contactShadow.material as THREE.MeshBasicMaterial).opacity = .22 * (1 - Math.min(.75, air * 2));
  }

  return { root, update };
}
