/**
 * Kyle Corp — automated screenshot capture
 * Run: npx playwright@latest node docs/take_screenshots.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT   = join(__dir, 'screenshots');
mkdirSync(OUT, { recursive: true });

const BASE   = 'http://localhost:5001';
const ADMIN  = 'http://localhost:5002';
const W      = 1440;
const H      = 860;

async function shot(page, file, { scrollY = 0, wait = 800 } = {}) {
  if (scrollY) await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), scrollY);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: join(OUT, file), clip: { x: 0, y: 0, width: W, height: H } });
  console.log('✓', file);
}

(async () => {
  const browser = await chromium.launch();
  const ctx     = await browser.newContext({ viewport: { width: W, height: H } });

  /* ── LANDING PAGE ── */
  const lp = await ctx.newPage();
  await lp.goto(BASE, { waitUntil: 'networkidle' });
  await lp.waitForTimeout(1200);

  await shot(lp, '01_landing_hero.png');

  // Scroll to stats + partners strip
  await shot(lp, '02_stats_partners.png', { scrollY: 720 });

  // Services parallax section
  await shot(lp, '03_services_section.png', { scrollY: 1300 });

  // Products marketplace — scroll to it
  await lp.evaluate(() => document.getElementById('products')?.scrollIntoView());
  await lp.waitForTimeout(900);
  await shot(lp, '04_products_marketplace.png');

  // Products — second row visible
  await shot(lp, '05_products_row2.png', { scrollY: await lp.evaluate(() => document.getElementById('products').getBoundingClientRect().top + window.scrollY + 500) });

  // About parallax
  await lp.evaluate(() => document.getElementById('about')?.scrollIntoView());
  await lp.waitForTimeout(900);
  await shot(lp, '06_about_section.png');

  // How it works
  await lp.evaluate(() => document.getElementById('contact')?.scrollIntoView());
  await lp.waitForTimeout(900);
  await shot(lp, '07_how_it_works.png');

  /* ── LOGIN PAGE ── */
  await lp.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await lp.waitForTimeout(400);
  // Click Sign In button
  await lp.click('button:has-text("Sign In")');
  await lp.waitForTimeout(600);
  await shot(lp, '08_login_page.png');

  /* ── DASHBOARD (auto-login via state injection) ── */
  // Fill dummy creds and submit
  await lp.fill('input[type="text"]', 'j.martinez');
  await lp.fill('input[type="password"]', 'demo1234');
  await lp.click('button[type="submit"]');
  await lp.waitForTimeout(1400);

  // Persona selector — screenshot it, then choose Operations
  await shot(lp, '09_persona_selector.png');
  await lp.click('button.persona-card:has-text("Control Room")');
  await lp.waitForTimeout(900);
  await shot(lp, '10_dashboard_operations.png');

  // Open alarm modal — click first row in alarm table
  const alarmRow = lp.locator('.alarm-row, tr:has(.badge-red), button:has-text("ALM-")').first();
  if (await alarmRow.count()) {
    await alarmRow.click();
    await lp.waitForTimeout(500);
    await shot(lp, '11_alarm_modal.png');
    // Close via the modal close button
    const closeBtn = lp.locator('.modal-close, button:has-text("Dismiss"), button:has-text("Close")').first();
    if (await closeBtn.count()) await closeBtn.click();
    else await lp.locator('.modal-overlay').click({ position: { x: 10, y: 10 } });
    await lp.waitForTimeout(400);
  }

  // Navigate to Maintenance tab
  await lp.click('button:has-text("Maintenance")');
  await lp.waitForTimeout(600);
  await shot(lp, '12_dashboard_maintenance.png');

  // Supply Chain
  await lp.click('button:has-text("Supply Chain")');
  await lp.waitForTimeout(600);
  await shot(lp, '13_dashboard_supply.png');

  // Compliance
  await lp.click('button:has-text("Compliance")');
  await lp.waitForTimeout(600);
  await shot(lp, '14_dashboard_compliance.png');

  // Executive
  await lp.click('button:has-text("Executive")');
  await lp.waitForTimeout(600);
  await shot(lp, '15_dashboard_executive.png');

  /* ── ADMIN PORTAL ── */
  const admin = await ctx.newPage();
  await admin.goto(ADMIN, { waitUntil: 'networkidle' });
  await admin.waitForTimeout(1200);
  await shot(admin, '16_admin_home.png');

  // Try tabs if they exist
  for (const [label, file] of [
    ['Schema', '16_admin_schemas.png'],
    ['Topic',  '17_admin_topics.png'],
    ['Policy', '18_admin_policy.png'],
    ['Observ', '19_admin_observability.png'],
  ]) {
    const btn = admin.locator(`button:has-text("${label}"), a:has-text("${label}")`).first();
    if (await btn.count()) {
      await btn.click();
      await admin.waitForTimeout(600);
      await shot(admin, file);
    }
  }

  await browser.close();
  console.log('\nAll screenshots saved to docs/screenshots/');
})();
