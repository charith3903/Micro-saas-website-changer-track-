const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const SCREEN_DIR = path.join(__dirname, 'screenshots-subs');
fs.mkdirSync(SCREEN_DIR, { recursive: true });

const testEmail = `smoketest3+${Date.now()}@example.com`;
const testPassword = 'SmokeTest123!';

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));

  console.log('--- Signup ---');
  await page.goto('http://localhost:3000/signup', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.fill('#email', testEmail);
  await page.fill('#password', testPassword);
  await page.fill('#confirmPassword', testPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  console.log('--- Landing page (new section) ---');
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('h2')?.scrollIntoView());
  const subSection = await page.$('text=Never pay for a forgotten subscription again');
  if (subSection) await subSection.scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(SCREEN_DIR, '1-landing-subs-section.png') });

  console.log('--- Empty subscriptions page ---');
  await page.goto('http://localhost:3000/dashboard/subscriptions', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(SCREEN_DIR, '2-empty-subscriptions.png') });

  console.log('--- Add a trial ending in 2 days (reminder in 3 days -> should fire) ---');
  await page.goto('http://localhost:3000/dashboard/subscriptions/new', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.fill('input[placeholder*="Netflix"]', 'Adobe Trial');
  await page.click('input[type="checkbox"]');
  const trialDate = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  await page.fill('input[type="date"]', trialDate);
  await page.selectOption('#reminder', '3');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/subscriptions', { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SCREEN_DIR, '3-list-with-trial.png'), fullPage: true });

  console.log('--- Add a monthly subscription, past-due (renewal date in the past) ---');
  await page.goto('http://localhost:3000/dashboard/subscriptions/new', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.fill('input[placeholder*="Netflix"]', 'Spotify');
  await page.fill('input[type="number"]', '9.99');
  const pastDate = new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10);
  await page.fill('input[type="date"]', pastDate);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/subscriptions', { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(SCREEN_DIR, '4-list-with-both.png'), fullPage: true });

  console.log('--- Try adding a 4th on free plan (should hit limit at some point; add 2 more first) ---');
  for (const name of ['Item3', 'Item4']) {
    await page.goto('http://localhost:3000/dashboard/subscriptions/new', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await page.fill('input[placeholder*="Netflix"]', name);
    const d = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
    await page.fill('input[type="date"]', d);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(800);
  }
  console.log('after 4 total, url:', page.url());
  await page.screenshot({ path: path.join(SCREEN_DIR, '5-after-limit-attempts.png'), fullPage: true });

  console.log('--- Console errors ---');
  console.log(errors.length ? errors.join('\n') : '(none)');

  await browser.close();
  console.log('DONE');
  console.log('TEST_EMAIL=' + testEmail);
})().catch((e) => {
  console.error('SMOKE TEST FAILED:', e);
  process.exit(1);
});
