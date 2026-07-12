import type { DogDrill } from "./research-types";

/**
 * Positive-reinforcement skill tree for an adult German Shepherd companion.
 * Educational best-practice cues only — not veterinary or aversive protocols.
 */
export const DOG_DRILLS: DogDrill[] = [
  {
    id: "sit",
    cue: "Sit",
    name: "Sit Foundation",
    blurb:
      "The root node of the cue tree. A crisp sit gives you a polite default and unlocks almost every other skill for an energetic adult GSD.",
    durationMinutes: 8,
    effort: "easy",
    bondingDeltaHint: 2,
    steps: [
      "Hold a treat near the nose, then arc it slowly up and back over the head so the rear naturally drops.",
      "Mark the moment the rear hits the floor (click or a short \"yes\"), then deliver the treat.",
      "Add the spoken cue \"Sit\" just before the lure once the motion is reliable.",
      "Fade the lure into an empty-hand gesture, then practice short sits in a quiet room.",
      "End while the dog is still eager — quit on a win, not on frustration.",
    ],
    commonMistakes: [
      "Pushing the dog's hips down instead of letting the sit happen.",
      "Repeating \"Sit-sit-sit\" so the cue becomes background noise.",
      "Holding sessions so long the dog zones out or starts offering frantic behaviors.",
    ],
    questHook: "Tutorial quest: Teach the polite sit — the key that opens the rest of the skill tree.",
  },
  {
    id: "down",
    cue: "Down",
    name: "Down from Sit",
    blurb:
      "A calm down from a solid sit. Useful for settling a working-breed brain when the house gets busy.",
    prerequisiteCueIds: ["sit"],
    durationMinutes: 10,
    effort: "easy",
    bondingDeltaHint: 2,
    steps: [
      "Ask for Sit first, then lure the nose down toward the paws and slightly forward until elbows drop.",
      "Mark and reward the moment the belly/elbows are on the floor.",
      "Pair the cue \"Down\" once the lure path is smooth.",
      "Practice on a comfy mat so the surface feels like a reward zone, not a punishment.",
      "Release with a cheerful release word, then invite play or a short sniff break.",
    ],
    commonMistakes: [
      "Skipping Sit and yanking the collar toward the floor.",
      "Only rewarding when the dog flops after long nagging — that teaches delay, not down.",
      "Practicing on cold tile only, then wondering why a GSD refuses the cue.",
    ],
    questHook: "Unlock: Descend into Down — turn bounce into calm belly contact.",
  },
  {
    id: "stay",
    cue: "Stay",
    name: "Stay Duration",
    blurb:
      "Stay is patience with a job. Build distance and duration separately so your adult GSD learns stillness is still a win.",
    prerequisiteCueIds: ["sit"],
    durationMinutes: 12,
    effort: "moderate",
    bondingDeltaHint: 3,
    steps: [
      "Start in Sit or Down, show an open-palm stay signal, take one small step back, then return and reward.",
      "Increase duration in tiny chunks before you add distance or mild distractions.",
      "Always return to the dog to pay — don't call them out of stay until release is taught separately.",
      "Use a clear release word (\"Free\" / \"Break\") so stay has a definite end.",
      "If they break, reset calmly with less challenge — set them up to succeed next rep.",
    ],
    commonMistakes: [
      "Adding distance, duration, and distractions all at once.",
      "Repeating \"Stay\" while walking away, which trains the dog to wait for the echo.",
      "Scolding breaks instead of lowering criteria and reinforcing success.",
    ],
    questHook: "Endurance trial: Hold the freeze frame while the world keeps moving.",
  },
  {
    id: "come",
    cue: "Come",
    name: "Recall (Come)",
    blurb:
      "Come is life-safety and freedom. Make returning to you the best party on the block for a high-drive shepherd.",
    prerequisiteCueIds: ["sit"],
    durationMinutes: 12,
    effort: "moderate",
    bondingDeltaHint: 4,
    steps: [
      "Begin on a long line in a low-distraction yard; say \"Come\" once in a happy voice, then gently guide in if needed.",
      "Jackpot with high-value treats or a quick tug game the moment they arrive — party at the handler.",
      "Ask for a Sit on arrival sometimes so landings are tidy, then release to sniff or play.",
      "Practice short recalls many times; avoid calling only when fun ends (crate, nail trim, leaving the park).",
      "Gradually add mild distractions only after near-perfect short-range success.",
    ],
    commonMistakes: [
      "Calling \"Come\" then chasing or scolding when they finally arrive.",
      "Using Come only to end play — the cue becomes a buzzkill.",
      "Repeating the cue while the dog ignores you, poisoning the word.",
    ],
    questHook: "Summon quest: Call your companion home — make return the legendary loot drop.",
  },
  {
    id: "heel",
    cue: "Heel",
    name: "Heel / Loose-Leash Intro",
    blurb:
      "Loose-leash intro for walks that don't feel like sled-dog tryouts. Reward the sweet spot at your side; reset when the leash goes tight.",
    prerequisiteCueIds: ["come"],
    durationMinutes: 15,
    effort: "moderate",
    bondingDeltaHint: 3,
    steps: [
      "Start indoors: lure into position at your left (or preferred) side, mark, and feed at the seam of your pant leg.",
      "Take a few steps; reward frequently for a soft leash and attention check-ins.",
      "If the leash tightens, stop or gently change direction — motion resumes when the leash softens.",
      "Add the cue \"Heel\" once the position pattern is clear, then practice short outdoor loops.",
      "Alternate Heel segments with sniff breaks so the walk stays fair for a working breed.",
    ],
    commonMistakes: [
      "Constant collar corrections instead of reinforcing the loose-leash position.",
      "Expecting a marathon heel with no sniff breaks on an adult GSD.",
      "Only rewarding at the front door after a chaotic pull-fest.",
    ],
    questHook: "Escort mission: Walk as a unit — soft leash, shared map.",
  },
  {
    id: "leave-it",
    cue: "Leave it",
    name: "Leave-It Impulse Control",
    blurb:
      "Leave-it protects against sidewalk snacks and dropped chaos. Teach \"that thing is not yours\" with clear trade-ups, not scare tactics.",
    prerequisiteCueIds: ["stay"],
    durationMinutes: 10,
    effort: "moderate",
    bondingDeltaHint: 3,
    steps: [
      "Show a low-value treat in a closed fist; wait for the dog to stop pawing/nosing, then mark and reward from the other hand.",
      "Progress to an open palm covered by your other hand, then to a treat on the floor under your shoe.",
      "Add the cue \"Leave it\" just before presenting the temptation once the pattern is solid.",
      "Reward heavily for looking away or checking in with you — the jackpot beats the trash snack.",
      "Practice with real-life decoys (toy, tissue) on leash before trusting off-leash judgment.",
    ],
    commonMistakes: [
      "Yanking the dog away without teaching an alternative behavior.",
      "Using leave-it and take-it interchangeably so the dog is confused.",
      "Testing with dangerous items before the cue is fluent.",
    ],
    questHook: "Temptation trial: Ignore the decoy loot; claim the better reward from your handler.",
  },
  {
    id: "place",
    cue: "Place",
    name: "Place / Settle",
    blurb:
      "Send-to-mat settle for doorbells, dinner, and laptop time. Down + Stay skills combine into a portable calm zone for a busy shepherd mind.",
    prerequisiteCueIds: ["down", "stay"],
    durationMinutes: 15,
    effort: "moderate",
    bondingDeltaHint: 4,
    steps: [
      "Toss treats onto a distinct mat/bed until the dog happily steps on it.",
      "Cue Down on the mat, mark, and reward while they stay on the platform.",
      "Add a send from one step away: \"Place,\" guide to the mat, Down, then short Stay.",
      "Release off the mat with your release word; never let them self-dismiss during early reps.",
      "Build duration during mild household distractions before using it for real guests.",
    ],
    commonMistakes: [
      "Using Place only when you're frustrated, so the mat predicts stress.",
      "Skipping Down/Stay foundations and expecting a long settle on day one.",
      "Letting the dog leave the mat unreleased, then wondering why Place is optional.",
    ],
    questHook: "Sanctuary quest: Claim the mat — your calm base in a noisy world.",
  },
  {
    id: "enrichment-scent",
    cue: "Find it",
    name: "Enrichment Scent / Puzzle Game",
    blurb:
      "Nose-work and puzzle games burn mental fuel. Mid-tree unlock that keeps an adult GSD's brain busy without pounding joints.",
    prerequisiteCueIds: ["sit"],
    durationMinutes: 12,
    effort: "easy",
    bondingDeltaHint: 3,
    steps: [
      "Start easy: let the dog watch you place a few treats under a towel or in a snuffle mat, then cue \"Find it.\"",
      "Cheer soft successes; let them problem-solve without hovering or grabbing the toy away.",
      "Progress to hiding treats in rooms or cardboard boxes while they wait in a Sit/Stay.",
      "Rotate puzzle toys so difficulty stays interesting — boredom kills engagement.",
      "Keep sessions short and end before frustration; sniffing is work for a shepherd.",
    ],
    commonMistakes: [
      "Making puzzles so hard the dog quits or chews the toy apart in protest.",
      "Skipping daily enrichment and expecting a long walk alone to settle a GSD.",
      "Turning every game into obedience drilling — leave room for joyful searching.",
    ],
    questHook: "Side dungeon: Follow the scent trail; loot with your nose.",
  },
];
