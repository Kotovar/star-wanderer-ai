import { CURRENT_STATE_VERSION } from "@/game/constants/version";
import { RESEARCH_TREE } from "@/game/constants/research";
import { getArchiveHintLocations } from "@/game/artifacts/utils";
import { isContractTargetAvailable } from "@/game/contracts/targetAvailability";
import { generateSpaceMonster } from "@/game/galaxy/generate";
import { assignGridPositions } from "@/game/sectorGrid";
import { MODULE_HEALTH_BY_LEVEL } from "@/game/slices/shop/constants";
import { AUGMENTATIONS } from "@/game/constants/augmentations";
import { DEFAULT_AUDIO_VOLUMES } from "@/sounds";
import { hydrateNavigatorIntelFromLegacyState } from "@/game/navigator/intel";
import { hasCombatArmament } from "@/game/contracts/frontierContracts";
import { PRE_SPACEFARING_CIVILIZATIONS } from "@/game/constants/preSpacefaringCivilizations";
import { PIRATE_CONTRACT_REFRESH_INTERVAL } from "@/game/slices/pirate/contracts";
import type { GameState, Location, Sector } from "@/game/types";

interface PersistedState {
  version: number;
  state: unknown;
}

/** Тип миграции: принимает сырой объект, возвращает мигрированный */
type Migration = (state: unknown) => unknown;

