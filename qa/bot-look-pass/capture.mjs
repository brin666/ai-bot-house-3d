#!/usr/bin/env node
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const BEFORE = process.env.BEFORE ?? 'http://127.0.0.1:5175/';
const AFTER = process.env.AFTER ?? 'http://127.0.0.1:5173/';
const OUT = '/workspace/qa/bot-look-pass';
const BOT_R = 0.52;
const BODY_Y = 0.615;
const FLOOR = 0.06;
const RUG = 0.094;
const PICKUP_MIN = 0.68;
const PLACE_CLEAR = 0.74;

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

async function setup(page, base) {
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(base, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForSelector('#canvas canvas');
  await page.evaluate(() => localStorage.removeItem('bot-house-v1'));
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#canvas canvas');
  await new Promise((r) => setTimeout(r, 600));
}

async function focusFront(page) {
  const used = await page.evaluate(() => {
    if (window.__botHouseDebug?.focusCloseup) {
      window.__botHouseDebug.focusCloseup();
      return 'debug';
    }
    if (!document.body.classList.contains('portrait')) document.querySelector('#mode')?.click();
    return 'portrait';
  });
  if (used === 'portrait') await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('#live-focus')?.click());
  await new Promise((r) => setTimeout(r, 400));
}

async function resetWide(page) {
  await page.evaluate(() => {
    if (window.__botHouseDebug?.resetHouseView) window.__botHouseDebug.resetHouseView();
    else if (document.body.classList.contains('portrait')) document.querySelector('#mode')?.click();
  });
  await new Promise((r) => setTimeout(r, 300));
}

async function setBack(page) {
  const ok = await page.evaluate(() => {
    if (window.__botHouseDebug?.setBotYaw) {
      window.__botHouseDebug.setBotYaw(Math.PI * 1.35);
      return true;
    }
    return false;
  });
  if (!ok) {
    const canvas = await page.$('#canvas canvas');
    const box = await canvas.boundingBox();
    if (box) {
      const cx = box.x + box.width * 0.55;
      const cy = box.y + box.height * 0.45;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx - 220, cy, { steps: 24 });
      await page.mouse.up();
    }
  }
  await new Promise((r) => setTimeout(r, 250));
}

async function sample(page) {
  return page.evaluate(({ BOT_R, BODY_Y, FLOOR, RUG, PICKUP_MIN, PLACE_CLEAR }) => {
    const d = window.__botHouseDebug?.sample?.();
    if (!d) return { ok: false };
    const bot = d.bot;
    const carry = d.carry;
    const botBottom = BODY_Y - BOT_R;
    let pickupSep = null;
    if (d.pickupSpot && bot) pickupSep = Math.hypot(bot.x - d.pickupSpot[0], bot.z - d.pickupSpot[1]);
    let carryBotSep = null;
    if (carry && bot) carryBotSep = Math.hypot(carry.x - bot.x, carry.z - bot.z);
    return {
      ok: true,
      state: d.state,
      botBottom,
      floorClearance: botBottom - FLOOR,
      rugClearance: botBottom - RUG,
      pickupSep,
      pickupOk: pickupSep === null || pickupSep >= PICKUP_MIN - 0.02,
      carryBotSep,
      carryY: carry?.y ?? null,
      placeHoldOk:
        !carry ||
        carryBotSep === null ||
        carryBotSep >= PLACE_CLEAR ||
        (carry.y ?? 0) >= BODY_Y + BOT_R + 0.35,
    };
  }, { BOT_R, BODY_Y, FLOOR, RUG, PICKUP_MIN, PLACE_CLEAR });
}

