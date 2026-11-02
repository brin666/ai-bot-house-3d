#!/usr/bin/env node
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from 'canvas';

const BASE = process.env.BASE ?? 'http://127.0.0.1:4173/';
const OUT = '/workspace/qa/polish-pass';
const ART = '/opt/cursor/artifacts';
fs.mkdirSync(OUT, { recursive: true });

const ALL = [
  'room-1', 'room-2', 'room-3', 'room-4', 'room-5', 'room-6',
  'room-7', 'room-8', 'room-9', 'room-10', 'yard-main', 'pool-main',
];
const FRESH = ['room-1', 'room-2', 'room-3'];
const YAWS = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI];

async function seed(page, rooms) {
  await page.evaluate((payload) => {
    localStorage.setItem(
      'bot-house-v1',
      JSON.stringify({
        version: 3,
        coins: 999999,
        items: payload.items,
        rooms: payload.ids,
        logs: ['QA'],
        pending: null,
      }),
    );
  }, {
    ids: rooms,
    items: [
      { id: 'bed-1', type: 'bed', roomId: 'room-1', x: -2.45, z: -2.25, rotation: 0, purchased: true },
      { id: 'table-1', type: 'table', roomId: 'room-1', x: 1.8, z: -2.45, rotation: 0, purchased: true },
      { id: 'chair-1', type: 'chair', roomId: 'room-1', x: 1.8, z: -0.9, rotation: 0, purchased: true },
      { id: 'lamp-1', type: 'lamp', roomId: 'room-1', x: 3.05, z: -2.45, rotation: 0, purchased: true },
      { id: 'plant-1', type: 'plant', roomId: 'room-1', x: -3, z: 1.9, rotation: 0, purchased: true },
    ],
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForFunction(() => Boolean(window.__botHouseDebug?.countSceneMeshes), { timeout: 60000 });
  await new Promise((r) => setTimeout(r, 400));
}

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader'],
});

const page = await browser.newPage();
await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 90000 });
await page.waitForSelector('#canvas canvas');

async function houseShot(name, portrait = false) {
  if (portrait) {
    await page.evaluate(() => document.body.classList.add('portrait'));
    await page.setViewport({ width: 540, height: 960 });
  } else {
    await page.evaluate(() => document.body.classList.remove('portrait'));
    await page.setViewport({ width: 1280, height: 800 });
  }
  await page.evaluate(() => window.__botHouseDebug?.resetHouseView?.());
  await new Promise((r) => setTimeout(r, 600));
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  fs.copyFileSync(file, path.join(ART, `${name}.png`));
}

await seed(page, FRESH);
await houseShot('desktop_fresh');
await seed(page, ALL);
await houseShot('desktop_all_unlocked');
await houseShot('portrait_all_unlocked', true);

const perf = await page.evaluate(async () => {
  const bench = await window.__botHouseDebug?.benchRender?.(90);
  return {
    beforeDecorMeshes: window.__botHouseDebug?.perfBeforeMeshes?.(),
    afterDecorMeshes: window.__botHouseDebug?.perfAfterMeshes?.(),
    visibleMeshes: window.__botHouseDebug?.countSceneMeshes?.(),
    bench,
  };
});

const eyeAudit = await page.evaluate((yaws) => window.__botHouseDebug?.auditEyeMeshesAtYaws?.(yaws), YAWS);

await page.evaluate(() => {
  window.__botHouseDebug?.lockBotAt?.(9.15, -3.4);
  window.__botHouseDebug?.faceCamera?.();
});
await page.evaluate(() => window.__botHouseDebug?.resetHouseView?.());
await new Promise((r) => setTimeout(r, 700));
await page.screenshot({ path: path.join(OUT, 'bot_behind_wall.png') });
fs.copyFileSync(path.join(OUT, 'bot_behind_wall.png'), path.join(ART, 'bot_behind_wall.png'));

async function botYawShot(yaw, name) {
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluate(() => {
    document.body.classList.remove('portrait');
    window.__botHouseDebug?.lockBotAt?.(0, 2);
    window.__botHouseDebug?.focusCloseup?.();
  });
  await page.evaluate((y) => window.__botHouseDebug?.setBotYaw?.(y), yaw);
  await new Promise((r) => setTimeout(r, 700));
  const disc = await page.evaluate(() => window.__botHouseDebug?.botScreenDisc?.());
  if (!disc?.rad) return;
  const png = path.join(OUT, `bot_yaw_${name}.png`);
  await page.screenshot({ path: png });
  const img = await loadImage(png);
  const size = Math.max(96, Math.ceil(disc.rad * 2.4));
  const crop = createCanvas(size, size);
  const cctx = crop.getContext('2d');
  cctx.drawImage(img, disc.cx - size / 2, disc.cy - size / 2, size, size, 0, 0, size, size);
  const out = createCanvas(size * 4, size * 4);
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false;
  octx.drawImage(crop, 0, 0, size * 4, size * 4);
  const zoom = path.join(OUT, `bot_yaw_${name}_zoom.png`);
  fs.writeFileSync(zoom, out.toBuffer('image/png'));
  fs.copyFileSync(zoom, path.join(ART, `bot_yaw_${name}_zoom.png`));
}

for (const [yaw, name] of [
  [0, '0'],
  [Math.PI / 4, '45'],
  [Math.PI / 2, '90'],
  [Math.PI, '180'],
]) {
  await botYawShot(yaw, name);
}

const metrics = {
  headless: true,
  pass4BaselineMeshes: 458,
  perf,
  eyeAudit,
  eyeCountOk: eyeAudit?.every((s) => s.count === 2),
};
fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 2));
console.log(JSON.stringify(metrics, null, 2));
await browser.close();
