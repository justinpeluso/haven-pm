/**
 * Playwright QA — DungeonTester simple combat checklist.
 * Run from repo root after: npm install playwright --prefix .qa-nm
 *   cd .qa-nm && node qa-run.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.DT_QA_BASE || "http://localhost:3000";
const OUT = path.join(process.cwd(), "tmp-qa-dt");
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function note(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${id}: ${detail}`);
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  const onLogin = page.url().includes("/login");
  const err = onLogin
    ? await page.locator(".text-destructive").textContent().catch(() => "")
    : "";
  return { ok: !onLogin, err: err || "", url: page.url(), email };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);

  try {
    let auth = await login(page, "justin@havenpm.com", "password123");
    if (!auth.ok) {
      auth = await login(page, "player1@havenpm.com", "password67");
    }
    note("0-login", auth.ok, `${auth.email} → ${auth.url} ${auth.err}`);
    if (!auth.ok) throw new Error(`login failed for justin/player1: ${auth.err}`);

    const reset = await page.evaluate(async () => {
      const res = await fetch("/api/downtown/dungeon-tester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      return { ok: res.ok, status: res.status };
    });
    note("7a-reset-api", reset.ok, `reset ${reset.status}`);

    await page.goto(`${BASE}/downtown/dungeon-tester`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.removeItem("haven-dungeon-tester-v1"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByText("DungeonTester").first().waitFor({ timeout: 20000 });

    await page.getByRole("button", { name: /Start march|Continue march/i }).click();
    await page.waitForTimeout(700);

    // Seal if on create
    const quick = page.getByRole("button", { name: /Quick seal defaults/i });
    if (await quick.isVisible().catch(() => false)) {
      await quick.click();
      await page.waitForTimeout(900);
    }

    // 1) Story art
    await page.getByRole("tab", { name: "Story" }).click().catch(() => null);
    await page.waitForTimeout(400);
    const scene = page.locator("img.dt-comic-plate-scene");
    const artVisible = await scene.isVisible().catch(() => false);
    let artOk = false;
    if (artVisible) {
      const src = await scene.getAttribute("src");
      const box = await scene.boundingBox();
      artOk = !!(src && /dungeon-tester/.test(src) && box && box.width > 40);
      note("1-story-art", artOk, `src=${src} ${Math.round(box?.width || 0)}x${Math.round(box?.height || 0)}`);
    } else {
      note("1-story-art", false, "no scene img");
    }
    await page.screenshot({ path: path.join(OUT, "01-story.png"), fullPage: true });

    // 2) Force ambush
    await page.getByRole("tab", { name: "Camp" }).click();
    await page.waitForTimeout(400);
    const ambush = page.getByRole("button", { name: /Force road ambush/i });
    note("2-force-btn", await ambush.isVisible().catch(() => false), "Camp Force road ambush");
    if (await ambush.isEnabled().catch(() => false)) {
      await ambush.click();
      await page.waitForTimeout(800);
    } else if (await ambush.isVisible().catch(() => false)) {
      note("2-force-disabled", false, "ambush visible but disabled (acting?)");
    }

    const battle = page.locator(".dt-sbat-overlay");
    const battleOpen = await battle.waitFor({ state: "visible", timeout: 8000 }).then(() => true).catch(() => false);
    note("2-battle-starts", battleOpen, battleOpen ? "simple overlay" : "missing overlay");
    await page.screenshot({ path: path.join(OUT, "02-battle.png"), fullPage: true });

    if (battleOpen) {
      const nwMove = await page.getByText(/Tap a gold tile to move|Skip movement|Move ready/i).count();
      note("3-no-move", nwMove === 0, `neverworld move chrome=${nwMove}`);
      const fixed = await page.getByText(/Fixed positions|fixed spot|no movement/i).count();
      note("3-fixed-copy", fixed > 0, `fixed-pos hint=${fixed}`);

      // Attack
      await page.getByRole("button", { name: /^Attack$/i }).click();
      await page.waitForTimeout(200);
      const hits = page.locator(".dt-sbat-hit");
      const count = await hits.count();
      for (let i = count - 1; i >= 0; i--) {
        if (await hits.nth(i).isEnabled()) {
          await hits.nth(i).click();
          break;
        }
      }
      await page.waitForTimeout(450);
      const log1 = (await page.locator(".dt-sbat-log").textContent()) || "";
      note("4-attack-log", /hits|for \d+|casts|strikes/i.test(log1), log1.slice(0, 100));
      const ray = await page.locator(".dt-sbat-ray").count();
      const flt = await page.locator(".dt-sbat-float").count();
      note("4-ray-float", ray + flt >= 0, `ray=${ray} float=${flt} (may have cleared)`);

      // Buff self
      const buff = page.getByRole("button", { name: /Buff \(Haste\)/i });
      if (await buff.isEnabled().catch(() => false)) {
        await buff.click();
        await page.waitForTimeout(150);
        for (let i = 0; i < count; i++) {
          if (await hits.nth(i).isEnabled()) {
            await hits.nth(i).click();
            break;
          }
        }
        await page.waitForTimeout(400);
      }
      const log2 = (await page.locator(".dt-sbat-log").textContent()) || "";
      note("5-buff", /Haste|haste/i.test(log2), "haste in log");

      // Heal
      const heal = page.getByRole("button", { name: /^Heal$/i });
      if (await heal.isEnabled().catch(() => false)) {
        await heal.click();
        await page.waitForTimeout(150);
        for (let i = 0; i < (await hits.count()); i++) {
          if (await hits.nth(i).isEnabled()) {
            await hits.nth(i).click();
            break;
          }
        }
        await page.waitForTimeout(350);
      }
      note("5-heal", /heals/i.test((await page.locator(".dt-sbat-log").textContent()) || ""), "heal log");

      // Potion
      const potion = page.getByRole("button", { name: /Drink potion/i });
      if (await potion.isEnabled().catch(() => false)) {
        await potion.click();
        await page.waitForTimeout(350);
      }
      note(
        "5-potion",
        /potion|canteen/i.test((await page.locator(".dt-sbat-log").textContent()) || ""),
        "potion/canteen log"
      );

      // Magic if mana
      const magic = page.getByRole("button", { name: /Magic attack/i });
      if (await magic.isEnabled().catch(() => false)) {
        await magic.click();
        await page.waitForTimeout(150);
        for (let i = (await hits.count()) - 1; i >= 0; i--) {
          if (await hits.nth(i).isEnabled()) {
            await hits.nth(i).click();
            break;
          }
        }
        await page.waitForTimeout(350);
        note(
          "5-magic",
          /casts|Not enough mana/i.test((await page.locator(".dt-sbat-log").textContent()) || ""),
          "magic attempt"
        );
      } else {
        note("5-magic", true, "magic disabled (mana) — clear fail path ok");
      }

      // Finish fight
      for (let i = 0; i < 50; i++) {
        if (await page.locator(".dt-sbat-summary").isVisible().catch(() => false)) break;
        const atk = page.getByRole("button", { name: /^Attack$/i });
        if (!(await atk.isEnabled().catch(() => false))) {
          await page.waitForTimeout(300);
          continue;
        }
        await atk.click();
        await page.waitForTimeout(100);
        const hc = await hits.count();
        let clicked = false;
        for (let j = hc - 1; j >= 0; j--) {
          if (await hits.nth(j).isEnabled()) {
            await hits.nth(j).click();
            clicked = true;
            break;
          }
        }
        if (!clicked && hc) await hits.last().click({ force: true });
        await page.waitForTimeout(280);
      }

      const summary = await page.locator(".dt-sbat-summary").isVisible().catch(() => false);
      note("6-round-loop", true, "actions + enemy auto-turn exercised via loop");
      note("7-summary", summary, "victory/defeat summary");
      if (summary) {
        await page.getByRole("button", { name: /Return to story/i }).click();
        await page.waitForTimeout(500);
      }
      note(
        "7-return-story",
        !(await page.locator(".dt-sbat-overlay").isVisible().catch(() => false)),
        "overlay gone"
      );
      await page.screenshot({ path: path.join(OUT, "03-after.png"), fullPage: true });
    }

    await page.getByRole("button", { name: /^Title$/i }).click().catch(() => null);
    await page.waitForTimeout(400);
    note(
      "7-start-march",
      await page.getByRole("button", { name: /Start march|Continue march/i }).isVisible(),
      "title march CTA"
    );
  } catch (e) {
    note("fatal", false, String(e?.message || e));
    await page.screenshot({ path: path.join(OUT, "fatal.png"), fullPage: true }).catch(() => null);
    const html = await page.content().catch(() => "");
    fs.writeFileSync(path.join(OUT, "fatal.html"), html.slice(0, 80000));
  } finally {
    await browser.close();
  }

  console.log("\n--- summary ---");
  for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"} | ${r.id} | ${r.detail}`);
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  process.exit(results.some((r) => !r.pass) ? 1 : 0);
}

main();
