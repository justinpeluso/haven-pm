/**
 * Playwright: mid-fight skip splash + force ambush splash-once loop.
 *
 *   NODE_PATH=.qa-nm/node_modules npx --prefix .qa-nm tsx scripts/qa-splash-once.playwright.ts
 */
import { chromium, type Page } from "playwright";

const BASE = process.env.DT_BASE_URL ?? "http://localhost:3000";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', "justin@havenpm.com");
  await page.fill('input[type="password"]', "Chomps123");
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20_000 });
}

async function enterPlay(page: Page) {
  await page.goto(`${BASE}/true-grit`);
  await page.waitForSelector(".dungeon-tester", { timeout: 20_000 });
  await page.locator("button", { hasText: /^Continue$/ }).first().click();
  await page.waitForSelector(".dt-tabs, button:text-is('Camp'), .dt-panel", { timeout: 15_000 });
  await page.waitForTimeout(600);
}

async function goCamp(page: Page) {
  const camp = page.locator("button", { hasText: /^Camp$/ }).first();
  await camp.waitFor({ state: "visible", timeout: 10_000 });
  await camp.click({ force: true });
  await page.waitForTimeout(400);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await login(page);
    await enterPlay(page);

    if ((await page.locator(".dt-sbat-overlay").count()) > 0) {
      const eyebrow = await page.locator(".dt-sbat-eyebrow").textContent();
      console.log("existing battle:", eyebrow?.trim());
      assert(
        (await page.locator(".dt-sbat-intro").count()) === 0,
        "mid-fight remount must skip splash"
      );
      // If soft-locked on enemy+splash historically, flee recovers
      const flee = page.locator("button", { hasText: /^Flee$/ });
      if (await flee.isVisible()) {
        await flee.click();
        await page.locator(".dt-sbat-overlay").waitFor({ state: "detached", timeout: 10_000 });
        console.log("fled existing battle");
      }
    }

    await goCamp(page);
    const force = page.locator("button", { hasText: /Force road ambush/ });
    await force.waitFor({ state: "visible", timeout: 10_000 });
    await force.click();

    const splash = page.locator(".dt-sbat-intro");
    await splash.waitFor({ state: "visible", timeout: 8_000 });
    console.log("splash visible once at battle start");
    await splash.click();
    await splash.waitFor({ state: "detached", timeout: 5_000 });
    console.log("splash dismissed via click");

    const attack = page.locator("button", { hasText: /^Attack$/ });
    await attack.waitFor({ state: "visible", timeout: 5_000 });
    assert(await attack.isEnabled(), "attack enabled after splash");
    await attack.click();
    const enemy = page.locator(".dt-sbat-hit:not([disabled])").last();
    if ((await enemy.count()) > 0) await enemy.click();

    let ok = false;
    for (let i = 0; i < 40; i++) {
      assert((await page.locator(".dt-sbat-intro").count()) === 0, "splash during combat");
      if (await attack.isEnabled().catch(() => false)) {
        ok = true;
        break;
      }
      if (await page.locator("button", { hasText: /Return to story/ }).isVisible().catch(() => false)) {
        ok = true;
        break;
      }
      await page.waitForTimeout(200);
    }
    assert(ok, "enemy phase completed");
    console.log("enemy phase completed; splash stayed gone");

    if (await attack.isEnabled().catch(() => false)) {
      await attack.click();
      const e2 = page.locator(".dt-sbat-hit:not([disabled])").last();
      if ((await e2.count()) > 0) await e2.click();
      await page.waitForTimeout(2200);
      assert((await page.locator(".dt-sbat-intro").count()) === 0, "no mid-fight splash replay");
    }

    console.log("PASS splash-once playwright");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
