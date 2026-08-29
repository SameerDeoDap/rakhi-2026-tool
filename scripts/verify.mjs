// Rakhi 2026 — empty-state E2E verification.
// Starts the Vite dev server, drives system Chrome via puppeteer-core,
// then kills the whole process tree. No orphan processes.
import { spawn, execSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const PORT = 4173;
const BASE = `http://localhost:${PORT}`;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const LS_KEY = 'rakhi2026.data.v2';
const results = [];
const consoleErrors = [];

const ok = (name, pass, extra = '') => {
  results.push({ name, pass, extra });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
};

function killTree(pid) {
  try { execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }); } catch { /* already dead */ }
}

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try { const r = await fetch(url); if (r.ok) return true; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function clickByText(page, selector, text) {
  const handle = await page.evaluateHandle((sel, t) => {
    const els = [...document.querySelectorAll(sel)];
    return els.find((e) => e.textContent.trim().includes(t)) ?? null;
  }, selector, text);
  const el = handle.asElement();
  if (!el) return false;
  await el.click();
  return true;
}

const bodyText = (page) => page.evaluate(() => document.body.innerText);
const noNaN = (t) => !t.includes('NaN') && !t.includes('Infinity');

/** Fill the nth number input inside the open dialog (React-safe). */
async function fillDialogNumber(page, index, value) {
  await page.evaluate((i, v) => {
    const dlg = document.querySelector('[role="dialog"]');
    const inputs = [...dlg.querySelectorAll('input[type="number"]')];
    const num = inputs[i];
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(num, v);
    num.dispatchEvent(new Event('input', { bubbles: true }));
  }, index, value);
}

let server;
let browser;
try {
  server = spawn('npm.cmd', ['run', 'dev', '--', '--port', String(PORT), '--strictPort'], {
    cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe'], shell: true,
  });
  const up = await waitForServer(BASE);
  ok('dev server starts', up);
  if (!up) throw new Error('server never came up');

  browser = await puppeteer.launch({
    executablePath: CHROME, headless: true,
    args: ['--no-sandbox', '--window-size=1440,900'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  // ── Login gate ──
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  let text = await bodyText(page);
  ok('login gate renders first', text.includes('Rakhi 2026 Project') && text.includes('Sign in'));
  await page.type('input[type="password"]', 'wrong-password');
  await clickByText(page, 'button', 'Sign in');
  await new Promise((r) => setTimeout(r, 400));
  ok('wrong password rejected', (await bodyText(page)).includes('Incorrect password'));

  // ── Admin login on a completely EMPTY dataset ──
  await page.evaluate(() => {
    const input = document.querySelector('input[type="password"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, '');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.type('input[type="password"]', 'Nikul@2026');
  await clickByText(page, 'button', 'Sign in');
  await page.waitForFunction(() => document.body.innerText.includes('CEO Dashboard'), { timeout: 10000 });

  const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), LS_KEY);
  ok('dataset starts completely empty',
    stored.income.length === 0 && stored.goods.length === 0 && stored.services.length === 0
    && stored.stock.length === 0 && stored.sellerAccounts.length === 0 && stored.duplicates.length === 0,
    `income=${stored.income.length} goods=${stored.goods.length} stock=${stored.stock.length} sellers=${stored.sellerAccounts.length}`);
  ok('default structure kept (categories)',
    stored.goodsCategories.length === 6 && stored.serviceCategories.length === 14,
    `goodsCats=${stored.goodsCategories.length} svcCats=${stored.serviceCategories.length}`);

  text = await bodyText(page);
  ok('dashboard shows ₹0 empty state', text.includes('₹0') && noNaN(text));
  ok('dashboard chart empty states render', text.includes('No revenue data yet') && text.includes('No closing stock recorded yet'));
  ok('profit formula still shown', text.toLowerCase().includes('net profit = marketplace sales income'));

  // ── All pages render cleanly with empty data ──
  const pages = [
    ['Income', 'No income entries yet'],
    ['Expenses', 'No purchases yet'],
    ['Inventory', 'No stock data yet'],
    ['Import Excel', 'Download a template'],
    ['Duplicates', 'No flags in this view'],
    ['Categories', 'Centrally controlled'],
    ['Marketplace P&L', 'Amazon'],
    ['Post-Mortem', 'No data yet'],
    ['Settings', 'Users & Permissions'],
  ];
  for (const [nav, marker] of pages) {
    await clickByText(page, 'nav a', nav);
    await new Promise((r) => setTimeout(r, 700));
    const t = await bodyText(page);
    ok(`empty page: ${nav}`, t.includes(marker) && noNaN(t), t.includes(marker) ? '' : `missing "${marker}"`);
  }

  // Marketplace P&L lists all marketplaces with zeros
  await clickByText(page, 'nav a', 'Marketplace P&L');
  await new Promise((r) => setTimeout(r, 600));
  text = await bodyText(page);
  ok('marketplace P&L shows all 6 marketplaces with ₹0',
    ['Amazon', 'Flipkart', 'Meesho', 'DeoDap.in', 'Wholesale', 'Other'].every((m) => text.includes(m)) && text.includes('₹0') && noNaN(text));

  // Settings: demo buttons removed
  await clickByText(page, 'nav a', 'Settings');
  await new Promise((r) => setTimeout(r, 600));
  text = await bodyText(page);
  ok('demo buttons removed from Settings',
    !text.includes('Clear demo data') && !text.includes('Restore demo dataset') && !text.includes('Danger Zone'));

  // ── Add ONE income entry (Amazon, Marketplace Sales, ₹50,000) ──
  await clickByText(page, 'nav a', 'Income');
  await new Promise((r) => setTimeout(r, 500));
  await clickByText(page, 'button', 'Add Income');
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await fillDialogNumber(page, 0, '50000'); // amount
  await fillDialogNumber(page, 1, '100');   // orders
  await fillDialogNumber(page, 2, '150');   // units
  await clickByText(page, '[role="dialog"] button', 'Save Entry');
  await new Promise((r) => setTimeout(r, 800));
  let count = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).income.length, LS_KEY);
  ok('income entry saved', count === 1, `income=${count}`);

  // ── Add ONE goods purchase (Rakhi / Single Rakhi, 1000 × ₹10 = ₹10,000) ──
  await clickByText(page, 'nav a', 'Expenses');
  await new Promise((r) => setTimeout(r, 500));
  await clickByText(page, 'button', 'Add Purchase');
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await fillDialogNumber(page, 0, '1000'); // qty
  await fillDialogNumber(page, 1, '10');   // rate
  await clickByText(page, '[role="dialog"] button', 'Save Purchase');
  await new Promise((r) => setTimeout(r, 800));
  count = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).goods.length, LS_KEY);
  ok('goods purchase saved', count === 1, `goods=${count}`);

  // ── Dashboards update from empty ──
  await clickByText(page, 'nav a', 'Dashboard');
  await page.waitForFunction(() => document.body.innerText.includes('CEO Dashboard'), { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 700));
  text = await bodyText(page);
  ok('dashboard updates: Total Sales ₹50,000', text.includes('₹50,000') && noNaN(text));
  ok('dashboard updates: Goods Cost ₹10,000', text.includes('₹10,000'));
  ok('dashboard chart now renders (recharts svg)', (await page.$('svg.recharts-surface')) !== null);

  await clickByText(page, 'nav a', 'Marketplace P&L');
  await new Promise((r) => setTimeout(r, 700));
  text = await bodyText(page);
  ok('marketplace P&L updates: Amazon revenue ₹50,000 + 80% margin', text.includes('₹50,000') && text.includes('80.0%') && noNaN(text));

  await clickByText(page, 'nav a', 'Post-Mortem');
  await new Promise((r) => setTimeout(r, 700));
  text = await bodyText(page);
  ok('post-mortem now generates findings', !text.includes('No data yet') && text.includes('Auto-detected findings') && noNaN(text));

  // ── Excel template still downloads ──
  const dlDir = mkdtempSync(path.join(tmpdir(), 'rakhi-dl-'));
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: dlDir });
  await clickByText(page, 'nav a', 'Import Excel');
  await new Promise((r) => setTimeout(r, 500));
  await clickByText(page, 'button', 'Income');
  await new Promise((r) => setTimeout(r, 1500));
  const files = readdirSync(dlDir);
  ok('Excel template downloads', files.some((f) => f.includes('income-template')), files.join(','));
  rmSync(dlDir, { recursive: true, force: true });

  // ── Team user: dashboards visible, admin pages hidden ──
  await clickByText(page, 'button', 'Sign out');
  await new Promise((r) => setTimeout(r, 600));
  await page.waitForSelector('input[type="password"]', { timeout: 5000 });
  await page.type('input[type="password"]', 'rakhi2026');
  await clickByText(page, 'button', 'Sign in');
  await page.waitForFunction(() => document.body.innerText.includes('CEO Dashboard'), { timeout: 10000 });
  text = await bodyText(page);
  ok('team user login works, dashboard shows entered data', text.includes('₹50,000') && noNaN(text));
  const navText = await page.evaluate(() => document.querySelector('nav')?.innerText ?? '');
  ok('admin-only pages hidden from team user', !navText.includes('Duplicates') && !navText.includes('Categories') && !navText.includes('Settings'));

  // ── Console errors ──
  const realErrors = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('Download the React DevTools'));
  ok('no console/page errors', realErrors.length === 0, realErrors.slice(0, 3).join(' | '));

  await browser.close();
  browser = null;
} catch (err) {
  ok('fatal error', false, String(err));
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server?.pid) killTree(server.pid);
}

const failed = results.filter((r) => !r.pass);
console.log(`\n===== ${results.length - failed.length}/${results.length} checks passed =====`);
writeFileSync('verify-results.json', JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
