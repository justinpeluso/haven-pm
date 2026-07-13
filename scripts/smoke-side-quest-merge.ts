import {
  createNewWorld,
  mergeIncomingWorld,
  preferActiveSideQuest,
} from "../src/lib/downtown/party-chronicle/persist";
import {
  startSideQuest,
  abandonSideQuest,
} from "../src/lib/downtown/party-chronicle/quest-run";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

let w = createNewWorld();
w = {
  ...w,
  characters: { ...w.characters, justin: { ...w.characters.justin, created: true } },
  activeSlot: "justin",
};

const started = startSideQuest(w, "justin", "sq-pip-crumbs");
assert(started.world.activeSideQuest, `start failed: ${started.message}`);

const mergedPlayer = mergeIncomingWorld(w, started.world, "justin", false);
assert(mergedPlayer.activeSideQuest?.questId === "sq-pip-crumbs", "non-DM merge wiped activeSideQuest");

const mergedDm = mergeIncomingWorld(w, started.world, "justin", true);
assert(mergedDm.activeSideQuest?.questId === "sq-pip-crumbs", "DM merge wiped activeSideQuest");

const abandoned = abandonSideQuest(started.world, "justin");
const afterAbandon = mergeIncomingWorld(
  { ...started.world, updatedAt: "2020-01-01T00:00:00.000Z" },
  { ...abandoned.world, updatedAt: "2026-01-01T00:00:00.000Z" },
  "justin",
  false
);
assert(afterAbandon.activeSideQuest == null, "abandon did not clear activeSideQuest");

const staleWipe = preferActiveSideQuest(started.world.activeSideQuest, null, {
  existingUpdatedAt: "2026-01-01T00:00:00.000Z",
  incomingUpdatedAt: "2020-01-01T00:00:00.000Z",
});
assert(staleWipe, "stale null wiped activeSideQuest");

const offTurn = {
  ...w,
  activeSlot: "rusty" as const,
  characters: { ...w.characters, rusty: { ...w.characters.rusty, created: true } },
};
assert(
  startSideQuest(offTurn, "justin", "sq-pip-crumbs", { isDm: true }).world.activeSideQuest,
  "DM should start off-turn"
);
assert(
  startSideQuest(offTurn, "justin", "sq-pip-crumbs").message.includes("turn"),
  "non-DM should be blocked off-turn"
);

console.log("smoke-side-quest-merge: ok");
