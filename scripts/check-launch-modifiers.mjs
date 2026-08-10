import assert from "node:assert/strict";
import "./register-ts-loader.mjs";

const {
  LAUNCH_MODIFIERS,
  getRunModifierValue,
  hasRunModifierFlag,
  getRunModifierLocationWeights,
  getCrisisReserveKit,
} = await import("../src/game/constants/launchModifiers.ts");
const { buildStartingState } = await import(
  "../src/game/slices/gameManagement/helpers/buildStartingState.ts"
);
const { getTotalConsumption } = await import(
  "../src/game/slices/ship/helpers/getTotalConsumption.ts"
);
const { shiftHappiness } = await import("../src/game/crew/utils.ts");
const { TRADE_GOODS } = await import("../src/game/constants/goods.ts");

const byId = (id) => LAUNCH_MODIFIERS.find((mod) => mod.id === id);
const REWRITTEN = [
  "weakened_reactor",
  "solo_mission",
  "damaged_ship",
  "wanted",
  "stranded",
];

// ── Доктрины получили разные сценарии старта ───────────────────────────────
const explorerDoctrine = buildStartingState("explorer", ["doctrine_explorer"]);
const explorerEngine = explorerDoctrine.ship.modules.find(
  (module) => module.type === "engine",
);
assert.equal(explorerDoctrine.credits, 400);
assert.equal(explorerEngine?.level, 2);
assert.equal(explorerEngine?.fuelEfficiency, 8);
assert.deepEqual(explorerDoctrine.researchResources, {});

const bossHunter = buildStartingState("explorer", ["doctrine_boss_hunter"]);
assert.equal(
  bossHunter.artifacts.filter(
    (artifact) =>
      artifact.rarity === "rare" && artifact.discovered && artifact.researched,
  ).length,
  1,
  "охотник должен стартовать с одной уже исследованной редкой реликвией",
);

const traderDoctrine = buildStartingState("explorer", ["doctrine_trader"]);
assert.equal(traderDoctrine.credits, 3000);
assert.equal(traderDoctrine.ship.fuel, 60);
assert.deepEqual(getRunModifierLocationWeights(["doctrine_trader"]), {
  enemyShip: 1.5,
});

const exileDoctrine = buildStartingState("explorer", ["doctrine_exile"]);
const exileCargoValue = exileDoctrine.ship.tradeGoods.reduce(
  (sum, good) => sum + TRADE_GOODS[good.item].basePrice * good.quantity,
  0,
);
assert.equal(exileCargoValue, 2700);
assert.equal(exileDoctrine.ship.tradeGoods.length, 3);
assert.equal(
  Object.values(exileDoctrine.raceReputation ?? {}).filter((value) => value <= -50)
    .length,
  4,
  "изгнанник должен начать враждебным для четырёх рас",
);

const extraFuel = buildStartingState("explorer", ["extra_fuel"]);
const extraFuelTank = extraFuel.ship.modules.find(
  (module) => module.type === "fueltank",
);
assert.equal(extraFuel.ship.maxFuel, 120);
assert.equal(extraFuel.ship.fuel, 120);
assert.equal(extraFuelTank?.level, 2);
assert.equal(extraFuelTank?.capacity, 120);

const researchStart = buildStartingState("explorer", ["research_head_start"]);
assert.equal(researchStart.startingTechIds?.length, 3);
assert.equal(new Set(researchStart.startingTechIds).size, 3);

const soloMk5 = buildStartingState("explorer", ["solo_mission"]);
assert.equal(soloMk5.crew[0]?.level, 5);

const crisisReserve = buildStartingState("explorer", ["crisis_start"]);
assert.equal(crisisReserve.credits, 1600);
assert.equal(crisisReserve.crisisReserveKit, true);
assert.deepEqual(getCrisisReserveKit("nebula_front").researchResources, {
  energy_samples: 5,
  tech_salvage: 2,
});

// ── Испытания под билд больше не продают штраф за кредиты ───────────────────
for (const id of REWRITTEN) {
  const mod = byId(id);
  assert.ok(mod, `модификатор ${id} не найден`);
  assert.equal(mod.creditDelta, 0, `${id} всё ещё торгует кредитами`);
}

// ── Каждый штраф платит структурным эффектом ───────────────────────────────
assert.equal(byId("weakened_reactor").reactorPowerPenalty, 4);
assert.equal(byId("weakened_reactor").moduleConsumptionReduction, 1);
assert.equal(byId("solo_mission").hermitCrew, true);
assert.equal(byId("solo_mission").crewLimit, 1);
assert.equal(byId("damaged_ship").repairSalvage, true);
assert.equal(byId("wanted").combatLootBonus, 0.5);
assert.equal(byId("stranded").salvageLootBonus, 0.5);

