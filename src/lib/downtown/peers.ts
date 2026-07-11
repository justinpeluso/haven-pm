import type { BusinessMix, UsPeer } from "./types";

const mix = (
  food: number,
  retail: number,
  services: number,
  civic: number,
  office: number
): BusinessMix => {
  const other = Math.max(0, 100 - food - retail - services - civic - office);
  return { food, retail, services, civic, office, other };
};

/** Curated US peer downtown benchmarks for comparison widgets. */
export const US_PEERS: UsPeer[] = [
  {
    id: "greenville-sc",
    name: "Greenville",
    state: "SC",
    vibrancy: 84,
    vacancyEstimate: 7.2,
    mix: mix(24, 22, 18, 10, 16),
    note: "Main Street revival reference",
  },
  {
    id: "asheville-nc",
    name: "Asheville",
    state: "NC",
    vibrancy: 86,
    vacancyEstimate: 8.1,
    mix: mix(28, 20, 16, 12, 12),
    note: "Arts + food-forward CBD",
  },
  {
    id: "boulder-co",
    name: "Boulder",
    state: "CO",
    vibrancy: 88,
    vacancyEstimate: 6.4,
    mix: mix(22, 18, 20, 14, 18),
    note: "Pedestrian mall intensity",
  },
  {
    id: "portland-me",
    name: "Portland",
    state: "ME",
    vibrancy: 82,
    vacancyEstimate: 9.0,
    mix: mix(26, 19, 17, 11, 14),
    note: "Waterfront small-city CBD",
  },
  {
    id: "madison-wi",
    name: "Madison",
    state: "WI",
    vibrancy: 80,
    vacancyEstimate: 8.8,
    mix: mix(23, 17, 19, 13, 16),
    note: "College + capitol mix",
  },
  {
    id: "bozeman-mt",
    name: "Bozeman",
    state: "MT",
    vibrancy: 79,
    vacancyEstimate: 7.9,
    mix: mix(25, 21, 18, 9, 13),
    note: "Growing mountain main street",
  },
  {
    id: "burlington-vt",
    name: "Burlington",
    state: "VT",
    vibrancy: 83,
    vacancyEstimate: 8.5,
    mix: mix(27, 18, 17, 12, 13),
    note: "Church Street marketplace",
  },
  {
    id: "savannah-ga",
    name: "Savannah",
    state: "GA",
    vibrancy: 85,
    vacancyEstimate: 7.6,
    mix: mix(24, 23, 15, 14, 12),
    note: "Historic tourism CBD",
  },
];

export function getUsPeers() {
  return US_PEERS;
}

export function regionalVsPeers(avgVibrancy: number, medianVacancy: number) {
  const peerAvgV =
    US_PEERS.reduce((s, p) => s + p.vibrancy, 0) / US_PEERS.length;
  const peerAvgVac =
    US_PEERS.reduce((s, p) => s + p.vacancyEstimate, 0) / US_PEERS.length;
  return {
    regionalVibrancy: avgVibrancy,
    peerAvgVibrancy: Math.round(peerAvgV * 10) / 10,
    vibrancyDelta: Math.round((avgVibrancy - peerAvgV) * 10) / 10,
    regionalVacancy: medianVacancy,
    peerAvgVacancy: Math.round(peerAvgVac * 10) / 10,
    vacancyDelta: Math.round((medianVacancy - peerAvgVac) * 10) / 10,
    peers: US_PEERS,
  };
}
