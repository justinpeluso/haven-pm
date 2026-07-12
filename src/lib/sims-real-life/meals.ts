/**
 * Daybreak ration catalog — fantasy names + plain subtitles.
 * IDs align with downtown data MEALS where possible.
 */
import type { MealTemplate } from "./research-types";

export type ActionCard = MealTemplate & {
  fantasyName: string;
  subtitle: string;
  costHint: number;
  energyCostHint: number;
  mealPrepBonusHint?: number;
};

export const MEAL_ACTIONS: ActionCard[] = [
  { id: "oats-eggs", fantasyName: "Daybreak Rations", subtitle: "Oats & eggs", name: "Daybreak Rations", blurb: "Oats & eggs. Carbs for the morning Trial of Iron; eggs for protein.", slot: "breakfast", caloriesApprox: 520, proteinGramsApprox: 32, tags: ["breakfast", "high-protein", "surplus"], ingredients: ["rolled oats", "eggs", "milk", "fruit optional"], costHint: 4, energyCostHint: 4, questHook: "Unroll the daybreak scroll.", linksToGameId: "oats-eggs" },
  { id: "chicken-rice", fantasyName: "Hearthfire Platter", subtitle: "Chicken, rice & greens", name: "Hearthfire Platter", blurb: "Chicken, rice & greens. Classic surplus fuel — easy to batch.", slot: "lunch", caloriesApprox: 680, proteinGramsApprox: 48, tags: ["lunch", "dinner", "meal-prep", "high-protein"], ingredients: ["chicken", "rice", "greens", "oil"], costHint: 7, energyCostHint: 5, mealPrepBonusHint: 1, questHook: "Stock the hearth.", linksToGameId: "chicken-rice" },
  { id: "greek-yogurt-bowl", fantasyName: "Wayfarer’s Curds", subtitle: "Greek yogurt bowl", name: "Wayfarer’s Curds", blurb: "Greek yogurt bowl with fruit and honey — fast protein between quests.", slot: "snack", caloriesApprox: 380, proteinGramsApprox: 28, tags: ["snack", "high-protein"], ingredients: ["Greek yogurt", "berries", "honey"], costHint: 5, energyCostHint: 2, linksToGameId: "greek-yogurt-bowl" },
  { id: "salmon-potato", fantasyName: "Riverlord’s Feast", subtitle: "Salmon & potato", name: "Riverlord’s Feast", blurb: "Salmon & potato. Recovery dinner — protein plus starchy carbs.", slot: "dinner", caloriesApprox: 720, proteinGramsApprox: 42, tags: ["dinner", "recovery"], ingredients: ["salmon", "potato", "veg"], costHint: 11, energyCostHint: 6, linksToGameId: "salmon-potato" },
  { id: "shake-pb", fantasyName: "Potion of Appetite", subtitle: "PB protein shake", name: "Potion of Appetite", blurb: "PB protein shake. Liquid calories when appetite dips.", slot: "shake", caloriesApprox: 450, proteinGramsApprox: 36, tags: ["snack", "shake", "surplus"], ingredients: ["protein powder", "peanut butter", "milk"], costHint: 6, energyCostHint: 1, questHook: "Drink when the feast fails.", linksToGameId: "shake-pb" },
  { id: "meal-prep-box", fantasyName: "Stored Provisions", subtitle: "Meal-prep box", name: "Stored Provisions", blurb: "Meal-prep box from yesterday’s batch.", slot: "lunch", caloriesApprox: 640, proteinGramsApprox: 45, tags: ["meal-prep", "lunch", "dinner"], ingredients: ["prepped protein", "carbs", "veg"], costHint: 0, energyCostHint: 2, linksToGameId: "meal-prep-box" },
  { id: "burger-fries", fantasyName: "Tavern Board", subtitle: "Burger & fries run", name: "Tavern Board", blurb: "Convenient surplus — thinner protein density, still calories.", slot: "dinner", caloriesApprox: 900, proteinGramsApprox: 28, tags: ["dinner", "convenience", "surplus"], ingredients: ["burger", "fries"], costHint: 14, energyCostHint: 3, linksToGameId: "burger-fries" },
  { id: "cottage-toast", fantasyName: "Midnight Vigil Snack", subtitle: "Cottage cheese & toast", name: "Midnight Vigil Snack", blurb: "Cottage cheese & toast before sleep — easy late calories.", slot: "snack", caloriesApprox: 320, proteinGramsApprox: 24, tags: ["snack", "evening", "high-protein"], ingredients: ["cottage cheese", "toast"], costHint: 4, energyCostHint: 1 },
];

export const MEALS: MealTemplate[] = MEAL_ACTIONS;
