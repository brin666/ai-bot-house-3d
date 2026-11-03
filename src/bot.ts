import * as THREE from 'three';
import { flatMaterial } from './look';
import {
  BOT_RADIUS,
  botLook,
  BOT_BODY_CENTER_Y,
  botFaceNormal,
  createBotShadowTexture,
  createEyeCapsuleGeometry,
  createEyeArcGeometry,
  createEyeLineGeometry,
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
const _centerWorld = new THREE.Vector3();
const _toCamWorld = new THREE.Vector3();
const _normalWorld = new THREE.Vector3();
const _bodyForward = new THREE.Vector3();
const _eyeNormalWorld = new THREE.Vector3();
const _eyeWorld = new THREE.Vector3();
const _glintWorld = new THREE.Vector3();
const _glintLocal = new THREE.Vector3();

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
  body.renderOrder = 0;
  bodyPivot.add(body);

  const outline = new THREE.Mesh(
    new THREE.SphereGeometry(BOT_RADIUS * botLook.outlineScale, 28, 22),
    new THREE.MeshBasicMaterial({ color: botLook.outline, side: THREE.BackSide, toneMapped: false }),
  );
  outline.renderOrder = 1;
  bodyPivot.add(outline);

  const eyeOpenH = BOT_RADIUS * botLook.eyes.openHeight;
  const eyeW = BOT_RADIUS * botLook.eyes.width;
  const eyes: EyeMesh[] = [];
  const eyeMats: THREE.MeshBasicMaterial[] = [];
  const e = botLook.eyes;
  for (const side of [-1, 1]) {
    const mat = new THREE.MeshBasicMaterial({
      color: botLook.eye,
      toneMapped: false,
      depthTest: true,
      depthWrite: false,
      side: THREE.FrontSide,
      transparent: true,
      opacity: 1,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
    eyeMats.push(mat);
    const geo =
      side === -1
        ? createEyeCapsuleGeometry(eyeOpenH, eyeW)
        : createEyeCapsuleGeometry(eyeOpenH, eyeW);
    const plane = new THREE.Mesh(geo, mat);
    plane.renderOrder = 35;
    plane.userData.role = 'bot-eye';
    plane.userData.side = side;
    plane.userData.azimuth = side * Math.asin(Math.min(1, e.centerSpread));
    plane.userData.baseGeo = 'capsule';
    eyes.push(plane as EyeMesh);
    bodyPivot.add(plane);
  }

  const glints: THREE.Mesh[] = [];
  const glintMats: THREE.MeshBasicMaterial[] = [];
  const glintRadius = BOT_RADIUS * botLook.glint.size;
  for (let i = 0; i < eyes.length; i++) {
    const glintMat = new THREE.MeshBasicMaterial({
      color: botLook.highlight,
      toneMapped: false,
      depthTest: true,
      depthWrite: false,
      transparent: true,
      opacity: 1,
    });
    const glint = new THREE.Mesh(new THREE.CircleGeometry(glintRadius, 12), glintMat);
    glint.position.set(-eyeW * 0.06, eyeOpenH / 2 - eyeW / 2, 0.002);
    glint.renderOrder = 36;
    glintMats.push(glintMat);
    glints.push(glint);
    eyes[i].add(glint);
  }

  let blinkAt = 2.2;
  let blinkCloseUntil = 0;
  let blinkPairSecond = false;
  let blinkOverride: number | null = null;
  let glanceAt = 0;
  const gazeOffset = new THREE.Vector2();
  let faceFade = 1;
  let walkPhase = 0;
  let previousX = root.position.x;
  let previousZ = root.position.z;
  layoutEyes(eyes, 1, new THREE.Vector3(0, 0.35, 0.92).normalize(), new THREE.Vector3(0, 0.35, 5));

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

  let _lastProbe: Record<string, unknown> = {};

  function layoutEyes(list: EyeMesh[], blinkOpen: number, toCamLocal: THREE.Vector3, cameraWorld: THREE.Vector3) {
    const cfg = botLook.eyes;
    const surf = BOT_RADIUS * 1.028;
    bodyPivot.updateWorldMatrix(true, true);
    root.updateWorldMatrix(true, true);
    _bodyForward.set(0, 0, -1).transformDirection(root.matrixWorld).normalize();
    const faceDot = -_bodyForward.dot(_toCamWorld);
    faceFade = faceDot <= 0 ? 0 : smoothstep(0.08, 0.28, faceDot);
    const pitchBase = Math.asin(Math.min(1, cfg.centerLift));
    for (let i = 0; i < list.length; i++) {
      const cap = list[i];
      const az = (cap.userData.azimuth as number) + gazeOffset.x;
      const pitch = pitchBase + gazeOffset.y;
      const normal = botFaceNormal(az, pitch);
      const pos = normal.clone().multiplyScalar(surf);
      pos.add(_view.clone().multiplyScalar(BOT_RADIUS * 0.018));
      cap.position.copy(pos);
      _eyeNormalWorld.copy(normal).transformDirection(bodyPivot.matrixWorld).normalize();
      cap.getWorldPosition(_eyeWorld);
      cap.lookAt(_eyeWorld.add(_eyeNormalWorld));
      cap.rotateZ(cap.userData.extraRotZ ?? 0);
      const closedRatio = (cfg.closedHeight / cfg.openHeight) * blinkOpen;
      cap.scale.set(1, Math.max(closedRatio, blinkOpen), 1);
      const facing = _eyeNormalWorld.dot(_toCamWorld);
      const alpha =
        facing <= 0
          ? 0
          : facing > 0.2
            ? 1
            : smoothstep(0, 0.2, facing) * Math.max(faceFade, 0.85);
      eyeMats[i].opacity = alpha;
      cap.visible = alpha > 0.04;
    }
  }

  function expressionFor(state: BotState, activity: BotActivity): BotExpression {
    if (state === 'Sleep' || activity === 'Sleep') return 'sleepy';
    if (state === 'Lift' || state === 'Approach') return 'surprised';
    if (state === 'Jump') return 'happy';
    if (state === 'Interact' && activity === 'Admire') return 'happy';
    return 'neutral';
  }

  function setEyeGeometry(kind: 'capsule' | 'arc' | 'line') {
    const openH = BOT_RADIUS * botLook.eyes.openHeight;
    const w = BOT_RADIUS * botLook.eyes.width;
    for (const cap of eyes) {
      if (kind === 'arc') cap.geometry = createEyeArcGeometry(w);
      else if (kind === 'line') cap.geometry = createEyeLineGeometry(w);
      else cap.geometry = createEyeCapsuleGeometry(openH, w);
      cap.userData.baseGeo = kind;
    }
  }

  function applyExpression(expr: BotExpression, blinkOpen: number, toCamLocal: THREE.Vector3, cameraWorld: THREE.Vector3) {
    for (const cap of eyes) {
      cap.userData.extraRotZ = 0;
      cap.scale.x = 1;
      cap.scale.z = 1;
    }
    if (expr === 'sleepy') {
      setEyeGeometry('line');
      for (const cap of eyes) cap.scale.y = blinkOpen;
    } else if (expr === 'happy') {
      setEyeGeometry('arc');
      for (const cap of eyes) cap.scale.y = blinkOpen;
    } else {
      setEyeGeometry('capsule');
    }
    layoutEyes(eyes, blinkOpen, toCamLocal, cameraWorld);
    const glintsAllowed =
      (expr === 'neutral' || expr === 'surprised') && blinkOpen > botLook.eyes.closedHeight / botLook.eyes.openHeight;
    for (let i = 0; i < glints.length; i++) {
      glintMats[i].opacity = eyeMats[i].opacity;
      glints[i].visible = glintsAllowed && eyes[i].visible;
    }
    if (expr === 'surprised') {
      for (let i = 0; i < eyes.length; i++) {
        eyes[i].scale.x = 1.1;
        eyes[i].scale.y = 1.15 * blinkOpen;
        eyeMats[i].opacity *= 1;
      }
    }
  }

  function scheduleNextBlink(from: number) {
    const cfg = botLook.eyes;
    const long = Math.random() < cfg.blinkLongChance;
    blinkAt = from + (long ? cfg.blinkLongGap : cfg.blinkMean + (Math.random() - 0.5) * 1.4);
  }

  function updateBlink(time: number) {
    if (blinkOverride !== null) return blinkOverride;
    const cfg = botLook.eyes;
    if (time >= blinkAt) {
      blinkCloseUntil = time + cfg.blinkClose;
      if (!blinkPairSecond && Math.random() < cfg.blinkDoubleChance) {
        blinkAt = blinkCloseUntil + cfg.blinkDoubleGap;
        blinkPairSecond = true;
      } else {
        blinkPairSecond = false;
        scheduleNextBlink(blinkCloseUntil);
      }
    }
    const closedRatio = cfg.closedHeight / cfg.openHeight;
    return time < blinkCloseUntil ? closedRatio : 1;
  }

  function refreshProbe() {
    _lastProbe = {
      radius: BOT_RADIUS,
      botRy: root.rotation.y,
      toCamWorld: { x: _toCamWorld.x, y: _toCamWorld.y, z: _toCamWorld.z },
      toCamLocal: { x: _view.x, y: _view.y, z: _view.z },
      faceFade,
      faceDot: -_bodyForward.dot(_toCamWorld),
      eyes: eyes.map((eye, i) => ({
        i,
        visible: eye.visible,
        scaleY: eye.scale.y,
        local: { x: eye.position.x, y: eye.position.y, z: eye.position.z },
        dist: eye.position.length(),
      })),
      glints: glints.map((g, i) => {
        const world = g.getWorldPosition(_glintWorld).clone();
        const local = bodyPivot.worldToLocal(world.clone());
        return {
          i,
          parentEyeIndex: i,
          visible: g.visible && eyes[i].visible,
          local: { x: local.x, y: local.y, z: local.z },
          world: { x: world.x, y: world.y, z: world.z },
          dist: local.length(),
        };
      }),
    };
  }

  function updateEyes(time: number, motion: BotMotionInput, expr: BotExpression, toCamLocal: THREE.Vector3) {
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
    applyExpression(expr, blinkOpen, _view, motion.cameraPos);
  }

  function update(
    state: BotState,
    activity: BotActivity,
    time: number,
    cameraRotation: THREE.Quaternion,
    motion: BotMotionInput,
  ) {
    bodyPivot.updateWorldMatrix(true, true);
    bodyPivot.getWorldPosition(_centerWorld);
    _toCamWorld.subVectors(motion.cameraPos, _centerWorld).normalize();
    _camLocal.copy(motion.cameraPos);
    bodyPivot.worldToLocal(_camLocal);
    _view.copy(_camLocal).normalize();

    const expr = expressionFor(state, activity);
    updateEyes(time, motion, expr, _view);
    refreshProbe();

    let yOff = 0;
    let scaleY = 1;
    let scaleXZ = 1;
    let lean = 0;
    const traveled = Math.hypot(root.position.x - previousX, root.position.z - previousZ);
    previousX = root.position.x;
    previousZ = root.position.z;
    // Ignore discontinuous repositioning; walking phase follows actual travel.
    if ((state === 'Move' || state === 'Approach') && traveled < 0.25) {
      walkPhase = (walkPhase + traveled * botMotion.walk.stepRadiansPerUnit) % (Math.PI * 2);
    }

    if (state === 'Jump') {
      const j = jumpOffset(motion.jumpPhase);
      yOff = j.y;
      scaleY = j.scaleY;
      scaleXZ = j.scaleXZ;
    } else if (state === 'Move' || state === 'Approach' || state === 'Carry') {
      const bob = state === 'Carry' ? botMotion.carry.bob : botMotion.walk.stepBob;
      const phase = state === 'Carry' ? time * botMotion.carry.bobHz : walkPhase;
      const stride = Math.abs(Math.sin(phase));
      const movement = smoothstep(0, 0.25, motion.moveSpeed);
      yOff = stride * bob * movement;
      if (state !== 'Carry') {
        const groundSquash = botMotion.walk.stepSquash * movement * (1 - stride);
        scaleY = 1 - groundSquash;
        scaleXZ = 1 + groundSquash * 0.6;
      }
      if (motion.moveDir) lean = -motion.moveDir.x * botMotion.walk.lean * motion.moveSpeed;
    } else if (state === 'Interact' && activity === 'Admire') {
      yOff = Math.abs(Math.sin(time * 3)) * 0.04;
    } else if (state === 'Sleep') {
      const breathPhase = Math.sin(time * botMotion.idle.sleepBreathHz);
      yOff = breathPhase * botMotion.idle.sleepBob;
      scaleY *= 1 + breathPhase * botMotion.idle.sleepBreath;
      scaleXZ *= 1 - breathPhase * botMotion.idle.sleepBreath;
    } else if (state === 'Idle') {
      const breathPhase = Math.sin(time * botMotion.idle.bobHz);
      yOff = breathPhase * botMotion.idle.bob;
      scaleY *= 1 + breathPhase * botMotion.idle.breath;
      scaleXZ *= 1 - breathPhase * botMotion.idle.breath;
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

  function setShells(opts: { showOutline?: boolean }) {
    outline.visible = opts.showOutline ?? true;
  }

  function setBlinkOverride(v: number | null) {
    blinkOverride = v;
  }

  function botEyeClosedRatio() {
    return botLook.eyes.closedHeight / botLook.eyes.openHeight;
  }

  function probeDecals() {
    return _lastProbe;
  }

  function countEyeMeshesInScene() {
    let n = 0;
    root.traverse((o) => {
      if (o instanceof THREE.Mesh && o.userData.role === 'bot-eye') n++;
    });
    return n;
  }

  return { root, update, probeDecals, setShells, setBlinkOverride, botEyeClosedRatio, countEyeMeshesInScene };
}
