import type { InventoryItem, Quest, Stats } from "./types";

export { STAT_KEYS } from "./types";

export const STAT_LABELS: Record<keyof Stats, string> = {
  logic: "Logic",
  craft: "Craft",
  charm: "Charm",
  grit: "Grit",
  debug: "Debug",
};

/** JP starts strong in people + hardware; coding stats are the growth arc. */
export const STARTING_STATS: Stats = {
  logic: 8,
  craft: 14,
  charm: 15,
  grit: 11,
  debug: 7,
};

export const LEVEL_THRESHOLDS = [0, 40, 90, 150, 220, 300, 400, 520];

export function levelFromXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return Math.min(level, LEVEL_THRESHOLDS.length);
}

export const xpToLevel = levelFromXp;

export function xpProgress(xp: number): { level: number; into: number; need: number; pct: number } {
  const level = levelFromXp(xp);
  const floor = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const ceil = LEVEL_THRESHOLDS[level] ?? floor + 100;
  const into = xp - floor;
  const need = Math.max(1, ceil - floor);
  return { level, into, need, pct: Math.min(100, Math.round((into / need) * 100)) };
}

export const INVENTORY_CATALOG: InventoryItem[] = [
  {
    id: "terminal-key",
    name: "Terminal Key",
    blurb: "A scratched USB that opens Haven’s practice shell. Typing still feels weird — that’s fine.",
    icon: "terminal",
  },
  {
    id: "cad-notes",
    name: "CAD Field Notes",
    blurb: "Hand-scrawled tolerances from late nights at the P2S. Bridging mesh to meaning.",
    icon: "cad",
  },
  {
    id: "filament-lore",
    name: "Filament Lore",
    blurb: "PLA vs PETG vs ABS cheat-sheet. Hardware people speak this fluently; Lunar Foundry will too.",
    icon: "filament",
  },
  {
    id: "git-amulet",
    name: "Git Amulet",
    blurb: "commit → push → PR. A charm against ‘works on my machine.’",
    icon: "badge",
  },
  {
    id: "api-map",
    name: "API Trail Map",
    blurb: "GET /telemetry, POST /intent. Robots and web apps both answer when you ask politely.",
    icon: "notes",
  },
  {
    id: "slicer-compass",
    name: "Slicer Compass",
    blurb: "Layer height, walls, supports — the P2S dialect translated into engineer-speak.",
    icon: "cad",
  },
  {
    id: "social-lens",
    name: "Social Lens",
    blurb: "Ethical OSINT for builders: listen harder, spot phishing tells, interview like a pro.",
    icon: "key",
  },
  {
    id: "foundry-offer",
    name: "Lunar Foundry Offer Letter",
    blurb: "Fictional seal of the Pittsburgh moon-hardware shop. You earned the interview — and the yes.",
    icon: "badge",
  },
];

