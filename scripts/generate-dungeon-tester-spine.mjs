#!/usr/bin/env node
/**
 * Generate the DungeonTester story spine (~30h / 9 chapters).
 *
 * Original Wilderland liberation arc inspired by Django beat-structure
 * (thrall → binder alliance → hunt for beloved → baronial stronghold → revolt).
 * No film or LOTR trademark character/place names.
 *
 * Chapters 1–2: thorough authored frames + generated connective tissue.
 * Chapters 3–9: stub connective narrative frames with enemy themes.
 *
 * Out: data/dungeon-tester/story-spine.json (+ chapters mirror)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data", "dungeon-tester");
const OUT = join(OUT_DIR, "story-spine.json");
const CHAPTERS_OUT = join(OUT_DIR, "chapters.json");

const TARGET_HOURS = 30;
const ENCOUNTER_CADENCE = {
  minFrames: 10,
  maxFrames: 20,
  note: "Engine-side: roll next random ambush after 10–20 frames advance; prefer chapter enemyThemes.",
};

/** @typedef {"narrative"|"choice"|"encounter"|"ending"} FrameKind */

function pad(n, w = 2) {
  return String(n).padStart(w, "0");
}

function frameId(ch, idx) {
  return `dt-ch${pad(ch)}-${pad(idx, 3)}`;
}

function sceneId(slug) {
  return `scene-dt-${slug}`;
}

function artId(slug) {
  return `art-dt-${slug}`;
}

const CHAPTERS = [
  {
    chapter: 1,
    slug: "chain-road",
    title: "Chain-Road Dawn",
    tagline: "A numbered thrall is bought off a road of cages — and asked to kill for paper freedom.",
    estimatedHours: 4,
    levelMin: 1,
    levelMax: 8,
    fidelity: "thorough",
    enemyThemes: ["chain-orcs", "road-wargs", "cage-tenders", "brand-hounds"],
    hoursHint: "Ashen papers · first warrant · Lira's name on a ledger",
  },
  {
    chapter: 2,
    slug: "dust-and-debt",
    title: "Dust and Debt",
    tagline: "Warrants pay in silver and scars while Quill teaches steel that answers to no collar.",
    estimatedHours: 4,
    levelMin: 6,
    levelMax: 14,
    fidelity: "thorough",
    enemyThemes: ["warrant-runners", "hill-goblins", "dust-wargs", "bounty-thieves"],
    hoursHint: "Bounty work · freeman mark · rumor of Candlemire cages",
  },
  {
    chapter: 3,
    slug: "wanted-mark",
    title: "The Wanted Mark",
    tagline: "A carved brand leads east; friends and hunters argue over who owns the man who escaped.",
    estimatedHours: 3,
    levelMin: 12,
    levelMax: 20,
    fidelity: "stub",
    enemyThemes: ["mark-hunters", "spy-ravens", "orc-outriders", "paid-knights"],
    hoursHint: "Trail of ink · false allies · first map of Candlemire",
  },
  {
    chapter: 4,
    slug: "river-of-brands",
    title: "River of Brands",
    tagline: "Barges haul branded cargo across a mud-brown river the freeholds pretend not to see.",
    estimatedHours: 3,
    levelMin: 18,
    levelMax: 28,
    fidelity: "stub",
    enemyThemes: ["river-slavers", "barge-trolls", "muck-spiders", "toll-orcs"],
    hoursHint: "Crossing · bribes · a drowned ledger page",
  },
  {
    chapter: 5,
    slug: "candlemire-gates",
    title: "Candlemire Gates",
    tagline: "Lord Cade's border keeps smile for coin and iron for mercy; Lira is somewhere past the smoke.",
    estimatedHours: 3.5,
    levelMin: 24,
    levelMax: 36,
    fidelity: "stub",
    enemyThemes: ["gate-guards", "mire-orcs", "war-mastiffs", "wicker-sentries"],
    hoursHint: "False papers · Quill's wager · ash over the cane fields",
  },
  {
    chapter: 6,
    slug: "house-of-collars",
    title: "House of Collars",
    tagline: "Guest rooms overlook yards of rings and numbers; friendship here is whispered at risk of skin.",
    estimatedHours: 3.5,
    levelMin: 32,
    levelMax: 44,
    fidelity: "stub",
    enemyThemes: ["overseer-orcs", "house-blades", "punishment-hounds", "collared-champions"],
    hoursHint: "Dinner with Cade · thrall whispers · Lira's window",
  },
  {
    chapter: 7,
    slug: "blood-mandolin",
    title: "Blood Mandolin",
    tagline: "Candlemire's sport pits fighters under lanterns while a mandolin keeps time with screams.",
    estimatedHours: 3,
    levelMin: 40,
    levelMax: 52,
    fidelity: "stub",
    enemyThemes: ["pit-champions", "arena-trolls", "spectating-knights", "cade-favorites"],
    hoursHint: "Forced duel · Quill's mask slips · the revolt spark",
  },
  {
    chapter: 8,
    slug: "liberation-march",
    title: "Liberation March",
    tagline: "Cages open. Brands break. The field that grew cane learns a different crop: uprising.",
    estimatedHours: 3.5,
    levelMin: 48,
    levelMax: 60,
    fidelity: "stub",
    enemyThemes: ["cade-host", "elite-orcs", "burning-tower-guards", "warg-cavalry"],
    hoursHint: "Barracks burn · Lira freed or lost · Cade at the stair",
  },
  {
    chapter: 9,
    slug: "free-horizon",
    title: "Free Horizon",
    tagline: "Roads west remember every foot that left a collar behind — and ask what freedom costs next.",
    estimatedHours: 2.5,
    levelMin: 55,
    levelMax: 70,
    fidelity: "stub",
    enemyThemes: ["remnant-hunters", "storm-wargs", "last-enforcers", "memory-shades"],
    hoursHint: "Endings: merciful road · hard justice · shared dawn",
  },
];

const ENDINGS = [
  {
    id: "ending-merciful-road",
    title: "The Merciful Road",
    blurb: "Ash and Lyra leave Cade's fall to other hunters and walk west under open sky.",
  },
  {
    id: "ending-hard-justice",
    title: "Hard Justice",
    blurb: "Candlemire burns by Ash's hand; the Wilderland remembers the fire longer than the names.",
  },
  {
    id: "ending-shared-dawn",
    title: "Shared Dawn",
    blurb: "Quill, Ash, and the freed march forge a freehold that keeps no brands and no guests with chains.",
  },
];

