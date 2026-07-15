/**
 * Playwright: start fight, wait 5s without clicking — no Justin damage, no splash flicker.
 *
 *   NODE_PATH=.qa-nm/node_modules npx --prefix .qa-nm tsx scripts/qa-battle-idle.playwright.ts
 */
import { chromium, type Page } from "playwright";

const BASE = process.env.DT_BASE_URL ?? "http://localhost:3000";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', "justin@havenpm.com");
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 20_000 });
}

async function enterPlay(page: Page) {
  await page.goto(`${BASE}/downtown/dungeon-tester`);
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
      const flee = page.locator("button", { hasText: /^Flee$/ });
      if (await flee.isVisible()) {
        await flee.click();
        await page.locator(".dt-sbat-overlay").waitFor({ state: "detached", timeout: 10_000 });
      }
    }

    await goCamp(page);
    const force = page.locator("button", { hasText: /Force road ambush/ });
    await force.waitFor({ state: "visible", timeout: 10_000 });
    await force.click();

    const splash = page.locator(".dt-sbat-intro");
    await splash.waitFor({ state: "visible", timeout: 8_000 });
    // Dismiss splash (OK to click splash — must not click Attack/targets).
    await splash.click();
    await splash.waitFor({ state: "detached", timeout: 5_000 });
    console.log("splash dismissed");

    const attack = page.locator("button", { hasText: /^Attack$/ });
    await attack.waitFor({ state: "visible", timeout: 5_000 });
    // Wait until player controls unlock (splash lock / pending).
    await page.waitForFunction(
      () => {
        const btn = [...document.querySelectorAll("button")].find(
          (b) => b.textContent?.trim() === "Attack"
        );
        return !!btn && !(btn as HTMLButtonElement).disabled;
      },
      { timeout: 8_000 }
    );
    assert(await attack.isEnabled(), "Attack enabled after splash — player turn");

    const logBefore = (await page.locator(".dt-sbat-log li").allTextContents()).join("\n");
    const foeLineBefore = (await page.locator(".dt-sbat-foe-line").textContent()) ?? "";
    const partyHpBefore = (await page.locator(".dt-sbat-party-card").first().textContent()) ?? "";

    let splashSeen = 0;
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(500);
      splashSeen += await page.locator(".dt-sbat-intro").count();
      assert(await attack.isEnabled(), "still player turn — no auto enemy phase");
    }
    assert(splashSeen === 0, "no splash flicker during idle wait");

    const logAfter = (await page.locator(".dt-sbat-log li").allTextContents()).join("\n");
    const foeLineAfter = (await page.locator(".dt-sbat-foe-line").textContent()) ?? "";
    const partyHpAfter = (await page.locator(".dt-sbat-party-card").first().textContent()) ?? "";

    assert(!/Justin hits|Justin casts/i.test(logAfter), "no Justin damage without click");
    assert(logAfter === logBefore, "combat log unchanged while idle");
    assert(foeLineAfter === foeLineBefore, "foe HP unchanged while idle");
    assert(partyHpAfter === partyHpBefore, "party HP unchanged while idle");

    console.log("PASS idle no-auto / no-flash playwright");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
