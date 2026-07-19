#!/usr/bin/env python3
"""Phase A: finish Chapter 1 Lost Brothers prose + packaging in story-spine.

Keeps node IDs / choice IDs / flags / art IDs / graph edges.
Rewrites titles, bodies, choice labels/approaches/outcome text, enemy display names.
"""
from __future__ import annotations

import json
import re
from copy import deepcopy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPINE = ROOT / "data/dungeon-tester/story-spine.json"

# Title suffix remap for "Chain-Road Dawn: X" templates
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
    "Cane Wind": "Neon Wind",
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

# Mile-body bank by suffix (cycled) — neon woods pulp
MILE_BODIES = {
    "Trail Hygiene": [
        "A warrant nail still bleeds pine sap where a SKU poster used to hang. One brother rolls a shoulder that still remembers chrome manners. Somewhere east, a ledger page waits to be rewritten in blood or static.",
        "Biolume resin sticks to boot treads like guilt. Quill mutters that clean roads lie louder than dirty ones. The dog sniffs a Dominion scent and will not look away.",
        "You scrape scavenger grease off a chrome knife and call it hygiene. The woods keep receipts in fiber-vine and bone charms. East smells like ozone and unfinished names.",
    ],
    "Old Hunger": [
        "Dust lifts off the track in pale sheets that lie for a living. A road widow sells directions and warnings in the same sentence. The nameless woods shrink behind you like a bad religion losing believers.",
        "Hunger arrives wearing stim-sweat and old fight memory. Quill passes the flask once — chemical truth, not kindness. Your stomach remembers rations you cannot name.",
        "Old hunger is not food. It is the itch where a true name should sit. The dog eats first; brothers argue second; Quill drinks like punctuation.",
    ],
    "Callsign Thoughts": [
        "Cage-static still squeaks in the memory of your spine. One brother keeps counsel; Quill keeps cartridges and contempt. Callsigns feel safer than true names — and the spirits agree.",
        "You try on words like coats: Anchor, Edge, Signal. None fit until violence makes them stick. Quill refuses to baptize you; the woods already did.",
        "A freehold stamp would make you legal. A callsign makes you hunt. You choose the second and pretend it was always the plan.",
    ],
    "SKU Weather": [
        "Somebody buried a whip and marked the dirt with hope. Quill mutters law under his breath like a man arguing with God and winning on technicalities. SKU weather rolls east — barcodes in the fog.",
        "A hanged scarecrow wears Vale’s check like a joke that landed. You learn freehold grammar the hard way: ownership first, mercy never.",
        "Under-skin itch flares when drones pass. The dog growls at empty air. Quill says that is how Project Pale says hello without introducing itself.",
    ],
    "Steel Practice": [
        "Quill’s ruined hat casts a verdict-shaped shadow. His crossbow speaks better than sermons. You practice kill-angles until muscle memory answers for the blank mind.",
        "Chrome blade, plasma pack, bone charm that whispers — drill until the three of you move like one wetwork cell that forgot its contract.",
        "Steel practice is Fight Club math without the club: hit, bleed, deny, hit again. Quill clocks the form and does not clap.",
    ],
    "Night Watch": [
        "Your shadow arrives first and looks less free than you feel. A neon-scav spit misses your boots by manners, not mercy. Night watch means listening for spirit-fog and chrome feet.",
        "Two riders tip hats too friendly for the hour. One brother counts exits without moving his head. The dog’s ears invent enemies before the trees do.",
        "Crows argue over something dead you hope is not destiny. The Wilderland watches and keeps its receipts in neon and sap.",
    ],
    "Iron Humor": [
        "Distant stim fields clap like soft applause for bad systems. Vern’s ledger scrap laughs from Quill’s pocket like a bad friend. Iron humor is all you’ve got left that still cuts.",
        "A dead mule teaches economics better than any clerk. You practice not answering to numbers. Quill’s joke lands like a bolt — ugly, useful.",
        "Chain-Road mist is gone; neon fog replaces it. Quill drawls that paper freedom first — real freedom files later — don’t quit in between. East keeps yards that have not yet learned uprising arithmetic.",
    ],
    "Seal Echo": [
        "The neural-collar scar itches when scrap-wagons pass — muscle memory of inventory. Soft roads make soft seals again, even in chrome. You walk harder.",
        "Seal echo is a ghost in the throat: old obedience trying to stand up. You spit it into biolume mud and load the plasma pack.",
        "Somewhere a spirit meter ticks like a second heart. Quill says ignore it until it starts naming you. Then kill whatever is speaking.",
    ],
    "Warrant Weather": [
        "Quill counts cartridges the way priests count sins — carefully, then drinks anyway. Warrant weather means someone east still thinks you are property with legs.",
        "Paper flutters on a data-spike. Three blank faces. The eyes are always wrong. You walk because quit is not a word you own.",
        "Halbrecht Quill lights a match off a warrant nail, drinks, and looks almost human — almost ready to spend truth about Project Pale.",
    ],
    "Hard Mercy": [
        "Steel rides light; the flask in Quill’s coat does not. Dust becomes a third companion with poor hygiene and worse jokes. The woods shrink behind you like a cult losing membership.",
        "Hard mercy is leaving a scavenger breathing with a warning carved into his chrome. Soft mercy is a sermon. You choose hard.",
        "Quill’s hat brim cuts the sun into a usable blade; the scarred eye does the rest. Mercy, he says, is a budget item — spend it when the dog says so.",
    ],
    "Scav Bargain": [
        "Trail tax kids sell water and buy stories about nameless men who would not quit. You set your pace like brothers owed a past. The bargain is always blood somewhere.",
        "A scavenger offers stim tabs for a true name. You offer him a bruise and a rumor instead. Quill tips him a copper for the geography hidden in the greed.",
        "Spirit-fog holograms flicker prices over your heads. Nobody buys. Everybody watches. The dog marks a tree like a treaty.",
    ],
    "Quill's Aside": [
        "Quill’s aside is never soft: “Pretty country. Ugly ownership. Pass the damn bottle.” Spirit-fog still clings; whatever comes next washes harder than rain.",
        "He talks to the flask more than to you. The flask answers in stim-heat and ugly honesty. You listen anyway — mentors this rotten usually know the road.",
        "“I walk with lost men who can ruin the things that lost them,” he repeats, like liturgy with better ammo.",
    ],
    "Neon Wind": [
        "Wind carries iron smell and dragon-static farther than any honest voice. Somewhere east, old spirits invent people into inventory — and new networks invent people into debt.",
        "Neon wind tastes like coolant and pine. A winged silhouette crosses the moon again — drone or wyrm, same omen: something big owns the skyline.",
        "Fiber-vine oaks click like teeth. The wind brings Helix Dominion tower-glow and a choir of static-Elvish that wants your callsign for a fee.",
    ],
    "Binder Math": [
        "Binder math: three stubborn blanks plus one dog plus one drunk marshal equals a hunting party the woods notice. Quill does not apologize for the arithmetic.",
        "He tallies ammo, stim tabs, and lies you still believe about yourselves. The sum is ugly. The sum walks east.",
        "Overseer laughter and server fans carry farther than hymns. Freedom still feels like hunger wearing better boots. Binder math says keep walking.",
    ],
    "Flask Sermon": [
        "Wagon ruts braid into a grammar only hunters read fluently. Somewhere a horn asks a question steel usually answers. The flask sermon is short: don’t quit, don’t trust pretty towers.",
        "Quill’s flask is chemical truth serum with worse manners. One sip and brother-sync feels like a remembered fight. Two sips and names start knocking.",
        "Stim sermon, whiskey chorus. He says Project Pale is a rumor with teeth. You feel the teeth in your blank spots.",
    ],
    "Camp Gossip": [
        "A roadside shrine wears three names and one empty nail. A burned SKU seal on a fence rail dares you to look away. The road bills in blood, dust, and unfinished names.",
        "Camp gossip: lost brothers walk. Word travels usefully — maybe too usefully. Dominion ears grow in the underbrush.",
        "Somebody swears Helix Spire hangs rings by size, not by name. Quill drinks past it, scarred eye fixed east, and says only, “Then we learn loft latches.”",
    ],
    "Seal Weather": [
        "Seal weather rolls in like debt. Neural collars chirp in scav packs; spirit meters blink green for clean product. You are not clean. Good.",
        "Heat makes the biolume itch like unfinished code. Eyes linger on blank faces the way buyers linger on mule teeth — and servers linger on fresh accounts.",
        "The stranger packs silence like powder — dry, useful, dangerous — and waits for the woods to decide if you are prey, players, or both.",
    ],
    "Powder Prayer": [
        "A child’s chalk name on a fence post has already been scrubbed to static. Pretty country. Ugly ownership. Pass the damn bottle.",
        "Powder prayer is loading a plasma pack while pretending it is faith. The dog watches like a priest that bites.",
        "You pray with chrome and stubbornness. The woods answer with fog that remembers your faces better than you do.",
    ],
    "Stubborn Mile": [
        "Scavengers sell water and buy stories about nameless men who would not quit. You set your pace like brothers owed a past and too stubborn to renegotiate.",
        "Stubborn mile: no map, no names, no permission. East is a black-glass rumor. You walk like you invented walking.",
        "Quill lights a match off a warrant nail wired into a data-spike, drinks, and looks almost human — almost ready to spend truth.",
    ],
    "Meter Memory": [
        "Wind carries dragon-static and spirit-meter hum. Continue — soft roads make soft seals again, even in chrome.",
        "Meter memory: a tick behind the eyes when someone says a true name nearby. None of you have one yet. The dog does — and will not share.",
        "Old rings and new collars rhyme. You kick a discarded spirit meter into the ditch and keep the itch as a compass.",
    ],
    "East Debt": [
        "Overseer laughter and server fans carry farther than any hymn on this road. Freedom still feels like hunger wearing better boots. The empty place where your names should be weighs less than iron and more than sleep.",
        "East debt is not coin. It is Lyra Vale’s line on a ledger, Project Pale’s blank contracts, and a tower that sells who you were.",
        "Quill points east like a man accusing weather. Debt accumulates in silence. Brothers accumulate in violence.",
    ],
    "Dust Mile": [
        "Camp smoke writes temporary law across the pines. You check for a brand, a barcode, a collar scar — and find only the itch of missing names. The Wilderland watches and keeps its receipts.",
        "Dust mile tastes like stim residue and pine ash. Bootleather remembers every mile better than maps. Quit is not a word you own.",
        "A hanged poster of three blank faces lies about the eyes — always the eyes. You walk because the alternative still smells like rust.",
    ],
    "Quiet Counsel": [
        "Quiet counsel is three brothers not saying we might not be brothers. Kinship feels true; proof does not. Quill lets the silence work.",
        "One brother hears dragon radio-chatter in the canopy. Another laughs once, then stops. The third checks the dog’s eyes for answers.",
        "You decide the only true thing left: stick together until the woods spit out an answer or a corpse. Quietly. Violently if needed.",
    ],
    "Brother Aside": [
        "One brother tastes copper on the wind and does not flinch. Neon-scav spit misses by manners, not mercy. Paper in your coat weighs less than iron and more than sleep.",
        "Brother aside: rage as compass, healer hands shaking, signal-static behind the eyes. The pack holds because quitting would be another wipe.",
        "You speak callsigns into the dark like passwords. The dog answers to none of them — and still walks first.",
    ],
}

