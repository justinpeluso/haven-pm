import {
  DOG_CUES,
  DOG_CUES_WIN,
  DOG_TRAINING_WIN,
  NOT_MEDICAL_ADVICE,
  TDEE_MAX,
  TDEE_MIN,
  WIN_WEIGHT_LB,
  getDogAction,
  getDogCue,
  getExercise,
  getMeal,
} from "./data";
import {
  FINALE_QUEST_ID,
  QUESTS,
  getQuest,
  hasFlags,
  isQuestUnlocked,
  nextIncompleteQuest,
  questCheckPasses,
} from "./quests";
import type {
  ActionResult,
  DogAction,
  Exercise,
  LastRoll,
  Meal,
  PlayerSave,
  Quest,
  StatKey,
  Stats,
} from "./types";

export { NOT_MEDICAL_ADVICE, WIN_WEIGHT_LB };
export { nextIncompleteQuest, isQuestUnlocked, getQuest, QUESTS };

const LOG_CAP = 40;

export function rollD20(): number {
  return 1 + Math.floor(Math.random() * 20);
}

export function abilityMod(stat: number): number {
  return Math.floor((stat - 10) / 2);
}

export function skillCheck(
  stats: Stats,
  stat: StatKey,
  dc: number,
  d20 = rollD20()
): { d20: number; total: number; success: boolean; mod: number } {
  const mod = abilityMod(stats[stat]);
  const total = d20 + mod;
  return { d20, total, success: total >= dc, mod };
}

export function applyStatBump(stats: Stats, bump?: Partial<Stats>): Stats {
  if (!bump) return stats;
  const next = { ...stats };
  for (const key of Object.keys(bump) as StatKey[]) {
    const v = bump[key];
    if (typeof v === "number") {
      next[key] = Math.min(20, Math.max(3, (next[key] ?? 10) + v));
    }
  }
  return next;
}

function pushLog(save: PlayerSave, line: string): PlayerSave {
  const log = [line, ...save.log].slice(0, LOG_CAP);
  return { ...save, log };
}

function addFlag(save: PlayerSave, flag: string): PlayerSave {
  if (save.flags.includes(flag)) return save;
  return { ...save, flags: [...save.flags, flag] };
}

function bumpCounterFlag(save: PlayerSave, prefix: string, count: number, unlockAt: number, unlockFlag: string): PlayerSave {
  const key = `${prefix}_${count}`;
  let next = addFlag(save, key);
  if (count >= unlockAt) next = addFlag(next, unlockFlag);
  return next;
}

