#!/usr/bin/env python3
"""Phase B cont.: rewrite Chapters 4–6 Lost Brothers prose + packaging.

Keeps node IDs / choice IDs / flags / art IDs / graph edges.
Spine/chapters packaging only — do not touch dt-world-map geometry.
"""
from __future__ import annotations

import json
import re
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPINE = ROOT / "data/dungeon-tester/story-spine.json"
CHAPTERS = ROOT / "data/dungeon-tester/chapters.json"
MAPS = ROOT / "data/dungeon-tester/maps.json"

SUFFIX_MAP = {
    "Road Hygiene": "Trail Hygiene",
    "Old Hunger": "Old Hunger",
    "Freemark Thoughts": "Callsign Thoughts",
    "Ledger Weather": "SKU Weather",
    "Steel Practice": "Steel Practice",
    "Night Watch": "Night Watch",
    "Iron Humor": "Iron Humor",
    "Collar Echo": "Seal Echo",
    "Warrant Weather": "Warrant Weather",
    "Hard Mercy": "Hard Mercy",
    "Vermin Bargain": "Scav Bargain",
    "Quill's Aside": "Quill's Aside",
    "Cane Wind": "Stim Wind",
    "Binder Math": "Binder Math",
    "Flask Sermon": "Flask Sermon",
    "Yard Gossip": "Camp Gossip",
    "Seal Weather": "Seal Weather",
    "Powder Prayer": "Powder Prayer",
    "Stubborn Mile": "Stubborn Mile",
    "Ring Memory": "Meter Memory",
    "East Debt": "East Debt",
    "Dust Mile": "Dust Mile",
    "Quiet Counsel": "Quiet Counsel",
    "Ash Aside": "Brother Aside",
}

PREFIX = {
    4: "Chromeveil River",
    5: "Helix Gate",
    6: "House of Seals",
}