/** Thorough Chapter 1 landmark bodies (2–3 sentences each). Expanding filler stitches around these. */
const CH1_LANDMARKS = [
  {
    kind: "narrative",
    title: "Cage Line",
    body: "Mist sits on the Chain-Road like damp wool. Iron cages rattle on ox-wains while overseers count numbers instead of names. You are Nine-Mark — thrall, fighter, and cargo.",
    art: "chain-cages",
    flagsAdd: ["ch1-started"],
  },
  {
    kind: "narrative",
    title: "The Binder Arrives",
    body: "A lean man in travel-stained grey tips his hat to the overseer as if haggling over mule feed. Halbrecht Quill — warrant binder, chain-buyer, and something like a scholar of ugly laws. He pays coin for your papers without looking away from your eyes.",
    art: "quill-hat",
  },
  {
    kind: "choice",
    title: "Paper Freedom",
    body: "Quill slides a stamped sheet across the wagon board. Freedom on parchment, conditional on service: hunt the guilty Quill names, keep your steel sharp, and ask no soft questions. He waits for your word.",
    art: "warrant-paper",
    choices: [
      {
        id: "ch1-accept",
        label: "Take the warrant path",
        approach: "Accept conditional freedom; work for Quill.",
        outcome: {
          text: "Quill smiles without warmth. “Good. The road hates empty hands.”",
          xp: 15,
          flagsAdd: ["quill-ally", "papers-accepted"],
        },
      },
      {
        id: "ch1-bargain",
        label: "Bargain for a name first",
        approach: "Ask whose name this work is really for.",
        stat: "charisma",
        dc: 10,
        success: {
          text: "He softens half a degree. “Lyra. Sold east years ago. Candlemire keeps pretty ledgers.”",
          xp: 20,
          flagsAdd: ["quill-ally", "knows-lyra-early", "papers-accepted"],
        },
        fail: {
          text: "Quill’s face closes. “Earn the right to ask.” He still pushes the papers toward you.",
          xp: 10,
          flagsAdd: ["quill-ally", "papers-accepted"],
        },
      },
      {
        id: "ch1-test",
        label: "Test the man's honesty",
        approach: "Watch for a twitch that says he buys thralls for worse work.",
        stat: "wisdom",
        dc: 11,
        success: {
          text: "No twitch — only tired calculation. He is dangerous and, for now, aligned.",
          xp: 18,
          flagsAdd: ["quill-ally", "trust-measured", "papers-accepted"],
        },
        fail: {
          text: "You misread courtesy for cruelty. Quill shrugs and hands you a short sword anyway.",
          xp: 8,
          flagsAdd: ["quill-ally", "papers-accepted", "distrust-quill"],
        },
      },
    ],
  },
  {
    kind: "narrative",
    title: "Collar Off",
    body: "The overseer pries the collar with a hooked key that smells of rust and old sweat. Skin burns where iron sat for seasons. Quill tosses the ring into roadside mud like trash that once owned a man.",
    art: "collar-off",
    flagsAdd: ["collar-off"],
  },
  {
    kind: "narrative",
    title: "First Mile Free",
    body: "Boots that never chose a direction now choose west, then south, at Quill’s nudge. Crows watch the cages dwindle. Freedom feels like hunger with better manners.",
    art: "road-west",
  },
  {
    kind: "encounter",
    title: "Orc Chainers",
    body: "Three chain-orcs peel from the pine edge, still smelling of the cages they sold this morning. They want their property returned. Quill calmly loads a crossbow and says, “Show them the paperwork is yours.”",
    enemy: "Chain-Orc Reclaimer",
    theme: "chain-orcs",
    art: "orc-chainer",
  },
  {
    kind: "narrative",
    title: "Quill's Lesson",
    body: "“Steel answers collar-law better than ink,” Quill says, wiping ichor from the bolt. He drills stance, breath, and the difference between killing for a warrant and killing for rage. You practice until dusk makes the road one color.",
    art: "quill-drill",
  },
  {
    kind: "choice",
    title: "Campfire Question",
    body: "Night fire snaps. Quill boils bitter tea and asks what you will do if Lyra is already broken past rescue. The question sits between you like a third traveler.",
    art: "campfire",
    choices: [
      {
        id: "ch1-hope",
        label: "I bring her home anyway",
        approach: "Refuse the premise that anyone is past saving.",
        outcome: {
          text: "Quill nods once. “Then we plan for stubborn miracles.”",
          xp: 12,
          flagsAdd: ["path-hope"],
        },
      },
      {
        id: "ch1-revenge",
        label: "Then Candlemire pays in blood",
        approach: "If she is gone, Cade Mire still owns the debt.",
        outcome: {
          text: "Quill’s eyes glitter. “Justice with teeth. I can work with that.”",
          xp: 12,
          flagsAdd: ["path-revenge"],
        },
      },
      {
        id: "ch1-quiet",
        label: "I will decide when I see her",
        approach: "Keep counsel until the yard is real.",
        outcome: {
          text: "“Wise or evasive — same coin until spent,” Quill murmurs.",
          xp: 12,
          flagsAdd: ["path-wait"],
        },
      },
    ],
  },
  {
    kind: "narrative",
    title: "Warrant One",
    body: "A farmstead burned for unpaid tribute; the killer rides with a brand that matches Cade’s outer seals. Quill’s warrant names him Vern of Lowhedge. Catch him alive if possible — dead if the world insists.",
    art: "warrant-vern",
    flagsAdd: ["warrant-vern"],
  },
  {
    kind: "narrative",
    title: "Lowhedge Ruins",
    body: "Ash roofs and a child’s doll face-down in soot. Tracks lead into scrub where wargs like soft meat. Somewhere ahead, Vern laughs at a joke only hunters hear.",
    art: "lowhedge",
  },
  {
    kind: "encounter",
    title: "Dust Wargs",
    body: "Two dust-wargs burst from thorn. Their eyes reflect fire they did not start. Quill covers the left; yours is the right throat if you still remember cages.",
    enemy: "Dust-Warg Pair",
    theme: "road-wargs",
    art: "dust-warg",
  },
  {
    kind: "choice",
    title: "Vern Cornered",
    body: "Vern sits against a tree with a leg broken by his own horse. He begs for Cade’s protection and offers a torn ledger page with women’s names. Lyra’s sits three lines down, sold as “song-thrall, unbroken.”",
    art: "vern-caught",
    choices: [
      {
        id: "ch1-spare",
        label: "Bind him for trial",
        approach: "Alive for Quill’s warrant and a clean conscience.",
        outcome: {
          text: "Vern weeps gratitude he does not deserve. The ledger page is yours.",
          xp: 25,
          gold: 10,
          flagsAdd: ["vern-alive", "lyra-ledger"],
        },
      },
      {
        id: "ch1-execute",
        label: "End him for Lowhedge",
        approach: "Justice for ash roofs; take the page either way.",
        outcome: {
          text: "The forest swallows the sound. Quill files the warrant stamped CLOSED.",
          xp: 20,
          gold: 15,
          flagsAdd: ["vern-dead", "lyra-ledger", "hard-hand"],
        },
      },
      {
        id: "ch1-interrogate",
        label: "Press for Candlemire routes",
        approach: "Pain or promise — get the eastern road correct.",
        stat: "strength",
        dc: 12,
        success: {
          text: "Vern sketches fords and bribe posts. “Cade smiles when he sells people,” he spits.",
          xp: 28,
          flagsAdd: ["vern-alive", "lyra-ledger", "candlemire-routes"],
        },
        fail: {
          text: "Vern faints before finishing. You still have the ledger shred and a headache.",
          xp: 14,
          damage: 4,
          flagsAdd: ["vern-alive", "lyra-ledger"],
        },
      },
    ],
  },
  {
    kind: "narrative",
    title: "Name on Paper",
    body: "You say Lyra aloud until the vowels stop shaking. Quill packs Vern’s routes — or what remains of them — and points toward a freeman town that stamps men as unpaid labor instead of numbered iron. Dawn smells like pine and unfinished debts.",
    art: "lyra-name",
    flagsAdd: ["ch1-complete", "knows-lyra"],
  },
];

