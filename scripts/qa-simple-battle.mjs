/**
 * Smoke test DT simple battle engine (no browser).
 * Run: node scripts/qa-simple-battle.mjs
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { register } from "node:module";

// Use tsx via child — this file is plain JS calling compiled paths thru dynamic import of ts with tsx loader.
async function main() {
  const { createNewDtWorld, sealDtCharacter } = await import(
    "../src/lib/downtown/dungeon-tester/persist.ts"
  ).catch(() => ({ createNewDtWorld: null }));

  if (!createNewDtWorld) {
    console.error("FAIL: could not import persist (run with: npx tsx scripts/qa-simple-battle.mjs)");
    process.exit(1);
  }
}

main();
