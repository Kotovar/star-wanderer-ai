import "./register-ts-loader.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const { RUN_PROFILES } = await import("../src/game/galaxy/runProfiles.ts");
const { generateGalaxy } = await import("../src/game/galaxy/generateGalaxy.ts");
const { ensureDiplomaticStation, ensureStationAnchors, ensureStationTypes } = await import("../src/game/galaxy/ensure.ts");
const { loadWithMigrations } = await import("../src/game/saves/migrations.ts");
const { ANCIENT_BOSSES } = await import("../src/game/constants/bosses.ts");
const ru = (await import("../src/lib/locales/ru.json")).default;
const en = (await import("../src/lib/locales/en.json")).default;

const count = (sectors, type) => sectors.flatMap((sector) => sector.locations).filter((location) => location.type === type).length;
const hasStation = (sectors, tier, stationType) =>
  sectors.some((sector) => sector.tier === tier && sector.locations.some(
    (location) => location.type === "station" && location.stationType === stationType,
  ));
const tierLocations = (sectors, tier, type) =>
  sectors.filter((sector) => sector.tier === tier)
    .flatMap((sector) => sector.locations)
    .filter((location) => location.type === type).length;
const normalTierBosses = (sectors, tier) =>
  sectors
    .filter((sector) => sector.tier === tier && sector.star.type !== "blackhole")
    .flatMap((sector) => sector.locations)
    .filter((location) => location.type === "boss");

const withConstantRandom = (value, callback) => {
  const originalRandom = Math.random;
  Math.random = () => value;
  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
};
const makeTier1Anchors = (stationType) => [0, 1, 2, 3].map((id) => ({
  id,
  tier: 1,
  star: { type: "red_dwarf", name: "star_types.red_dwarf" },
  locations: [{ id: `${id}-station`, type: "station", stationType }],
}));
const makeTier4ServiceFixture = () => [
  {
    id: 39,
    tier: 4,
    star: { type: "red_dwarf", name: "star_types.red_dwarf" },
    locations: [{ id: "39-station", type: "station", stationType: "trade" }],
  },
  ...[40, 41].map((id) => ({
    id,
    tier: 4,
    star: { type: "blackhole", name: "star_types.blackhole" },
    locations: [],
  })),
];

const baselineStart = withConstantRandom(0.6, () => generateGalaxy()[0]);
const warStart = withConstantRandom(0.6, () => generateGalaxy(RUN_PROFILES.war_spiral)[0]);
assert.equal(
  warStart.locations.filter((location) => location.type === "enemy").length,
  baselineStart.locations.filter((location) => location.type === "enemy").length,
  "war_spiral: start sector must keep baseline hostile locations",
);

const lostRoutesBlackHoleStart = withConstantRandom(
  0,
  () => generateGalaxy(RUN_PROFILES.broken_trade_lanes)[0],
);
assert.notEqual(
  lostRoutesBlackHoleStart.star.type,
  "blackhole",
  "broken_trade_lanes: the start sector must never be a black hole",
);
assert.ok(
  lostRoutesBlackHoleStart.locations.some(
    (location) => location.type === "station",
  ),
  "broken_trade_lanes: the start sector must provide refuelling",
);
assert.match(
  ru.run_profiles.broken_trade_lanes.risk,
  /Без инженера нельзя синтезировать топливо/,
  "broken_trade_lanes: the risk copy must explain the engineer dependency",
);
assert.match(
  en.run_profiles.broken_trade_lanes.risk,
  /Without an engineer, fuel cannot be synthesized/,
  "broken_trade_lanes: the risk copy must explain the engineer dependency",
);

for (const stationType of ["shipyard", "medical"]) {
  const sectors = makeTier1Anchors(stationType);
  ensureStationTypes(sectors, 1);
  ensureDiplomaticStation(sectors);
  assert.deepEqual(
    sectors.flatMap((sector) => sector.locations).map((location) => location.stationType).sort(),
    ["diplomatic", "medical", "military", "shipyard"],
    `broken_trade_lanes: ${stationType}-only anchors must provide all tier-1 services`,
  );
}

const duplicateShipyardAnchors = makeTier1Anchors("shipyard");
duplicateShipyardAnchors[2].locations[0].stationType = "diplomatic";
duplicateShipyardAnchors[3].locations[0].stationType = "diplomatic";
ensureStationTypes(duplicateShipyardAnchors, 1);
assert.deepEqual(
  duplicateShipyardAnchors
    .flatMap((sector) => sector.locations)
    .map((location) => location.stationType)
    .sort(),
  ["diplomatic", "medical", "military", "shipyard"],
  "tier 1: adding medical and military services must retain the only shipyard",
);

