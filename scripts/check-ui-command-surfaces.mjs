import assert from "node:assert/strict";
import { setUiState } from "./register-ui-loader.mjs";

/**
 * Checks the player-visible control order on the three action-dense screens.
 * A regression that removes the command deck or route card, restores the
 * station arrival summary, or puts combat actions after a long target list
 * must fail here even when the game actions themselves still work.
 */

const { createElement } = await import("react");
const { renderToStaticMarkup } = await import("react-dom/server");
const { STATION_CONFIG } = await import("../src/game/galaxy/config.ts");
const { store: i18nStore } = await import("../src/lib/useTranslation.ts");
const { CombatPanel } = await import("../src/game/components/CombatPanel.tsx");
const { StationPanel } = await import("../src/game/components/StationPanel.tsx");
const { EmptyPlanetPanel } = await import(
  "../src/game/components/EmptyPlanetPanel.tsx"
);

const noop = () => {};
const damage = {
  total: 8,
  kinetic: 0,
  laser: 8,
  missile: 0,
  plasma: 0,
  drones: 0,
  antimatter: 0,
  siege_torpedo: 0,
  quantum_torpedo: 0,
  ion_cannon: 0,
};

const combatMarkup = () => {
  setUiState({
    currentCombat: {
      round: 1,
      droneStacks: 0,
      enemy: {
        name: "Test raider",
        shields: 4,
        maxShields: 10,
        modules: [
          {
            id: 71,
            name: "Core",
            type: "weapon",
            health: 50,
            maxHealth: 50,
            defense: 0,
            damage: 0,
          },
        ],
      },
    },
    ship: {
      shields: 12,
      maxShields: 20,
      modules: [
        {
          id: 1,
          type: "weaponbay",
          health: 100,
          maxHealth: 100,
          weapons: [{ type: "laser", damage: 8 }],
        },
      ],
    },
    crew: [
      {
        id: 1,
        name: "Gunner",
        race: "human",
        profession: "gunner",
        moduleId: 1,
        health: 100,
        maxHealth: 100,
        level: 1,
        traits: [],
      },
    ],
    crewAutomation: { enabled: false },
    artifacts: [],
    galaxy: { sectors: [] },
    getTotalDamage: () => damage,
    selectEnemyModule: noop,
    attackEnemyWithBayTargets: () => null,
    skipTurn: () => null,
    retreat: () => null,
    moveCrewMember: noop,
    assignCombatTask: noop,
    isModuleAdjacent: () => false,
    addLog: noop,
  });
  return renderToStaticMarkup(createElement(CombatPanel));
};

const stationMarkup = () => {
  const station = {
    id: "arrival-station",
    stationId: "arrival-station",
    name: "Arrival relay",
    type: "station",
    stationType: "trade",
    stationConfig: STATION_CONFIG.trade,
  };
  const sector = {
    id: 1,
    tier: 1,
    star: { type: "red_dwarf", name: "star_types.red_dwarf" },
    locations: [station],
  };
  setUiState({
    currentLocation: station,
    currentSector: sector,
    credits: 420,
    wantedHeat: 0,
    pirateStanding: 0,
    assaultPirateBase: noop,
    ship: {
      fuel: 20,
      maxFuel: 100,
      cargo: [],
      tradeGoods: [],
      modules: [],
    },
    stationInventory: {},
    stationPrices: {},
    stationStock: {},
    raceReputation: {},
    buyItem: noop,
    repairShip: noop,
    healCrew: noop,
    cureMutation: noop,
    treatNegativeTrait: noop,
    research: { researchedTechs: [], resources: {}, unlockedRecipes: [] },
    scrapModule: noop,
    removeWeapon: noop,
    installModuleFromCargo: noop,
    installCraftedWeapon: noop,
    installAugmentation: noop,
    removeAugmentation: noop,
    getRepairCost: () => 0,
    getHealCost: () => 0,
    canRepairShip: () => false,
    canHealCrew: () => false,
    buyTradeGood: noop,
    sellTradeGood: noop,
    hireCrew: noop,
    refuel: noop,
    probes: 0,
    buyProbe: noop,
    activateResearchBoost: noop,
    activeCrisis: null,
    activeEffects: [],
    artifacts: [],
    galaxy: {
      nebulae: [],
      sectors: [
        sector,
        {
          id: 2,
          tier: 1,
          star: { type: "red_dwarf", name: "star_types.red_dwarf" },
          locations: [],
        },
      ],
    },
    stabilizeNebulaFront: noop,
    addLog: noop,
    getCrewCapacity: () => 5,
    getCargoCapacity: () => 10,
    crew: [],
    showSectorMap: noop,
    discoverRace: noop,
    knownRaces: [],
    discoverStationType: noop,
    discoverWeaponTypes: noop,
    discoveredStationTypes: ["trade"],
    bannedPlanets: [],
    emergencyFuelStationIds: [],
    sendDiplomaticGift: noop,
    removePlanetBan: noop,
    hireTranslator: noop,
    diplomaticTranslatorRaceIds: [],
    activeContracts: [],
    completedContractIds: [],
    turn: 1,
    completeDeliveryContract: noop,
    hiredCrew: {},
    acceptPirateContract: noop,
    performPirateContractObjective: noop,
    completePirateContract: noop,
    reducePirateHeat: noop,
    refreshPirateStationContracts: noop,
    saveGame: noop,
  });
  return renderToStaticMarkup(createElement(StationPanel));
};

