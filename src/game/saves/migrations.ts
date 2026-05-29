import { CURRENT_STATE_VERSION } from "@/game/constants/version";
import type { GameState } from "@/game/types";

export interface PersistedState {
  version: number;
  state: unknown;
}

/** Тип миграции: принимает сырой объект, возвращает мигрированный */
export type Migration = (state: unknown) => unknown;

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
};

/**
 * Применяет цепочку миграций от текущей версии сохранения до целевой.
 * Если версия сохранения >= целевой — возвращает как есть.
 */
export function runMigrations(
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