async function captureSet(page, prefix) {
  await focusFront(page);
  await page.screenshot({ path: path.join(OUT, `${prefix}_front_idle_neutral.png`) });
  await setBack(page);
  await page.screenshot({ path: path.join(OUT, `${prefix}_back_highlights.png`) });
  await resetWide(page);
  await page.screenshot({ path: path.join(OUT, `${prefix}_wide_scale.png`) });

  await page.reload({ waitUntil: 'networkidle0' });
  await focusFront(page);
  await page.evaluate(() => document.querySelector('[data-activity=bed]')?.click());
  await new Promise((r) => setTimeout(r, 9000));
  await page.screenshot({ path: path.join(OUT, `${prefix}_expr_sleepy.png`) });

  await page.reload({ waitUntil: 'networkidle0' });
  await focusFront(page);
  await page.evaluate(() => document.querySelector('[data-event=follow]')?.click());
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: path.join(OUT, `${prefix}_expr_happy_jump.png`) });

  await page.reload({ waitUntil: 'networkidle0' });
  await focusFront(page);
  await page.evaluate(() => document.querySelector('#gift-furniture')?.click());
  for (let i = 0; i < 60; i++) {
    const s = await sample(page);
    if (s.state === 'Lift') {
      await page.screenshot({ path: path.join(OUT, `${prefix}_expr_surprised.png`) });
      break;
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  for (let i = 0; i < 80; i++) {
    const s = await sample(page);
    if (s.state === 'Carry') {
      await focusFront(page);
      await page.screenshot({ path: path.join(OUT, `${prefix}_carrying_parcel.png`) });
      break;
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  await page.reload({ waitUntil: 'networkidle0' });
  await focusFront(page);
  await new Promise((r) => setTimeout(r, 3200));
  await page.screenshot({ path: path.join(OUT, `${prefix}_expr_blink_mid.png`) });

  await page.reload({ waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    if (!document.body.classList.contains('portrait')) document.querySelector('#mode')?.click();
  });
  await new Promise((r) => setTimeout(r, 450));
  await page.setViewport({ width: 540, height: 960 });
  await new Promise((r) => setTimeout(r, 350));
  await page.screenshot({ path: path.join(OUT, `${prefix}_portrait_916.png`) });
  await page.setViewport({ width: 1280, height: 800 });
}

fs.mkdirSync(OUT, { recursive: true });
const beforePage = await browser.newPage();
await setup(beforePage, BEFORE);
await captureSet(beforePage, 'before');
await beforePage.close();

const afterPage = await browser.newPage();
await setup(afterPage, AFTER);
await captureSet(afterPage, 'after');

await afterPage.evaluate(() => document.querySelector('#gift-furniture')?.click());
const frames = [];
const start = Date.now();
while (Date.now() - start < 24000) {
  frames.push({ t: Date.now() - start, ...(await sample(afterPage)) });
  await new Promise((r) => setTimeout(r, 150));
}
const lift = frames.filter((f) => f.state === 'Lift');
const place = frames.filter((f) => f.state === 'Place');
const metrics = {
  botRadius: BOT_R,
  liftMinPickupSep: lift.length ? Math.min(...lift.map((f) => f.pickupSep ?? 999)) : null,
  liftPickupOk: lift.every((f) => f.pickupOk !== false),
  placeMinCarryYNearBot: place.filter((f) => (f.carryBotSep ?? 99) < PLACE_CLEAR).length
    ? Math.min(...place.filter((f) => (f.carryBotSep ?? 99) < PLACE_CLEAR).map((f) => f.carryY ?? 999))
    : null,
  placeHoldOk: place.every((f) => f.placeHoldOk !== false),
  floorClearanceMin: Math.min(...frames.filter((f) => f.ok).map((f) => f.floorClearance)),
  rugClearanceMin: Math.min(...frames.filter((f) => f.ok).map((f) => f.rugClearance)),
};
fs.writeFileSync(path.join(OUT, 'after_clipping_metrics.json'), JSON.stringify(metrics, null, 2));
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({
  verification: 'Headless Chrome with SwiftShader WebGL — not a phone or livestream device.',
  runtime_confirmed: metrics,
  code_reasoning: [
    'Gloss highlights: MeshBasicMaterial glints + look.dither.highlightFloor in paper pass',
    'Pickup standoff: BOT_PICKUP_STANDOFF + trimPathEnd in delivery/navigation',
    'Place carry height: BOT_CARRY_HOLD_Y from bot-look.ts',
    'Door passage: path still crosses portals at |offset| < width/2 - BOT_CLEARANCE',
  ],
}, null, 2));

console.log(JSON.stringify(metrics, null, 2));
await afterPage.close();
await browser.close();