const tier4Services = makeTier4ServiceFixture();
ensureStationAnchors(tier4Services, { 4: 2 });
ensureStationTypes(tier4Services, 4);
assert.ok(
  hasStation(tier4Services, 4, "shipyard"),
  "tier 4: one eligible sector must retain a shipyard",
);
assert.ok(
  hasStation(tier4Services, 4, "medical"),
  "tier 4: one eligible sector must retain a medical station",
);

const pirateTier4Services = [
  {
    id: 39,
    tier: 4,
    star: { type: "red_dwarf", name: "star_types.red_dwarf" },
    locations: [
      {
        id: "39-pirate-a",
        stationId: "station-39-pirate-a",
        type: "station",
        stationType: "pirate",
        stationConfig: { isPirate: true },
        pirateHeat: 0,
        pirateContracts: [],
        pirateLastRefreshTurn: 0,
      },
      {
        id: "39-pirate-b",
        stationId: "station-39-pirate-b",
        type: "station",
        stationType: "pirate",
        stationConfig: { isPirate: true },
        pirateHeat: 0,
        pirateContracts: [],
        pirateLastRefreshTurn: 0,
      },
    ],
  },
  ...[40, 41].map((id) => ({
    id,
    tier: 4,
    star: { type: "blackhole", name: "star_types.blackhole" },
    locations: [],
  })),
];
ensureStationTypes(pirateTier4Services, 4);
assert.equal(
  pirateTier4Services[0].locations.filter(
    (location) => location.stationType === "pirate",
  ).length,
  2,
  "service guarantees must not convert pirate stations into regular stations",
);
assert.ok(
  hasStation(pirateTier4Services, 4, "shipyard"),
  "a pirate-only tier must still gain a shipyard",
);
assert.ok(
  hasStation(pirateTier4Services, 4, "medical"),
  "a pirate-only tier must still gain a medical station",
);

for (const profile of Object.values(RUN_PROFILES)) {
  for (let run = 0; run < 12; run += 1) {
    const sectors = generateGalaxy(profile);
    assert.ok(sectors[0]?.locations.length, `${profile.id}: the start must contain choices`);
    assert.ok(sectors.filter((sector) => sector.star.type === "blackhole").length >= 2);
    assert.equal(count(sectors, "boss") && sectors.flatMap((s) => s.locations).filter((l) => l.bossId === "void_oracle").length, 1);
    assert.equal(sectors.flatMap((s) => s.locations).filter((l) => l.bossId === "the_eternal").length, 1);
    for (const tier of [1, 2, 3]) {
      const bosses = normalTierBosses(sectors, tier);
      assert.equal(bosses.length, tier, `${profile.id}: normal boss count must grow from T1 to T3`);
      assert.ok(
        bosses.every((boss) => ANCIENT_BOSSES.find((definition) => definition.id === boss.bossId)?.tier === tier),
        `${profile.id}: every normal boss must match its sector tier`,
      );
      assert.equal(new Set(bosses.map((boss) => boss.bossId)).size, bosses.length);
    }
    for (const tier of [1, 2, 3, 4]) {
      assert.ok(hasStation(sectors, tier, "shipyard"), `${profile.id}: tier ${tier} needs repair`);
      assert.ok(hasStation(sectors, tier, "medical"), `${profile.id}: tier ${tier} needs healing`);
    }
    for (const tier of [1, 2, 3]) {
      if (profile.id === "ancient_echo") {
        const richSectors = sectors.filter((sector) => sector.tier === tier)
          .filter((sector) => sector.locations.filter((location) => location.type === "anomaly").length >= 3);
        assert.ok(richSectors.length >= 2, `ancient_echo: tier ${tier} needs two anomaly clusters`);
      }
      if (profile.id === "war_spiral") {
        const warfronts = sectors.filter((sector) => sector.tier === tier && sector.id !== 0)
          .filter((sector) => sector.locations.some((location) => location.type === "enemy"))
          .filter((sector) => sector.locations.filter((location) => location.type === "space_monster").length >= 2);
        assert.ok(warfronts.length >= 2, `war_spiral: tier ${tier} needs two warfronts`);
      }
      if (profile.id === "broken_trade_lanes") {
        for (const type of ["derelict_ship", "distress_signal", "wreck_field"]) {
          assert.ok(tierLocations(sectors, tier, type) >= 2, `broken_trade_lanes: tier ${tier} needs ${type}`);
        }
      }
    }

    if (profile.id === "broken_trade_lanes") {
      const expectedStations = { 1: 4, 2: 3, 3: 3, 4: 2 };
      for (const [tier, expected] of Object.entries(expectedStations)) {
        assert.ok(
          tierLocations(sectors, Number(tier), "station") >= expected,
          `${profile.id}: tier ${tier} needs at least ${expected} stations`,
        );
      }
    }
  }
}

