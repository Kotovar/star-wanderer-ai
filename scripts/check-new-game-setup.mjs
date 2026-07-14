import assert from "node:assert/strict";
import {
  LAUNCH_MODIFIERS,
  assertValidLaunchSelection,
  getLaunchCredits,
} from "../src/game/constants/launchModifiers.ts";
import { SHIP_TEMPLATES } from "../src/game/constants/shipTemplates.ts";
import {
  FUEL_PRICE_PER_UNIT,
  REPAIR_CONFIG,
} from "../src/game/slices/services/constants.ts";

const modifiersById = Object.fromEntries(
  LAUNCH_MODIFIERS.map((modifier) => [modifier.id, modifier]),
);

for (const template of SHIP_TEMPLATES) {
  assert.equal(assertValidLaunchSelection(template.credits, []), template.credits);
  assert.ok(template.fuel >= 0 && template.fuel <= template.maxFuel);
  assert.ok(template.modules.some((module) => module.type === "reactor"));
  assert.ok(template.modules.some((module) => module.type === "cockpit"));
  assert.ok(template.modules.some((module) => module.type === "engine"));
  assert.ok(template.modules.some((module) => module.type === "lifesupport"));
  assert.ok(template.modules.some((module) => module.type === "fueltank"));

  const occupiedCells = new Set();
  for (const shipModule of template.modules) {
    for (let x = shipModule.x; x < shipModule.x + shipModule.width; x += 1) {
      for (let y = shipModule.y; y < shipModule.y + shipModule.height; y += 1) {
        assert.ok(x >= 1 && x <= 5 && y >= 1 && y <= 5);
        const cell = `${x}:${y}`;
        assert.ok(!occupiedCells.has(cell), `${template.id} overlaps at ${cell}`);
        occupiedCells.add(cell);
      }
    }
  }
}

for (const modifier of LAUNCH_MODIFIERS) {
  for (const conflictId of modifier.conflictsWith ?? []) {
    const conflictingModifier = modifiersById[conflictId];
    assert.ok(conflictingModifier, `${modifier.id} conflicts with an unknown modifier`);
    assert.ok(
      conflictingModifier.conflictsWith?.includes(modifier.id),
      `${modifier.id} conflict with ${conflictId} must be symmetric`,
    );
  }
}

for (const template of SHIP_TEMPLATES) {
  for (const modifier of LAUNCH_MODIFIERS) {
    const credits = getLaunchCredits(template.credits, [modifier]);
    if (credits >= 0) {
      assert.equal(
        assertValidLaunchSelection(template.credits, [modifier]),
        credits,
      );
    } else {
      assert.throws(
        () => assertValidLaunchSelection(template.credits, [modifier]),
        /cost more than starting credits/,
      );
    }
  }
}

const engineer = SHIP_TEMPLATES.find((template) => template.id === "engineer");
assert.equal(
  engineer?.modules
    .filter((module) => module.type === "cargo")
    .reduce((sum, module) => sum + (module.capacity ?? 0), 0),
  40,
);

assert.equal(modifiersById.weakened_reactor.creditDelta, 100);
assert.equal(modifiersById.stranded.creditDelta, 200);
assert.equal(modifiersById.damaged_ship.creditDelta, 200);
assert.deepEqual(modifiersById.stranded.conflictsWith, ["damaged_ship"]);
assert.deepEqual(modifiersById.damaged_ship.conflictsWith, ["stranded"]);

for (const template of SHIP_TEMPLATES) {
  const totalHp = template.modules.reduce(
    (sum, shipModule) => sum + shipModule.maxHealth,
    0,
  );
  const damagedRepair = Math.floor(
    totalHp *
      ((modifiersById.damaged_ship.moduleDamagePercent ?? 0) / 100) *
      REPAIR_CONFIG.pricePerHp,
  );
  assert.ok(
    modifiersById.damaged_ship.creditDelta <= damagedRepair,
    `${template.id} damaged_ship reward must not exceed its repair cost`,
  );

  const strandedTargets = template.modules.filter((shipModule) =>
    modifiersById.stranded.targetedModuleTypes?.includes(shipModule.type),
  );
  assert.ok(strandedTargets.length > 0);
  const minimumTargetedRepair = Math.min(
    ...strandedTargets.map((shipModule) =>
      Math.floor(
        shipModule.maxHealth *
          ((modifiersById.stranded.targetedModuleDamagePercent ?? 0) / 100) *
          REPAIR_CONFIG.pricePerHp,
      ),
    ),
  );
  const strandedRecovery =
    Math.max(0, -(modifiersById.stranded.fuelDelta ?? 0)) *
      FUEL_PRICE_PER_UNIT +
    minimumTargetedRepair;
  assert.ok(
    modifiersById.stranded.creditDelta <= strandedRecovery,
    `${template.id} stranded reward must not exceed its immediate recovery cost`,
  );
}

const scientist = SHIP_TEMPLATES.find((template) => template.id === "scientist");
assert.ok(scientist);
assert.equal(
  getLaunchCredits(scientist.credits, [modifiersById.veteran_crew]),
  -300,
);
assert.throws(
  () =>
    assertValidLaunchSelection(scientist.credits, [
      modifiersById.veteran_crew,
    ]),
  /cost more than starting credits/,
);
assert.throws(
  () =>
    assertValidLaunchSelection(scientist.credits, [
      modifiersById.doctrine_explorer,
      modifiersById.doctrine_trader,
    ]),
  /Only one starting doctrine/,
);
assert.throws(
  () =>
    assertValidLaunchSelection(scientist.credits, [
      modifiersById.stranded,
      modifiersById.damaged_ship,
    ]),
  /Conflicting launch modifier/,
);

console.log("New game setup checks passed");