SPECIAL = {
    "dt-ch01-013": {
        "title": "Vern's Joke",
        "body": "A traveler repeats Vern’s favorite joke about unpaid stim-tax and burned freeholds — half cyberpunk bar story, half orc-raid yarn. Nobody laughs. Quill tips the man a copper for the geography hidden in the cruelty, then mutters that hell of a comedian still makes hell of a warrant.",
    },
    "dt-ch01-014": {
        "title": "Dust Mile",
        "body": "Camp smoke writes temporary law across the pines. You check for a brand, a barcode, a collar scar — and find only the itch of missing names. The Wilderland watches and keeps its receipts.",
    },
    "dt-ch01-015": {
        "title": "Road Wargs Ambush",
        "body": "Bootleather remembers every mile better than maps ever will. A hanged poster of three blank faces lies about the eyes — always the eyes. You walk because the alternative still smells like rust — and quit is not a word you own. Then road wargs force the issue — a roadside lesson Quill refuses to skip.",
        "enemy": "Road Wargs",
        "enemyTheme": "road-wargs",
    },
    "dt-ch01-017": {
        "title": "Paper Callsigns",
        "body": "Quill slides a stamped sheet across a chrome-scarred wagon board and uncorks a dented flask that smells like stims and worse honesty. Conditional freedom: hunt the guilty he names, keep steel sharp, ask no soft questions. “Say yes,” he offers, almost kindly, “or climb back into inventory. I don’t do poetry, and I don’t ride with quitters.”",
        "choices": {
            "ch1-accept": {
                "label": "Take the warrant path",
                "approach": "Accept conditional freedom; work for Quill.",
                "outcome": {
                    "text": "Quill smiles without warmth. “Good. The woods hate empty hands, full sermons, and soft guts.”",
                },
            },
            "ch1-bargain": {
                "label": "Bargain for a name first",
                "approach": "Ask whose name this work is really for.",
                "success": {
                    "text": "He softens half a degree and takes a pull. “Lyra Vale. Sold east years ago — sealed operator, pretty SKU. Helix keeps prettier ledgers and uglier guests. You don’t quit easy — fine. Neither does that name.”",
                },
                "fail": {
                    "text": "Quill’s scarred eye narrows. “Earn the damn right to ask.” He still pushes the papers toward you.",
                },
            },
            "ch1-test": {
                "label": "Test the man's honesty",
                "approach": "Watch for a twitch that says he buys sealed people for worse work.",
                "success": {
                    "text": "No twitch — only tired calculation and a flask that never quite empties. Dangerous, yes. Aligned, for now. He notices you looking and tips his hat at the insult.",
                },
            },
        },
    },
    "dt-ch01-020": {
        "title": "Pale-Mark Burial",
        "body": "Quill has you scratch Pale-Mark into roadside dirt and kick it apart. “Numbers are cages that fit in a mouth,” he says. “Answer to a callsign — Anchor, Edge, Signal — never inventory. And don’t you quit back into a digit.”",
    },
    "dt-ch01-025": {
        "title": "Seal Cut Loose",
        "body": "You find a scavenger’s neural collar half-melted into pine bark — Dominion property still blinking a weak green. Quill pries it with a hooked key that smells of rust, stim-sweat, and other people’s surrender. He tosses the ring into biolume mud like trash that once owned a man — then grinds it under his heel, just to be thorough.",
    },
    "dt-ch01-030": {
        "title": "Road Wargs Ambush",
        "body": "The seal-scar itches when scrap-wagons pass — muscle memory of inventory. The next mile pretends to be empty and lies about being empty. Somewhere a seal-yard waits to learn a different inventory: revolt. Then road wargs force the issue — a roadside lesson Quill refuses to skip.",
        "enemy": "Road Wargs",
        "enemyTheme": "road-wargs",
    },
    "dt-ch01-033": {
        "title": "First Mile Free",
        "body": "Boots that never chose a direction now choose east, then south, at Quill’s nudge. Crows watch neon ruins dwindle and look personally offended. Freedom feels like hunger with better manners — and a microcell crossbow for a chaperone.",
    },
    "dt-ch01-041": {
        "title": "Glade Raiders",
        "body": "Three glade raiders peel from the pine edge, still smelling of the spirit-cages they sold this morning. They want their property returned with interest. Quill calmly loads a crossbow and drawls, “Show them the paperwork is yours — and that the warranty expired.”",
        "enemy": "Glade Raider Reclaimer",
        "enemyTheme": "glade-raiders",
    },
    "dt-ch01-049": {
        "title": "Quill's Lesson",
        "body": "“Steel answers seal-law better than ink,” Quill says, wiping ichor from the bolt like a clerk correcting a sum that insulted him. He drills stance, breath, and the difference between killing for a warrant and killing for rage — then takes a pull. “Rage is fine. Just don’t let it hold the damn map. And don’t quit mid-swing.”",
    },
    "dt-ch01-056": {
        "title": "Glade Raiders Ambush",
        "body": "Camp smoke writes temporary law across the pines. Seal-yard gossip rides cheaper than truth and farther than mercy. Biolume mud still clings; freehold ink is drying on purpose. Then glade raiders force the issue — a roadside lesson Quill refuses to skip.",
        "enemy": "Glade Raiders",
        "enemyTheme": "glade-raiders",
    },
    "dt-ch01-057": {
        "title": "Warrant Grammar",
        "body": "Quill makes you read a blank warrant aloud until the clauses stop sounding like mercy — alive-if-possible, dead-if-necessary, property-of-no-corp once the seal dries. “Paper is a leash that points both ways,” he drawls. “Hold your end. Don’t let Vale’s clerks invent the other.”",
    },
    "dt-ch01-065": {
        "title": "Seal-Yard Rumor",
        "body": "A peddler swears Helix Spire hangs rings by size, not by name — and that sealed operators get loft windows so buyers can hear the spirit-signal before they bid. Quill does not drink to that. He drinks past it, scarred eye fixed east, and says only, “Then we learn loft latches.”",
    },
    "dt-ch01-071": {
        "title": "Road Wargs Ambush",
        "body": "Spirit-fog thickens until the trees look like antennae. Road wargs come in low, eyes reflecting neon they did not earn. Quill’s lesson remains: the woods do not grade on a curve.",
        "enemy": "Road Wargs",
        "enemyTheme": "road-wargs",
    },
    "dt-ch01-073": {
        "title": "Campfire Question",
        "body": "Night fire snaps under fiber-vine oaks. Quill boils bitter tea that tastes like boiled warrants, spikes it from the flask, and asks what you will do if Lyra Vale is already broken past rescue — sealed, wiped, or worse. The question sits between you like a third traveler with muddy boots. His scarred eye does not blink.",
        "choices": {
            "ch1-hope": {
                "label": "I bring her home anyway",
                "approach": "Refuse the premise that anyone is past saving.",
                "outcome": {
                    "text": "Quill nods once. “Stubborn miracles. I hate miracles. I’ll still pack for them — and for you not quitting.”",
                },
            },
            "ch1-revenge": {
                "label": "Then Helix Spire pays in blood",
                "approach": "If she is gone, Director Vale still owns the debt.",
                "outcome": {
                    "text": "Quill’s eyes glitter. “Justice with teeth. I can work with that — carefully, and drunk enough to be honest.”",
                },
            },
            "ch1-quiet": {
                "label": "I will decide when I see her",
                "approach": "Keep counsel until the seal-yard is real.",
                "outcome": {
                    "text": "“Wise or evasive — same coin until spent,” Quill murmurs. “Don’t spend it drunk. That’s my job.”",
                },
            },
        },
    },
    "dt-ch01-081": {
        "title": "Warrant One",
        "body": "A freehold burned for unpaid stim-tribute; the killer rides with a seal that matches Vale’s outer SKUs like a signature on arson. Quill’s warrant names him Vern of Lowhedge. “Alive if possible,” Quill says. “Dead if the world insists on being itself.”",
    },
    "dt-ch01-086": {
        "title": "Neon Scavs Ambush",
        "body": "One brother tastes copper on the wind and does not flinch. Neon-scav spit misses your boots by manners, not mercy. Paper in your coat weighs less than iron and more than sleep. Then neon scavs force the issue — a roadside lesson Quill refuses to skip.",
        "enemy": "Neon Scavs",
        "enemyTheme": "neon-scavs",
    },
    "dt-ch01-089": {
        "title": "Lowhedge Ruins",
        "body": "Ash roofs. A child’s doll face-down in soot. Tracks lead into scrub where wargs like soft meat and softer excuses. Somewhere ahead, Vern laughs at a joke only hunters and monsters find funny — and a winged shadow crosses the burn-scar once, ambiguous as a threat.",
    },
    "dt-ch01-097": {
        "title": "Spirit Hounds",
        "body": "Two spirit-hounds burst from thorn — half warg, half signal-ghost, eyes reflecting fire they did not start and do not regret. Quill covers the left; yours is the right throat — if you still remember what cages taught about hesitation.",
        "enemy": "Spirit-Hound Pair",
        "enemyTheme": "spirit-hounds",
    },
    "dt-ch01-105": {
        "title": "Vern Cornered",
        "body": "Vern sits against a tree with a leg broken by his own horse — comedy the forest did not request. He begs for Director Vale’s protection and offers a torn ledger page with operator SKUs. Lyra Vale’s sits three lines down, sold as “sealed song-op, unbroken.” Vern smiles like that should buy him sunrise.",
        "choices": {
            "ch1-spare": {
                "label": "Bind him for trial",
                "approach": "Alive for Quill’s warrant and a clean conscience.",
                "outcome": {
                    "text": "Vern weeps gratitude he does not deserve. Quill stamps ALIVE like it hurts. The ledger page is yours.",
                },
            },
            "ch1-execute": {
                "label": "End him for Lowhedge",
                "approach": "Justice for ash roofs; take the page either way.",
                "outcome": {
                    "text": "The forest swallows the sound. Quill files the warrant CLOSED and does not congratulate you.",
                },
            },
            "ch1-interrogate": {
                "label": "Press for Helix routes",
                "approach": "Pain or promise — get the eastern road correct.",
                "success": {
                    "text": "Vern sketches fords and bribe posts. “Vale smiles when he sells people,” he spits. “You’ll hate how pretty the Spire is.”",
                },
                "fail": {
                    "text": "Vern faints before finishing. You still have the ledger shred, a headache, and Quill’s unimpressed silence.",
                },
            },
        },
    },
    "dt-ch01-112": {
        "title": "Road Wargs Ambush",
        "body": "Last stretch of nameless woods before freemark dust. Road wargs try one more tax in teeth. Quill does not negotiate with animals that already know your scent.",
        "enemy": "Road Wargs",
        "enemyTheme": "road-wargs",
    },
    "dt-ch01-113": {
        "title": "Name on Paper",
        "body": "You say Lyra Vale aloud until the vowels stop shaking and start sounding like a plan. Quill packs Vern’s routes — or what remains of them — and points toward a freehold town that stamps men as unpaid labor instead of numbered iron. Dawn smells like pine, powder, stim residue, and unfinished debts. Behind you, the Woods Without Names keep your blank faces like trophies.",
    },
}

