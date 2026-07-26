import { CURRENT_STATE_VERSION } from "@/game/constants/version";
import { RESEARCH_TREE } from "@/game/constants/research";
import { getArchiveHintLocations } from "@/game/artifacts/utils";
import { isContractTargetAvailable } from "@/game/contracts/targetAvailability";
import { generateSpaceMonster } from "@/game/galaxy/generate";
import { assignGridPositions } from "@/game/sectorGrid";
import { MODULE_HEALTH_BY_LEVEL } from "@/game/slices/shop/constants";
import { AUGMENTATIONS } from "@/game/constants/augmentations";
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
    const state = raw as GameState;
    const scannerRanges = { 1: 3, 2: 5, 3: 8 } as const;
    return {
      ...state,
      stateVersion: 11,
      ship: {
        ...state.ship,
        modules: state.ship.modules.map((module) => {
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
