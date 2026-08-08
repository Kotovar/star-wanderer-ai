import assert from "node:assert/strict";
import "./register-ts-loader.mjs";

const {
  CRISIS_RELIEF_CARGO,
  generateCrisisResponseContract,
  generateFabricationContract,
} = await import("../src/game/contracts/generateResponseContracts.ts");
const { isContractTargetAvailable } = await import(
  "../src/game/contracts/targetAvailability.ts"
);
const { GLOBAL_CRISES } = await import("../src/game/constants/globalCrises.ts");
const { TRADE_GOODS } = await import("../src/game/constants/goods.ts");
const { CRAFTING_RECIPES } = await import("../src/game/constants/crafting.ts");
const { CONTRACT_REWARDS: EXP_REWARDS } = await import(
  "../src/game/constants/experience.ts"
);

const PLANET = { id: "p-1", name: "Тестовая", dominantRace: "human" };
const SECTOR = { id: 2, name: "Сектор", tier: 2, locations: [] };
const CONTEXT = { artifacts: [], researchedTechs: [] };

// ── Каждый кризис знает, чем его гасить, и груз реально существует ───────────
for (const crisis of GLOBAL_CRISES) {
  const cargo = CRISIS_RELIEF_CARGO[crisis.id];
  assert.ok(cargo, `кризис ${crisis.id} остался без груза помощи`);
  assert.ok(TRADE_GOODS[cargo], `груз ${cargo} отсутствует в списке товаров`);
}
// Разные кризисы тянут разные рынки — иначе отклик сведётся к одной доставке
assert.equal(
  new Set(Object.values(CRISIS_RELIEF_CARGO)).size,
  Object.keys(CRISIS_RELIEF_CARGO).length,
  "кризисы обязаны требовать разные товары",
);

// ── Награда растёт вместе со стадией кризиса ─────────────────────────────────
const epidemic = GLOBAL_CRISES.find((c) => c.id === "epidemic");
const atStage = (turnsRemaining) =>
  generateCrisisResponseContract(PLANET, SECTOR, {
    id: "epidemic",
    turnsRemaining,
  });
const early = atStage(epidemic.duration);
const late = atStage(1);
assert.equal(early.type, "crisis_response");
assert.equal(early.cargo, "medicine");
assert.ok(early.quantity > 0);
assert.ok(
  late.reward > early.reward,
  "поздняя стадия кризиса обязана платить больше ранней",
);

// ── Дедлайн зажат в разумное окно и не выходит за срок кризиса ───────────────
for (const turnsRemaining of [1, 5, 12, 40]) {
  const contract = atStage(turnsRemaining);
  assert.ok(contract.timeLimit >= 6, "окно отклика не может быть невыполнимым");
  assert.ok(contract.timeLimit <= 14, "окно отклика не может быть бесконечным");
}

// ── Неизвестный кризис не порождает контракт ────────────────────────────────
assert.equal(
  generateCrisisResponseContract(PLANET, SECTOR, {
    id: "not_a_crisis",
    turnsRemaining: 10,
  }),
  null,
);

// ── Предложение живёт ровно столько, сколько его кризис ──────────────────────
assert.equal(
  isContractTargetAvailable(early, [], [], {
    ...CONTEXT,
    activeCrisis: { id: "epidemic", turnsRemaining: 5 },
  }),
  true,
);
assert.equal(
  isContractTargetAvailable(early, [], [], { ...CONTEXT, activeCrisis: null }),
  false,
  "кризис прошёл — предложение обязано исчезнуть",
);
assert.equal(
  isContractTargetAvailable(early, [], [], {
    ...CONTEXT,
    activeCrisis: { id: "raider_wave", turnsRemaining: 5 },
  }),
  false,
  "чужой кризис не продлевает предложение",
);

// ── Изготовление: заказ только на то, что игрок умеет собирать ──────────────
assert.equal(generateFabricationContract(PLANET, SECTOR, []), null);
assert.equal(generateFabricationContract(PLANET, SECTOR, undefined), null);
assert.equal(
  generateFabricationContract(PLANET, SECTOR, ["not_a_recipe"]),
  null,
  "нерецепт не должен превращаться в заказ",
);

const plasma = CRAFTING_RECIPES.plasma;
const order = generateFabricationContract(PLANET, SECTOR, ["plasma"]);
assert.equal(order.type, "fabrication");
assert.equal(order.requiredWeaponType, plasma.weaponType);
assert.ok(
  order.reward > plasma.credits,
  "заказ обязан окупать хотя бы кредитную стоимость сборки",
);

// ── Заказ на неизвестный игроку рецепт невыполним и не показывается ─────────
assert.equal(
  isContractTargetAvailable(order, [], [], {
    ...CONTEXT,
    unlockedRecipes: ["plasma"],
  }),
  true,
);
assert.equal(
  isContractTargetAvailable(order, [], [], {
    ...CONTEXT,
    unlockedRecipes: ["drones"],
  }),
  false,
  "заказ на неизученное оружие обязан исчезнуть",
);
assert.equal(
  isContractTargetAvailable({ type: "fabrication" }, [], [], CONTEXT),
  false,
  "заказ без оружия невыполним",
);

// ── Оба типа умеют платить опытом ───────────────────────────────────────────
assert.ok(EXP_REWARDS.crisis_response.baseExp > 0);
assert.ok(EXP_REWARDS.fabrication.baseExp > 0);

// ── Оба типа завершаются на планете-заказчике ───────────────────────────────
for (const contract of [early, order]) {
  assert.equal(contract.sourcePlanetId, PLANET.id);
  assert.equal(contract.sourceDominantRace, PLANET.dominantRace);
  assert.ok(contract.desc.startsWith("contracts.desc_"));
}

console.log("Response contract checks passed");
