#!/usr/bin/env node
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from 'canvas';

const BASE = process.env.BASE ?? 'http://127.0.0.1:4173/';
const OUT = '/workspace/qa/expansion-pass';
const ART = '/opt/cursor/artifacts';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(ART, { recursive: true });

const ALL_ROOMS = [
  'room-1',
  'room-2',
  'room-3',
  'room-4',
  'room-5',
  'room-6',
  'room-7',
  'room-8',
  'room-9',
  'room-10',
  'yard-main',
  'pool-main',
];
const HALF_ROOMS = ['room-1', 'room-2', 'room-3', 'room-4', 'room-5', 'room-6'];
const FRESH = ['room-1', 'room-2', 'room-3'];

function lum(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function clusterSizes(pixels) {
  const key = (x, y) => `${x},${y}`;
  const set = new Set(pixels.map(([x, y]) => key(x, y)));
  const seen = new Set();
  const sizes = [];
  for (const [x, y] of pixels) {
    const k = key(x, y);
    if (seen.has(k)) continue;
    const stack = [[x, y]];
    let n = 0;
    while (stack.length) {
      const [cx, cy] = stack.pop();
      const ck = key(cx, cy);
      if (seen.has(ck)) continue;
      seen.add(ck);
      n++;
      for (const [nx, ny] of [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1],
      ]) {
        if (set.has(key(nx, ny)) && !seen.has(key(nx, ny))) stack.push([nx, ny]);
      }
    }
    sizes.push(n);
  }
  return sizes.sort((a, b) => b - a);
}

function analyzeDisc(img, disc) {
  const ctx = createCanvas(img.width, img.height).getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { cx, cy, rad } = disc;
  const upperHalf = cy - rad * 0.02;
  let eyeBright = 0;
  const left = { n: 0 };
  const right = { n: 0 };
  const eyePixels = [];
  const upperBright = [];
  for (let y = Math.floor(cy - rad - 8); y <= Math.ceil(cy + rad + 8); y++) {
    for (let x = Math.floor(cx - rad - 8); x <= Math.ceil(cx + rad + 8); x++) {
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      const L = lum(r, g, b);
      const d = Math.hypot(x - cx, y - cy);
      if (d <= rad && L > 200 && y < upperHalf) {
        eyeBright++;
        eyePixels.push([x, y]);
        if (x < cx) left.n++;
        else right.n++;
      }
      if (d <= rad && L > 200 && y < cy) upperBright.push([x, y]);
    }
  }
  const topTwo = clusterSizes(eyePixels).slice(0, 2);
  const glintClusters = clusterSizes(upperBright).filter((s) => s >= 6);
  return {
    eyeBrightPixels: eyeBright,
    eyeClusterSizes: topTwo,
    eyeLeft: left.n,
    eyeRight: right.n,
    eyesOk: left.n >= 10 && right.n >= 10,
    eyesOnBackOk: left.n === 0 && right.n === 0 && eyeBright === 0,
    glintsOk: glintClusters.length >= 2,
  };
}

async function nnZoom4(srcPath, destPath, cx, cy, rad) {
  const size = Math.max(96, Math.ceil(rad * 2.4));
  const img = await loadImage(srcPath);
  const sx = Math.max(0, Math.min(img.width - size, Math.round(cx - size / 2)));
  const sy = Math.max(0, Math.min(img.height - size, Math.round(cy - size / 2)));
  const crop = createCanvas(size, size);
  const cctx = crop.getContext('2d');
  cctx.imageSmoothingEnabled = false;
  cctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
  const out = createCanvas(size * 4, size * 4);
  const octx = out.getContext('2d');
  octx.imageSmoothingEnabled = false;
  octx.drawImage(crop, 0, 0, size * 4, size * 4);
  fs.writeFileSync(destPath, out.toBuffer('image/png'));
}

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

