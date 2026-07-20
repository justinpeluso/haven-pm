#!/usr/bin/env python3
"""Phase B: rewrite Chapters 2–3 Lost Brothers prose + packaging.

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

# Title suffix remap for "Dust and Debt: X" / "The Wanted Mark: X"
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

# Ch2 mile bank — Stim Dust Marches pulp
CH2_MILE = {
    "Trail Hygiene": [
        "Stim grit sticks to chrome like unpaid debt. One brother scrapes cartel grease off a blade and calls it hygiene. Quill mutters that clean roads lie louder than dusty ones.",
        "A warrant nail bleeds resin where a SKU poster used to hang. The dog sniffs Dominion scent under Dustmarch dust and will not look away.",
        "You wash stim-sweat off your wrists and pretend it was only work. East smells like ozone, flask heat, and unfinished names.",
    ],
    "Old Hunger": [
        "Hunger arrives wearing stim-sweat and old fight memory. Quill passes the flask once — chemical truth, not kindness. Your stomach remembers rations you cannot name.",
        "Old hunger is not food. It is the itch where a true name should sit. The dog eats first; brothers argue second; Quill drinks like punctuation.",
        "Dustmarch rations taste like postponement and pepper. Somewhere a stim-den freehold sells forgetting by the tab. You buy steel instead.",
    ],
    "Callsign Thoughts": [
        "Callsigns feel safer than true names — and the spirits agree. Anchor, Edge, Signal: none fit until violence makes them stick.",
        "A freehold stamp would make you legal. A callsign makes you hunt. You choose the second and pretend it was always the plan.",
        "Cage-static still squeaks in the memory of your spine. Quill refuses to baptize you; the Stim Dust already did.",
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
        "Night watch means listening for dust-wargs and stim-cartel boots. One brother counts exits without moving his head. The dog’s ears invent enemies first.",
        "Two riders tip hats too friendly for the hour. Stim Dust watches and keeps receipts in grit and neon.",
        "Crows argue over something dead you hope is not destiny. Quill drinks past midnight like punctuation with worse manners.",
    ],
    "Iron Humor": [
        "Iron humor is all you’ve got left that still cuts. Distant stim fields clap like soft applause for bad systems. Quill’s joke lands like a bolt.",
        "A dead mule teaches economics better than any clerk. You practice not answering to numbers. Dustmarch laughs wrong and keeps laughing.",
        "Paper freedom first — real freedom files later — don’t quit in between. East keeps yards that have not yet learned uprising arithmetic.",
    ],
    "Seal Echo": [
        "Seal echo is a ghost in the throat: old obedience trying to stand up. You spit it into stim dust and load the plasma pack.",
        "The neural-collar scar itches when scrap-wagons pass — muscle memory of inventory. Soft roads make soft seals again. You walk harder.",
        "Somewhere a spirit meter ticks like a second heart. Quill says ignore it until it starts naming you. Then kill whatever is speaking.",
    ],
    "Warrant Weather": [
        "Quill counts cartridges the way priests count sins — carefully, then drinks anyway. Warrant weather means someone east still thinks you are property with legs.",
        "Paper flutters on a data-spike. Three blank faces. The eyes are always wrong. You walk because quit is not a word you own.",
        "Halbrecht Quill lights a match off a warrant nail, drinks, and looks almost human — almost ready to spend truth about Project Pale.",
    ],
    "Hard Mercy": [
        "Hard mercy is leaving a cartel runner breathing with a warning carved into his chrome. Soft mercy is a sermon. You choose hard.",
        "Steel rides light; the flask in Quill’s coat does not. Dust becomes a third companion with poor hygiene and worse jokes.",
        "Quill’s hat brim cuts the sun into a usable blade; the scarred eye does the rest. Mercy, he says, is a budget item — spend it when the dog says so.",
    ],
    "Scav Bargain": [
        "A scavenger offers stim tabs for a true name. You offer him a bruise and a rumor instead. Quill tips him a copper for the geography hidden in the greed.",
        "Trail tax kids sell water and buy stories about nameless men who would not quit. The bargain is always blood somewhere.",
        "Spirit-fog holograms flicker prices over your heads. Nobody buys. Everybody watches. The dog marks a fence post like a treaty.",
    ],
    "Quill's Aside": [
        "Quill’s aside is never soft: “Pretty country. Ugly ownership. Pass the damn bottle.” Stim Dust still clings; whatever comes next washes harder than rain.",
        "He talks to the flask more than to you. The flask answers in stim-heat and ugly honesty. Mentors this rotten usually know the road.",
        "“I walk with lost men who can ruin the things that lost them,” he repeats, like liturgy with better ammo.",
    ],
    "Stim Wind": [
        "Stim wind tastes like coolant grit and pine ash. A winged silhouette crosses the dust again — drone or wyrm, same omen: something big owns the skyline.",
        "Wind carries flask-heat and dragon-static farther than any honest voice. Helix Dominion tower-glow rides the east like a bruise.",
        "Fiber-vine scrub clicks like teeth. The wind brings cartel neon and a choir of static that wants your callsign for a fee.",
    ],
    "Binder Math": [
        "Binder math: three stubborn blanks plus one dog plus one drunk marshal equals a hunting party the Stim Dust notices. Quill does not apologize for the arithmetic.",
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
        "The stranger packs silence like powder — dry, useful, dangerous — and waits for the marches to decide if you are prey, players, or both.",
    ],
    "Powder Prayer": [
        "Powder prayer is loading a plasma pack while pretending it is faith. The dog watches like a priest that bites.",
        "You pray with chrome and stubbornness. Stim Dust answers with fog that remembers your faces better than you do.",
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
        "Dust mile tastes like stim residue and pine ash. Bootleather remembers every mile better than maps. Quit is not a word you own.",
        "Camp smoke writes temporary law across the scrub. You check for a brand, a barcode, a seal scar — and find only the itch of missing names.",
        "A hanged poster of three blank faces lies about the eyes — always the eyes. You walk because the alternative still smells like rust.",
    ],
    "Quiet Counsel": [
        "Quiet counsel is three brothers not saying we might not be brothers. Kinship feels true; proof does not. Quill lets the silence work.",
        "One brother hears dragon radio-chatter in the dust. Another laughs once, then stops. The third checks the dog’s eyes for answers.",
        "You decide the only true thing left: stick together until the marches spit out an answer or a corpse. Quietly. Violently if needed.",
    ],
    "Brother Aside": [
        "Brother aside: rage as compass, healer hands shaking, signal-static behind the eyes. The pack holds because quitting would be another wipe.",
        "One brother tastes copper on the wind and does not flinch. Cartel spit misses by manners, not mercy. Paper in your coat weighs less than iron and more than sleep.",
        "You speak callsigns into the dark like passwords. The dog answers to none of them — and still walks first.",
    ],
}

# Ch3 mile bank — SKU Trace pulp
CH3_MILE = {
    "Trail Hygiene": [
        "Wanted ink sticks to fenceposts like black moths with prices. You scrape biometric dust off a chrome knife and call it hygiene.",
        "A SKU poster bleeds charcoal when rain hits. One brother rolls a shoulder that still remembers ownership manners. East smells like hunter lust and unfinished names.",
        "Spy-raven droppings mark the trail like punctuation. Quill mutters that clean roads lie louder than marked ones.",
    ],
    "Old Hunger": [
        "Old hunger is not food. It is the itch under skin where a barcode sleeps. The dog eats first; brothers argue second; hunters bill third.",
        "Hunger arrives wearing bounty math. Quill passes the flask once — chemical truth, not kindness. Your wrists remember seals you cannot see yet.",
        "Stim tabs and wanted sheets cost the same in Dustmarch alleys. You buy steel. The hunger stays.",
    ],
    "Callsign Thoughts": [
        "Callsigns keep hunters guessing and spirits interested. True names would draw Dominion faster than blood. You keep the blanks on purpose.",
        "Posters sketch your faces wrong and the prices right. Callsigns feel safer than charcoal twins — until someone tattoos the truth under skin.",
        "You try on words like armor: Anchor, Edge, Signal. Hunters prefer inventory numbers. Quill prefers you stay ugly and alive.",
    ],
    "SKU Weather": [
        "SKU weather rolls in like ownership fog. Under-skin itch flares when spy-ravens pass. The dog growls at empty air that isn’t empty.",
        "A hanged scarecrow wears Vale’s check like a joke that landed. Wanted is not justice — it is a shopping list with legs.",
        "Barcode itch under the wrist skin. Quill says Project Pale labels product before product remembers the label. You believe him.",
    ],
    "Steel Practice": [
        "Steel practice against mark-hunters means kill-angles and denial. Hit, bleed, deny, hit again. Quill clocks the form and does not clap.",
        "Chrome blade, biometric bolt, bone charm that whispers — drill until three blanks move like a cell that forgot its SKU.",
        "Quill’s crossbow speaks better than sermons. Muscle memory answers for the blank mind. Hunters hate that fluency.",
    ],
    "Night Watch": [
        "Night watch means listening for spy-ravens and corporate outriders. One brother counts exits. The dog invents enemies first — and is usually right.",
        "Two riders tip hats too friendly for the hour. SKU Trace watches and keeps receipts in ink and drone-static.",
        "Crows argue over something dead you hope is not destiny. Wanted posters flutter like black moths with manners.",
    ],
    "Iron Humor": [
        "Iron humor is laughing at a bounty that lies about your eyes. Quill’s joke lands like a bolt — ugly, useful.",
        "A dead mule teaches economics better than any clerk. You practice not answering to numbers. Hunters answer for you anyway.",
        "Paper ownership first — real freedom files later — don’t quit in between. East keeps seal-yards that have not yet learned uprising arithmetic.",
    ],
    "Seal Echo": [
        "Seal echo is a ghost in the throat: old obedience trying to stand up. You spit it into road dust and load the plasma pack.",
        "The neural-collar scar itches when paid knights pass — muscle memory of inventory. Soft roads make soft seals again. You walk harder.",
        "Somewhere a spirit meter ticks like a second heart. Quill says ignore it until it starts naming you. Then kill whatever is speaking.",
    ],
    "Warrant Weather": [
        "Warrant weather means someone east still thinks blank faces are property with prices. Paper flutters. Knives do not bother with manners.",
        "Halbrecht Quill lights a match off a warrant nail, drinks, and looks almost human — almost ready to spend truth about Project Pale.",
        "Three blank faces on a data-spike. The eyes are always wrong. You walk because quit is not a word you own.",
    ],
    "Hard Mercy": [
        "Hard mercy is leaving a mark-hunter breathing with a warning carved into his chrome. Soft mercy is a sermon. You choose hard.",
        "Steel rides light; the flask in Quill’s coat does not. Desire and ownership share the same road — you refuse both soft answers.",
        "Quill’s hat brim cuts the sun into a usable blade. Mercy, he says, is a budget item — spend it when the dog says so.",
    ],
    "Scav Bargain": [
        "A scavenger offers forged SKUs for a true name. You offer him a bruise and a rumor instead. Quill tips him copper for the geography in the greed.",
        "Trail tax kids sell water and buy stories about nameless men who would not quit. The bargain is always blood somewhere.",
        "Spirit-fog holograms flicker bounty prices over your heads. Nobody buys. Everybody watches. The dog marks a post like a treaty.",
    ],
    "Quill's Aside": [
        "Quill’s aside is never soft: “Pretty country. Ugly ownership. Pass the damn bottle.” SKU Trace still clings; whatever comes next washes harder than rain.",
        "He talks to the flask more than to you. The flask answers in stim-heat and ugly honesty. Mentors this rotten usually know the hunters’ routes.",
        "“I walk with lost men who can ruin the things that lost them,” he repeats, like liturgy with better ammo.",
    ],
    "Stim Wind": [
        "Stim wind tastes like coolant grit and hunter perfume. A winged silhouette crosses the moon — drone-raven swarm or wyrm, same omen.",
        "Wind carries barcode-static and dragon radio farther than any honest voice. Helix Dominion tower-glow rides the east like a bruise.",
        "Fiber-vine scrub clicks like teeth. The wind brings corporate knights and a choir of static that wants your callsign for a fee.",
    ],
    "Binder Math": [
        "Binder math: three stubborn blanks plus one dog plus one drunk marshal equals a hunting party hunters notice. Quill does not apologize for the arithmetic.",
        "He tallies ammo, forged marks, and lies you still believe about yourselves. The sum is ugly. The sum walks east.",
        "Overseer laughter and server fans carry farther than hymns. Freedom still feels like hunger wearing better boots. Binder math says keep walking.",
    ],
    "Flask Sermon": [
        "Quill’s flask is chemical truth serum with worse manners. One sip and brother-sync feels like a remembered fight. Two sips and SKUs start knocking under skin.",
        "Stim sermon, whiskey chorus. He says wanted is ownership, not justice. You feel the ownership itch in your blank spots.",
        "The flask sermon is short: don’t quit, don’t trust pretty towers, and don’t confuse a hunter’s lust for the mark with love — then he drinks again anyway.",
    ],
    "Camp Gossip": [
        "Camp gossip: lost brothers walk. Word spreads usefully — maybe too usefully. Dominion ears grow in the underbrush and on wings.",
        "Somebody swears Helix Spire hangs rings by size, not by name. Quill drinks past it, scarred eye fixed east.",
        "A roadside shrine wears three callsigns and one empty nail. A burned SKU seal on a fence rail dares you to look away.",
    ],
    "Seal Weather": [
        "Seal weather rolls in like debt. Neural collars chirp in hunter packs; spirit meters blink green for clean product. You are not clean. Good.",
        "Heat makes the dust itch like unfinished code. Eyes linger on blank faces the way buyers linger on mule teeth — and servers linger on fresh accounts.",
        "The stranger packs silence like powder — dry, useful, dangerous — and waits for the Trace to decide if you are prey, players, or both.",
    ],
    "Powder Prayer": [
        "Powder prayer is loading a plasma pack while pretending it is faith. The dog watches like a priest that bites.",
        "You pray with chrome and stubbornness. SKU Trace answers with fog that remembers your faces better than you do.",
        "A child’s chalk callsign on a fence post has already been scrubbed to static. Pretty country. Ugly ownership. Pass the damn bottle.",
    ],
    "Stubborn Mile": [
        "Stubborn mile: no map, no names, no permission. East is a black-glass rumor with hunter prices. You walk like you invented walking.",
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
        "Dust mile tastes like stim residue and charcoal bounty. Bootleather remembers every mile better than maps. Quit is not a word you own.",
        "Camp smoke writes temporary law across the scrub. You check for a brand, a barcode, a seal scar — and find the itch waking under skin.",
        "A hanged poster of three blank faces lies about the eyes — always the eyes. You walk because the alternative still smells like rust.",
    ],
    "Quiet Counsel": [
        "Quiet counsel is three brothers not saying we might not be brothers. Kinship feels true; proof does not. Hunters prefer proof with prices.",
        "One brother hears drone-raven chatter in the canopy. Another laughs once, then stops. The third checks the dog’s eyes for answers.",
        "You decide the only true thing left: stick together until the Trace spits out an answer or a corpse. Quietly. Violently if needed.",
    ],
    "Brother Aside": [
        "Brother aside: rage as compass, healer hands shaking, signal-static behind the eyes. The pack holds because quitting would be another wipe.",
        "One brother tastes copper on the wind and does not flinch. Hunter spit misses by manners, not mercy. Paper in your coat weighs less than iron and more than sleep.",
        "You speak callsigns into the dark like passwords. The dog answers to none of them — and still walks first.",
    ],
}

SPECIAL = {
    # --- Chapter 2 setpieces ---
    "dt-ch02-001": {
        "title": "Dustmarch Bridge",
        "body": (
            "Dustmarch’s bridge exacts a toll in stories, not coins — and they smell a lie the way dogs smell fear. "
            "You tell enough of the Woods Without Names to pass, and hide enough of Helix Spire to sleep. "
            "Quill buys ink, ball, and powder like a man preparing a small, personally motivated war."
        ),
    },
    "dt-ch02-004": {
        "title": "Tavern Odds",
        "body": (
            "A Dustmarch bookmaker offers odds on whether you’ll die before Helix Gate or after. "
            "Quill wants silence. The room wants a show. Your callsign itches like a tell."
        ),
        "choices": {
            "ch2-odds-ignore": {
                "label": "Drink water; ignore the circus",
                "approach": "Refuse the economy of your death.",
                "outcome": {
                    "text": "Boring wins. Quill tips the barman for the quiet.",
                },
            },
            "ch2-odds-bet": {
                "label": "Bet on after",
                "approach": "Make the room fund your survival myth.",
                "outcome": {
                    "text": "Coin hits wood. “After,” you say. Someone cheers wrong.",
                },
            },
            "ch2-odds-threat": {
                "label": "Correct the bookmaker’s manners",
                "approach": "Fear teaches faster than odds.",
                "success": {
                    "text": "He refunds half the room and learns new theology.",
                },
                "fail": {
                    "text": "A bottle finds your cheek. Quill ends the math with a bolt tip.",
                },
            },
        },
    },
    "dt-ch02-005": {
        "title": "Flask Catechism",
        "body": (
            "Quill offers the flask and a question with teeth: when a warrant names a man who once wore a neural collar like the itch under your skin, "
            "do you hesitate? His scarred eye waits. The paddock wind does not. Stim Dust listens like a congregation with bad manners."
        ),
        "choices": {
            "ch2-flask-hesitate": {
                "label": "Hesitate — then decide",
                "approach": "Mercy is not quit; it is timing.",
                "outcome": {
                    "text": "“Timing,” Quill allows. “Just don’t dress it up as poetry.”",
                },
            },
            "ch2-flask-no": {
                "label": "No hesitation",
                "approach": "Paper freedom means finishing the page.",
                "outcome": {
                    "text": "He nods once. “Ugly. Useful. Don’t enjoy it.”",
                },
            },
            "ch2-flask-refuse": {
                "label": "Refuse the flask; keep the question",
                "approach": "Stay sharp; Quill can drink for both of you.",
                "outcome": {
                    "text": "“Smart,” he mutters, drinking your share. “Stubborn too. Good.”",
                },
            },
        },
    },
    "dt-ch02-009": {
        "title": "Callsign Seal",
        "body": (
            "A clerk burns a pale callsign seal on your wrist where a neural collar once sat — or where one was meant to. "
            "It burns less than iron and more than pride. Children stare; adults do the math of risk; Quill says, "
            "“Wear it out. Don’t let it wear you.”"
        ),
    },
    "dt-ch02-012": {
        "title": "Dustmarch Children",
        "body": (
            "Children stare at your wrist seal and do quiet math about risk. One asks if lost men dream in numbers. "
            "You say no. Quill adds, “Dream in exits.”"
        ),
    },
    "dt-ch02-013": {
        "title": "Warrant Board Sermon",
        "body": (
            "Quill walks you past Dustmarch’s warrant board like a chapel tour with worse hymns. "
            "He taps three seals — goblin scrap-clan, stim-barge cutter, corporate knight — and drawls, "
            "“Pick debts that teach. Coin is a side effect. Stubbornness is the curriculum.”"
        ),
    },
    "dt-ch02-015": {
        "title": "Hill Goblins Ambush",
        "body": (
            "A neural-collar ring half-buried in mud still remembers a neck. Memory of cages arrives uninvited, then leaves when named. "
            "Stim grit thickens like a dare. Then hill goblins — scrap-clan steel and stolen stim packs — force the issue — "
            "a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Hill Goblin Scrap-Clan",
        "enemyTheme": "hill-goblins",
    },
    "dt-ch02-017": {
        "title": "Which Warrant?",
        "body": (
            "Three warrants hang like wet laundry: a goblin raid-chief, a barge cutter on the Chromeveil feeder, "
            "and a knight who sold villagers under Vale’s quiet seal. Quill lets you choose the first debt to collect. "
            "“Pick the one that keeps you sleeping,” he says. “Or the one that doesn’t. Both teach.”"
        ),
        "choices": {
            "ch2-goblin": {
                "label": "Hunt the goblin chief",
                "approach": "Clear hills so freefolk stop paying ‘protection.’",
                "outcome": {
                    "text": "Quill packs snares. “Hills first. Rivers remember — and so do I.”",
                },
            },
            "ch2-barge": {
                "label": "Hunt the barge cutter",
                "approach": "Follow water toward Helix’s quiet chemical supply.",
                "outcome": {
                    "text": "“Rivers teach patience,” Quill says, already smelling mud and worse math.",
                },
            },
            "ch2-knight": {
                "label": "Hunt the selling knight",
                "approach": "Strike the soft armor of Vale’s respectables.",
                "outcome": {
                    "text": "Quill’s smile thins. “Careful. Knights have friends with seals and soft hands.”",
                },
            },
        },
    },
    "dt-ch02-025": {
        "title": "Hill Weather",
        "body": (
            "Scrub hills rise like knuckles ready to close. Goblin banners stitch stolen cloth and fiber-vine into threats that almost look like nations. "
            "Somewhere a horn answers itself, which means ambush practice — or optimism with spears and stim-cartel radios."
        ),
    },
    "dt-ch02-030": {
        "title": "Dust Wargs Ambush",
        "body": (
            "Bounty thieves smell like ale and other people’s funerals. Rations taste like postponement, pepper, and old promises. "
            "Helix Spire’s chimneys write black letters you intend to edit. Then dust wargs force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Dust Wargs",
        "enemyTheme": "dust-wargs",
    },
    "dt-ch02-033": {
        "title": "Hill Goblin Spears",
        "body": (
            "Spears rain from scrub. Quill curses in two languages and one dead dialect that sounds personally offended. "
            "You learn freehold work is still fighting other people’s arithmetic — only now the math bleeds stim and chrome."
        ),
        "enemy": "Hill-Goblin Spears",
        "enemyTheme": "hill-goblins",
    },
    "dt-ch02-041": {
        "title": "Chief Grin-Nail",
        "body": (
            "Grin-Nail wears Vern’s stolen cape and bargains with jokes that show too many teeth for comedy. "
            "He knows Helix buyers visit on the new moon and says it like a toast. Quill wants him alive for the magistrate; "
            "you want the moon calendar, a stim-den route, and maybe a tooth."
        ),
    },
    "dt-ch02-048": {
        "title": "Dust Wargs Ambush",
        "body": (
            "Marshal Halbrecht Quill lights a match on a warrant nail and looks almost merciful. "
            "A road-vermin kid offers directions priced in half-truths. Somewhere a seal latch rehearses retirement. "
            "Then dust wargs force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Dust Wargs",
        "enemyTheme": "dust-wargs",
    },
    "dt-ch02-049": {
        "title": "Deal or Steel",
        "body": (
            "Grin-Nail offers quiet passage maps if you break his warrant chain and let him flee north. "
            "“Law,” Quill’s face says. Your callsign seal itches like a warning label. "
            "Grin-Nail adds, “Or we can all die principled. Boring.”"
        ),
        "choices": {
            "ch2-law": {
                "label": "Serve the warrant",
                "approach": "Bind Grin-Nail; trust Quill’s freehold law.",
                "outcome": {
                    "text": "Magistrate pay is honest silver. Maps come slower, cleaner, and with fewer punchlines.",
                },
            },
            "ch2-deal": {
                "label": "Take the maps; let him run",
                "approach": "Trade law for Helix Gate intelligence.",
                "outcome": {
                    "text": "Grin-Nail vanishes laughing. Quill files a different sort of debt against you — quieter, longer.",
                },
            },
            "ch2-duel": {
                "label": "Challenge him openly",
                "approach": "Single combat for maps and honor both.",
                "success": {
                    "text": "Grin-Nail yields maps and a cracked tooth. Even Quill almost smiles. Almost.",
                },
                "fail": {
                    "text": "A spear butt finds your ribs. Quill finishes the fight while you invent new vocabulary for pain.",
                },
            },
        },
    },
    "dt-ch02-057": {
        "title": "Dust School",
        "body": (
            "Quill turns empty paddocks into a school of breath, draw, and refusal. You shoot, cut, and fall until failure becomes a teacher instead of a seal. "
            "At night he reads ledgers like scriptures of other people’s sins — and underlines yours when you flinch toward the flask."
        ),
    },
    "dt-ch02-063": {
        "title": "Bounty Thieves Ambush",
        "body": (
            "A neural-collar ring half-buried in mud still remembers a neck. Quill files every kindness under “possibly tactical” and drinks to the filing. "
            "Dustmarch stamps you unpaid labor instead of numbered iron — upgrade. Then bounty thieves force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Bounty Thieves",
        "enemyTheme": "bounty-thieves",
    },
    "dt-ch02-065": {
        "title": "Marshal Mentors Mean",
        "body": (
            "Halbrecht Quill corrects your draw the way a hangman corrects a knot — personally, without romance. "
            "“Pretty form gets you buried neat,” he says, flask tapping your wrist seal. "
            "“Ugly form gets you home — choose ugly, choose stubborn, and don’t quit when the powder fouls.”"
        ),
    },
    "dt-ch02-073": {
        "title": "Bounty Thieves",
        "body": (
            "Men who hunt binders for their warrant purses leap the paddock fence smelling of ale and other people’s funerals. "
            "Quill says quietly, “Do not die for practice. Die for something with better punctuation.”"
        ),
        "enemy": "Bounty Purse-Cutters",
        "enemyTheme": "bounty-thieves",
    },
    "dt-ch02-081": {
        "title": "Yard Prices",
        "body": (
            "A Dustmarch widow lists Helix seal-yard prices like weather: sealed operators high, fighters mid, children discounted if quiet. "
            "She does not weep. Quill pays for the list anyway, stamps it into your coat, and mutters that markets this polite deserve a warrant with teeth."
        ),
    },
    "dt-ch02-088": {
        "title": "Hill Goblins Ambush",
        "body": (
            "East wind brings stim lies and iron honesty in the same breath. Magistrate silver spends cleaner than goblin gratitude — usually. "
            "Quill nods toward the darker horizon without ceremony. Then hill goblins force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Hill Goblins",
        "enemyTheme": "hill-goblins",
    },
    "dt-ch02-089": {
        "title": "Rumors of Helix",
        "body": (
            "A tavern singer mouths a ballad about stim fields that grow screams, then stops cold when a man in Vale’s muted check enters. "
            "Quill tips her double. You leave by the kitchen, pockets heavier with a scratched floorplan of Helix Spire’s guest wing — "
            "and a new reason to hate chemical sugar."
        ),
    },
    "dt-ch02-097": {
        "title": "How Hard Do We Ride?",
        "body": (
            "East means SKUs and gate smiles. Quill can delay for more warrants and levels of coin — or push now while Lyra Vale’s name is still written unbroken. "
            "“Your call shapes the dust,” he says. “I just bill for the shovel.”"
        ),
        "choices": {
            "ch2-push": {
                "label": "Ride east at dawn",
                "approach": "Speed over safety; Lyra first.",
                "outcome": {
                    "text": "Quill packs light. “Then we become the rumor. Try not to enjoy it.”",
                },
            },
            "ch2-prepare": {
                "label": "One more warrant season",
                "approach": "Gather gear, allies, and thicker freehold luck.",
                "outcome": {
                    "text": "Weeks blur into silver and scars. East waits — hungrier, clearer, less forgiving.",
                },
            },
            "ch2-split": {
                "label": "Send Quill ahead alone",
                "approach": "Scout Helix Gate while you settle Dustmarch debts.",
                "success": {
                    "text": "Quill returns with gate schedules and a new limp. “Worth it,” he lies, fondly.",
                },
                "fail": {
                    "text": "Quill is gone too long. You ride after him into worse maps and better urgency.",
                },
            },
        },
    },
    "dt-ch02-103": {
        "title": "Dust Wargs Ambush",
        "body": (
            "Quill counts cartridges the way priests count sins — carefully, then drinks anyway. "
            "Tonight’s camp will argue theology with mosquitoes and memory. Dust season ends; warrant season learns your new callsign. "
            "Then dust wargs force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Dust Wargs",
        "enemyTheme": "dust-wargs",
    },
    "dt-ch02-105": {
        "title": "Eastwind",
        "body": (
            "Dust lifts like a curtain on a bad play. Beyond Dustmarch the Wilderland pretends to be empty and lies about being empty. "
            "Somewhere past river fog, Helix Spire’s chimneys write black letters on the sky — and Lyra Vale’s name is still a reason to keep walking."
        ),
    },
    "dt-ch02-118": {
        "title": "Warrant Runners Ambush",
        "body": (
            "Warrant runners step from the brush with seals that scrape like polite threats and knives that don’t bother. "
            "A guest-wing floorplan still itches your palm like a second callsign. Then they force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Warrant Runners",
        "enemyTheme": "warrant-runners",
    },
    # --- Chapter 3 setpieces ---
    "dt-ch03-001": {
        "title": "Ink Trail",
        "body": (
            "East of Dustmarch the road grows wanted posters like weeds with prices. Your callsign is sketched in cheap charcoal with a bounty under it that lies about the eyes. "
            "Quill buys the first one and burns it; the smoke still smells like a market that wants you numbered again."
        ),
    },
    "dt-ch03-004": {
        "title": "Poster Autograph",
        "body": (
            "A kid asks you to sign your wanted poster “for luck.” Quill winces. "
            "One brother sees a chance to poison rumor or feed it — Fight Club math with charcoal."
        ),
        "choices": {
            "ch3-sign-mercy": {
                "label": "Sign it — soft hand",
                "approach": "Be a legend that shelters kids, not hunts them.",
                "outcome": {
                    "text": "The kid runs. By dusk your poster says ALIVE and HELPFUL in crayon.",
                },
            },
            "ch3-sign-threat": {
                "label": "Sign it with a warning",
                "approach": "Make hunters read fear into the ink.",
                "outcome": {
                    "text": "You write: HUNTERS PAY DOUBLE. Quill snorts. “Subtle.”",
                },
            },
            "ch3-refuse-sign": {
                "label": "Refuse — burn the sheet",
                "approach": "Deny the market your face.",
                "outcome": {
                    "text": "One brother burns the charcoal twin. Smoke still smells like a price.",
                },
            },
        },
    },
    "dt-ch03-005": {
        "title": "Halbrecht's Other Debt",
        "body": (
            "A grey woman calls Quill “Halbrecht” like a summons. He flinches half a degree — the first honest thing you’ve seen him do all week. "
            "“Old ink,” he tells you. “Ugly. Mine.”"
        ),
    },
    "dt-ch03-008": {
        "title": "Forger's Alley",
        "body": (
            "A forger sells marks that open doors and close lives, smiling like a dentist with a warrant. "
            "She offers to thicken your callsign seal into something Vale’s clerks might salute. "
            "Quill pays half in silver and half in a promise not to name her aloud — “My best kind of receipt,” she says."
        ),
    },
    "dt-ch03-011": {
        "title": "Poster Weather",
        "body": (
            "Rain softens your charcoal twin until the eyes smear honest. Quill watches the bounty dissolve and does not smile. "
            "“Ink lies less when wet,” he drawls. “People don’t.”"
        ),
    },
    "dt-ch03-015": {
        "title": "False Friend",
        "body": (
            "A smiling freehold man buys your drinks, then sells your description twice before noon like a man flipping copper. "
            "You find him counting Vale’s coin in a stable loft. Quill asks how soft you want the lesson — "
            "“Soft still teaches,” he adds, “if the bruises land right.”"
        ),
        "choices": {
            "ch3-spare-rat": {
                "label": "Let Quill collect the debt",
                "approach": "Alive, emptied of coin, useful as a warning.",
                "outcome": {
                    "text": "The rat walks away lighter and louder. Word travels both ways.",
                },
            },
            "ch3-brand-rat": {
                "label": "Mark him with fear",
                "approach": "Make treachery expensive without killing Dustmarch’s mood.",
                "outcome": {
                    "text": "He keeps both ears and loses sleep. Fair trade.",
                },
            },
            "ch3-buy-lies": {
                "label": "Buy his next set of lies",
                "approach": "Feed Vale false routes while you travel true ones.",
                "success": {
                    "text": "He sells Vale a river that does not exist. You buy a day.",
                },
                "fail": {
                    "text": "He pockets your coin and still sells truth. Quill sighs like a ledger.",
                },
            },
        },
    },
    "dt-ch03-016": {
        "title": "Orc Outriders Ambush",
        "body": (
            "A spy-raven ticks travelers the way clerks tick inventory — lovingly. Tonight’s camp will argue theology with mosquitoes and memory. "
            "The trail toward Vale does not apologize for the mileage. Then chrome-orc outriders force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Chrome-Orc Outriders",
        "enemyTheme": "orc-outriders",
    },
    "dt-ch03-022": {
        "title": "Spy Ravens",
        "body": (
            "Vale’s drone-ravens wheel low, counting travelers who ask ledger questions. An outrider follows their shadows with a net sized for blank-faced men. "
            "Quill lowers his hat. “Lesson time.”"
        ),
        "enemy": "Mark-Hunter Outrider",
        "enemyTheme": "mark-hunters",
    },
    "dt-ch03-029": {
        "title": "Map Fragment",
        "body": (
            "In a ditch under a dead mule you find charcoal walls of Helix Spire — incomplete, hungry. "
            "Guest wing, seal yards, and a tower stair marked with a personal scribble: VALE’S KEEP. "
            "Quill traces the lines like scripture written by a committed bastard."
        ),
    },
    "dt-ch03-036": {
        "title": "Binder School",
        "body": (
            "Quill drills warrant language the way priests drill catechism — who may be taken, who may be left, who is owned by paper versus owned by fear. "
            "“Vale sells both,” he says, flask catching dustlight. "
            "“We collect the first kind until the second learns manners. Don’t quit the lesson early.”"
        ),
    },
    "dt-ch03-037": {
        "title": "Mark Hunters Ambush",
        "body": (
            "A creek argues with stones like a tired magistrate on half pay. You catch yourself walking like cargo that learned a verb. "
            "You walk because stopping still smells like inventory — and quit is not a word you own. "
            "Then mark hunters force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Mark Hunters",
        "enemyTheme": "mark-hunters",
    },
    "dt-ch03-043": {
        "title": "Wanted Song",
        "body": (
            "A tavern sings your callsign into a ballad verse with the wrong chorus. Patrons clap for the number that used to be your name. "
            "You leave by the kitchen; Quill leaves a tip sharp enough to cut rumor."
        ),
    },
    "dt-ch03-050": {
        "title": "Quill's Debt",
        "body": (
            "A woman in grey travel-dust finds Quill and names an old binder debt paid in your skin. "
            "She offers quiet passage east if he closes an unpaid warrant against her brother. Your call sits between their histories."
        ),
        "choices": {
            "ch3-pay-debt": {
                "label": "Help Quill settle it",
                "approach": "Close the warrant; earn the passage.",
                "outcome": {
                    "text": "Paper folds quieter than steel. East opens a cleaner mile.",
                },
            },
            "ch3-refuse-debt": {
                "label": "Refuse — Lyra first",
                "approach": "No side warrants while Helix still owns her name.",
                "outcome": {
                    "text": "Quill accepts the snub with professional grace. Roads get lonelier.",
                },
            },
            "ch3-negotiate": {
                "label": "Renegotiate the price",
                "approach": "Trade information instead of skin.",
                "success": {
                    "text": "She takes gate schedules instead of blood. Quill almost bows.",
                },
                "fail": {
                    "text": "Talk sours. She leaves; hunters arrive sooner.",
                },
            },
        },
    },
    "dt-ch03-052": {
        "title": "Spy Ravens Ambush",
        "body": (
            "A neural-collar ring half-buried in mud still remembers a neck. Tracks braid, unbraid, and lie with professional cheer. "
            "Warrant weather gathers; you load anyway. Then spy-ravens force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Spy Ravens",
        "enemyTheme": "spy-ravens",
    },
    "dt-ch03-057": {
        "title": "Paid Knights",
        "body": (
            "Knights with Vale’s muted check ride like gentlemen and hunt like ledgers. "
            "Their warrant names Pale-Mark as escaped inventory. Dust kicks; steel argues about ownership."
        ),
        "enemy": "Paid Check Knights",
        "enemyTheme": "paid-knights",
    },
    "dt-ch03-064": {
        "title": "Orc Outriders",
        "body": (
            "Chrome-orc outriders burn a freehold for sheltering callsigns. Ash writes their sermon on roof beams. "
            "You bury what can be buried and take a child’s drawing of a stim field — Helix Spire from the wrong side of hope."
        ),
    },
    "dt-ch03-071": {
        "title": "Eastward Sign",
        "body": (
            "Three roads argue at a cairn: north into friendlier lies, south into river fog, east into stim smoke and certainty. "
            "Quill will not choose for you. Lyra Vale’s name waits in only one weather."
        ),
        "choices": {
            "ch3-east-direct": {
                "label": "Take the stim-smelling road",
                "approach": "Straight toward Helix Gate and its hunters.",
                "outcome": {
                    "text": "Speed spends luck. The Chromeveil River begins to smell real.",
                },
            },
            "ch3-river-first": {
                "label": "Skirt south to the Chromeveil",
                "approach": "Use water traffic Quill already partially mapped.",
                "outcome": {
                    "text": "Mud teaches patience. Barges write their own invitations.",
                },
            },
            "ch3-night-march": {
                "label": "March by night only",
                "approach": "Trade sleep for fewer eyes.",
                "success": {
                    "text": "Stars keep better counsel than posters. You arrive thin and unseen.",
                },
                "fail": {
                    "text": "Exhaustion makes mistakes loud. Hunters gain half a day.",
                },
            },
        },
    },
    "dt-ch03-072": {
        "title": "Orc Outriders Ambush",
        "body": (
            "Camp smoke writes temporary law across the pines. Freedom still feels like hunger wearing better boots. "
            "You spit iron taste and keep the callsign seal facing out. Then chrome-orc outriders force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Chrome-Orc Outriders",
        "enemyTheme": "orc-outriders",
    },
    "dt-ch03-078": {
        "title": "SKU Horizon",
        "body": (
            "At dusk the eastern skyline writes black commas of chimney smoke. Quill packs the charcoal map against his ribs. "
            "Somewhere past river fog, a ledger still lists Lyra Vale unbroken — and your under-skin SKU itch is no longer a rumor."
        ),
    },
    "dt-ch03-087": {
        "title": "Mark Hunters Ambush",
        "body": (
            "Wanted ink flutters on fenceposts like black moths with prices. A SKU seal on a fence rail dares you to look away. "
            "Far off, iron complains one last time and goes quiet. Then mark hunters force the issue — a roadside lesson Quill refuses to skip."
        ),
        "enemy": "Mark Hunters",
        "enemyTheme": "mark-hunters",
    },
}

# Lexical cleanup for leftover thrall / Candlemire language
REPLACEMENTS = [
    (r"Dust and Debt", "Stim Dust Marches"),
    (r"The Wanted Mark", "SKU Trace"),
    (r"Chain-Road Dawn", "Woods Without Names"),
    (r"Chain-Road", "the nameless woods"),
    (r"Candlemire", "Helix Spire"),
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
    (r"\bthrall\b", "sealed soul"),
    (r"collar-yard", "seal-yard"),
    (r"Collar-yard", "Seal-yard"),
    (r"collar yard", "seal yard"),
    (r"Collar yard", "Seal yard"),
    (r"collar scar", "seal scar"),
    (r"Collar scar", "Seal scar"),
    (r"collar ring", "neural-collar ring"),
    (r"soft collars", "soft seals"),
    (r"(?<![Nn]eural[- ])\bcollars\b", "neural collars"),
    (r"(?<![Nn]eural[- ])\bcollar\b", "neural collar"),
    (r"(?<![Nn]eural[- ])\bCollar\b", "Neural collar"),
    (r"Nine-Mark", "Pale-Mark"),
    (r"cane fields", "stim fields"),
    (r"Cane fields", "Stim fields"),
    (r"cane-smelling", "stim-smelling"),
    (r"cane smell", "stim grit"),
    (r"cane wind", "stim wind"),
    (r"Cane Wind", "Stim Wind"),
    (r"ox-wains", "scrap-wagons"),
    (r"\bAsh rolls\b", "One brother rolls"),
    (r"\bAsh keeps\b", "One brother keeps"),
    (r"\bAsh tastes\b", "One brother tastes"),
    (r"\bAsh learns\b", "One brother learns"),
    (r"\bAsh counts\b", "One brother counts"),
    (r"\bAsh sees\b", "One brother sees"),
    (r"\bAsh burns\b", "One brother burns"),
    (r"\bAsh sets\b", "One brother sets"),
    (r"Ash Aside", "Brother Aside"),
    (r"\bAsh\b", "one brother"),
    (r"Lyra’s", "Lyra Vale’s"),
    (r"Lyra's", "Lyra Vale’s"),
    # avoid double "Lyra Vale Vale"
    (r"Lyra Vale Vale", "Lyra Vale"),
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
    out = out.replace("the the nameless woods", "the nameless woods")
    out = out.replace("Lyra Vale Vale", "Lyra Vale")
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
            # targeted echo polish
            echo["line"] = echo["line"].replace(
                "second callsign",
                "second callsign seal",
            )
            echo["line"] = echo["line"].replace(
                "Helix Spire’s guest wing",
                "Helix Spire’s guest wing",
            )
            echo["line"] = echo["line"].replace(
                "Helix Spire yard prices",
                "Helix seal-yard prices",
            )
            echo["line"] = echo["line"].replace(
                "arrives before your callsign does",
                "arrives before your callsign seal does",
            )


def rewrite_node(node: dict, idx: int, chapter: int) -> dict:
    n = deepcopy(node)
    nid = n["id"]
    prefix = "Stim Dust Marches" if chapter == 2 else "SKU Trace"
    mile = CH2_MILE if chapter == 2 else CH3_MILE

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
    for old_prefix in ("Dust and Debt:", "The Wanted Mark:"):
        if title.startswith(old_prefix):
            suffix_raw = title.split(":", 1)[1].strip()
            suffix = SUFFIX_MAP.get(suffix_raw, suffix_raw)
            n["title"] = f"{prefix}: {suffix}"
            bank = mile.get(suffix) or mile.get(SUFFIX_MAP.get(suffix_raw, ""), [])
            if bank and nid not in SPECIAL:
                n["body"] = bank[idx % len(bank)]
            break

    # Lexical pass
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
                if chapter == 2:
                    block["text"] = block["text"].replace(
                        "The road tastes like iron and relief.",
                        "The Stim Dust tastes like iron, ozone, and relief.",
                    )
                else:
                    block["text"] = block["text"].replace(
                        "The road tastes like iron and relief.",
                        "The Trace tastes like iron, ink, and relief.",
                    )

    scrub_flag_echoes(n)

    # Encounter display polish (theme IDs stay)
    theme = n.get("enemyTheme")
    if theme == "hill-goblins" and not n.get("enemy"):
        n["enemy"] = "Hill Goblin Scrap-Clan"
    elif theme == "warrant-runners":
        n["enemy"] = n.get("enemy") or "Warrant Runners"
    elif theme == "dust-wargs":
        n["enemy"] = n.get("enemy") or "Dust Wargs"
    elif theme == "bounty-thieves":
        n["enemy"] = n.get("enemy") or "Bounty Thieves"
    elif theme == "mark-hunters":
        n["enemy"] = n.get("enemy") or "Mark Hunters"
    elif theme == "spy-ravens":
        n["enemy"] = n.get("enemy") or "Spy Ravens"
    elif theme == "orc-outriders":
        if n.get("enemy") in (None, "Orc Outriders"):
            n["enemy"] = "Chrome-Orc Outriders"
    elif theme == "paid-knights":
        n["enemy"] = n.get("enemy") or "Paid Check Knights"

    if isinstance(n.get("body"), str):
        n["body"] = apply_lex(n["body"])

    if isinstance(n.get("enemy"), str):
        n["enemy"] = apply_lex(n["enemy"])

    return n


CH2_META = {
    "title": "Stim Dust Marches",
    "tagline": "Warrants pay in stims and scars while Quill teaches steel that answers to no seal.",
    "enemyThemes": [
        "warrant-runners",
        "hill-goblins",
        "dust-wargs",
        "bounty-thieves",
    ],
}

CH3_META = {
    "title": "SKU Trace",
    "tagline": "An under-skin barcode leads east; friends and hunters argue over who owns the men who woke blank.",
    "enemyThemes": [
        "mark-hunters",
        "spy-ravens",
        "orc-outriders",
        "paid-knights",
    ],
}


def update_chapters_json() -> None:
    data = json.loads(CHAPTERS.read_text())
    for ch in data["chapters"]:
        if ch.get("chapter") == 2:
            ch["title"] = CH2_META["title"]
            ch["tagline"] = CH2_META["tagline"]
            ch["enemyThemes"] = list(CH2_META["enemyThemes"])
        elif ch.get("chapter") == 3:
            ch["title"] = CH3_META["title"]
            ch["tagline"] = CH3_META["tagline"]
            ch["enemyThemes"] = list(CH3_META["enemyThemes"])
    CHAPTERS.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def main() -> None:
    data = json.loads(SPINE.read_text())
    data["title"] = "Dungeons and Dogs: Lost Brothers"
    data["blurb"] = (
        "Adult R-rated pulp. Three amnesiac brothers and a dog wake in the Neon Wilderland — "
        "cyberpunk steel under a Middle-earth canopy, spirits in the fog, dragons on the ridgeline. "
        "Helix Dominion sells names; Project Pale wiped theirs. Chapters 1–3: Woods Without Names, "
        "Stim Dust Marches, SKU Trace. Chapters 4–9 still await the next rewrite pass."
    )

    for ch in data["chapters"]:
        if ch.get("chapter") == 2:
            ch["title"] = CH2_META["title"]
            ch["tagline"] = CH2_META["tagline"]
            ch["enemyThemes"] = list(CH2_META["enemyThemes"])
        elif ch.get("chapter") == 3:
            ch["title"] = CH3_META["title"]
            ch["tagline"] = CH3_META["tagline"]
            ch["enemyThemes"] = list(CH3_META["enemyThemes"])

    rewritten_ch2 = 0
    rewritten_ch3 = 0
    ch2_ids = []
    ch3_ids = []

    for i, node in enumerate(data["nodes"]):
        nid = str(node.get("id", ""))
        if nid.startswith("dt-ch02-"):
            ch2_ids.append(nid)
            before = json.dumps(node, sort_keys=True)
            new_node = rewrite_node(node, i, 2)
            data["nodes"][i] = new_node
            if before != json.dumps(new_node, sort_keys=True):
                rewritten_ch2 += 1
        elif nid.startswith("dt-ch03-"):
            ch3_ids.append(nid)
            before = json.dumps(node, sort_keys=True)
            new_node = rewrite_node(node, i, 3)
            data["nodes"][i] = new_node
            if before != json.dumps(new_node, sort_keys=True):
                rewritten_ch3 += 1

    stats = data.get("stats") or {}
    for row in stats.get("perChapter") or []:
        if row.get("chapter") == 2:
            row["title"] = CH2_META["title"]
            row["enemyThemes"] = list(CH2_META["enemyThemes"])
        elif row.get("chapter") == 3:
            row["title"] = CH3_META["title"]
            row["enemyThemes"] = list(CH3_META["enemyThemes"])
    data["stats"] = stats

    leftovers = []
    ban = (
        "Chain-Road",
        "thrall",
        "Candlemire",
        "Freemark",
        "freemark",
        "Lord Cade",
        "Nine-Mark",
        "Dust and Debt",
        "The Wanted Mark",
        "Brand-River",
        "cane field",
        "collar-yard",
    )
    for node in data["nodes"]:
        nid = str(node.get("id", ""))
        if not (nid.startswith("dt-ch02-") or nid.startswith("dt-ch03-")):
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

    print(f"ch2 nodes: {len(ch2_ids)} rewritten/changed: {rewritten_ch2}")
    print(f"ch3 nodes: {len(ch3_ids)} rewritten/changed: {rewritten_ch3}")
    print(f"leftover term hits: {len(leftovers)}")
    for item in leftovers[:50]:
        print(" leftover", item)


if __name__ == "__main__":
    main()
