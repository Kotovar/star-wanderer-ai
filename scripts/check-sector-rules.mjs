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
const {
  SECTOR_RULES,
  SECTOR_RULE_IDS,
  getSectorRule,
  planSectorRules,
} = jiti("../src/game/galaxy/sectorRules.ts");
const { generateGalaxy } = jiti("../src/game/galaxy/generateGalaxy.ts");
const { generateLocation } = jiti("../src/game/galaxy/getLocation.ts");
const { ensureStation, ensureStationAnchors } = jiti("../src/game/galaxy/ensure.ts");
const { calculateFuelCost } = jiti("../src/game/slices/travel/helpers/calculateFuelCost.ts");
const { repairShip } = jiti("../src/game/slices/services/helpers/repairShip.ts");
const { getEffectiveScanRange } = jiti("../src/game/slices/scanner/helpers/getEffectiveScanRange.ts");
const { scanSector } = jiti("../src/game/slices/planetEffects/helpers/scanSector.ts");
const { getTotalDamage } = jiti("../src/game/slices/ship/helpers/getTotalDamage.ts");
const { removeExpiredEffects } = jiti(
  "../src/game/slices/planetEffects/helpers/removeEffect.ts",
);
const { applySectorRuleEffect } = jiti(
  "../src/game/slices/travel/helpers/applySectorRuleEffect.ts",
);
const { updateShipStats } = jiti("../src/game/slices/ship/helpers/updateShipStats.ts");
const activeEffectsPanelSource = readFileSync(
  path.join(root, "src/game/components/panels/ActiveEffectsPanel.tsx"),
  "utf8",
);
const headerSource = readFileSync(
  path.join(root, "src/game/components/header/Header.tsx"),
  "utf8",
);
const galaxyMapSource = readFileSync(
  path.join(root, "src/game/components/GalaxyMap.tsx"),
  "utf8",
);
const servicesSliceSource = readFileSync(
  path.join(root, "src/game/slices/services/createServicesSlice.ts"),
  "utf8",
);
const stationPanelSource = readFileSync(
  path.join(root, "src/game/components/StationPanel.tsx"),
  "utf8",
);
const servicesTabSource = readFileSync(
  path.join(root, "src/game/components/station/ServicesTab.tsx"),
  "utf8",
);
const emergencyJumpSource = readFileSync(
  path.join(root, "src/game/slices/travel/helpers/emergencyJump.ts"),
  "utf8",
);

const ruleIds = [
  "zero_field",
  "blind_zone",
  "fleet_graveyard",
  "resonance",
  "dead_drift",
  "trade_lane",
  "debris_belt",
  "anomaly_storm",
  "becalmed",
  "gravity_well",
];
const getTranslation = (locale, key) =>
  key.split(".").reduce((value, part) => value?.[part], locale);
const locales = [
  JSON.parse(readFileSync(path.join(root, "src/lib/locales/ru.json"), "utf8")),
  JSON.parse(readFileSync(path.join(root, "src/lib/locales/en.json"), "utf8")),
];