const legacy = loadWithMigrations(JSON.stringify({ version: 17, state: {} }));
assert.equal(legacy?.runProfileId, null);
for (const profile of Object.values(RUN_PROFILES)) {
  assert.ok(generateGalaxy(profile).length, `${profile.id}: must generate a fresh galaxy`);
}

const galaxyMapSource = readFileSync(
  resolve(process.cwd(), "src/game/components/GalaxyMap.tsx"),
  "utf8",
);
const progressSource = readFileSync(
  resolve(process.cwd(), "src/game/components/CampaignProgressPanel.tsx"),
  "utf8",
);
const newGameSetupSource = readFileSync(
  resolve(process.cwd(), "src/game/components/NewGameSetupModal.tsx"),
  "utf8",
);

assert.ok(!galaxyMapSource.includes("getRunProfile"));
assert.ok(!galaxyMapSource.includes("runProfileId"));
assert.match(progressSource, /getRunProfile\(runProfileId\)/);
assert.match(progressSource, /t\(runProfile\.opportunityKey\)/);
assert.match(progressSource, /t\(runProfile\.riskKey\)/);
assert.match(progressSource, /runProfileArcTarget/);
assert.match(progressSource, /run_profile_arcs\.coordinates/);
assert.match(progressSource, /Object\.entries\(profileArcProgress\.profile\.arc\.reward\)/);
assert.equal(ru.run_profiles.label, "Сценарий галактики");
assert.equal(ru.run_profiles.random, "Случайный");
assert.equal(en.run_profiles.random, "Random");
assert.equal(ru.run_profiles.broken_trade_lanes.name, "Затерянные маршруты");
assert.equal(en.run_profiles.broken_trade_lanes.name, "Lost Routes");
assert.match(
  newGameSetupSource,
  /aria-label=\{t\("run_profiles\.label"\)\}/,
  "New game setup must offer an explicit galaxy scenario selection",
);
assert.equal(
  newGameSetupSource.match(/t\("run_profiles\.random"\)/g)?.length,
  1,
  "Random scenario must be one option in the selector, not a separate button",
);
assert.match(
  newGameSetupSource,
  /useState<RunProfileId \| null>\(null\)/,
  "Random scenario must stay unknown until the game starts",
);
assert.match(
  newGameSetupSource,
  /restartGame\(\s*selectedTemplateId,\s*selectedModifiers,\s*runProfileId \?\? pickRunProfileId\(\),\s*\)/,
  "Random scenario must be resolved only when the game starts",
);
assert.equal(
  /\{runProfile\s*&&\s*\(\s*<section/.test(newGameSetupSource),
  false,
  "Scenario selector must remain visible when the random scenario is unknown",
);
assert.equal(
  newGameSetupSource.includes("useLayoutEffect"),
  false,
  "Reopening the setup must not reroll the galaxy scenario",
);
assert.equal(ru.run_profile_arcs.label, "Зашифрованный след");
assert.equal(en.run_profile_arcs.label, "Encrypted Trail");
assert.equal(ru.run_profile_arcs.received, "Получено:");
assert.equal(en.run_profile_arcs.received, "Received:");
assert.equal(ru.run_profile_arcs.ancient_echo.title, "Эхо древних");
assert.equal(ru.run_profile_arcs.war_spiral.title, "Фронтовая сводка");
assert.equal(ru.run_profile_arcs.broken_trade_lanes.title, "Угасающий сигнал");
assert.equal(en.run_profile_arcs.ancient_echo.title, "Ancient Echo");
assert.equal(en.run_profile_arcs.war_spiral.title, "Frontline Dispatch");
assert.equal(en.run_profile_arcs.broken_trade_lanes.title, "Fading Signal");
assert.equal(ru.location_types.profile_signal, "Зашифрованные координаты");
assert.equal(en.location_types.profile_signal, "Encrypted Coordinates");

console.log("Run profile checks passed");