# Shared mile banks with chapter-flavored first lines mixed in rewrite_node via PREFIX
MILE = {
    "Trail Hygiene": [
        "Mud and chrome grit stick to boot treads like unpaid debt. You scrape barge grease off a blade and call it hygiene. Quill mutters that clean banks lie louder than dirty ones.",
        "A warrant nail bleeds resin where a SKU poster used to hang. The dog sniffs Dominion scent under river fog and will not look away.",
        "You wash stim-sweat and river slime off your wrists and pretend it was only work. East smells like ozone, flask heat, and unfinished names.",
    ],
    "Old Hunger": [
        "Hunger arrives wearing stim-sweat and old fight memory. Quill passes the flask once — chemical truth, not kindness. Your stomach remembers rations you cannot name.",
        "Old hunger is not food. It is the itch where a true name should sit. The dog eats first; brothers argue second; Quill drinks like punctuation.",
        "Rations taste like postponement and pepper. Somewhere a freehold sells forgetting by the tab. You buy steel instead.",
    ],
    "Callsign Thoughts": [
        "Callsigns feel safer than true names — and the spirits agree. Anchor, Edge, Signal: none fit until violence makes them stick.",
        "A freehold stamp would make you legal. A callsign makes you hunt. You choose the second and pretend it was always the plan.",
        "Cage-static still squeaks in the memory of your spine. Quill refuses to baptize you; the Neon Wilderland already did.",
    ],
    "SKU Weather": [
        "Under-skin itch flares when drones pass. The dog growls at empty air. Quill says that is how Project Pale says hello without introducing itself.",
        "SKU weather rolls east — barcodes in the fog, seals in the mud. A hanged scarecrow wears Vale’s check like a joke that landed.",
        "Somebody buried a whip and marked the dirt with hope. Quill mutters law under his breath like a man arguing with God and winning on technicalities.",
    ],
    "Steel Practice": [
        "Chrome blade, plasma pack, bone charm that whispers — drill until the three of you move like one wetwork cell that forgot its contract.",
        "Steel practice is Fight Club math without the club: hit, bleed, deny, hit again. Quill clocks the form and does not clap.",
        "Quill’s ruined hat casts a verdict-shaped shadow. His crossbow speaks better than sermons. Muscle memory answers for the blank mind.",
    ],
    "Night Watch": [
        "Night watch means listening for barge poles and Dominion boots. One brother counts exits without moving his head. The dog’s ears invent enemies first.",
        "Two riders tip hats too friendly for the hour. The Wilderland watches and keeps receipts in grit and neon.",
        "Crows argue over something dead you hope is not destiny. Quill drinks past midnight like punctuation with worse manners.",
    ],
    "Iron Humor": [
        "Iron humor is all you’ve got left that still cuts. Distant stim fields clap like soft applause for bad systems. Quill’s joke lands like a bolt.",
        "A dead mule teaches economics better than any clerk. You practice not answering to numbers. The road laughs wrong and keeps laughing.",
        "Paper freedom first — real freedom files later — don’t quit in between. East keeps yards that have not yet learned uprising arithmetic.",
    ],
    "Seal Echo": [
        "Seal echo is a ghost in the throat: old obedience trying to stand up. You spit it into mud and load the plasma pack.",
        "The neural-collar scar itches when scrap-wagons pass — muscle memory of inventory. Soft roads make soft seals again. You walk harder.",
        "Somewhere a spirit meter ticks like a second heart. Quill says ignore it until it starts naming you. Then kill whatever is speaking.",
    ],
    "Warrant Weather": [
        "Quill counts cartridges the way priests count sins — carefully, then drinks anyway. Warrant weather means someone east still thinks you are property with legs.",
        "Paper flutters on a data-spike. Three blank faces. The eyes are always wrong. You walk because quit is not a word you own.",
        "Halbrecht Quill lights a match off a warrant nail, drinks, and looks almost human — almost ready to spend truth about Project Pale.",
    ],
    "Hard Mercy": [
        "Hard mercy is leaving a slaver breathing with a warning carved into his chrome. Soft mercy is a sermon. You choose hard.",
        "Steel rides light; the flask in Quill’s coat does not. Dust and fog become companions with poor hygiene and worse jokes.",
        "Quill’s hat brim cuts the sun into a usable blade; the scarred eye does the rest. Mercy, he says, is a budget item — spend it when the dog says so.",
    ],
    "Scav Bargain": [
        "A scavenger offers stim tabs for a true name. You offer him a bruise and a rumor instead. Quill tips him a copper for the geography hidden in the greed.",
        "Trail tax kids sell water and buy stories about nameless men who would not quit. The bargain is always blood somewhere.",
        "Spirit-fog holograms flicker prices over your heads. Nobody buys. Everybody watches. The dog marks a post like a treaty.",
    ],
    "Quill's Aside": [
        "Quill’s aside is never soft: “Pretty country. Ugly ownership. Pass the damn bottle.” Fog still clings; whatever comes next washes harder than rain.",
        "He talks to the flask more than to you. The flask answers in stim-heat and ugly honesty. Mentors this rotten usually know the road.",
        "“I walk with lost men who can ruin the things that lost them,” he repeats, like liturgy with better ammo.",
    ],
    "Stim Wind": [
        "Stim wind tastes like coolant grit and pine ash. A winged silhouette crosses again — drone or wyrm, same omen: something big owns the skyline.",
        "Wind carries flask-heat and dragon-static farther than any honest voice. Helix Dominion tower-glow rides the east like a bruise.",
        "Fiber-vine scrub clicks like teeth. The wind brings cartel neon and a choir of static that wants your callsign for a fee.",
    ],
    "Binder Math": [
        "Binder math: three stubborn blanks plus one dog plus one drunk marshal equals a hunting party the road notices. Quill does not apologize for the arithmetic.",
        "He tallies ammo, stim tabs, and lies you still believe about yourselves. The sum is ugly. The sum walks east.",
        "Overseer laughter and server fans carry farther than hymns. Freedom still feels like hunger wearing better boots. Binder math says keep walking.",
    ],
    "Flask Sermon": [
        "Quill’s flask is chemical truth serum with worse manners. One sip and brother-sync feels like a remembered fight. Two sips and names start knocking.",
        "Stim sermon, whiskey chorus. He says Project Pale is a rumor with teeth. You feel the teeth in your blank spots.",
        "The flask sermon is short: don’t quit, don’t trust pretty towers, and don’t confuse loyalty with addiction — then he drinks again anyway.",
    ],
    "Camp Gossip": [
        "Camp gossip: lost brothers walk. Word travels usefully — maybe too usefully. Dominion ears grow in the underbrush.",
        "Somebody swears Helix Spire hangs rings by size, not by name. Quill drinks past it, scarred eye fixed east, and says only, “Then we learn loft latches.”",
        "A roadside shrine wears three callsigns and one empty nail. A burned SKU seal on a fence rail dares you to look away.",
    ],
    "Seal Weather": [
        "Seal weather rolls in like debt. Neural collars chirp in scav packs; spirit meters blink green for clean product. You are not clean. Good.",
        "Heat makes the dust itch like unfinished code. Eyes linger on blank faces the way buyers linger on mule teeth — and servers linger on fresh accounts.",
        "The stranger packs silence like powder — dry, useful, dangerous — and waits for the road to decide if you are prey, players, or both.",
    ],
    "Powder Prayer": [
        "Powder prayer is loading a plasma pack while pretending it is faith. The dog watches like a priest that bites.",
        "You pray with chrome and stubbornness. The Wilderland answers with fog that remembers your faces better than you do.",
        "A child’s chalk callsign on a fence post has already been scrubbed to static. Pretty country. Ugly ownership. Pass the damn bottle.",
    ],
    "Stubborn Mile": [
        "Stubborn mile: no map, no names, no permission. East is a black-glass rumor. You walk like you invented walking.",
        "Scavengers sell water and buy stories about nameless men who would not quit. You set your pace like brothers owed a past.",
        "Quill lights a match off a warrant nail wired into a data-spike, drinks, and looks almost human — almost ready to spend truth.",
    ],
    "Meter Memory": [
        "Meter memory: a tick behind the eyes when someone says a true name nearby. None of you have one yet. The dog does — and will not share.",
        "Wind carries dragon-static and spirit-meter hum. Continue — soft roads make soft seals again, even in chrome.",
        "Old rings and new collars rhyme. You kick a discarded spirit meter into the ditch and keep the itch as a compass.",
    ],
    "East Debt": [
        "East debt is not coin. It is Lyra Vale’s line on a ledger, Project Pale’s blank contracts, and a tower that sells who you were.",
        "Overseer laughter and server fans carry farther than any hymn on this road. Freedom still feels like hunger wearing better boots.",
        "Quill points east like a man accusing weather. Debt accumulates in silence. Brothers accumulate in violence.",
    ],
    "Dust Mile": [
        "Dust mile tastes like stim residue and river ash. Bootleather remembers every mile better than maps. Quit is not a word you own.",
        "Camp smoke writes temporary law across the scrub. You check for a brand, a barcode, a seal scar — and find only the itch of missing names.",
        "A hanged poster of three blank faces lies about the eyes — always the eyes. You walk because the alternative still smells like rust.",
    ],
    "Quiet Counsel": [
        "Quiet counsel is three brothers not saying we might not be brothers. Kinship feels true; proof does not. Quill lets the silence work.",
        "One brother hears dragon radio-chatter in the canopy. Another laughs once, then stops. The third checks the dog’s eyes for answers.",
        "You decide the only true thing left: stick together until the road spits out an answer or a corpse. Quietly. Violently if needed.",
    ],
    "Brother Aside": [
        "Brother aside: rage as compass, healer hands shaking, signal-static behind the eyes. The pack holds because quitting would be another wipe.",
        "One brother tastes copper on the wind and does not flinch. Spit misses by manners, not mercy. Paper in your coat weighs less than iron and more than sleep.",
        "You speak callsigns into the dark like passwords. The dog answers to none of them — and still walks first.",
    ],
}

# Chapter-flavored mile overlays (optional first body variant)
CH_FLAVOR = {
    4: {
        "Trail Hygiene": "Chromeveil mud sticks to chrome like unpaid debt. Spirit-jar residue glows faint green on your cuff. Quill mutters that clean banks lie louder than dirty ones.",
        "East Debt": "East debt is not coin. It is memory-solvent under canvas, Lyra Vale’s sale lot, and a river the freeholds refuse to see.",
        "Hard Mercy": "Hard mercy is cutting one ring and leaving ten for the map. Soft mercy is a sermon. The Chromeveil does not do soft.",
    },
    5: {
        "Trail Hygiene": "Gate neon sticks to chrome like unpaid debt. Spirit meters blink as you pass. Quill mutters that clean smiles lie louder than dirty knives.",
        "Seal Weather": "Seal weather rolls in like customs. Neural scans chirp; spirit meters blink green for clean product. You are not clean. Good.",
        "East Debt": "East debt is Helix Gate’s smile meter and Lyra Vale somewhere past the smoke. Quill points at the Spire like a man accusing weather.",
    },
    6: {
        "Trail Hygiene": "Guest-corridor polish sticks to chrome like unpaid debt. Numbered beds hum through the floor. Quill mutters that clean hospitality lies louder than dirty steel.",
        "Quiet Counsel": "Quiet counsel is three brothers not saying one of you may have volunteered for Pale. Kinship feels true; proof does not. Quill lets the silence work.",
        "Camp Gossip": "House gossip: sealed operators sleep above the mandolin court. Word travels usefully — maybe too usefully. Dominion ears grow in the walls.",
    },
}

