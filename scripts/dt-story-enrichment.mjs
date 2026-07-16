/**
 * Wilderland story enrichment — unique connective vignettes, road choices,
 * and flag echoes that rewrite later panel text without breaking frame ids.
 *
 * Consumed by generate-dungeon-tester-spine.mjs.
 */

/** Deterministic LCG shuffle (stable across regenerations). */
function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, seed) {
  const a = arr.slice();
  const rnd = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shared sharp fragments — adult Western/fantasy grit, dark humor, agency. */
const SHARED_OPENERS = [
  "Dust lifts off the track in pale sheets that lie for a living.",
  "Wind carries iron smell farther than any honest voice.",
  "Bootleather remembers every mile better than maps ever will.",
  "Crows argue over something dead you hope is not destiny.",
  "Quill hums a tune that never finishes the same way twice.",
  "Clouds drag shadows across cane-colored grass like slow warrants.",
  "A creek argues with stones like a tired magistrate on half pay.",
  "Night insects keep score of every secret step you still take.",
  "A roadside shrine wears three names and one empty nail.",
  "Somewhere a horn practices the sound of ownership.",
  "Wagon ruts braid into a grammar only hunters read fluently.",
  "Heat makes the freemark itch like unfinished business.",
  "A hanged scarecrow wears Cade’s check like a joke that landed.",
  "Rain finds the places where collars used to teach posture.",
  "Quill counts cartridges the way priests count sins — carefully.",
  "Ash tastes copper on the wind and does not flinch.",
  "A child’s chalk freemark on a fence post has already been scrubbed.",
  "Two riders tip hats too friendly for the hour.",
  "The road offers a fork that is really a dare.",
  "Camp smoke writes temporary law across the pines.",
  "A dead mule teaches economics better than any clerk.",
  "Your shadow arrives first and looks less free than you feel.",
  "Quill’s hat brim cuts the sun into a usable blade.",
  "Distant cane fields clap like soft applause for bad systems.",
  "A warrant nail still bleeds pine sap where paper used to hang.",
  "Somebody buried a whip and marked the dirt with hope.",
  "The Wilderland files today’s silence under “pending violence.”",
  "Lyra’s name sits behind your teeth like a loaded prayer.",
  "A freeman laughs too loud, then checks who heard him.",
  "Steel rides light; the ledger in Quill’s coat does not.",
];

const SHARED_MIDDLES = [
  "You check the freemark and find it still yours — for now.",
  "Somewhere a horn asks a question steel usually answers.",
  "Rations taste like postponement, pepper, and old promises.",
  "Tracks braid, unbraid, and lie with professional cheer.",
  "Ash keeps counsel; Quill keeps a ledger of silences.",
  "The road offers three bad choices and one worse delay.",
  "Memory of cages arrives uninvited, then leaves when named.",
  "Hope and suspicion share the same waterskin without apology.",
  "Quill says, “Pretty country. Ugly ownership.”",
  "A road-vermin kid offers directions priced in half-truths.",
  "You practice not answering to a number when strangers call.",
  "Ash rolls a shoulder that still remembers iron’s manners.",
  "The next mile pretends to be empty and fails the audition.",
  "Dust becomes a third companion with poor hygiene and worse jokes.",
  "Quill files every kindness under “possibly tactical.”",
  "You catch yourself walking like cargo that learned a verb.",
  "A thrall brand on a fence rail dares you to look away.",
  "Freedom still feels like hunger wearing better boots.",
  "Quill’s tea tastes like boiled warrants and patience.",
  "Ash counts exits without moving his mouth — old habit, good habit.",
  "Somewhere east, ink still invents people into inventory.",
  "A joke dies mid-laugh when Cade’s check appears on a sleeve.",
  "You trade a story for water and keep the ending private.",
  "The Wilderland watches and declines to explain itself.",
  "Quill mutters law under his breath like a protective curse.",
  "Your wrist freemark itches whenever eyes linger too long.",
  "Ash refuses to romanticize the road; the road returns the favor.",
  "A hanged poster of your face lies about the eyes — always the eyes.",
  "Tonight’s camp will argue theology with mosquitoes and memory.",
  "Continue is the only honest verb left, and even it hesitates.",
];

const SHARED_CLOSERS = [
  "The next mile does not apologize.",
  "You walk on because stopping is how numbers return.",
  "Quill nods toward the darker horizon without ceremony.",
  "Somewhere east, a ledger page waits to be rewritten.",
  "Steel rests light; resolve does not.",
  "The Wilderland watches and keeps its receipts.",
  "Another frame turns like a dusty page with teeth.",
  "Continue — soft roads make soft collars again.",
  "Ash sets the pace like a man owed a name.",
  "Quill tips his hat at unfinished justice.",
  "Dust settles on everything except the vow.",
  "Night takes attendance; you answer as a freeman.",
  "The cane smell thickens like a dare.",
  "You spit iron taste and keep the freemark facing out.",
  "Somewhere a cage door practices its last slam.",
  "Lyra’s sale date ticks quieter than a clock and louder than fear.",
  "Road vermin scatter; serious hunters do not.",
  "Quill packs the silence like powder — dry, useful, dangerous.",
  "West is a rumor; east is a debt with a smile.",
  "You walk because the alternative still smells like rust.",
];

const CHAPTER_FLAVOR = {
  1: {
    openers: [
      "Cage wheels still squeak in the memory of your spine.",
      "Overseer laughter carries farther than any hymn on this road.",
      "Nine-Mark is a name you are actively murdering with each mile.",
      "The collar scar itches when ox-wains pass — muscle memory of inventory.",
      "Quill buys your freedom like a man purchasing a complicated knife.",
      "Chain-Road mist sits on the world like damp wool and worse math.",
      "A child’s doll face-down in soot teaches Vern’s sermon without words.",
      "Halbrecht Quill lights a match off a warrant nail and looks almost human.",
    ],
    middles: [
      "Quill drawls, “Paper freedom first. Real freedom files later.”",
      "Ash learns that freemen still bleed; they just choose the reason.",
      "A cage-tender spit misses your boots by manners, not mercy.",
      "Vern’s ledger scrap burns colder than any campfire comfort.",
      "You practice stance until rage becomes usable instead of loud.",
      "Quill’s crossbow speaks better law than half the magistrates east.",
      "Road vermin sell water and buy stories about numbered men.",
      "The first warrant tastes like ash roofs and unfinished graves.",
    ],
    closers: [
      "Collar mud still clings; freemark ink is drying on purpose.",
      "Quill files Lowhedge under “paid in blood or nearly.”",
      "Lyra’s name leaves your mouth without shaking — progress, of a kind.",
      "Chain-Road shrinks behind you like a bad religion losing believers.",
      "You walk west, then south, then wherever vengeance keeps maps.",
      "Paper in your coat weighs less than iron and more than sleep.",
    ],
  },
  2: {
    openers: [
      "Freemark’s bridge collects stories the way cages collect numbers.",
      "Your freeman glyph still weeps pale ink when you make a fist.",
      "Warrant posters flutter like black laundry nobody claims.",
      "Grin-Nail’s jokes show too many teeth for comedy.",
      "Quill turns paddocks into a school where failure pays tuition in bruises.",
      "Dust and Debt share a last name out here — ask any freemark widow.",
      "A tavern singer swallows a verse when Cade’s check enters the room.",
      "Bounty thieves smell like ale and other people’s funerals.",
    ],
    middles: [
      "Quill says, “Hills first. Rivers remember who you were.”",
      "Ash shoots until the freemark stops feeling like costume jewelry.",
      "Magistrate silver spends cleaner than Goblin gratitude — usually.",
      "A guest-wing floorplan scratches your palm like a second freemark.",
      "You learn freeman work is still fighting other people’s arithmetic.",
      "Quill reads ledgers like scripture written by committed bastards.",
      "Road vermin tip you to a knight who sells villagers under soft seals.",
      "East waits hungrier the longer you polish courage into delay.",
    ],
    closers: [
      "Freemark stamps you unpaid labor instead of numbered iron — upgrade.",
      "Quill packs light enough to become the rumor on purpose.",
      "Candlemire’s chimneys write black letters you intend to edit.",
      "You ride because Lyra’s ink is still written unbroken.",
      "Dust season ends; warrant season learns your new name.",
      "The east road does not care how ready you feel.",
    ],
  },
  3: {
    openers: [
      "Wanted ink flutters on fenceposts like black moths with prices.",
      "A raven ticks travelers the way clerks tick inventory — lovingly.",
      "Your charcoal twin on a poster lies about the eyes, always.",
      "A forger sells marks that open doors and close other people’s lives.",
      "False friends smile with coin-shaped pupils and warm ale.",
      "Quill buys silence in amounts too small to trust and too dear to skip.",
      "Cade’s birds wheel low, counting questions about ledgers.",
      "Paid knights tip hats like gentlemen and hunt like bookkeepers.",
    ],
    middles: [
      "Quill murmurs, “Hunters prefer freemen. Cages still accept returns.”",
      "Ash counts exits while pretending to enjoy the beer.",
      "Lyra’s sale date sits behind your teeth like a vow with teeth of its own.",
      "A stable loft teaches economics: copper in, descriptions out.",
      "Maps improve when fear stops editing the margins.",
      "Quill’s past demands rent in present blood — classic binder arithmetic.",
      "You feed Cade a river that does not exist and buy a single day.",
      "Night-march sweat tastes like posters burning behind you.",
    ],
    closers: [
      "The trail toward Cade does not apologize for the mileage.",
      "East concentrates into cane smell and damp iron opinions.",
      "You walk on because numbers are still hunting names.",
      "Quill nods at a darker cairn like a man greeting an old enemy.",
      "Somewhere a ledger waits to be embarrassed in public.",
      "The Wilderland files you under unfinished, expensive business.",
    ],
  },
  4: {
    openers: [
      "Mud drinks bootprints and keeps no honest receipts.",
      "Reed-beds whisper in a language cages understand fluently.",
      "Fog files the middle river under “possible drowning, probable sin.”",
      "Chain-links click under canvas like soft clocks counting inventory.",
      "Ferrymen invent new morals at each landing and charge for both.",
      "A pole dips and comes up darker than water has any right to be.",
      "Quill wraps powder against damp as if arguing theology with weather.",
      "The Brand-River refuses to run clear for anyone with a conscience.",
    ],
    middles: [
      "Barges teach what freeholds pretend not to see at supper.",
      "Lyra’s page dried crooked and remains cruelly readable.",
      "Toll spears make freedom a geographically conditional noun.",
      "Muck-spiders punctuate screams into quieter, wetter grammar.",
      "A poleman names a sale lot and looks away forever — smart man.",
      "Ash tastes river and remembers collar rust with perfect recall.",
      "Promises to thralls weigh more than dry socks and less than steel.",
      "Quill swears the river invented spiders to keep honest ledgers dry.",
    ],
    closers: [
      "The far bank insists on being earned the hard way.",
      "You pole on because swimming is a rumor with teeth tonight.",
      "East thickens into chimneys and courtesy that bites.",
      "Quill wrings the Brand-River out of his sleeves like a bad sermon.",
      "Somewhere a gate practices smiling until it believes itself.",
      "Dry ground is a temporary theology — enjoy it briefly.",
    ],
  },
  5: {
    openers: [
      "Gate iron tastes bribes before it bothers tasting names.",
      "Cane shadows stripe the road like ruled paper waiting for ink.",
      "Guest wine arrives with surveillance for a finish — notes of oak and eyes.",
      "Wicker fences pretend to be gardens after dark and fail charmingly.",
      "A steward’s courtesy is a measured net cast with soft hands.",
      "Collar sunlight flash-sales morality to anyone watching too long.",
      "Quill’s hat tips at the exact angle bribes prefer in polite company.",
      "Candlemire air smells like sugar covering iron on purpose.",
    ],
    middles: [
      "Lyra’s loft sits above applause and under latches that learn fear.",
      "False papers hold if courage holds their corners flat.",
      "War-mastiffs file freemarks under unfinished catches — optimistic dogs.",
      "Hedges hide yards the way jokes hide knives at dinner.",
      "Cade’s curiosity is a tax you have not paid and will not enjoy.",
      "Ash studies exits while toasting inventively and without joy.",
      "Servants speak Lyra’s name like contraband fruit — soft, dangerous.",
      "Inner fences end the fiction of hospitality with a smile.",
    ],
    closers: [
      "The house of collars waits past the next practiced smile.",
      "You walk guest corridors as if they were bridges over something hungry.",
      "Novelty is camouflage until it isn’t — Quill’s favorite warning.",
      "Quill files Cade’s laugh under later, personal vengeance.",
      "Somewhere a blue ribbon refuses the inventory on principle.",
      "Gate dust still clings; yard dust will soon write better sermons.",
    ],
  },
  6: {
    openers: [
      "Dessert plates hide ledgers the way smiles hide teeth.",
      "Gallery blades practice conversation endings between courses.",
      "Kitchen steam carries room numbers like whispered confessions.",
      "Window light invents Lyra out of outline, hope, and terror.",
      "Overseer chains tick guest corridors into inventory music.",
      "Midnight thralls offer silence priced in uprising installments.",
      "Quill’s other name tries to climb out of rumor and into danger.",
      "Collar pegs remember every ring that learned a person by force.",
    ],
    middles: [
      "Dinner with Cade is a battlefield that insists on using forks.",
      "Recognition taps twice through glass — soft, seismic, forbidden.",
      "Punishment-hounds theorize with noses and conclude too quickly.",
      "Wide revolts are loud; loud can still be righteous if timed.",
      "House blades call murder sport between the fish and the fruit.",
      "Ash keeps count of locks without moving his mouth — guest manners.",
      "Mandolin scales practice tomorrow’s bled applause upstairs.",
      "A rival binder smiles like an unpaid bill with a pulse.",
    ],
    closers: [
      "The pit invitation writes itself in silk and threat.",
      "You toast carefully and plan rudely under the same smile.",
      "Latches soften when oil believes in them — and when you do.",
      "Quill rebuttons his calm for one more murderous course.",
      "Somewhere Lyra listens for a freemark vow through glass.",
      "Midnight becomes a co-conspirator if fed keys and courage.",
    ],
  },
  7: {
    openers: [
      "Lanterns sway over sand that already knows the bloody chorus.",
      "The mandolin sweetens accounting into entertainment — Candlemire’s specialty.",
      "Gallery silk rustles like a jury pretending to be fans.",
      "Pit sand remembers freemarks as punchlines with teeth.",
      "Collared champions study doors disguised as people.",
      "Quill’s face from the bench is an unauthorized prayer.",
      "Oil and hinges rehearse freedom under applause cover.",
      "Cade’s laugh keeps time better than the mandolin ever will.",
    ],
    middles: [
      "Spectacle buys leash; efficiency buys allies who still breathe.",
      "A near-fall can oil a latch if pride cooperates for once.",
      "WEST becomes a complete battle plan in one ugly syllable.",
      "Arena pageantry is still teeth under dye and perfume.",
      "Lantern light translates into key-language if you bleed right.",
      "Ash bleeds professionally and plans the encore while standing.",
      "Crowds remember legs when music skips — useful, if cruel.",
      "Revolt spark prefers sand that already expects blood tonight.",
    ],
    closers: [
      "The yard surge waits one lantern later — timing is theology.",
      "You stand because falling is for theater, not for freemen.",
      "Tomorrow’s riot needs tonight’s pulse and tonight’s oil.",
      "Quill recovers his hat brim from somebody’s expensive joke.",
      "Somewhere a loft latch chooses open like a converted atheist.",
      "The mandolin learns a key it did not rehearse — freedom’s key.",
    ],
  },
  8: {
    openers: [
      "Cage keys pass like contraband dawn through wet hands.",
      "Barracks flame edits orders mid-sentence — beautiful vandalism.",
      "Freed feet invent verbs maps never allowed into polite speech.",
      "Warg cavalry stitches smoke with teeth and still fails the math.",
      "Tower stairs forget who owns gravity when revolt rewrites physics.",
      "Lyra’s lamp does not shake; that matters more than speeches.",
      "Quill’s warrant becomes personal without apology or footnote.",
      "Candlemire’s courtesy burns at both ends and smells like sugar lies.",
    ],
    middles: [
      "Uprising grammar conjugates in present tense — we free, we burn, we keep.",
      "Recognition heals wrong and right at once; Lyra is thinner and unbroken.",
      "Cade’s smile attempts management mid-fall — adorable, doomed.",
      "Fire and manacles argue about which ends systems faster.",
      "Children carry ring-keys as accidental trophies and perfect sermons.",
      "Ash counts living names louder than dead seals ever shouted.",
      "Remnant riders try to rewrite the riot’s ending with leftover coin.",
      "West is unfinished on purpose — that is the point of roads.",
    ],
    closers: [
      "The march invents road under ash and refuses to ask permission.",
      "You walk because cages no longer schedule your lungs.",
      "Freeholds begin as decisions, not deeds — start deciding.",
      "Quill packs what remains of professional calm into a ruined hat.",
      "Somewhere remnant coin still tries to buy chases and finds empty purses.",
      "Liberation keeps no neat margin; neither should you.",
    ],
  },
  9: {
    openers: [
      "West weather asks no brand of anyone and means it.",
      "Remnant coin buys late knives and earlier, uglier panic.",
      "Storm takes inventory of who still smells like iron guilt.",
      "Dust counsel replaces court counsel without missing the bastard.",
      "Lyra describes mornings like legislation against despair.",
      "Quill refuses to advise and means it as the highest respect.",
      "Memory at crossroads tries on jury duty and looks almost fair.",
      "Horizon light writes nothing but possibility — terrifying, holy.",
    ],
    middles: [
      "Freedom that becomes Cade fails before the first kitchen opens.",
      "Mercy, fire, and shared dawn wait like weather you finally choose.",
      "Last enforcers make theology out of leftover steel and lose.",
      "Ash keeps vows that ledgers cannot translate into inventory.",
      "Marchers peel toward kin; some invent kin out of shared scars.",
      "Warnings need telling or they recruit again under prettier names.",
      "Kitchens beat monuments for daily miracles — Quill almost smiles.",
      "The ending triad is not a trick — it is authorship with consequences.",
    ],
    closers: [
      "The horizon waits for a mark of your choosing — soft, hard, or shared.",
      "You walk west as inventory that refused the count and won.",
      "Soft enough to shelter, hard enough to deter, never Cade.",
      "Quill tips a ruined hat at unfinished justice and means goodbye.",
      "Somewhere children will not know the smell of rings — if you choose well.",
      "Candlemire becomes story, scar, or kitchen — pick the grammar.",
    ],
  },
};

const BEAT_TITLES = [
  "Dust Mile",
  "Quiet Counsel",
  "Road Hygiene",
  "Old Hunger",
  "Freemark Thoughts",
  "Ledger Weather",
  "Steel Practice",
  "Night Watch",
  "Iron Humor",
  "Collar Echo",
  "Warrant Weather",
  "Hard Mercy",
  "Vermin Bargain",
  "Ash Aside",
  "Quill's Aside",
  "Cane Wind",
];

/**
 * Build a large unique deck of 2–3 sentence connective bodies for a chapter.
 */
export function buildVignetteDeck(chapter, needed) {
  const flavor = CHAPTER_FLAVOR[chapter] || { openers: [], middles: [], closers: [] };
  const openers = [...SHARED_OPENERS, ...(flavor.openers || [])];
  const middles = [...SHARED_MIDDLES, ...(flavor.middles || [])];
  const closers = [...SHARED_CLOSERS, ...(flavor.closers || [])];

  /** @type {string[]} */
  const combos = [];
  for (let o = 0; o < openers.length; o++) {
    for (let m = 0; m < middles.length; m++) {
      for (let c = 0; c < closers.length; c++) {
        // Sparse sampling — skip most triples to keep deck sharp + finite.
        if ((o * 17 + m * 31 + c * 13 + chapter * 7) % 11 !== 0) continue;
        combos.push(`${openers[o]} ${middles[m]} ${closers[c]}`);
      }
    }
  }

  const deck = shuffle(combos, 9000 + chapter * 137);
  // Guarantee uniqueness within chapter.
  const unique = [];
  const seen = new Set();
  for (const body of deck) {
    if (seen.has(body)) continue;
    seen.add(body);
    unique.push(body);
    if (unique.length >= needed + 20) break;
  }

  // Fallback: if still short, append numbered variants (should be rare).
  let n = 0;
  while (unique.length < needed) {
    const o = openers[n % openers.length];
    const m = middles[(n * 3) % middles.length];
    const c = closers[(n * 7 + chapter) % closers.length];
    const body = `${o} ${m} ${c} (Mile ${chapter}.${n + 1}.)`;
    if (!seen.has(body)) {
      seen.add(body);
      unique.push(body);
    }
    n++;
  }

  return unique;
}

export function beatTitleFor(seed) {
  return BEAT_TITLES[seed % BEAT_TITLES.length];
}

/**
 * Sparse reconverging road choices — agency without exploding the spine.
 * Each returns a landmark-shaped choice object.
 */
export const ROAD_CHOICES = {
  1: [
    {
      kind: "choice",
      title: "Road Vermin Tax",
      body: "Three road vermin block a ford with a rope and a grin. Their leader — missing two fingers and all shame — offers “protection” for coin, a story, or a bruise. Quill’s hand rests near his bolt like punctuation.",
      art: "road-vermin",
      choices: [
        {
          id: "ch1-vermin-pay",
          label: "Pay the damn rope",
          approach: "Buy the ford; save steel for Vern.",
          outcome: {
            text: "They salute with stolen manners. Quill mutters, “Inflation.”",
            xp: 8,
            gold: -6,
            flagsAdd: ["vermin-paid", "loot-hint-ford-cache"],
          },
        },
        {
          id: "ch1-vermin-scare",
          label: "Scare them honest",
          approach: "Show the freemark and the crossbow’s opinion.",
          outcome: {
            text: "Rope drops. One kid whispers, “Nine-Mark walks.” Word travels usefully.",
            xp: 12,
            flagsAdd: ["vermin-scared", "hard-hand"],
          },
        },
        {
          id: "ch1-vermin-story",
          label: "Trade a Chain-Road story",
          approach: "Give them a tale sharp enough to sell twice.",
          stat: "charisma",
          dc: 11,
          success: {
            text: "They point you to a dry cache under the ford stones — amateurs with useful greed.",
            xp: 16,
            flagsAdd: ["vermin-story", "loot-hint-ford-cache"],
          },
          fail: {
            text: "They laugh wrong. Quill pays anyway and files the insult.",
            xp: 6,
            gold: -4,
            flagsAdd: ["vermin-paid"],
          },
        },
      ],
    },
    {
      kind: "choice",
      title: "Quill's Ugly Joke",
      body: "At dusk Quill asks whether you want to be a freeman who hunts, or a hunter who happens to be free. The difference, he says, is who you apologize to when the smoke clears.",
      art: "quill-aside",
      choices: [
        {
          id: "ch1-joke-free",
          label: "Freeman who hunts",
          approach: "Keep the moral order: freedom first, warrants second.",
          outcome: {
            text: "“Then we hunt like guests,” Quill says. “Violent guests.”",
            xp: 10,
            flagsAdd: ["identity-freeman", "path-hope"],
          },
        },
        {
          id: "ch1-joke-hunter",
          label: "Hunter who is free",
          approach: "Admit the work shapes the man.",
          outcome: {
            text: "Quill almost smiles. “Honest. Ugly. Useful.”",
            xp: 10,
            flagsAdd: ["identity-hunter", "path-revenge"],
          },
        },
        {
          id: "ch1-joke-neither",
          label: "Neither — Lyra’s man",
          approach: "Refuse Quill’s categories; keep the vow central.",
          outcome: {
            text: "“Categories are cages,” Quill allows. “Fine. Be a vow with a sword.”",
            xp: 12,
            flagsAdd: ["identity-vow", "lyra-first"],
          },
        },
      ],
    },
  ],
  2: [
    {
      kind: "choice",
      title: "Tavern Odds",
      body: "A Freemark bookmaker offers odds on whether you’ll die before Candlemire or after. Quill wants silence. The room wants a show. Your freemark itches like a tell.",
      art: "tavern-odds",
      choices: [
        {
          id: "ch2-odds-ignore",
          label: "Drink water; ignore the circus",
          approach: "Refuse the economy of your death.",
          outcome: {
            text: "Boring wins. Quill tips the barman for the quiet.",
            xp: 10,
            flagsAdd: ["odds-ignored", "lawful-hand"],
          },
        },
        {
          id: "ch2-odds-fix",
          label: "Bet on after",
          approach: "Make the room fund your survival myth.",
          outcome: {
            text: "Coin hits wood. “After,” you say. Someone cheers wrong.",
            xp: 12,
            gold: 8,
            flagsAdd: ["odds-after", "loot-hint-bookie-debt"],
          },
        },
        {
          id: "ch2-odds-threat",
          label: "Correct the bookmaker’s manners",
          approach: "Fear teaches faster than odds.",
          stat: "strength",
          dc: 12,
          success: {
            text: "He refunds half the room and learns new theology.",
            xp: 18,
            gold: 10,
            flagsAdd: ["odds-corrected", "hard-hand"],
          },
          fail: {
            text: "A bottle finds your cheek. Quill ends the math with a bolt tip.",
            xp: 8,
            damage: 5,
            flagsAdd: ["odds-brawl"],
          },
        },
      ],
    },
  ],
  3: [
    {
      kind: "choice",
      title: "Poster Autograph",
      body: "A kid asks you to sign your wanted poster “for luck.” Quill winces. Ash sees a chance to poison rumor or feed it.",
      art: "poster-kid",
      choices: [
        {
          id: "ch3-sign-mercy",
          label: "Sign it — soft hand",
          approach: "Be a legend that shelters kids, not hunts them.",
          outcome: {
            text: "The kid runs. By dusk your poster says ALIVE and HELPFUL in crayon.",
            xp: 12,
            flagsAdd: ["poster-mercy", "path-hope"],
          },
        },
        {
          id: "ch3-sign-threat",
          label: "Sign it with a warning",
          approach: "Make hunters read fear into the ink.",
          outcome: {
            text: "You write: HUNTERS PAY DOUBLE. Quill snorts. “Subtle.”",
            xp: 12,
            flagsAdd: ["poster-threat", "hard-hand"],
          },
        },
        {
          id: "ch3-refuse-sign",
          label: "Refuse — burn the sheet",
          approach: "Deny the market your face.",
          outcome: {
            text: "Ash burns charcoal twin. Smoke still smells like a price.",
            xp: 10,
            flagsAdd: ["poster-burned"],
          },
        },
      ],
    },
  ],
  4: [
    {
      kind: "choice",
      title: "Reed Confession",
      body: "A half-drowned thrall in the reeds begs you not to free him where horns can hear — he has family still under canvas. Mercy here has a schedule.",
      art: "reed-thrall",
      choices: [
        {
          id: "ch4-reed-hide",
          label: "Hide him; free later",
          approach: "Quiet mercy; accept unfinished liberation.",
          outcome: {
            text: "He names a landing knock. Quill files it under “expensive hope.”",
            xp: 16,
            flagsAdd: ["reed-hidden", "landing-codes", "path-hope"],
          },
        },
        {
          id: "ch4-reed-cut",
          label: "Cut him free now",
          approach: "Noise be damned; one less ring tonight.",
          outcome: {
            text: "Horns answer. You run with a living debt on your shoulder.",
            xp: 14,
            flagsAdd: ["reed-freed-loud", "path-hope"],
          },
        },
        {
          id: "ch4-reed-info",
          label: "Buy info; leave him",
          approach: "Ugly calculus — Lyra’s map over one man’s night.",
          stat: "wisdom",
          dc: 13,
          success: {
            text: "He hates you and still points true. Quill calls it binder math.",
            xp: 18,
            flagsAdd: ["reed-info", "lyra-lot", "path-revenge"],
          },
          fail: {
            text: "He spits mud and silence. You leave poorer in every sense.",
            xp: 8,
            flagsAdd: ["reed-failed"],
          },
        },
      ],
    },
  ],
  5: [
    {
      kind: "choice",
      title: "Steward's Smile",
      body: "A Candlemire steward offers “guest guidance” that is clearly a leash. He asks if you prefer the scenic cane walk or the efficient path past the collar yards. Quill’s eyes say both are traps; pick the useful one.",
      art: "steward-smile",
      choices: [
        {
          id: "ch5-scenic",
          label: "Take the scenic cane walk",
          approach: "See the yards without admitting you came to burn them.",
          outcome: {
            text: "You memorize latch patterns disguised as tourism.",
            xp: 14,
            flagsAdd: ["saw-yards-scenic", "loot-hint-latch-oil"],
          },
        },
        {
          id: "ch5-efficient",
          label: "Take the efficient path",
          approach: "Closer to Lyra; closer to dogs.",
          outcome: {
            text: "Mastiffs file your scent. Quill tips the steward like a man tipping a snake.",
            xp: 14,
            flagsAdd: ["saw-yards-close", "mastiff-scented"],
          },
        },
        {
          id: "ch5-decline",
          label: "Decline — get lost on purpose",
          approach: "Refuse the leash; invent your own map.",
          requireFlag: "gate-schedules",
          outcome: {
            text: "Schedules beat smiles. You ghost a service corridor Quill already bought.",
            xp: 20,
            flagsAdd: ["ghosted-service", "loot-hint-latch-oil"],
          },
        },
      ],
    },
  ],
  6: [
    {
      kind: "choice",
      title: "Kitchen Politics",
      body: "A cook with burn scars and perfect posture offers three lies to tell Cade at dessert — each buys a different key. “Pick wrong,” she says, “and you become the joke between courses.”",
      art: "kitchen-politics",
      choices: [
        {
          id: "ch6-lie-novelty",
          label: "Lie: we’re novelty fighters",
          approach: "Play to Cade’s vanity; stay invited.",
          outcome: {
            text: "She slips a gallery key into the bread. “Vanity opens doors.”",
            xp: 16,
            flagsAdd: ["lied-novelty", "gallery-key"],
          },
        },
        {
          id: "ch6-lie-binder",
          label: "Lie: Quill’s still buying",
          approach: "Speak binder language Cade understands.",
          outcome: {
            text: "Ledger key. Quill looks sick and grateful in equal measure.",
            xp: 16,
            flagsAdd: ["lied-binder", "ledger-key"],
          },
        },
        {
          id: "ch6-lie-none",
          label: "Tell no dessert lies",
          approach: "Refuse the kitchen’s theater; trust steel later.",
          requireFlag: "lyra-proof",
          outcome: {
            text: "She respects the refusal. “Then oil the latch yourself.”",
            xp: 14,
            flagsAdd: ["no-dessert-lie", "latch-oiled"],
          },
        },
      ],
    },
  ],
  7: [
    {
      kind: "choice",
      title: "Crowd Favor",
      body: "Between bouts the crowd throws coin, flowers, and a blue ribbon that means “keep this one alive.” Quill mouths: take it, refuse it, or throw it to the collared row.",
      art: "crowd-favor",
      choices: [
        {
          id: "ch7-take-ribbon",
          label: "Keep the blue ribbon",
          approach: "Accept spectacle’s mercy as camouflage.",
          outcome: {
            text: "Cade claps. The loft latch gets one more song of cover.",
            xp: 14,
            flagsAdd: ["blue-ribbon", "cade-amused"],
          },
        },
        {
          id: "ch7-refuse-ribbon",
          label: "Refuse the ribbon",
          approach: "Deny the gallery the right to own your pulse.",
          outcome: {
            text: "Boos. Quill smiles with half his mouth. Allies in the dark notice.",
            xp: 14,
            flagsAdd: ["ribbon-refused", "pit-efficient"],
          },
        },
        {
          id: "ch7-pass-ribbon",
          label: "Throw it to the collared row",
          approach: "Turn favor into revolt signal.",
          requireFlag: "latch-oiled",
          outcome: {
            text: "A champion catches it. WEST becomes a rumor with a pulse.",
            xp: 22,
            flagsAdd: ["ribbon-to-thralls", "revolt-signal"],
          },
        },
      ],
    },
  ],
  8: [
    {
      kind: "choice",
      title: "Which Fire First?",
      body: "Barracks, tower records, or cane sheds — three fires, one night. Lyra wants records. Quill wants barracks. Freed thralls want cane that fed the house. Ash gets one match’s worth of authorship.",
      art: "which-fire",
      choices: [
        {
          id: "ch8-fire-records",
          label: "Burn the tower records",
          approach: "Erase inventory so names can stay names.",
          outcome: {
            text: "Paper screams prettier than men. Ledgers learn mortality.",
            xp: 20,
            flagsAdd: ["burned-records", "path-hope"],
          },
        },
        {
          id: "ch8-fire-barracks",
          label: "Burn the barracks",
          approach: "Break the teeth that bite back.",
          outcome: {
            text: "Orders die mid-shout. Quill files the smell under “justice.”",
            xp: 20,
            flagsAdd: ["burned-barracks", "path-revenge"],
          },
        },
        {
          id: "ch8-fire-cane",
          label: "Burn the cane sheds",
          approach: "Starve the house of its sweet cover story.",
          outcome: {
            text: "Sugar smoke. Children cheer like the world invented joy.",
            xp: 18,
            flagsAdd: ["burned-cane", "wide-revolt-pact"],
          },
        },
      ],
    },
  ],
  9: [
    {
      kind: "choice",
      title: "Warning the Next Cade",
      body: "A charming freemark captain offers to “organize” the march into something efficient — seals, schedules, soft chains for “safety.” Lyra goes still. Quill waits for your veto.",
      art: "next-cade",
      choices: [
        {
          id: "ch9-veto-soft",
          label: "Veto him kindly",
          approach: "Shelter without inventing new collars.",
          outcome: {
            text: "He leaves smiling. Someone will watch him anyway.",
            xp: 16,
            flagsAdd: ["vetoed-soft", "counsel-mercy"],
          },
        },
        {
          id: "ch9-veto-hard",
          label: "Veto him publicly",
          approach: "Make the warning a story the road repeats.",
          outcome: {
            text: "The march learns a new swear: never Cade. Quill almost applauds.",
            xp: 18,
            flagsAdd: ["vetoed-hard", "counsel-anti-cade"],
          },
        },
        {
          id: "ch9-veto-exile",
          label: "Exile him from the column",
          approach: "Hard boundary; soft future.",
          requireFlag: "hard-hand",
          outcome: {
            text: "He rides alone into remnant country. Mercy has edges.",
            xp: 20,
            flagsAdd: ["vetoed-exile", "counsel-hard"],
          },
        },
      ],
    },
  ],
};

/**
 * Lines appended to later panel bodies when a flag is present.
 * Sparse, memorable callbacks — not every frame.
 */
export const FLAG_ECHOES = [
  { minChapter: 2, requireFlag: "path-hope", line: "Hope still rides your shoulder like a stubborn second freemark." },
  { minChapter: 2, requireFlag: "path-revenge", line: "Revenge keeps Quill’s tea bitter and your stride honest." },
  { minChapter: 2, requireFlag: "path-wait", line: "You still refuse to decide Lyra’s ending in advance — Quill calls it nerve." },
  { minChapter: 2, requireFlag: "vern-alive", line: "Vern’s living mouth still owes you routes; the road remembers unfinished warrants." },
  { minChapter: 2, requireFlag: "vern-dead", line: "Lowhedge ash still flavors the wind when you think of Vern’s last sound." },
  { minChapter: 2, requireFlag: "hard-hand", line: "Your hard hand has a reputation that arrives before your freemark does." },
  { minChapter: 2, requireFlag: "knows-lyra-early", line: "You learned Lyra’s name before Quill wanted you to — and he has not forgotten." },
  { minChapter: 3, requireFlag: "candlemire-maps", line: "Grin-Nail’s maps itch in your coat like stolen scripture." },
  { minChapter: 3, requireFlag: "lawful-hand", line: "Freemark law still tastes like silver you chose over easier blood." },
  { minChapter: 3, requireFlag: "quill-displeased", line: "Quill’s displeasure rides quieter than anger and lasts longer." },
  { minChapter: 3, requireFlag: "guest-wing-map", line: "Candlemire’s guest wing scratches your palm whenever you make a fist." },
  { minChapter: 4, requireFlag: "false-routes-sold", line: "Somewhere Cade’s riders still chase a river you invented — good." },
  { minChapter: 4, requireFlag: "rat-scared", line: "Freemark’s rat still flinches in stories told two towns back." },
  { minChapter: 4, requireFlag: "quiet-passage", line: "Quiet passage bought with Quill’s settled debt still oils tonight’s miles." },
  { minChapter: 4, requireFlag: "lyra-first", line: "You refused Quill’s side warrant; Lyra-first still sits between you like weather." },
  { minChapter: 5, requireFlag: "barge-cut", line: "Mud still remembers the night you chose noisy mercy over clean maps." },
  { minChapter: 5, requireFlag: "landing-codes", line: "A steward’s soft knock lives in your wrist like a second pulse." },
  { minChapter: 5, requireFlag: "lyra-lot", line: "Lyra’s sale lot number ticks behind your eyes like a fuse." },
  { minChapter: 5, requireFlag: "swam-brands", line: "River cold still lives in your bones — you beat the Brand-River once." },
  { minChapter: 6, requireFlag: "gate-bribed", line: "Gate smiles still taste like the purse you widened on the way in." },
  { minChapter: 6, requireFlag: "posed-muscle", line: "Posing as Cade’s muscle left a bruise on your pride and a useful swagger." },
  { minChapter: 6, requireFlag: "papers-passed", line: "False papers held. Courage still holds their corners when clerks stare." },
  { minChapter: 7, requireFlag: "lyra-tap", line: "The window tap — her name, your risk — still echoes under gallery silk." },
  { minChapter: 7, requireFlag: "lyra-alive-sure", line: "Freemark proof upstairs means Lyra is not a ghost you invented." },
  { minChapter: 7, requireFlag: "wide-revolt-pact", line: "Midnight thralls still count on the pact you whispered in kitchen steam." },
  { minChapter: 7, requireFlag: "gallery-key", line: "A gallery key warms against your ribs like a conspiracy with teeth." },
  { minChapter: 8, requireFlag: "pit-spectacle", line: "Cade’s amusement bought you cover; the sand still owes you a riot." },
  { minChapter: 8, requireFlag: "pit-cover", line: "Your near-fall oiled a latch — theater as lockpick, still working." },
  { minChapter: 8, requireFlag: "revolt-signal", line: "The blue ribbon in the collared row still signals WEST like a heartbeat." },
  { minChapter: 8, requireFlag: "cade-amused", line: "Cade’s laugh is a leash you intend to burn before dawn." },
  { minChapter: 9, requireFlag: "lyra-vow", line: "You came as freeman for her; the vow walks west without limping." },
  { minChapter: 9, requireFlag: "lyra-storm", line: "You came as storm for all of this — Lyra walks in the weather you chose." },
  { minChapter: 9, requireFlag: "lyra-leads", line: "You asked what she needed first; she still sets the column’s true north." },
  { minChapter: 9, requireFlag: "burned-records", line: "Ash from tower records still seasons the wind — inventory died screaming." },
  { minChapter: 9, requireFlag: "burned-barracks", line: "Barracks smoke still clings; teeth that bite back learned mortality." },
  { minChapter: 9, requireFlag: "identity-vow", line: "You refused Quill’s categories — still a vow with a sword, not a category." },
  { minChapter: 9, requireFlag: "counsel-anti-cade", line: "Never Cade is already becoming the march’s favorite swear and safest law." },
];

/**
 * Pick 0–2 flag echo lines for a connective/narrative beat in this chapter.
 */
export function echoesForBeat(chapter, seed) {
  const eligible = FLAG_ECHOES.filter((e) => chapter >= e.minChapter);
  if (!eligible.length) return undefined;
  const a = eligible[seed % eligible.length];
  const b = eligible[(seed * 5 + chapter) % eligible.length];
  const out = [{ requireFlag: a.requireFlag, line: a.line }];
  if (b.requireFlag !== a.requireFlag && seed % 3 === 0) {
    out.push({ requireFlag: b.requireFlag, line: b.line });
  }
  return out;
}

/** Extra scripted set-piece narratives (not formula connective). */
export const SET_PIECES = {
  1: [
    {
      title: "Quill Names the Work",
      body: "“I buy thralls who can ruin the men who sold them,” Quill says, not unkind. “If that offends your poetry, walk. If it fits your teeth, load.” Ash loads.",
      art: "quill-hat",
    },
    {
      title: "Vern's Joke",
      body: "A traveler repeats Vern’s favorite joke about unpaid tribute and burned kitchens. Nobody laughs. Quill tips the man a copper for the geography hidden in the cruelty.",
      art: "warrant-vern",
    },
  ],
  2: [
    {
      title: "Freemark Children",
      body: "Children stare at your wrist glyph and do quiet math about risk. One asks if freemen dream in numbers. You say no. Quill adds, “Dream in exits.”",
      art: "freeman-mark",
    },
  ],
  3: [
    {
      title: "Halbrecht's Other Debt",
      body: "A grey woman calls Quill “Halbrecht” like a summons. He flinches half a degree — the first honest thing you’ve seen him do all week. “Old ink,” he tells you. “Ugly. Mine.”",
      art: "quill-debt",
    },
  ],
  4: [
    {
      title: "Canvas Hymn",
      body: "Under barge canvas someone hums a work song that is not work. It is inventory refusing the count. Ash hums one bar back — soft, criminal, necessary.",
      art: "barge-rings",
    },
  ],
  5: [
    {
      title: "Cade's Courtesy",
      body: "A steward practices Cade’s welcome speech on a mule. The mule looks unconvinced. Quill tips his hat at the animal. “Smartest guest here.”",
      art: "gate-smile",
    },
  ],
  6: [
    {
      title: "Lyra Through Glass",
      body: "For one breath the silhouette is surely her — chin, stubborn angle, the way she used to refuse to bow to weather. Then fear invents doubles. You do not call out. Not yet.",
      art: "window-lyra",
    },
  ],
  7: [
    {
      title: "Mandolin Insult",
      body: "The mandolin player finds a key that makes freemarks sound funny. Cade laughs on the beat. Quill’s jaw ticks once. “After,” he mouths. After means fire.",
      art: "mandolin",
    },
  ],
  8: [
    {
      title: "Lyra's First Order",
      body: "Lyra does not weep into reunion. She points at a latch row and says, “Those. Then the children. Then we argue about feelings.” Ash grins like a man given back a language.",
      art: "lyra-found",
    },
  ],
  9: [
    {
      title: "Quill Declines the Crown",
      body: "Someone offers Quill a freemark captaincy with a seal. He refuses like a man declining plague. “I hunt binders,” he says. “I do not become one with better stationery.”",
      art: "quill-aside",
    },
  ],
};