const planetMarkup = () => {
  setUiState({
    currentLocation: {
      id: "route-planet",
      name: "Route test",
      type: "planet",
      isEmpty: true,
      scoutedTimes: 0,
      orbitalScanned: false,
      explored: false,
    },
    crew: [
      {
        id: 2,
        name: "Scout",
        profession: "scout",
        health: 100,
        maxHealth: 100,
        level: 1,
        traits: [],
      },
    ],
    ship: {
      modules: [
        { id: 3, type: "scanner", health: 100, maxHealth: 100 },
      ],
    },
    research: { researchedTechs: ["expedition_kits"], resources: {} },
    galaxy: { sectors: [] },
    outposts: [],
    sendScoutingMission: noop,
    planetaryDrill: noop,
    atmosphericAnalysis: noop,
    orbitalScan: noop,
    resolveScoutEvent: () => null,
    pendingScoutEvent: null,
    turn: 1,
    showSectorMap: noop,
  });
  return renderToStaticMarkup(createElement(EmptyPlanetPanel));
};

const combat = combatMarkup();
const commandTitle = i18nStore.t("combat.command_title");
const targetingTitle = i18nStore.t("combat.targeting_single");
assert.ok(combat.includes(commandTitle), "combat must expose a command deck");
assert.ok(combat.includes(targetingTitle), "combat must name bay targeting");
assert.ok(
  combat.indexOf(i18nStore.t("combat.attack")) < combat.indexOf(targetingTitle),
  "combat actions must stay ahead of a long target list",
);

const station = stationMarkup();
const arrivalTitle = i18nStore.t("station.arrival_summary");
assert.ok(
  !station.includes(arrivalTitle),
  "station must move directly from its header to navigation without an arrival summary",
);

const planet = planetMarkup();
const routeTitle = i18nStore.t("planet_panel.route_title");
const routeLabels = [
  i18nStore.t("planet_panel.route_orbit"),
  i18nStore.t("planet_panel.route_surface"),
  i18nStore.t("planet_panel.route_finding"),
];
assert.ok(planet.includes(routeTitle), "empty planet must show the action route");
for (const label of routeLabels) {
  assert.ok(planet.includes(label), `route must include ${label}`);
}
assert.ok(
  routeLabels.every((label, index) =>
    index === 0 || planet.indexOf(routeLabels[index - 1]) < planet.indexOf(label),
  ),
  "route must stay ordered from orbit to surface to finding",
);
assert.ok(
  planet.includes(
    i18nStore.t("planet_panel.route_next", {
      action: i18nStore.t("planet_panel.orbital_scan"),
    }),
  ),
  "the first available action must be promoted in the route",
);

console.log("UI command-surface checks passed");