const CH2_LANDMARKS = [
  {
    kind: "narrative",
    title: "Freemark Bridge",
    body: "Freemark’s bridge exacts a toll in stories, not coins. You tell enough of Chain-Road to pass, and hide enough of Candlemire to sleep. Quill buys ink, ball, and powder like a man preparing a small war.",
    art: "freemark-bridge",
    flagsAdd: ["ch2-started"],
  },
  {
    kind: "narrative",
    title: "Freeman Mark",
    body: "A clerk tattoos a pale freeman glyph on your wrist where the collar once sat. It burns less than iron and more than pride. Children stare; adults do the math of risk.",
    art: "freeman-mark",
    flagsAdd: ["freeman-mark"],
  },
  {
    kind: "choice",
    title: "Which Warrant?",
    body: "Three warrants hang like wet laundry: a goblin raid-chief, a barge cutter on the Brand-River feeder, and a knight who sold villagers under Cade’s quiet seal. Quill lets you choose the first debt to collect.",
    art: "three-warrants",
    choices: [
      {
        id: "ch2-goblin",
        label: "Hunt the goblin chief",
        approach: "Clear hills so freefolk stop paying ‘protection.’",
        outcome: {
          text: "Quill packs snares. “Hills first. Rivers remember.”",
          xp: 15,
          flagsAdd: ["warrant-goblin"],
        },
      },
      {
        id: "ch2-barge",
        label: "Hunt the barge cutter",
        approach: "Follow water toward Candlemire’s quiet supply.",
        outcome: {
          text: "“Rivers teach patience,” Quill says, already smelling mud.",
          xp: 15,
          flagsAdd: ["warrant-barge"],
        },
      },
      {
        id: "ch2-knight",
        label: "Hunt the selling knight",
        approach: "Strike the soft armor of Cade’s respectables.",
        outcome: {
          text: "Quill’s smile thins. “Careful. Knights have friends with seals.”",
          xp: 15,
          flagsAdd: ["warrant-knight"],
        },
      },
    ],
  },
  {
    kind: "narrative",
    title: "Hill Weather",
    body: "Scrub hills rise like knuckles. Goblin banners stitch stolen cloth into threats. Somewhere a horn answers itself, which means ambush practice.",
    art: "goblin-hills",
  },
  {
    kind: "encounter",
    title: "Hill Goblin Spears",
    body: "Spears rain from scrub. Quill curses in two languages and one dead dialect. You learn freeman work is still fighting other people’s math.",
    enemy: "Hill-Goblin Spears",
    theme: "hill-goblins",
    art: "goblin-spear",
  },
  {
    kind: "narrative",
    title: "Chief Grin-Nail",
    body: "Grin-Nail wears Vern’s stolen cape and bargains with jokes that show too many teeth. He knows Candlemire buyers visit on the new moon. Quill wants him alive for the magistrate; you want the moon calendar.",
    art: "grin-nail",
  },
  {
    kind: "choice",
    title: "Deal or Steel",
    body: "Grin-Nail offers quiet passage maps if you break his warrant chain and let him flee north. Quill’s face says law. Your wrist freemark itches like a warning.",
    art: "goblin-deal",
    choices: [
      {
        id: "ch2-law",
        label: "Serve the warrant",
        approach: "Bind Grin-Nail; trust Quill’s freemark law.",
        outcome: {
          text: "Magistrate pay is honest silver. Maps come slower, cleaner.",
          xp: 22,
          gold: 20,
          flagsAdd: ["grin-captured", "lawful-hand"],
        },
      },
      {
        id: "ch2-deal",
        label: "Take the maps; let him run",
        approach: "Trade law for Candlemire intelligence.",
        outcome: {
          text: "Grin-Nail vanishes laughing. Quill files a different sort of debt against you.",
          xp: 18,
          flagsAdd: ["grin-freed", "candlemire-maps", "quill-displeased"],
        },
      },
      {
        id: "ch2-duel",
        label: "Challenge him openly",
        approach: "Single combat for maps and honor both.",
        stat: "dexterity",
        dc: 13,
        success: {
          text: "Grin-Nail yields maps and a cracked tooth. Even Quill almost smiles.",
          xp: 30,
          gold: 12,
          flagsAdd: ["grin-bested", "candlemire-maps"],
        },
        fail: {
          text: "A spear butt finds your ribs. Quill finishes the fight while you gasp.",
          xp: 12,
          damage: 8,
          flagsAdd: ["grin-captured"],
        },
      },
    ],
  },
  {
    kind: "narrative",
    title: "Dust School",
    body: "Quill turns empty paddocks into a school of breath, draw, and refusal. You shoot, cut, and fall until failure becomes a teacher instead of a collar. At night he reads ledgers like scriptures of other people’s sins.",
    art: "dust-school",
  },
  {
    kind: "encounter",
    title: "Bounty Thieves",
    body: "Men who hunt binders for their warrant purses leap the paddock fence. They smell of ale and other people’s funerals. Quill says quietly, “Do not die for practice.”",
    enemy: "Bounty Purse-Cutters",
    theme: "bounty-thieves",
    art: "purse-cutter",
  },
  {
    kind: "narrative",
    title: "Rumors of Candlemire",
    body: "A tavern singer mouths a ballad about cane fields that grow screams. She stops when a man in Cade’s muted check enters. Quill tips her double and you leave by the kitchen, pockets heavier with a scratched floorplan of Candlemire’s guest wing.",
    art: "tavern-rumor",
    flagsAdd: ["guest-wing-map"],
  },
  {
    kind: "choice",
    title: "How Hard Do We Ride?",
    body: "East means brands and gate smiles. Quill can delay for more warrants and levels of coin — or push now while Lyra’s name is still written unbroken. Your call shapes the dust.",
    art: "east-road",
    choices: [
      {
        id: "ch2-push",
        label: "Ride east at dawn",
        approach: "Speed over safety; Lyra first.",
        outcome: {
          text: "Quill packs light. “Then we become the rumor.”",
          xp: 20,
          flagsAdd: ["push-east", "ch2-complete"],
        },
      },
      {
        id: "ch2-prepare",
        label: "One more warrant season",
        approach: "Gather gear, allies, and thicker freeman luck.",
        outcome: {
          text: "Weeks blur into silver and scars. East waits — hungrier, clearer.",
          xp: 28,
          gold: 25,
          flagsAdd: ["warrant-season", "ch2-complete"],
        },
      },
      {
        id: "ch2-split",
        label: "Send Quill ahead alone",
        approach: "Scout Candlemire while you settle Freemark debts.",
        stat: "intelligence",
        dc: 14,
        success: {
          text: "Quill returns with gate schedules and a new limp. “Worth it,” he lies.",
          xp: 26,
          flagsAdd: ["quill-scouted", "ch2-complete", "gate-schedules"],
        },
        fail: {
          text: "Quill is gone too long. You ride after him into worse maps.",
          xp: 14,
          flagsAdd: ["quill-missing", "ch2-complete", "push-east"],
        },
      },
    ],
  },
  {
    kind: "narrative",
    title: "Eastwind",
    body: "Dust lifts like a curtain. Beyond Freemark the Wilderland pretends to be empty and is not. Somewhere past river fog, Candlemire’s chimneys write black letters on the sky — and Lyra’s name is still a reason to keep walking.",
    art: "eastwind",
  },
];