SPECIAL = {
    # --- Ch4 ---
    "dt-ch04-001": {
        "title": "Mud Toll",
        "body": (
            "The Chromeveil River runs coolant-brown and dishonest — water that keeps secrets for a fee. "
            "Ferrymen charge more if your callsign seal looks fresh. Quill argues law until the poleman invents a new tax for arguing."
        ),
    },
    "dt-ch04-004": {
        "title": "Reed Confession",
        "body": (
            "A half-drowned sealed soul in the reeds begs you not to free him where horns can hear — he has family still under canvas. "
            "Mercy here has a schedule. Trafficking rot keeps better clocks than hope."
        ),
        "choices": {
            "ch4-reed-hide": {
                "label": "Hide him; free later",
                "approach": "Quiet mercy; accept unfinished liberation.",
                "outcome": {"text": "He names a landing knock. Quill files it under “expensive hope.”"},
            },
            "ch4-reed-cut": {
                "label": "Cut him free now",
                "approach": "Noise be damned; one less ring tonight.",
                "outcome": {"text": "Horns answer. You run with a living debt on your shoulder."},
            },
            "ch4-reed-info": {
                "label": "Buy info; leave him",
                "approach": "Ugly calculus — Lyra Vale’s map over one man’s night.",
                "success": {"text": "He hates you and still points true. Quill calls it binder math."},
                "fail": {"text": "He spits mud and silence. You leave poorer in every sense."},
            },
        },
    },
    "dt-ch04-005": {
        "title": "Canvas Hymn",
        "body": (
            "Under barge canvas someone hums a work song that is not work. It is inventory refusing the count. "
            "One brother hums one bar back — soft, criminal, necessary."
        ),
    },
    "dt-ch04-008": {
        "title": "Barge of Rings",
        "body": (
            "A flatboat floats quiet with chemical cargo and spirit-caged freight under canvas. Chains click like small clocks. "
            "Nobody on the near bank looks long enough to become responsible — freehold manners at their most polite."
        ),
    },
    "dt-ch04-011": {
        "title": "Mud Warrant",
        "body": (
            "Quill stamps a soaked warrant dry on his thigh and swears the Chromeveil invents new crimes just to stay relevant. "
            "“Alive if possible,” he reminds you. “Dead if the world insists. And if you smell memory-solvent, don’t breathe deep.”"
        ),
    },
    "dt-ch04-015": {
        "title": "Free or Follow?",
        "body": (
            "You can cut canvas tonight and spill rings into mud — noisy mercy — or track the barge to its Helix drop and learn routes. "
            "Quill’s face is a hung jury. Complicity tastes like river water either way."
        ),
        "choices": {
            "ch4-cut-canvas": {
                "label": "Cut the canvas; free who you can",
                "approach": "Immediate liberation; accept the horn that follows.",
                "outcome": {"text": "Mud takes chains; alarms take the night. You run with wet lungs and cleaner hands."},
            },
            "ch4-track-barge": {
                "label": "Track the drop point",
                "approach": "Intelligence first; rescue with a map.",
                "outcome": {"text": "You learn landing codes and a steward’s soft knock. Quill files both."},
            },
            "ch4-bribe-crew": {
                "label": "Bribe a poleman",
                "approach": "Buy mouths before buying blood.",
                "success": {"text": "He names Lyra Vale’s sale lot and looks away forever."},
                "fail": {"text": "He takes coin and shouts anyway. Spears bloom in reed."},
            },
        },
    },
    "dt-ch04-016": {
        "title": "Muck Spiders Ambush",
        "body": (
            "Powder grit under your nail smells like unfinished court. Spirit-fog webs the reeds. "
            "Then muck-spiders force the issue — a riverside lesson Quill refuses to skip."
        ),
        "enemy": "Muck Spiders",
        "enemyTheme": "muck-spiders",
    },
    "dt-ch04-022": {
        "title": "Muck Spiders",
        "body": (
            "Webs bridge reed to reed where screams go muffled. Muck-spiders drop like punctuation. "
            "Quill swears the Chromeveil invented these to keep honest ledgers dry and spirit jars sealed."
        ),
        "enemy": "Muck-Spider Nest",
        "enemyTheme": "muck-spiders",
    },
    "dt-ch04-029": {
        "title": "Drowned Page",
        "body": (
            "A ledger scrap surfaces against a snag, ink blurred but cruelly legible. "
            "Lyra Vale’s sale date sits beside “sealed operator, unbroken.” Memory-solvent stains the margins. "
            "You dry it on Quill’s hat brim like scripture that burns."
        ),
    },
    "dt-ch04-036": {
        "title": "Ring Count",
        "body": (
            "Through barge canvas you hear an overseer count rings the way other men count coins — lovingly, without names. "
            "Your callsign seal burns. Quill mouths, “Inventory night. Don’t become the joke.”"
        ),
    },
    "dt-ch04-037": {
        "title": "River Slavers Ambush",
        "body": (
            "East wind brings chemical lies and iron honesty in the same breath. A hanged poster of your face lies about the eyes — always the eyes. "
            "Then river slavers force the issue — a riverside lesson Quill refuses to skip."
        ),
        "enemy": "River Slavers",
        "enemyTheme": "river-slavers",
    },
    "dt-ch04-043": {
        "title": "Toll Orcs",
        "body": (
            "Spears demand tribute for pretending the river is free. The orcs wear Vale’s check like borrowed manners. "
            "Payment options: coin, blood, or a story they will not believe about blank-faced men."
        ),
        "enemy": "Toll-Orc Spears",
        "enemyTheme": "toll-orcs",
    },
    "dt-ch04-050": {
        "title": "Night Crossing",
        "body": (
            "Fog hides the middle; courage has to invent the far bank. Underwater, something spirit-shaped brushes your boot and offers a bargain you refuse — for now. "
            "You can pole a stolen skiff, swim the channels, or wait for a ferry that may already have sold your face."
        ),
        "choices": {
            "ch4-skiff": {
                "label": "Steal the skiff",
                "approach": "Quiet wood, loud conscience later.",
                "outcome": {"text": "Oars bite mud. The far bank arrives colder and closer."},
            },
            "ch4-swim": {
                "label": "Swim the channels",
                "approach": "Steel wrapped; breath measured.",
                "success": {"text": "Current loses the argument. Spirit-static kisses your ankles and lets go. You crawl out river-born and furious."},
                "fail": {"text": "Mud wins a round. Quill hauls you up coughing solvent and bile."},
            },
            "ch4-ferry-bluff": {
                "label": "Bluff the late ferry",
                "approach": "Papers, posture, and Quill’s worst smile.",
                "outcome": {"text": "The ferryman takes seals at face value. Fog forgives the lie."},
            },
        },
    },
    "dt-ch04-057": {
        "title": "Slaver Camp",
        "body": (
            "Tents circle a fire that cooks meat and bad bargains. Overseers dice for numbered rings and spirit-jar lots. "
            "You and Quill watch from willow cover while learning which tent snores loudest — and which crate sweats memory-solvent."
        ),
    },
    "dt-ch04-058": {
        "title": "Muck Spiders Ambush",
        "body": (
            "Night insects keep score of every secret step you still take. Warrant ink under your coat weighs more than the steel above it. "
            "Then muck-spiders force the issue — a riverside lesson Quill refuses to skip."
        ),
        "enemy": "Muck Spiders",
        "enemyTheme": "muck-spiders",
    },
    "dt-ch04-064": {
        "title": "Barge Troll",
        "body": (
            "A barge-troll wards the landing with a club bigger than courtesy. It does not care about callsigns — only about who touches rope without permission. "
            "Permission smells like blood and chemical freight."
        ),
        "enemy": "Barge Landing Troll",
        "enemyTheme": "barge-trolls",
    },
    "dt-ch04-071": {
        "title": "Far Bank Pact",
        "body": (
            "A kitchen sealed-soul slips the willow line and names three Helix landings used for “quiet cargo.” "
            "She asks only that if you enter the House of Seals, you leave a door unlocked behind you."
        ),
        "choices": {
            "ch4-promise-door": {
                "label": "Promise the unlocked door",
                "approach": "Bind your uprising to people already inside.",
                "outcome": {"text": "She vanishes like steam. Your map gains a conscience."},
            },
            "ch4-pay-only": {
                "label": "Pay silver; promise nothing",
                "approach": "Buy intel without owing a riot.",
                "outcome": {"text": "Coin changes hands. Trust does not."},
            },
            "ch4-bring-her": {
                "label": "Bring her west tonight",
                "approach": "Rescue one now; risk the camp waking.",
                "success": {"text": "Willow covers the escape. She walks free and gives better maps for it."},
                "fail": {"text": "A dog wakes. You both run; maps tear; freedom still sticks."},
            },
        },
    },
    "dt-ch04-078": {
        "title": "Helix Smoke",
        "body": (
            "Far-bank mud dries into road again. Helix Spire’s smoke finally has a direction you can walk. "
            "Quill oil-wipes his crossbow and says, almost kindly, “Gates smile. Don’t smile back.”"
        ),
    },
    "dt-ch04-079": {
        "title": "River Slavers Ambush",
        "body": (
            "Quill’s hat brim cuts the sun into a usable blade; the scarred eye does the rest. Continue is the only honest verb left — and one brother does not hesitate. "
            "Then river slavers force the issue — a riverside lesson Quill refuses to skip."
        ),
        "enemy": "River Slavers",
        "enemyTheme": "river-slavers",
    },
    # --- Ch5 ---
    "dt-ch05-001": {
        "title": "Gate Smile",
        "body": (
            "Helix Gate keeps grin for coin and drones for mercy — a smile with a spirit meter. "
            "Guards weigh your forged callsign like fruit and find it almost ripe. Quill tips his hat at the scan arch like a man tipping a snake."
        ),
    },
    "dt-ch05-004": {
        "title": "Steward's Smile",
        "body": (
            "A Helix steward offers “guest guidance” that is clearly a leash. He asks if you prefer the scenic stim-field walk or the efficient path past the seal yards. "
            "Quill’s eyes say both are traps; pick the useful one. Corp decadence begins with courtesy."
        ),
        "choices": {
            "ch5-scenic": {
                "label": "Take the scenic stim walk",
                "approach": "See the yards without admitting you came to burn them.",
                "outcome": {"text": "You memorize latch patterns disguised as tourism."},
            },
            "ch5-efficient": {
                "label": "Take the efficient path",
                "approach": "Closer to Lyra Vale; closer to dogs.",
                "outcome": {"text": "Mastiff-drones file your scent. Quill tips the steward like a man tipping a snake."},
            },
            "ch5-decline": {
                "label": "Decline — get lost on purpose",
                "approach": "Refuse the leash; invent your own map.",
                "outcome": {"text": "Schedules beat smiles. You ghost a service corridor Quill already bought."},
            },
        },
    },
    "dt-ch05-005": {
        "title": "Vale's Courtesy",
        "body": (
            "A steward practices Director Vale’s welcome speech on a mule. The mule looks unconvinced. "
            "Quill tips his hat at the animal. “Smartest guest here.”"
        ),
    },
    "dt-ch05-009": {
        "title": "False Papers",
        "body": (
            "A clerk wants provenance: who wiped you, who pays you, why you smell like river solvent. "
            "Spirit meters blink. Neural scans itch. Quill can talk, you can bluff muscle, or a greasy purse can invent ancestors."
        ),
        "choices": {
            "ch5-quill-talk": {
                "label": "Let Quill out-ink them",
                "approach": "Binder jargon as armor.",
                "outcome": {"text": "Stamps bloom. The gate forgets to be curious."},
            },
            "ch5-bribe-gate": {
                "label": "Pay the smile wider",
                "approach": "Coin translates faster than law.",
                "outcome": {"text": "Copper becomes welcome. Suspicion naps."},
            },
            "ch5-muscle-bluff": {
                "label": "Pose as Vale’s muscle",
                "approach": "Borrowed menace; careful posture.",
                "success": {"text": "They salute the wrong story. You walk in wearing it."},
                "fail": {"text": "The smile hardens. Quill buys the bruise with a bribe and a lie about river fog."},
            },
        },
    },
    "dt-ch05-012": {
        "title": "Seal Sunlight",
        "body": (
            "Afternoon light flashes off a yard of hanging rings like cheap jewelry for a god of inventory. "
            "Quill’s flask pauses mid-air. “Pretty,” he says. “We’re going to vandalize the arithmetic.”"
        ),
    },
    "dt-ch05-015": {
        "title": "War Mastiffs Ambush",
        "body": (
            "Wagon ruts braid into a grammar only hunters read fluently. False papers hold if courage holds their corners flat. "
            "Then war-mastiff drones force the issue — a gate lesson Quill refuses to skip."
        ),
        "enemy": "War Mastiffs",
        "enemyTheme": "war-mastiffs",
    },
    "dt-ch05-017": {
        "title": "Stim Fields",
        "body": (
            "Beyond the gate, stim fields move like punctuation under overseers’ grammar. Workers do not look up; looking up is how names become numbers. "
            "One brother rides the wind from dust to neon and refuses to bow."
        ),
    },
    "dt-ch05-025": {
        "title": "War Mastiffs",
        "body": (
            "War-mastiff drones learn callsign scent from posters. Handlers whistle a code that means inventory returning. "
            "Quill’s bolt answers the whistle first. Overhead, a dragon silhouette or bio-mech chassis cuts the smoke — leave it ambiguous."
        ),
        "enemy": "War-Mastiff Pair",
        "enemyTheme": "war-mastiffs",
    },
    "dt-ch05-033": {
        "title": "Guest Courtesy",
        "body": (
            "A steward offers wine that tastes like surveillance. Helix Gate’s guest wing is polite the way traps are polite. "
            "Quill toasts Director Vale’s health with a mouth that does not mean it. Transactional intimacy hums in the wallpaper — world texture, not the product."
        ),
    },
    "dt-ch05-040": {
        "title": "Gate Guards Ambush",
        "body": (
            "Fence wire hums a note that used to mean inventory. One brother learns freehold posture: chin up, exits counted, no bowing to seals. "
            "Then gate guards force the issue — a border lesson Quill refuses to skip."
        ),
        "enemy": "Gate Guards",
        "enemyTheme": "gate-guards",
    },
    "dt-ch05-041": {
        "title": "Yard Glimpse",
        "body": (
            "Past a trimmed hedge, neural collars flash in sunlight like cheap jewelry. Numbers march between posts. "
            "Somewhere in that grammar, Lyra Vale is still a sentence unfinished — sealed operator, pretty SKU."
        ),
    },
    "dt-ch05-049": {
        "title": "Quill Prices the Yard",
        "body": (
            "Quill estimates lock types, dog routes, and bribe windows the way other guests estimate wine. "
            "“Pretty inventory,” he drawls. “Ugly arithmetic. We break both before dessert.”"
        ),
    },
    "dt-ch05-055": {
        "title": "Mire Orcs Ambush",
        "body": (
            "Steel rides light; the flask in Quill’s coat does not. Memory of cages arrives uninvited, then leaves when named. "
            "Then mire orcs force the issue — a border lesson Quill refuses to skip."
        ),
        "enemy": "Mire Orcs",
        "enemyTheme": "mire-orcs",
    },
    "dt-ch05-057": {
        "title": "Name Denied",
        "body": (
            "No servant will say Lyra Vale — until a linen-girl mouths the syllables like a prayer under laundry. "
            "She will talk for a key, a promise, or a threat she can live with. Names are dangerous; she spends one anyway."
        ),
        "choices": {
            "ch5-key-trade": {
                "label": "Trade a key for the loft",
                "approach": "Buy her unlocking hope; get her map.",
                "outcome": {"text": "She names the sealed-operator loft above the Undervault pit."},
            },
            "ch5-soft-promise": {
                "label": "Promise her a west road",
                "approach": "Bind her future to your uprising.",
                "outcome": {"text": "Hope is currency here. She spends it on you carefully."},
            },
            "ch5-read-fear": {
                "label": "Read which fear rules her",
                "approach": "Wisdom over volume.",
                "success": {"text": "Overseer Gash terrifies her more than Vale. You get routes around him."},
                "fail": {"text": "You lean too hard; she flees. Quill still scrapes a half-map from her panic."},
            },
        },
    },
    "dt-ch05-065": {
        "title": "Wickernetic Sentries",
        "body": (
            "Wicker-and-iron wickernetic sentries pace the inner fence with swords that do not joke. "
            "Guests are allowed daylight gardens; night gardens bite. You chose night."
        ),
        "enemy": "Wickernetic Fence Sentries",
        "enemyTheme": "wicker-sentries",
    },
    "dt-ch05-073": {
        "title": "Quill's Wager",
        "body": (
            "Quill bets charm against Vale’s curiosity at a receiving table and loses nothing yet. "
            "Director Vale’s laugh is soft, expensive, and interested in novelty — which you are, until you become inventory again. "
            "A fourth blade watches from the column shadows: rival, defector, or both — Eric’s seat pressure, if the pack has room."
        ),
    },
    "dt-ch05-080": {
        "title": "Wickernetic Sentries Ambush",
        "body": (
            "Two riders tip hats too friendly for the hour. A joke dies mid-laugh when Vale’s check appears on a sleeve. "
            "Then wickernetic sentries force the issue — a border lesson Quill refuses to skip."
        ),
        "enemy": "Wickernetic Sentries",
        "enemyTheme": "wicker-sentries",
    },
    "dt-ch05-081": {
        "title": "Inner Fence",
        "body": (
            "Beyond hospitality, Helix Gate stops pretending. You can idle as guests and listen, volunteer for pit entertainment to get closer, "
            "or slip the seal yard tonight while Quill keeps Vale drinking."
        ),
        "choices": {
            "ch5-idle-listen": {
                "label": "Play guest; harvest rumor",
                "approach": "Patience over steel for one more night.",
                "outcome": {"text": "Rumors ripen. The House of Seals opens its dinner invitations."},
            },
            "ch5-volunteer-pit": {
                "label": "Volunteer for the Undervault pit",
                "approach": "Blood gets you nearer than manners.",
                "outcome": {"text": "Vale’s smile widens. The pit calendars your callsign."},
            },
            "ch5-slip-yard": {
                "label": "Slip the yard tonight",
                "approach": "Quill distracts; you count rings.",
                "success": {"text": "You mark Lyra Vale’s window by a blue ribbon no ledger ordered."},
                "fail": {"text": "Dogs almost invent you. You retreat with half a ribbon and a full pulse."},
            },
        },
    },
    "dt-ch05-089": {
        "title": "House Threshold",
        "body": (
            "Guest rooms overlook yards of rings, meters, and numbered beds. Friendship here is whispered at risk of skin. "
            "Quill sets two cups down and says, “Dinner with Vale is a battlefield with better silver.”"
        ),
    },
    # --- Ch6 ---
    "dt-ch06-001": {
        "title": "Dinner Seals",
        "body": (
            "Director Vale toasts guests while dessert plates hide ledgers like knives under napkins. "
            "His jokes inventory people without raising his voice — comedy as accounting. Surveillance intimacy: every smile is a meter reading."
        ),
    },
    "dt-ch06-004": {
        "title": "Kitchen Politics",
        "body": (
            "A cook with burn scars and perfect posture offers three lies to tell Vale at dessert — each buys a different key. "
            "“Pick wrong,” she says, “and you become the joke between courses.”"
        ),
        "choices": {
            "ch6-lie-novelty": {
                "label": "Lie: we’re novelty fighters",
                "approach": "Play to Vale’s vanity; stay invited.",
                "outcome": {"text": "She slips a gallery key into the bread. “Vanity opens doors.”"},
            },
            "ch6-lie-binder": {
                "label": "Lie: Quill’s still buying",
                "approach": "Speak binder language Vale understands.",
                "outcome": {"text": "Ledger key. Quill looks sick and grateful in equal measure."},
            },
            "ch6-lie-none": {
                "label": "Tell no dessert lies",
                "approach": "Refuse the kitchen’s theater; trust steel later.",
                "outcome": {"text": "She respects the refusal. “Then oil the latch yourself.”"},
            },
        },
    },
    "dt-ch06-005": {
        "title": "Lyra Through Glass",
        "body": (
            "For one breath the silhouette is surely her — chin, stubborn angle, the way she used to refuse to bow to weather. "
            "Lyra Vale, sealed operator, stolen fourth. Then fear invents doubles. You do not call out. Identity fracture starts with almost."
        ),
    },
    "dt-ch06-009": {
        "title": "Sealed Whisper",
        "body": (
            "A kitchen hand names rooms where sealed operators sleep locked — loft above the Undervault court, window latched from outside. "
            "Blue ribbon confirmed. Hope becomes architecture. One brother flinches like he remembers volunteering for Pale — or being volunteered."
        ),
    },
    "dt-ch06-012": {
        "title": "Guest Peg Sermon",
        "body": (
            "Quill counts neural-collar pegs in the guest corridor the way other men count rosaries. "
            "“Each ring is a name Vale filed wrong,” he murmurs. “We are the clerical error with teeth.”"
        ),
    },
    "dt-ch06-015": {
        "title": "Punishment Hounds Ambush",
        "body": (
            "Clouds drag shadows across stim-colored grass like slow warrants. One brother keeps count of locks without moving his mouth — guest manners. "
            "Then punishment-hounds force the issue — a house lesson Quill refuses to skip."
        ),
        "enemy": "Punishment Hounds",
        "enemyTheme": "punishment-hounds",
    },
    "dt-ch06-017": {
        "title": "Window Light",
        "body": (
            "A silhouette might be Lyra Vale — or hope wearing her outline and your fear doing the costuming. "
            "You can call soft, wait for Quill’s signal, or send the kitchen hand with a scrap of callsign ink as proof you are real and not another of Vale’s jokes."
        ),
        "choices": {
            "ch6-call-soft": {
                "label": "Call her name once",
                "approach": "Risk recognition; refuse anonymity.",
                "outcome": {"text": "The silhouette freezes, then taps twice. Recognition is a wound that heals right."},
            },
            "ch6-wait-signal": {
                "label": "Wait for Quill’s signal",
                "approach": "Discipline over longing.",
                "outcome": {"text": "Patience tastes bitter and wise. The plan stays intact."},
            },
            "ch6-send-proof": {
                "label": "Send callsign proof upstairs",
                "approach": "Let ink speak across latches.",
                "success": {"text": "She answers with a torn hem thread. The house has not broken all of her."},
                "fail": {"text": "A chambermaid intercepts. Quill invents a charming lie in time."},
            },
        },
    },
    "dt-ch06-025": {
        "title": "Overseer Gash",
        "body": (
            "An orc with a branded chain counts you like inventory returning. Overseer Gash smells river mud on your boots and callsign on your wrist. "
            "Conversation becomes geometry. Cruelty is the house dialect."
        ),
        "enemy": "Overseer Gash",
        "enemyTheme": "overseer-orcs",
    },
    "dt-ch06-033": {
        "title": "House Blades",
        "body": (
            "Courteous duelists practice ending conversations early in the gallery. They invite you as “sport between courses.” "
            "Quill declines for both of you with a smile that files a later warrant."
        ),
    },
    "dt-ch06-040": {
        "title": "Overseer Orcs Ambush",
        "body": (
            "Wagon ruts braid into a grammar only hunters read fluently. Quill’s scarred eye never quite closes on a lie — useful, exhausting, honest. "
            "Then overseer orcs force the issue — a house lesson Quill refuses to skip."
        ),
        "enemy": "Overseer Orcs",
        "enemyTheme": "overseer-orcs",
    },
    "dt-ch06-041": {
        "title": "Punishment Hounds",
        "body": (
            "Punishment-hounds are walked through guest corridors as reminder landscaping. One stops at your callsign seal and invents a theory. "
            "Theories here have teeth. Collars as kink-of-power metaphor — not erotica — just ownership breathing."
        ),
        "enemy": "Punishment Hounds",
        "enemyTheme": "punishment-hounds",
    },
    "dt-ch06-049": {
        "title": "Midnight Pact",
        "body": (
            "Sealed folk offer silence for a plan that includes them — keys, oil for hinges, and a refusal to leave anyone numbered behind. "
            "Quill warns that wide revolts are loud. Loud can still be right. Optional betrayal pressure: a fourth seat could sell this whisper."
        ),
        "choices": {
            "ch6-wide-revolt": {
                "label": "Promise the whole yard",
                "approach": "Liberation as plural or not at all.",
                "outcome": {"text": "Keys change religion. The house gains a second heartbeat."},
            },
            "ch6-narrow-extract": {
                "label": "Extract Lyra first",
                "approach": "Surgical rescue; uprising later.",
                "outcome": {"text": "The sealed folk help colder. Speed becomes your only apology."},
            },
            "ch6-quill-masks": {
                "label": "Let Quill forge guest masks",
                "approach": "Walk sealed folk out as “entertainment troupe.”",
                "success": {"text": "Paper costumes beat iron for one night. Hope rehearses."},
                "fail": {"text": "A steward almost catches the joke. You settle for quieter keys."},
            },
        },
    },
    "dt-ch06-056": {
        "title": "Punishment Hounds Ambush",
        "body": (
            "Clouds drag shadows across stim-colored grass like slow warrants. One brother learns freehold posture: chin up, exits counted, no bowing to seals. "
            "Then punishment-hounds force the issue — a house lesson Quill refuses to skip."
        ),
        "enemy": "Punishment Hounds",
        "enemyTheme": "punishment-hounds",
    },
    "dt-ch06-057": {
        "title": "Seal Yard",
        "body": (
            "Rings hang on pegs labeled with numbers older than mercy. You walk the yard as a “curious guest” while counting lock types. "
            "Somewhere a synth-mandolin practices daylight screams for tomorrow’s Undervault."
        ),
    },
    "dt-ch06-065": {
        "title": "Peg Theology",
        "body": (
            "Halbrecht Quill stops under a peg row and tips his ruined hat like a man in church. "
            "“Each ring is a name filed wrong,” he murmurs. “Tonight we become the clerical error. And one of you — don’t flinch — may have asked for Pale.”"
        ),
    },
    "dt-ch06-071": {
        "title": "Sealed Champions Ambush",
        "body": (
            "Two riders tip hats too friendly for the hour. Somewhere east, ink still invents people into inventory. "
            "Then sealed champions force the issue — a house lesson Quill refuses to skip."
        ),
        "enemy": "Sealed Champions",
        "enemyTheme": "collared-champions",
    },
    "dt-ch06-073": {
        "title": "Quill Unmasked",
        "body": (
            "At table, a rival binder recognizes Halbrecht Quill’s other name and smiles like a bill coming due. "
            "Director Vale watches the recognition with delighted hunger. Damage control is now a course."
        ),
        "choices": {
            "ch6-confess-binder": {
                "label": "Lean into the binder fame",
                "approach": "Own Quill’s legend; sell it as Vale’s amusement.",
                "outcome": {"text": "Vale laughs and invites “famous law” to the Undervault tomorrow."},
            },
            "ch6-duel-rival": {
                "label": "Challenge the rival’s tongue",
                "approach": "Steel etiquette as distraction.",
                "outcome": {"text": "Gallery applause covers a kitchen key exchange. Ugly elegance."},
            },
            "ch6-poison-talk": {
                "label": "Redirect with a worse rumor",
                "approach": "Invent another scandal for Vale’s curiosity.",
                "success": {"text": "Attention swivels. Quill’s name becomes yesterday’s spice."},
                "fail": {"text": "Vale likes both scandals. The pit invitation arrives anyway."},
            },
        },
    },
    "dt-ch06-081": {
        "title": "Mandolin Tomorrow",
        "body": (
            "Lanterns are hung over sand that already knows blood. Vale’s steward delivers silks for “honored fighters.” "
            "Quill folds the insult into a plan. Somewhere above, Lyra Vale waits behind a latch — and the Undervault waits under neon."
        ),
    },
    "dt-ch06-086": {
        "title": "Overseer Orcs Ambush",
        "body": (
            "A child’s chalk callsign on a fence post has already been scrubbed. Quill’s scarred eye never quite closes on a lie — useful, exhausting, honest. "
            "Then overseer orcs force the issue — a house lesson Quill refuses to skip."
        ),
        "enemy": "Overseer Orcs",
        "enemyTheme": "overseer-orcs",
    },
}

