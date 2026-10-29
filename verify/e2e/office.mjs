// P2 dock journeys. Real pointer/keyboard/touch input; the chat, upload and transcription
// endpoints are routed to deterministic fixtures so the journey measures the UI, not a
// provider's mood. Writes docs/redesign/evidence/p2-e2e.txt and exits nonzero on failure.
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { startServer, stopServer, BASE } from '../lib/server.mjs';
import { ensureFreshDist } from '../lib/fresh.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
ensureFreshDist(root, { build: process.env.E2E_BUILD !== '0' });
const out = [];
const results = [];
let failed = 0;
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  out.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
  if (!ok) failed++;
}

const { child } = await startServer();
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    // /dev/shm is 512 MB in this container; a second context crashes the renderer without this.
    '--disable-dev-shm-usage',
    '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['microphone'], ...opts });
  const page = await ctx.newPage();
  // The stop/retry journey needs a reply that outlives a human click. A 250 ms
  // reply can land before the pointer reaches the button, which is not a UI bug.
  const chatDelay = { ms: 250 };
  await page.route('**/api/chat', async (route) => {
    await new Promise((r) => setTimeout(r, chatDelay.ms));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, reply: 'reply **ok**\n\n```js\nconsole.log(1)\n```' }) });
  });
  await page.route('**/api/transcribe', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, text: 'متن صدا' }) }));
  await page.route('**/api/files/content', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, filePath: 'uploads/test.txt' }) }));
  return { ctx, page, chatDelay };
}