/** Stub chapter beat titles + one-liners expanded into multi-sentence frames. */
const STUB_BEATS = {
  3: [
    ["Ink Trail", "A forger sells marks that open doors and close lives."],
    ["False Friend", "A smiling freeman sells your description twice before noon."],
    ["Spy Ravens", "Cade’s birds count travelers who ask too many ledger questions."],
    ["Map Fragment", "Candlemire’s walls appear in charcoal — incomplete, hungry."],
    ["Wanted Song", "Your freemark becomes a ballad verse in the wrong tavern."],
    ["Quill's Debt", "Someone from Quill’s past wants payment in your skin."],
    ["Mark Hunters", "Professionals arrive with cages built for freemen."],
    ["Eastward Sign", "All roads argue; only one still smells like cane smoke."],
  ],
  4: [
    ["Mud Toll", "Ferrymen charge more if your wrist freemark looks fresh."],
    ["Barge of Rings", "A flatboat floats quiet with iron inventory under canvas."],
    ["Muck Spiders", "Webs bridge reed to reed where screams go muffled."],
    ["Drowned Page", "A ledger scrap surfaces with Lyra’s sale date still legible."],
    ["Toll Orcs", "Spears demand tribute for pretending the river is free."],
    ["Night Crossing", "Fog hides the middle; courage has to invent the far bank."],
    ["Slaver Camp", "Tents circle a fire that cooks meat and bad bargains."],
    ["Far Bank", "Candlemire’s smoke finally has a direction you can walk."],
  ],
  5: [
    ["Gate Smile", "Guards grin for bribes and bare teeth for pity."],
    ["False Papers", "Quill’s ink must outrank Cade’s paranoia by one thin lie."],
    ["Cane Fields", "Workers move like punctuation under the overseers’ grammar."],
    ["Guest Courtesy", "A steward offers wine that tastes like surveillance."],
    ["Yard Glimpse", "Collars flash in sunlight beyond a polite hedge."],
    ["Name Denied", "No servant will say Lyra — until one does, softly."],
    ["Quill's Wager", "He bets charm against Cade’s curiosity and loses nothing yet."],
    ["Inner Fence", "Beyond hospitality, Candlemire stops pretending."],
  ],
  6: [
    ["Dinner Seals", "Lord Cade toasts guests while ledgers wait under dessert."],
    ["Thrall Whisper", "A kitchen hand names rooms where song-thralls sleep locked."],
    ["Window Light", "A silhouette might be Lyra — or hope wearing her outline."],
    ["Overseer Gash", "An orc with a branded chain counts you like inventory returning."],
    ["House Blades", "Courteous duelists practice ending conversations early."],
    ["Collar Yard", "Rings hang on pegs labeled with numbers older than mercy."],
    ["Midnight Pact", "Thralls offer silence for a plan that includes them."],
    ["Quill Unmasked", "Someone at table recognizes the binder’s other name."],
  ],
  7: [
    ["Mandolin Hour", "Music keeps time so the crowd can clap on the bleeding."],
    ["Pit Call", "Your freemark is an insult Cade wants paid in public."],
    ["Champion Ring", "A collared fighter studies you like a door he might open."],
    ["Forced Steel", "Win ugly, lose worse — the yard watches for either miracle."],
    ["Quill's Tell", "His calm cracks; Cade smells leverage and smiles wider."],
    ["Lantern Drop", "A thrown light becomes the first honest signal of revolt."],
    ["Crowd Turn", "Spectators remember they are people when the music skips."],
    ["Spark Kept", "You leave the pit bloody and carrying tomorrow’s riot."],
  ],
  8: [
    ["Cage Keys", "Keys change hands in darkness thick as cane smoke."],
    ["Barracks Burn", "Orc quarters learn fire faster than orders."],
    ["Lira Found", "Recognition hits like a wound that heals wrong and right."],
    ["Warg Cavalry", "Cade’s riders try to stitch the uprising shut with teeth."],
    ["Tower Stair", "Lord Cade waits where ledgers cannot save him."],
    ["Choice of Fire", "Burn the house that branded the region — or leave it to trials."],
    ["March West", "Freed feet invent a road Cade’s maps never allowed."],
    ["Smoke Clearing", "Candlemire’s sky tries on a color without orders."],
  ],
  9: [
    ["Remnant Hunters", "Coins still buy chases even after a house falls."],
    ["Storm Wargs", "Weather takes sides with whoever still smells of iron."],
    ["Counsel of Dust", "Quill asks what kind of freehold you will refuse to become."],
    ["Lyra's Quiet", "She speaks of mornings that do not require permission."],
    ["Hard Road", "Justice unfinished walks beside you like a second shadow."],
    ["Horizon Vote", "Mercy, fire, or a shared dawn — the Wilderland waits for a mark."],
    ["Last Enforcement", "Cade’s final loyalists demand an ending in steel."],
    ["Free Horizon", "The frame opens onto sky; endings choose their weather."],
  ],
};

const CONNECTIVE_OPENERS = [
  "Dust lifts off the track in pale sheets.",
  "Wind carries iron smell farther than voices.",
  "Bootleather remembers every mile better than maps do.",
  "Crows argue over something dead you hope is not destiny.",
  "Quill hums a tune that never finishes the same way twice.",
  "Clouds drag shadows across cane-colored grass.",
  "A creek argues with stones like a tired magistrate.",
  "Night insects keep score of every secret step.",
];

const CONNECTIVE_MIDDLES = [
  "You check the freemark and find it still yours.",
  "Somewhere a horn asks a question steel usually answers.",
  "Rations taste like postponement and pepper.",
  "Tracks braid, unbraid, and lie with professional cheer.",
  "Ash keeps counsel; Quill keeps a ledger of silences.",
  "The road offers three bad choices and one worse delay.",
  "Memory of cages arrives uninvited, then leaves when named.",
  "Hope and suspicion share the same waterskin.",
];