REPLACEMENTS = [
    (r"River of Brands", "Chromeveil River"),
    (r"Candlemire Gates", "Helix Gate"),
    (r"House of Collars", "House of Seals"),
    (r"Blood Mandolin", "the Undervault"),
    (r"blood mandolin", "Undervault"),
    (r"mandolin pit", "Undervault pit"),
    (r"mandolin court", "Undervault court"),
    (r"Chain-Road Dawn", "Woods Without Names"),
    (r"Chain-Road", "the nameless woods"),
    (r"Brand-River", "Chromeveil River"),
    (r"brand-river", "Chromeveil River"),
    (r"Candlemire", "Helix Spire"),
    (r"Cadlemire", "Helix Spire"),
    (r"Cade Mire", "Helix Dominion"),
    (r"Lord Cade", "Director Vale"),
    (r"Cade’s", "Vale’s"),
    (r"Cade's", "Vale’s"),
    (r"\bCade\b", "Vale"),
    (r"freemark", "callsign"),
    (r"Freemark", "Dustmarch"),
    (r"\bfreemen\b", "freehold folk"),
    (r"\bfreeman\b", "freehold man"),
    (r"\bFreeman\b", "Freehold man"),
    (r"song-thrall", "sealed operator"),
    (r"thrall brand", "SKU seal"),
    (r"\bthralls\b", "sealed folk"),
    (r"\bThralls\b", "Sealed folk"),
    (r"\bthrall\b", "sealed soul"),
    (r"\bThrall\b", "Sealed soul"),
    (r"collar-yard", "seal-yard"),
    (r"Collar-yard", "Seal-yard"),
    (r"collar yard", "seal yard"),
    (r"Collar yard", "Seal yard"),
    (r"Collar Yard", "Seal Yard"),
    (r"collar scar", "seal scar"),
    (r"collar ring", "neural-collar ring"),
    (r"Collared Champions", "Sealed Champions"),
    (r"collared champions", "sealed champions"),
    (r"soft collars", "soft seals"),
    (r"(?<![Nn]eural[- ])\bcollars\b", "neural collars"),
    (r"(?<![Nn]eural[- ])\bcollar\b", "neural collar"),
    (r"(?<![Nn]eural[- ])\bCollar\b", "Neural collar"),
    (r"Nine-Mark", "Pale-Mark"),
    (r"Wicker Fence Sentries", "Wickernetic Fence Sentries"),
    (r"Wicker Sentries", "Wickernetic Sentries"),
    (r"wicker-and-iron sentries", "wickernetic sentries"),
    (r"cane fields", "stim fields"),
    (r"Cane fields", "Stim fields"),
    (r"Cane Fields", "Stim Fields"),
    (r"cane walk", "stim walk"),
    (r"cane-colored", "stim-colored"),
    (r"cane smell", "stim grit"),
    (r"the cane smell", "the stim grit"),
    (r"\bAsh rolls\b", "One brother rolls"),
    (r"\bAsh keeps\b", "One brother keeps"),
    (r"\bAsh tastes\b", "One brother tastes"),
    (r"\bAsh learns\b", "One brother learns"),
    (r"\bAsh counts\b", "One brother counts"),
    (r"\bAsh sees\b", "One brother sees"),
    (r"\bAsh rides\b", "One brother rides"),
    (r"\bAsh sets\b", "One brother sets"),
    (r"\bAsh does\b", "One brother does"),
    (r"\bAsh hums\b", "One brother hums"),
    (r"Ash Aside", "Brother Aside"),
    (r"\bAsh\b", "one brother"),
    (r"Lyra’s", "Lyra Vale’s"),
    (r"Lyra's", "Lyra Vale’s"),
    (r"Lyra Vale Vale", "Lyra Vale"),
]

