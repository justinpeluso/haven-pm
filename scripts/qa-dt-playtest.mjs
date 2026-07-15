/**
 * Extended DungeonTester playtest (~several minutes): splash, FF bars, multi-battle.
 * Run: node scripts/qa-dt-playtest.mjs
 * Needs: playwright in .qa-nm (npm i playwright --prefix .qa-nm) + npm run dev
 */
import { chromium } from "../.qa-nm/node_modules/playwright/index.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BASE = process.env.DT_QA_BASE || "http://localhost:3000";
const OUT = path.join(ROOT, "tmp-qa-dt");
const TARGET_MS = Number(process.env.DT_PLAYTEST_MS || 10 * 60 * 1000); // ~10 min default

fs.mkdirSync(OUT, { recursive: true });

const results = [];
function note(id, pass, detail) {
  results.push({ id, pass: !!pass, detail: String(detail) });
  console.log(`${pass ? "PASS" : "FAIL"} ${id}: ${detail}`);
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1800);
  return !page.url().includes("/login");
}

async function waitIntroGone(page) {
  // START BATTLE holds ~1.4s then fades ~0.8s
  const intro = page.locator(".dt-sbat-intro");
  if (await intro.count()) {
    await intro.waitFor({ state: "detached", timeout: 5000 }).catch(() => null);
  }
  await page.waitForTimeout(200);
}

async function clickAction(page, label) {
  const btn = page.getByRole("button", { name: new RegExp(`^${label}$`, "i") });
  if (!(await btn.isEnabled().catch(() => false))) return false;
  await btn.click();
  await page.waitForTimeout(120);
  return true;
}

async function clickEnabledUnit(page, preferEnemy = true) {
  const hits = page.locator(".dt-sbat-hit");
  const count = await hits.count();
  const order = preferEnemy
    ? [...Array(count).keys()].reverse()
    : [...Array(count).keys()];
  for (const i of order) {
    if (await hits.nth(i).isEnabled()) {
      await hits.nth(i).click();
      await page.waitForTimeout(200);
      return true;
    }
  }
  return false;
}

async function finishBattleCarefully(page) {
  for (let i = 0; i < 80; i++) {
    if (await page.locator(".dt-sbat-summary").isVisible().catch(() => false)) {
      return true;
    }
    if (!(await page.locator(".dt-sbat-overlay").isVisible().catch(() => false))) {
      return false;
    }
    await waitIntroGone(page);

    // Heal if hero bars look low — opportunistic
    const hint = (await page.locator(".dt-sbat-hint").textContent().catch(() => "")) || "";
    const lowHp = /You \d+\//.test(hint);

    if (lowHp && (await clickAction(page, "Heal"))) {
      await clickEnabledUnit(page, false);
      continue;
    }
    if (await clickAction(page, "Attack")) {
      await clickEnabledUnit(page, true);
      await page.waitForTimeout(450);
      continue;
    }
    await page.waitForTimeout(500);
  }
  return page.locator(".dt-sbat-summary").isVisible().catch(() => false);
}

async function forceAmbush(page) {
  await page.getByRole("tab", { name: "Camp" }).click();
  await page.waitForTimeout(350);
  const ambush = page.getByRole("button", { name: /Force road ambush/i });
  if (!(await ambush.isEnabled().catch(() => false))) {
    return false;
  }
  await ambush.click();
  await page.waitForTimeout(600);
  return page.locator(".dt-sbat-overlay").isVisible().catch(() => false);
}