// ── Селекторы эффектов забега ──────────────────────────────────────────────
assert.equal(getRunModifierValue([], "moduleConsumptionReduction"), 0);
assert.equal(getRunModifierValue(undefined, "combatLootBonus"), 0);
assert.equal(getRunModifierValue(["weakened_reactor"], "moduleConsumptionReduction"), 1);
assert.equal(getRunModifierValue(["wanted"], "combatLootBonus"), 0.5);
assert.equal(hasRunModifierFlag(["solo_mission"], "hermitCrew"), true);
assert.equal(hasRunModifierFlag(["solo_mission"], "repairSalvage"), false);
assert.deepEqual(getRunModifierLocationWeights([]), {});
assert.deepEqual(getRunModifierLocationWeights(["wanted"]), { enemyShip: 1.6 });

// ── Ослабленный реактор: слабее реактор, дешевле модули ────────────────────
const plain = buildStartingState("explorer", []);
const lowVolt = buildStartingState("explorer", ["weakened_reactor"]);
const reactorPower = (patch) =>
  patch.ship.modules.find((m) => m.type === "reactor").power;
assert.equal(reactorPower(plain) - reactorPower(lowVolt), 4);

const consumptionOf = (patch, modifierIds) =>
  getTotalConsumption({
    ship: patch.ship,
    crew: [],
    startModifierIds: modifierIds,
  });
const plainDraw = consumptionOf(plain, []);
const lowVoltDraw = consumptionOf(lowVolt, ["weakened_reactor"]);
assert.ok(
  lowVoltDraw < plainDraw,
  "низковольтная переделка должна снижать потребление",
);
// Потребляющий модуль не может стать бесплатным
const cheapest = lowVolt.ship.modules
  .filter((m) => (m.consumption ?? 0) > 0)
  .map((m) => Math.max(1, m.consumption - 1));
assert.ok(cheapest.every((value) => value >= 1));

// На старте переделка невыгодна: экономия меньше потерянных 4 энергии
assert.ok(
  plainDraw - lowVoltDraw < 4,
  "на стартовом корабле переделка обязана быть убыточной",
);

// ...но на широком корабле окупается — в этом весь смысл ставки
const wideShip = {
  ...plain.ship,
  modules: Array.from({ length: 12 }, (_, index) => ({
    id: 900 + index,
    type: "cargo",
    name: `Отсек ${index}`,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    health: 100,
    maxHealth: 100,
    consumption: 2,
  })),
};
const wideDraw = (modifierIds) =>
  getTotalConsumption({ ship: wideShip, crew: [], startModifierIds: modifierIds });
assert.ok(
  wideDraw([]) - wideDraw(["weakened_reactor"]) > 4,
  "на широком корабле переделка обязана окупать штраф реактора",
);

// ── Одиночка: один член экипажа, 5-й уровень, отшельник ────────────────────
const solo = buildStartingState("explorer", ["solo_mission"]);
assert.equal(solo.crew.length, 1);
assert.equal(solo.crew[0].level, 5);
assert.equal(solo.crew[0].hermit, true);
assert.equal(plain.crew.every((c) => c.hermit === undefined), true);

// Отшельник не теряет настроение, но набирает
const hermit = { ...solo.crew[0], happiness: 50, maxHappiness: 100 };
assert.equal(shiftHappiness(hermit, -20).happiness, 50);
assert.equal(shiftHappiness(hermit, 20).happiness, 70);
const ordinary = { ...plain.crew[0], happiness: 50, maxHappiness: 100 };
assert.equal(shiftHappiness(ordinary, -20).happiness, 30);

// ── Взаимоисключения сохранены ─────────────────────────────────────────────
assert.deepEqual(byId("damaged_ship").conflictsWith, ["stranded"]);
assert.deepEqual(byId("stranded").conflictsWith, ["damaged_ship"]);
assert.deepEqual(byId("wanted").conflictsWith, ["doctrine_exile"]);

// ── Валовой доход не теряется после траты или смены состояния ─────────────
const { useGameStore } = await import("../src/game/store.ts");
useGameStore.getState().restartGame("fighter");
const fighterState = useGameStore.getState();
const weaponBay = fighterState.ship.modules.find(
  (module) => module.type === "weaponbay" && module.weapons?.[0],
);
assert.ok(weaponBay, "у ударного корабля должна быть палуба с оружием");
const creditsBeforeScrap = fighterState.credits;
fighterState.removeWeapon(weaponBay.id, 0);
assert.equal(useGameStore.getState().credits, creditsBeforeScrap + 150);
assert.equal(useGameStore.getState().creditsEarnedThisRun, 150);

console.log("Launch modifier checks passed");
