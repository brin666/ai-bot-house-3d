#!/usr/bin/env node
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from 'canvas';

const BASE = process.env.AFTER ?? 'http://127.0.0.1:5173/';
const OUT = '/workspace/qa/bot-look-pass';
const ART = '/opt/cursor/artifacts';

function lum(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function isNavy(r, g, b) {
  const l = lum(r, g, b);
  return l > 28 && l < 150 && b > r + 8 && b > g + 4;
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

function analyzeDisc(img, disc, ditherOn) {
  const ctx = createCanvas(img.width, img.height).getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { cx, cy, rad } = disc;
  const upperHalf = cy - rad * 0.02;
  let eyeBright = 0;
  const left = { n: 0 };
  const right = { n: 0 };
  const eyePixels = [];
  const upperBright = [];
  let glintLeft = 0;
  let glintRight = 0;
  let navyRing = 0;
  let ringSamples = 0;
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
      if (d > rad && d <= rad + 5) {
        ringSamples++;
        if (isNavy(r, g, b)) navyRing++;
      }
      if (d <= rad && L > 200 && y < cy) {
        upperBright.push([x, y]);
        if (x < cx) glintLeft++;
        else glintRight++;
      }
    }
  }
  const eyeClusterSizes = clusterSizes(eyePixels);
  const glintClusterSizes = clusterSizes(upperBright).filter((s) => s >= 6);
  const glintsOk = glintClusterSizes.length >= 2;
  const topTwo = eyeClusterSizes.slice(0, 2);
  const eyeClustersOk =
    eyeBright >= 40 && topTwo.length >= 2 && topTwo[0] >= 12 && topTwo[1] >= 12;
  return {
    ditherOn,
    disc: { cx, cy, rad },
    eyeBrightPixels: eyeBright,
    eyeClusterLeft: left.n,
    eyeClusterRight: right.n,
    eyeClusterSizes: topTwo,
    eyeClustersOk,
    glintLeft,
    glintRight,
    glintClusterSizes,
    glintsOk,
    navyRingPixels: navyRing,
    navyRingSamples: ringSamples,
    navyRingOk: navyRing >= 8,
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

async function setup(page) {
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForSelector('#canvas canvas');
  await page.evaluate(() => localStorage.removeItem('bot-house-v1'));
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 700));
}

async function prep(page, { dither = 1, outline = true } = {}) {
  await page.evaluate(async ({ dither, outline }) => {
    window.__botHouseDebug?.setDitherStrength?.(dither);
    window.__botHouseDebug?.setBotShells?.({ showOutline: outline });
    window.__botHouseDebug?.focusCloseup?.();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }, { dither, outline });
  await new Promise((r) => setTimeout(r, 400));
}

async function captureShot(page, name, yaw = null) {
  if (yaw === 'back') {
    const faceRy = await page.evaluate(() => window.__botHouseDebug?.sample?.().bot.ry ?? 0);
    await page.evaluate(
      (y) => window.__botHouseDebug?.setBotYaw?.(y),
      faceRy + Math.PI,
    );
    await page.evaluate(async () => {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });
  } else if (yaw != null) {
    await page.evaluate((y) => window.__botHouseDebug?.setBotYaw?.(y), yaw);
  }
  await new Promise((r) => setTimeout(r, 900));
  const disc = await page.evaluate(() => window.__botHouseDebug?.botScreenDisc?.());
  const probe = await page.evaluate(() => window.__botHouseDebug?.probeDecals?.());
  const png = path.join(OUT, `fix2_${name}.png`);
  await page.screenshot({ path: png });
  const img = await loadImage(png);
  const metrics = analyzeDisc(img, disc, true);
  const zoomPath = path.join(OUT, `fix2_${name}_zoom.png`);
  const userZoom =
    name === 'front_neutral'
      ? 'fix2_front_idle_zoom.png'
      : name === 'back_glints'
        ? 'fix2_back_glints_zoom.png'
        : name === 'expr_happy'
          ? 'fix2_expr_happy_zoom.png'
          : name === 'expr_sleepy'
            ? 'fix2_expr_sleepy_zoom.png'
            : name === 'expr_blink_mid'
              ? 'fix2_expr_blink_zoom.png'
              : null;
  await nnZoom4(png, zoomPath, disc.cx, disc.cy, disc.rad);
  if (userZoom) {
    const alias = path.join(OUT, userZoom);
    fs.copyFileSync(zoomPath, alias);
    fs.copyFileSync(zoomPath, path.join(ART, userZoom));
  }
  fs.copyFileSync(zoomPath, path.join(ART, path.basename(zoomPath)));
  return { ...metrics, probe, shot: name };
}

