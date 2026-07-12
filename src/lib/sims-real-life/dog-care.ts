import type {
  CareTip,
  FeedingNorm,
  RedFlag,
  ResearchSource,
} from "./research-types";

/**
 * Adult German Shepherd companion care module (educational, not veterinary advice).
 * Guidance is general best-practice flavor for game content — always defer to a vet for health decisions.
 */

export const DOG_PROFILE = {
  name: "Atlas",
  breed: "German Shepherd",
  lifeStage: "adult" as const,
  ageYears: 3,
  personality:
    "Loyal, athletic, and brainy — Atlas wants a job, a fair handler, and enough sniff-time to stay sane. Praise and play unlock his best self; chaos and harsh corrections unlock zoomies and side-quests you didn't ask for.",
};

export const DOG_FEEDING_NORMS: FeedingNorm[] = [
  {
    id: "adult-gsd-standard",
    lifeStage: "adult",
    weightBandLb: { min: 65, max: 90 },
    mealsPerDay: 2,
    dailyAmountGuidance:
      "2–3 cups split AM/PM depending on kibble kcal — follow bag + body condition",
    notes: [
      "Split into two meals rather than one giant bowl to support comfort and routine.",
      "Adjust portions if ribs disappear under fluff or become knife-edge sharp — body condition beats the bag number.",
      "Keep treats under ~10% of daily calories so training rewards don't silently supersize the day.",
      "Fresh water always available, especially after walks and enrichment games.",
    ],
    questHook: "Daily ration quest: Two measured bowls, one steady companion.",
  },
  {
    id: "adult-gsd-active",
    lifeStage: "adult",
    weightBandLb: { min: 70, max: 95 },
    mealsPerDay: 2,
    dailyAmountGuidance:
      "Often toward the higher end of the bag range on heavy training/hike days — still guided by waist tuck and energy, not vibes alone",
    notes: [
      "Working-breed days may need a modest bump; rest days may need a slight cut — watch the waist.",
      "If switching foods, transition over ~7 days to reduce tummy drama.",
      "Puzzle feeders or snuffle mats can turn mealtime into enrichment without free-feeding chaos.",
    ],
    questHook: "Raid-day rations: Fuel the working breed without overflowing the inventory.",
  },
];

export const DOG_CARE_TIPS: CareTip[] = [
  {
    id: "walk-structure",
    title: "Walk with a job, not just mileage",
    blurb:
      "Aim for roughly 45–90 minutes of total daily movement split across outings for a healthy adult GSD — mix structured heel segments with sniff breaks. Quality beats endless pavement pounding.",
    questHook: "Patrol quest: Miles matter less than a fair, sniff-rich route.",
  },
  {
    id: "enrichment-daily",
    title: "Brain work every day",
    blurb:
      "Puzzles, scent games, training mini-sessions, and chew outlets burn mental energy. An under-stimulated shepherd invents their own DLC (usually involving shoes).",
    questHook: "Side quest board: Clear one enrichment ticket before nightfall.",
  },
  {
    id: "rest-recovery",
    title: "Protect sleep and downtime",
    blurb:
      "Adult GSDs still need quiet crate/mat time and real naps. Over-scheduling every hour creates a wired athlete who never clocks out.",
    questHook: "Camp phase: Let Atlas log out so tomorrow's stats reset clean.",
  },
  {
    id: "bonding-rituals",
    title: "Bonding is a daily buff",
    blurb:
      "Short training games, calm petting consent checks, and cooperative care (towel wipes, collar on/off with treats) build trust. Relationship XP compounds.",
    questHook: "Affinity quest: Trade treats and calm touch for loyalty points.",
  },
  {
    id: "weather-pacing",
    title: "Pace for heat and hard surfaces",
    blurb:
      "Shepherds run hot. On warm days shorten intense fetch, walk earlier/later, and watch for excessive panting. Rotate soft-surface sniffaris when asphalt is a skillet.",
    questHook: "Climate check: Adjust the difficulty slider before the heat boss.",
  },
  {
    id: "training-short-sessions",
    title: "Keep cue practice short and sweet",
    blurb:
      "Several 5–15 minute positive sessions beat one marathon drill. End on success so the cue tree stays fun for a high-drive adult.",
    questHook: "Skill-tree grind: Small reps, big unlocks — quit while winning.",
  },
  {
    id: "chew-and-settle",
    title: "Legal outlets beat forbidden loot",
    blurb:
      "Offer approved chews and settle-on-place after excitement. Redirecting beats scolding when Atlas finds \"quest items\" under the couch.",
    questHook: "Inventory management: Swap contraband for sanctioned chew loot.",
  },
];

export const DOG_RED_FLAGS: RedFlag[] = [
  {
    id: "punishment-training",
    title: "Punishment-based \"dominance\" training",
    whyAvoid:
      "Harsh corrections, alpha rolls, and intimidation damage trust and can increase fear or aggression — especially in a sensitive working breed.",
    betterMove:
      "Use clear cues, rewards, and management. Reinforce what you want; prevent rehearsals of what you don't.",
  },
  {
    id: "heat-overexercise",
    title: "Over-exercising in heat",
    whyAvoid:
      "Long fetch sessions on hot days risk overheating; heavy panting and slowing down are not \"toughness XP.\"",
    betterMove:
      "Shift to early/late walks, shade, water, and nose-work games that tire the brain without cooking the body.",
  },
  {
    id: "free-feeding-chaos",
    title: "All-day free-feeding free-for-all",
    whyAvoid:
      "Grazing makes training rewards weaker, hides appetite changes, and often creeps weight upward.",
    betterMove:
      "Measured meals AM/PM (and puzzle feeding) so you can track intake and keep food motivating.",
  },
  {
    id: "recall-poison",
    title: "Calling Come only to end the fun",
    whyAvoid:
      "If Come always means leash-on and leave-the-park, your shepherd learns that listening cancels the party.",
    betterMove:
      "Practice joy recalls with jackpots and sometimes release back to play so the cue stays golden.",
  },
  {
    id: "puppy-mileage-myth",
    title: "Treating an adult like an infinite treadmill",
    whyAvoid:
      "Even adult GSDs need recovery; stacking intense running every day can irritate joints and amp arousal without teaching skills.",
    betterMove:
      "Balance strength of body with rest, training, and enrichment — variety is the real stamina build.",
  },
];

export const RESEARCH_SOURCES: ResearchSource[] = [
  {
    id: "akc-gsd",
    label: "Breed & companion care overview (German Shepherd Dog)",
    org: "American Kennel Club (AKC)",
  },
  {
    id: "avsab-pos-reinforcement",
    label: "Position statement favoring reward-based training methods",
    org: "American Veterinary Society of Animal Behavior (AVSAB)",
  },
  {
    id: "avma-pet-care",
    label: "General pet care and wellness education themes",
    org: "American Veterinary Medical Association (AVMA)",
  },
  {
    id: "aspca-training",
    label: "Positive training and enrichment guidance for companion dogs",
    org: "ASPCA",
  },
];
