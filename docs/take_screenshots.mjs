/**
 * Kyle Corp — comprehensive automated screenshot capture
 * Captures every screen across customer portal + admin system
 * Run: node docs/take_screenshots.mjs (from repo root)
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const OUT   = join(__dir, 'screenshots');
mkdirSync(OUT, { recursive: true });

const BASE  = 'http://localhost:5001';
const ADMIN = 'http://localhost:5002';
const W = 1440, H = 860;

async function shot(page, file, { scrollY = 0, wait = 700 } = {}) {
  if (scrollY) await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), scrollY);
  await page.waitForTimeout(wait);
  await page.screenshot({ path: join(OUT, file), clip: { x: 0, y: 0, width: W, height: H } });
  console.log('✓', file);
}

async function navAdmin(page, key, file) {
  await page.click(`button.admin-nav-item:has-text("${key}"), a.admin-nav-item:has-text("${key}")`);
  await page.waitForTimeout(700);
  await shot(page, file);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H } });

  /* ══════════════════════════════════════════
     CUSTOMER PORTAL — LANDING PAGE
  ══════════════════════════════════════════ */
  const lp = await ctx.newPage();
  await lp.goto(BASE, { waitUntil: 'networkidle' });
  await lp.waitForTimeout(1500);

  await shot(lp, '01_landing_hero.png');
  await shot(lp, '02_stats_partners.png',  { scrollY: 720 });
  await shot(lp, '03_services_section.png', { scrollY: 1250 });

  // Scroll to products section
  await lp.evaluate(() => document.getElementById('products')?.scrollIntoView());
  await lp.waitForTimeout(900);
  await shot(lp, '04_products_marketplace.png');
  await shot(lp, '05_products_row2.png', { scrollY: await lp.evaluate(() => window.scrollY + 500) });

  // About section
  await lp.evaluate(() => document.getElementById('about')?.scrollIntoView());
  await lp.waitForTimeout(900);
  await shot(lp, '06_about_section.png');

  // How it works
  await lp.evaluate(() => document.getElementById('contact')?.scrollIntoView());
  await lp.waitForTimeout(900);
  await shot(lp, '07_how_it_works.png');

  // Footer / CTA
  await lp.evaluate(() => window.scrollTo({ top: document.body.scrollHeight - 860, behavior: 'instant' }));
  await lp.waitForTimeout(600);
  await shot(lp, '08_cta_footer.png');

  /* ══════════════════════════════════════════
     CUSTOMER PORTAL — AUTH FLOW
  ══════════════════════════════════════════ */
  await lp.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await lp.waitForTimeout(400);
  await lp.click('button:has-text("Sign In")');
  await lp.waitForTimeout(700);
  await shot(lp, '09_login_page.png');

  await lp.fill('input[type="text"]', 'j.martinez');
  await lp.fill('input[type="password"]', 'demo1234');
  await lp.click('button[type="submit"]');
  await lp.waitForTimeout(1400);
  await shot(lp, '10_persona_selector.png');

  /* ══════════════════════════════════════════
     CUSTOMER PORTAL — DASHBOARD VIEWS
  ══════════════════════════════════════════ */
  // Operations
  await lp.click('button.persona-card:has-text("Control Room")');
  await lp.waitForTimeout(1000);
  await shot(lp, '11_dashboard_operations.png');

  // Alarm modal
  const alarmRow = lp.locator('.alarm-row, tr:has(.badge-red)').first();
  if (await alarmRow.count()) {
    await alarmRow.click();
    await lp.waitForTimeout(600);
    await shot(lp, '12_alarm_detail_modal.png');
    const closeBtn = lp.locator('.modal-close').first();
    if (await closeBtn.count()) await closeBtn.click();
    await lp.waitForTimeout(400);
  }

  // Maintenance
  await lp.click('button.dash-nav-item:has-text("Maintenance")');
  await lp.waitForTimeout(700);
  await shot(lp, '13_dashboard_maintenance.png');

  // Production
  await lp.click('button.dash-nav-item:has-text("Production")');
  await lp.waitForTimeout(700);
  await shot(lp, '14_dashboard_production.png');

  // Supply Chain
  await lp.click('button.dash-nav-item:has-text("Supply Chain")');
  await lp.waitForTimeout(700);
  await shot(lp, '15_dashboard_supply_chain.png');

  // Compliance
  await lp.click('button.dash-nav-item:has-text("Compliance")');
  await lp.waitForTimeout(700);
  await shot(lp, '16_dashboard_compliance.png');

  // Executive
  await lp.click('button.dash-nav-item:has-text("Executive")');
  await lp.waitForTimeout(700);
  await shot(lp, '17_dashboard_executive.png');

  /* ══════════════════════════════════════════
     ADMIN PORTAL — LOGIN
  ══════════════════════════════════════════ */
  const admin = await ctx.newPage();
  await admin.goto(ADMIN, { waitUntil: 'networkidle' });
  await admin.waitForTimeout(1200);
  await shot(admin, '18_admin_login.png');

  await admin.fill('input[type="email"], input[placeholder*="email"], input[placeholder*="Email"]', 'admin@kylecorp.com');
  await admin.fill('input[type="password"]', 'admin2026');
  await admin.click('button[type="submit"]');
  await admin.waitForTimeout(1200);

  /* ══════════════════════════════════════════
     ADMIN PORTAL — ALL 6 SECTIONS
  ══════════════════════════════════════════ */
  await shot(admin, '19_admin_overview.png');

  // Schema Registry
  await navAdmin(admin, 'Schema Registry', '20_admin_schema_registry.png');

  // Click first schema row for detail modal
  const schemaRow = admin.locator('tr.schema-row, tbody tr').first();
  if (await schemaRow.count()) {
    await schemaRow.click();
    await admin.waitForTimeout(600);
    await shot(admin, '21_admin_schema_detail.png');
    const mc = admin.locator('.modal-close, button:has-text("Close")').first();
    if (await mc.count()) await mc.click();
    await admin.waitForTimeout(400);
  }

  // Event Catalog
  await navAdmin(admin, 'Event Catalog', '22_admin_event_catalog.png');

  // Policy Engine
  await navAdmin(admin, 'Policy Engine', '23_admin_policy_engine.png');

  // CI/CD
  await navAdmin(admin, 'CI', '24_admin_cicd.png');

  // Observability
  await navAdmin(admin, 'Observability', '25_admin_observability.png');

  await browser.close();
  console.log('\n✓ All screenshots saved to docs/screenshots/');
})();
