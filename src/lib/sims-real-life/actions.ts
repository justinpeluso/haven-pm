/**
 * Rest, social, and Magic (focus) actions — fantasy veneer + plain subtitles.
 */

export type LifeAction = {
  id: string;
  fantasyName: string;
  subtitle: string;
  blurb: string;
  kind: "rest" | "social" | "magic" | "prep";
  energyCostHint: number;
  energyGainHint?: number;
  xpHint: number;
  moneyDeltaHint?: number;
  mealPrepDeltaHint?: number;
  stat?: "charisma" | "magic" | "computer" | "wisdom" | "constitution";
  dc?: number;
  questHook?: string;
};

export const LIFE_ACTIONS: LifeAction[] = [
  {
    id: "rest-day",
    fantasyName: "Long Rest at the Keep",
    subtitle: "End day / sleep",
    blurb: "Adaptation happens between Trials of Iron. Sleep restores energy; the scale ticks from today’s surplus fiction.",
    kind: "rest", energyCostHint: 0, energyGainHint: 100, xpHint: 5, stat: "constitution", dc: 8,
    questHook: "Close the day scroll. Tomorrow’s rations await.",
  },
  {
    id: "short-rest",
    fantasyName: "Breather by the Hearth",
    subtitle: "Short rest",
    blurb: "Twenty quiet minutes. Soft energy recover without ending the day.",
    kind: "rest", energyCostHint: 0, energyGainHint: 25, xpHint: 2,
  },
  {
    id: "social-checkin",
    fantasyName: "Tavern Compact",
    subtitle: "Friend / partner check-in",
    blurb: "Charisma check: stay human without derailing the surplus. Optional light calories if you share a plate.",
    kind: "social", energyCostHint: 6, xpHint: 8, moneyDeltaHint: -8, stat: "charisma", dc: 10,
    questHook: "Companions keep the campaign kind — don’t ghost the party.",
  },
  {
    id: "magic-focus",
    fantasyName: "Circle of Clarity",
    subtitle: "Magic focus ritual",
    blurb: "Magic here means focus — breath, stretch, notebook. Not fireballs. Soft recovery for tomorrow’s iron.",
    kind: "magic", energyCostHint: 8, energyGainHint: 12, xpHint: 7, stat: "magic", dc: 9,
    questHook: "Draw the circle. Write three wins and one cue for Scout.",
  },
  {
    id: "meal-prep-session",
    fantasyName: "Ration Alchemy",
    subtitle: "Batch meal prep",
    blurb: "Computer/Wis check: timers, boxes, macros. Stock Stored Provisions for busy quest days.",
    kind: "prep", energyCostHint: 14, xpHint: 10, mealPrepDeltaHint: 3, moneyDeltaHint: -12, stat: "computer", dc: 10,
    questHook: "Alchemy complete — the keep kitchen owes you.",
  },
];