# Lexical cleanup for leftover thrall/Chain-Road language in any remaining strings
REPLACEMENTS = [
    (r"Chain-Road Dawn", "Woods Without Names"),
    (r"Chain-Road", "the nameless woods"),
    (r"Candlemire", "Helix Spire"),
    (r"Cade Mire", "Helix Dominion"),
    (r"Lord Cade", "Director Vale"),
    (r"Cade’s", "Vale’s"),
    (r"Cade's", "Vale’s"),
    (r"\bCade\b", "Vale"),
    (r"freemark", "freehold"),
    (r"Freemark", "Freehold"),
    (r"song-thrall", "sealed operator"),
    (r"thrall brand", "SKU seal"),
    (r"\bthralls\b", "sealed folk"),
    (r"\bthrall\b", "sealed soul"),
    (r"collar-yard", "seal-yard"),
    (r"Collar-yard", "Seal-yard"),
    (r"collar yard", "seal yard"),
    (r"Collar yard", "Seal yard"),
    (r"collar scar", "seal scar"),
    (r"Collar scar", "Seal scar"),
    (r"soft collars", "soft seals"),
    (r"(?<![Nn]eural )\bcollars\b", "neural collars"),
    (r"(?<![Nn]eural )\bcollar\b", "neural collar"),
    (r"(?<![Nn]eural )\bCollar\b", "Neural collar"),
    (r"chain-orcs", "glade raiders"),
    (r"Chain-Orc Reclaimer", "Glade Raider Reclaimer"),
    (r"Chain Orcs", "Glade Raiders"),
    (r"chain orcs", "glade raiders"),
    (r"Cage Tenders", "Neon Scavs"),
    (r"cage tenders", "neon scavs"),
    (r"cage-tender", "neon-scav"),
    (r"Dust-Warg Pair", "Spirit-Hound Pair"),
    (r"Nine-Mark", "Pale-Mark"),
    (r"cane fields", "stim fields"),
    (r"Cane fields", "Stim fields"),
    (r"ox-wains", "scrap-wagons"),
    (r"\bAsh rolls\b", "One brother rolls"),
    (r"\bAsh keeps\b", "One brother keeps"),
    (r"\bAsh tastes\b", "One brother tastes"),
    (r"\bAsh learns\b", "One brother learns"),
    (r"\bAsh counts\b", "One brother counts"),
    (r"Ash Aside", "Brother Aside"),
    (r"\bAsh\b", "one brother"),
]