assert.deepEqual(Object.keys(SECTOR_RULES), ruleIds);
// Бейдж на карте — это глиф и цвет: два одинаковых правила не отличить.
const ruleIcons = Object.values(SECTOR_RULES).map((rule) => rule.icon);
assert.equal(new Set(ruleIcons).size, ruleIcons.length, "every rule needs its own map glyph");
const ruleColors = Object.values(SECTOR_RULES).map((rule) => rule.color);
assert.equal(new Set(ruleColors).size, ruleColors.length, "every rule needs its own colour");
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
assert.match(
  galaxyMapSource,
  /const dangerousJumpRule =\s*dangerousSector\?\.visited\s*\?\s*getSectorRule\(dangerousSector\.ruleId\)\s*:\s*undefined;/,
  "unvisited sectors must not reveal their rule in dangerous-jump details",
);
assert.match(
  galaxyMapSource,
  /const routeChoiceRule =\s*routeChoiceSector\?\.visited\s*\?\s*getSectorRule\(routeChoiceSector\.ruleId\)\s*:\s*undefined;/,
  "unvisited sectors must not reveal their rule in route details",
);
assert.match(
  galaxyMapSource,
  /sectors\.filter\(\s*\(sector\) =>\s*sector\.visited && \(sector\.tier !== 4 \|\| canSeeT4\),\s*\)/,
  "only visited sectors may show rule markers",
);
assert.match(
  galaxyMapSource,
  /const discoveredRuleIds = SECTOR_RULE_IDS\.filter\(\s*\(ruleId\) =>\s*sectors\.some\(\(sector\) => sector\.visited && sector\.ruleId === ruleId\),\s*\);/,
  "the legend must only list rules discovered in visited sectors",
);
assert.match(
  galaxyMapSource,
  /\{discoveredRuleIds\.length > 0 && \(/,
  "the rule legend must stay hidden until a rule is discovered",
);
assert.match(
  servicesSliceSource,
  /const repairBlocked =\s*getSectorRule\(state\.currentSector\?\.ruleId\)\?\.restrictions\?\.noRepair === true;/,
  "fleet graveyard must disable repairs before the button can be clicked",
);
assert.match(
  servicesSliceSource,
  /return !repairBlocked && canUse;/,
  "repair availability must include the sector restriction",
);
assert.match(
  stationPanelSource,
  /repairUnavailableReason=\{\s*repairBlockedBySector\s*\?\s*t\("sector_rules\.logs\.repair_blocked"\)\s*:\s*undefined\s*\}/,
  "station UI must explain a repair block caused by the sector",
);
assert.match(
  servicesTabSource,
  /repairUnavailableReason \?\? `✗ \$\{t\("services\.not_needed"\)\}`/,
  "repair UI must render its supplied unavailable reason",
);
assert.equal(getTranslation(locales[0], "sector_rules.current"), "ОСОБЕННОСТИ СИСТЕМЫ");
assert.equal(getTranslation(locales[1], "sector_rules.current"), "SYSTEM FEATURES");
for (const rule of Object.values(SECTOR_RULES)) {
  for (const locale of locales) {
    assert.equal(typeof getTranslation(locale, rule.nameKey), "string");
    assert.equal(typeof getTranslation(locale, rule.descKey), "string");
  }
}

// Сообщения об ограничениях общие: их увидит любое правило с тем же флагом.
const ruleNames = Object.values(SECTOR_RULES).flatMap((rule) =>
  locales.map((locale) => getTranslation(locale, rule.nameKey)),
);
for (const logKey of ["repair_blocked", "scan_blocked", "artifact_hint"]) {
  for (const locale of locales) {
    const message = getTranslation(locale, `sector_rules.logs.${logKey}`);
    assert.equal(typeof message, "string", `sector_rules.logs.${logKey} must be localized`);
    assert.ok(
      ruleNames.every((name) => !message.includes(name)),
      `sector_rules.logs.${logKey} must not name a single rule`,
    );
  }
}

for (let run = 0; run < 20; run += 1) {
  const sectors = generateGalaxy();
  const ruleSectors = sectors.filter((sector) => sector.ruleId);
  assert.ok(ruleSectors.length >= 4 && ruleSectors.length <= 5, "each galaxy needs 4-5 sector rules");
  assert.equal(
    new Set(ruleSectors.map((sector) => sector.ruleId)).size,
    ruleSectors.length,
    "each generated sector rule must be unique",
  );
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
const plannedRuleSectors = Array.from(
  { length: 6 },
  (_, index) => makeSector(110 + index, 2),
);
const originalRandom = Math.random;
try {
  Math.random = () => 0.999;
  planSectorRules(plannedRuleSectors);
} finally {
  Math.random = originalRandom;
}
const plannedRuleIds = plannedRuleSectors.flatMap((sector) =>
  sector.ruleId ? [sector.ruleId] : [],
);
assert.ok(
  plannedRuleIds.length <= SECTOR_RULE_IDS.length,
  "sector generation must not place more rules than unique rule types",
);
// Пул правил должен превышать выборку, иначе каждый забег выглядит одинаково.
assert.ok(
  SECTOR_RULE_IDS.length > plannedRuleIds.length,
  "the rule pool must be larger than one galaxy's draw",
);
// Ни одно правило не подходит стартовому сектору — генерация должна выжить.
assert.doesNotThrow(
  () => planSectorRules([makeSector(0, 1)]),
  "planning must degrade to fewer rules instead of killing galaxy generation",
);
assert.equal(
  new Set(plannedRuleIds).size,
  plannedRuleIds.length,
  "each generated sector rule must be unique",
);
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

const sampleLocationRate = (rule, types) => {
  let matched = 0;
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
    if (types.includes(location.type)) matched += 1;
  }
  return matched / samples;
};
const ordinarySalvageRate = sampleLocationRate(undefined, ["derelict_ship", "wreck_field"]);
const graveyardSalvageRate = sampleLocationRate(
  getSectorRule("fleet_graveyard"),
  ["derelict_ship", "wreck_field"],
);
assert.ok(
  graveyardSalvageRate > ordinarySalvageRate * 2,
  "fleet graveyard must more than double salvage locations",
);
const ordinaryDriftRate = sampleLocationRate(undefined, ["distress_signal", "derelict_ship"]);
const deadDriftRate = sampleLocationRate(
  getSectorRule("dead_drift"),
  ["distress_signal", "derelict_ship"],
);
assert.ok(
  deadDriftRate > ordinaryDriftRate * 1.7,
  "dead drift must substantially increase distress and derelict locations",
);

const makeState = () => ({
  turn: 1,
  currentSector: null,
  traveling: null,
  galaxy: { sectors: [] },
  research: { researchedTechs: [] },
  artifacts: [],
  activeContracts: [],
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

// Платный скан архивов синтетиков не должен обходить слепую зону.
const archiveScanState = makeState();
archiveScanState.credits = 1_000_000;
archiveScanState.currentSector = makeSector(908, 2, "blind_zone");
const archiveScanLogs = [];
assert.equal(
  scanSector(
    () => {
      throw new Error("archive scan must not change state in a blind zone");
    },
    () => ({ ...archiveScanState, addLog: (...args) => archiveScanLogs.push(args) }),
  ),
  false,
  "blind zone must reject the synthetic archive scan",
);
assert.equal(archiveScanLogs.length, 1, "rejected archive scan must tell the player why");

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

// Штраф резонанса упирается в 0 у слабого корабля — вылет не должен вернуть
// больше, чем правило реально сняло.
for (const startingShields of [0, 20, 100]) {
  const roundTripState = makeState();
  roundTripState.ship.maxShields = startingShields;
  roundTripState.ship.shields = startingShields;
  const applyRoundTrip = (update) => {
    Object.assign(
      roundTripState,
      typeof update === "function" ? update(roundTripState) : update,
    );
  };
  const roundTripGet = () => ({ ...roundTripState, addLog: () => undefined });
  for (let lap = 0; lap < 2; lap += 1) {
    applySectorRuleEffect(makeSector(920, 2, "resonance"), applyRoundTrip, roundTripGet);
    assert.ok(
      roundTripState.ship.maxShields >= 0 &&
        roundTripState.ship.maxShields <= startingShields,
      "resonance must never raise the shield reserve",
    );
    applySectorRuleEffect(makeSector(921, 2), applyRoundTrip, roundTripGet);
    assert.equal(
      roundTripState.ship.maxShields,
      startingShields,
      "leaving a resonance sector must restore exactly the original shield reserve",
    );
    assert.equal(
      roundTripState.ship.bonusShields ?? 0,
      0,
      "leaving a resonance sector must clear its shield bonus",
    );
  }
}

// Штрафы к урону и уклонению обязаны доходить до корабля и полностью сниматься.
const penaltyState = makeState();
penaltyState.ship.modules = [
  { type: "weaponbay", health: 100, level: 1, weapons: [{ type: "kinetic" }] },
];
const applyPenaltyState = (update) => {
  Object.assign(penaltyState, typeof update === "function" ? update(penaltyState) : update);
};
const penaltyGet = () => ({ ...penaltyState, addLog: () => undefined });
const cleanDamage = getTotalDamage(penaltyState).total;
applySectorRuleEffect(makeSector(922, 2, "debris_belt"), applyPenaltyState, penaltyGet);
assert.equal(penaltyState.ship.bonusDamage, -0.15, "debris belt must record its damage penalty");
assert.ok(
  getTotalDamage(penaltyState).total < cleanDamage,
  "a negative combat bonus must actually reduce weapon damage",
);
applySectorRuleEffect(makeSector(923, 2, "gravity_well"), applyPenaltyState, penaltyGet);
assert.equal(penaltyState.ship.bonusDamage, 0, "leaving must clear the damage penalty");
assert.equal(penaltyState.ship.bonusEvasion, -10, "gravity well must record its evasion penalty");
assert.equal(
  getTotalDamage(penaltyState).total,
  cleanDamage,
  "damage must return to its clean value once the penalty rule is gone",
);
applySectorRuleEffect(makeSector(924, 2), applyPenaltyState, penaltyGet);
assert.equal(penaltyState.ship.bonusEvasion, 0, "leaving must clear the evasion penalty");

// Истекающий эффект планеты не должен стирать штраф сектора заодно с собой.
const expiryState = makeState();
const applyExpiryState = (update) => {
  Object.assign(expiryState, typeof update === "function" ? update(expiryState) : update);
};
const expiryGet = () => ({ ...expiryState, addLog: () => undefined });
applySectorRuleEffect(makeSector(925, 2, "debris_belt"), applyExpiryState, expiryGet);
applySectorRuleEffect(makeSector(926, 2, "resonance"), applyExpiryState, expiryGet);
const sectorDamage = expiryState.ship.bonusDamage;
const sectorShields = expiryState.ship.bonusShields;
expiryState.activeEffects = [
  ...expiryState.activeEffects,
  {
    id: "planet-buff",
    name: "Planet buff",
    source: "planet",
    turnsRemaining: 1,
    effects: [
      { type: "combat_bonus", value: 0.1 },
      { type: "shield_boost", value: 10 },
    ],
  },
];
expiryState.ship.bonusDamage += 0.1;
expiryState.ship.bonusShields += 10;
removeExpiredEffects(applyExpiryState, expiryGet);
assert.equal(
  expiryState.ship.bonusDamage.toFixed(4),
  sectorDamage.toFixed(4),
  "an expiring planet effect must not erase the sector damage modifier",
);
assert.equal(
  expiryState.ship.bonusShields,
  sectorShields,
  "an expiring planet effect must not erase the sector shield modifier",
);

const deadDriftState = makeState();
const deadDriftOrigin = {
  ...makeSector(911, 2, "dead_drift"),
  mapAngle: 0,
  mapRadius: 1,
  visited: false,
};
const deadDriftTarget = {
  ...makeSector(912, 3),
  mapAngle: Math.PI / 2,
  mapRadius: 1,
};
deadDriftState.currentSector = deadDriftOrigin;
deadDriftState.galaxy.sectors = [deadDriftOrigin, deadDriftTarget];
const ordinaryFuelCost = calculateFuelCost(
  deadDriftState,
  deadDriftTarget.id,
  false,
  false,
  false,
  true,
).fuelCost;
const applyDeadDriftState = (update) => {
  Object.assign(
    deadDriftState,
    typeof update === "function" ? update(deadDriftState) : update,
  );
};
applySectorRuleEffect(deadDriftOrigin, applyDeadDriftState, () => ({
  ...deadDriftState,
  addLog: () => undefined,
}));
const deadDriftFuelCost = calculateFuelCost(
  deadDriftState,
  deadDriftTarget.id,
  false,
  false,
  false,
  true,
).fuelCost;
assert.ok(
  deadDriftFuelCost > ordinaryFuelCost,
  "dead drift must increase fuel consumption after arrival",
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

assert.match(
  emergencyJumpSource,
  /currentSector:\s*\{\s*\.\.\.destination,\s*visited:\s*true\s*\}/,
  "emergency arrival must mark its destination as visited",
);
assert.match(
  emergencyJumpSource,
  /sector\.id === destination\.id\s*\?\s*\{\s*\.\.\.sector,\s*visited:\s*true\s*\}/,
  "emergency arrival must persist the visited destination in the galaxy",
);
assert.match(
  emergencyJumpSource,
  /applySectorRuleEffect\(destination, set, get\);/,
  "emergency arrival must apply its sector rule",
);
assert.match(
  emergencyJumpSource,
  /get\(\)\.syncNavigatorIntel\(\);/,
  "emergency arrival must refresh navigator intel",
);
assert.match(
  emergencyJumpSource,
  /if \(destination\.tier === 4\)\s*\{\s*get\(\)\.checkVictory\(\);/,
  "emergency arrival in tier 4 must check victory",
);
assert.match(
  emergencyJumpSource,
  /applyNeutronRadiation\(destination, set, get\);/,
  "emergency arrival must apply neutron-star radiation",
);
assert.match(
  emergencyJumpSource,
  /applyPatrolContractCompletions\(patrolResult, set, get\);/,
  "emergency arrival must resolve patrol contracts",
);

console.log("Sector rule contract checks passed");
