# DungeonTester combat (canonical)

DT-only crude battle. Fixed positions (no walking). Neverworld `BattleOverlay` is **not** used.

## Path (one system)
- `src/lib/downtown/dungeon-tester/simple-battle.ts` — engine
- `src/lib/downtown/dungeon-tester/battle.ts` — DT entry wrappers (`startDtRandomBattle`, `startDtCampAmbush`, `startDtBattleVs`, `dismissDtBattle`)
- `src/components/dungeon-tester/simple-battle-overlay.tsx` — UI (`dt-sbat-*`)
- `src/components/dungeon-tester/dungeon-tester-game.tsx` — wires overlay

## QA (kept lean)
- Smoke: `npx tsx scripts/qa-simple-battle.ts`
- Balance sim (optional): `npx tsx scripts/qa-dt-balance-sim.ts`
- Browser Playwright helpers live under local `.qa-nm/` (gitignored), not `scripts/`

## Contract
- Fixed spots, no move; foe count + HP/power scaled by **chapter** (Ch1–2 = 2 soft foes for difficulty dial-in; later chapters ramp to 2–3)
- First ambush (`battlesFought === 0`) gets an extra HP/power nerf
- Dog companion joins by default (`look.ts` / `dog.ts`); flees to camp if mean/sulking or hunger ≥ 2 (feed at Camp / Trail Jerky)
- Hero art uses frontier `dtLook` + `DtHeroFigure` (not Neverworld class comic plates)
- Actions: Attack / Buff (Haste) / Heal / Potion / Magic
- Rays + Diablo-style −dmg floats (player FX hold before deferred enemy phase)
- FF-style HP / MP / ST bars; **START BATTLE** splash; Haste = 2 actions
- Ambush cadence: every **10–20** story frames
- Stale Neverworld `battle` blobs dropped in `normalizeDtWorld`

## Play
1. `/downtown/dungeon-tester` (justin@havenpm.com / password123)
2. Seal seat → Story → **Continue →** (HUD: `Frames N · next ambush @ M`)
3. Or **Camp → Force road ambush →**
4. Fight → summary → **Return to story →**

## Prod
`https://haven-pm.vercel.app/downtown/dungeon-tester`