async function seedSave(page, rooms, coins = 999999) {
  await page.evaluate(
    (payload) => {
      localStorage.setItem(
        'bot-house-v1',
        JSON.stringify({
          version: 3,
          coins: payload.coins,
          items: [
            {
              id: 'bed-1',
              type: 'bed',
              roomId: 'room-1',
              x: -2.45,
              z: -2.25,
              rotation: 0,
              purchased: true,
            },
            {
              id: 'table-1',
              type: 'table',
              roomId: 'room-1',
              x: 1.8,
              z: -2.45,
              rotation: 0,
              purchased: true,
            },
            {
              id: 'chair-1',
              type: 'chair',
              roomId: 'room-1',
              x: 1.8,
              z: -0.9,
              rotation: 0,
              purchased: true,
            },
            {
              id: 'lamp-1',
              type: 'lamp',
              roomId: 'room-1',
              x: 3.05,
              z: -2.45,
              rotation: 0,
              purchased: true,
            },
            {
              id: 'plant-1',
              type: 'plant',
              roomId: 'room-1',
              x: -3,
              z: 1.9,
              rotation: 0,
              purchased: true,
            },
          ],
          rooms: payload.rooms,
          logs: ['QA seed'],
          pending: null,
        }),
      );
    },
    { rooms, coins },
  );
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 900));
}

async function houseShot(page, name, portrait = false) {
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

async function botCrop(page, name, mode) {
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluate(() => {
    document.body.classList.remove('portrait');
    window.__botHouseDebug?.setDitherStrength?.(1);
  });
  await page.evaluate(() => {
    window.__botHouseDebug?.lockBotAt?.(0, 2);
  });
  await page.evaluate(async () => {
    window.__botHouseDebug?.focusCloseup?.();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await new Promise((r) => setTimeout(r, 500));
  if (mode === 'back') {
    await page.evaluate(() => window.__botHouseDebug?.backToCamera?.());
  } else if (mode === 'front') {
    await page.evaluate(() => window.__botHouseDebug?.faceCamera?.());
  }
  await new Promise((r) => setTimeout(r, mode === 'blink' ? 3200 : 900));
  const disc = await page.evaluate(() => window.__botHouseDebug?.botScreenDisc?.());
  const probe = await page.evaluate(() => window.__botHouseDebug?.probeDecals?.());
  const png = path.join(OUT, `bot_${name}.png`);
  await page.screenshot({ path: png });
  const zoom = path.join(OUT, `bot_${name}_zoom.png`);
  await nnZoom4(png, zoom, disc.cx, disc.cy, disc.rad);
  fs.copyFileSync(zoom, path.join(ART, `bot_${name}_zoom.png`));
  const img = await loadImage(png);
  const px = analyzeDisc(img, disc);
  const visibleEyes = (probe?.eyes ?? []).filter((e) => e.visible);
  return {
    mode,
    ...px,
    probeVisibleEyes: visibleEyes.length,
    eyesOk: mode === 'front' && visibleEyes.length === 2 && px.eyeLeft >= 6 && px.eyeRight >= 3,
    eyesOnBackOk: mode === 'back' ? visibleEyes.length === 0 && (probe?.glints ?? []).filter((g) => g.visible).length >= 2 : false,
    glintsOk: (probe?.glints ?? []).filter((g) => g.visible).length >= 2,
  };
}

const page = await browser.newPage();
await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 90000 });
await page.waitForSelector('#canvas canvas');

await seedSave(page, FRESH);
await houseShot(page, 'desktop_fresh');

await seedSave(page, HALF_ROOMS);
await houseShot(page, 'desktop_half_unlocked');

await seedSave(page, ALL_ROOMS);
await houseShot(page, 'desktop_all_unlocked');
await houseShot(page, 'portrait_all_unlocked', true);

  const perf = await page.evaluate(async () => {
    const bench = await window.__botHouseDebug?.benchRender?.(120);
    const meshes = window.__botHouseDebug?.countSceneMeshes?.();
    return { ...bench, estimatedDrawCalls: meshes, sceneMeshes: meshes };
  });

for (const id of ['room-4', 'room-5', 'room-6', 'room-7', 'room-8', 'room-9', 'room-10', 'yard-main']) {
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluate(() => document.body.classList.remove('portrait'));
  await page.evaluate(() => window.__botHouseDebug?.resetHouseView?.());
  await new Promise((r) => setTimeout(r, 350));
  await page.screenshot({ path: path.join(OUT, `room_${id}.png`) });
}

const botMetrics = [];
botMetrics.push(await botCrop(page, 'front', 'front'));
botMetrics.push(await botCrop(page, 'back', 'back'));
botMetrics.push(await botCrop(page, 'blink', 'blink'));

const metrics = { headless: true, perf, bot: botMetrics };
fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify(metrics, null, 2));
await browser.close();
console.log(JSON.stringify(metrics, null, 2));