def walk_strings(obj, fn):
    if isinstance(obj, dict):
        return {k: walk_strings(v, fn) if k not in PROTECTED_KEYS else v for k, v in obj.items()}
    if isinstance(obj, list):
        return [walk_strings(v, fn) for v in obj]
    if isinstance(obj, str):
        return fn(obj)
    return obj


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
}


def apply_lex(s: str) -> str:
    out = s
    for pat, rep in REPLACEMENTS:
        out = re.sub(pat, rep, out)
    # tidy doubled articles from Ash→one brother
    out = out.replace("a one brother", "one brother")
    out = out.replace("A one brother", "One brother")
    out = out.replace("the the nameless woods", "the nameless woods")
    return out


def merge_choice_patch(choice: dict, patch: dict) -> None:
    for k, v in patch.items():
        if k in ("outcome", "success", "fail") and isinstance(v, dict):
            target = choice.setdefault(k, {})
            target.update(v)
        else:
            choice[k] = v


def rewrite_title(title: str) -> str:
    if title.startswith("Chain-Road Dawn:"):
        suffix = title.split(":", 1)[1].strip()
        suffix = SUFFIX_MAP.get(suffix, suffix)
        return f"Woods Without Names: {suffix}"
    if title.startswith("Neon Glade:"):
        return title  # keep early cold-open brand
    return title