RELIEF = {
    4: "The Chromeveil tastes like iron, solvent, and relief.",
    5: "The Gate tastes like iron, neon, and relief.",
    6: "The House tastes like iron, silver, and relief.",
}

CH_META = {
    4: {
        "title": "Chromeveil River",
        "tagline": "Barges haul chemical cargo and spirit-caged freight across a river the freeholds refuse to see.",
        "enemyThemes": ["river-slavers", "barge-trolls", "muck-spiders", "toll-orcs"],
    },
    5: {
        "title": "Helix Gate",
        "tagline": "Director Vale’s border keeps smile for coin and drones for mercy; Lyra is somewhere past the smoke.",
        "enemyThemes": ["gate-guards", "mire-orcs", "war-mastiffs", "wicker-sentries"],
    },
    6: {
        "title": "House of Seals",
        "tagline": "Guest rooms overlook yards of rings and numbers; friendship here is whispered at risk of skin.",
        "enemyThemes": ["overseer-orcs", "house-blades", "punishment-hounds", "collared-champions"],
    },
}

MAP_BLURBS = {
    4: ("Chromeveil River", "Barges haul chemical cargo and spirit-caged freight the freeholds pretend not to see."),
    5: ("Helix Gate", "Border neon smiles for coin and drones for mercy."),
    6: ("House of Seals", "Guest suites over yards of rings, meters, and numbered beds."),
}


