import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const jiti = require("jiti")(scriptPath, {
  alias: { "@": path.join(root, "src") },
});
const { SECTOR_RULES, getSectorRule } = jiti("../src/game/galaxy/sectorRules.ts");
const { generateGalaxy } = jiti("../src/game/galaxy/generateGalaxy.ts");
const { generateLocation } = jiti("../src/game/galaxy/getLocation.ts");
const { ensureStation, ensureStationAnchors } = jiti("../src/game/galaxy/ensure.ts");
const { calculateFuelCost } = jiti("../src/game/slices/travel/helpers/calculateFuelCost.ts");
const { repairShip } = jiti("../src/game/slices/services/helpers/repairShip.ts");
const { getEffectiveScanRange } = jiti("../src/game/slices/scanner/helpers/getEffectiveScanRange.ts");
const { applySectorRuleEffect } = jiti(
  "../src/game/slices/travel/helpers/applySectorRuleEffect.ts",
);
const { updateShipStats } = jiti("../src/game/slices/ship/helpers/updateShipStats.ts");
const { emergencyJump } = jiti("../src/game/slices/travel/helpers/emergencyJump.ts");
const activeEffectsPanelSource = readFileSync(
  path.join(root, "src/game/components/panels/ActiveEffectsPanel.tsx"),
  "utf8",
);
const headerSource = readFileSync(
  path.join(root, "src/game/components/header/Header.tsx"),
  "utf8",
);

const ruleIds = [
  "zero_field",
  "blind_zone",
  "fleet_graveyard",
  "resonance",
  "dead_drift",
];
const getTranslation = (locale, key) =>
  key.split(".").reduce((value, part) => value?.[part], locale);
const locales = [
  JSON.parse(readFileSync(path.join(root, "src/lib/locales/ru.json"), "utf8")),
  JSON.parse(readFileSync(path.join(root, "src/lib/locales/en.json"), "utf8")),
];

