# DungeonTester combat (canonical)

DT-only crude battle. Fixed positions (no walking). Neverworld `BattleOverlay` is **not** used.

## Path (one system)
- `src/lib/downtown/dungeon-tester/simple-battle.ts` — engine
- `src/lib/downtown/dungeon-tester/battle.ts` — DT entry wrappers (`startDtRandomBattle`, `startDtCampAmbush`, `startDtBattleVs`, `dismissDtBattle`)
- `src/components/dungeon-tester/simple-battle-overlay.tsx` — UI (`dt-sbat-*`)
- `src/components/dungeon-tester/dungeon-tester-game.tsx` — wires overlay
- Smoke: `npx tsx scripts/qa-simple-battle.ts`

## Contract
- Fixed spots, no move; foe count + HP/power scaled by **chapter** (Ch1 = 1 soft foe; later chapters ramp to 1–3)
- First ambush (`battlesFought === 0`) gets an extra HP/power nerf
- Actions: Attack / Buff (Haste) / Heal / Potion / Magic
- Rays + Diablo-style −dmg floats (player FX hold ~700ms before deferred enemy phase)
- FF-style HP / MP / ST bars on heroes; HP on foes; party strip under field
- **START BATTLE** comic splash ~2.2s (hold + fade) every ambush
- Haste = 2 actions that round
- Ambush cadence: every **10–20** story frames (`DT_ENCOUNTER_MIN/MAX_FRAMES`)
- Stale Neverworld `battle` blobs dropped in `normalizeDtWorld`

## Play
1. `/downtown/dungeon-tester` (justin@havenpm.com / password123)
2. Seal seat → Story → **Continue →** (HUD: `Frames N · next ambush @ M`)
3. Or **Camp → Force road ambush →**
4. Fight → summary → **Return to story →**

## Prod
`https://haven-pm.vercel.app/downtown/dungeon-tester`