/** Реестр миграций. Ключ — версия, с которой мигрируем (откуда). */
const migrations: Record<number, Migration> = {
  // Пример: 0 -> 1 (старые сохранения без stateVersion)
  0: (raw) => {
    const state = raw as Record<string, unknown>;
    return {
      ...state,
      stateVersion: 1,
    };
  },
  1: (raw) => {
    const state = raw as Record<string, unknown>;
    const activeCrisis = state.activeCrisis as { id?: unknown } | null;
    return {
      ...state,
      discoveredCrisisIds:
        typeof activeCrisis?.id === "string" ? [activeCrisis.id] : [],
    };
  },
  2: (raw) => {
    const state = raw as GameState;
    const addMonster = (sector: Sector): Sector => {
      if (sector.locations.some((location) => location.type === "space_monster")) {
        return sector;
      }

      const locations = [
        ...sector.locations,
        generateSpaceMonster(sector.id, sector.tier, sector.star.type),
      ];
      assignGridPositions(locations, true);
      return { ...sector, locations };
    };
    const sectors = state.galaxy.sectors.map(addMonster);
    const currentSector = state.currentSector
      ? (sectors.find((sector) => sector.id === state.currentSector?.id) ??
        addMonster(state.currentSector))
      : null;

    return {
      ...state,
      stateVersion: 3,
      galaxy: { ...state.galaxy, sectors },
      currentSector,
    };
  },
  3: (raw) => {
    const state = raw as GameState;
    const legacyPactIds = new Set<string>();
    const restoreMonster = (location: Location): Location => {
      if (
        location.type !== "space_monster" ||
        location.spaceMonsterResolved !== "pact"
      ) {
        return location;
      }

      legacyPactIds.add(location.id);
      const activeMonster = { ...location };
      delete activeMonster.spaceMonsterResolved;
      return activeMonster;
    };
    const sectors = state.galaxy.sectors.map((sector) => ({
      ...sector,
      locations: sector.locations.map(restoreMonster),
    }));
    const currentSector = state.currentSector
      ? (sectors.find((sector) => sector.id === state.currentSector?.id) ?? {
          ...state.currentSector,
          locations: state.currentSector.locations.map(restoreMonster),
        })
      : null;

    return {
      ...state,
      stateVersion: 4,
      galaxy: { ...state.galaxy, sectors },
      currentSector,
      currentLocation: state.currentLocation
        ? restoreMonster(state.currentLocation)
        : null,
      completedLocations: state.completedLocations.filter(
        (id) => !legacyPactIds.has(id),
      ),
    };
  },
  4: (raw) => {
    const state = raw as Record<string, unknown>;
    return {
      ...state,
      stateVersion: 5,
      completedVictoryObjectiveIds: [],
    };
  },
  5: (raw) => {
    const state = raw as GameState;
    const locations = getArchiveHintLocations(
      state.galaxy.sectors,
      state.currentSector?.id,
    );
    let index = 0;

    return {
      ...state,
      stateVersion: 6,
      artifacts: state.artifacts.map((artifact) => {
        if (
          !artifact.hinted ||
          artifact.discovered ||
          artifact.hintSource !== "archives"
        ) {
          return artifact;
        }

        const hintedAt = locations[index++];
        return hintedAt ? { ...artifact, hintedAt } : artifact;
      }),
    };
  },
  6: (raw) => {
    const state = raw as GameState;
    const expedition = state.activeExpedition;
    if (!expedition) return { ...state, stateVersion: 7 };

    const revealedCount = expedition.grid.filter((tile) => tile.revealed).length;
    return {
      ...state,
      stateVersion: 7,
      activeExpedition: { ...expedition, revealedCount },
      activeContracts: state.activeContracts.map((contract) => {
        if (
          contract.type !== "expedition_survey" ||
          contract.targetPlanetId !== expedition.planetId
        ) {
          return contract;
        }

        return {
          ...contract,
          tilesRevealed: revealedCount,
          expeditionDone:
            revealedCount >= (contract.requiredDiscoveries ?? 1),
        };
      }),
    };
  },
  7: (raw) => {
    const state = raw as Partial<GameState>;
    const sectors = state.galaxy?.sectors;
    if (!sectors || !state.activeContracts) {
      return { ...state, stateVersion: 8 };
    }

    return {
      ...state,
      stateVersion: 8,
      activeContracts: state.activeContracts.filter((contract) =>
        isContractTargetAvailable(
          contract,
          sectors,
          state.completedLocations ?? [],
          {
            artifacts: state.artifacts ?? [],
            researchedTechs: state.research?.researchedTechs ?? [],
          },
        ),
      ),
    };
  },
  8: (raw) => {
    const state = raw as Record<string, unknown>;
    return {
      ...state,
      stateVersion: 9,
      discoveredEnemyCodexIds: [],
    };
  },
  9: (raw) => {
    const state = raw as Partial<GameState>;
    const visitedStationTypes = new Set(
      [
        ...(state.galaxy?.sectors ?? []).flatMap((sector) => sector.locations),
        ...(state.currentSector?.locations ?? []),
        ...(state.currentLocation ? [state.currentLocation] : []),
      ].flatMap((location) =>
        location.type === "station" && location.visited && location.stationType
          ? [location.stationType]
          : [],
      ),
    );
    return {
      ...state,
      stateVersion: 10,
      discoveredStationTypes: [...visitedStationTypes],
    };
  },
  10: (raw) => {
    const state = raw as Partial<GameState>;
    const ship = state.ship;
    if (!ship) return { ...state, stateVersion: 11 };

    const scannerRanges = { 1: 3, 2: 5, 3: 8 } as const;
    return {
      ...state,
      stateVersion: 11,
      ship: {
        ...ship,
        modules: ship.modules.map((module) => {
          const scanRange =
            module.type === "scanner"
              ? scannerRanges[module.level as 1 | 2 | 3]
              : undefined;
          return scanRange ? { ...module, scanRange } : module;
        }),
      },
    };
  },
  11: (raw) => {
    const state = raw as Partial<GameState>;
    const researchedTechs = state.research?.researchedTechs ?? [];
    const modules = state.ship?.modules;
    if (!modules || researchedTechs.length === 0) {
      return { ...state, stateVersion: 12 };
    }

    return {
      ...state,
      stateVersion: 12,
      ship: {
        ...state.ship,
        modules: modules.map((module) => {
          const baseHealth = MODULE_HEALTH_BY_LEVEL[module.level ?? 1];
          if (!baseHealth || module.maxHealth !== baseHealth) return module;

          let maxHealth = baseHealth;
          for (const techId of researchedTechs) {
            for (const bonus of RESEARCH_TREE[techId]?.bonuses ?? []) {
              if (bonus.type === "module_health" && bonus.value > 0) {
                maxHealth = Math.floor(maxHealth * (1 + bonus.value));
              }
            }
          }

          return { ...module, maxHealth, health: maxHealth };
        }),
      },
    };
  },
  12: (raw) => {
    const state = raw as Partial<GameState>;
    const installedAugmentations = (state.crew ?? []).flatMap((crewMember) =>
      crewMember.augmentation && AUGMENTATIONS[crewMember.augmentation]
        ? [crewMember.augmentation]
        : [],
    );
    return {
      ...state,
      stateVersion: 13,
      discoveredAugmentationIds: [
        ...new Set([
          ...(state.discoveredAugmentationIds ?? []),
          ...installedAugmentations,
        ]),
      ],
    };
  },
  13: (raw) => {
    const state = raw as Partial<GameState>;
    const equippedWeaponTypes = (state.ship?.modules ?? []).flatMap(
      (module) => module.weapons?.flatMap((w) => (w ? [w.type] : [])) ?? [],
    );
    // Оружие, уже разблокированное исследованными технологиями (та же карта,
    // что и в processResearch.ts — на старых сохранениях это не могло сработать вживую).
    const WEAPON_TECH_MAP: Record<string, string> = {
      plasma_weapons: "plasma",
      combat_drones: "drones",
      antimatter_weapons: "antimatter",
      quantum_torpedo: "quantum_torpedo",
      ion_cannon: "ion_cannon",
    };
    const researchedWeaponTypes = (
      state.research?.researchedTechs ?? []
    ).flatMap((techId) => (WEAPON_TECH_MAP[techId] ? [WEAPON_TECH_MAP[techId]] : []));
    return {
      ...state,
      stateVersion: 14,
      discoveredWeaponTypes: [
        ...new Set([
          ...(state.discoveredWeaponTypes ?? []),
          ...equippedWeaponTypes,
          ...researchedWeaponTypes,
        ]),
      ],
    };
  },
  14: (raw) => {
    const state = raw as Partial<GameState>;
    const settings = state.settings;
    return {
      ...state,
      stateVersion: 15,
      settings: {
        animationsEnabled: settings?.animationsEnabled ?? true,
        soundEnabled: settings?.soundEnabled ?? true,
        master: settings?.master ?? DEFAULT_AUDIO_VOLUMES.master,
        music: settings?.music ?? DEFAULT_AUDIO_VOLUMES.music,
        sfx: settings?.sfx ?? DEFAULT_AUDIO_VOLUMES.sfx,
        ui: settings?.ui ?? DEFAULT_AUDIO_VOLUMES.ui,
      },
    };
  },
  15: (raw) => {
    const state = raw as Partial<GameState>;
    // Старый (уже исправленный) баг мог оставить у части экипажа дробные
    // health/maxHealth — каждая текущая мутация здоровья целочисленная
    // (Math.floor/round), так что дробь сама по себе никогда не появится
    // заново, но уже сохранённая дробь и дальше складывалась бы/вычиталась
    // с целыми числами вечно. Округляем один раз при загрузке.
    return {
      ...state,
      stateVersion: 16,
      crew: (state.crew ?? []).map((c) => ({
        ...c,
        health: Math.round(c.health),
        maxHealth: Math.round(c.maxHealth),
      })),
    };
  },
  16: (raw) => {
    const state = raw as Partial<GameState>;
    const legacySettings = state.settings as
      | (Partial<GameState["settings"]> & { fastCombat?: boolean })
      | undefined;
    return {
      ...state,
      stateVersion: 17,
      settings: {
        ...(legacySettings ?? {}),
        // Historical migration output; the current settings normalizer drops this retired field.
        fastCombat: legacySettings?.fastCombat ?? false,
      },
    };
  },
  17: (raw) => ({
    ...(raw as GameState),
    stateVersion: 18,
    runProfileId: null,
  }),
  18: (raw) => ({
    ...(raw as GameState),
    stateVersion: 19,
    runProfileArcRewardClaimed: false,
  }),
  19: (raw) => ({
    ...(raw as GameState),
    stateVersion: 20,
    runProfileArcTarget: null,
  }),
  20: (raw) => {
    const state = raw as GameState;
    return {
      ...state,
      stateVersion: 21,
      galaxy: { ...state.galaxy, nebulae: state.galaxy?.nebulae ?? [] },
    };
  },
  21: (raw) => {
    const state = raw as GameState;
    return {
      ...state,
      stateVersion: 22,
      ...hydrateNavigatorIntelFromLegacyState(state),
    };
  },
  22: (raw) => ({
    ...(raw as GameState),
    stateVersion: 23,
    crewAutomation: { enabled: false, memory: {} },
  }),

  // Аванпосты: до 24-й версии полей не было, и чтение их на загрузке роняло игру
  23: (raw) => ({
    ...(raw as GameState),
    stateVersion: 24,
    outposts: [],
    gases: {},
  }),
  24: (raw) => {
    const state = raw as GameState;
    const armed = hasCombatArmament(state.ship?.modules ?? []);
    return {
      ...state,
      stateVersion: 25,
      frontierContractsCompleted: 0,
      frontierChainClosed: armed,
      frontierCombatOffersSeeded: armed,
      frontierSubsidy: null,
    };
  },
  25: (raw) => ({
    ...(raw as GameState),
    stateVersion: 26,
    pendingContractDecision: null,
  }),
  26: (raw) => {
    const state = raw as GameState;
    const withTemperament = (location: Location) => {
      const contact = location.preSpacefaringContact;
      if (!contact) return location;
      const civilization = PRE_SPACEFARING_CIVILIZATIONS.find(
        (entry) => entry.id === contact.civilizationId,
      );
      if (!civilization) {
        const cleaned = { ...location };
        delete cleaned.preSpacefaringContact;
        return cleaned;
      }
      return {
        ...location,
        preSpacefaringContact: {
          ...contact,
          temperament: civilization.temperament,
          // IDs from v26 belong to the retired action table and cannot be
          // replayed as temperament actions. Keep the history unavailable.
          actionHistory: undefined,
        },
      };
    };
    const sectors = (state.galaxy?.sectors ?? []).map((sector) => ({
      ...sector,
      locations: sector.locations.map(withTemperament),
    }));
    return {
      ...state,
      stateVersion: 27,
      galaxy: { ...state.galaxy, sectors },
      currentSector: state.currentSector
        ? (sectors.find((sector) => sector.id === state.currentSector?.id) ?? {
            ...state.currentSector,
            locations: state.currentSector.locations.map(withTemperament),
          })
        : null,
      currentLocation: state.currentLocation
        ? withTemperament(state.currentLocation)
        : null,
    };
  },
  27: (raw) => {
    const state = raw as Partial<GameState>;
    const isLegacyPirateContract = (type: string): boolean =>
      type === "pirate_smuggling" ||
      type === "pirate_bounty" ||
      type === "pirate_heist";
    const clearLegacyPirateBoard = (location: Location): Location => {
      if (!location.stationConfig?.isPirate) return location;
      return {
        ...location,
        pirateContracts: [],
        pirateLastRefreshTurn:
          (state.turn ?? 0) - PIRATE_CONTRACT_REFRESH_INTERVAL,
      };
    };
    const clearLegacyPirateBoards = (sector: Sector): Sector => ({
      ...sector,
      locations: sector.locations.map(clearLegacyPirateBoard),
    });
    const legacyHeat = [
      state.wantedHeat,
      state.currentLocation?.pirateHeat,
      ...(state.currentSector?.locations ?? []).map(
        (location) => location.pirateHeat,
      ),
      ...(state.galaxy?.sectors ?? []).flatMap((sector) =>
        sector.locations.map((location) => location.pirateHeat),
      ),
    ].filter((heat): heat is number => typeof heat === "number");
    const sectors = (state.galaxy?.sectors ?? []).map(clearLegacyPirateBoards);
    const currentSector = state.currentSector
      ? (sectors.find((sector) => sector.id === state.currentSector?.id) ??
        clearLegacyPirateBoards(state.currentSector))
      : null;
    const currentLocation = state.currentLocation
      ? (sectors
          .flatMap((sector) => sector.locations)
          .find((location) => location.id === state.currentLocation?.id) ??
        clearLegacyPirateBoard(state.currentLocation))
      : null;

    return {
      ...state,
      stateVersion: 28,
      wantedHeat: Math.min(100, Math.max(0, ...legacyHeat)),
      activeContracts: state.activeContracts?.filter(
        (contract) => !isLegacyPirateContract(contract.type),
      ),
      galaxy: state.galaxy ? { ...state.galaxy, sectors } : state.galaxy,
      currentSector,
      currentLocation,
    };
  },
  28: (raw) => {
    const state = raw as Partial<GameState>;
    const retimeEmptyPirateBoard = (location: Location): Location => {
      if (
        !location.stationConfig?.isPirate ||
        (location.pirateContracts?.length ?? 0) > 0
      ) {
        return location;
      }
      return {
        ...location,
        pirateLastRefreshTurn:
          (state.turn ?? 0) - PIRATE_CONTRACT_REFRESH_INTERVAL,
      };
    };
    const retimeEmptyPirateBoards = (sector: Sector): Sector => ({
      ...sector,
      locations: sector.locations.map(retimeEmptyPirateBoard),
    });
    const sectors = (state.galaxy?.sectors ?? []).map(retimeEmptyPirateBoards);
    const currentSector = state.currentSector
      ? (sectors.find((sector) => sector.id === state.currentSector?.id) ??
        retimeEmptyPirateBoards(state.currentSector))
      : null;
    const currentLocation = state.currentLocation
      ? (sectors
          .flatMap((sector) => sector.locations)
          .find((location) => location.id === state.currentLocation?.id) ??
        retimeEmptyPirateBoard(state.currentLocation))
      : null;

    return {
      ...state,
      stateVersion: 29,
      galaxy: state.galaxy ? { ...state.galaxy, sectors } : state.galaxy,
      currentSector,
      currentLocation,
    };
  },
};