def rewrite_node(node: dict, idx: int) -> dict:
    n = deepcopy(node)
    nid = n["id"]

    # Special full rewrites
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

    # Template Chain-Road / leftover titles → Woods Without Names + mile bank
    title = n.get("title") or ""
    if title.startswith("Chain-Road Dawn:"):
        suffix_raw = title.split(":", 1)[1].strip()
        suffix = SUFFIX_MAP.get(suffix_raw, suffix_raw)
        n["title"] = f"Woods Without Names: {suffix}"
        bank = MILE_BODIES.get(suffix) or MILE_BODIES.get(SUFFIX_MAP.get(suffix_raw, ""), [])
        if bank:
            n["body"] = bank[idx % len(bank)]

    # Lexical pass on prose fields only
    for field in ("title", "body", "enemy"):
        if isinstance(n.get(field), str):
            n[field] = apply_lex(n[field])
            if field == "title":
                n[field] = rewrite_title(n[field]) if n[field].startswith("Chain-Road") else n[field]

    for ch in n.get("choices") or []:
        for field in ("label", "approach"):
            if isinstance(ch.get(field), str):
                ch[field] = apply_lex(ch[field])
        for key in ("outcome", "success", "fail"):
            block = ch.get(key)
            if isinstance(block, dict) and isinstance(block.get("text"), str):
                block["text"] = apply_lex(block["text"])
                # encounter win flavor
                block["text"] = block["text"].replace(
                    "The road tastes like iron and relief.",
                    "The woods taste like iron, ozone, and relief.",
                )

    # Encounter theme renames (display + theme id where mapped)
    theme = n.get("enemyTheme")
    if theme == "chain-orcs":
        n["enemyTheme"] = "glade-raiders"
        if n.get("enemy") in (None, "Chain Orcs", "Chain-Orc Reclaimer") or "Chain" in str(n.get("enemy", "")):
            n["enemy"] = apply_lex(n.get("enemy") or "Glade Raiders")
    elif theme == "cage-tenders":
        n["enemyTheme"] = "neon-scavs"
        n["enemy"] = "Neon Scavs"
    elif theme == "brand-hounds":
        n["enemyTheme"] = "spirit-hounds"
        n["enemy"] = n.get("enemy") or "Spirit Hounds"
    elif theme == "road-wargs" and "Dust" in str(n.get("title", "")):
        # dust wargs node remapped to spirit hounds in SPECIAL
        pass

    # Fix Iron Humor leftover that still says Chain-Road after bank write
    if isinstance(n.get("body"), str):
        n["body"] = apply_lex(n["body"])
        n["body"] = n["body"].replace(
            "Chain-Road mist is gone; neon fog replaces it.",
            "Old chain mist is gone; neon fog replaces it.",
        )

    return n