def apply_lex(s: str) -> str:
    out = s
    for pat, rep in REPLACEMENTS:
        out = re.sub(pat, rep, out)
    out = out.replace("a one brother", "one brother")
    out = out.replace("A one brother", "One brother")
    out = out.replace("Lyra Vale Vale", "Lyra Vale")
    out = out.replace("the the nameless woods", "the nameless woods")
    return out


def merge_choice_patch(choice: dict, patch: dict) -> None:
    for k, v in patch.items():
        if k in ("outcome", "success", "fail") and isinstance(v, dict):
            choice.setdefault(k, {}).update(v)
        else:
            choice[k] = v


def scrub_flag_echoes(node: dict) -> None:
    echoes = node.get("flagEchoes")
    if not isinstance(echoes, list):
        return
    for echo in echoes:
        if isinstance(echo, dict) and isinstance(echo.get("line"), str):
            echo["line"] = apply_lex(echo["line"])


def rewrite_node(node: dict, idx: int, chapter: int) -> dict:
    n = deepcopy(node)
    nid = n["id"]
    prefix = PREFIX[chapter]

    if nid in SPECIAL:
        spec = SPECIAL[nid]
        for k, v in spec.items():
            if k == "choices":
                by_id = {c["id"]: c for c in n.get("choices", [])}
                for cid, patch in v.items():
                    if cid in by_id:
                        merge_choice_patch(by_id[cid], patch)
            else:
                n[k] = v

    title = n.get("title") or ""
    old_prefixes = (
        "River of Brands:",
        "Candlemire Gates:",
        "House of Collars:",
    )
    for old_prefix in old_prefixes:
        if title.startswith(old_prefix):
            suffix_raw = title.split(":", 1)[1].strip()
            suffix = SUFFIX_MAP.get(suffix_raw, suffix_raw)
            n["title"] = f"{prefix}: {suffix}"
            if nid not in SPECIAL:
                flav = CH_FLAVOR.get(chapter, {}).get(suffix)
                bank = MILE.get(suffix) or []
                if flav and idx % 3 == 0:
                    n["body"] = flav
                elif bank:
                    n["body"] = bank[idx % len(bank)]
            break

    for field in ("title", "body", "enemy"):
        if isinstance(n.get(field), str):
            n[field] = apply_lex(n[field])

    for ch in n.get("choices") or []:
        for field in ("label", "approach"):
            if isinstance(ch.get(field), str):
                ch[field] = apply_lex(ch[field])
        for key in ("outcome", "success", "fail"):
            block = ch.get(key)
            if isinstance(block, dict) and isinstance(block.get("text"), str):
                block["text"] = apply_lex(block["text"])
                block["text"] = block["text"].replace(
                    "The road tastes like iron and relief.",
                    RELIEF[chapter],
                )

    scrub_flag_echoes(n)

    theme = n.get("enemyTheme")
    if theme == "wicker-sentries":
        enemy = n.get("enemy") or ""
        if "Wicker" in enemy and "Wickernetic" not in enemy:
            n["enemy"] = enemy.replace("Wicker", "Wickernetic")
    elif theme == "collared-champions":
        if n.get("enemy") in (None, "Collared Champions"):
            n["enemy"] = "Sealed Champions"

    if isinstance(n.get("body"), str):
        n["body"] = apply_lex(n["body"])
    if isinstance(n.get("enemy"), str):
        n["enemy"] = apply_lex(n["enemy"])

    return n


