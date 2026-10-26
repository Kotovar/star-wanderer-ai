import "./register-ts-loader.mjs";
import assert from "node:assert/strict";

// UI-навигация не должна выводить из боя: панели и карты возвращают на экран
// боя, пока currentCombat жив.
const { createUiSlice } = await import("../src/game/slices/ui/createUiSlice.ts");

const makeStore = (initial) => {
  let state = { previousGameMode: null, currentCombat: null, ...initial };
  const set = (update) => {
    const patch = typeof update === "function" ? update(state) : update;
    state = { ...state, ...patch };
  };
  return { ui: createUiSlice(set), get: () => state };
};

const combat = { round: 1 };

{
  const store = makeStore({ gameMode: "combat", currentCombat: combat });
  store.ui.showSectorMap();
  assert.equal(store.get().gameMode, "combat", "sector map button keeps the fight on screen");
  store.ui.showGalaxyMap();
  assert.equal(store.get().gameMode, "combat", "galaxy map button keeps the fight on screen");
}

{
  // Цепочка панелей теряла бой: reputation не считалась панелью, и
  // previousGameMode перезаписывался ею самой.
  const store = makeStore({ gameMode: "combat", currentCombat: combat });
  store.ui.savePreviousGameMode();
  store.get().gameMode = "reputation";
  store.ui.showEffects();
  assert.equal(store.get().previousGameMode, "combat", "nested panel keeps combat as the return mode");
  store.ui.closeResearchPanel();
  assert.equal(store.get().gameMode, "combat", "closing a panel returns to the fight");
}

{
  const store = makeStore({ gameMode: "research", currentCombat: combat, previousGameMode: null });
  store.ui.closeResearchPanel();
  assert.equal(store.get().gameMode, "combat", "lost return mode still falls back to the active fight");
}

{
  const store = makeStore({ gameMode: "combat", currentCombat: null });
  store.ui.showSectorMap();
  assert.equal(store.get().gameMode, "sector_map", "without a fight the map opens normally");
}

{
  // Кнопка закрытия «Репутации» — прямой путь, на котором бой и терялся.
  const { createReputationSlice } = await import(
    "../src/game/slices/reputation/createReputationSlice.ts"
  );
  let state = { gameMode: "reputation", previousGameMode: null, currentCombat: combat };
  const set = (update) => {
    const draft = { ...state };
    const result = typeof update === "function" ? update(draft) : update;
    state = { ...draft, ...result };
  };
  createReputationSlice(set, () => state).closeReputationPanel();
  assert.equal(state.gameMode, "combat", "closing reputation returns to the fight");
}

console.log("Combat navigation checks passed.");
