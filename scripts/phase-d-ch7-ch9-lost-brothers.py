#!/usr/bin/env python3
"""Phase D: rewrite Chapters 7–9 Lost Brothers prose + packaging.

Keeps node IDs / choice IDs / flags / art IDs / graph edges / enemyTheme IDs.
Spine + chapters.json only — do not touch world-map UI or combat death code.
Zero thrall in ch7–9 player-facing prose.
"""
from __future__ import annotations

import json
import re
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPINE = ROOT / "data/dungeon-tester/story-spine.json"
CHAPTERS = ROOT / "data/dungeon-tester/chapters.json"

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
    7: "The Undervault",
    8: "Spirefall Fields",
    9: "Ash Horizon",
}

MILE = {
    "Trail Hygiene": [
        "Pit grit sticks to chrome like unpaid debt. You scrape arena grease off a blade and call it hygiene. Quill mutters that clean sand lies louder than bloody sand.",
        "A warrant nail bleeds resin under gallery silk. The dog sniffs Dominion scent in the Undervault fog and will not look away.",
        "You wash stim-sweat and sand off your wrists and pretend it was only sport. East smells like neon, flask heat, and unfinished names.",
    ],
    "Old Hunger": [
        "Hunger arrives wearing stim-sweat and old fight memory — a body that once headlined for Helix under another name. Quill passes the flask once.",
        "Old hunger is not food. It is the itch where a true name should sit and the crowd already knows your ghost. The dog eats first; brothers argue second.",
        "Pit rations taste like postponement and pepper. Somewhere a freehold sells forgetting by the tab. You buy steel instead.",
    ],
    "Callsign Thoughts": [
        "Callsigns feel safer than true names — and the betting board agrees. Anchor, Edge, Signal: none fit until violence makes them stick.",
        "A freehold stamp would make you legal. A callsign makes you fight. You choose the second and pretend it was always the plan.",
        "Cage-static still squeaks in the memory of your spine. Quill refuses to baptize you; the Undervault already did — twice.",
    ],
    "SKU Weather": [
        "Under-skin itch flares when gallery drones pass. The dog growls at empty air. Quill says that is how Project Pale says hello without introducing itself.",
        "SKU weather rolls through the pits — barcodes in the fog, seals in the sand. A hanged scarecrow wears Vale’s check like a joke that landed.",
        "Somebody buried a whip and marked the dirt with hope. Quill mutters law under his breath like a man arguing with God and winning on technicalities.",
    ],
    "Steel Practice": [
        "Chrome blade, plasma pack, bone charm that whispers — drill until the three of you move like one wetwork cell that forgot its contract.",
        "Steel practice is Fight Club math with a paying crowd: hit, bleed, deny, hit again. Quill clocks the form and does not clap.",
        "Quill’s ruined hat casts a verdict-shaped shadow. His crossbow speaks better than sermons. Muscle memory answers for the blank mind.",
    ],
    "Night Watch": [
        "Night watch means listening for pit-champions and Vale’s soft applause. One brother counts exits without moving his head. The dog invents enemies first.",
        "Two riders tip hats too friendly for the hour. The Undervault watches and keeps receipts in grit and neon.",
        "Crows argue over something dead you hope is not destiny. Quill drinks past midnight like punctuation with worse manners.",
    ],
    "Iron Humor": [
        "Iron humor is all you’ve got left that still cuts. Distant stim fields clap like soft applause for bad systems. Quill’s joke lands like a bolt.",
        "A dead mule teaches economics better than any clerk. You practice not answering to numbers. The pit laughs wrong and keeps laughing.",
        "Paper freedom first — real freedom files later — don’t quit in between. East keeps yards that have not yet learned uprising arithmetic.",
    ],
    "Seal Echo": [
        "Seal echo is a ghost in the throat: old obedience trying to stand up. You spit it into sand and load the plasma pack.",
        "The neural-collar scar itches when scrap-wagons pass — muscle memory of inventory. Soft roads make soft seals again. You walk harder.",
        "Somewhere a spirit meter ticks like a second heart. Quill says ignore it until it starts naming you. Then kill whatever is speaking.",
    ],
    "Warrant Weather": [
        "Quill counts cartridges the way priests count sins — carefully, then drinks anyway. Warrant weather means someone still thinks you are property with legs.",
        "Paper flutters on a data-spike. Three blank faces. The eyes are always wrong. You walk because quit is not a word you own.",
        "Halbrecht Quill lights a match off a warrant nail, drinks, and looks almost human — almost ready to spend truth about Project Pale.",
    ],
    "Hard Mercy": [
        "Hard mercy is leaving a pit-runner breathing with a warning carved into his chrome. Soft mercy is a sermon. You choose hard.",
        "Steel rides light; the flask in Quill’s coat does not. Sand becomes a third companion with poor hygiene and worse jokes.",
        "Quill’s hat brim cuts the neon into a usable blade; the scarred eye does the rest. Mercy, he says, is a budget item — spend it when the dog says so.",
    ],
    "Scav Bargain": [
        "A scavenger offers stim tabs for a true name. You offer him a bruise and a rumor instead. Quill tips him a copper for the geography hidden in the greed.",
        "Trail tax kids sell water and buy stories about nameless men who would not quit. The bargain is always blood somewhere.",
        "Spirit-fog holograms flicker prices over your heads. Nobody buys. Everybody watches. The dog marks a post like a treaty.",
    ],
    "Quill's Aside": [
        "Quill’s aside is never soft: “Pretty country. Ugly ownership. Pass the damn bottle.” The Undervault still clings; whatever comes next washes harder than rain.",
        "He talks to the flask more than to you. The flask answers in stim-heat and ugly honesty. Mentors this rotten usually know the pits.",
        "“I walk with lost men who can ruin the things that lost them,” he repeats, like liturgy with better ammo.",
    ],
    "Stim Wind": [
        "Stim wind tastes like coolant grit and gallery perfume. A winged silhouette crosses the fog — drone or wyrm, same omen.",
        "Wind carries flask-heat and dragon-static farther than any honest voice. Helix Spire tower-glow rides the east like a bruise.",
        "Fiber-vine scrub clicks like teeth. The wind brings Vale’s neon and a choir of static that wants your callsign for a fee.",
    ],
    "Binder Math": [
        "Binder math: three stubborn blanks plus one dog plus one drunk marshal equals a hunting party the pits notice. Quill does not apologize for the arithmetic.",
        "He tallies ammo, stim tabs, and lies you still believe about yourselves. The sum is ugly. The sum walks east — or WEST.",
        "Overseer laughter and server fans carry farther than hymns. Freedom still feels like hunger wearing better boots. Binder math says keep walking.",
    ],
    "Flask Sermon": [
        "Quill’s flask is chemical truth serum with worse manners. One sip and brother-sync feels like a remembered fight. Two sips and names start knocking.",
        "Stim sermon, whiskey chorus. He says Project Pale is a rumor with teeth. You feel the teeth in your blank spots — and in the crowd’s memory of you.",
        "The flask sermon is short: don’t quit, don’t trust pretty towers, and don’t confuse a gallery’s lust for blood with love — then he drinks again anyway.",
    ],
    "Camp Gossip": [
        "Camp gossip: lost brothers walk — and once fought here under other names. Word travels usefully — maybe too usefully. Dominion ears grow in the underbrush.",
        "Somebody swears Helix Spire hangs rings by size, not by name. Quill drinks past it, scarred eye fixed on the loft latch.",
        "A roadside shrine wears three callsigns and one empty nail. A burned SKU seal on a fence rail dares you to look away.",
    ],
    "Seal Weather": [
        "Seal weather rolls in like debt. Neural collars chirp in scav packs; spirit meters blink green for clean product. You are not clean. Good.",
        "Heat makes the dust itch like unfinished code. Eyes linger on blank faces the way buyers linger on mule teeth — and servers linger on fresh accounts.",
        "The stranger packs silence like powder — dry, useful, dangerous — and waits for the pits to decide if you are prey, players, or both.",
    ],
    "Powder Prayer": [
        "Powder prayer is loading a plasma pack while pretending it is faith. The dog watches like a priest that bites.",
        "You pray with chrome and stubbornness. The Undervault answers with fog that remembers your faces better than you do.",
        "A child’s chalk callsign on a fence post has already been scrubbed to static. Pretty country. Ugly ownership. Pass the damn bottle.",
    ],
    "Stubborn Mile": [
        "Stubborn mile: no map, no names, no permission. East is a black-glass rumor with neon bets. You walk like you invented walking.",
        "Scavengers sell water and buy stories about nameless men who would not quit. You set your pace like brothers owed a past.",
        "Quill lights a match off a warrant nail wired into a data-spike, drinks, and looks almost human — almost ready to spend truth.",
    ],
    "Meter Memory": [
        "Meter memory: a tick behind the eyes when someone says a true name nearby. None of you have one yet. The dog does — and will not share.",
        "Wind carries dragon-static and spirit-meter hum. Continue — soft roads make soft seals again, even in chrome.",
        "Old rings and new seals rhyme. You kick a discarded spirit meter into the ditch and keep the itch as a compass.",
    ],
    "East Debt": [
        "East debt is not coin. It is Lyra Vale’s line on a ledger, Project Pale’s blank contracts, and a tower that sells who you were.",
        "Overseer laughter and server fans carry farther than any hymn on this road. Freedom still feels like hunger wearing better boots.",
        "Quill points east like a man accusing weather. Debt accumulates in silence. Brothers accumulate in violence.",
    ],
    "Dust Mile": [
        "Dust mile tastes like stim residue and pit ash. Bootleather remembers every mile better than maps. Quit is not a word you own.",
        "Camp smoke writes temporary law across the scrub. You check for a brand, a barcode, a seal scar — and find only the itch of missing names.",
        "A hanged poster of three blank faces lies about the eyes — always the eyes. You walk because the alternative still smells like rust.",
    ],
    "Quiet Counsel": [
        "Quiet counsel is three brothers not saying we might not be brothers — and not saying we once bled for Helix’s applause. Quill lets the silence work.",
        "One brother hears dragon radio-chatter in the canopy. Another laughs once, then stops. The third checks the dog’s eyes for answers.",
        "You decide the only true thing left: stick together until the road spits out an answer or a corpse. Quietly. Violently if needed.",
    ],
    "Brother Aside": [
        "Brother aside: rage as compass, healer hands shaking, signal-static behind the eyes. The pack holds because quitting would be another wipe.",
        "One brother tastes copper on the wind and does not flinch. Spit misses by manners, not mercy. Paper in your coat weighs less than iron and more than sleep.",
        "You speak callsigns into the dark like passwords. The dog answers to none of them — and still walks first.",
    ],
}

