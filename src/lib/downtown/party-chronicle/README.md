# Party Chronicle — ~50 hour campaign design

Skyrim / Middle-earth comic CRPG for three players (Justin → Rusty → Elisha).

## Playtime budget (~50h)

| Act | Chapter | Levels | Est. hours | Longevity hooks |
|-----|---------|--------|------------|-----------------|
| 1 | Frostford Wake | 1–5 | 3 | Talking animals, first path splits |
| 2 | Goblin Road | 5–12 | 4 | Cooking side quest, ambush deck |
| 3 | Hold of Embers | 10–22 | 5 | Court intrigue, private slot talks |
| 4 | Dragon Whisper | 20–35 | 5 | Legendary hunt, alignment forks |
| 5 | Misty Crossing | 35–50 | 6 | Exploration loops, dual-path maps |
| 6 | Crown of Ash | 50–65 | 6 | Temptation / refuse gear |
| 7 | Fellowship Strain | 65–80 | 5 | Per-player conversations ×3 |
| 8 | World-Eater Gate | 80–92 | 5 | Encounter decks + hotbar mastery |
| 9 | Last Council | 90–99 | 5 | Destiny foreshadow, feast quest |
| 10 | Chronicle's End | 100 | 6 | **Animal / Human / Demon** finales |
| | | | **50** | |

Estimates assume three players rotating turns. Solo play compresses ~30–40%.

## Systems that make 50h credible

- Levels 1→100 with skill-tree unlocks every few levels
- **10 act encounter decks** (~80 foes + bosses) in `data/party-chronicle/encounters.json`
- **34 side quests** (~27h if fully cleared) — cooking, hounds, legendary hunts, private slots
- **20 cooking recipes** including Wild/Hearth/Ash ending feasts
- **6 talking-animal arcs** (Pip, Corv, Ulfric, Aelwyn, Bruna, Nyx) with multi-act payoffs
- **10 foreshadow beats** that echo in the finales
- Gear tiers: common / magic / legendary (expanded catalog)
- Alignment scores steer **Animal / Human / Demon** full endings
- Mid-game montages grant XP without empty grind
- 3-player turn order (Justin → Rusty → Elisha) multiplies wall-clock ~1.6–2.2×

## How to play (local)

1. `npm run dev` → http://localhost:3000
2. Log in: `player1@havenpm.com` / `player2@havenpm.com` / `player3@havenpm.com` — password `password67`
3. Downtown → **Party Chronicle**
4. Each login only creates/controls their own character; turn order Justin → Rusty → Elisha

## Endings

- **Animal (Wild Crown)** — lean into pack/wild choices
- **Human (Hearth Crown)** — oaths, holds, stewardship
- **Demon (Ash Throne)** — power / hunger / crown temptation