/**
 * Применяет цепочку миграций от текущей версии сохранения до целевой.
 * Если версия сохранения >= целевой — возвращает как есть.
 */
function runMigrations(
  persisted: PersistedState,
  targetVersion: number = CURRENT_STATE_VERSION,
): unknown {
  let current = persisted.version;
  let state = persisted.state;

  while (current < targetVersion) {
    const migration = migrations[current];
    if (!migration) {
      console.warn(`[Save] No migration found from version ${current} to ${current + 1}. Aborting.`);
      break;
    }
    state = migration(state);
    current++;
  }

  return state;
}

/**
 * Парсит сырые данные из localStorage, применяет миграции и возвращает GameState.
 * Возвращает null если данные повреждены или версия несовместима.
 */
export function loadWithMigrations(raw: string): GameState | null {
  try {
    const parsed = JSON.parse(raw) as unknown;

    // Новый формат: { version, state }
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed &&
      "state" in parsed
    ) {
      const persisted = parsed as PersistedState;
      if (typeof persisted.version !== "number" || persisted.version < 0) {
        console.error("[Save] Invalid persisted version:", persisted.version);
        return null;
      }

      if (persisted.version > CURRENT_STATE_VERSION) {
        console.error(
          `[Save] Save version ${persisted.version} is newer than app version ${CURRENT_STATE_VERSION}. Cannot load.`
        );
        return null;
      }

      const migrated = runMigrations(persisted);
      return migrated as GameState;
    }

    // Legacy формат: прямой GameState без обёртки (до введения версионирования)
    if (typeof parsed === "object" && parsed !== null) {
      const migrated = runMigrations({ version: 0, state: parsed });
      return migrated as GameState;
    }

    console.error("[Save] Unrecognized save format");
    return null;
  } catch (e) {
    console.error("[Save] Failed to parse save:", e);
    return null;
  }
}

/**
 * Сериализует GameState в строку с версией.
 */
export function serializeWithVersion(state: GameState): string {
  const persisted: PersistedState = {
    version: CURRENT_STATE_VERSION,
    state,
  };
  return JSON.stringify(persisted);
}
