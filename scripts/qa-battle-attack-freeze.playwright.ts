/**
 * Full DT battle lifecycle:
 * Continue → Force ambush → intro once → Attack → enemy resolve → act again
 * → Flee/Return → second ambush intro once (no freeze / auto-attack / flash loop).
 *
 *   NODE_PATH=.qa-nm/node_modules npx --prefix .qa-nm tsx scripts/qa-battle-attack-freeze.playwright.ts
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
  await page.waitForTimeout(600);
}

async function enterPlay(page: Page) {
  await page.goto(`${BASE}/downtown/dungeon-tester`);
  await page.waitForSelector(".dungeon-tester", { timeout: 20_000 });
  await page.waitForTimeout(500);

  // Title: Continue or Start march
  const start = page.getByRole("button", { name: /Start march|Continue march|^Continue$/i }).first();
  if (await start.isVisible().catch(() => false)) {
    await start.click();
    await page.waitForTimeout(600);
  }

  // Create / seal if needed
  const quick = page.locator("button", { hasText: /Quick seal/i });
  if (await quick.count()) {
    await quick.first().click();
    await page.waitForTimeout(800);
  } else {
    const seal = page.getByRole("button", { name: /Seal (seat|hero|for the road)|Seal my seat/i });
    if (await seal.isVisible().catch(() => false)) {
      await seal.click();
      await page.waitForTimeout(800);
    }
  }

  await page.waitForSelector(".dt-tabs, button:text-is('Camp'), .dt-panel", { timeout: 15_000 });
  await page.waitForTimeout(400);
}

async function clearOpenBattle(page: Page) {
  if ((await page.locator(".dt-sbat-overlay").count()) === 0) return;
  const flee = page.locator("button", { hasText: /^Flee$/ });
  if (await flee.isVisible().catch(() => false)) {
    await flee.click();
    await page.locator(".dt-sbat-overlay").waitFor({ state: "detached", timeout: 10_000 });
    return;
  }
  const ret = page.locator("button", { hasText: /Return to story/ });
  if (await ret.isVisible().catch(() => false)) {
    await ret.click();
    await page.locator(".dt-sbat-overlay").waitFor({ state: "detached", timeout: 10_000 });
  }
}

async function goCamp(page: Page) {
  const tab = page.getByRole("tab", { name: /^Camp$/i });
  if (await tab.isVisible().catch(() => false)) {
    await tab.click();
  } else {
    const camp = page.locator("button", { hasText: /^Camp$/ }).first();
    await camp.waitFor({ state: "visible", timeout: 10_000 });
    await camp.click({ force: true });
  }
  await page.waitForTimeout(400);
}

async function forceAmbush(page: Page) {
  await goCamp(page);
  const force = page.getByRole("button", { name: /Force (road )?ambush|Ambush/i });
  await force.waitFor({ state: "visible", timeout: 10_000 });
  await force.click();
}

async function battleSnapshot(page: Page) {
  return page.evaluate(() => {
    const msg = document.querySelector(".dt-sbat-msg")?.textContent ?? "";
    const hint = document.querySelector(".dt-sbat-hint")?.textContent ?? "";
    const log = [...document.querySelectorAll(".dt-sbat-log li")].map((li) => li.textContent ?? "");
    const attack = [...document.querySelectorAll("button")].find(
      (b) => b.textContent?.trim() === "Attack"
    ) as HTMLButtonElement | undefined;
    const intro = !!document.querySelector(".dt-sbat-intro");
    const summary = !!document.querySelector(".dt-sbat-summary");
    const round =
      document.querySelector(".dt-sbat-eyebrow")?.textContent?.match(/round\s+(\d+)/i)?.[1] ??
      "?";
    return {
      msg,
      hint,
      log,
      attackDisabled: attack ? attack.disabled : null,
      intro,
      summary,
      round,
      enemyTurnText: /Enemy turn/i.test(hint) || /Enemy turn/i.test(msg),
      overlay: !!document.querySelector(".dt-sbat-overlay"),
    };
  });
}

async function waitAttackEnabled(page: Page) {
  const attack = page.locator("button", { hasText: /^Attack$/ });
  await attack.waitFor({ state: "visible", timeout: 5_000 });
  await page.waitForFunction(
    () => {
      const btn = [...document.querySelectorAll("button")].find(
        (b) => b.textContent?.trim() === "Attack"
      );
      return !!btn && !(btn as HTMLButtonElement).disabled;
    },
    { timeout: 10_000 }
  );
}

async function doAttack(page: Page) {
  await waitAttackEnabled(page);
  await page.locator("button", { hasText: /^Attack$/ }).click();
  const enabledEnemy = page.locator(".dt-sbat-hit:not([disabled])");
  await enabledEnemy.first().waitFor({ state: "visible", timeout: 3_000 });
  await enabledEnemy.first().click();
}

async function expectIntroOnceThenGone(page: Page, label: string) {
  const splash = page.locator(".dt-sbat-intro");
  await splash.waitFor({ state: "visible", timeout: 8_000 });
  console.log(`${label}: intro visible`);
  await splash.click();
  await splash.waitFor({ state: "detached", timeout: 5_000 });
  await page.waitForTimeout(800);
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(250);
    assert(
      (await page.locator(".dt-sbat-intro").count()) === 0,
      `${label}: intro must not replay (flash loop)`
    );
  }
  console.log(`${label}: intro stayed gone`);
}

async function expectEnemyThenPlayerAgain(page: Page, label: string) {
  const before = await battleSnapshot(page);
  await doAttack(page);
  console.log(`${label}: attack+target clicked`);

  let attackBack = false;
  let ended = false;
  let gotEnemyLog = false;
  let stuckEnemy = true;
  for (let i = 0; i < 24; i++) {
    await page.waitForTimeout(400);
    const snap = await battleSnapshot(page);
    gotEnemyLog =
      gotEnemyLog || snap.log.some((l) => /strikes|hits|casts/i.test(l ?? ""));
    ended = snap.summary === true;
    attackBack =
      snap.attackDisabled === false && !snap.enemyTurnText && !snap.summary;
    if (attackBack || ended) {
      stuckEnemy = false;
      break;
    }
    if (!snap.enemyTurnText && snap.attackDisabled === false) {
      stuckEnemy = false;
      attackBack = true;
      break;
    }
  }

  const last = await battleSnapshot(page);
  console.log(
    `${label}: result`,
    JSON.stringify({
      attackBack,
      ended,
      gotEnemyLog,
      stuckEnemy,
      round: last.round,
      intro: last.intro,
      enemyTurnText: last.enemyTurnText,
    })
  );

  assert(!last.intro, `${label}: splash must stay gone after attack`);
  assert(
    !stuckEnemy,
    `${label}: FREEZE — stuck on enemy turn / Attack disabled`
  );
  assert(
    ended || attackBack || gotEnemyLog || Number(last.round) > Number(before.round),
    `${label}: expected enemy resolve or next player turn`
  );
  if (attackBack) {
    const mid = await battleSnapshot(page);
    await page.waitForTimeout(1200);
    const after = await battleSnapshot(page);
    assert(!after.intro, `${label}: no intro during idle`);
    assert(
      after.attackDisabled === false || after.summary,
      `${label}: Attack should remain usable (no auto-lock)`
    );
    const autoGrew =
      after.log.filter((l) => /hits|strikes/i.test(l ?? "")).length -
      mid.log.filter((l) => /hits|strikes/i.test(l ?? "")).length;
    assert(autoGrew <= 0, `${label}: auto-attack detected while idle (${autoGrew})`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(20_000);
  page.on("console", (msg) => {
    if (msg.type() === "error" || /Battle FSM|sbat|enemy/i.test(msg.text())) {
      console.log(`[console.${msg.type()}]`, msg.text());
    }
  });
  try {
    await login(page);
    await enterPlay(page);
    await clearOpenBattle(page);

    await forceAmbush(page);
    await expectIntroOnceThenGone(page, "b1");
    await expectEnemyThenPlayerAgain(page, "b1");
    await clearOpenBattle(page);
    assert(
      (await page.locator(".dt-sbat-overlay").count()) === 0,
      "overlay must leave after flee/return"
    );
    console.log("b1: returned to world");

    await forceAmbush(page);
    await expectIntroOnceThenGone(page, "b2");
    await expectEnemyThenPlayerAgain(page, "b2");
    await clearOpenBattle(page);

    console.log("PASS full lifecycle (2 battles, no freeze / intro loop / auto-attack)");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