CH_FLAVOR = {
    7: {
        "Trail Hygiene": "Undervault grit sticks to chrome like unpaid debt. Synth-mandolin resin glows faint red on your cuff. Quill mutters that clean sand lies louder than bloody sand.",
        "Old Hunger": "Old hunger is Fight Club math: you once headlined these pits under other names. The crowd remembers; you don’t — yet. Quill passes the flask once.",
        "Camp Gossip": "Pit gossip: sealed operators sleep above the mandolin court. WEST is a rumor with a pulse. Dominion ears grow in the gallery silk.",
    },
    8: {
        "Trail Hygiene": "Spirefall ash sticks to chrome like unpaid debt. Seal-rings litter the mud like bad punctuation corrected. Quill mutters that clean towers lie louder than burning ones.",
        "Hard Mercy": "Hard mercy is cutting one seal and leaving ten for the map. Soft mercy is a sermon. Spirefall Fields does not do soft.",
        "East Debt": "East debt is Helix Spire’s Pale core — restore a name or overwrite it forever. Revolution has a body count the brothers own.",
    },
    9: {
        "Trail Hygiene": "Ash Horizon dust sticks to chrome like unpaid debt. Remnant coin still buys late knives. Quill mutters that clean roads lie louder than haunted ones.",
        "Quiet Counsel": "Quiet counsel is three brothers not saying freedom is a practice, not a flag. Names return incomplete. Quill lets the silence work.",
        "Brother Aside": "Brother aside: sober vs doped freedom arguing in the same skull. The pack holds because quitting would be another wipe — and the horizon is watching.",
    },
}