def update_chapters_json() -> None:
    data = json.loads(CHAPTERS.read_text())
    for ch in data["chapters"]:
        meta = CH_META.get(ch.get("chapter"))
        if meta:
            ch["title"] = meta["title"]
            ch["tagline"] = meta["tagline"]
            ch["enemyThemes"] = list(meta["enemyThemes"])
    CHAPTERS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def update_maps_blurbs() -> None:
    data = json.loads(MAPS.read_text())
    for r in data.get("regions", []):
        chap = r.get("chapter")
        if chap in MAP_BLURBS:
            name, blurb = MAP_BLURBS[chap]
            r["name"] = name
            r["blurb"] = blurb
    MAPS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def main() -> None:
    data = json.loads(SPINE.read_text())
    data["title"] = "Dungeons and Dogs: Lost Brothers"
    data["blurb"] = (
        "Adult R-rated pulp. Three amnesiac brothers and a dog wake in the Neon Wilderland — "
        "cyberpunk steel under a Middle-earth canopy, spirits in the fog, dragons on the ridgeline. "
        "Helix Dominion sells names; Project Pale wiped theirs. Chapters 1–6: Woods Without Names through "
        "House of Seals. Chapters 7–9 still await the next rewrite pass."
    )

    for ch in data["chapters"]:
        meta = CH_META.get(ch.get("chapter"))
        if meta:
            ch["title"] = meta["title"]
            ch["tagline"] = meta["tagline"]
            ch["enemyThemes"] = list(meta["enemyThemes"])

    counts = {4: 0, 5: 0, 6: 0}
    changed = {4: 0, 5: 0, 6: 0}

    for i, node in enumerate(data["nodes"]):
        nid = str(node.get("id", ""))
        chap = None
        if nid.startswith("dt-ch04-"):
            chap = 4
        elif nid.startswith("dt-ch05-"):
            chap = 5
        elif nid.startswith("dt-ch06-"):
            chap = 6
        if chap is None:
            continue
        counts[chap] += 1
        before = json.dumps(node, sort_keys=True)
        new_node = rewrite_node(node, i, chap)
        data["nodes"][i] = new_node
        if before != json.dumps(new_node, sort_keys=True):
            changed[chap] += 1

    stats = data.get("stats") or {}
    for row in stats.get("perChapter") or []:
        meta = CH_META.get(row.get("chapter"))
        if meta:
            row["title"] = meta["title"]
            row["enemyThemes"] = list(meta["enemyThemes"])
    data["stats"] = stats

    leftovers = []
    ban = (
        "Chain-Road",
        "thrall",
        "Candlemire",
        "Cadlemire",
        "Freemark",
        "freemark",
        "Lord Cade",
        "Nine-Mark",
        "River of Brands",
        "Candlemire Gates",
        "House of Collars",
        "Brand-River",
        "cane field",
        "collar-yard",
        "song-thrall",
        "Collared Champions",
    )
    for node in data["nodes"]:
        nid = str(node.get("id", ""))
        if not any(nid.startswith(p) for p in ("dt-ch04-", "dt-ch05-", "dt-ch06-")):
            continue
        blob = json.dumps(
            {
                "title": node.get("title"),
                "body": node.get("body"),
                "enemy": node.get("enemy"),
                "choices": node.get("choices"),
                "flagEchoes": node.get("flagEchoes"),
            }
        )
        for term in ban:
            if term in blob:
                leftovers.append((nid, term))

    SPINE.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    update_chapters_json()
    update_maps_blurbs()

    print(f"ch4 nodes: {counts[4]} changed: {changed[4]}")
    print(f"ch5 nodes: {counts[5]} changed: {changed[5]}")
    print(f"ch6 nodes: {counts[6]} changed: {changed[6]}")
    print(f"leftover term hits: {len(leftovers)}")
    for item in leftovers[:60]:
        print(" leftover", item)


if __name__ == "__main__":
    main()
