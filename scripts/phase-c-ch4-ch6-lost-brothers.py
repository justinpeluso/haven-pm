#!/usr/bin/env python3
"""Phase C: rewrite Chapters 4–6 Lost Brothers prose + packaging.

Chromeveil River / Helix Gate / House of Seals per story bible.
Keeps node IDs / choice IDs / flags / art IDs / graph edges.
Rewrites titles, bodies, choice labels/approaches/outcome text,
enemy display names, flagEcho lines. Updates spine chapter meta + blurb.
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


def mile_bank(region: str) -> dict[str, list[str]]:
    """Chapter-flavored mile bodies keyed by remapped suffix."""
    r = region
    return {
        "Trail Hygiene": [
            f"{r} grit sticks to chrome like unpaid debt. One brother scrapes barge grease off a blade and calls it hygiene. Quill mutters that clean water lies louder than muddy.",
            f"A warrant nail bleeds resin where a SKU poster used to hang. The dog sniffs Dominion scent under {r} fog and will not look away.",
            f"You wash stim-sweat and river-mud off your wrists and pretend it was only work. East smells like ozone, flask heat, and unfinished names.",
        ],
        "Old Hunger": [
            f"Hunger arrives wearing stim-sweat and old fight memory. Quill passes the flask once — chemical truth, not kindness. Your stomach remembers rations you cannot name.",
            f"Old hunger is not food. It is the itch where a true name should sit. The dog eats first; brothers argue second; Quill drinks like punctuation.",
            f"{r} rations taste like postponement and pepper. Somewhere a stim-den freehold sells forgetting by the tab. You buy steel instead.",
        ],
        "Callsign Thoughts": [
            "Callsigns feel safer than true names — and the spirits agree. Anchor, Edge, Signal: none fit until violence makes them stick.",
            "A freehold stamp would make you legal. A callsign makes you hunt. You choose the second and pretend it was always the plan.",
            "Cage-static still squeaks in the memory of your spine. Quill refuses to baptize you; the Neon Wilderland already did.",
        ],
        "SKU Weather": [
            "Under-skin itch flares when drones pass. The dog growls at empty air. Quill says that is how Project Pale says hello without introducing itself.",
            "SKU weather rolls east — barcodes in the fog, seals in the dust. A hanged scarecrow wears Vale’s check like a joke that landed.",
            "Somebody buried a whip and marked the dirt with hope. Quill mutters law under his breath like a man arguing with God and winning on technicalities.",
        ],
        "Steel Practice": [
            "Chrome blade, plasma pack, bone charm that whispers — drill until the three of you move like one wetwork cell that forgot its contract.",
            "Steel practice is Fight Club math without the club: hit, bleed, deny, hit again. Quill clocks the form and does not clap.",
            "Quill’s ruined hat casts a verdict-shaped shadow. His crossbow speaks better than sermons. Muscle memory answers for the blank mind.",
        ],
        "Night Watch": [
            f"Night watch means listening for river horns and Dominion boots. One brother counts exits without moving his head. The dog’s ears invent enemies first.",
            f"Two riders tip hats too friendly for the hour. {r} watches and keeps receipts in grit and neon.",
            "Crows argue over something dead you hope is not destiny. Quill drinks past midnight like punctuation with worse manners.",
        ],
        "Iron Humor": [
            "Iron humor is all you’ve got left that still cuts. Distant stim fields clap like soft applause for bad systems. Quill’s joke lands like a bolt.",
            "A dead mule teaches economics better than any clerk. You practice not answering to numbers. The Wilderland laughs wrong and keeps laughing.",
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
            "Hard mercy is leaving a barge cutter breathing with a warning carved into his chrome. Soft mercy is a sermon. You choose hard.",
            "Steel rides light; the flask in Quill’s coat does not. Fog becomes a third companion with poor hygiene and worse jokes.",
            "Quill’s hat brim cuts the sun into a usable blade; the scarred eye does the rest. Mercy, he says, is a budget item — spend it when the dog says so.",
        ],
        "Scav Bargain": [
            "A scavenger offers stim tabs for a true name. You offer him a bruise and a rumor instead. Quill tips him a copper for the geography hidden in the greed.",
            "Trail tax kids sell water and buy stories about nameless men who would not quit. The bargain is always blood somewhere.",
            "Spirit-fog holograms flicker prices over your heads. Nobody buys. Everybody watches. The dog marks a fence post like a treaty.",
        ],
        "Quill's Aside": [
            f"Quill’s aside is never soft: “Pretty country. Ugly ownership. Pass the damn bottle.” {r} still clings; whatever comes next washes harder than rain.",
            "He talks to the flask more than to you. The flask answers in stim-heat and ugly honesty. Mentors this rotten usually know the road.",
            "“I walk with lost men who can ruin the things that lost them,” he repeats, like liturgy with better ammo.",
        ],
        "Stim Wind": [
            "Stim wind tastes like coolant grit and pine ash. A winged silhouette crosses the fog again — drone or wyrm, same omen: something big owns the skyline.",
            "Wind carries flask-heat and dragon-static farther than any honest voice. Helix Dominion tower-glow rides the east like a bruise.",
            "Fiber-vine scrub clicks like teeth. The wind brings cartel neon and a choir of static that wants your callsign for a fee.",
        ],
        "Binder Math": [
            "Binder math: three stubborn blanks plus one dog plus one drunk marshal equals a hunting party the Neon Wilderland notices. Quill does not apologize for the arithmetic.",
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
            "You pray with chrome and stubbornness. Fog answers with faces you remember better than you remember yourselves.",
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
            "Old rings and new neural collars rhyme. You kick a discarded spirit meter into the ditch and keep the itch as a compass.",
        ],
        "East Debt": [
            "East debt is not coin. It is Lyra Vale’s line on a ledger, Project Pale’s blank contracts, and a tower that sells who you were.",
            "Overseer laughter and server fans carry farther than any hymn on this road. Freedom still feels like hunger wearing better boots.",
            "Quill points east like a man accusing weather. Debt accumulates in silence. Brothers accumulate in violence.",
        ],
        "Dust Mile": [
            f"Dust mile tastes like stim residue and {r.lower()} fog. Bootleather remembers every mile better than maps. Quit is not a word you own.",
            "Camp smoke writes temporary law across the scrub. You check for a brand, a barcode, a seal scar — and find only the itch of missing names.",
            "A hanged poster of three blank faces lies about the eyes — always the eyes. You walk because the alternative still smells like rust.",
        ],
        "Quiet Counsel": [
            "Quiet counsel is three brothers not saying we might not be brothers. Kinship feels true; proof does not. Quill lets the silence work.",
            "One brother hears dragon radio-chatter in the fog. Another laughs once, then stops. The third checks the dog’s eyes for answers.",
            "You decide the only true thing left: stick together until the east spits out an answer or a corpse. Quietly. Violently if needed.",
        ],
        "Brother Aside": [
            "Brother aside: rage as compass, healer hands shaking, signal-static behind the eyes. The pack holds because quitting would be another wipe.",
            "One brother tastes copper on the wind and does not flinch. Dominion spit misses by manners, not mercy. Paper in your coat weighs less than iron and more than sleep.",
            "You speak callsigns into the dark like passwords. The dog answers to none of them — and still walks first.",
        ],
    }


CH4_MILE = mile_bank("Chromeveil")
CH5_MILE = mile_bank("Helix Gate")
CH6_MILE = mile_bank("House of Seals")

SPECIAL = {
    # --- Chapter 4: Chromeveil River ---
    "dt-ch04-001": {
        "title": "Mud Toll",
        "body": (
            "The Chromeveil River runs neon-brown and dishonest — water that keeps secrets for a fee. "
            "Ferrymen charge more if your callsign seal looks fresh. Quill argues law until the price drops to merely insulting, "
            "then tips like a man buying silence, not passage."
        ),
    },
    "dt-ch04-004": {
        "title": "Reed Confession",
        "body": (
            "A half-drowned sealed soul in the reeds begs you not to free him where horns can hear — "
            "he has family still under canvas. Mercy here has a schedule."
        ),
        "choices": {
            "ch4-reed-hide": {
                "label": "Hide him; free later",
                "approach": "Quiet mercy; accept unfinished liberation.",
                "outcome": {
                    "text": "He names a landing knock. Smoke-code. Quill files it under “expensive hope.”",
                },
            },
            "ch4-reed-cut": {
                "label": "Cut him free now",
                "approach": "Noise be damned; one less ring tonight.",
                "outcome": {
                    "text": "Horns answer. You run with a living debt on your shoulder and coolant on your boots.",
                },
            },
            "ch4-reed-info": {
                "label": "Buy info; leave him",
                "approach": "Ugly calculus — Lyra Vale’s map over one man’s night.",
                "success": {
                    "text": "He hates you and still points true. Quill calls it binder math.",
                },
                "fail": {
                    "text": "He spits chrome-mud and silence. You leave poorer in every sense.",
                },
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
            "A flatboat floats quiet with iron inventory and spirit-caged jars under canvas. Chains click like small clocks. "
            "Nobody on the near bank looks long enough to become responsible."
        ),
    },
    "dt-ch04-011": {
        "title": "Mud Warrant",
        "body": (
            "Quill stamps a soaked warrant dry on his thigh and swears the Chromeveil invents new crimes just to stay relevant. "
            "“Alive if possible,” he reminds you. “Dead if the mud insists on being itself.”"
        ),
    },
    "dt-ch04-015": {
        "title": "Free or Follow?",
        "body": (
            "You can cut canvas tonight and spill rings into mud — noisy mercy — or track the barge to its Helix drop "
            "and learn routes. Quill’s face is a hung jury."
        ),
        "choices": {
            "ch4-cut-canvas": {
                "label": "Cut the canvas; free who you can",
                "approach": "Immediate liberation; accept the horn that follows.",
                "outcome": {
                    "text": "Mud takes chains; alarms take the night. You run with wet lungs and cleaner hands.",
                },
            },
            "ch4-track-barge": {
                "label": "Track the drop point",
                "approach": "Intelligence first; rescue with a map.",
                "outcome": {
                    "text": "You learn landing codes and a steward’s soft knock. Quill files both toward Helix Gate.",
                },
            },
            "ch4-bribe-crew": {
                "label": "Bribe a poleman",
                "approach": "Buy mouths before buying blood.",
                "success": {
                    "text": "He names Lyra Vale’s sale lot and looks away forever.",
                },
                "fail": {
                    "text": "He takes coin and shouts anyway. Spears bloom in reed.",
                },
            },
        },
    },
    "dt-ch04-016": {
        "title": "Muck Spiders Ambush",
        "body": (
            "Powder grit under your nail smells like unfinished court. A scav kid offers directions priced in half-truths. "
            "Quill salutes the undone work with whiskey and a brim. Then muck spiders force the issue — "
            "a riverside lesson Quill refuses to skip."
        ),
        "enemy": "Muck Spiders",
    },
    "dt-ch04-022": {
        "title": "Muck Spiders",
        "body": (
            "Webs bridge reed to reed where screams go muffled. Muck-spiders drop like punctuation over spirit-jar crates. "
            "Quill swears the Chromeveil invented these to keep honest ledgers dry."
        ),
        "enemy": "Muck-Spider Nest",
    },
    "dt-ch04-029": {
        "title": "Drowned Page",
        "body": (
            "A ledger scrap surfaces against a snag, ink blurred but cruelly legible. Lyra Vale’s sale date sits beside "
            "“sealed operator, unbroken.” You dry it on Quill’s hat brim like a relic that can still file charges."
        ),
    },
    "dt-ch04-036": {
        "title": "Ring Count",
        "body": (
            "Through barge canvas you hear an overseer count rings the way other men count coins — lovingly, without names. "
            "One brother’s callsign seal burns. Quill mouths, “Inventory night — freedom’s the audit — don’t quit the count halfway.”"
        ),
    },
    "dt-ch04-037": {
        "title": "River Slavers Ambush",
        "body": (
            "East wind brings chemical lies and iron honesty in the same breath. A hanged poster of your face lies about the eyes — "
            "always the eyes. Somewhere Helix Gate practices smiling until it believes itself. Then river slavers force the issue — "
            "a riverside lesson Quill refuses to skip."
        ),
        "enemy": "River Slavers",
    },
    "dt-ch04-043": {
        "title": "Toll Orcs",
        "body": (
            "Spears demand tribute for pretending the Chromeveil is free. The chrome-orcs wear Vale’s check like borrowed manners. "
            "Payment options: coin, blood, or a story they will not believe."
        ),
        "enemy": "Toll-Orc Spears",
    },
    "dt-ch04-050": {
        "title": "Night Crossing",
        "body": (
            "Fog hides the middle; courage has to invent the far bank. You can pole a stolen skiff, swim the channels, "
            "or wait for a ferry that may already have sold your face to Helix scanners."
        ),
        "choices": {
            "ch4-skiff": {
                "label": "Steal the skiff",
                "approach": "Quiet wood, loud conscience later.",
                "outcome": {
                    "text": "Oars bite neon water. The dog watches the wake like a second conscience.",
                },
            },
            "ch4-swim": {
                "label": "Swim the channels",
                "approach": "Steel wrapped; breath measured.",
                "success": {
                    "text": "Cold bites chrome and bone. Something in the water knocks like a spirit asking for a name.",
                },
                "fail": {
                    "text": "Current wins a round. You crawl out coughing coolant and stubbornness.",
                },
            },
            "ch4-ferry-bluff": {
                "label": "Bluff the late ferry",
                "approach": "Papers, posture, and Quill’s worst smile.",
                "outcome": {
                    "text": "The ferryman buys the smile. Helix Gate grows teeth on the far bank.",
                },
            },
        },
    },
    "dt-ch04-057": {
        "title": "Slaver Camp",
        "body": (
            "Tents circle a fire that cooks meat and bad bargains. Overseers dice for numbered rings beside crates of memory-solvent. "
            "You and Quill watch from willow cover while learning which tent snores and which one counts."
        ),
    },
    "dt-ch04-058": {
        "title": "Muck Spiders Ambush",
        "body": (
            "Night insects keep score of every secret step you still take. Warrant ink under your coat weighs more than the steel above it. "
            "Somewhere a gate practices smiling until it believes itself. Then muck spiders force the issue — "
            "a riverside lesson Quill refuses to skip."
        ),
        "enemy": "Muck Spiders",
    },
    "dt-ch04-064": {
        "title": "Barge Troll",
        "body": (
            "A barge-troll wards the landing with a club bigger than courtesy. It does not care about callsign seals — "
            "only about who touches rope without permission. Permission is currently unavailable."
        ),
        "enemy": "Barge Landing Troll",
    },
    "dt-ch04-071": {
        "title": "Far Bank Pact",
        "body": (
            "A kitchen hand slips the willow line and names three Helix landings used for “quiet cargo.” "
            "She asks only that if you enter the House of Seals, you leave a door unlocked behind you."
        ),
        "choices": {
            "ch4-promise-door": {
                "label": "Promise the unlocked door",
                "approach": "Bind your uprising to people already inside.",
                "outcome": {
                    "text": "She nods once. The promise weighs more than the map.",
                },
            },
            "ch4-pay-only": {
                "label": "Pay silver; promise nothing",
                "approach": "Buy intel without owing a riot.",
                "outcome": {
                    "text": "Coin changes hands. Warmth does not. Quill files the cold as useful.",
                },
            },
            "ch4-bring-her": {
                "label": "Bring her west tonight",
                "approach": "Rescue one now; risk the camp waking.",
                "success": {
                    "text": "She walks out under your coat. Sirens invent a reason to chase.",
                },
                "fail": {
                    "text": "Canvas flaps. Horns invent your names. You escape thinner and louder.",
                },
            },
        },
    },
    "dt-ch04-078": {
        "title": "Helix Smoke",
        "body": (
            "Far-bank mud dries into road again. Helix Gate’s smoke finally has a direction you can walk. "
            "Quill oil-wipes his crossbow and says, almost kindly, “Gates smile. Do not smile back first.”"
        ),
    },
    "dt-ch04-079": {
        "title": "River Slavers Ambush",
        "body": (
            "Quill’s hat brim cuts the sun into a usable blade; the scarred eye does the rest. Continue is the only honest verb left, "
            "and even it hesitates — one brother does not. East keeps a page that has not learned it can burn. "
            "Then river slavers force the issue — a riverside lesson Quill refuses to skip."
        ),
        "enemy": "River Slavers",
    },
    # --- Chapter 5: Helix Gate ---
    "dt-ch05-001": {
        "title": "Gate Smile",
        "body": (
            "Helix Gate’s border keeps grin for coin and iron for mercy — a smile with a spirit meter. "
            "Guards weigh your forged callsign seal like fruit and find it almost ripe. Quill tips his hat exactly the angle bribes prefer. "
            "“We’re novelty,” he murmurs. “Act expensive.”"
        ),
    },
    "dt-ch05-004": {
        "title": "Steward's Smile",
        "body": (
            "A Helix steward offers “guest guidance” that is clearly a leash. He asks if you prefer the scenic stim-field walk "
            "or the efficient path past the seal yards. Quill’s eyes say both are traps; pick the useful one."
        ),
        "choices": {
            "ch5-scenic": {
                "label": "Take the scenic stim walk",
                "approach": "See the yards without admitting you came to burn them.",
                "outcome": {
                    "text": "Workers do not look up. Looking up is how names become numbers.",
                },
            },
            "ch5-efficient": {
                "label": "Take the efficient path",
                "approach": "Closer to Lyra Vale; closer to dogs.",
                "outcome": {
                    "text": "War-mastiff drones track your heat signature like a welcome.",
                },
            },
            "ch5-decline": {
                "label": "Decline — get lost on purpose",
                "approach": "Refuse the leash; invent your own map.",
                "outcome": {
                    "text": "You invent alleys. Helix invents cameras. Quill invents a better smile.",
                },
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
            "A clerk wants provenance: who freed you, who pays you, why you smell like Chromeveil. "
            "Quill can talk, you can bluff muscle, or a greasy purse can invent ancestors."
        ),
        "choices": {
            "ch5-quill-talk": {
                "label": "Let Quill out-ink them",
                "approach": "Binder jargon as armor.",
                "outcome": {
                    "text": "He speaks three seals into existence. The clerk stamps one and looks smaller.",
                },
            },
            "ch5-bribe-gate": {
                "label": "Pay the smile wider",
                "approach": "Coin translates faster than law.",
                "outcome": {
                    "text": "The smile widens. The spirit meter blinks green for a lie it likes.",
                },
            },
            "ch5-muscle-bluff": {
                "label": "Pose as Vale’s muscle",
                "approach": "Borrowed menace; careful posture.",
                "success": {
                    "text": "They buy the swagger. Novelty is camouflage until it isn’t.",
                },
                "fail": {
                    "text": "A scanner chirps wrong. Quill’s bolt tip finishes the negotiation.",
                },
            },
        },
    },
    "dt-ch05-012": {
        "title": "Seal Sunlight",
        "body": (
            "Afternoon light flashes off a yard of hanging rings like cheap jewelry for a god of inventory. "
            "Quill’s flask pauses mid-air. “Pretty,” he says. “We’re going to vandalize the theology.”"
        ),
    },
    "dt-ch05-017": {
        "title": "Stim Fields",
        "body": (
            "Beyond the gate, stim crops move like punctuation under overseers’ grammar. Workers do not look up; "
            "looking up is how names become numbers. One brother rides the wind from distant chimneys."
        ),
    },
    "dt-ch05-025": {
        "title": "War Mastiffs",
        "body": (
            "War-mastiff drones learn callsign scent from posters. Handlers whistle a code that means inventory returning. "
            "Quill’s bolt answers the whistle first."
        ),
        "enemy": "War-Mastiff Pair",
    },
    "dt-ch05-033": {
        "title": "Guest Courtesy",
        "body": (
            "A steward offers wine that tastes like surveillance. Helix Gate’s guest wing is polite the way traps are polite. "
            "Quill toasts Director Vale’s health with a mouth that does not mean it."
        ),
    },
    "dt-ch05-040": {
        "title": "Gate Guards Ambush",
        "body": (
            "Fence wire hums a note that used to mean inventory. One brother learns freehold posture: chin up, exits counted, "
            "no bowing to seals. Novelty is camouflage until it isn’t — Quill’s favorite warning. "
            "Then gate guards force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Gate Guards",
    },
    "dt-ch05-041": {
        "title": "Yard Glimpse",
        "body": (
            "Past a trimmed hedge, neural collars flash in sunlight like cheap jewelry. Numbers march between posts. "
            "Somewhere in that grammar, Lyra Vale is still a sentence unfinished."
        ),
    },
    "dt-ch05-049": {
        "title": "Quill Prices the Yard",
        "body": (
            "Quill estimates lock types, dog routes, and bribe windows the way other guests estimate wine. "
            "“Pretty inventory,” he drawls. “Ugly arithmetic. We break both before dessert — and we do not quit at the hedge.”"
        ),
    },
    "dt-ch05-055": {
        "title": "Mire Orcs Ambush",
        "body": (
            "Steel rides light; the flask in Quill’s coat does not. Memory of cages arrives uninvited, then leaves when named. "
            "Quill packs the silence like powder — dry, useful, dangerous. Then mire orcs force the issue — "
            "a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Mire Orcs",
    },
    "dt-ch05-057": {
        "title": "Name Denied",
        "body": (
            "No servant will say Lyra — until a linen-girl mouths the syllables like a prayer under laundry. "
            "She will talk for a key, a promise, or a threat she can live with."
        ),
        "choices": {
            "ch5-key-trade": {
                "label": "Trade a spare key rumor",
                "approach": "Give her unlocking hope; get her map.",
                "outcome": {
                    "text": "She names the sealed-operator loft above the Undervault pit.",
                },
            },
            "ch5-soft-promise": {
                "label": "Promise her a west road",
                "approach": "Bind her future to your uprising.",
                "outcome": {
                    "text": "Hope becomes a contract. Quill pretends not to notarize it with a nod.",
                },
            },
            "ch5-read-fear": {
                "label": "Read which fear rules her",
                "approach": "Wisdom over volume.",
                "success": {
                    "text": "Fear of meters, not men. You speak meter-language and she opens.",
                },
                "fail": {
                    "text": "You guess wrong. Laundry swallows her name again.",
                },
            },
        },
    },
    "dt-ch05-065": {
        "title": "Wickernetic Sentries",
        "body": (
            "Wicker-and-iron sentries pace the inner fence with swords that do not joke — wickernetic husks under Helix chrome. "
            "Guests are allowed daylight gardens; night gardens bite. You chose night."
        ),
        "enemy": "Wickernetic Fence Sentries",
    },
    "dt-ch05-073": {
        "title": "Quill's Wager",
        "body": (
            "Quill bets charm against Director Vale’s curiosity at a receiving table and loses nothing yet. "
            "Vale’s laugh is soft, expensive, and interested in novelty — which you unfortunately are."
        ),
    },
    "dt-ch05-080": {
        "title": "Wickernetic Sentries Ambush",
        "body": (
            "Two riders tip hats too friendly for the hour. A joke dies mid-laugh when Vale’s check appears on a sleeve. "
            "Country like this remembers every unpaid mile. Then wickernetic sentries force the issue — "
            "a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Wickernetic Sentries",
    },
    "dt-ch05-081": {
        "title": "Inner Fence",
        "body": (
            "Beyond hospitality, Helix Gate stops pretending. You can idle as guests and listen, volunteer for Undervault "
            "entertainment to get closer, or slip the seal yard tonight while Quill keeps Vale drinking."
        ),
        "choices": {
            "ch5-idle-listen": {
                "label": "Play guest; harvest rumor",
                "approach": "Patience over steel for one more night.",
                "outcome": {
                    "text": "Rumors thicken into room numbers. Blue ribbon confirmed in whispers.",
                },
            },
            "ch5-volunteer-pit": {
                "label": "Volunteer for the Undervault pit",
                "approach": "Blood gets you nearer than manners.",
                "outcome": {
                    "text": "Silk invitation accepted. Sand already knows your blood type.",
                },
            },
            "ch5-slip-yard": {
                "label": "Slip the yard tonight",
                "approach": "Quill distracts; you count rings.",
                "success": {
                    "text": "Rings counted. Latches mapped. The dog invents a quieter exit.",
                },
                "fail": {
                    "text": "A meter chirps. You invent speed. Quill invents a toast louder than alarms.",
                },
            },
        },
    },
    "dt-ch05-089": {
        "title": "House Threshold",
        "body": (
            "Guest rooms overlook yards of rings and numbers. Friendship here is whispered at risk of skin. "
            "Quill sets two cups down and says, “Dinner with Vale is a battlefield that uses forks.”"
        ),
    },
    # --- Chapter 6: House of Seals ---
    "dt-ch06-001": {
        "title": "Dinner Seals",
        "body": (
            "Director Vale toasts guests while dessert plates hide ledgers like knives under napkins. "
            "His jokes inventory people without raising his voice — comedy as accounting. "
            "You smile with teeth that remember cages and taste sugar like a threat."
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
                "outcome": {
                    "text": "He laughs like a ledger closing. The key is warm when it hits your palm.",
                },
            },
            "ch6-lie-binder": {
                "label": "Lie: Quill’s still buying",
                "approach": "Speak binder language Vale understands.",
                "outcome": {
                    "text": "Binder math buys a corridor. Quill hates how well it works.",
                },
            },
            "ch6-lie-none": {
                "label": "Tell no dessert lies",
                "approach": "Refuse the kitchen’s theater; trust steel later.",
                "outcome": {
                    "text": "She shrugs. “Then steal louder.” Quill tips her for the honesty.",
                },
            },
        },
    },
    "dt-ch06-005": {
        "title": "Lyra Through Glass",
        "body": (
            "For one breath the silhouette is surely her — chin, stubborn angle, the way she used to refuse to bow to weather. "
            "Then fear invents doubles. You do not call out. Not yet. Identity fracture tastes like copper and static."
        ),
    },
    "dt-ch06-009": {
        "title": "Seal Whisper",
        "body": (
            "A kitchen hand names rooms where sealed operators sleep locked — loft above the Undervault court, "
            "window latched from outside. Blue ribbon confirmed. Hope becomes architecture."
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
            "Clouds drag shadows across stim-colored grass like slow warrants. One brother keeps count of locks without moving his mouth — "
            "guest manners. Everything wears dust but the promise with Lyra Vale’s name. Then punishment hounds force the issue — "
            "a house lesson Quill refuses to skip."
        ),
        "enemy": "Punishment Hounds",
    },
    "dt-ch06-017": {
        "title": "Window Light",
        "body": (
            "A silhouette might be Lyra Vale — or hope wearing her outline and your fear doing the costuming. "
            "You can call soft, wait for Quill’s signal, or send the kitchen hand with a scrap of callsign ink as proof "
            "you are real and not another Pale ghost."
        ),
        "choices": {
            "ch6-call-soft": {
                "label": "Call her name once",
                "approach": "Risk recognition; refuse anonymity.",
                "outcome": {
                    "text": "Glass answers with breath. Not yet a reunion — a receipt.",
                },
            },
            "ch6-wait-signal": {
                "label": "Wait for Quill’s signal",
                "approach": "Discipline over longing.",
                "outcome": {
                    "text": "The ruined hat tips once. Timing becomes a weapon.",
                },
            },
            "ch6-send-proof": {
                "label": "Send callsign proof upstairs",
                "approach": "Let ink speak across latches.",
                "outcome": {
                    "text": "The scrap vanishes under a door. Hope files itself as evidence.",
                },
            },
        },
    },
    "dt-ch06-025": {
        "title": "Overseer Gash",
        "body": (
            "An orc with a branded chain counts you like inventory returning. Overseer Gash smells Chromeveil mud on your boots "
            "and a callsign seal on your wrist. Conversation becomes geometry of blades."
        ),
        "enemy": "Overseer Gash",
    },
    "dt-ch06-033": {
        "title": "House Blades",
        "body": (
            "Courteous duelists practice ending conversations early in the gallery. They invite you as “sport between courses.” "
            "Quill declines for both of you with a smile that files itself under later."
        ),
    },
    "dt-ch06-040": {
        "title": "Overseer Orcs Ambush",
        "body": (
            "Wagon ruts braid into a grammar only hunters read fluently. Quill’s scarred eye never quite closes on a lie — "
            "useful, exhausting, honest. Small dangers flinch; the real ones smile and follow. "
            "Then overseer orcs force the issue — a house lesson Quill refuses to skip."
        ),
        "enemy": "Overseer Orcs",
    },
    "dt-ch06-041": {
        "title": "Punishment Hounds",
        "body": (
            "Punishment-hounds are walked through guest corridors as reminder landscaping. One stops at your callsign seal "
            "and invents a theory. Theories here have teeth."
        ),
        "enemy": "Punishment Hounds",
    },
    "dt-ch06-049": {
        "title": "Midnight Pact",
        "body": (
            "Sealed folk offer silence for a plan that includes them — keys, oil for hinges, and a refusal to leave anyone "
            "numbered behind. Quill warns that wide revolts are loud. Loud can still be right. "
            "One brother tastes the fracture: who volunteered for Pale — or who volunteered whom."
        ),
        "choices": {
            "ch6-wide-revolt": {
                "label": "Promise the whole yard",
                "approach": "Liberation as plural or not at all.",
                "outcome": {
                    "text": "Hands find hands. Oil finds hinges. The House invents a quieter night than it deserves.",
                },
            },
            "ch6-narrow-extract": {
                "label": "Extract Lyra Vale first",
                "approach": "Surgical rescue; uprising later.",
                "outcome": {
                    "text": "The sealed folk help colder. Speed becomes your only apology.",
                },
            },
            "ch6-quill-masks": {
                "label": "Let Quill forge guest masks",
                "approach": "Walk sealed folk out as “entertainment troupe.”",
                "outcome": {
                    "text": "Silk masks, forged smiles. Quill conducts escape like a bad opera that works.",
                },
            },
        },
    },
    "dt-ch06-056": {
        "title": "Punishment Hounds Ambush",
        "body": (
            "Clouds drag shadows across stim-colored grass like slow warrants. One brother learns freehold posture: chin up, "
            "exits counted, no bowing to seals. Latches soften when oil believes in them — and when you do. "
            "Then punishment hounds force the issue — a house lesson Quill refuses to skip."
        ),
        "enemy": "Punishment Hounds",
    },
    "dt-ch06-057": {
        "title": "Seal Yard",
        "body": (
            "Rings hang on pegs labeled with numbers older than mercy. You walk the yard as a “curious guest” while counting lock types. "
            "Somewhere a synth-mandolin practices daylight scales that will keep time with screaming after dark."
        ),
    },
    "dt-ch06-065": {
        "title": "Peg Theology",
        "body": (
            "Halbrecht Quill stops under a peg row and tips his ruined hat like a man in church. "
            "“Each ring is a name filed wrong,” he murmurs. “Tonight we become the clerical error with teeth. "
            "Don’t you damn quit at the first latch.”"
        ),
    },
    "dt-ch06-071": {
        "title": "Sealed Champions Ambush",
        "body": (
            "Two riders tip hats too friendly for the hour. Somewhere east, ink still invents people into inventory. "
            "One brother sets the pace like a man owed a name and too stubborn to renegotiate. "
            "Then sealed champions force the issue — a house lesson Quill refuses to skip."
        ),
        "enemy": "Sealed Champions",
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
                "outcome": {
                    "text": "Vale laughs. Quill drinks. The table forgets to ask the dangerous next question.",
                },
            },
            "ch6-duel-rival": {
                "label": "Challenge the rival’s tongue",
                "approach": "Steel etiquette as distraction.",
                "outcome": {
                    "text": "Gallery steel draws polite applause. Your real exit buys thirty seconds.",
                },
            },
            "ch6-poison-talk": {
                "label": "Redirect with a worse rumor",
                "approach": "Invent another scandal for Vale’s curiosity.",
                "success": {
                    "text": "Curiosity pivots. The rival becomes dessert. You become furniture again.",
                },
                "fail": {
                    "text": "The rumor lands wrong. Vale’s smile invents a new course called interrogation.",
                },
            },
        },
    },
    "dt-ch06-081": {
        "title": "Undervault Tomorrow",
        "body": (
            "Lanterns are hung over sand that already knows blood. Vale’s steward delivers silks for “honored fighters.” "
            "Quill folds the insult into a plan. Somewhere above, a blue ribbon waits on a latch."
        ),
    },
    "dt-ch06-086": {
        "title": "Overseer Orcs Ambush",
        "body": (
            "A child’s chalk callsign on a fence post has already been scrubbed. Quill’s scarred eye never quite closes on a lie — "
            "useful, exhausting, honest. The stim smell thickens like a dare. Then overseer orcs force the issue — "
            "a house lesson Quill refuses to skip."
        ),
        "enemy": "Overseer Orcs",
    },
}

REPLACEMENTS = [
    (r"River of Brands", "Chromeveil River"),
    (r"Candlemire Gates", "Helix Gate"),
    (r"House of Collars", "House of Seals"),
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
    (r"Collar Yard", "Seal Yard"),
    (r"collar scar", "seal scar"),
    (r"Collar scar", "Seal scar"),
    (r"collar ring", "neural-collar ring"),
    (r"collar pegs", "neural-collar pegs"),
    (r"Collar pegs", "Neural-collar pegs"),
    (r"soft collars", "soft seals"),
    (r"(?<![Nn]eural[- ])\bcollars\b", "neural collars"),
    (r"(?<![Nn]eural[- ])\bcollar\b", "neural collar"),
    (r"(?<![Nn]eural[- ])\bCollar\b", "Neural collar"),
    (r"Collared Champions", "Sealed Champions"),
    (r"collared champions", "sealed champions"),
    (r"Wicker Sentries", "Wickernetic Sentries"),
    (r"wicker sentries", "wickernetic sentries"),
    (r"Wicker Fence Sentries", "Wickernetic Fence Sentries"),
    (r"Wicker-and-iron", "Wicker-and-chrome"),
    (r"mandolin pit", "Undervault pit"),
    (r"mandolin court", "Undervault court"),
    (r"cane fields", "stim fields"),
    (r"Cane Fields", "Stim Fields"),
    (r"Cane fields", "Stim fields"),
    (r"cane-smelling", "stim-smelling"),
    (r"cane smell", "stim grit"),
    (r"cane-colored", "stim-colored"),
    (r"cane wind", "stim wind"),
    (r"Cane Wind", "Stim Wind"),
    (r"scenic cane walk", "scenic stim walk"),
    (r"ox-wains", "scrap-wagons"),
    (r"\bAsh rolls\b", "One brother rolls"),
    (r"\bAsh keeps\b", "One brother keeps"),
    (r"\bAsh tastes\b", "One brother tastes"),
    (r"\bAsh learns\b", "One brother learns"),
    (r"\bAsh counts\b", "One brother counts"),
    (r"\bAsh sees\b", "One brother sees"),
    (r"\bAsh burns\b", "One brother burns"),
    (r"\bAsh sets\b", "One brother sets"),
    (r"\bAsh rides\b", "One brother rides"),
    (r"\bAsh hums\b", "One brother hums"),
    (r"\bAsh refuses\b", "One brother refuses"),
    (r"\bAsh does\b", "One brother does"),
    (r"Ash’s", "One brother’s"),
    (r"Ash's", "One brother’s"),
    (r"Ash Aside", "Brother Aside"),
    (r"\bAsh\b", "one brother"),
    (r"Lyra’s", "Lyra Vale’s"),
    (r"Lyra's", "Lyra Vale’s"),
    (r"Lyra Vale Vale", "Lyra Vale"),
    (r"Thrall Whisper", "Seal Whisper"),
    (r"Collar Sunlight", "Seal Sunlight"),
    (r"Candlemire Smoke", "Helix Smoke"),
]

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
    out = out.replace("One brother’s freemark", "One brother’s callsign")
    out = out.replace("Lyra Vale Vale", "Lyra Vale")
    out = out.replace("second callsign", "second callsign seal")
    out = out.replace("Helix Spire’s guest wing", "Helix Spire’s guest wing")
    out = out.replace("Helix Spire yard prices", "Helix seal-yard prices")
    out = out.replace("Candlemire yard prices", "Helix seal-yard prices")
    out = out.replace("arrives before your callsign does", "arrives before your callsign seal does")
    out = out.replace("beat the Chromeveil River once", "beat the Chromeveil once")
    out = out.replace("Dustmarch’s rat", "Dustmarch’s rat")
    out = out.replace("Dustmarch law", "Callsign law")
    # Fix over-eager Freemark→Dustmarch on compound leftovers
    out = out.replace("second Dustmarch", "second callsign seal")
    out = out.replace("stubborn second Dustmarch", "stubborn second callsign seal")
    out = out.replace("chalk Dustmarch", "chalk callsign")
    out = out.replace("temporary Dustmarches", "temporary callsigns")
    out = out.replace("Dustmarches on every", "callsigns on every")
    out = out.replace("your Dustmarch", "your callsign seal")
    out = out.replace("forged Dustmarch", "forged callsign seal")
    out = out.replace("wrist Dustmarch", "wrist callsign seal")
    out = out.replace("Dustmarch scent", "callsign scent")
    out = out.replace("Dustmark", "callsign")  # safety
    out = out.replace("Dustmarch ink", "callsign ink")
    out = out.replace("Dustmarch proof", "callsign proof")
    out = out.replace("Dustmarch vow", "callsign vow")
    out = out.replace("Dustmarch widow", "freehold widow")
    out = out.replace("worse Dustmarch", "worse freehold folk")
    out = out.replace("Dustmarch Thoughts", "Callsign Thoughts")
    return out


def merge_choice_patch(choice: dict, patch: dict) -> None:
    for k, v in patch.items():
        if k in ("outcome", "success", "fail") and isinstance(v, dict):
            target = choice.setdefault(k, {})
            target.update(v)
        else:
            choice[k] = v


def scrub_flag_echoes(node: dict) -> None:
    echoes = node.get("flagEchoes")
    if not isinstance(echoes, list):
        return
    for echo in echoes:
        if isinstance(echo, dict) and isinstance(echo.get("line"), str):
            echo["line"] = apply_lex(echo["line"])
            echo["line"] = echo["line"].replace(
                "Helix Spire’s guest wing scratches",
                "Helix Spire’s guest wing scratches",
            )
            echo["line"] = echo["line"].replace(
                "Helix Spire yard prices still itch",
                "Helix seal-yard prices still itch",
            )
            echo["line"] = echo["line"].replace(
                "Helix seal-yard prices still itch in your coat like a market that deserves vandalism.",
                "Helix seal-yard prices still itch in your coat like a market that deserves vandalism.",
            )
            echo["line"] = echo["line"].replace(
                "Hope still rides your shoulder like a stubborn second callsign seal.",
                "Hope still rides your shoulder like a stubborn second callsign seal.",
            )
            echo["line"] = echo["line"].replace(
                "River cold still lives in your bones — you beat the Chromeveil River once.",
                "River cold still lives in your bones — you beat the Chromeveil once.",
            )
            echo["line"] = echo["line"].replace(
                "Dustmarch’s rat still flinches",
                "Dustmarch’s rat still flinches",
            )
            echo["line"] = echo["line"].replace(
                "Callsign law still tastes like silver",
                "Callsign law still tastes like silver",
            )
            echo["line"] = echo["line"].replace(
                "arrives before your callsign seal does",
                "arrives before your callsign seal does",
            )


def polish_encounter_outcomes(node: dict, chapter: int) -> None:
    taste = {
        4: "The Chromeveil tastes like iron, neon, and relief.",
        5: "Helix Gate tastes like iron, ozone, and relief.",
        6: "The House of Seals tastes like iron, sugar, and relief.",
    }[chapter]
    for ch in node.get("choices") or []:
        for key in ("outcome", "success", "fail"):
            block = ch.get(key)
            if isinstance(block, dict) and isinstance(block.get("text"), str):
                block["text"] = block["text"].replace(
                    "The road tastes like iron and relief.",
                    taste,
                )


def polish_enemy(node: dict) -> None:
    theme = node.get("enemyTheme")
    mapping = {
        "muck-spiders": "Muck Spiders",
        "river-slavers": "River Slavers",
        "toll-orcs": "Toll-Orc Spears",
        "barge-trolls": "Barge Landing Troll",
        "gate-guards": "Gate Guards",
        "mire-orcs": "Mire Orcs",
        "war-mastiffs": "War-Mastiff Pair",
        "wicker-sentries": "Wickernetic Sentries",
        "overseer-orcs": "Overseer Orcs",
        "house-blades": "House Blades",
        "punishment-hounds": "Punishment Hounds",
        "collared-champions": "Sealed Champions",
    }
    if theme in mapping:
        cur = node.get("enemy")
        if not cur or cur in (
            "Wicker Sentries",
            "Wicker Fence Sentries",
            "Collared Champions",
            "Toll Orcs",
            "War Mastiffs",
            "Mire Orcs",
            "Gate Guards",
            "Overseer Orcs",
            "Punishment Hounds",
            "River Slavers",
            "Muck Spiders",
            "Barge Troll",
        ):
            node["enemy"] = mapping[theme]


def rewrite_node(node: dict, idx: int, chapter: int) -> dict:
    n = deepcopy(node)
    nid = n["id"]
    prefixes = {
        4: "Chromeveil River",
        5: "Helix Gate",
        6: "House of Seals",
    }
    old_prefixes = {
        4: ("River of Brands:", "Chromeveil River:"),
        5: ("Candlemire Gates:", "Helix Gate:"),
        6: ("House of Collars:", "House of Seals:"),
    }
    miles = {4: CH4_MILE, 5: CH5_MILE, 6: CH6_MILE}
    prefix = prefixes[chapter]
    mile = miles[chapter]

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
    for old_prefix in old_prefixes[chapter]:
        if title.startswith(old_prefix) or title.startswith(old_prefix.replace(":", "")):
            # normalize
            pass
    for old_p in (
        "River of Brands:",
        "Candlemire Gates:",
        "House of Collars:",
        "Chromeveil River:",
        "Helix Gate:",
        "House of Seals:",
    ):
        if title.startswith(old_p):
            suffix_raw = title.split(":", 1)[1].strip()
            suffix = SUFFIX_MAP.get(suffix_raw, suffix_raw)
            n["title"] = f"{prefix}: {suffix}"
            bank = mile.get(suffix) or mile.get(SUFFIX_MAP.get(suffix_raw, ""), [])
            if bank and nid not in SPECIAL:
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

    scrub_flag_echoes(n)
    polish_encounter_outcomes(n, chapter)
    polish_enemy(n)

    if isinstance(n.get("body"), str):
        n["body"] = apply_lex(n["body"])
    if isinstance(n.get("enemy"), str):
        n["enemy"] = apply_lex(n["enemy"])
    if isinstance(n.get("title"), str):
        n["title"] = apply_lex(n["title"])

    return n


CH4_META = {
    "title": "Chromeveil River",
    "tagline": "Barges haul chemical cargo and spirit-caged freight across a river the freeholds refuse to see.",
    "enemyThemes": [
        "river-slavers",
        "barge-trolls",
        "muck-spiders",
        "toll-orcs",
    ],
}

CH5_META = {
    "title": "Helix Gate",
    "tagline": "Director Vale’s border keeps smile for coin and iron for mercy; Lyra is somewhere past the smoke.",
    "enemyThemes": [
        "gate-guards",
        "mire-orcs",
        "war-mastiffs",
        "wicker-sentries",
    ],
}

CH6_META = {
    "title": "House of Seals",
    "tagline": "Guest rooms overlook yards of rings and numbers; friendship here is whispered at risk of skin.",
    "enemyThemes": [
        "overseer-orcs",
        "house-blades",
        "punishment-hounds",
        "collared-champions",
    ],
}

META_BY_CH = {4: CH4_META, 5: CH5_META, 6: CH6_META}


def update_chapters_json() -> None:
    data = json.loads(CHAPTERS.read_text())
    for ch in data["chapters"]:
        meta = META_BY_CH.get(ch.get("chapter"))
        if not meta:
            continue
        ch["title"] = meta["title"]
        ch["tagline"] = meta["tagline"]
        ch["enemyThemes"] = list(meta["enemyThemes"])
    CHAPTERS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def main() -> None:
    data = json.loads(SPINE.read_text())
    data["title"] = "Dungeons and Dogs: Lost Brothers"
    data["blurb"] = (
        "Adult R-rated pulp. Three amnesiac brothers and a dog wake in the Neon Wilderland — "
        "cyberpunk steel under a Middle-earth canopy, spirits in the fog, dragons on the ridgeline. "
        "Helix Dominion sells names; Project Pale wiped theirs. Chapters 1–6: Woods Without Names, "
        "Stim Dust Marches, SKU Trace, Chromeveil River, Helix Gate, House of Seals. "
        "Chapters 7–9 still await the next rewrite pass."
    )

    for ch in data["chapters"]:
        meta = META_BY_CH.get(ch.get("chapter"))
        if meta:
            ch["title"] = meta["title"]
            ch["tagline"] = meta["tagline"]
            ch["enemyThemes"] = list(meta["enemyThemes"])

    counts = {4: 0, 5: 0, 6: 0}
    ids = {4: [], 5: [], 6: []}

    for i, node in enumerate(data["nodes"]):
        nid = str(node.get("id", ""))
        for ch in (4, 5, 6):
            if nid.startswith(f"dt-ch0{ch}-"):
                ids[ch].append(nid)
                before = json.dumps(node, sort_keys=True)
                new_node = rewrite_node(node, i, ch)
                data["nodes"][i] = new_node
                if before != json.dumps(new_node, sort_keys=True):
                    counts[ch] += 1
                break

    stats = data.get("stats") or {}
    for row in stats.get("perChapter") or []:
        meta = META_BY_CH.get(row.get("chapter"))
        if meta:
            row["title"] = meta["title"]
            row["enemyThemes"] = list(meta["enemyThemes"])
    data["stats"] = stats

    ban = (
        "thrall",
        "Thrall",
        "Candlemire",
        "Cadlemire",
        "Brand-River",
        "River of Brands",
        "House of Collars",
        "Candlemire Gates",
        "Lord Cade",
        "freemark",
        "Freemark",
        "song-thrall",
        "collar-yard",
        "Collar yard",
    )

    # Zero thrall leftovers in ids/flags/art within ch4–6
    ID_RENAMES = {
        "art-dt-reed-thrall": "art-dt-reed-sealed",
        "art-dt-thrall-whisper": "art-dt-seal-whisper",
        "thrall-rescued": "sealed-rescued",
        "thrall-rescued-messy": "sealed-rescued-messy",
    }

    def walk_ids(obj):
        if isinstance(obj, dict):
            return {k: walk_ids(ID_RENAMES.get(v, v) if isinstance(v, str) else walk_ids(v)) for k, v in obj.items()}
        if isinstance(obj, list):
            return [walk_ids(x) for x in obj]
        if isinstance(obj, str):
            return ID_RENAMES.get(obj, obj)
        return obj

    for i, node in enumerate(data["nodes"]):
        nid = str(node.get("id", ""))
        if re.match(r"dt-ch0[456]-", nid):
            data["nodes"][i] = walk_ids(node)

    leftovers = []
    thrall_hits = 0
    for node in data["nodes"]:
        nid = str(node.get("id", ""))
        if not re.match(r"dt-ch0[456]-", nid):
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
        thrall_hits += blob.lower().count("thrall")
        for term in ban:
            if term in blob:
                leftovers.append((nid, term))

    SPINE.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    update_chapters_json()

    for ch in (4, 5, 6):
        print(f"ch{ch} nodes: {len(ids[ch])} rewritten/changed: {counts[ch]}")
    print(f"leftover term hits: {len(leftovers)}")
    print(f"thrall count (ch4-6 prose): {thrall_hits}")
    for item in leftovers[:60]:
        print(" leftover", item)


if __name__ == "__main__":
    main()