assert.deepEqual(Object.keys(SECTOR_RULES), ruleIds);
assert.equal(getSectorRule("zero_field")?.restrictions?.noWarp, true);
assert.equal("noEmergencyJump" in (getSectorRule("zero_field")?.restrictions ?? {}), false);
assert.equal(getSectorRule(undefined), undefined);
assert.match(
  activeEffectsPanelSource,
  /const permanentEffects = activeEffects\.filter\(\(effect\) => effect\.permanent && effect\.source !== "sector"\);/,
  "sector rules must stay on the sector map instead of the permanent effects panel",
);
assert.match(
  headerSource,
  /const visibleEffectCount = activeEffects\.filter\(\(effect\) => effect\.source !== "sector"\)\.length;/,
  "sector rules must not increase the effects button badge",
);
assert.match(
  headerSource,
  /\{visibleEffectCount > 0 && \(/,
  "effects badge must use the visible effect count",
);
assert.doesNotMatch(
  headerSource,
  /\{activeEffects\.length > 0 && \(/,
  "effects badge must not read the raw effect count",
);
assert.equal(getTranslation(locales[0], "sector_rules.current"), "ОСОБЕННОСТИ СИСТЕМЫ");
assert.equal(getTranslation(locales[1], "sector_rules.current"), "SYSTEM FEATURES");
for (const rule of Object.values(SECTOR_RULES)) {
  for (const locale of locales) {
    assert.equal(typeof getTranslation(locale, rule.nameKey), "string");
    assert.equal(typeof getTranslation(locale, rule.descKey), "string");
  }
}

for (let run = 0; run < 20; run += 1) {
  const sectors = generateGalaxy();
  const ruleSectors = sectors.filter((sector) => sector.ruleId);
  assert.ok(ruleSectors.length >= 4 && ruleSectors.length <= 6, "each galaxy needs 4-6 sector rules");
  assert.ok(
    ruleSectors.every(
      (sector) =>
        sector.id !== 0 &&
        sector.star.type !== "blackhole" &&
        !sector.locations.some(
          (location) => location.bossId === "void_oracle" || location.bossId === "the_eternal",
        ),
    ),
    "rules must avoid the start, black holes, and reserved bosses",
  );
  assert.ok(
    ruleSectors.filter((sector) => sector.tier === 1).length <= 1,
    "tier 1 may contain at most one rule",
  );
}

const makeSector = (id, tier, ruleId) => ({
  id,
  tier,
  ruleId,
  locations: [],
  star: { type: "yellow_dwarf", name: "star_types.yellow_dwarf" },
});
const graveyard = makeSector(100, 2, "fleet_graveyard");
ensureStation(graveyard);
assert.equal(
  graveyard.locations.some((location) => location.type === "station"),
  false,
  "fleet graveyard must reject its own station guarantee",
);

const anchorGraveyard = makeSector(101, 2, "fleet_graveyard");
const anchorOrdinary = makeSector(102, 2);
ensureStationAnchors([anchorGraveyard, anchorOrdinary], { 2: 1 });
assert.equal(
  anchorGraveyard.locations.some((location) => location.type === "station"),
  false,
  "station anchors must skip fleet graveyards",
);
assert.equal(
  anchorOrdinary.locations.filter((location) => location.type === "station").length,
  1,
  "station anchor must move to an eligible sector",
);

const sampleSalvageRate = (rule) => {
  let salvage = 0;
  const samples = 12_000;
  for (let index = 0; index < samples; index += 1) {
    const location = generateLocation(
      200,
      index,
      2,
      false,
      "yellow_dwarf",
      undefined,
      undefined,
      rule,
    );
    if (location.type === "derelict_ship" || location.type === "wreck_field") salvage += 1;
  }
  return salvage / samples;
};
const ordinarySalvageRate = sampleSalvageRate(undefined);
const graveyardSalvageRate = sampleSalvageRate(getSectorRule("fleet_graveyard"));
assert.ok(
  graveyardSalvageRate > ordinarySalvageRate * 2,
  "fleet graveyard must more than double salvage locations",
);

const makeState = () => ({
  turn: 1,
  currentSector: null,
  traveling: null,
  galaxy: { sectors: [] },
  research: { researchedTechs: [] },
  artifacts: [],
  ship: {
    modules: [{ type: "engine", health: 100, fuelEfficiency: 10 }],
    maxShields: 100,
    shields: 100,
  },
  crew: [],
  activeEffects: [],
});
const warpState = makeState();
const warpOrigin = {
  ...makeSector(900, 2, "zero_field"),
  id: 900,
  mapAngle: 0,
};
const warpTarget = {
  ...makeSector(901, 2),
  id: 901,
  mapAngle: Math.PI / 4,
};
warpState.currentSector = warpOrigin;
warpState.galaxy.sectors = [warpOrigin, warpTarget];
warpState.research.researchedTechs = ["warp_drive"];
assert.equal(
  calculateFuelCost(warpState, warpTarget.id, false, false, false, true).travelInstant,
  false,
  "zero field must disable warp drive",
);
assert.equal(
  calculateFuelCost(warpState, warpTarget.id, false, false, true, true).travelInstant,
  false,
  "zero field must disable warp coil",
);

const noScanState = makeState();
noScanState.currentSector = makeSector(903, 2, "blind_zone");
assert.equal(getEffectiveScanRange(noScanState), 0, "blind zone must disable scanning");

const repairState = makeState();
repairState.currentSector = makeSector(904, 2, "fleet_graveyard");
const repairLogs = [];
repairShip(
  () => {
    throw new Error("repair must not change state in a fleet graveyard");
  },
  () => ({ ...repairState, addLog: (...args) => repairLogs.push(args) }),
);
assert.equal(repairLogs.length, 1, "fleet graveyard must reject repairs");

const effectState = makeState();
const effectLogs = [];
const applyEffectState = (update) => {
  Object.assign(effectState, typeof update === "function" ? update(effectState) : update);
};
const effectGet = () => ({
  ...effectState,
  addLog: (...args) => effectLogs.push(args),
});
const blindZone = { ...makeSector(902, 2, "blind_zone"), visited: false };
applySectorRuleEffect(blindZone, applyEffectState, effectGet);
assert.equal(
  effectState.activeEffects.filter((effect) => effect.source === "sector").length,
  1,
  "arrival must install one sector effect",
);
assert.equal(effectState.ship.bonusEvasion, 15, "sector evasion bonus must apply immediately");
applySectorRuleEffect({ ...blindZone, ruleId: "zero_field" }, applyEffectState, effectGet);
assert.equal(
  effectState.activeEffects.filter((effect) => effect.source === "sector").length,
  1,
  "arrival must replace the previous sector effect",
);
assert.equal(effectState.ship.bonusEvasion, 0, "old sector bonus must be removed");

const resonanceState = makeState();
resonanceState.ship.modules = [{ type: "shield", health: 100, shields: 100 }];
const applyResonanceState = (update) => {
  Object.assign(
    resonanceState,
    typeof update === "function" ? update(resonanceState) : update,
  );
};
applySectorRuleEffect(
  makeSector(907, 2, "resonance"),
  applyResonanceState,
  () => ({ ...resonanceState, addLog: () => undefined }),
);
assert.equal(resonanceState.ship.bonusDamage, 0.25, "resonance must boost weapon damage");
assert.equal(resonanceState.ship.maxShields, 75, "resonance must reduce shield reserve by 25");
updateShipStats(resonanceState);
assert.equal(
  resonanceState.ship.maxShields,
  75,
  "resonance shield penalty must survive a ship stat recalculation",
);

const hintState = makeState();
const hintGraveyard = {
  ...makeSector(905, 2, "fleet_graveyard"),
  name: "Graveyard",
  danger: 1,
  visited: false,
};
const hintAnomalySector = {
  ...makeSector(906, 2),
  name: "Anomaly",
  danger: 2,
  locations: [{ type: "anomaly", name: "Artifact Echo" }],
};
hintState.currentSector = hintGraveyard;
hintState.galaxy.sectors = [hintGraveyard, hintAnomalySector];
hintState.artifacts = [{ id: "hinted-artifact", discovered: false, hinted: false }];
const applyHintState = (update) => {
  Object.assign(hintState, typeof update === "function" ? update(hintState) : update);
};
applySectorRuleEffect(hintGraveyard, applyHintState, () => ({
  ...hintState,
  addLog: () => undefined,
}));
assert.equal(hintState.artifacts[0].hinted, true, "fleet graveyard must reveal an artifact lead");
assert.equal(hintState.artifacts[0].hintSource, "sector");

const emergencyState = makeState();
const emergencyOrigin = {
  ...makeSector(908, 2),
  name: "Black Hole",
  danger: 1,
  mapAngle: 0,
  mapRadius: 1,
  locations: [{ type: "anomaly", name: "Artifact Echo" }],
  star: { type: "blackhole", name: "star_types.blackhole" },
};
const emergencyDestination = {
  ...makeSector(909, 2, "fleet_graveyard"),
  name: "Emergency Graveyard",
  danger: 2,
  mapAngle: 0.1,
  mapRadius: 1,
  visited: false,
};
emergencyState.currentSector = emergencyOrigin;
emergencyState.galaxy.sectors = [emergencyOrigin, emergencyDestination];
emergencyState.crewAutomation = { emergencyFuelTarget: emergencyDestination.id };
emergencyState.ship = { ...emergencyState.ship, fuel: 0, maxFuel: 10 };
emergencyState.artifacts = [
  {
    id: "emergency-artifact",
    discovered: false,
    hinted: false,
    effect: { type: "shield_boost", active: false },
  },
];
const applyEmergencyState = (update) => {
  Object.assign(emergencyState, typeof update === "function" ? update(emergencyState) : update);
};
emergencyJump(applyEmergencyState, () => ({
  ...emergencyState,
  addLog: () => undefined,
  updateShipStats: () => undefined,
  checkGameOver: () => undefined,
}));
assert.equal(
  emergencyState.currentSector.visited,
  true,
  "emergency arrival must mark the current sector as visited",
);
assert.equal(
  emergencyState.galaxy.sectors.find((sector) => sector.id === emergencyDestination.id).visited,
  true,
  "emergency arrival must persist the visited sector in the galaxy",
);
assert.equal(
  emergencyState.artifacts[0].hinted,
  true,
  "the first emergency arrival must still receive the graveyard artifact hint",
);

console.log("Sector rule contract checks passed");
