# DungeonTester combat handoff (lead)

## What shipped
DT-only crude battle. Fixed positions (no walking). Neverworld `BattleOverlay` is **not** used by DungeonTester.

### Files
- `src/lib/downtown/dungeon-tester/simple-battle.ts` — engine
- `src/components/dungeon-tester/simple-battle-overlay.tsx` — UI
- `src/lib/downtown/dungeon-tester/battle.ts` — thin DT entrypoints
- `src/lib/downtown/dungeon-tester/types.ts` — `battle: SimpleBattleState | null`
- `src/components/dungeon-tester/dungeon-tester-game.tsx` — wires `SimpleBattleOverlay`

## How to play / trigger a fight
1. Open `/downtown/dungeon-tester` (login as justin@havenpm.com / password123).
2. Seal Justin’s seat if needed → Continue march → Story tab.
3. Hit **Continue →** on story frames. HUD shows `Frames N · next ambush @ M`.
4. When `framesAdvanced >= nextEncounterAtFrame` (gap rolls **10–20** frames after start / after each fight), a crude ambush overlay opens.
5. Faster path: **Camp → Force road ambush →**.
6. Fight: pick a hero → Attack / Buff (Haste) / Heal / Drink potion / Magic → click fixed target. Rays + floating −dmg. Enemies then act **in place**. Haste = 2 actions that round.
7. Victory/Defeat summary → **Return to story →**.

## Other agents
- **Reset:** Wipe Justin’s DT save (localStorage `haven-dungeon-tester-v1` + API `/api/downtown/dungeon-tester`) so he doesn’t keep a stale Neverworld `battle` blob. `normalizeDtWorld` already drops non-simple battle shapes.
- **Cadence / UI polish:** Merge carefully. Do not reintroduce `BattleOverlay` into DT. Preserve frame art, playtime HUD, party seats.
- **QA:** Confirm no import of `components/party-chronicle/battle-overlay` from dungeon-tester; ambush after ~10–20 Continues; force ambush; rays/floats; victory returns to story.

## Prod
`https://haven-pm.vercel.app/downtown/dungeon-tester`