const CONNECTIVE_CLOSERS = [
  "The next mile does not apologize.",
  "You walk on because stopping is how numbers return.",
  "Quill nods toward the darker horizon without ceremony.",
  "Somewhere east, a ledger page waits to be rewritten.",
  "Steel rests light; resolve does not.",
  "The Wilderland watches and declines to explain itself.",
  "Another frame turns like a dusty page.",
  "Continue is the only honest verb left.",
];

function connectiveBody(seed) {
  const a = CONNECTIVE_OPENERS[seed % CONNECTIVE_OPENERS.length];
  const b = CONNECTIVE_MIDDLES[(seed * 3) % CONNECTIVE_MIDDLES.length];
  const c = CONNECTIVE_CLOSERS[(seed * 7) % CONNECTIVE_CLOSERS.length];
  return `${a} ${b} ${c}`;
}

function stubBody(titleLine, seed, chapterMeta) {
  const opener = CONNECTIVE_OPENERS[seed % CONNECTIVE_OPENERS.length];
  return `${opener} ${titleLine} In the arc of ${chapterMeta.title}, ${chapterMeta.hoursHint.toLowerCase()} — then the road insists on another dusty page.`;
}

function enemyForTheme(theme, level) {
  const hp = Math.min(420, 28 + level * 3);
  const power = Math.min(48, 6 + Math.floor(level * 0.45));
  return { enemyHp: hp, enemyPower: power, enemyTheme: theme };
}

function makeEncounterChoice(nextId, enemyName, chapter, level) {
  const dc = Math.min(22, 9 + Math.floor(level / 5));
  return [
    {
      id: `fight-${chapter}-${nextId}`,
      label: "Stand and fight",
      approach: "Use hotbar steel; clocks stay off — take your time.",
      outcome: {
        text: `${enemyName} falls. The road tastes like iron and relief.`,
        xp: 18 + chapter * 4,
        gold: 5 + chapter * 2,
        nextNodeId: nextId,
        flagsAdd: [`fought-${chapter}`],
      },
    },
    {
      id: `outwit-${chapter}-${nextId}`,
      label: "Outwit the terrain",
      approach: "Use cover, noise, and Quill’s nasty little tricks.",
      stat: "wisdom",
      dc,
      success: {
        text: "The ambush becomes your board. They break first.",
        xp: 22 + chapter * 3,
        nextNodeId: nextId,
      },
      fail: {
        text: "Clever turns loud. You bleed for the lesson and win anyway.",
        xp: 12 + chapter * 2,
        damage: Math.min(28, 3 + chapter * 2),
        nextNodeId: nextId,
      },
    },
    {
      id: `flee-${chapter}-${nextId}`,
      label: "Break past and run",
      approach: "Freedom first; honor later.",
      outcome: {
        text: "Dust and speed. Quill calls it strategic cowardice — fondly.",
        xp: 8 + chapter,
        nextNodeId: nextId,
        flagsAdd: [`fled-${chapter}`],
      },
    },
  ];
}

function expandLandmarkToFrame(lm, id, nextId, chapter, level) {
  const scene = sceneId(CHAPTERS[chapter - 1].slug);
  const art = artId(lm.art || CHAPTERS[chapter - 1].slug);
  const base = {
    id,
    kind: lm.kind,
    title: lm.title,
    body: lm.body,
    sceneId: scene,
    artId: art,
    chapter,
    ...(lm.flagsAdd ? { flagsAdd: lm.flagsAdd } : {}),
  };

  if (lm.kind === "narrative") {
    return { ...base, next: nextId };
  }

  if (lm.kind === "choice") {
    const choices = (lm.choices || []).map((c) => {
      const wire = (out) => (out ? { ...out, nextNodeId: out.nextNodeId ?? nextId } : out);
      return {
        ...c,
        outcome: wire(c.outcome),
        success: wire(c.success),
        fail: wire(c.fail),
      };
    });
    return { ...base, choices };
  }

  if (lm.kind === "encounter") {
    const theme = lm.theme || CHAPTERS[chapter - 1].enemyThemes[0];
    const stats = enemyForTheme(theme, level);
    return {
      ...base,
      enemy: lm.enemy,
      enemyArtId: art,
      ...stats,
      choices: makeEncounterChoice(nextId, lm.enemy, chapter, level),
    };
  }

  return { ...base, next: nextId };
}

/**
 * Target frame counts: thorough chapters denser; stubs still playable connective tissue.
 * ~600 frames ≈ Oregon-Trail pacing for ~30h with battles every 10–20 frames.
 */
const TARGET_FRAMES = {
  1: 90,
  2: 90,
  3: 60,
  4: 60,
  5: 65,
  6: 65,
  7: 60,
  8: 65,
  9: 55,
};

function buildThoroughChapter(meta, landmarks) {
  const target = TARGET_FRAMES[meta.chapter];
  const level = Math.ceil((meta.levelMin + meta.levelMax) / 2);
  const nodes = [];
  const landmarkCount = landmarks.length;
  const slotsBetween = Math.max(1, Math.floor((target - landmarkCount) / Math.max(1, landmarkCount - 1)));

  /** @type {{type:"landmark"|"connective"|"encounter", lm?:any, seed?:number}[]} */
  const plan = [];
  let seed = meta.chapter * 1000;
  for (let i = 0; i < landmarks.length; i++) {
    plan.push({ type: "landmark", lm: landmarks[i] });
    if (i < landmarks.length - 1) {
      for (let j = 0; j < slotsBetween; j++) {
        seed++;
        // Sprinkle scripted encounter markers roughly every 12–16 connective frames.
        if (j > 0 && j % 14 === 0) {
          plan.push({ type: "encounter", seed });
        } else {
          plan.push({ type: "connective", seed });
        }
      }
    }
  }
  while (plan.length < target) {
    seed++;
    plan.push({ type: "connective", seed });
  }
  if (plan.length > target) plan.length = target;

  for (let i = 0; i < plan.length; i++) {
    const id = frameId(meta.chapter, i + 1);
    const nextId = i < plan.length - 1 ? frameId(meta.chapter, i + 2) : null;
    const step = plan[i];

    if (step.type === "landmark") {
      const frame = expandLandmarkToFrame(step.lm, id, nextId ?? id, meta.chapter, level);
      if (!nextId && frame.next) delete frame.next;
      nodes.push(frame);
      continue;
    }

    if (step.type === "encounter") {
      const theme = meta.enemyThemes[step.seed % meta.enemyThemes.length];
      const enemyName = theme
        .split("-")
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ");
      const stats = enemyForTheme(theme, level);
      nodes.push({
        id,
        kind: "encounter",
        title: `${enemyName} Ambush`,
        body: `${connectiveBody(step.seed)} Then ${enemyName.toLowerCase()} force the issue — a roadside lesson Quill refuses to skip.`,
        sceneId: sceneId(meta.slug),
        artId: artId(theme),
        chapter: meta.chapter,
        enemy: enemyName,
        enemyArtId: artId(theme),
        ...stats,
        choices: makeEncounterChoice(nextId, enemyName, meta.chapter, level),
      });
      continue;
    }

    // connective narrative
    const beatTitle = [
      "Dust Mile",
      "Quiet Counsel",
      "Road Hygiene",
      "Old Hunger",
      "Freemark Thoughts",
      "Ledger Weather",
      "Steel Practice",
      "Night Watch",
    ][step.seed % 8];
    nodes.push({
      id,
      kind: "narrative",
      title: `${meta.title}: ${beatTitle}`,
      body: connectiveBody(step.seed),
      sceneId: sceneId(meta.slug),
      artId: artId(meta.slug),
      chapter: meta.chapter,
      next: nextId,
    });
  }

  return nodes;
}

