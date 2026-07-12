/**
 * Talking-animal multi-act arcs — foreshadow → ending payoff.
 * Data pack: data/party-chronicle/animal-arcs.json
 */

import pack from "../../../../data/party-chronicle/animal-arcs.json";
import type { AlignmentPath, AlignmentScores } from "./types";

export type AnimalArcBeat = {
  id: string;
  actId: string;
  title: string;
  body: string;
  flagsAdd: string[];
  alignment: Partial<AlignmentScores>;
  artId: string;
  sceneId: string;
};

export type AnimalArcDef = {
  id: string;
  npcId: string;
  title: string;
  leans: AlignmentPath;
  acts: string[];
  estimatedMinutes: number;
  beats: AnimalArcBeat[];
};

export const ANIMAL_ARCS: AnimalArcDef[] = pack.arcs as AnimalArcDef[];

export const ANIMAL_ARC_BY_ID: Record<string, AnimalArcDef> = Object.fromEntries(
  ANIMAL_ARCS.map((a) => [a.id, a])
);

export function getAnimalArc(id: string): AnimalArcDef | undefined {
  return ANIMAL_ARC_BY_ID[id];
}

export function arcsForNpc(npcId: string): AnimalArcDef[] {
  return ANIMAL_ARCS.filter((a) => a.npcId === npcId);
}

export function arcsForAct(actId: string): AnimalArcDef[] {
  return ANIMAL_ARCS.filter((a) => a.acts.includes(actId));
}

export function beatsForAct(actId: string): AnimalArcBeat[] {
  return ANIMAL_ARCS.flatMap((a) => a.beats.filter((b) => b.actId === actId));
}