export const QUESTS: Quest[] = [
  {
    id: "q1-orientation",
    chapter: 1,
    title: "Orientation at Haven Dock",
    tagline: "Name the nerves. Pick up the key.",
    synopsis:
      "JP steps into Code School under Downtown’s sodium glow. The goal isn’t becoming a different person — it’s wiring your P2S brain and people skills into software that Pittsburgh’s Lunar Foundry would trust.",
    focus: ["mindset", "character sheet"],
    unlockAfter: null,
    rewards: { xp: 25, stats: { grit: 1 } },
    steps: [
      {
        id: "q1-n1",
        type: "narrative",
        title: "Sodium & steel",
        body: `Downtown Haven hums like a server room with better coffee. You are **JP** — Justin — the one who can talk a nervous stakeholder into naming the real requirement, and who can coax a **Bambu Lab P2S** into printing parts that actually fit.

Coding languages still make your stomach drop. Good. That means you care.

Somewhere across the bridges, a fictional Pittsburgh shop called **Lunar Foundry** builds moon-adjacent robots — printers, fixtures, telemetry boards. They hire people who can speak *machine* and *human*. This campaign is your rehearsal.`,
      },
      {
        id: "q1-c1",
        type: "choice",
        title: "First check-in",
        prompt:
          "A mentor asks why you want tech work. How do you answer without selling yourself short?",
        options: [
          {
            id: "humble-craft",
            label: "Lead with the P2S",
            approach: "I’m strongest in craft + hardware; I want code that serves the print bed.",
            stat: "craft",
            dc: 10,
            success: {
              text: "They nod. ‘Hardware fluency is rare. We’ll teach the syntax; keep that instinct.’",
              xp: 8,
              stats: { craft: 1 },
            },
            fail: {
              text: "You undersell yourself — but the mentor writes it down anyway: ‘honest about gaps = coachable.’ Fail-forward.",
              xp: 4,
              stats: { grit: 1 },
            },
          },
          {
            id: "charm-story",
            label: "Tell the Lunar Foundry story",
            approach: "Paint the moon-robot shop and your desire to join that kind of team.",
            stat: "charm",
            dc: 11,
            success: {
              text: "The room leans in. Aspiration, framed as training — not cosplay. That’s Charm done right.",
              xp: 10,
              stats: { charm: 1 },
            },
            fail: {
              text: "It sounds a little movie-trailer. Mentor: ‘Cool vision. Now ground it in one skill you’ll ship this week.’",
              xp: 5,
            },
          },
          {
            id: "grit-admit",
            label: "Admit the language nerves",
            approach: "Name the fear of looking dumb in a terminal.",
            stat: "grit",
            dc: 9,
            success: {
              text: "Silence, then: ‘That’s the most professional thing you’ve said. We debug egos first.’",
              xp: 9,
              stats: { grit: 1, debug: 1 },
            },
            fail: {
              text: "You spiral a bit. Mentor hands you a sticky note: ‘Nervous ≠ unready.’",
              xp: 4,
              stats: { grit: 1 },
            },
          },
        ],
      },
      {
        id: "q1-loot",
        type: "loot",
        title: "Issued kit",
        body: "You get a practice shell and a blank character sheet. Stats aren’t destiny — they’re dials you turn by shipping.",
        itemId: "terminal-key",
        xp: 5,
      },
      {
        id: "q1-n2",
        type: "narrative",
        title: "Campaign brief",
        body: `**Beginning:** markup, logic, git, and reading errors without panic.
**Middle:** APIs, the print↔code bridge, ethical social engineering for builders.
**End:** a Lunar Foundry interview boss fight — then graduation.

Choices matter. Rolls use your stats. Failures teach. Let’s print a career.`,
      },
    ],
  },
  {
    id: "q2-markup",
    chapter: 2,
    title: "Rover Status Board (HTML/CSS)",
    tagline: "Structure first. Style second.",
    synopsis:
      "Lunar Foundry’s mock brief: ship a tiny rover status page. You learn HTML structure and CSS that doesn’t fight the dark downtown HUD.",
    focus: ["HTML", "CSS"],
    unlockAfter: "q1-orientation",
    rewards: { xp: 35, stats: { logic: 1 } },
    steps: [
      {
        id: "q2-n1",
        type: "narrative",
        title: "The brief",
        body: `Ticket from Lunar Foundry (training sim):

> Build a **status board** for rover *HARB-7*: battery %, last ping, and a “safe to print fixture” flag.
> Use semantic HTML. Style with CSS variables — think Haven’s gold on ink.

You don’t need to be a designer. You need a skeleton that a teammate can read.`,
      },
      {
        id: "q2-ch1",
        type: "challenge",
        title: "Semantic bones",
        prompt: "Which markup best represents a page title for the rover board?",
        codeHint: "<???>HARB-7 Status</???>",
        options: [
          { id: "h1", label: "<h1>HARB-7 Status</h1>", correct: true },
          { id: "div", label: "<div class=\"title\">HARB-7 Status</div>", correct: false },
          { id: "p", label: "<p><b>HARB-7 Status</b></p>", correct: false },
        ],
        explanation:
          "Headings describe structure for humans and assistive tech. A lonely <div> is a cardboard box — fine for layout, wrong for meaning.",
        xp: 12,
        stats: { logic: 1 },
      },
      {
        id: "q2-c1",
        type: "choice",
        title: "Style under pressure",
        prompt: "Battery is critical (12%). How do you surface that without screaming?",
        options: [
          {
            id: "css-var",
            label: "Use a CSS variable + warn class",
            approach: "color: var(--dt-warn) on .battery[data-critical]",
            stat: "logic",
            dc: 11,
            success: {
              text: "Clean signal. Lunar Foundry likes systems of meaning, not one-off red text.",
              xp: 10,
              stats: { logic: 1 },
            },
            fail: {
              text: "You hard-code #ff0000. Mentor: ‘Works once. Variables scale.’ You refactor — still XP.",
              xp: 5,
            },
          },
          {
            id: "craft-layout",
            label: "Treat it like a print bed layout",
            approach: "Align ‘sensors’ like parts on a plate — clear margins, no collisions.",
            stat: "craft",
            dc: 10,
            success: {
              text: "Your layout ‘fits.’ Hardware brains transfer: clearance is CSS padding by another name.",
              xp: 10,
              stats: { craft: 1 },
            },
            fail: {
              text: "Elements overlap like a bad skirt. You add gap and learn why flex exists.",
              xp: 5,
              stats: { craft: 1 },
            },
          },
        ],
      },
      {
        id: "q2-loot",
        type: "loot",
        title: "CAD notes unlocked",
        body: "You sketch how HTML nests like assemblies. Structure before surface finish.",
        itemId: "cad-notes",
        xp: 6,
      },
    ],
  },
  {
    id: "q3-script",
    chapter: 3,
    title: "Telemetry Whispers (JS/TS)",
    tagline: "Values move. Types keep you honest.",
    synopsis:
      "Make the status board update from fake sensor data. Meet JavaScript, then TypeScript as a seatbelt — not a monster.",
    focus: ["JavaScript", "TypeScript"],
    unlockAfter: "q2-markup",
    rewards: { xp: 40, stats: { logic: 1, debug: 1 } },
    steps: [
      {
        id: "q3-n1",
        type: "narrative",
        title: "Numbers that change",
        body: `Static HTML is a photo of the print. Live telemetry is the print *while* it runs.

You’ll read a tiny JS function that returns battery percent, then add a TypeScript type so the next engineer (future-you) doesn’t pass a string called \`"eighty"\`.`,
      },
      {
        id: "q3-ch1",
        type: "challenge",
        title: "Read the function",
        prompt: "What does this return when battery is 18?",
        codeHint: `function status(battery: number) {\n  return battery < 20 ? "critical" : "ok";\n}`,
        options: [
          { id: "crit", label: '"critical"', correct: true },
          { id: "ok", label: '"ok"', correct: false },
          { id: "18", label: "18", correct: false },
        ],
        explanation:
          "Comparisons are just questions. 18 < 20 is true, so you get the critical branch. Reading code aloud is a real skill.",
        xp: 14,
        stats: { logic: 1 },
      },
      {
        id: "q3-c1",
        type: "choice",
        title: "TypeScript nerves",
        prompt: "The editor underlines a type error. Your gut says run anyway. What’s the JP move?",
        options: [
          {
            id: "read-error",
            label: "Read the red text like a slicer warning",
            approach: "Treat the type error as a bed-leveling alert — don’t ignore it.",
            stat: "debug",
            dc: 10,
            success: {
              text: "You fix the type. The underline vanishes. Same dopamine as a first-layer perfect.",
              xp: 12,
              stats: { debug: 1 },
            },
            fail: {
              text: "You // @ts-ignore. Mentor deletes it gently: ‘Shortcuts melt like bad supports.’",
              xp: 5,
              stats: { grit: 1 },
            },
          },
          {
            id: "ask-charm",
            label: "Ask a teammate to rubber-duck",
            approach: "Explain the function out loud to someone patient.",
            stat: "charm",
            dc: 9,
            success: {
              text: "Halfway through explaining, you spot the bug. Charm unlocked Debug.",
              xp: 11,
              stats: { charm: 1, debug: 1 },
            },
            fail: {
              text: "You apologize too much. Teammate: ‘Questions are the job.’ Try again clearer.",
              xp: 5,
            },
          },
        ],
      },
      {
        id: "q3-n2",
        type: "narrative",
        title: "Languages aren’t identity",
        body: `Feeling slow in JS doesn’t mean you don’t belong in tech. Lunar Foundry needs people who already understand **physical systems**. Syntax is trainable. Panic is optional — Grit is the stat that makes it so.`,
      },
    ],
  },
  {
    id: "q4-git",
    chapter: 4,
    title: "Version Control Rite",
    tagline: "commit, don’t abandon.",
    synopsis:
      "Save your work like a grown engineer. Git is time travel for scared beginners — and a collaboration language for Lunar Foundry.",
    focus: ["git", "collaboration"],
    unlockAfter: "q3-script",
    rewards: { xp: 35, stats: { grit: 1 } },
    steps: [
      {
        id: "q4-n1",
        type: "narrative",
        title: "The fear of breaking main",
        body: `Git feels like a ritual with too many knives. Reframe: your P2S keeps print history; git keeps *code* history. Branches are plates. \`main\` is the plate you ship.`,
      },
      {
        id: "q4-ch1",
        type: "challenge",
        title: "Safe sequence",
        prompt: "You finished the status board on a feature branch. What’s the healthy next move?",
        options: [
          {
            id: "pr",
            label: "Commit, push the branch, open a pull request",
            correct: true,
          },
          {
            id: "force",
            label: "Force-push straight to main because it’s ‘just a demo’",
            correct: false,
          },
          {
            id: "zip",
            label: "Email a zip of node_modules to your mentor",
            correct: false,
          },
        ],
        explanation:
          "PRs are how teams review intent. Force-pushing main is how demos become incidents. Zips of node_modules are a crime against bandwidth.",
        xp: 14,
        stats: { grit: 1 },
        itemId: "git-amulet",
      },
      {
        id: "q4-c1",
        type: "choice",
        title: "Merge conflict appears",
        prompt: "Two edits touch the same battery label. How do you resolve?",
        options: [
          {
            id: "debug-read",
            label: "Read both sides, keep the clearer label",
            approach: "Treat conflict markers like overlapping perimeters in a slicer preview.",
            stat: "debug",
            dc: 12,
            success: {
              text: "You merge with intent. Conflict markers deleted. History stays honest.",
              xp: 12,
              stats: { debug: 1 },
            },
            fail: {
              text: "You leave a <<<<<<< in the file. CI screams. You learn to search for the markers.",
              xp: 6,
              stats: { debug: 1 },
            },
          },
          {
            id: "charm-talk",
            label: "Ping the other author",
            approach: "Social engineering for good: ask what they meant before guessing.",
            stat: "charm",
            dc: 10,
            success: {
              text: "They explain. You combine labels. Requirements > ego.",
              xp: 11,
              stats: { charm: 1 },
            },
            fail: {
              text: "Slack goes quiet. You document your best guess in the PR — still better than silence.",
              xp: 5,
            },
          },
        ],
      },
    ],
  },
  {
    id: "q5-errors-api",
    chapter: 5,
    title: "Error Runes & API Trails",
    tagline: "Read the stack. Ask the network.",
    synopsis:
      "A broken fetch to /api/telemetry. Learn to read errors and treat APIs like rover endpoints — request, response, status codes.",
    focus: ["debugging", "APIs"],
    unlockAfter: "q4-git",
    rewards: { xp: 45, stats: { debug: 1, logic: 1 } },
    steps: [
      {
        id: "q5-n1",
        type: "narrative",
        title: "Red text is a quest giver",
        body: `Console:

\`TypeError: Failed to fetch\`
\`GET /api/telemetry 404\`

Beginners see failure. Debuggers see **coordinates**. Same energy as a P2S saying nozzle temp not reached — the machine is talking.`,
      },
      {
        id: "q5-ch1",
        type: "challenge",
        title: "Status codes",
        prompt: "The rover API returns 404 for /api/telemety (note the typo). What happened?",
        options: [
          { id: "typo", label: "Wrong path — the resource isn’t at that URL", correct: true },
          { id: "auth", label: "Always means you’re fired", correct: false },
          { id: "ok", label: "404 means success with empty body", correct: false },
        ],
        explanation:
          "404 = not found. Fix the path (telemetry). 401/403 are auth. 500 is the server melting. Reading status codes is half of API work.",
        xp: 14,
        stats: { debug: 1 },
      },
      {
        id: "q5-c1",
        type: "choice",
        title: "Design the handshake",
        prompt: "How should the board ask Lunar Foundry’s sim for battery?",
        options: [
          {
            id: "get-json",
            label: "GET JSON and render fields",
            approach: "fetch('/api/telemetry').then(r => r.json())",
            stat: "logic",
            dc: 11,
            success: {
              text: "Idempotent reads. The board stays a client, not a cowboy.",
              xp: 12,
              stats: { logic: 1 },
              itemId: "api-map",
            },
            fail: {
              text: "You POST a delete by accident in the sim. Mentor resets the sandbox. Lesson: methods matter.",
              xp: 6,
            },
          },
          {
            id: "grit-retry",
            label: "Add a calm retry on network blips",
            approach: "One retry with backoff — like reprinting after a spaghetti fail, not ten blind retries.",
            stat: "grit",
            dc: 12,
            success: {
              text: "Resilient UX. Lunar Foundry field robots need the same patience.",
              xp: 13,
              stats: { grit: 1 },
              itemId: "api-map",
            },
            fail: {
              text: "Infinite retry spins the fan. You add a maxAttempts constant. Growth.",
              xp: 6,
              stats: { grit: 1 },
            },
          },
        ],
      },
      {
        id: "q5-n2",
        type: "narrative",
        title: "APIs are conversations",
        body: `You already know conversations: stakeholders, vendors, print techs. An API is a conversation with a contract — headers, body, status. Charm helps you write clear docs; Logic helps you keep the contract.`,
      },
    ],
  },
  {
    id: "q6-print-bridge",
    chapter: 6,
    title: "P2S Bridge — Code Meets Filament",
    tagline: "G-code literacy lite. Slicer as compiler.",
    synopsis:
      "Your home turf. Connect software concepts to the Bambu Lab P2S: slicers as compilers, G-code as assembly, fixtures as hardware APIs.",
    focus: ["3D printing", "systems thinking"],
    unlockAfter: "q5-errors-api",
    rewards: { xp: 50, stats: { craft: 2 } },
    steps: [
      {
        id: "q6-n1",
        type: "narrative",
        title: "Home field",
        body: `The P2S sits like a familiar NPC. Lunar Foundry’s moon-robot fixtures aren’t magic — they’re **iterated prints** driven by software pipelines.

Tonight you translate what you already know into engineer dialect so the interview doesn’t feel like cosplay.`,
      },
      {
        id: "q6-ch1",
        type: "challenge",
        title: "Slicer as compiler",
        prompt: "In this metaphor, what is the slicer doing?",
        options: [
          {
            id: "compile",
            label: "Turning a 3D model into machine instructions (like source → machine code)",
            correct: true,
          },
          {
            id: "paint",
            label: "Only choosing filament color for marketing photos",
            correct: false,
          },
          {
            id: "git",
            label: "Replacing the need for version control",
            correct: false,
          },
        ],
        explanation:
          "STL/3MF → slicer → G-code. Settings (layer height, walls, supports) are compiler flags. You already speak this — now name it in interviews.",
        xp: 16,
        stats: { craft: 1, logic: 1 },
        itemId: "filament-lore",
      },
      {
        id: "q6-c1",
        type: "choice",
        title: "G-code whisper",
        prompt: "A line looks like G1 X120 Y45 E0.12. How do you talk about it without pretending to be a CNC wizard?",
        options: [
          {
            id: "honest",
            label: "Move command + extrusion — literacy, not lore dumps",
            approach: "Explain G1 as controlled motion; E as filament feed. Stay humble.",
            stat: "craft",
            dc: 9,
            success: {
              text: "Foundry engineers grin. Competent honesty beats fake expertise.",
              xp: 14,
              stats: { craft: 1 },
              itemId: "slicer-compass",
            },
            fail: {
              text: "You overclaim. Mentor: ‘Say what you know; offer to learn the rest.’ Still land the item.",
              xp: 7,
              itemId: "slicer-compass",
            },
          },
          {
            id: "iot",
            label: "Map it to IoT telemetry",
            approach: "Printer states ≈ device shadows; cloud queue ≈ job API.",
            stat: "logic",
            dc: 12,
            success: {
              text: "You bridge print farm ops to software architecture. That’s the Lunar Foundry hire signal.",
              xp: 15,
              stats: { logic: 1 },
              itemId: "slicer-compass",
            },
            fail: {
              text: "Metaphor stretches thin. You simplify: ‘Jobs in, status out.’ Clear enough.",
              xp: 7,
            },
          },
        ],
      },
      {
        id: "q6-n2",
        type: "narrative",
        title: "You’re not ‘bad at code’",
        body: `You’re **early** at languages and **advanced** at physical iteration. Code School’s job is to connect those circuits — not erase the P2S from your identity.`,
      },
    ],
  },
  {
    id: "q7-social",
    chapter: 7,
    title: "Ethical Social Engineering",
    tagline: "People skills as product skills.",
    synopsis:
      "Weaponize Charm for good: stakeholder interviews, requirements mining, and phishing-awareness so builders don’t ship attack surface by accident.",
    focus: ["soft skills", "security mindset"],
    unlockAfter: "q6-print-bridge",
    rewards: { xp: 45, stats: { charm: 2 } },
    steps: [
      {
        id: "q7-n1",
        type: "narrative",
        title: "The good kind of social engineering",
        body: `Forget Hollywood hacking. Here, social engineering means:

1. **Interview** operators until the real constraint appears.
2. **Defend** against phishing so Lunar Foundry credentials stay Lunar Foundry’s.
3. **Persuade** teams to ship the boring secure default.

No exploit kits. No credential theft tutorials. Just professional people craft.`,
      },
      {
        id: "q7-c1",
        type: "choice",
        title: "Stakeholder at the print farm",
        prompt: "A tech says ‘the robot just hates Mondays.’ What’s your move?",
        options: [
          {
            id: "probe",
            label: "Ask for the last three Monday failure logs",
            approach: "Translate vibe into data — ethical OSINT on systems, not people doxxing.",
            stat: "charm",
            dc: 11,
            success: {
              text: "They open the logs. Pattern: weekend firmware push. Requirements captured.",
              xp: 14,
              stats: { charm: 1, logic: 1 },
            },
            fail: {
              text: "They clam up. You rephrase: ‘Help me protect your Mondays.’ Soft reopen.",
              xp: 7,
              stats: { charm: 1 },
            },
          },
          {
            id: "phishing",
            label: "Spot the fake ‘IT reset’ email in their inbox story",
            approach: "Teach the tell: urgency + link + secrecy = slow down.",
            stat: "debug",
            dc: 10,
            success: {
              text: "You coach verification via known channels. Defense mindset for builders.",
              xp: 13,
              stats: { debug: 1 },
              itemId: "social-lens",
            },
            fail: {
              text: "You lecture. Eyes glaze. Mentor: ‘Show one screenshot, ask one question.’",
              xp: 6,
            },
          },
        ],
      },
      {
        id: "q7-ch1",
        type: "challenge",
        title: "Requirements vs solutions",
        prompt: "A manager says ‘add blockchain to the rover.’ Best ethical redirect?",
        options: [
          {
            id: "why",
            label: "Ask what problem they’re trying to solve, then propose the smallest fit",
            correct: true,
          },
          {
            id: "yes",
            label: "Agree immediately to look senior",
            correct: false,
          },
          {
            id: "mock",
            label: "Mock them in Slack",
            correct: false,
          },
        ],
        explanation:
          "Charm + Logic: honor the person, challenge the prescription. Lunar Foundry ships parts that land — not buzzwords.",
        xp: 14,
        stats: { charm: 1 },
        itemId: "social-lens",
      },
    ],
  },
  {
    id: "q8-boss",
    chapter: 8,
    title: "Boss Fight: Lunar Foundry Interview",
    tagline: "Graduation under Pittsburgh light.",
    synopsis:
      "The finale. A panel blends print craft, code literacy, git hygiene, API calm, and ethical people skills. Win state: offer letter + graduation.",
    focus: ["interview", "capstone"],
    unlockAfter: "q7-social",
    rewards: { xp: 80, stats: { grit: 1, logic: 1, charm: 1 } },
    steps: [
      {
        id: "q8-n1",
        type: "narrative",
        title: "Across the bridges",
        body: `Fictional lobby. Brushed aluminum. A rover prototype behind glass — fixtures that could have come off a **P2S**.

Panel: firmware lead, ops lead, hiring manager.

This isn’t about being the best programmer in the room. It’s about being the bridge.`,
      },
      {
        id: "q8-c1",
        type: "choice",
        title: "Round 1 — Craft",
        prompt: "‘Walk us through how you’d iterate a moon-dust seal fixture.’",
        options: [
          {
            id: "print-loop",
            label: "CAD → slice → print → measure → commit notes",
            approach: "Close the loop; mention tolerances and when you’d ask for CNC.",
            stat: "craft",
            dc: 12,
            success: {
              text: "Ops lead: ‘That’s shop language. Welcome.’",
              xp: 16,
              stats: { craft: 1 },
            },
            fail: {
              text: "You skip measurement. They push: ‘How do you know it fit?’ You recover with calipers talk.",
              xp: 8,
              stats: { grit: 1 },
            },
          },
          {
            id: "software-loop",
            label: "Instrument the printer farm via API status",
            approach: "Tie Craft to the API Trail Map — jobs, failures, alerts.",
            stat: "logic",
            dc: 13,
            success: {
              text: "Firmware lead lights up. Hardware + software in one answer.",
              xp: 17,
              stats: { logic: 1 },
            },
            fail: {
              text: "Too abstract. You plant feet: ‘First I’d print three and measure.’ Grounded recovery.",
              xp: 8,
            },
          },
        ],
      },
      {
        id: "q8-ch1",
        type: "challenge",
        title: "Round 2 — Code calm",
        prompt: "Whiteboard: battery < 20 should mark critical. Which is correct?",
        codeHint: "const critical = ???",
        options: [
          { id: "cmp", label: "battery < 20", correct: true },
          { id: "assign", label: "battery = 20", correct: false },
          { id: "str", label: "battery == \"low\"", correct: false },
        ],
        explanation:
          "Comparisons vs assignments vs vague strings. You read it. You didn’t freeze. That’s the win.",
        xp: 18,
        stats: { logic: 1, debug: 1 },
      },
      {
        id: "q8-c2",
        type: "choice",
        title: "Round 3 — Ethical social engineering",
        prompt:
          "They ask how you would influence safer behavior without authority: a stakeholder wants the wrong feature, and operators keep clicking sketchy printer-maintenance emails.",
        options: [
          {
            id: "ethic",
            label: "Interview the stakeholder until the real requirement appears",
            approach: "Ethical social engineering: consent, context, and questions over pressure.",
            stat: "charm",
            dc: 12,
            success: {
              text: "Hiring manager: ‘That’s product instinct.’ You honor the person while challenging the prescription.",
              xp: 16,
              stats: { charm: 1 },
              itemId: "social-lens",
            },
            fail: {
              text: "Story meanders. You land the lesson: ‘I ask why before I build, then I write the requirement back in plain English.’",
              xp: 8,
              stats: { grit: 1 },
            },
          },
          {
            id: "secure",
            label: "Teach phishing-awareness without making attack tooling",
            approach: "Defense mindset: urgency, links, secrecy, and sender mismatch mean verify out of band.",
            stat: "debug",
            dc: 11,
            success: {
              text: "Security-aware builder. You give operators a reporting path and safer defaults, not a deception playbook.",
              xp: 15,
              stats: { debug: 1, charm: 1 },
              itemId: "social-lens",
            },
            fail: {
              text: "Details fuzzy. You correct course: no real secrets, no exploit steps, escalate to known IT channels. Honesty scores.",
              xp: 8,
              stats: { charm: 1 },
            },
          },
        ],
      },
      {
        id: "q8-loot",
        type: "loot",
        title: "Offer packet",
        body: "Conditional offer: apprentice systems builder — print farm + tooling software. Fictional. Still feels real.",
        itemId: "foundry-offer",
        xp: 20,
      },
      {
        id: "q8-grad",
        type: "graduation",
        title: "Graduation — Code School by JP",
        body: `You walked in nervous about languages and walked out with a map:

- Markup & style for human-readable boards
- JS/TS as seatbelts, not identity
- Git as collaboration
- Errors & APIs as conversations
- P2S craft as your unfair advantage
- Charm as ethical leverage

**Lunar Foundry** (the Pittsburgh moon-robot dream) isn’t a fantasy anymore — it’s a practice plan.

Haven’s downtown lights flicker. Character sheet saved. Class dismissed. Go print something that matters.`,
      },
    ],
  },
];

export function getQuest(id: string): Quest | undefined {
  return QUESTS.find((q) => q.id === id);
}

export function getItem(id: string): InventoryItem | undefined {
  return INVENTORY_CATALOG.find((i) => i.id === id);
}

export const FINAL_QUEST_ID = "q8-boss";

export function isCampaignWon(completedQuestIds: readonly string[]): boolean {
  return completedQuestIds.includes(FINAL_QUEST_ID);
}