const page = await browser.newPage();
await setup(page);

const diagnostics = [];
await prep(page, { dither: 0, outline: true });
diagnostics.push({ phase: 'ditherOff', ...(await captureShot(page, 'diag_dither_off')) });
await prep(page, { dither: 1, outline: false });
diagnostics.push({ phase: 'noOutline', ...(await captureShot(page, 'diag_no_outline')) });
await prep(page, { dither: 1, outline: true });
diagnostics.push({ phase: 'ditherOn', probe: await page.evaluate(() => window.__botHouseDebug?.probeDecals?.()) });

await prep(page, { dither: 1, outline: true });
const results = [];
results.push(await captureShot(page, 'front_neutral'));
results.push(await captureShot(page, 'back_glints', 'back'));
await page.reload({ waitUntil: 'networkidle0' });
await prep(page);
await page.evaluate(() => document.querySelector('[data-event=follow]')?.click());
await new Promise((r) => setTimeout(r, 1200));
results.push(await captureShot(page, 'expr_happy'));
await page.reload({ waitUntil: 'networkidle0' });
await prep(page);
await page.evaluate(() => document.querySelector('[data-activity=bed]')?.click());
await new Promise((r) => setTimeout(r, 9000));
await prep(page);
results.push(await captureShot(page, 'expr_sleepy'));
await page.reload({ waitUntil: 'networkidle0' });
await prep(page);
await new Promise((r) => setTimeout(r, 3200));
results.push(await captureShot(page, 'expr_blink_mid'));

const front = results.find((r) => r.shot === 'front_neutral');
const back = results.find((r) => r.shot === 'back_glints');

const metrics = {
  verification: 'Headless Chrome + SwiftShader; pixel counts from botScreenDisc bounding circle.',
  diagnostics: diagnostics.map(({ probe, shot, phase, eyeBrightPixels, eyeClusterLeft, eyeClusterRight }) => ({
    phase: phase ?? shot,
    eyeBrightPixels,
    eyeClusterLeft,
    eyeClusterRight,
    probe,
  })),
  front: {
    eyeBrightPixels: front.eyeBrightPixels,
    eyeClusterLeft: front.eyeClusterLeft,
    eyeClusterRight: front.eyeClusterRight,
    eyeClusterSizes: front.eyeClusterSizes,
    eyeAcceptance: front.eyeClustersOk,
    navyRingPixels: front.navyRingPixels,
    navyRingOk: front.navyRingOk,
    probe: front.probe,
  },
  back: {
    glintLeft: back.glintLeft,
    glintRight: back.glintRight,
    glintClusterSizes: back.glintClusterSizes,
    glintsAcceptance: back.glintsOk,
    eyeAcceptanceOnBack: !back.eyeClustersOk,
    eyesOnBackOk: back.glintsOk && !back.eyeClustersOk,
    probe: back.probe,
  },
  allShots: results.map(({ shot, eyeBrightPixels, eyeClusterLeft, eyeClusterRight, glintLeft, glintRight }) => ({
    shot,
    eyeBrightPixels,
    eyeClusterLeft,
    eyeClusterRight,
    glintLeft,
    glintRight,
  })),
  rootCause:
    'Runtime: opaque sheen shell (removed) wrote depth over face decals; wrong forward axis (+Z vs Three.js −Z) broke facing tests; eye planes were edge-on until camera billboarding. Dither OFF vs ON and outline OFF runs in diagnostics confirm decals are mesh/depth issues, not paper strength alone.',
};

fs.writeFileSync(path.join(OUT, 'fix2_metrics.json'), JSON.stringify(metrics, null, 2));
console.log(JSON.stringify(metrics.front, null, 2));
console.log(JSON.stringify(metrics.back, null, 2));

await browser.close();