SPECIAL = {
    # --- Ch7 The Undervault ---
    "dt-ch07-001": {
        "title": "Mandolin Hour",
        "body": (
            "Music keeps time so the crowd can clap on the bleeding without missing dessert. "
            "Helix sport pits fighters under neon while a synth-mandolin sweetens the accounting. "
            "Your callsign is the evening’s insult — and Quill’s face from the bench is an unauthorized prayer."
        ),
    },
    "dt-ch07-004": {
        "title": "Crowd Favor",
        "body": (
            "Between bouts the crowd throws coin, flowers, and a blue ribbon that means “keep this one alive.” "
            "Quill mouths: take it, refuse it, or throw it to the sealed row."
        ),
        "choices": {
            "ch7-take-ribbon": {
                "label": "Keep the blue ribbon",
                "approach": "Accept spectacle’s mercy as camouflage.",
                "outcome": {"text": "Vale claps. The loft latch gets one more song of cover."},
            },
            "ch7-refuse-ribbon": {
                "label": "Refuse the ribbon",
                "approach": "Deny the gallery the right to own your pulse.",
                "outcome": {"text": "Boos. Quill smiles with half his mouth. Allies in the dark notice."},
            },
            "ch7-pass-ribbon": {
                "label": "Throw it to the sealed row",
                "approach": "Turn favor into revolt signal.",
                "outcome": {"text": "A champion catches it. WEST becomes a rumor with a pulse."},
            },
        },
    },
    "dt-ch07-005": {
        "title": "Mandolin Insult",
        "body": (
            "The synth-mandolin player finds a key that makes callsigns sound funny. Vale laughs on the beat. "
            "Quill’s jaw ticks once. “After,” he mouths. After means fire."
        ),
    },
    "dt-ch07-009": {
        "title": "Pit Call",
        "body": (
            "The ringmaster offers styles like a tailor of violence: spectacle for Vale, clean efficiency for survivors, "
            "or a thrown fight that buys sealed folk whispering time. Quill cannot enter the sand with you — only counsel. "
            "“Pick the lie that frees the most mouths,” he mouths."
        ),
        "choices": {
            "ch7-spectacle": {
                "label": "Fight loud for Vale’s vanity",
                "approach": "Earn favor and a longer leash.",
                "outcome": {"text": "The gallery loves a show. Vale throws a key as a tip — toward the wrong door on purpose."},
            },
            "ch7-efficient": {
                "label": "End it clean and fast",
                "approach": "Conserve blood for the revolt.",
                "outcome": {"text": "Sand accepts silence. Sealed folk notice professionalism."},
            },
            "ch7-throw-signal": {
                "label": "Sell a near-fall as cover",
                "approach": "Buy seconds for hinge-oil upstairs.",
                "success": {"text": "You “stumble”; locks drink oil; Lyra Vale’s latch softens."},
                "fail": {"text": "The stumble becomes real. You win uglier and later."},
            },
        },
    },
    "dt-ch07-012": {
        "title": "Sand Catechism",
        "body": (
            "Between bouts Quill leans close enough for whiskey and law. “Spectacle is a leash,” he says. "
            "“Bleed for cover if you must — bleed for quitters never — and WEST is the only hymn worth learning.”"
        ),
    },
    "dt-ch07-015": {
        "title": "Spectating Knights Ambush",
        "body": (
            "The Wilderland files today’s silence under “pending violence.” Quill mutters law under his breath like a protective curse, then swears for emphasis. "
            "Lyra Vale’s quiet ticks quieter than a clock and louder than leftover fear. "
            "Then spectating knights force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Spectating Knights",
    },
    "dt-ch07-017": {
        "title": "Sealed Champion",
        "body": (
            "A sealed fighter studies you like a door he might open. His eyes ask whether tonight is theater or exit. "
            "Vale wants him dead for drama; the yard wants him alive for dawn."
        ),
        "enemy": "Sealed Pit Champion",
    },
    "dt-ch07-025": {
        "title": "Champion Ring",
        "body": (
            "After the fall, the champion mouths one word under the mandolin’s cover: WEST. You nod once. "
            "Revolts sometimes begin as vocabulary — Fight Club thesis with a pulse."
        ),
    },
    "dt-ch07-032": {
        "title": "Arena Trolls Ambush",
        "body": (
            "A neural-collar ring half-buried in mud still remembers a neck. One brother refuses to romanticize the road; the road returns the favor. "
            "Continue — soft roads make soft seals again. Then arena trolls force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Arena Trolls",
    },
    "dt-ch07-033": {
        "title": "Arena Troll",
        "body": (
            "Vale raises stakes with an arena-troll dyed for pageantry. Neon lanterns sway. "
            "Quill’s face from the gallery is a prayer that refuses to look like one."
        ),
        "enemy": "Arena Pageant Troll",
    },
    "dt-ch07-041": {
        "title": "Quill's Tell",
        "body": (
            "Quill’s calm cracks when Vale jokes about sealed operators as after-dinner harmony. "
            "Vale smells leverage and smiles wider. You can escalate, soothe, or drop the lantern signal early."
        ),
        "choices": {
            "ch7-escalate": {
                "label": "Answer Vale in the sand",
                "approach": "Public scorn as a fuse.",
                "outcome": {"text": "The crowd hushes wrong. Vale’s amusement sharpens into attention."},
            },
            "ch7-soothe": {
                "label": "Soothe with false humility",
                "approach": "Buy hours; spend pride.",
                "outcome": {"text": "Vale drinks the humility. Quill regains his mask."},
            },
            "ch7-lantern-early": {
                "label": "Drop the lantern signal now",
                "approach": "Start the revolt while eyes are on the pit.",
                "success": {"text": "Light becomes a language. Keys move in dark rows."},
                "fail": {"text": "A sentry catches the throw. You salvage chaos instead of choreography."},
            },
        },
    },
    "dt-ch07-048": {
        "title": "Vale Favorites Ambush",
        "body": (
            "Two riders tip hats too friendly for the hour. Quill mutters law under his breath like a protective curse, then swears for emphasis. "
            "You walk on because stopping is how numbers return. Then Vale’s favorites force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Vale Favorites",
    },
    "dt-ch07-049": {
        "title": "Lantern Drop",
        "body": (
            "Whether early or on cue, light becomes the first honest signal. Kitchen oil meets latch; seals open like bad punctuation corrected. "
            "The synth-mandolin skips — and the crowd remembers it has legs."
        ),
    },
    "dt-ch07-057": {
        "title": "WEST Hymn",
        "body": (
            "Somewhere in the sealed row a voice mouths WEST like a complete battle plan. "
            "Quill’s scarred eye finds yours across sand and silk. “That’s the hymn,” he mouths back. "
            "“Bleed for that — not for Vale’s applause.”"
        ),
    },
    "dt-ch07-063": {
        "title": "Pit Champions Ambush",
        "body": (
            "Pit legends step from the fog smelling of old contracts and newer bets. "
            "Muscle memory flinches toward their stance — you once fought *for* Helix under other names. "
            "Then pit champions force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Pit Champions",
    },
    "dt-ch07-065": {
        "title": "Vale Favorites",
        "body": (
            "Spectating knights decide entertainment includes killing the encore. "
            "Vale’s favorites draw steel meant for applause. Sand becomes a road."
        ),
        "enemy": "Vale's Gallery Favorites",
    },
    "dt-ch07-073": {
        "title": "Crowd Turn",
        "body": (
            "Spectators are people when the music skips. You can urge them into the yard revolt, "
            "hold a corridor for sealed exit, or cut straight for Lyra Vale’s loft while Quill holds Vale’s eye."
        ),
        "choices": {
            "ch7-yard-surge": {
                "label": "Surge the seal yard",
                "approach": "Turn the crowd into weather.",
                "outcome": {"text": "Keys become weather. Helix Spire learns a different crop."},
            },
            "ch7-hold-corridor": {
                "label": "Hold the exit corridor",
                "approach": "Steel becomes a doorframe.",
                "outcome": {"text": "Steel becomes a doorframe. People pass through you into west air."},
            },
            "ch7-loft-now": {
                "label": "Take the song loft now",
                "approach": "Lyra Vale first; the yard second.",
                "outcome": {"text": "Stairs taste like iron and almost-home. The ribbon latch yields."},
            },
        },
    },
    "dt-ch07-080": {
        "title": "Vale Favorites Ambush",
        "body": (
            "The Wilderland files today’s silence under “pending violence.” Freedom still feels like hunger wearing better boots. "
            "You keep moving because rust has a longer memory than rest — and quit is not a word you own. "
            "Then Vale’s favorites force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Vale Favorites",
    },
    # --- Ch8 Spirefall Fields ---
    "dt-ch08-001": {
        "title": "Cage Keys",
        "body": (
            "Keys change hands in darkness thick as stim smoke and sweeter than any guest wine. "
            "Rings fall off wrists like rain that refused to wait for seasons. "
            "Helix Spire’s polite fiction burns at the edges while Quill files the night under “personal.”"
        ),
    },
    "dt-ch08-004": {
        "title": "Which Fire First?",
        "body": (
            "Barracks, tower records, or stim sheds — three fires, one night. "
            "Lyra Vale wants records; Quill wants barracks; freed sealed folk want the grid that fed the house. "
            "One brother gets one match’s worth of authorship."
        ),
        "choices": {
            "ch8-fire-records": {
                "label": "Burn the tower records",
                "approach": "Kill the inventory before it regenerates.",
                "outcome": {"text": "Paper screams prettier than men. Ledgers learn mortality."},
            },
            "ch8-fire-barracks": {
                "label": "Burn the barracks",
                "approach": "Cut orders off at the throat.",
                "outcome": {"text": "Orders die mid-shout. Quill files the smell under “justice.”"},
            },
            "ch8-fire-cane": {
                "label": "Burn the stim sheds",
                "approach": "Starve the house of chemical sugar.",
                "outcome": {"text": "Stim smoke. Children cheer like the world invented joy."},
            },
        },
    },
    "dt-ch08-009": {
        "title": "Barracks Burn",
        "body": (
            "Chrome-orc quarters learn fire faster than orders. Elite riders try to form a line through smoke that refuses to salute. "
            "Quill shouts landing codes as if they were hymns."
        ),
        "enemy": "Elite Chrome-Orc Line",
    },
    "dt-ch08-017": {
        "title": "Lyra Found",
        "body": (
            "Recognition hits like a wound that heals wrong and right at once. Lyra Vale is thinner, unbroken in the ways that matter, "
            "and already helping others with the latch like she never stopped being free in secret. "
            "She asks if you came as freehold man or as storm — and she does not make it sound like a poem."
        ),
        "choices": {
            "ch8-freeman-answer": {
                "label": "I came as freehold for you",
                "approach": "Name the personal debt first.",
                "outcome": {"text": "She laughs once — rusty, real. “Then we leave together and take whoever fits.”"},
            },
            "ch8-storm-answer": {
                "label": "I came as storm for all of this",
                "approach": "Revolution before reunion.",
                "outcome": {"text": "She nods like a warrant closing. “Good. Vale still breathes.”"},
            },
            "ch8-ask-her": {
                "label": "Ask what she needs first",
                "approach": "Let her set the true north.",
                "outcome": {"text": "“Keys for the east loft, then Vale’s stair,” she says. Command fits her."},
            },
        },
    },
    "dt-ch08-024": {
        "title": "Burning Tower Guards Ambush",
        "body": (
            "Tower glass rains like expensive hail. Helix Spire’s Pale core hums somewhere above — restore or overwrite, same machine. "
            "Then burning tower guards force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Burning Tower Guards",
    },
    "dt-ch08-025": {
        "title": "Warg Cavalry",
        "body": (
            "Vale’s warg cavalry tries to stitch the uprising shut with teeth. Freed fighters invent spears from curtain rods. "
            "The stim field becomes a battlefield that finally chooses a side."
        ),
        "enemy": "Warg Cavalry Wing",
    },
    "dt-ch08-040": {
        "title": "Helix Host Ambush",
        "body": (
            "Night insects keep score of every secret step you still take. Warrant ink under your coat weighs more than the steel above it. "
            "Quill packs what remains of professional calm into a ruined hat. "
            "Then the Helix host force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Helix Host",
    },
    "dt-ch08-041": {
        "title": "Choice of Fire",
        "body": (
            "Burn the house that sealed the region — or bind Director Vale for freehold trial and leave the stones standing. "
            "The yard’s noise is a jury already half decided. Revolution has a body count either way."
        ),
        "choices": {
            "ch8-bind-cade": {
                "label": "Bind Vale for trial",
                "approach": "Seals become handcuffs; smoke stays optional.",
                "outcome": {"text": "Seals become handcuffs. Smoke stays optional."},
            },
            "ch8-burn-house": {
                "label": "Burn Helix Spire’s heart",
                "approach": "Hard Reset takes attendance.",
                "outcome": {"text": "Flames rewrite the skyline. Hard Reset takes attendance."},
            },
            "ch8-cade-duel": {
                "label": "End him yourself",
                "approach": "Personal steel for a personal ledger.",
                "outcome": {"text": "Vale’s last smile fails. The stair remembers a different owner."},
            },
        },
    },
    "dt-ch08-049": {
        "title": "Burning Tower Guards",
        "body": (
            "Whether fire or manacles, loyalists make a last perimeter on the stair. "
            "Tower guards prefer dying useful to dying free. You disagree efficiently."
        ),
        "enemy": "Burning Tower Guard",
    },
    "dt-ch08-064": {
        "title": "Elite Orcs Ambush",
        "body": (
            "Steel rides light; the flask in Quill’s coat does not. You spit iron taste and keep walking like authorship, not cargo. "
            "One brother sets the pace like a man owed a name and too stubborn to renegotiate. "
            "Then elite chrome-orcs force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Elite Chrome-Orcs",
    },
    "dt-ch08-073": {
        "title": "Smoke Clearing",
        "body": (
            "Helix Spire’s sky tries on a color without orders. Remnant hunters will follow. "
            "Quill asks whether you scatter west tonight or hold the freehold ground and teach it new laws at dawn."
        ),
        "choices": {
            "ch8-scatter-west": {
                "label": "Scatter west before remnant hunt",
                "approach": "Dust takes attendance; the Spire becomes a warning.",
                "outcome": {"text": "Dust takes attendance. Helix Spire shrinks behind you into a warning."},
            },
            "ch8-hold-ground": {
                "label": "Hold and found a freehold",
                "approach": "Hammers claim the yard.",
                "outcome": {"text": "Hammers claim the yard. Dawn becomes a construction problem."},
            },
            "ch8-hunt-remnants": {
                "label": "Hunt Vale’s last riders first",
                "approach": "Warrants write themselves in smoke.",
                "outcome": {"text": "Warrants write themselves in smoke. The horizon waits cleaner."},
            },
        },
    },
    "dt-ch08-079": {
        "title": "Burning Tower Guards Ambush",
        "body": (
            "East wind brings stim lies and iron honesty in the same breath. Vale’s smile attempts management mid-fall — adorable, doomed. "
            "You spit iron taste and keep the callsign seal facing out. "
            "Then burning tower guards force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Burning Tower Guards",
    },
    # --- Ch9 Ash Horizon ---
    "dt-ch09-001": {
        "title": "Remnant Hunters",
        "body": (
            "Coins still buy chases after a house falls — ledgers outlive directors if you let them. "
            "Remnant hunters wear Vale’s check like mourning clothes with knives. "
            "The Wilderland offers little cover and less sympathy; Quill offers powder and a ruined hat tip."
        ),
    },
    "dt-ch09-004": {
        "title": "Warning the Next Vale",
        "body": (
            "A charming freehold captain offers to “organize” the march into something efficient — seals, schedules, soft chains for “safety.” "
            "Lyra Vale goes still. Quill waits for your veto."
        ),
        "choices": {
            "ch9-veto-soft": {
                "label": "Veto him kindly",
                "approach": "Mercy with a shadow.",
                "outcome": {"text": "He leaves smiling. Someone will watch him anyway."},
            },
            "ch9-veto-hard": {
                "label": "Veto him publicly",
                "approach": "Teach the march a new swear.",
                "outcome": {"text": "The march learns a new swear: never Vale. Quill almost applauds."},
            },
            "ch9-veto-exile": {
                "label": "Exile him from the column",
                "approach": "Mercy has edges.",
                "outcome": {"text": "He rides alone into remnant country. Mercy has edges."},
            },
        },
    },
    "dt-ch09-009": {
        "title": "Storm Wargs",
        "body": (
            "Storm-wargs ride the ash like weather with teeth. Names return incomplete on the wind — freedom is a practice, not a flag. "
            "Then the pack force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Storm-Warg Pack",
    },
    "dt-ch09-012": {
        "title": "Quiet Inventory",
        "body": (
            "You count living names the way Vale once counted rings — and stop when the list becomes a cage of its own. "
            "Lyra Vale nods. Quill drinks to the refusal. West weather asks nothing sealed of anyone."
        ),
    },
    "dt-ch09-017": {
        "title": "Counsel of Dust",
        "body": (
            "Quill asks what kind of freehold you will refuse to become — soft enough to be eaten, hard enough to invent new seals, "
            "or something that stays watchful without becoming Vale in callsign paint."
        ),
        "choices": {
            "ch9-refuse-soft": {
                "label": "Stay soft enough to shelter",
                "approach": "Mercy as strategy, not naivety.",
                "outcome": {"text": "Quill files the answer under possible futures."},
            },
            "ch9-refuse-hard": {
                "label": "Stay hard enough to deter",
                "approach": "Teeth without inventory.",
                "outcome": {"text": "Lyra Vale nods. “Deterrence without ledgers. We can try.”"},
            },
            "ch9-refuse-cade": {
                "label": "Swear not to become Vale",
                "approach": "Name the failure mode aloud.",
                "outcome": {"text": "The vow sits on the trail like a third companion."},
            },
        },
    },
    "dt-ch09-024": {
        "title": "Last Enforcers Ambush",
        "body": (
            "The road offers a fork that is really a dare. Mercy, fire, and shared dawn wait like weather you finally choose. "
            "Far off, iron complains one last time and goes quiet. "
            "Then last enforcers force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Last Enforcers",
    },
    "dt-ch09-025": {
        "title": "Lyra's Quiet",
        "body": (
            "She speaks of mornings that do not require permission — water, work, and names said for joy instead of inventory. "
            "The quiet is not emptiness. It is a blueprint."
        ),
    },
    "dt-ch09-033": {
        "title": "Last Enforcement",
        "body": (
            "Vale’s final loyalists demand an ending in steel — not for him, for the idea that numbers outrank people. "
            "Last enforcers make theology with blades. You answer in callsign grammar."
        ),
        "enemy": "Last Enforcers",
    },
    "dt-ch09-041": {
        "title": "Hard Road",
        "body": (
            "Justice unfinished walks beside you like a second shadow. Some freed marchers peel toward kin; some stay. "
            "Quill counts both without writing anyone down."
        ),
    },
    "dt-ch09-048": {
        "title": "Memory Shades Ambush",
        "body": (
            "Wind carries iron smell farther than any honest voice. Continue is the only honest verb left, and even it hesitates — one brother does not. "
            "Memory-shades wear your old faces — the pit names Helix sold. "
            "Then they force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Memory Shades",
    },
    "dt-ch09-049": {
        "title": "Marshal Without a Seal",
        "body": (
            "Someone tries to hand Quill a callsign seal “for order.” He refuses like plague, flask already half-empty. "
            "“I hunt binders,” he tells the column. “I don’t become one with prettier stationery. These freehold men won’t quit — follow that.”"
        ),
    },
    "dt-ch09-057": {
        "title": "Memory Shades",
        "body": (
            "At a crossroads shrine, memory itself seems to ask whether you bury Helix Spire’s name, museum it as warning, "
            "or rebuild over its footprint until children forget the smell of rings."
        ),
        "choices": {
            "ch9-bury-name": {
                "label": "Bury the name",
                "approach": "Let the house become unmarked dirt.",
                "outcome": {"text": "Forgetting as mercy — debated, chosen."},
            },
            "ch9-museum-warn": {
                "label": "Keep it as warning",
                "approach": "Tell the story until it cannot recruit.",
                "outcome": {"text": "Quill smiles like a teacher with better books."},
            },
            "ch9-rebuild-over": {
                "label": "Rebuild over the footprint",
                "approach": "Inhabit the wound until it is a kitchen.",
                "outcome": {"text": "Lyra Vale likes kitchens better than monuments."},
            },
        },
    },
    "dt-ch09-063": {
        "title": "Remnant Hunters Ambush",
        "body": (
            "Quill hums a tune that never finishes the same way twice. Dust becomes a third companion with poor hygiene and worse jokes. "
            "Dust keeps the books; blood settles the accounts. "
            "Then remnant hunters force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Remnant Hunters",
    },
    "dt-ch09-065": {
        "title": "Remnant Coin",
        "body": (
            "A last purse of Vale’s coin hires desperate blades on the western track. "
            "Mark-hunters who missed earlier chapters arrive late and louder. Dust settles the debate."
        ),
        "enemy": "Late Mark-Hunters",
    },
    "dt-ch09-073": {
        "title": "Ash Horizon",
        "body": (
            "The frame opens onto sky without chimneys writing orders on it. One brother and Lyra Vale stand in weather that asks no seal. "
            "Quill waits without advising — binder to the end, friend on purpose."
        ),
    },
    "dt-ch09-080": {
        "title": "Horizon Vote",
        "body": (
            "Helix Spire’s smoke thins behind you like a bad religion losing believers. "
            "Quill waits without advising — the highest respect he knows — flask quiet for once. "
            "Lyra Vale’s quiet is not emptiness; it is a question about what kind of free you will be. "
            "“Don’t quit the ending,” he finally drawls. “Endings are where quitters hide.”"
        ),
        "choices": {
            "end-mercy": {
                "label": "Take the merciful road",
                "approach": "Leave leftover justice to other hunters; walk west.",
                "outcome": {
                    "text": "The Wilderland softens half a degree. Not forgiveness — room to walk without a seal on the skyline."
                },
            },
            "end-justice": {
                "label": "Finish hard reset",
                "approach": "Burn what remains of Vale’s legal skin.",
                "outcome": {
                    "text": "Fire writes the last ledger. Names stop being inventory, and smoke becomes the receipt."
                },
            },
            "end-shared": {
                "label": "Found a shared dawn",
                "approach": "Stay and build a freehold that keeps no seals.",
                "outcome": {
                    "text": "Hammers replace seals. Quill files a warrant against slavery itself — and stays to enforce it."
                },
            },
        },
    },
    "dt-ending-merciful": {
        "title": "The Quiet Path",
        "body": (
            "The brothers walk out without burning the world that forgot them — woods, spirits, and neon left standing."
        ),
    },
    "dt-ending-justice": {
        "title": "Hard Reset",
        "body": (
            "Helix Spire’s last seals blacken. Hard Reset is a fire that warms freed hands and frightens soft thieves. "
            "You do not apologize for the smoke — and Quill does not ask you to. Dragons and drones both remember the fire."
        ),
    },
    "dt-ending-shared": {
        "title": "Shared Dawn",
        "body": (
            "Three brothers and their pack forge a freehold where steel, spirits, and dogs share one sky — no seals, no Pale."
        ),
    },
}

REPLACEMENTS = [
    (r"Blood Mandolin", "The Undervault"),
    (r"Liberation March", "Spirefall Fields"),
    (r"Free Horizon", "Ash Horizon"),
    (r"Chain-Road Dawn", "Woods Without Names"),
    (r"Chain-Road", "the nameless woods"),
    (r"Candlemire", "Helix Spire"),
    (r"Cadlemire", "Helix Spire"),
    (r"Cade Mire", "Helix Dominion"),
    (r"Lord Cade", "Director Vale"),
    (r"Cade’s", "Vale’s"),
    (r"Cade's", "Vale’s"),
    (r"\bCade\b", "Vale"),
    (r"Brand-River", "Chromeveil River"),
    (r"brand-river", "Chromeveil River"),
    (r"freemark", "callsign"),
    (r"Freemark", "Dustmarch"),
    (r"Freeman Mark", "Callsign Seal"),
    (r"freeman mark", "callsign seal"),
    (r"freeman glyph", "callsign seal"),
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
    (r"collar scar", "seal scar"),
    (r"Collar scar", "Seal scar"),
    (r"collar ring", "neural-collar ring"),
    (r"collared row", "sealed row"),
    (r"Collared row", "Sealed row"),
    (r"collared fighter", "sealed fighter"),
    (r"Collared Pit Champion", "Sealed Pit Champion"),
    (r"Collared Champion", "Sealed Champion"),
    (r"soft collars", "soft seals"),
    (r"(?<![Nn]eural[- ])\bcollars\b", "neural collars"),
    (r"(?<![Nn]eural[- ])\bcollar\b", "neural collar"),
    (r"(?<![Nn]eural[- ])\bCollar\b", "Neural collar"),
    (r"Nine-Mark", "Pale-Mark"),
    (r"cane fields", "stim fields"),
    (r"Cane fields", "Stim fields"),
    (r"Cane Fields", "Stim Fields"),
    (r"cane sheds", "stim sheds"),
    (r"cane smoke", "stim smoke"),
    (r"cane field", "stim field"),
    (r"cane-smelling", "stim-smelling"),
    (r"cane smell", "stim grit"),
    (r"cane wind", "stim wind"),
    (r"Cane Wind", "Stim Wind"),
    (r"ox-wains", "scrap-wagons"),
    (r"Cade Favorites", "Vale Favorites"),
    (r"Cade's Gallery Favorites", "Vale's Gallery Favorites"),
    (r"Cade Host", "Helix Host"),
    (r"cade favorites", "Vale favorites"),
    (r"cade host", "Helix host"),
    (r"Hard Justice", "Hard Reset"),
    (r"\bAsh rolls\b", "One brother rolls"),
    (r"\bAsh keeps\b", "One brother keeps"),
    (r"\bAsh tastes\b", "One brother tastes"),
    (r"\bAsh learns\b", "One brother learns"),
    (r"\bAsh counts\b", "One brother counts"),
    (r"\bAsh sees\b", "One brother sees"),
    (r"\bAsh burns\b", "One brother burns"),
    (r"\bAsh sets\b", "One brother sets"),
    (r"\bAsh rides\b", "One brother rides"),
    (r"\bAsh does\b", "One brother does"),
    (r"\bAsh hums\b", "One brother hums"),
    (r"\bAsh and Lyra\b", "One brother and Lyra Vale"),
    (r"Ash Aside", "Brother Aside"),
    (r"\bAsh\b", "one brother"),
    (r"Lyra’s", "Lyra Vale’s"),
    (r"Lyra's", "Lyra Vale’s"),
    (r"Lyra Vale Vale", "Lyra Vale"),
]

RELIEF = {
    7: "The Undervault tastes like iron, neon, and relief.",
    8: "Spirefall tastes like iron, ash, and relief.",
    9: "The Ash Horizon tastes like iron, wind, and relief.",
}

CH_META = {
    7: {
        "title": "The Undervault",
        "tagline": "Helix sport pits fighters under neon while a synth-mandolin keeps time with screams.",
        "enemyThemes": [
            "pit-champions",
            "arena-trolls",
            "spectating-knights",
            "cade-favorites",
        ],
    },
    8: {
        "title": "Spirefall Fields",
        "tagline": "Seals crack. Towers burn. The grid that grew stim and code learns a different crop: uprising.",
        "enemyThemes": [
            "cade-host",
            "elite-orcs",
            "burning-tower-guards",
            "warg-cavalry",
        ],
    },
    9: {
        "title": "Ash Horizon",
        "tagline": "Roads west remember every foot that left a seal behind — and ask what a returned name costs next.",
        "enemyThemes": [
            "remnant-hunters",
            "storm-wargs",
            "last-enforcers",
            "memory-shades",
        ],
    },
}

PROTECTED_KEYS = {
    "id",
    "next",
    "nextNodeId",
    "sceneId",
    "artId",
    "enemyArtId",
    "splashArtId",
    "endingId",
    "flagsAdd",
    "requireFlag",
    "stat",
    "dc",
    "chapter",
    "kind",
    "version",
    "startNodeId",
    "nodeIds",
    "generatedAt",
    "enemyTheme",
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
        "Blood Mandolin:",
        "Liberation March:",
        "Free Horizon:",
        "The Undervault:",
        "Spirefall Fields:",
        "Ash Horizon:",
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
    if theme == "cade-favorites":
        enemy = n.get("enemy") or ""
        n["enemy"] = apply_lex(enemy) if enemy else "Vale Favorites"
        if "Cade" in (n.get("enemy") or ""):
            n["enemy"] = (n["enemy"] or "").replace("Cade", "Vale")
    elif theme == "cade-host":
        n["enemy"] = "Helix Host"
    elif theme == "pit-champions":
        enemy = n.get("enemy") or "Pit Champions"
        n["enemy"] = apply_lex(enemy)
    elif theme == "elite-orcs":
        enemy = n.get("enemy") or "Elite Chrome-Orcs"
        if "Chrome" not in enemy:
            n["enemy"] = enemy.replace("Elite Orcs", "Elite Chrome-Orcs").replace(
                "Elite Orc", "Elite Chrome-Orc"
            )

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
    # endings packaging
    for ending in data.get("endings") or []:
        if ending.get("id") == "ending-hard-justice":
            ending["title"] = "Hard Reset"
            ending["blurb"] = (
                "They torch the systems that stole their names; dragons and drones both remember the fire."
            )
        elif ending.get("id") == "ending-merciful-road":
            ending["title"] = "The Quiet Path"
            ending["blurb"] = (
                "The brothers walk out without burning the world that forgot them — woods, spirits, and neon left standing."
            )
        elif ending.get("id") == "ending-shared-dawn":
            ending["title"] = "Shared Dawn"
            ending["blurb"] = (
                "Three brothers and their pack forge a freehold where steel, spirits, and dogs share one sky — no seals, no Pale."
            )
    CHAPTERS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def main() -> None:
    data = json.loads(SPINE.read_text())
    data["title"] = "Dungeons and Dogs: Lost Brothers"
    data["blurb"] = (
        "Adult R-rated pulp. Three amnesiac brothers and a dog wake in the Neon Wilderland — "
        "cyberpunk steel under a Middle-earth canopy, spirits in the fog, dragons on the ridgeline. "
        "Helix Dominion sells names; Project Pale wiped theirs. Full campaign: Woods Without Names through "
        "Ash Horizon — Undervault pits, Spirefall uprising, and the road that asks what a returned name costs."
    )

    for ch in data["chapters"]:
        meta = CH_META.get(ch.get("chapter"))
        if meta:
            ch["title"] = meta["title"]
            ch["tagline"] = meta["tagline"]
            ch["enemyThemes"] = list(meta["enemyThemes"])

    for ending in data.get("endings") or []:
        if ending.get("id") == "ending-hard-justice":
            ending["title"] = "Hard Reset"
            ending["blurb"] = (
                "They torch the systems that stole their names; dragons and drones both remember the fire."
            )

    counts = {7: 0, 8: 0, 9: 0}
    changed = {7: 0, 8: 0, 9: 0}

    for i, node in enumerate(data["nodes"]):
        nid = str(node.get("id", ""))
        chap = None
        if nid.startswith("dt-ch07-"):
            chap = 7
        elif nid.startswith("dt-ch08-"):
            chap = 8
        elif nid.startswith("dt-ch09-"):
            chap = 9
        elif nid.startswith("dt-ending-"):
            # endings remapped via SPECIAL + lex
            before = json.dumps(node, sort_keys=True)
            new_node = deepcopy(node)
            if nid in SPECIAL:
                for k, v in SPECIAL[nid].items():
                    new_node[k] = v
            for field in ("title", "body"):
                if isinstance(new_node.get(field), str):
                    new_node[field] = apply_lex(new_node[field])
            data["nodes"][i] = new_node
            continue
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
        "Thrall",
        "Candlemire",
        "Cadlemire",
        "Freemark",
        "freemark",
        "Lord Cade",
        "Nine-Mark",
        "Blood Mandolin",
        "Liberation March",
        "Free Horizon",
        "Brand-River",
        "cane field",
        "collar-yard",
        "song-thrall",
        "Cade Favorites",
        "Cade Host",
        "Hard Justice",
    )
    for node in data["nodes"]:
        nid = str(node.get("id", ""))
        if not (
            nid.startswith("dt-ch07-")
            or nid.startswith("dt-ch08-")
            or nid.startswith("dt-ch09-")
            or nid.startswith("dt-ending-")
        ):
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

    print(f"ch7 nodes: {counts[7]} changed: {changed[7]}")
    print(f"ch8 nodes: {counts[8]} changed: {changed[8]}")
    print(f"ch9 nodes: {counts[9]} changed: {changed[9]}")
    print(f"leftover term hits: {len(leftovers)}")
    for item in leftovers[:80]:
        print(" leftover", item)


if __name__ == "__main__":
    main()