function spendEnergy(save: PlayerSave, cost: number): { save: PlayerSave; ok: boolean; message?: string } {
  if (save.energy < cost) {
    return {
      save,
      ok: false,
      message: `Not enough energy (${save.energy}/${cost}). Rest or advance the day.`,
    };
  }
  return { save: { ...save, energy: save.energy - cost }, ok: true };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Estimate TDEE from constitution + body weight (fictional band). */
export function estimateTdee(save: PlayerSave): number {
  const con = save.stats.constitution;
  const weightFactor = (save.weightLb - 150) * 8;
  const raw = 2350 + (con - 12) * 40 + weightFactor;
  return clamp(Math.round(raw), TDEE_MIN, TDEE_MAX);
}

/**
 * Daily weight delta from surplus vs TDEE.
 * Resistance multiplies lean-ish gain; cardio-only while underfed stalls/penalizes slightly.
 */
export function computeWeightDelta(save: PlayerSave): { delta: number; note: string } {
  const tdee = estimateTdee(save);
  const surplus = save.dayCalories - tdee;
  const proteinFactor = clamp(save.dayProteinG / 140, 0.7, 1.25);

  if (surplus <= 0) {
    let delta = surplus / 3500; // ~lb from deficit
    if (save.dayCardioOnly && !save.dayResistance) {
      delta -= 0.05;
      return {
        delta: clamp(delta, -0.35, 0),
        note: "Underfed + cardio-heavy day — scale stalls or dips slightly.",
      };
    }
    return {
      delta: clamp(delta, -0.3, 0),
      note: surplus > -200 ? "Near maintenance — little scale change." : "Calorie deficit — soft weight loss.",
    };
  }

  // Surplus → gain; game-feel slightly faster than pure 3500 kcal/lb when optimized
  let gain = (surplus / 3200) * proteinFactor;
  if (save.dayResistance) {
    gain *= 1.35;
  } else if (save.dayCardioOnly) {
    gain *= 0.75;
  }

  const lo = save.dayResistance && proteinFactor >= 1 ? 0.15 : 0.08;
  const hi = save.dayResistance && surplus > 400 ? 0.8 : 0.45;
  const delta = clamp(gain, lo, hi);

  return {
    delta,
    note: save.dayResistance
      ? `Surplus + lifting — lean-ish gain ~${delta.toFixed(2)} lb.`
      : `Surplus logged — gain ~${delta.toFixed(2)} lb (lift to improve quality).`,
  };
}

function countFlagPrefix(save: PlayerSave, prefix: string): number {
  const re = new RegExp(`^${prefix}_(\\d+)$`);
  let max = 0;
  for (const f of save.flags) {
    const m = f.match(re);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max;
}

export function checkVictory(save: PlayerSave): boolean {
  if (save.graduated) return true;
  return (
    save.weightLb >= WIN_WEIGHT_LB &&
    save.dog.training >= DOG_TRAINING_WIN &&
    save.dog.cuesLearned.length >= DOG_CUES_WIN
  );
}

function applyQuestRewards(save: PlayerSave, quest: Quest): PlayerSave {
  let next: PlayerSave = {
    ...save,
    xp: save.xp + quest.rewards.xp,
    stats: applyStatBump(save.stats, quest.rewards.stats),
    money: save.money + (quest.rewards.money ?? 0),
    completedQuestIds: save.completedQuestIds.includes(quest.id)
      ? save.completedQuestIds
      : [...save.completedQuestIds, quest.id],
  };

  if (quest.dogMasteryBonus) {
    const { minTraining, minCues, xp, bond } = quest.dogMasteryBonus;
    if (next.dog.training >= minTraining && next.dog.cuesLearned.length >= minCues) {
      next = {
        ...next,
        xp: next.xp + xp,
        dog: { ...next.dog, bond: next.dog.bond + bond },
      };
      next = pushLog(next, `Dog mastery bonus: +${xp} XP, Scout bond +${bond}.`);
    }
  }

  if (quest.id === FINALE_QUEST_ID) {
    next = {
      ...next,
      graduated: true,
      phase: "graduated",
      activeQuestId: null,
      questStepIndex: 0,
    };
  }

  return next;
}

function stepSatisfied(save: PlayerSave, step: Quest["steps"][number]): boolean {
  if (step.kind === "narrative") return true;
  if (step.kind === "flag") return hasFlags(save, step.requireFlags);
  if (step.kind === "check" && step.checkId) return questCheckPasses(save, step.checkId);
  return false;
}

/** Advance quest steps that are satisfied by flags / checks; grant rewards when done. */
export function advanceQuest(save: PlayerSave): PlayerSave {
  if (save.graduated) return save;

  let next = save;
  const quest =
    (next.activeQuestId ? getQuest(next.activeQuestId) : null) ?? nextIncompleteQuest(next);

  if (!quest) {
    if (checkVictory(next) && !next.graduated) {
      return {
        ...next,
        graduated: true,
        phase: "graduated",
        activeQuestId: null,
        questStepIndex: 0,
      };
    }
    return next;
  }

  if (!isQuestUnlocked(next, quest)) return next;

  if (next.activeQuestId !== quest.id) {
    next = {
      ...next,
      activeQuestId: quest.id,
      questStepIndex: 0,
      phase: quest.phase === "graduated" ? next.phase : quest.phase,
    };
  }

  let idx = Math.max(0, next.questStepIndex);
  // Auto-walk satisfied steps (narrative free; flag/check when met)
  while (idx < quest.steps.length && stepSatisfied(next, quest.steps[idx])) {
    idx += 1;
  }

  if (idx !== next.questStepIndex) {
    next = { ...next, questStepIndex: idx };
  }

  if (idx < quest.steps.length) return next;

  next = applyQuestRewards(next, quest);
  next = { ...next, questStepIndex: 0 };
  next = pushLog(next, `Quest complete: ${quest.title} (+${quest.rewards.xp} XP).`);

  if (next.graduated) {
    next = pushLog(next, `Graduated at ${next.weightLb.toFixed(1)} lb. ${NOT_MEDICAL_ADVICE}`);
    return next;
  }

  const following = nextIncompleteQuest(next);
  if (following) {
    next = {
      ...next,
      activeQuestId: following.id,
      questStepIndex: 0,
      phase: following.phase === "finale" ? "finale" : following.phase === "intro" ? "intro" : "routine",
    };
    next = pushLog(next, `New quest: ${following.title}.`);
    // Kick narrative steps on the new quest
    return advanceQuest(next);
  }

  next = { ...next, activeQuestId: null, questStepIndex: 0 };
  return next;
}

function afterAction(save: PlayerSave, message: string, success: boolean, roll?: NonNullable<LastRoll>): ActionResult {
  let next: PlayerSave = {
    ...save,
    turn: save.turn + 1,
    lastRoll: roll ?? save.lastRoll,
  };
  next = pushLog(next, message);
  next = advanceQuest(next);
  if (checkVictory(next) && !next.graduated) {
    next = {
      ...next,
      graduated: true,
      phase: "graduated",
      activeQuestId: null,
    };
    next = pushLog(next, `Target weight reached (${WIN_WEIGHT_LB} lb). You graduated the routine.`);
    const finale = getQuest(FINALE_QUEST_ID);
    if (finale && !next.completedQuestIds.includes(finale.id)) {
      next = applyQuestRewards(next, finale);
    }
  }
  return { save: next, message, success, roll };
}

export function eatMeal(save: PlayerSave, mealId: string): ActionResult {
  const meal: Meal | undefined = getMeal(mealId);
  if (!meal) return { save, message: "Unknown meal.", success: false };

  if (meal.id === "meal-prep-box") {
    if (save.mealPrep < 1) {
      return { save, message: "No meal-prep boxes left. Cook a batch meal first.", success: false };
    }
  } else if (save.money < meal.cost) {
    return { save, message: `Need $${meal.cost}. You’re short on cash.`, success: false };
  }

  const spent = spendEnergy(save, meal.energyCost);
  if (!spent.ok) return { save, message: spent.message!, success: false };

  let next = spent.save;
  let mealPrep = next.mealPrep;
  let money = next.money;

  if (meal.id === "meal-prep-box") {
    mealPrep -= 1;
  } else {
    money -= meal.cost;
  }

  if (meal.mealPrepBonus) {
    mealPrep += meal.mealPrepBonus;
  }

  next = {
    ...next,
    money,
    mealPrep,
    dayCalories: next.dayCalories + meal.calories,
    dayProteinG: next.dayProteinG + meal.proteinG,
    energy: Math.min(next.maxEnergy, next.energy + Math.floor(meal.proteinG / 20)),
    hp: Math.min(next.maxHp, next.hp + 1),
  };

  next = addFlag(next, "ate_once");
  if (meal.tags.includes("meal-prep") || meal.mealPrepBonus) {
    next = addFlag(next, "meal_prep_used");
  }

  const msg = `Ate ${meal.name} (+${meal.calories} kcal, ${meal.proteinG}g protein). Day total ${next.dayCalories} kcal.`;
  return afterAction(next, msg, true);
}

export function doExercise(save: PlayerSave, exerciseId: string): ActionResult {
  const ex: Exercise | undefined = getExercise(exerciseId);
  if (!ex) return { save, message: "Unknown exercise.", success: false };

  const spent = spendEnergy(save, ex.energyCost);
  if (!spent.ok) return { save, message: spent.message!, success: false };

  let next = spent.save;
  let roll: NonNullable<LastRoll> | undefined;
  let success = true;
  let xpGain = ex.xp;
  let msg = `Completed ${ex.name}.`;

  if (ex.stat && typeof ex.dc === "number") {
    const check = skillCheck(next.stats, ex.stat, ex.dc);
    roll = { ...check, success: check.success, stat: ex.stat, label: ex.name };
    success = check.success;
    if (check.success) {
      msg = `${ex.name}: d20 ${check.d20}+${check.mod}=${check.total} vs DC ${ex.dc} — solid session.`;
      next = {
        ...next,
        stats: applyStatBump(next.stats, {
          ...(ex.strengthBump ? { strength: ex.strengthBump } : {}),
          ...(ex.constitutionBump ? { constitution: ex.constitutionBump } : {}),
        }),
      };
    } else {
      xpGain = Math.max(3, Math.floor(ex.xp / 2));
      msg = `${ex.name}: d20 ${check.d20}+${check.mod}=${check.total} vs DC ${ex.dc} — ugly reps, still count (fail-forward).`;
    }
  }

  const didResistance = ex.kind === "resistance" || ex.kind === "hybrid";
  next = {
    ...next,
    xp: next.xp + xpGain,
    dayResistance: next.dayResistance || didResistance,
    dayCardioOnly: didResistance ? false : next.dayCardioOnly || ex.kind === "cardio",
  };

  if (didResistance) {
    const n = countFlagPrefix(next, "resistance") + 1;
    next = bumpCounterFlag(next, "resistance", n, 4, "resistance_4");
  }

  next = addFlag(next, "trained_once");
  return afterAction(next, msg, success, roll);
}

export function dogCare(save: PlayerSave, actionId: string): ActionResult {
  const action: DogAction | undefined = getDogAction(actionId);
  if (!action) return { save, message: "Unknown dog action.", success: false };

  const spent = spendEnergy(save, action.energyCost);
  if (!spent.ok) return { save, message: spent.message!, success: false };

  let next = spent.save;
  const dog = { ...next.dog };

  if (action.kind === "feed") {
    if (dog.fedToday) {
      return { save, message: `${dog.name} already ate today.`, success: false };
    }
    dog.fedToday = true;
  }

  if (action.kind === "walk") {
    dog.walkedToday = true;
  }

  // dogEnergyCost: positive spends dog energy; negative restores
  if (action.dogEnergyCost > 0 && dog.energy < action.dogEnergyCost && action.kind !== "rest") {
    return {
      save,
      message: `${dog.name} is wiped (energy ${dog.energy}). Try quiet crate time.`,
      success: false,
    };
  }

  dog.energy = clamp(dog.energy - action.dogEnergyCost, 0, dog.maxEnergy);
  dog.bond = Math.max(0, dog.bond + action.bondDelta);
  dog.training = Math.max(0, dog.training + action.trainingDelta);

  let roll: NonNullable<LastRoll> | undefined;
  let success = true;
  let xpGain = action.xp;
  let msg = `${action.name} with ${dog.name}.`;

  if (action.stat && typeof action.dc === "number") {
    const check = skillCheck(next.stats, action.stat, action.dc);
    roll = { ...check, success: check.success, stat: action.stat, label: action.name };
    success = check.success;
    if (!check.success) {
      xpGain = Math.max(2, Math.floor(action.xp / 2));
      dog.training = Math.max(0, dog.training - Math.max(0, action.trainingDelta - 1));
      dog.bond = Math.max(0, dog.bond - 1);
      msg = `${action.name}: roll ${check.total} vs DC ${action.dc} — messy, but ${dog.name} still trusts you.`;
    } else {
      msg = `${action.name}: roll ${check.total} vs DC ${action.dc} — clean work.`;
    }
  }

  if (action.cueId && success) {
    const cue = getDogCue(action.cueId) ?? DOG_CUES.find((c) => c.id === action.cueId);
    if (cue && dog.training >= cue.trainingRequired && !dog.cuesLearned.includes(cue.id)) {
      dog.cuesLearned = [...dog.cuesLearned, cue.id];
      msg += ` Cue learned: ${cue.name}.`;
      next = addFlag(next, `cue_${cue.id}`);
    }
  }

  next = { ...next, dog, xp: next.xp + xpGain };

  if (dog.fedToday && dog.walkedToday && !next.flags.includes("dog_care_today")) {
    next = addFlag(next, "dog_care_today");
    const n = countFlagPrefix(next, "dog_care") + 1;
    next = bumpCounterFlag(next, "dog_care", n, 3, "dog_care_days_3");
  }

  return afterAction(next, msg, success, roll);
}

export function rest(save: PlayerSave): ActionResult {
  const recover = 35 + abilityMod(save.stats.constitution) * 3;
  const next: PlayerSave = {
    ...save,
    energy: Math.min(save.maxEnergy, save.energy + recover),
    hp: Math.min(save.maxHp, save.hp + 2),
    dog: {
      ...save.dog,
      energy: Math.min(save.dog.maxEnergy, save.dog.energy + 20),
    },
  };
  return afterAction(next, `Rest break. Energy +${recover}. Scout dozes.`, true);
}

export function advanceDay(save: PlayerSave): ActionResult {
  const { delta, note } = computeWeightDelta(save);
  const newWeight = Math.round((save.weightLb + delta) * 10) / 10;

  let fedStreak = 0;
  if (save.dayCalories >= estimateTdee(save) * 0.95) {
    fedStreak = countFlagPrefix(save, "fed_day") + 1;
  }

  let next: PlayerSave = {
    ...save,
    day: save.day + 1,
    turn: save.turn + 1,
    weightLb: newWeight,
    energy: save.maxEnergy,
    hp: Math.min(save.maxHp, save.hp + 3),
    dayCalories: 0,
    dayProteinG: 0,
    dayResistance: false,
    dayCardioOnly: false,
    dog: {
      ...save.dog,
      energy: save.dog.maxEnergy,
      fedToday: false,
      walkedToday: false,
    },
    flags: save.flags.filter((f) => f !== "dog_care_today"),
  };

  if (fedStreak > 0) {
    next = bumpCounterFlag(next, "fed_day", fedStreak, 3, "fed_days_3");
  }

  // Neglect soft penalties
  if (!save.dog.fedToday || !save.dog.walkedToday) {
    next = {
      ...next,
      dog: {
        ...next.dog,
        bond: Math.max(0, next.dog.bond - (save.dog.fedToday ? 1 : 3) - (save.dog.walkedToday ? 0 : 2)),
        energy: clamp(next.dog.energy - (save.dog.walkedToday ? 0 : 10), 0, next.dog.maxEnergy),
      },
    };
  }

  const msg = `Day ${next.day}. ${note} Weight now ${newWeight.toFixed(1)} lb. Energy restored.`;
  next = pushLog(next, msg);
  next = advanceQuest(next);

  if (checkVictory(next) && !next.graduated) {
    next = {
      ...next,
      graduated: true,
      phase: "graduated",
      activeQuestId: null,
    };
    next = pushLog(next, `Hit ${WIN_WEIGHT_LB} lb — graduated.`);
    const finale = getQuest(FINALE_QUEST_ID);
    if (finale && !next.completedQuestIds.includes(finale.id)) {
      next = applyQuestRewards(next, finale);
    }
  }

  return {
    save: next,
    message: msg,
    success: true,
  };
}

export function setActiveQuest(save: PlayerSave, questId: string): PlayerSave {
  const quest = getQuest(questId);
  if (!quest || !isQuestUnlocked(save, quest)) return save;
  return {
    ...save,
    activeQuestId: questId,
    questStepIndex: 0,
    phase: quest.phase === "graduated" ? save.phase : quest.phase,
  };
}

/** Current step for UI, or null if no active quest / past end. */
export function currentQuestStep(save: PlayerSave): Quest["steps"][number] | null {
  if (!save.activeQuestId) return null;
  const quest = getQuest(save.activeQuestId);
  if (!quest) return null;
  return quest.steps[save.questStepIndex] ?? null;
}
