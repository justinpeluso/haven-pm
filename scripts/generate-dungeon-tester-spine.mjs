#!/usr/bin/env node
/**
 * Generate the DungeonTester story spine (~30h / 9 chapters).
 *
 * Original Wilderland liberation arc inspired by Django beat-structure
 * (thrall → binder alliance → hunt for beloved → baronial stronghold → revolt).
 * No film or LOTR trademark character/place names.
 *
 * Chapters 1–9: thorough authored landmarks + chapter-flavored connective tissue.
 * Ending triad remains on Ch9 Horizon Vote → dt-ending-*.
 *
 * Out: data/dungeon-tester/story-spine.json (+ chapters mirror)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHAPTER_CONNECTIVE, THOROUGH_LANDMARKS } from "./dt-landmarks-ch3-9.mjs";
import {
  ROAD_CHOICES,
  SET_PIECES,
  beatTitleFor,
  buildVignetteDeck,
  echoesForBeat,
} from "./dt-story-enrichment.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "data", "dungeon-tester");
const OUT = join(OUT_DIR, "story-spine.json");
const CHAPTERS_OUT = join(OUT_DIR, "chapters.json");

const TARGET_HOURS = 34;
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
    estimatedHours: 4.5,
    levelMin: 1,
    levelMax: 8,
    fidelity: "thorough",
    enemyThemes: ["chain-orcs", "road-wargs", "cage-tenders", "brand-hounds"],
    hoursHint: "Ashen papers · first warrant · Lyra's name on a ledger",
  },
  {
    chapter: 2,
    slug: "dust-and-debt",
    title: "Dust and Debt",
    tagline: "Warrants pay in silver and scars while Quill teaches steel that answers to no collar.",
    estimatedHours: 4.5,
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
    estimatedHours: 3.5,
    levelMin: 12,
    levelMax: 20,
    fidelity: "thorough",
    enemyThemes: ["mark-hunters", "spy-ravens", "orc-outriders", "paid-knights"],
    hoursHint: "Trail of ink · false allies · first map of Candlemire",
  },
  {
    chapter: 4,
    slug: "river-of-brands",
    title: "River of Brands",
    tagline: "Barges haul branded cargo across a mud-brown river the freeholds pretend not to see.",
    estimatedHours: 3.5,
    levelMin: 18,
    levelMax: 28,
    fidelity: "thorough",
    enemyThemes: ["river-slavers", "barge-trolls", "muck-spiders", "toll-orcs"],
    hoursHint: "Crossing · bribes · a drowned ledger page",
  },
  {
    chapter: 5,
    slug: "candlemire-gates",
    title: "Candlemire Gates",
    tagline: "Lord Cade's border keeps smile for coin and iron for mercy; Lyra is somewhere past the smoke.",
    estimatedHours: 4,
    levelMin: 24,
    levelMax: 36,
    fidelity: "thorough",
    enemyThemes: ["gate-guards", "mire-orcs", "war-mastiffs", "wicker-sentries"],
    hoursHint: "False papers · Quill's wager · ash over the cane fields",
  },
  {
    chapter: 6,
    slug: "house-of-collars",
    title: "House of Collars",
    tagline: "Guest rooms overlook yards of rings and numbers; friendship here is whispered at risk of skin.",
    estimatedHours: 4,
    levelMin: 32,
    levelMax: 44,
    fidelity: "thorough",
    enemyThemes: ["overseer-orcs", "house-blades", "punishment-hounds", "collared-champions"],
    hoursHint: "Dinner with Cade · thrall whispers · Lyra's window",
  },
  {
    chapter: 7,
    slug: "blood-mandolin",
    title: "Blood Mandolin",
    tagline: "Candlemire's sport pits fighters under lanterns while a mandolin keeps time with screams.",
    estimatedHours: 3.5,
    levelMin: 40,
    levelMax: 52,
    fidelity: "thorough",
    enemyThemes: ["pit-champions", "arena-trolls", "spectating-knights", "cade-favorites"],
    hoursHint: "Forced duel · Quill's mask slips · the revolt spark",
  },
  {
    chapter: 8,
    slug: "liberation-march",
    title: "Liberation March",
    tagline: "Cages open. Brands break. The field that grew cane learns a different crop: uprising.",
    estimatedHours: 4,
    levelMin: 48,
    levelMax: 60,
    fidelity: "thorough",
    enemyThemes: ["cade-host", "elite-orcs", "burning-tower-guards", "warg-cavalry"],
    hoursHint: "Barracks burn · Lyra freed · Cade at the stair",
  },
  {
    chapter: 9,
    slug: "free-horizon",
    title: "Free Horizon",
    tagline: "Roads west remember every foot that left a collar behind — and ask what freedom costs next.",
    estimatedHours: 3,
    levelMin: 55,
    levelMax: 70,
    fidelity: "thorough",
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
    body: "Mist sits on the Chain-Road like damp wool over a livestock count. Iron cages rattle on ox-wains while overseers tally numbers instead of names — and spit when the count comes up short. You are Nine-Mark: thrall, fighter, and cargo that punches back when the whip gets lazy.",
    art: "chain-cages",
    flagsAdd: ["ch1-started"],
  },
  {
    kind: "narrative",
    title: "The Binder Arrives",
    body: "The lean marshal tips his ruined hat to the overseer like a man haggling over mule feed and mildly disappointing weather. Halbrecht Quill — freehold marshal, warrant binder, one scarred eye that never quite closes on a lie — pays coin for your papers without looking away. “Pretty muscle,” he drawls. “Ugly price. I’ll take the stubborn one.”",
    art: "quill-hat",
  },
  {
    kind: "choice",
    title: "Paper Freedom",
    body: "Quill slides a stamped sheet across the wagon board and uncorks a dented flask. Freedom on parchment, conditional as a hangman’s courtesy: hunt the guilty he names, keep steel sharp, ask no soft questions. “Say yes,” he offers, almost kindly, “or climb back into inventory. I don’t do poetry, and I don’t ride with quitters.”",
    art: "warrant-paper",
    choices: [
      {
        id: "ch1-accept",
        label: "Take the warrant path",
        approach: "Accept conditional freedom; work for Quill.",
        outcome: {
          text: "Quill smiles without warmth. “Good. The road hates empty hands, full sermons, and soft guts.”",
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
          text: "He softens half a degree and takes a pull. “Lyra. Sold east years ago. Candlemire keeps pretty ledgers and uglier guests. You don’t quit easy — fine. Neither does that name.”",
          xp: 20,
          flagsAdd: ["quill-ally", "knows-lyra-early", "papers-accepted"],
        },
        fail: {
          text: "Quill’s scarred eye narrows. “Earn the damn right to ask.” He still pushes the papers toward you.",
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
          text: "No twitch — only tired calculation and a flask that never quite empties. Dangerous, yes. Aligned, for now. He notices you looking and tips his hat at the insult.",
          xp: 18,
          flagsAdd: ["quill-ally", "trust-measured", "papers-accepted"],
        },
        fail: {
          text: "You misread courtesy for cruelty. Quill shrugs. “Everyone does, once.” He hands you a short sword and a look that says don’t quit on the first mile.",
          xp: 8,
          flagsAdd: ["quill-ally", "papers-accepted", "distrust-quill"],
        },
      },
    ],
  },
  {
    kind: "narrative",
    title: "Collar Off",
    body: "The overseer pries the collar with a hooked key that smells of rust, old sweat, and other people’s surrender. Skin burns where iron sat for seasons. Quill tosses the ring into roadside mud like trash that once owned a man — then grinds it under his heel, just to be thorough.",
    art: "collar-off",
    flagsAdd: ["collar-off"],
  },
  {
    kind: "narrative",
    title: "First Mile Free",
    body: "Boots that never chose a direction now choose west, then south, at Quill’s nudge. Crows watch the cages dwindle and look personally offended. Freedom feels like hunger with better manners and a loaded crossbow for a chaperone.",
    art: "road-west",
  },
  {
    kind: "encounter",
    title: "Orc Chainers",
    body: "Three chain-orcs peel from the pine edge, still smelling of the cages they sold this morning. They want their property returned with interest. Quill calmly loads a crossbow and drawls, “Show them the paperwork is yours — and that the warranty expired.”",
    enemy: "Chain-Orc Reclaimer",
    theme: "chain-orcs",
    art: "orc-chainer",
  },
  {
    kind: "narrative",
    title: "Quill's Lesson",
    body: "“Steel answers collar-law better than ink,” Quill says, wiping ichor from the bolt like a clerk correcting a sum that insulted him. He drills stance, breath, and the difference between killing for a warrant and killing for rage — then takes a pull and adds, “Rage is fine. Just don’t let it hold the damn map. And don’t quit mid-swing.”",
    art: "quill-drill",
  },
  {
    kind: "narrative",
    title: "Warrant Grammar",
    body: "Quill makes you read a blank warrant aloud until the clauses stop sounding like mercy — alive-if-possible, dead-if-necessary, property-of-no-man once the seal dries. “Paper is a leash that points both ways,” he drawls. “Hold your end. Don’t let Cade’s clerks invent the other.”",
    art: "warrant-paper",
    flagsAdd: ["warrant-grammar"],
  },
  {
    kind: "narrative",
    title: "Collar-Yard Rumor",
    body: "A peddler swears Candlemire hangs rings by size, not by name — and that song-thralls get loft windows so buyers can hear before they bid. Quill does not drink to that. He drinks past it, scarred eye fixed east, and says only, “Then we learn loft latches.”",
    art: "collar-off",
  },
  {
    kind: "choice",
    title: "Campfire Question",
    body: "Night fire snaps. Quill boils bitter tea that tastes like boiled warrants, spikes it from the flask, and asks what you will do if Lyra is already broken past rescue. The question sits between you like a third traveler with muddy boots and no manners. His scarred eye does not blink.",
    art: "campfire",
    choices: [
      {
        id: "ch1-hope",
        label: "I bring her home anyway",
        approach: "Refuse the premise that anyone is past saving.",
        outcome: {
          text: "Quill nods once. “Stubborn miracles. I hate miracles. I’ll still pack for them — and for you not quitting.”",
          xp: 12,
          flagsAdd: ["path-hope"],
        },
      },
      {
        id: "ch1-revenge",
        label: "Then Candlemire pays in blood",
        approach: "If she is gone, Cade Mire still owns the debt.",
        outcome: {
          text: "Quill’s eyes glitter. “Justice with teeth. I can work with that — carefully, and drunk enough to be honest.”",
          xp: 12,
          flagsAdd: ["path-revenge"],
        },
      },
      {
        id: "ch1-quiet",
        label: "I will decide when I see her",
        approach: "Keep counsel until the yard is real.",
        outcome: {
          text: "“Wise or evasive — same coin until spent,” Quill murmurs. “Don’t spend it drunk. That’s my job.”",
          xp: 12,
          flagsAdd: ["path-wait"],
        },
      },
    ],
  },
  {
    kind: "narrative",
    title: "Warrant One",
    body: "A farmstead burned for unpaid tribute; the killer rides with a brand that matches Cade’s outer seals like a signature on arson. Quill’s warrant names him Vern of Lowhedge. “Alive if possible,” Quill says. “Dead if the world insists on being itself.”",
    art: "warrant-vern",
    flagsAdd: ["warrant-vern"],
  },
  {
    kind: "narrative",
    title: "Lowhedge Ruins",
    body: "Ash roofs. A child’s doll face-down in soot. Tracks lead into scrub where wargs like soft meat and softer excuses. Somewhere ahead, Vern laughs at a joke only hunters and monsters find funny.",
    art: "lowhedge",
  },
  {
    kind: "encounter",
    title: "Dust Wargs",
    body: "Two dust-wargs burst from thorn. Their eyes reflect fire they did not start and do not regret. Quill covers the left; yours is the right throat — if you still remember what cages taught about hesitation.",
    enemy: "Dust-Warg Pair",
    theme: "road-wargs",
    art: "dust-warg",
  },
  {
    kind: "choice",
    title: "Vern Cornered",
    body: "Vern sits against a tree with a leg broken by his own horse — comedy the forest did not request. He begs for Cade’s protection and offers a torn ledger page with women’s names. Lyra’s sits three lines down, sold as “song-thrall, unbroken.” Vern smiles like that should buy him sunrise.",
    art: "vern-caught",
    choices: [
      {
        id: "ch1-spare",
        label: "Bind him for trial",
        approach: "Alive for Quill’s warrant and a clean conscience.",
        outcome: {
          text: "Vern weeps gratitude he does not deserve. Quill stamps ALIVE like it hurts. The ledger page is yours.",
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
          text: "The forest swallows the sound. Quill files the warrant CLOSED and does not congratulate you.",
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
          text: "Vern sketches fords and bribe posts. “Cade smiles when he sells people,” he spits. “You’ll hate how pretty it is.”",
          xp: 28,
          flagsAdd: ["vern-alive", "lyra-ledger", "candlemire-routes"],
        },
        fail: {
          text: "Vern faints before finishing. You still have the ledger shred, a headache, and Quill’s unimpressed silence.",
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
    body: "You say Lyra aloud until the vowels stop shaking and start sounding like a plan. Quill packs Vern’s routes — or what remains of them — and points toward a freeman town that stamps men as unpaid labor instead of numbered iron. Dawn smells like pine, powder, and unfinished debts.",
    art: "lyra-name",
    flagsAdd: ["ch1-complete", "knows-lyra"],
  },
];

const CH2_LANDMARKS = [
  {
    kind: "narrative",
    title: "Freemark Bridge",
    body: "Freemark’s bridge exacts a toll in stories, not coins — and they can smell a lie the way dogs smell fear. You tell enough of Chain-Road to pass, and hide enough of Candlemire to sleep. Quill buys ink, ball, and powder like a man preparing a small, personally motivated war.",
    art: "freemark-bridge",
    flagsAdd: ["ch2-started"],
  },
  {
    kind: "narrative",
    title: "Freeman Mark",
    body: "A clerk tattoos a pale freeman glyph on your wrist where the collar once sat. It burns less than iron and more than pride. Children stare; adults do the math of risk; Quill says, “Wear it out. Don’t let it wear you.”",
    art: "freeman-mark",
    flagsAdd: ["freeman-mark"],
  },
  {
    kind: "choice",
    title: "Which Warrant?",
    body: "Three warrants hang like wet laundry: a goblin raid-chief, a barge cutter on the Brand-River feeder, and a knight who sold villagers under Cade’s quiet seal. Quill lets you choose the first debt to collect. “Pick the one that keeps you sleeping,” he says. “Or the one that doesn’t. Both teach.”",
    art: "three-warrants",
    choices: [
      {
        id: "ch2-goblin",
        label: "Hunt the goblin chief",
        approach: "Clear hills so freefolk stop paying ‘protection.’",
        outcome: {
          text: "Quill packs snares. “Hills first. Rivers remember — and so do I.”",
          xp: 15,
          flagsAdd: ["warrant-goblin"],
        },
      },
      {
        id: "ch2-barge",
        label: "Hunt the barge cutter",
        approach: "Follow water toward Candlemire’s quiet supply.",
        outcome: {
          text: "“Rivers teach patience,” Quill says, already smelling mud and worse math.",
          xp: 15,
          flagsAdd: ["warrant-barge"],
        },
      },
      {
        id: "ch2-knight",
        label: "Hunt the selling knight",
        approach: "Strike the soft armor of Cade’s respectables.",
        outcome: {
          text: "Quill’s smile thins. “Careful. Knights have friends with seals and soft hands.”",
          xp: 15,
          flagsAdd: ["warrant-knight"],
        },
      },
    ],
  },
  {
    kind: "narrative",
    title: "Hill Weather",
    body: "Scrub hills rise like knuckles ready to close. Goblin banners stitch stolen cloth into threats that almost look like nations. Somewhere a horn answers itself, which means ambush practice — or optimism with spears.",
    art: "goblin-hills",
  },
  {
    kind: "encounter",
    title: "Hill Goblin Spears",
    body: "Spears rain from scrub. Quill curses in two languages and one dead dialect that sounds personally offended. You learn freeman work is still fighting other people’s arithmetic — only now the math bleeds.",
    enemy: "Hill-Goblin Spears",
    theme: "hill-goblins",
    art: "goblin-spear",
  },
  {
    kind: "narrative",
    title: "Chief Grin-Nail",
    body: "Grin-Nail wears Vern’s stolen cape and bargains with jokes that show too many teeth for comedy. He knows Candlemire buyers visit on the new moon and says it like a toast. Quill wants him alive for the magistrate; you want the moon calendar and maybe a tooth.",
    art: "grin-nail",
  },
  {
    kind: "choice",
    title: "Deal or Steel",
    body: "Grin-Nail offers quiet passage maps if you break his warrant chain and let him flee north. “Law,” Quill’s face says. Your freemark itches like a warning label. Grin-Nail adds, “Or we can all die principled. Boring.”",
    art: "goblin-deal",
    choices: [
      {
        id: "ch2-law",
        label: "Serve the warrant",
        approach: "Bind Grin-Nail; trust Quill’s freemark law.",
        outcome: {
          text: "Magistrate pay is honest silver. Maps come slower, cleaner, and with fewer punchlines.",
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
          text: "Grin-Nail vanishes laughing. Quill files a different sort of debt against you — quieter, longer.",
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
          text: "Grin-Nail yields maps and a cracked tooth. Even Quill almost smiles. Almost.",
          xp: 30,
          gold: 12,
          flagsAdd: ["grin-bested", "candlemire-maps"],
        },
        fail: {
          text: "A spear butt finds your ribs. Quill finishes the fight while you invent new vocabulary for pain.",
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
    body: "Quill turns empty paddocks into a school of breath, draw, and refusal. You shoot, cut, and fall until failure becomes a teacher instead of a collar. At night he reads ledgers like scriptures of other people’s sins — and underlines yours when you flinch.",
    art: "dust-school",
  },
  {
    kind: "narrative",
    title: "Marshal Mentors Mean",
    body: "Halbrecht Quill corrects your draw the way a hangman corrects a knot — personally, without romance. “Pretty form gets you buried neat,” he says, flask tapping your wrist freemark. “Ugly form gets you home — choose ugly, choose stubborn, and don’t quit when the powder fouls.”",
    art: "quill-drill",
    flagsAdd: ["quill-mentor"],
  },
  {
    kind: "encounter",
    title: "Bounty Thieves",
    body: "Men who hunt binders for their warrant purses leap the paddock fence smelling of ale and other people’s funerals. Quill says quietly, “Do not die for practice. Die for something with better punctuation.”",
    enemy: "Bounty Purse-Cutters",
    theme: "bounty-thieves",
    art: "purse-cutter",
  },
  {
    kind: "narrative",
    title: "Yard Prices",
    body: "A Freemark widow lists Candlemire collar-yard prices like weather: song-thralls high, fighters mid, children discounted if quiet. She does not weep. Quill pays for the list anyway, stamps it into your coat, and mutters that markets this polite deserve a warrant with teeth.",
    art: "warrant-paper",
    flagsAdd: ["yard-prices"],
  },
  {
    kind: "narrative",
    title: "Rumors of Candlemire",
    body: "A tavern singer mouths a ballad about cane fields that grow screams, then stops cold when a man in Cade’s muted check enters. Quill tips her double. You leave by the kitchen, pockets heavier with a scratched floorplan of Candlemire’s guest wing — and a new reason to hate sugar.",
    art: "tavern-rumor",
    flagsAdd: ["guest-wing-map"],
  },
  {
    kind: "choice",
    title: "How Hard Do We Ride?",
    body: "East means brands and gate smiles. Quill can delay for more warrants and levels of coin — or push now while Lyra’s name is still written unbroken. “Your call shapes the dust,” he says. “I just bill for the shovel.”",
    art: "east-road",
    choices: [
      {
        id: "ch2-push",
        label: "Ride east at dawn",
        approach: "Speed over safety; Lyra first.",
        outcome: {
          text: "Quill packs light. “Then we become the rumor. Try not to enjoy it.”",
          xp: 20,
          flagsAdd: ["push-east", "ch2-complete"],
        },
      },
      {
        id: "ch2-prepare",
        label: "One more warrant season",
        approach: "Gather gear, allies, and thicker freeman luck.",
        outcome: {
          text: "Weeks blur into silver and scars. East waits — hungrier, clearer, less forgiving.",
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
          text: "Quill returns with gate schedules and a new limp. “Worth it,” he lies, fondly.",
          xp: 26,
          flagsAdd: ["quill-scouted", "ch2-complete", "gate-schedules"],
        },
        fail: {
          text: "Quill is gone too long. You ride after him into worse maps and better urgency.",
          xp: 14,
          flagsAdd: ["quill-missing", "ch2-complete", "push-east"],
        },
      },
    ],
  },
  {
    kind: "narrative",
    title: "Eastwind",
    body: "Dust lifts like a curtain on a bad play. Beyond Freemark the Wilderland pretends to be empty and fails the audition. Somewhere past river fog, Candlemire’s chimneys write black letters on the sky — and Lyra’s name is still a reason to keep walking.",
    art: "eastwind",
  },
];

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

/** Legacy fallback — prefer buildVignetteDeck unique bodies. */
function connectiveBody(seed, chapter = 1) {
  const pool = CHAPTER_CONNECTIVE[chapter];
  const openers = pool?.openers ?? CONNECTIVE_OPENERS;
  const middles = pool?.middles ?? CONNECTIVE_MIDDLES;
  const closers = pool?.closers ?? CONNECTIVE_CLOSERS;
  const a = openers[seed % openers.length];
  const b = middles[(seed * 3) % middles.length];
  const c = closers[(seed * 7) % closers.length];
  return `${a} ${b} ${c}`;
}