try {
  // ---- desktop: send, streaming placeholder, stop, retry, markdown, code copy
  {
    const { ctx, page, chatDelay } = await newPage();
    await page.goto(`${BASE}/?office=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-dock]');
    check('dock present on desktop', await page.locator('[data-dock]').isVisible());
    check('scene mounts behind the dock', await page.locator('[data-scene] canvas').count() === 1);

    const ta = page.locator('#of-composer-input');
    await ta.click();
    await ta.type('سلام دنیا');
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-testid="msg-user"]');
    check('Enter sends the message', (await page.locator('[data-testid="msg-user"]').first().innerText()).includes('سلام دنیا'));
    await page.waitForSelector('[data-testid="msg-assistant"][data-state="done"]', { timeout: 8000 });
    check('assistant reply renders markdown code', (await page.locator('[data-testid="msg-assistant"] pre').count()) >= 1);
    await page.locator('[data-testid="copy-code"]').first().click();
    check('code copy button reacts', (await page.locator('[data-testid="copy-code"]').first().innerText()).includes('✓'));

    // Shift+Enter must insert a newline and not send.
    const before = await page.locator('[data-testid="msg-user"]').count();
    await ta.click();
    await ta.type('line1');
    await page.keyboard.press('Shift+Enter');
    await ta.type('line2');
    check('Shift+Enter does not send', await page.locator('[data-testid="msg-user"]').count() === before);
    check('Shift+Enter inserts a newline', (await ta.inputValue()).includes('\n'));
    await ta.fill('');

    // IME: an Enter during composition must not send (Persian keyboards).
    await ta.click();
    await page.evaluate(() => {
      const el = document.querySelector('#of-composer-input');
      el.value = 'متن';
      el.dispatchEvent(new InputEvent('input', { bubbles: true }));
      el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      el.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
    });
    await page.evaluate(() => {
      const el = document.querySelector('#of-composer-input');
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, isComposing: true }));
    });
    await page.waitForTimeout(150);
    check('IME Enter during composition does not send', await page.locator('[data-testid="msg-user"]').count() === before);
    await ta.fill('');
    await page.evaluate(() => document.querySelector('#of-composer-input').dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })));

    // Stop: route is delayed 250ms; press send, then stop before the reply lands.
    chatDelay.ms = 1500;
    await ta.fill('stop me');
    await page.locator('[data-testid="send"]').click();
    await page.waitForSelector('[data-testid="stop"]');
    check('send turns into stop while running', await page.locator('[data-testid="stop"]').isVisible());
    await page.locator('[data-testid="stop"]').click();
    await page.waitForSelector('[data-testid="msg-assistant"][data-state="error"]', { timeout: 5000 });
    check('stop ends the run with a stopped state', true);
    await page.locator('[data-testid="retry"]').click();
    await page.waitForSelector('[data-testid="msg-assistant"][data-state="done"]', { timeout: 8000 });
    check('retry recovers the last prompt', true);

    // Attach: file input, chip, remove.
    const dir = mkdtempSync(join(tmpdir(), 'of-'));
    const f = join(dir, 'note.txt');
    writeFileSync(f, 'hello');
    await page.setInputFiles('[data-testid="file-input"]', f);
    await page.waitForSelector('[data-testid="chip-note.txt"]');
    check('attachment chip appears', true);
    await page.locator('[data-testid="chip-note.txt"] button').click();
    check('attachment chip can be removed', await page.locator('[data-testid="chip-note.txt"]').count() === 0);

    // Voice: click mic, speak (fake device), click again -> transcribed into the box.
    await page.locator('button[aria-label="صدا"]').click();
    await page.waitForTimeout(400);
    await page.locator('button[aria-label="صدا"]').click();
    await page.waitForFunction(() => document.querySelector('#of-composer-input').value.includes('متن صدا'), null, { timeout: 8000 });
    check('voice input lands in the composer', true);
    await ta.fill('');

    // History drawer: open, search, rename, delete, close by Escape.
    await page.locator('[data-testid="history"]').click();
    await page.waitForSelector('[data-drawer]');
    check('history drawer opens', true);
    await page.locator('[data-testid="thread-search"]').fill('stop me');
    check('thread search filters', await page.locator('[data-testid="thread-row"]').count() >= 1);
    await page.keyboard.press('Escape');
    await page.waitForSelector('[data-drawer]', { state: 'detached' });
    check('Escape closes the drawer', true);

    // Room switch + settings deep link.
    await page.locator('[data-testid="room-command"]').click();
    await page.waitForURL(/room=command/);
    check('room switch updates the URL', true);
    check('room switch sets aria-current', await page.locator('[data-testid="room-command"]').getAttribute('aria-current') === 'true');
    await page.locator('[data-testid="room-welcome"]').click();
    await page.locator('[data-testid="settings"]').click();
    await page.waitForURL(/room=command/);
    check('dock settings opens the command room', true);

    // Language toggle flips direction.
    const dirBefore = await page.locator('.of-shell').getAttribute('dir');
    await page.locator('[data-testid="lang"]').click();
    const dirAfter = await page.locator('.of-shell').getAttribute('dir');
    check('language toggle flips document direction', dirBefore !== dirAfter, `${dirBefore} -> ${dirAfter}`);

    // Persistence across reload.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="history"]').click();
    await page.waitForSelector('[data-drawer]');
    check('threads survive a reload', await page.locator('[data-testid="thread-row"]').count() >= 1);
    await page.keyboard.press('Escape');

    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = axe.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    check('axe serious/critical = 0', serious.length === 0, serious.map((v) => v.id).join(','));
    await page.screenshot({ path: join(root, 'docs/redesign/evidence/p2-office-desktop.png') });
    await ctx.close();
  }

  // ---- mobile 390x844: no horizontal scroll, 16px input, bottom sheet free region
  {
    const { ctx, page } = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(`${BASE}/?office=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-dock]');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('mobile: no horizontal scroll', overflow <= 1, `overflow=${overflow}`);
    const fs = await page.evaluate(() => getComputedStyle(document.querySelector('#of-composer-input')).fontSize);
    check('mobile: composer font >= 16px', parseFloat(fs) >= 16, fs);
    const dock = await page.locator('[data-dock]').boundingBox();
    check('mobile: dock sits at the bottom edge', dock !== null && Math.abs((dock.y + dock.height) - 844) < 2);
    await page.locator('#of-composer-input').tap();
    await page.locator('#of-composer-input').type('پیام موبایل');
    await page.locator('[data-testid="send"]').tap();
    await page.waitForSelector('[data-testid="msg-user"]');
    check('mobile: touch send works', true);
    await page.locator('[data-testid="history"]').tap();
    await page.waitForSelector('[data-drawer]');
    const drawer = await page.locator('[data-drawer]').boundingBox();
    check('mobile: drawer is full width', drawer !== null && drawer.width >= 380);
    await ctx.close();
  }

  // ---- keyboard only: Tab reaches the composer, Enter sends
  {
    const { ctx, page } = await newPage();
    await page.goto(`${BASE}/?office=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-dock]');
    let reached = false;
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const id = await page.evaluate(() => document.activeElement?.id || '');
      if (id === 'of-composer-input') { reached = true; break; }
    }
    check('keyboard: Tab reaches the composer', reached);
    await page.keyboard.type('keys only');
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-testid="msg-user"]');
    check('keyboard: Enter sends', true);
    await ctx.close();
  }

  // ---- offline banner
  {
    const { ctx, page } = await newPage();
    await page.goto(`${BASE}/?office=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-dock]');
    await ctx.setOffline(true);
    await page.waitForSelector('.of-offline', { timeout: 4000 });
    check('offline banner appears', true);
    await ctx.setOffline(false);
    await ctx.close();
  }
} finally {
  await browser.close();
  stopServer(child);
}

mkdirSync(join(root, 'docs/redesign/evidence'), { recursive: true });
const txt = [`P2 office dock journeys — ${new Date().toISOString()}`, `checks: ${results.length}  failed: ${failed}`, ...out].join('\n') + '\n';
writeFileSync(join(root, 'docs/redesign/evidence/p2-e2e.txt'), txt);
console.log(txt);
process.exit(failed === 0 ? 0 : 1);
