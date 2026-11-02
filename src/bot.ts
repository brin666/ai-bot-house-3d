import * as THREE from 'three';
import { flatMaterial } from './look';
import {
  BOT_RADIUS,
  botLook,
  BOT_BODY_CENTER_Y,
  botFaceNormal,
  createBotShadowTexture,
} from './bot-look';
import { botMotion, jumpOffset, smoothstep } from './bot-motion';

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

type EyeMesh = THREE.Mesh;

const _camLocal = new THREE.Vector3();
const _view = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);

export function createBot() {
  const root = new THREE.Group();
  const visual = new THREE.Group();
  root.add(visual);
  const bodyGroup = new THREE.Group();
  visual.add(bodyGroup);

  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = BOT_BODY_CENTER_Y;
  bodyGroup.add(bodyPivot);

  const body = new THREE.Mesh(new THREE.SphereGeometry(BOT_RADIUS, 28, 22), flatMaterial(botLook.body));
  body.castShadow = true;
  bodyPivot.add(body);

  const sheen = new THREE.Mesh(
    new THREE.SphereGeometry(BOT_RADIUS * 0.998, 28, 22),
    flatMaterial(botLook.bodySheen),
  );
  sheen.scale.set(1, 1.02, 1.02);
  bodyPivot.add(sheen);

  const outline = new THREE.Mesh(
    new THREE.SphereGeometry(BOT_RADIUS * botLook.outlineScale, 28, 22),
    new THREE.MeshBasicMaterial({ color: botLook.outline, side: THREE.BackSide }),
  );
  outline.renderOrder = 1;
  bodyPivot.add(outline);

  const glintMat = new THREE.MeshBasicMaterial({
    color: botLook.highlight,
    toneMapped: false,
    depthTest: true,
    depthWrite: false,
  });
  const glints: THREE.Mesh[] = [];
  for (let i = 0; i < 2; i++) {
    const glint = new THREE.Mesh(new THREE.CircleGeometry(BOT_RADIUS * botLook.glint.size, 10), glintMat);
    glint.renderOrder = 2;
    glints.push(glint);
    bodyPivot.add(glint);
  }

  const eyeMat = new THREE.MeshBasicMaterial({
    color: botLook.eye,
    toneMapped: false,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const eyes: EyeMesh[] = [];
  const e = botLook.eyes;
  for (const side of [-1, 1]) {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(e.radius * 2.05, e.length, 1, 1),
      eyeMat,
    );
    plane.userData.side = side;
    plane.userData.azimuth = side * e.azimuthSpread;
    eyes.push(plane as EyeMesh);
    bodyPivot.add(plane);
  }

  let blinkAt = 2.8;
  let blinkCloseUntil = 0;
  let blinkStage = 0;
  let glanceAt = 0;
  const gazeOffset = new THREE.Vector2();
  layoutEyes(eyes, 1, _view.set(0, 0, 1));

  const book = new THREE.Group();
  function part(w: number, h: number, d: number, y: number, color: string) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flatMaterial(color));
    mesh.position.y = y;
    book.add(mesh);
  }
  part(0.52, 0.05, 0.36, 0, '#f26d62');
  part(0.48, 0.018, 0.32, 0.04, '#fff3cc');
  book.position.set(0, -0.24, BOT_RADIUS * 0.72);
  book.rotation.x = -0.22;
  book.visible = false;
  bodyPivot.add(book);

  const sparkles = new THREE.Group();
  const sparkleInk = new THREE.MeshBasicMaterial({ color: '#f2c14b' });
  for (const [x, y, z] of [[-0.62, 0.45, 0.18], [0.58, 0.58, 0.08]] as const) {
    const star = new THREE.Group();
    for (const angle of [0, Math.PI / 2]) {
      const ray = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.04), sparkleInk);
      ray.rotation.z = angle;
      star.add(ray);
    }
    star.position.set(x, y, z);
    sparkles.add(star);
  }
  sparkles.visible = false;
  bodyPivot.add(sparkles);

  const badge = new THREE.Group();
  badge.position.set(0, BOT_BODY_CENTER_Y + BOT_RADIUS + 0.35, 0);
  root.add(badge);
  const icons: Record<'Sleep' | 'Read' | 'Plant', THREE.Group> = {
    Sleep: new THREE.Group(),
    Read: new THREE.Group(),
    Plant: new THREE.Group(),
  };
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
  flat(badge, 0.55, 0.43, 0, 0, 0, '#2c3338');
  flat(badge, 0.5, 0.38, 0, 0, 0.001, '#fff8ee');
  for (const [x, y, w, h, a] of [[0, 0.1, 0.2, 0.035, 0], [0, 0, 0.22, 0.035, Math.PI / 4], [0, -0.1, 0.2, 0.035, 0]] as const)
    flat(icons.Sleep, w, h, x, y, 0.003, '#566f80', a);
  flat(icons.Read, 0.29, 0.23, 0, 0, 0.003, '#b67f6a');
  flat(icons.Read, 0.12, 0.17, -0.07, 0, 0.005, '#fbf3df');
  flat(icons.Read, 0.12, 0.17, 0.07, 0, 0.005, '#fbf3df');
  flat(icons.Read, 0.012, 0.17, 0, 0, 0.006, '#8c7d6e');
  flat(icons.Plant, 0.025, 0.22, 0, -0.015, 0.003, '#6d836b');
  flat(icons.Plant, 0.14, 0.08, -0.065, 0.04, 0.004, '#91ad86', -0.5);
  flat(icons.Plant, 0.14, 0.08, 0.065, 0.075, 0.004, '#91ad86', 0.5);
  for (const icon of Object.values(icons)) badge.add(icon);
  badge.visible = false;

  const shadowTex = createBotShadowTexture();
  const contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(BOT_RADIUS * botLook.shadow.radiusScale, 32),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: botLook.shadow.baseOpacity,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = botLook.shadow.groundY;
  root.add(contactShadow);

  root.position.set(0, 0, 2);
  root.rotation.y = Math.PI / 4;

  function layoutEyes(list: EyeMesh[], blinkOpen: number, viewDir: THREE.Vector3) {
    const cfg = botLook.eyes;
    for (const cap of list) {
      const az = (cap.userData.azimuth as number) + gazeOffset.x;
      const pitch = cfg.pitch + gazeOffset.y;
      const normal = botFaceNormal(az, pitch);
      const pos = normal.clone().multiplyScalar(BOT_RADIUS + 0.002);
      cap.position.copy(pos);
      cap.lookAt(pos.x + normal.x, pos.y + normal.y, pos.z + normal.z);
      cap.rotateZ(cap.userData.extraRotZ ?? 0);
      cap.scale.set(1, blinkOpen, 1);
      cap.visible = normal.dot(viewDir) > 0.15 && normal.z > 0.22;
    }
  }

  function expressionFor(state: BotState, activity: BotActivity): BotExpression {
    if (state === 'Sleep' || activity === 'Sleep') return 'sleepy';
    if (state === 'Lift' || state === 'Approach') return 'surprised';
    if (state === 'Jump') return 'happy';
    if (state === 'Interact' && activity === 'Admire') return 'happy';
    return 'neutral';
  }

  function applyExpression(expr: BotExpression, blinkOpen: number, viewDir: THREE.Vector3) {
    for (const cap of eyes) {
      cap.userData.extraRotZ = 0;
      cap.scale.x = 1;
      cap.scale.z = 1;
    }
    layoutEyes(eyes, blinkOpen, viewDir);
    const [left, right] = eyes;
    if (expr === 'sleepy') {
      for (const cap of eyes) cap.scale.y = 0.22 * blinkOpen;
    } else if (expr === 'surprised') {
      for (const cap of eyes) {
        cap.scale.x = 1.12;
        cap.scale.y = 1.28 * blinkOpen;
      }
    } else if (expr === 'happy') {
      left.userData.extraRotZ = 0.55;
      right.userData.extraRotZ = -0.55;
      left.scale.set(0.75, 0.35 * blinkOpen, 1);
      right.scale.set(0.75, 0.35 * blinkOpen, 1);
      layoutEyes(eyes, blinkOpen, viewDir);
    }
  }

  function updateBlink(time: number) {
    const cfg = botLook.eyes;
    if (time >= blinkAt) {
      blinkCloseUntil = time + cfg.blinkClose;
      blinkStage = Math.random() < cfg.doubleBlinkChance ? 2 : 1;
      blinkAt = time + cfg.blinkMin + Math.random() * (cfg.blinkMax - cfg.blinkMin);
    }
    if (blinkStage > 0 && time > blinkCloseUntil + 0.08) {
      if (blinkStage > 1) {
        blinkStage = 1;
        blinkCloseUntil = time + cfg.blinkClose * 0.85;
      } else blinkStage = 0;
    }
    return time < blinkCloseUntil ? 0.06 : 1;
  }

  function updateGlints(cameraWorld: THREE.Vector3) {
    _camLocal.copy(cameraWorld);
    bodyPivot.worldToLocal(_camLocal);
    _view.copy(_camLocal).normalize();
    _right.crossVectors(_yAxis, _view);
    if (_right.lengthSq() < 1e-5) _right.set(1, 0, 0);
    _right.normalize();
    _up.crossVectors(_view, _right).normalize();
    const g = botLook.glint;
    const rSurf = BOT_RADIUS * (1 - g.surfaceInset);
    const lift = BOT_RADIUS * 0.048;
    const spread = BOT_RADIUS * 0.22;
    const offsets = [
      _right.clone().multiplyScalar(-spread).add(_up.clone().multiplyScalar(lift)),
      _right.clone().multiplyScalar(spread).add(_up.clone().multiplyScalar(lift * 0.92)),
    ];
    for (let i = 0; i < glints.length; i++) {
      const onSphere = _view
        .clone()
        .multiplyScalar(rSurf)
        .add(offsets[i])
        .normalize()
        .multiplyScalar(rSurf);
      const n = onSphere.clone().normalize();
      if (n.dot(_view) < 0.35) {
        glints[i].visible = false;
        continue;
      }
      glints[i].visible = true;
      glints[i].position.copy(onSphere);
      glints[i].lookAt(onSphere.x + n.x, onSphere.y + n.y, onSphere.z + n.z);
    }
  }

  function updateEyes(time: number, motion: BotMotionInput, expr: BotExpression, viewDir: THREE.Vector3) {
    let target = motion.gaze?.clone() ?? null;
    if (!target && motion.moveDir && motion.moveDir.lengthSq() > 0.01) {
      target = root.localToWorld(new THREE.Vector3(motion.moveDir.x, 0, motion.moveDir.y));
    }
    if (!target && time > glanceAt) {
      target = motion.cameraPos.clone();
      glanceAt = time + 2.5 + Math.random() * 4;
    } else if (Math.random() < botLook.eyes.cameraGlanceChance) glanceAt = time;

    gazeOffset.set(0, 0);
    if (target) {
      const local = bodyPivot.worldToLocal(target.clone());
      const slide = botLook.eyes.gazeSlide;
      gazeOffset.x = THREE.MathUtils.clamp(local.x * slide * 0.5, -slide, slide);
      gazeOffset.y = THREE.MathUtils.clamp(local.y * slide * 0.35, -slide * 0.45, slide * 0.35);
    }
    const blinkOpen = updateBlink(time);
    applyExpression(expr, blinkOpen, viewDir);
  }

  function update(
    state: BotState,
    activity: BotActivity,
    time: number,
    cameraRotation: THREE.Quaternion,
    motion: BotMotionInput,
  ) {
    _camLocal.copy(motion.cameraPos);
    bodyPivot.worldToLocal(_camLocal);
    _view.copy(_camLocal).normalize();

    updateGlints(motion.cameraPos);
    const expr = expressionFor(state, activity);
    updateEyes(time, motion, expr, _view);

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
      yOff = Math.abs(Math.sin(time * hz)) * bob * smoothstep(0, 0.25, motion.moveSpeed);
      if (motion.moveDir) lean = -motion.moveDir.x * botMotion.walk.lean * motion.moveSpeed;
    } else if (state === 'Interact' && activity === 'Admire') {
      yOff = Math.abs(Math.sin(time * 3)) * 0.04;
    } else if (state === 'Sleep') {
      yOff = Math.sin(time * 0.7) * 0.008;
    } else {
      yOff = Math.sin(time * botMotion.idle.bobHz) * botMotion.idle.bob;
    }

    visual.position.y = yOff;
    visual.rotation.z =
      lean ||
      (state === 'Sleep' ? 0.1 * Math.sin(time * 0.7) : activity === 'Plant' ? 0.1 * Math.sin(time * 2) : activity === 'Admire' ? 0.07 * Math.sin(time * 3) : 0);
    bodyGroup.scale.set(scaleXZ, scaleY, scaleXZ);
    if (state === 'Sleep') bodyGroup.scale.y *= 0.92;

    sparkles.visible = state === 'Interact' && activity === 'Admire';
    sparkles.scale.setScalar(0.8 + 0.2 * Math.sin(time * 5));
    book.visible = state === 'Interact' && activity === 'Read';

    const activeIcon =
      state === 'Sleep' ? 'Sleep' : state === 'Interact' && (activity === 'Read' || activity === 'Plant') ? activity : null;
    badge.visible = activeIcon !== null;
    for (const [name, icon] of Object.entries(icons)) icon.visible = name === activeIcon;
    badge.quaternion.copy(root.quaternion).invert().multiply(cameraRotation);
    badge.position.y = BOT_BODY_CENTER_Y + BOT_RADIUS + 0.35 + Math.sin(time * 2) * 0.02 + yOff * 0.35;

    const air = Math.max(0, yOff);
    const shadowScale = botLook.shadow.radiusScale * (1 - Math.min(botLook.shadow.airFade, air * 1.4));
    contactShadow.scale.set(shadowScale, shadowScale, 1);
    (contactShadow.material as THREE.MeshBasicMaterial).opacity =
      botLook.shadow.baseOpacity * (1 - Math.min(0.75, air * 2));
  }

  return { root, update };
}
