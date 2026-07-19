import assert from "node:assert/strict";
import { isContractTargetAvailable } from "../src/game/contracts/targetAvailability.ts";

const sectors = [
  {
    id: 1,
    locations: [
      { id: "1-0", type: "enemy", threat: 2 },
      { id: "1-1", type: "enemy", threat: 5, defeated: true },
      { id: "1-2", type: "storm", stormIntensity: 2 },
    ],
  },
  {
    id: 2,
    locations: [
      { id: "2-0", type: "enemy", threat: 1, defeated: true },
      { id: "2-1", type: "storm", stormIntensity: 1 },
    ],
  },
];

const ok = (c, completed = []) => isContractTargetAvailable(c, sectors, completed);

// combat: живой враг есть в секторе 1, в секторе 2 все убиты
assert.ok(ok({ type: "combat", sectorId: 1 }), "combat: живой враг не найден");
assert.ok(!ok({ type: "combat", sectorId: 2 }), "combat: зачищенный сектор прошёл проверку");
assert.ok(!ok({ type: "combat", sectorId: 99 }), "combat: несуществующий сектор прошёл проверку");

// bounty: угроза живого врага должна дотягивать до цели
assert.ok(ok({ type: "bounty", targetSector: 1, targetThreat: 2 }), "bounty: цель не найдена");
assert.ok(!ok({ type: "bounty", targetSector: 1, targetThreat: 5 }), "bounty: убитый враг угрозы 5 засчитан");

// rescue: шторм нужной силы, не пройденный
assert.ok(ok({ type: "rescue", sectorId: 1, requiredStormIntensity: 2 }), "rescue: шторм не найден");
assert.ok(
  !ok({ type: "rescue", sectorId: 1, requiredStormIntensity: 2 }, ["1-2"]),
  "rescue: пройденный шторм засчитан",
);
assert.ok(!ok({ type: "rescue", sectorId: 2, requiredStormIntensity: 2 }), "rescue: слабый шторм засчитан");

// прочие типы не трогаем
assert.ok(ok({ type: "delivery", targetSector: 2 }), "delivery не должен фильтроваться");
assert.ok(ok({ type: "combat" }), "combat без сектора не должен фильтроваться");

console.log("✅ check-contract-targets: валидация целей контрактов в порядке");