function buildStubChapter(meta) {
  const target = TARGET_FRAMES[meta.chapter];
  const beats = STUB_BEATS[meta.chapter];
  const level = Math.ceil((meta.levelMin + meta.levelMax) / 2);
  const nodes = [];
  let seed = meta.chapter * 5000;

  /** Distribute beat landmarks evenly; fill rest with connective + sparse encounters + sparse choices. */
  const beatIndexes = beats.map((_, i) => Math.floor((i * (target - 1)) / Math.max(1, beats.length - 1)));

  for (let i = 0; i < target; i++) {
    const id = frameId(meta.chapter, i + 1);
    const nextId = i < target - 1 ? frameId(meta.chapter, i + 2) : null;
    const beatAt = beatIndexes.indexOf(i);
    seed++;

    // Finale endings on last frames of ch9
    if (meta.chapter === 9 && i === target - 1) {
      nodes.push({
        id,
        kind: "choice",
        title: "Horizon Vote",
        body: "Candlemire’s smoke thins behind you. Quill waits without advising. Lyra’s quiet is not emptiness — it is a question about what kind of free you will be.",
        sceneId: sceneId(meta.slug),
        artId: artId("horizon"),
        chapter: 9,
        flagsAdd: ["ch9-finale"],
        choices: [
          {
            id: "end-mercy",
            label: "Take the merciful road",
            approach: "Leave leftover justice to other hunters; walk west.",
            outcome: {
              text: "The Wilderland softens half a degree. Not forgiveness — room.",
              nextNodeId: "dt-ending-merciful",
              flagsAdd: ["chose-mercy"],
            },
          },
          {
            id: "end-justice",
            label: "Finish hard justice",
            approach: "Burn what remains of Cade’s legal skin.",
            outcome: {
              text: "Fire writes the last ledger. Names stop being inventory.",
              nextNodeId: "dt-ending-justice",
              flagsAdd: ["chose-justice"],
            },
          },
          {
            id: "end-shared",
            label: "Found a shared dawn",
            approach: "Stay and build a freemark hold that keeps no collars.",
            outcome: {
              text: "Hammers replace brands. Quill files a warrant against slavery itself.",
              nextNodeId: "dt-ending-shared",
              flagsAdd: ["chose-shared"],
            },
          },
        ],
      });
      continue;
    }

    // Scripted encounters every ~15 frames
    if (i > 0 && i % 15 === 0 && nextId) {
      const theme = meta.enemyThemes[i % meta.enemyThemes.length];
      const enemyName = theme
        .split("-")
        .map((w) => w[0].toUpperCase() + w.slice(1))
        .join(" ");
      const stats = enemyForTheme(theme, level);
      nodes.push({
        id,
        kind: "encounter",
        title: `${meta.title}: ${enemyName}`,
        body: stubBody(`Hostile ${enemyName.toLowerCase()} bar the dusty page.`, seed, meta),
        sceneId: sceneId(meta.slug),
        artId: artId(theme),
        chapter: meta.chapter,
        enemy: enemyName,
        enemyArtId: artId(theme),
        ...stats,
        choices: makeEncounterChoice(nextId, enemyName, meta.chapter, level),
      });
      continue;
    }

    // Sparse choice beats (~every 20 frames, when not a landmark)
    if (i > 8 && i % 20 === 0 && beatAt < 0 && nextId) {
      nodes.push({
        id,
        kind: "choice",
        title: `${meta.title}: Fork`,
        body: stubBody("Two honest dangers and one cowardly delay present themselves.", seed, meta),
        sceneId: sceneId(meta.slug),
        artId: artId(meta.slug),
        chapter: meta.chapter,
        choices: [
          {
            id: `stub-${meta.chapter}-bold-${i}`,
            label: "Push bold",
            approach: "Favor speed and steel.",
            outcome: {
              text: "The bold road spends luck early and sometimes wisely.",
              xp: 10 + meta.chapter,
              nextNodeId: nextId,
              flagsAdd: [`ch${meta.chapter}-bold`],
            },
          },
          {
            id: `stub-${meta.chapter}-careful-${i}`,
            label: "Go careful",
            approach: "Scout, bribe, or circle.",
            stat: "wisdom",
            dc: Math.min(20, 10 + Math.floor(meta.chapter / 2)),
            success: {
              text: "Care pays in fewer scars and better rumors.",
              xp: 14 + meta.chapter,
              nextNodeId: nextId,
              flagsAdd: [`ch${meta.chapter}-careful`],
            },
            fail: {
              text: "Care turns into delay; delay invites teeth.",
              xp: 6 + meta.chapter,
              damage: 3 + meta.chapter,
              nextNodeId: nextId,
            },
          },
          {
            id: `stub-${meta.chapter}-quill-${i}`,
            label: "Trust Quill's plan",
            approach: "Let the binder spend his remaining charms.",
            outcome: {
              text: "Quill’s plan is ugly, legal-adjacent, and effective.",
              xp: 12 + meta.chapter,
              nextNodeId: nextId,
              flagsAdd: [`ch${meta.chapter}-quill-lead`],
            },
          },
        ],
      });
      continue;
    }

    if (beatAt >= 0) {
      const [title, line] = beats[beatAt];
      nodes.push({
        id,
        kind: "narrative",
        title: `${meta.title}: ${title}`,
        body: stubBody(line, seed, meta),
        sceneId: sceneId(meta.slug),
        artId: artId(meta.slug),
        chapter: meta.chapter,
        next: nextId,
        ...(i === 0 ? { flagsAdd: [`ch${meta.chapter}-started`] } : {}),
        ...(i === target - 2 && meta.chapter < 9
          ? { flagsAdd: [`ch${meta.chapter}-complete`] }
          : {}),
      });
      continue;
    }

    nodes.push({
      id,
      kind: "narrative",
      title: `${meta.title}: Road`,
      body: connectiveBody(seed + meta.chapter),
      sceneId: sceneId(meta.slug),
      artId: artId(meta.slug),
      chapter: meta.chapter,
      next: nextId,
    });
  }

  return nodes;
}