function landmarksForChapter(chapter) {
  if (chapter === 1) return CH1_LANDMARKS;
  if (chapter === 2) return CH2_LANDMARKS;
  const lm = THOROUGH_LANDMARKS[chapter];
  if (!lm?.length) throw new Error(`Missing thorough landmarks for chapter ${chapter}`);
  return lm;
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

function expandLandmarkToFrame(lm, id, nextId, chapter, level, seed = 0) {
  const scene = sceneId(CHAPTERS[chapter - 1].slug);
  const art = artId(lm.art || CHAPTERS[chapter - 1].slug);
  const echoes = lm.flagEchoes || (lm.kind === "narrative" ? echoesForBeat(chapter, seed) : undefined);
  const base = {
    id,
    kind: lm.kind,
    title: lm.title,
    body: lm.body,
    sceneId: scene,
    artId: art,
    chapter,
    ...(lm.flagsAdd ? { flagsAdd: lm.flagsAdd } : {}),
    ...(echoes ? { flagEchoes: echoes } : {}),
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
 * Target frame counts (~32–34h). Lengthened with authored landmarks + set pieces;
 * connective stays unique vignettes, not sentence-spam.
 */
const TARGET_FRAMES = {
  1: 118,
  2: 118,
  3: 88,
  4: 88,
  5: 92,
  6: 92,
  7: 88,
  8: 92,
  9: 80,
};

function buildThoroughChapter(meta, landmarks) {
  const target = TARGET_FRAMES[meta.chapter];
  const level = Math.ceil((meta.levelMin + meta.levelMax) / 2);
  const nodes = [];
  const vignettes = buildVignetteDeck(meta.chapter, target + 40);
  let vignetteIdx = 0;
  const nextVignette = () => vignettes[vignetteIdx++ % vignettes.length];

  // Keep ending triad as the literal last chapter frame when present.
  const finaleLm =
    landmarks[landmarks.length - 1]?.flagsAdd?.includes("ch9-finale") ||
    landmarks[landmarks.length - 1]?.title === "Horizon Vote"
      ? landmarks[landmarks.length - 1]
      : null;
  const coreLandmarks = finaleLm ? landmarks.slice(0, -1) : landmarks;
  const roadChoices = ROAD_CHOICES[meta.chapter] || [];
  const setPieces = SET_PIECES[meta.chapter] || [];
  const specialBeats = [
    ...roadChoices.map((lm) => ({ type: "landmark", lm })),
    ...setPieces.map((sp) => ({
      type: "landmark",
      lm: { kind: "narrative", title: sp.title, body: sp.body, art: sp.art },
    })),
  ];
  const coreTarget = finaleLm ? target - 1 : target;

  const landmarkCount = coreLandmarks.length;
  const slotsBetween = Math.max(
    1,
    Math.floor((coreTarget - landmarkCount - specialBeats.length) / Math.max(1, landmarkCount - 1)),
  );

  /** @type {{type:"landmark"|"connective"|"encounter", lm?:any, seed?:number}[]} */
  const plan = [];
  let seed = meta.chapter * 1000;
  let specialIdx = 0;
  /** Scripted ambushes between landmarks — keep inside 10–20 frame cadence. */
  const ambushEvery = 14;
  let sinceAmbush = 0;
  const pushAmbushOrConnective = () => {
    seed++;
    if (sinceAmbush >= ambushEvery) {
      plan.push({ type: "encounter", seed });
      sinceAmbush = 0;
    } else {
      plan.push({ type: "connective", seed });
      sinceAmbush++;
    }
  };
  for (let i = 0; i < coreLandmarks.length; i++) {
    const lm = coreLandmarks[i];
    plan.push({ type: "landmark", lm });
    if (lm.kind === "encounter") sinceAmbush = 0;
    else sinceAmbush++;
    if (i < coreLandmarks.length - 1) {
      for (let j = 0; j < slotsBetween; j++) {
        // Insert sparse road choices / set pieces mid-connective.
        if (specialIdx < specialBeats.length && (j === 2 || j === Math.floor(slotsBetween / 2))) {
          plan.push(specialBeats[specialIdx++]);
          sinceAmbush++;
          continue;
        }
        pushAmbushOrConnective();
      }
    }
  }
  while (specialIdx < specialBeats.length && plan.length < coreTarget) {
    plan.push(specialBeats[specialIdx++]);
    sinceAmbush++;
  }
  while (plan.length < coreTarget) {
    pushAmbushOrConnective();
  }
  if (plan.length > coreTarget) plan.length = coreTarget;
  if (finaleLm) plan.push({ type: "landmark", lm: finaleLm });

  for (let i = 0; i < plan.length; i++) {
    const id = frameId(meta.chapter, i + 1);
    const nextId = i < plan.length - 1 ? frameId(meta.chapter, i + 2) : null;
    const step = plan[i];

    if (step.type === "landmark") {
      const frame = expandLandmarkToFrame(
        step.lm,
        id,
        nextId ?? id,
        meta.chapter,
        level,
        step.seed ?? i + meta.chapter * 50,
      );
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
        body: `${nextVignette()} Then ${enemyName.toLowerCase()} force the issue — a roadside lesson Quill refuses to skip.`,
        sceneId: sceneId(meta.slug),
        artId: artId(theme),
        chapter: meta.chapter,
        enemy: enemyName,
        enemyArtId: artId(theme),
        ...stats,
        choices: makeEncounterChoice(nextId, enemyName, meta.chapter, level),
        flagEchoes: echoesForBeat(meta.chapter, step.seed),
      });
      continue;
    }

    nodes.push({
      id,
      kind: "narrative",
      title: `${meta.title}: ${beatTitleFor(step.seed)}`,
      body: nextVignette(),
      sceneId: sceneId(meta.slug),
      artId: artId(meta.slug),
      chapter: meta.chapter,
      next: nextId,
      flagEchoes: echoesForBeat(meta.chapter, step.seed),
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
  if (hours < 28 || hours > 36) throw new Error(`Hours out of range: ${hours}`);

  return hours;
}

// ─── Build ───────────────────────────────────────────────────────────
const allNodes = [];
const chapterDefs = [];

for (const meta of CHAPTERS) {
  const nodes = buildThoroughChapter(meta, landmarksForChapter(meta.chapter));

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
  thoroughChapters: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  stubChapters: [],
};

const pack = {
  version: 1,
  title: "True Grit: Wilderland Liberation",
  blurb:
    "Oregon Trail–style comic frames. An original thrall-to-liberator arc through the Wilderland — warrants, orcs, and Candlemire’s collar yards. A scarred freehold marshal and a stubborn freeman who will not quit. Inspired by liberation-Western grit; no film trademark character names.",
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
    flagEchoes: node.flagEchoes,
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
        requireFlag: c.requireFlag,
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