def main() -> None:
    data = json.loads(SPINE.read_text())
    data["title"] = "Dungeons and Dogs: Lost Brothers"
    data["blurb"] = (
        "Adult R-rated pulp. Three amnesiac brothers and a dog wake in the Neon Wilderland — "
        "cyberpunk steel under a Middle-earth canopy, spirits in the fog, dragons on the ridgeline. "
        "Helix Dominion sells names; Project Pale wiped theirs. Chapter 1: Woods Without Names. "
        "Chapters 2–9 still await the next rewrite pass."
    )

    # Chapter 1 packaging in spine
    for ch in data["chapters"]:
        if ch.get("chapter") == 1:
            ch["title"] = "Woods Without Names"
            ch["tagline"] = (
                "Three brothers wake lost among neon ruins and ancient trees — no idea who they are."
            )
            ch["enemyThemes"] = [
                "glade-raiders",
                "road-wargs",
                "spirit-hounds",
                "neon-scavs",
            ]

    # Endings (bible)
    data["endings"] = [
        {
            "id": "ending-merciful-road",
            "title": "The Quiet Path",
            "blurb": (
                "The brothers walk out without burning the world that forgot them — "
                "woods, spirits, and neon left standing."
            ),
        },
        {
            "id": "ending-hard-justice",
            "title": "Hard Reset",
            "blurb": (
                "They torch the systems that stole their names; dragons and drones both remember the fire."
            ),
        },
        {
            "id": "ending-shared-dawn",
            "title": "Shared Dawn",
            "blurb": (
                "Three brothers and their pack forge a freehold where steel, spirits, and dogs "
                "share one sky — no seals, no Pale."
            ),
        },
    ]

    # Ending node titles/bodies if present
    ending_nodes = {
        "dt-ending-merciful": (
            "The Quiet Path",
            "The brothers walk out without burning the world that forgot them — woods, spirits, and neon left standing.",
        ),
        "dt-ending-hard": (
            "Hard Reset",
            "They torch the systems that stole their names; dragons and drones both remember the fire.",
        ),
        "dt-ending-shared": (
            "Shared Dawn",
            "Three brothers and their pack forge a freehold where steel, spirits, and dogs share one sky — no seals, no Pale.",
        ),
    }

    rewritten = 0
    ch1_ids = []
    for i, node in enumerate(data["nodes"]):
        if not str(node.get("id", "")).startswith("dt-ch01-"):
            # still update ending nodes
            eid = node.get("id")
            if eid in ending_nodes:
                title, body = ending_nodes[eid]
                node["title"] = title
                node["body"] = body
            continue
        ch1_ids.append(node["id"])
        before = json.dumps(node, sort_keys=True)
        new_node = rewrite_node(node, i)
        data["nodes"][i] = new_node
        after = json.dumps(new_node, sort_keys=True)
        if before != after:
            rewritten += 1

    # Stats chapter 1 title/themes
    stats = data.get("stats") or {}
    per = stats.get("perChapter") or []
    for row in per:
        if row.get("chapter") == 1:
            row["title"] = "Woods Without Names"
            row["enemyThemes"] = [
                "glade-raiders",
                "road-wargs",
                "spirit-hounds",
                "neon-scavs",
            ]
    data["stats"] = stats

    # Verify no Chain-Road / thrall leftovers in ch1 prose
    leftovers = []
    for node in data["nodes"]:
        if not str(node.get("id", "")).startswith("dt-ch01-"):
            continue
        blob = json.dumps(
            {
                "title": node.get("title"),
                "body": node.get("body"),
                "enemy": node.get("enemy"),
                "choices": node.get("choices"),
            }
        )
        for term in ("Chain-Road", "thrall", "Candlemire", "freemark", "Freemark", "Lord Cade", "Nine-Mark"):
            if term in blob:
                leftovers.append((node["id"], term))

    SPINE.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"ch1 nodes: {len(ch1_ids)}")
    print(f"rewritten/changed: {rewritten}")
    print(f"leftover term hits: {len(leftovers)}")
    for item in leftovers[:40]:
        print(" leftover", item)


if __name__ == "__main__":
    main()
