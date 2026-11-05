#!/usr/bin/env node
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas, loadImage } from 'canvas';

const BASE = process.env.AFTER ?? 'http://127.0.0.1:5173/';
const OUT = '/workspace/qa/bot-look-pass';
const ART = '/opt/cursor/artifacts';

async function nnZoom4(srcPath, destPath, cx, cy, size = 100) {
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
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, out.toBuffer('image/png'));
}

async function botCenter(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#canvas canvas');
    if (!canvas) return { x: 640, y: 400 };
    const r = canvas.getBoundingClientRect();
    return { x: r.left + r.width * 0.52, y: r.top + r.height * 0.48 };
  });
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
  await page.waitForSelector('#canvas canvas');
  await new Promise((r) => setTimeout(r, 700));
}

async function focusFront(page) {
  await page.evaluate(async () => {
    window.__botHouseDebug?.focusCloseup?.();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await new Promise((r) => setTimeout(r, 350));
}

async function setBack(page) {
  await page.evaluate(() => window.__botHouseDebug?.setBotYaw?.(Math.PI * 1.35));
  await new Promise((r) => setTimeout(r, 300));
}

async function shot(page, name, zoom = false) {
  const file = path.join(OUT, `fix_${name}.png`);
  await page.screenshot({ path: file });
  if (zoom) {
    const c = await botCenter(page);
    const zpath = path.join(OUT, `fix_${name}_zoom.png`);
    await nnZoom4(file, zpath, c.x, c.y, 96);
    fs.mkdirSync(ART, { recursive: true });
    fs.copyFileSync(zpath, path.join(ART, path.basename(zpath)));
  }
}

const page = await browser.newPage();
await setup(page);

await focusFront(page);
await shot(page, 'front_idle', true);

await setBack(page);
await shot(page, 'back_glints', true);

await page.reload({ waitUntil: 'networkidle0' });
await focusFront(page);
await page.evaluate(() => document.querySelector('[data-activity=bed]')?.click());
await new Promise((r) => setTimeout(r, 9000));
await focusFront(page);
await shot(page, 'expr_sleepy', true);

await page.reload({ waitUntil: 'networkidle0' });
await focusFront(page);
await page.evaluate(() => document.querySelector('[data-event=follow]')?.click());
await new Promise((r) => setTimeout(r, 1200));
await shot(page, 'expr_happy');

await page.reload({ waitUntil: 'networkidle0' });
await focusFront(page);
await page.evaluate(() => document.querySelector('#gift-furniture')?.click());
for (let i = 0; i < 60; i++) {
  const s = await page.evaluate(() => window.__botHouseDebug?.sample?.()?.state);
  if (s === 'Lift') {
    await focusFront(page);
    await shot(page, 'expr_surprised');
    break;
  }
  await new Promise((r) => setTimeout(r, 120));
}
for (let i = 0; i < 80; i++) {
  const s = await page.evaluate(() => window.__botHouseDebug?.sample?.()?.state);
  if (s === 'Carry') {
    await focusFront(page);
    await shot(page, 'carrying_parcel');
    break;
  }
  await new Promise((r) => setTimeout(r, 120));
}

await page.reload({ waitUntil: 'networkidle0' });
await focusFront(page);
await new Promise((r) => setTimeout(r, 3200));
await shot(page, 'expr_blink_mid');

await page.reload({ waitUntil: 'networkidle0' });
await page.evaluate(() => {
  if (!document.body.classList.contains('portrait')) document.querySelector('#mode')?.click();
});
await new Promise((r) => setTimeout(r, 450));
await page.setViewport({ width: 540, height: 960 });
await new Promise((r) => setTimeout(r, 350));
await page.screenshot({ path: path.join(OUT, 'fix_portrait_916.png') });

await browser.close();
console.log('fix captures done');