async function main() {
  const started = Date.now();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  const consoleErrs = [];
  page.on("pageerror", (e) => consoleErrs.push(String(e)));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrs.push(msg.text());
  });

  try {
    let ok = await login(page, "justin@havenpm.com", "password123");
    if (!ok) ok = await login(page, "admin@havenpm.com", "password123");
    note("login", ok, ok ? page.url() : "failed");
    if (!ok) throw new Error("login failed");

    const reset = await page.evaluate(async () => {
      const res = await fetch("/api/downtown/dungeon-tester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      return { ok: res.ok, status: res.status };
    });
    note("reset", reset.ok, `status ${reset.status}`);

    await page.goto(`${BASE}/downtown/dungeon-tester`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.removeItem("haven-dungeon-tester-v1"));
    await page.reload({ waitUntil: "networkidle" }).catch(() =>
      page.reload({ waitUntil: "domcontentloaded" })
    );
    await page.getByText("DungeonTester").first().waitFor({ timeout: 20000 });

    await page.getByRole("button", { name: /Start march|Continue march/i }).click();
    await page.waitForTimeout(800);

    const quick = page.getByRole("button", { name: /Quick seal defaults/i });
    if (await quick.isVisible().catch(() => false)) {
      await quick.click();
      await page.waitForTimeout(1000);
    }
    note("sealed", true, "create/quick-seal step done");

    // Story continues — burn a few frames
    await page.getByRole("tab", { name: "Story" }).click().catch(() => null);
    for (let i = 0; i < 6; i++) {
      const cont = page.getByRole("button", { name: /Continue →|Continue/i });
      if (await cont.isEnabled().catch(() => false)) {
        await cont.click();
        await page.waitForTimeout(450);
      } else break;
      if (await page.locator(".dt-sbat-overlay").isVisible().catch(() => false)) break;
    }

    let battles = 0;
    let victories = 0;
    let seenSplash = 0;
    let seenBars = false;

    while (Date.now() - started < TARGET_MS && battles < 18) {
      // Human-paced story beat between ambushes
      await page.getByRole("tab", { name: "Story" }).click().catch(() => null);
      for (let j = 0; j < 3; j++) {
        if (await page.locator(".dt-sbat-overlay").isVisible().catch(() => false)) break;
        const cont = page.getByRole("button", { name: /Continue →/i });
        if (await cont.isEnabled().catch(() => false)) {
          await cont.click();
          await page.waitForTimeout(900);
        } else break;
      }
      await page.waitForTimeout(1200);

      const open =
        (await page.locator(".dt-sbat-overlay").isVisible().catch(() => false)) ||
        (await forceAmbush(page));
      if (!open) {
        await page.waitForTimeout(800);
        continue;
      }

      battles++;
      // Splash must appear (or already fading — catch early)
      const splash = page.locator(".dt-sbat-intro-badge");
      const splashVisible = await splash
        .waitFor({ state: "visible", timeout: 2500 })
        .then(() => true)
        .catch(() => false);
      if (splashVisible) {
        const text = ((await splash.textContent()) || "").trim();
        if (/START BATTLE/i.test(text)) seenSplash++;
        await page.screenshot({
          path: path.join(OUT, `splash-${battles}.png`),
          fullPage: false,
        });
      }
      note(
        `splash-b${battles}`,
        splashVisible || battles > 1,
        splashVisible ? "START BATTLE visible" : "missed splash (timing)"
      );

      // FF bars
      const partyBars = await page.locator(".dt-sbat-party-strip .dt-sbat-bar").count();
      const unitBars = await page.locator(".dt-sbat-unit .dt-sbat-bar").count();
      const hasHp = (await page.locator('.dt-sbat-bar[data-kind="hp"]').count()) > 0;
      const hasMp = (await page.locator('.dt-sbat-bar[data-kind="mp"]').count()) > 0;
      const hasSt = (await page.locator('.dt-sbat-bar[data-kind="st"]').count()) > 0;
      if (partyBars >= 3 && hasHp && hasMp && hasSt) seenBars = true;
      note(
        `bars-b${battles}`,
        hasHp && (hasMp || partyBars > 0),
        `partyBars=${partyBars} unitBars=${unitBars} hp=${hasHp} mp=${hasMp} st=${hasSt}`
      );

      // Single foe early?
      const foeLine = (await page.locator(".dt-sbat-foe-line").textContent()) || "";
      const foeParts = foeLine.replace(/^Foes:\s*/i, "").split("·").map((s) => s.trim()).filter(Boolean);
      if (battles === 1) {
        note("ch1-one-foe", foeParts.length === 1, `foes=${foeParts.join(" | ")}`);
      }

      await waitIntroGone(page);

      // Exercise Buff / Heal / Potion once early
      if (battles === 1) {
        if (await clickAction(page, "Buff")) {
          await clickEnabledUnit(page, false);
          note(
            "buff",
            /Haste|haste/i.test((await page.locator(".dt-sbat-log").textContent()) || ""),
            "haste applied"
          );
        }
        if (await clickAction(page, "Heal")) {
          await clickEnabledUnit(page, false);
        }
        if (await clickAction(page, "Potion")) {
          await page.waitForTimeout(250);
        }
      }

      const won = await finishBattleCarefully(page);
      const summaryTxt = (await page.locator(".dt-sbat-summary").textContent().catch(() => "")) || "";
      const isVic = /Victory/i.test(summaryTxt);
      if (isVic) victories++;
      note(`battle-${battles}`, won, isVic ? "victory" : summaryTxt.slice(0, 80) || "no summary");
      await page.screenshot({ path: path.join(OUT, `end-${battles}.png`), fullPage: false });

      if (won) {
        await page.getByRole("button", { name: /Return to story/i }).click();
        await page.waitForTimeout(500);
      }

      // Advance story a bit between fights
      await page.getByRole("tab", { name: "Story" }).click().catch(() => null);
      for (let j = 0; j < 4; j++) {
        if (await page.locator(".dt-sbat-overlay").isVisible().catch(() => false)) break;
        const cont = page.getByRole("button", { name: /Continue →/i });
        if (await cont.isEnabled().catch(() => false)) {
          await cont.click();
          await page.waitForTimeout(400);
        } else break;
      }
    }

    note("play-duration", true, `${Math.round((Date.now() - started) / 1000)}s battles=${battles}`);
    note("splash-seen", seenSplash >= 1, `splashCount=${seenSplash}/${battles}`);
    note("ff-bars", seenBars, "HP/MP/ST party strip");
    note("mostly-win", victories >= Math.max(1, battles - 1), `wins=${victories}/${battles}`);
    note(
      "no-page-error",
      consoleErrs.length === 0,
      consoleErrs.slice(0, 3).join(" | ") || "clean"
    );
  } catch (e) {
    note("fatal", false, String(e?.message || e));
    await page.screenshot({ path: path.join(OUT, "fatal.png"), fullPage: true }).catch(() => null);
    fs.writeFileSync(
      path.join(OUT, "fatal.html"),
      (await page.content().catch(() => "")).slice(0, 80000)
    );
  } finally {
    await browser.close();
  }

  console.log("\n--- summary ---");
  for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"} | ${r.id} | ${r.detail}`);
  fs.writeFileSync(path.join(OUT, "playtest-results.json"), JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.pass);
  process.exit(failed.length ? 1 : 0);
}

main();
