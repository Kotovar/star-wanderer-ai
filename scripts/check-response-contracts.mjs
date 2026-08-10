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
const {
  seedFabricationOffers,
  seedStartingFabricationOffers,
  seedCrisisResponseOffers,
  dropStaleCrisisOffers,
} = await import("../src/game/contracts/seedResponseContracts.ts");
const { GLOBAL_CRISES } = await import("../src/game/constants/globalCrises.ts");
const { TRADE_GOODS } = await import("../src/game/constants/goods.ts");
const { CRAFTING_RECIPES } = await import("../src/game/constants/crafting.ts");
const { CONTRACT_REWARDS: EXP_REWARDS } = await import(
  "../src/game/constants/experience.ts"
);

const PLANET = { id: "p-1", name: "Тестовая", dominantRace: "human" };
const SECTOR = { id: 2, name: "Сектор", tier: 2, locations: [] };
const CONTEXT = { artifacts: [], researchedTechs: [] };

// ── Обычные кризисы знают, чем их гасить, и груз реально существует ──────────
for (const crisis of GLOBAL_CRISES.filter((c) => c.id !== "nebula_front")) {
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

// ── Событийный подсев: динамика не ждёт стоходового обновления ──────────────
const planet = (id, visited, contracts = []) => ({
  id,
  name: id,
  type: "planet",
  visited,
  contracts,
  dominantRace: "human",
});
const makeSectors = () => [
  {
    id: 1,
    name: "S1",
    tier: 2,
    locations: [
      planet("visited", true),
      planet("fresh", false),
      { id: "belt", type: "asteroid_belt", name: "belt" },
      { ...planet("empty", false), isEmpty: true },
    ],
  },
];

const findPlanet = (sectors, id) =>
  sectors[0].locations.find((l) => l.id === id);

// Заказы на новый рецепт ждут игрока впереди, а не на пройденных планетах
const seeded = seedFabricationOffers(makeSectors(), "plasma");
assert.ok(seeded, "открытие рецепта обязано подсеять заказы");
assert.equal(findPlanet(seeded, "fresh").contracts.length, 1);
assert.equal(findPlanet(seeded, "fresh").contracts[0].type, "fabrication");
assert.equal(
  findPlanet(seeded, "visited").contracts.length,
  0,
  "посещённые планеты доберут своё на обычном обновлении",
);
assert.equal(
  findPlanet(seeded, "empty").contracts.length,
  0,
  "пустая планета не выдаёт заказов",
);
assert.equal(seedFabricationOffers(makeSectors(), "not_a_recipe"), null);

// Повторное открытие того же рецепта не плодит дубликаты
assert.equal(seedFabricationOffers(seeded, "plasma"), null);

// Потолок предложений соблюдается
const crowded = [
  {
    ...makeSectors()[0],
    locations: [
      planet(
        "fresh",
        false,
        Array.from({ length: 5 }, (_, i) => ({ id: `x${i}`, type: "delivery" })),
      ),
    ],
  },
];
assert.equal(seedFabricationOffers(crowded, "plasma"), null);

// Старт со всеми рецептами (dev-шаблоны, случайная стартовая технология) не
// проходит через processResearch — заказы обязаны быть уже на первом ходу
const startSectors = [
  {
    id: 1,
    name: "S1",
    tier: 2,
    locations: Array.from({ length: 200 }, (_, i) => planet(`p${i}`, false)),
  },
];
const started = seedStartingFabricationOffers(startSectors, [
  "plasma",
  "drones",
  "ion_cannon",
]);
assert.ok(started, "старт с рецептами обязан подсеять заказы");
const startedOffers = started[0].locations.flatMap((l) => l.contracts);
assert.ok(startedOffers.length > 0);
assert.ok(
  startedOffers.every((offer) => offer.type === "fabrication"),
  "подсев не должен добавлять ничего лишнего",
);
// Бросок на планету, а не на рецепт: иначе планета целиком забилась бы заказами
assert.ok(
  started[0].locations.every(
    (l) => l.contracts.filter((c) => c.type === "fabrication").length <= 1,
  ),
  "на планете не может быть больше одного стартового заказа",
);
assert.ok(
  startedOffers.length < started[0].locations.length,
  "заказы обязаны выпадать по шансу, а не на каждой планете",
);
assert.equal(seedStartingFabricationOffers(startSectors, []), null);
assert.equal(seedStartingFabricationOffers(startSectors, undefined), null);
assert.equal(seedStartingFabricationOffers(startSectors, ["nope"]), null);

// Кризис просит помощи сразу и по всей галактике, включая непосещённое
const crisisState = { id: "epidemic", turnsRemaining: 30 };
const withCrisis = seedCrisisResponseOffers(makeSectors(), crisisState);
assert.ok(withCrisis, "старт кризиса обязан подсеять просьбы о помощи");
for (const id of ["visited", "fresh"]) {
  assert.equal(findPlanet(withCrisis, id).contracts[0].type, "crisis_response");
}
assert.equal(seedCrisisResponseOffers(withCrisis, crisisState), null);

// Туманностный фронт гасится только коалицией на исследовательской станции,
// а не ложными планетарными заказами на обычный товар.
const nebulaFrontState = { id: "nebula_front", turnsRemaining: 30 };
assert.equal(
  generateCrisisResponseContract(PLANET, SECTOR, nebulaFrontState),
  null,
  "туманностный фронт не должен выдавать обычный кризисный контракт",
);
assert.equal(
  seedCrisisResponseOffers(makeSectors(), nebulaFrontState),
  null,
  "туманностный фронт не должен засевать планеты ложными просьбами о помощи",
);

// Прошедший кризис уносит свои предложения с собой
const cleaned = dropStaleCrisisOffers(withCrisis, null);
assert.ok(cleaned, "предложения ушедшего кризиса обязаны сниматься");
for (const id of ["visited", "fresh"]) {
  assert.equal(findPlanet(cleaned, id).contracts.length, 0);
}
assert.equal(
  dropStaleCrisisOffers(withCrisis, "epidemic"),
  null,
  "идущий кризис свои предложения не теряет",
);
assert.equal(dropStaleCrisisOffers(makeSectors(), null), null);

// ── Оба типа завершаются на планете-заказчике ───────────────────────────────
for (const contract of [early, order]) {
  assert.equal(contract.sourcePlanetId, PLANET.id);
  assert.equal(contract.sourceDominantRace, PLANET.dominantRace);
  assert.ok(contract.desc.startsWith("contracts.desc_"));
}

console.log("Response contract checks passed");