function wireChapterHandoffs(allNodes, chapterDefs) {
  for (let c = 0; c < chapterDefs.length - 1; c++) {
    const chapter = chapterDefs[c];
    const next = chapterDefs[c + 1];
    const lastId = chapter.nodeIds[chapter.nodeIds.length - 1];
    const last = allNodes.find((n) => n.id === lastId);
    if (!last) continue;
    if (last.kind === "narrative") {
      last.next = next.startNodeId;
      last.flagsAdd = Array.from(new Set([...(last.flagsAdd || []), `ch${chapter.chapter}-complete`]));
    } else if (last.kind === "choice" || last.kind === "encounter") {
      for (const choice of last.choices || []) {
        for (const key of ["outcome", "success", "fail"]) {
          if (choice[key] && !choice[key].nextNodeId) {
            choice[key].nextNodeId = next.startNodeId;
          }
          if (choice[key]?.nextNodeId?.startsWith(`dt-ch${pad(chapter.chapter)}`)) {
            // leave intra-chapter
          } else if (choice[key] && choice[key].nextNodeId === lastId) {
            choice[key].nextNodeId = next.startNodeId;
          }
        }
        // If outcomes point to missing next within same chapter end, retarget
        for (const key of ["outcome", "success", "fail"]) {
          if (choice[key] && choice[key].nextNodeId === lastId) {
            choice[key].nextNodeId = next.startNodeId;
          }
        }
      }
      // Force terminal chapter choice/encounter to hand off if still self-linked
      for (const choice of last.choices || []) {
        for (const key of ["outcome", "success", "fail"]) {
          if (!choice[key]) continue;
          if (!choice[key].nextNodeId || choice[key].nextNodeId === lastId) {
            choice[key].nextNodeId = next.startNodeId;
          }
        }
      }
    }
  }
}

function addEndingNodes(nodes) {
  nodes.push(
    {
      id: "dt-ending-merciful",
      kind: "ending",
      title: ENDINGS[0].title,
      body: "West opens without a brand on any skyline. Lyra walks beside you; Quill tips his hat and files no warrant for kindness. The Wilderland keeps room for people who leave cages empty.",
      sceneId: sceneId("free-horizon"),
      artId: artId("ending-mercy"),
      endingId: "ending-merciful-road",
      chapter: 9,
      flagsAdd: ["game-complete", "ending-merciful"],
    },
    {
      id: "dt-ending-justice",
      kind: "ending",
      title: ENDINGS[1].title,
      body: "Candlemire’s last seals blacken. Hard justice is a fire that warms freed hands and frightens soft thieves. You do not apologize for the smoke.",
      sceneId: sceneId("free-horizon"),
      artId: artId("ending-justice"),
      endingId: "ending-hard-justice",
      chapter: 9,
      flagsAdd: ["game-complete", "ending-justice"],
    },
    {
      id: "dt-ending-shared",
      kind: "ending",
      title: ENDINGS[2].title,
      body: "A freemark hold rises where cane once hid screams. Shared dawn means watches, kitchens, and laws that refuse inventory of people. Quill stays to teach binders a better trade.",
      sceneId: sceneId("free-horizon"),
      artId: artId("ending-shared"),
      endingId: "ending-shared-dawn",
      chapter: 9,
      flagsAdd: ["game-complete", "ending-shared"],
    },
  );
}

function validate(nodes, chapters) {
  const ids = new Set(nodes.map((n) => n.id));
  if (ids.size !== nodes.length) throw new Error("Duplicate frame IDs");

  for (const n of nodes) {
    if (!["narrative", "choice", "encounter", "ending"].includes(n.kind)) {
      throw new Error(`Bad kind ${n.kind} on ${n.id}`);
    }
    const sentences = n.body.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length < 2 || sentences.length > 4) {
      // soft warn only for stubs that might run long — tighten longest
      if (sentences.length > 5) {
        throw new Error(`Body too long on ${n.id}: ${sentences.length} sentences`);
      }
    }
    if (n.kind === "narrative" && n.next && !ids.has(n.next)) {
      throw new Error(`Broken next ${n.id} -> ${n.next}`);
    }
    if ((n.kind === "choice" || n.kind === "encounter") && (!n.choices || !n.choices.length)) {
      throw new Error(`Missing choices on ${n.id}`);
    }
    for (const c of n.choices || []) {
      for (const key of ["outcome", "success", "fail"]) {
        const next = c[key]?.nextNodeId;
        if (next && !ids.has(next)) throw new Error(`Broken choice next ${n.id}.${c.id} -> ${next}`);
      }
    }
  }

  const hours = chapters.reduce((s, c) => s + c.estimatedHours, 0);
  if (hours < 28 || hours > 32) throw new Error(`Hours out of range: ${hours}`);

  return hours;
}

// ─── Build ───────────────────────────────────────────────────────────
const allNodes = [];
const chapterDefs = [];

for (const meta of CHAPTERS) {
  const nodes =
    meta.fidelity === "thorough"
      ? buildThoroughChapter(meta, meta.chapter === 1 ? CH1_LANDMARKS : CH2_LANDMARKS)
      : buildStubChapter(meta);

  const nodeIds = nodes.map((n) => n.id);
  chapterDefs.push({
    id: `dt-ch-${pad(meta.chapter)}-${meta.slug}`,
    chapter: meta.chapter,
    title: meta.title,
    tagline: meta.tagline,
    startNodeId: nodeIds[0],
    nodeIds,
    levelMin: meta.levelMin,
    levelMax: meta.levelMax,
    estimatedHours: meta.estimatedHours,
    enemyThemes: meta.enemyThemes,
    sceneId: sceneId(meta.slug),
    splashArtId: `splash-dt-${meta.slug}`,
    fidelity: meta.fidelity,
  });
  allNodes.push(...nodes);
}

// Link last narrative of each thorough/stub chapter to next chapter start
for (let i = 0; i < chapterDefs.length - 1; i++) {
  const ch = chapterDefs[i];
  const nextStart = chapterDefs[i + 1].startNodeId;
  const lastId = ch.nodeIds[ch.nodeIds.length - 1];
  const last = allNodes.find((n) => n.id === lastId);
  if (!last) continue;
  if (last.kind === "narrative") {
    last.next = nextStart;
  } else if (last.choices) {
    for (const choice of last.choices) {
      for (const key of ["outcome", "success", "fail"]) {
        if (choice[key]) choice[key].nextNodeId = nextStart;
      }
    }
  }
}

wireChapterHandoffs(allNodes, chapterDefs);
addEndingNodes(allNodes);

const hours = validate(allNodes, chapterDefs);

const kindCounts = allNodes.reduce((acc, n) => {
  acc[n.kind] = (acc[n.kind] || 0) + 1;
  return acc;
}, {});

const perChapter = chapterDefs.map((c) => ({
  chapter: c.chapter,
  title: c.title,
  frames: c.nodeIds.length,
  hours: c.estimatedHours,
  fidelity: c.fidelity,
  enemyThemes: c.enemyThemes,
}));

