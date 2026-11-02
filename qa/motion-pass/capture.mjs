#!/usr/bin/env node
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE ?? 'http://127.0.0.1:5173/';
const OUT = process.env.OUT ?? '/workspace/qa/motion-pass';
const BOT_R = 0.37;
const BODY_Y = 0.45;
const FLOOR = 0.06;
const RUG = 0.094;

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

async function pageSetup(width, height) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(BASE, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForSelector('#canvas canvas');
  await page.evaluate(() => localStorage.removeItem('bot-house-v1'));
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#canvas canvas');
  await new Promise((r) => setTimeout(r, 600));
  return page;
}

async function sample(page) {
  return page.evaluate(({ BOT_R, BODY_Y, FLOOR, RUG }) => {
    const d = window.__botHouseDebug?.sample?.();
    if (!d) return { ok: false };
    const carry = d.carry;
    const bot = d.bot;
    const botBottom = BODY_Y - BOT_R;
    const pickup = d.pickupSpot;
    let pickupSep = null;
    if (pickup && bot) pickupSep = Math.hypot(bot.x - pickup[0], bot.z - pickup[1]);
    let carryBotSep = null;
    if (carry && bot) carryBotSep = Math.hypot(carry.x - bot.x, carry.z - bot.z);
    return {
      ok: true,
      state: d.state,
      status: document.querySelector('#status')?.textContent,
      botBottom,
      floorClearance: botBottom - FLOOR,
      rugClearance: botBottom - RUG,
      pickupSep,
      carryBotSep,
      carryY: carry?.y ?? null,
      carry,
      bot,
      pending: d.pending,
    };
  }, { BOT_R, BODY_Y, FLOOR, RUG });
}

async function captureSequence(page, durationMs, intervalMs = 150) {
  const frames = [];
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    frames.push({ t: Date.now() - start, ...(await sample(page)) });
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return frames;
}

fs.mkdirSync(OUT, { recursive: true });
const page = await pageSetup(1280, 800);

await page.click('#live-focus');
await page.click('[data-activity=bed]');
await new Promise((r) => setTimeout(r, 9000));
await page.screenshot({ path: path.join(OUT, 'after_expression_sleep.png'), type: 'png' });

await page.reload({ waitUntil: 'networkidle0' });
await page.waitForSelector('#canvas canvas');
await new Promise((r) => setTimeout(r, 500));

await page.click('#gift-furniture');
const giftFrames = await captureSequence(page, 22000, 150);
fs.writeFileSync(path.join(OUT, 'after_pickup_place_samples.json'), JSON.stringify(giftFrames, null, 2));

const liftFrames = giftFrames.filter((f) => f.state === 'Lift');
const placeFrames = giftFrames.filter((f) => f.state === 'Place');
const metrics = {
  liftMinPickupSep: liftFrames.length ? Math.min(...liftFrames.map((f) => f.pickupSep ?? 999)) : null,
  placeMinCarryBotSep: placeFrames.length ? Math.min(...placeFrames.map((f) => f.carryBotSep ?? 999)) : null,
  placeMinCarryYWhileNearBot: placeFrames.filter((f) => (f.carryBotSep ?? 99) < 0.55).length
    ? Math.min(...placeFrames.filter((f) => (f.carryBotSep ?? 99) < 0.55).map((f) => f.carryY ?? 999))
    : null,
  floorClearanceMin: Math.min(...giftFrames.filter((f) => f.ok).map((f) => f.floorClearance)),
  rugClearanceMin: Math.min(...giftFrames.filter((f) => f.ok).map((f) => f.rugClearance)),
};
fs.writeFileSync(path.join(OUT, 'after_clipping_metrics.json'), JSON.stringify(metrics, null, 2));

await page.reload({ waitUntil: 'networkidle0' });
await page.waitForSelector('#canvas canvas');
await new Promise((r) => setTimeout(r, 400));
await page.click('#gift-furniture');
for (let i = 0; i < 80; i++) {
  const s = await sample(page);
  if (s.state === 'Lift') {
    await page.screenshot({ path: path.join(OUT, 'after_pickup_lift.png'), type: 'png' });
    break;
  }
  await new Promise((r) => setTimeout(r, 150));
}
for (let i = 0; i < 120; i++) {
  const s = await sample(page);
  if (s.state === 'Place' && (s.carryBotSep ?? 0) > 0.45) {
    await page.screenshot({ path: path.join(OUT, 'after_place_mid.png'), type: 'png' });
    break;
  }
  await new Promise((r) => setTimeout(r, 150));
}

await page.reload({ waitUntil: 'networkidle0' });
await page.waitForSelector('#canvas canvas');
await page.click('#live-focus');
await page.click('[data-event=follow]');
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: path.join(OUT, 'after_jump.png'), type: 'png' });

console.log(JSON.stringify({ out: OUT, metrics }, null, 2));
await browser.close();
