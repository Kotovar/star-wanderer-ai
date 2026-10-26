import "./register-ts-loader.mjs";
import assert from "node:assert/strict";

const { createUiSlice } = await import("../src/game/slices/ui/createUiSlice.ts");
const { createReputationSlice } = await import("../src/game/slices/reputation/createReputationSlice.ts");

const makeStore = (initial) => {
  const state = {
    previousGameMode: null, currentCombat: null, activeExpedition: null, activeDive: null,
    currentLocation: { id: "location" }, turn: 10, credits: 500,
    galaxyZoom: 2, sectorZoom: 3, galaxyOffset: { x: 4, y: 5 }, sectorOffset: { x: 6, y: 7 },
    ...initial,
  };
  const set = (update) => Object.assign(state, typeof update === "function" ? update(state) : update);
  Object.assign(state, createUiSlice(set), createReputationSlice(set, () => state));
  return state;
};

const panels = {
  assignments: "showAssignments", artifacts: "showArtifacts", effects: "showEffects",
  research: "showResearch", navigator: "showNavigator", crises: "showCrises",
  enemy_codex: "showEnemyCodex", reputation: "showReputation",
};
const closers = ["closePanel", "closeAssignments", "closeArtifactsPanel", "closeResearchPanel", "closeNavigator", "closeReputationPanel"];
const scenes = [
  { gameMode: "combat", currentCombat: { round: 1 } },
  { gameMode: "planet", activeExpedition: { planetId: "location", finished: false } },
  { gameMode: "gas_giant", activeDive: { locationId: "location", finished: false } },
  { gameMode: "planet", activeExpedition: { planetId: "location", finished: true } },
  { gameMode: "gas_giant", activeDive: { locationId: "location", finished: true } },
  { gameMode: "station" },
  { gameMode: "galaxy_map" },
  { gameMode: "sector_map" },
];

for (const scene of scenes) {
  for (const panel of Object.keys(panels)) {
    const state = makeStore(scene);
    state.openPanel(panel);
    state.openPanel("reputation");
    state.closePanel();
    assert.equal(state.gameMode, scene.gameMode, "the common panel actions preserve the original scene");
  }
  for (const [panel, opener] of Object.entries(panels)) {
    for (const close of closers) {
      const state = makeStore(scene);
      state[opener]();
      assert.equal(state.gameMode, panel, opener + " opens its panel");
      assert.equal(state.previousGameMode, scene.gameMode);
      for (const [nestedPanel, nestedOpener] of Object.entries(panels)) {
        state[nestedOpener]();
        assert.equal(state.gameMode, nestedPanel);
        assert.equal(state.previousGameMode, scene.gameMode, "nested panels preserve the original scene");
      }
      state[close]();
      assert.equal(state.gameMode, scene.gameMode, close + " returns to " + scene.gameMode);
      assert.equal(state.previousGameMode, null);
      assert.equal(state.currentCombat, scene.currentCombat ?? null);
      assert.equal(state.activeExpedition, scene.activeExpedition ?? null);
      assert.equal(state.activeDive, scene.activeDive ?? null);
      assert.equal(state.currentLocation.id, "location");
      assert.equal(state.turn, 10);
      assert.equal(state.credits, 500);
    }
  }

  for (const [navigate, target] of [["showGalaxyMap", "galaxy_map"], ["showSectorMap", "sector_map"]]) {
    const state = makeStore(scene);
    state.showArtifacts();
    state[navigate]();
    const activeScene = scene.currentCombat || scene.activeExpedition || scene.activeDive;
    assert.equal(state.gameMode, activeScene ? scene.gameMode : target, navigate + " preserves an active scene");
    assert.equal(state.previousGameMode, null, "map navigation closes the panel");
    assert.equal(state.galaxyZoom, 2);
    assert.equal(state.sectorZoom, 3);
    assert.deepEqual(state.galaxyOffset, { x: 4, y: 5 });
    assert.deepEqual(state.sectorOffset, { x: 6, y: 7 });
  }
}

const priority = makeStore({ gameMode: "research", currentCombat: {}, activeExpedition: {}, activeDive: {} });
priority.closePanel();
assert.equal(priority.gameMode, "combat", "combat takes priority over other active scenes");

for (const scene of scenes.slice(0, 5)) {
  for (const close of closers) {
    const state = makeStore({ ...scene, gameMode: "research", previousGameMode: "sector_map" });
    state[close]();
    assert.equal(state.gameMode, scene.gameMode, "an active scene wins over a stale return mode");
  }
}

for (const previousGameMode of [null, "research", "combat"]) {
  const state = makeStore({ gameMode: "artifacts", previousGameMode });
  state.closeArtifactsPanel();
  assert.equal(state.gameMode, "galaxy_map", "an invalid return mode falls back to navigation");
}

console.log("Panel and active scene navigation checks passed.");