const stats = {
  chapters: chapterDefs.length,
  nodes: allNodes.length,
  endings: 3,
  totalEstimatedHours: hours,
  nodeKinds: kindCounts,
  perChapter,
  encounterCadence: ENCOUNTER_CADENCE,
  thoroughChapters: [1, 2],
  stubChapters: [3, 4, 5, 6, 7, 8, 9],
};

const pack = {
  version: 1,
  title: "DungeonTester: Wilderland Liberation",
  blurb:
    "Oregon Trail–style comic frames. An original thrall-to-liberator arc through the Wilderland — warrants, orcs, and Candlemire’s collar yards. Inspired by Django’s beat structure; no film or LOTR trademark names.",
  targetHours: TARGET_HOURS,
  startNodeId: chapterDefs[0].startNodeId,
  encounterCadence: ENCOUNTER_CADENCE,
  chapters: chapterDefs,
  nodes: allNodes,
  endings: ENDINGS,
  stats,
  generatedAt: new Date().toISOString(),
};

/** Adapt spine → shell DtFrame shape (also written so loaders can skip TS adapt). */
const THEME_TO_FOE = {
  "chain-orcs": "thorn-clan-skirmisher",
  "road-wargs": "dust-trail-warg",
  "cage-tenders": "coffle-guard",
  "brand-hounds": "night-howler",
  "warrant-runners": "whip-hand-thug",
  "hill-goblins": "ash-gut-raider",
  "dust-wargs": "dust-trail-warg",
  "bounty-thieves": "bond-chain-enforcer",
  "mark-hunters": "ash-cloak-outrider",
  "spy-ravens": "pale-host-scout",
  "orc-outriders": "orc-rider",
  "paid-knights": "iron-cuff-overseer",
  "river-slavers": "coffle-guard",
  "barge-trolls": "bridge-brute",
  "muck-spiders": "trail-webling",
  "toll-orcs": "thorn-clan-skirmisher",
  "gate-guards": "citadel-gate-brute",
  "mire-orcs": "warcamp-berserker",
  "war-mastiffs": "night-howler",
  "wicker-sentries": "ash-cloak-outrider",
  "overseer-orcs": "iron-cuff-overseer",
  "house-blades": "bond-chain-enforcer",
  "punishment-hounds": "red-maw-hunter",
  "collared-champions": "warcamp-berserker",
  "pit-champions": "bone-drum-captain",
  "arena-trolls": "cave-knuckle",
  "spectating-knights": "chain-lord-lieutenant",
  "cade-favorites": "boss-thorn-warlord",
  "cade-host": "warcamp-berserker",
  "elite-orcs": "orc-rider",
  "burning-tower-guards": "citadel-gate-brute",
  "warg-cavalry": "shadow-pack-alpha",
  "remnant-hunters": "ash-cloak-outrider",
  "storm-wargs": "shadow-pack-alpha",
  "last-enforcers": "chain-lord-lieutenant",
  "memory-shades": "pale-host-scout",
};

function adaptToDtFrame(node, chapterId) {
  const base = {
    id: node.id,
    chapterId,
    title: node.title,
    body: node.body,
    kind: node.kind,
    sceneId: node.sceneId,
    artId: node.artId,
    flagsAdd: node.flagsAdd,
    endingId: node.endingId,
    enemyTheme: node.enemyTheme,
  };
  if (node.kind === "narrative") return { ...base, next: node.next };
  if (node.kind === "ending") return { ...base, endingId: node.endingId ?? node.id };
  if (node.kind === "encounter") {
    const choiceNext =
      node.choices?.[0]?.outcome?.nextNodeId ??
      node.choices?.[0]?.success?.nextNodeId ??
      node.next;
    return {
      ...base,
      battleFoeId: THEME_TO_FOE[node.enemyTheme] ?? "thorn-clan-skirmisher",
      next: choiceNext,
    };
  }
  return {
    ...base,
    choices: (node.choices ?? []).map((c) => {
      const success = c.success ?? c.outcome;
      const fail = c.fail;
      const next = success?.nextNodeId ?? fail?.nextNodeId ?? node.next;
      const out = {
        id: c.id,
        label: c.label,
        next,
        approach: c.approach,
        flagsAdd: success?.flagsAdd,
      };
      if (c.stat && typeof c.dc === "number") {
        out.stat = c.stat;
        out.dc = c.dc;
        out.nextFail = fail?.nextNodeId ?? next;
        out.failFlagsAdd = fail?.flagsAdd;
        out.failDamage = fail?.damage;
      }
      return out;
    }),
  };
}

const chapterIdByNode = new Map();
for (const ch of chapterDefs) {
  for (const id of ch.nodeIds) chapterIdByNode.set(id, ch.id);
}
for (const endingId of ["dt-ending-merciful", "dt-ending-justice", "dt-ending-shared"]) {
  chapterIdByNode.set(endingId, chapterDefs[8].id);
}

const dtFrames = allNodes.map((n) => adaptToDtFrame(n, chapterIdByNode.get(n.id) ?? chapterDefs[0].id));
const ch1Frames = dtFrames.filter((f) => f.chapterId === chapterDefs[0].id);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, `${JSON.stringify(pack, null, 2)}\n`);
writeFileSync(
  CHAPTERS_OUT,
  `${JSON.stringify(
    {
      version: 1,
      targetHours: TARGET_HOURS,
      encounterCadence: ENCOUNTER_CADENCE,
      chapters: chapterDefs.map(({ nodeIds, ...rest }) => ({
        ...rest,
        frameCount: nodeIds.length,
        startNodeId: rest.startNodeId,
      })),
      endings: ENDINGS,
    },
    null,
    2,
  )}\n`,
);

const FRAMES_OUT = join(OUT_DIR, "story-frames.json");
const CH1_OUT = join(OUT_DIR, "chapter1-frames.json");
writeFileSync(
  FRAMES_OUT,
  `${JSON.stringify(
    {
      version: 1,
      note: "Shell DtFrame adaptation of story-spine.json. Prefer story.ts loader.",
      startNodeId: pack.startNodeId,
      encounterCadence: ENCOUNTER_CADENCE,
      frames: dtFrames,
    },
    null,
    2,
  )}\n`,
);
writeFileSync(
  CH1_OUT,
  `${JSON.stringify(
    {
      chapterId: chapterDefs[0].id,
      title: chapterDefs[0].title,
      note: "Generated from Wilderland liberation Ch1 spine (canonical with story-spine.json).",
      frames: ch1Frames,
    },
    null,
    2,
  )}\n`,
);

console.log(`Wrote ${OUT}`);
console.log(`Wrote ${CHAPTERS_OUT}`);
console.log(`Wrote ${FRAMES_OUT} (${dtFrames.length} frames)`);
console.log(`Wrote ${CH1_OUT} (${ch1Frames.length} frames)`);
console.log(JSON.stringify(stats, null, 2));
