import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  LAUNCH_MODIFIERS,
  assertValidLaunchSelection,
  getLaunchCredits,
} from "../src/game/constants/launchModifiers.ts";
import { SHIP_TEMPLATES } from "../src/game/constants/shipTemplates.ts";
import {
  getPendingCrewPerkChoice,
  fillMissingTechPerkTiers,
} from "../src/game/crew/techPerks.ts";
import { MODULE_TYPES } from "../src/game/constants/modules.ts";
import { areAllModulesConnected } from "../src/game/modules/areAllModulesConnected.ts";
import {
  FUEL_PRICE_PER_UNIT,
  REPAIR_CONFIG,
} from "../src/game/slices/services/constants.ts";

const modifiersById = Object.fromEntries(
  LAUNCH_MODIFIERS.map((modifier) => [modifier.id, modifier]),
);
const buildStartingStateSource = await readFile(
  new URL("../src/game/slices/gameManagement/helpers/buildStartingState.ts", import.meta.url),
  "utf8",
);
const newGameSetupSource = await readFile(
  new URL("../src/game/components/NewGameSetupModal.tsx", import.meta.url),
  "utf8",
);

assert.match(newGameSetupSource, /pickRunProfileId/);
assert.match(
  newGameSetupSource,
  /restartGame\(selectedTemplateId, selectedModifiers, runProfileId\)/,
);

for (const template of SHIP_TEMPLATES) {
  assert.equal(assertValidLaunchSelection(template.credits, []), template.credits);
  assert.ok(template.fuel >= 0 && template.fuel <= template.maxFuel);
  assert.ok(template.modules.some((module) => module.type === "reactor"));
  assert.ok(template.modules.some((module) => module.type === "cockpit"));
  assert.ok(template.modules.some((module) => module.type === "engine"));
  assert.ok(template.modules.some((module) => module.type === "lifesupport"));
  assert.ok(template.modules.some((module) => module.type === "fueltank"));

  const gridSize = template.gridSize ?? 5;
  const occupiedCells = new Set();
  for (const shipModule of template.modules) {
    for (let x = shipModule.x; x < shipModule.x + shipModule.width; x += 1) {
      for (let y = shipModule.y; y < shipModule.y + shipModule.height; y += 1) {
        assert.ok(x >= 0 && x < gridSize && y >= 0 && y < gridSize);
        const cell = `${x}:${y}`;
        assert.ok(!occupiedCells.has(cell), `${template.id} overlaps at ${cell}`);
        occupiedCells.add(cell);
      }
    }
  }

  if (template.id === "dev_arsenal_fixture") {
    assert.equal(gridSize, 7);
    assert.equal(occupiedCells.size, gridSize ** 2);
    assert.equal(areAllModulesConnected(template.modules), true);
    assert.deepEqual(
      template.modules
        .filter((module) => module.type === "weaponbay")
        .map((module) => module.weapons?.length ?? 0)
        .sort((a, b) => a - b),
      [1, 3, 4, 5],
    );
    assert.deepEqual(
      [...new Set(template.modules.map((module) => module.type))].sort(),
      Object.keys(MODULE_TYPES).sort(),
    );
    assert.deepEqual(
      [
        ...new Set(
          template.modules.flatMap((module) =>
            module.weapons?.map((weapon) => weapon.type) ?? [],
          ),
        ),
      ].sort(),
      [
        "antimatter",
        "drones",
        "ion_cannon",
        "kinetic",
        "laser",
        "missile",
        "plasma",
        "quantum_torpedo",
      ],
    );
  }
}

const devArsenalTemplate = SHIP_TEMPLATES.find(
  (template) => template.id === "dev_arsenal_fixture",
);
assert.equal(
  Boolean(devArsenalTemplate),
  process.env.NODE_ENV === "development",
);

const devAllTechExplorer = SHIP_TEMPLATES.find(
  (template) => template.id === "dev_all_tech_explorer",
);
assert.equal(
  Boolean(devAllTechExplorer),
  process.env.NODE_ENV === "development",
);
if (devAllTechExplorer) {
  assert.ok(devArsenalTemplate);
  assert.equal(devAllTechExplorer.startWithAllTechs, true);
  assert.equal(devAllTechExplorer.gridSize, devArsenalTemplate.gridSize);
  assert.deepEqual(devAllTechExplorer.modules, devArsenalTemplate.modules);
  assert.deepEqual(
    devAllTechExplorer.crew.map((member) => member.moduleId),
    [712, 708, 722, 707, 702, 709],
    "dev all-tech explorer crew must be assigned to its modules",
  );
  assert.deepEqual(
    devAllTechExplorer.crew.map((member) => member.profession).sort(),
    ["engineer", "gunner", "medic", "pilot", "scientist", "scout"].sort(),
    "dev all-tech explorer must have exactly one crew member per profession",
  );
  assert.ok(
    devAllTechExplorer.crew.every(
      (member) => member.exp === member.level * 100 - 10,
    ),
    "dev all-tech explorer crew must be seeded 10 exp short of their next level, to make it easy to trigger a tech perk choice on purpose",
  );
  assert.equal(
    getPendingCrewPerkChoice(
      devAllTechExplorer.crew.map((member) => ({
        ...member,
        health: 100,
        // buildCrewMember() runs every crew member through this same
        // auto-fill before the game ever sees them (see buildCrewMember.ts) —
        // simulate that here since it can't be imported directly (its `@/`
        // import chain needs the Next.js bundler, unlike this leaf helper).
        techPerks: fillMissingTechPerkTiers(member.level, member.techPerks),
      })),
    ),
    null,
    "dev all-tech explorer crew above tier 3/6 must end up with those tiers auto-filled by buildCrewMember, or the perk choice modal opens immediately on spawn",
  );
  assert.match(buildStartingStateSource, /template\.startWithAllTechs/);
  assert.match(buildStartingStateSource, /Object\.values\(RESEARCH_TREE\)/);
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

assert.equal(modifiersById.weakened_reactor.creditDelta, 300);
assert.equal(modifiersById.stranded.creditDelta, 210);
assert.equal(modifiersById.damaged_ship.creditDelta, 210);
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
