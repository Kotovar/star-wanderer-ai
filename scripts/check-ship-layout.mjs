import assert from "node:assert/strict";
import "./register-ts-loader.mjs";

const {
    analyzeShipLayout,
    getExteriorTargetPriorityBonus,
    getFirstNewShipLayoutViolation,
    SHIP_EXTERIOR_TARGET_PRIORITY_BONUS,
} = await import("../src/game/modules/shipLayout.ts");

const moduleAt = (id, type, x, y, width = 1, height = 1) => ({
    id,
    type,
    name: `${type}-${id}`,
    x,
    y,
    width,
    height,
    health: 100,
    maxHealth: 100,
});

const valid = [
    moduleAt(1, "cockpit", 2, 0),
    moduleAt(2, "reactor", 2, 1),
    moduleAt(3, "lifesupport", 2, 2),
    moduleAt(4, "engine", 2, 3),
    moduleAt(5, "cargo", 1, 1),
    moduleAt(6, "cargo", 3, 1),
];

const analysis = analyzeShipLayout(valid, 5);
assert.deepEqual(analysis.violations, []);
assert.deepEqual(analysis.spineModuleIds, [1, 2, 3, 4]);
assert.equal(analysis.exteriorModuleIds.has(1), true);
assert.equal(SHIP_EXTERIOR_TARGET_PRIORITY_BONUS, 20);
assert.equal(getExteriorTargetPriorityBonus(1, analysis.exteriorModuleIds), 20);

const reactorBranch = [
    moduleAt(11, "cockpit", 2, 0),
    moduleAt(12, "cargo", 2, 1),
    moduleAt(13, "engine", 2, 2),
    moduleAt(14, "reactor", 1, 1),
];
assert.ok(
    analyzeShipLayout(reactorBranch, 5).violations.some(
        ({ code }) => code === "missing_spine",
    ),
);

const blockedCockpit = [
    moduleAt(21, "cockpit", 2, 1),
    moduleAt(22, "cargo", 2, 0),
    moduleAt(23, "reactor", 2, 2),
    moduleAt(24, "engine", 2, 3),
];
assert.ok(
    analyzeShipLayout(blockedCockpit, 5).violations.some(
        ({ key }) => key === "cockpit_front_blocked:21",
    ),
);

const internalTwoByTwo = [
    moduleAt(30, "lab", 1, 1, 2, 2),
    moduleAt(31, "cargo", 0, 1, 1, 2),
    moduleAt(32, "cargo", 3, 1, 1, 2),
    moduleAt(33, "cargo", 1, 0, 2, 1),
    moduleAt(34, "cargo", 1, 3, 2, 1),
];
const internalAnalysis = analyzeShipLayout(internalTwoByTwo, 5);
assert.equal(internalAnalysis.exteriorModuleIds.has(30), false);
assert.equal(
    getExteriorTargetPriorityBonus(30, internalAnalysis.exteriorModuleIds),
    0,
);
assert.equal(
    analyzeShipLayout([moduleAt(35, "lab", 0, 0, 2, 2)], 5).exteriorModuleIds.has(
        35,
    ),
    true,
);

const blockedEngine = [...valid, moduleAt(40, "cargo", 2, 4)];
assert.ok(
    analyzeShipLayout(blockedEngine, 5).violations.some(
        ({ key }) => key === "engine_exhaust_blocked:4",
    ),
);

const blockedWeapon = [
    moduleAt(41, "weaponbay", 2, 2),
    moduleAt(42, "cargo", 2, 1),
    moduleAt(43, "cargo", 2, 3),
    moduleAt(44, "cargo", 1, 2),
    moduleAt(45, "cargo", 3, 2),
];
const blockedWeaponAnalysis = analyzeShipLayout(blockedWeapon, 5);
assert.ok(
    blockedWeaponAnalysis.violations.some(
        ({ key }) => key === "weapon_exposure_blocked:41",
    ),
);
assert.equal(blockedWeaponAnalysis.exteriorModuleIds.has(41), false);

const pulseDriveHull = valid.map((module) =>
    module.id === 4 ? { ...module, type: "pulse_drive" } : module,
);
assert.deepEqual(analyzeShipLayout(pulseDriveHull, 5).violations, []);

const invertedCriticalOrder = [
    moduleAt(46, "reactor", 2, 0),
    moduleAt(47, "cockpit", 2, 1),
    moduleAt(48, "engine", 2, 2),
];
assert.ok(
    analyzeShipLayout(invertedCriticalOrder, 5).violations.some(
        ({ code }) => code === "missing_spine",
    ),
);

const equalPaths = [
    moduleAt(50, "cockpit", 2, 0),
    moduleAt(51, "cargo", 1, 0),
    moduleAt(52, "cargo", 1, 1),
    moduleAt(53, "cargo", 1, 2),
    moduleAt(61, "cargo", 3, 0),
    moduleAt(62, "cargo", 3, 1),
    moduleAt(63, "cargo", 3, 2),
    moduleAt(70, "reactor", 2, 2),
    moduleAt(80, "engine", 2, 3),
];
assert.deepEqual(analyzeShipLayout(equalPaths, 5).spineModuleIds, [
    50, 51, 52, 53, 70, 80,
]);

const multipleCriticalPaths = [
    moduleAt(150, "cockpit", 2, 0),
    moduleAt(151, "reactor", 2, 1),
    moduleAt(152, "engine", 2, 2),
    moduleAt(153, "cargo", 3, 0),
    moduleAt(154, "reactor", 3, 1),
    moduleAt(155, "pulse_drive", 3, 2),
];
assert.deepEqual(analyzeShipLayout(multipleCriticalPaths, 5).spineModuleIds, [
    150, 151, 152,
]);

const weaponShed = { ...moduleAt(90, "weaponShed", 2, 4), health: 0 };
const withWeaponShed = analyzeShipLayout([...valid, weaponShed], 5);
assert.deepEqual(withWeaponShed.violations, []);
assert.equal(withWeaponShed.exteriorModuleIds.has(90), false);

const destroyedBlocker = blockedCockpit.map((module) =>
    module.id === 22 ? { ...module, health: 0 } : module,
);
assert.ok(
    analyzeShipLayout(destroyedBlocker, 5).violations.some(
        ({ key }) => key === "cockpit_front_blocked:21",
    ),
);

const retained = {
    ...analysis,
    violations: [{ key: "missing_spine", code: "missing_spine" }],
};
const added = {
    ...analysis,
    violations: [
        ...retained.violations,
        {
            key: "weapon_exposure_blocked:41",
            code: "weapon_exposure_blocked",
            moduleId: 41,
        },
    ],
};
assert.equal(getFirstNewShipLayoutViolation(retained, retained), undefined);
assert.equal(
    getFirstNewShipLayoutViolation(retained, added)?.key,
    "weapon_exposure_blocked:41",
);

console.log("ship layout checks passed");
