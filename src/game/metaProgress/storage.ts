// Относительный путь (не "@/…") — этот модуль грузится напрямую в чистом
// Node-скрипте (scripts/check-meta-progress.mjs) без бандлера/резолвера
// путей, а тот понимает только относительные импорты.
import { SHIP_TEMPLATES } from "../constants/shipTemplates.ts";
import { ACHIEVEMENT_IDS } from "./achievements.ts";
import type { MetaProgressState } from "./types";

export const CURRENT_META_VERSION = 1;

const META_PROGRESS_STORAGE_KEY = "star-wanderer-meta-progress";

// ponytail: не импортируем GLOBAL_CRISES из "@/game/constants/globalCrises" —
// этот модуль тянет RACES/TRADE_GOODS и не грузится в чистом Node-скрипте
// без бандлера (см. scripts/check-meta-progress.mjs, который эту функцию
// проверяет напрямую). Список id короткий и меняется только вместе с
// добавлением нового типа глобального кризиса — обновить вручную при
// добавлении/переименовании кризиса в globalCrises.ts.
const KNOWN_CRISIS_IDS = new Set([
  "raider_wave",
  "solar_flare",
  "epidemic",
  "fuel_shortage",
  "nebula_front",
]);
const KNOWN_SHIP_IDS = new Set(SHIP_TEMPLATES.map((t) => t.id));

interface PersistedMetaProgress {
  version: number;
  state: unknown;
}

export function emptyMetaProgress(): MetaProgressState {
  return {
    metaVersion: CURRENT_META_VERSION,
    runsCompleted: 0,
    wins: 0,
    losses: 0,
    bossesDefeated: 0,
    contractsCompleted: 0,
    legendaryOrMythicArtifactsDiscovered: 0,
    discoveredCrisisIds: [],
    winsWithSectors15Plus: 0,
    runsWithCredits3000Plus: 0,
    winsWithHostileRep: 0,
    unlockedAchievementIds: [],
    unlockedShipIds: [],
    lastRecordedRunId: null,
  };
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function strArray(value: unknown): string[] {
  return Array.isArray(value)
    ? Array.from(
        new Set(value.filter((v): v is string => typeof v === "string")),
      )
    : [];
}

/**
 * Нормализует сырые данные из localStorage: подставляет дефолты на
 * мусорном/частичном input, убирает дубликаты, отфильтровывает id,
 * которых больше нет в текущих таблицах (переименование/удаление контента
 * между версиями игры).
 */
export function normalizeMetaProgress(raw: unknown): MetaProgressState {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<
    Record<keyof MetaProgressState, unknown>
  >;

  return {
    metaVersion: CURRENT_META_VERSION,
    runsCompleted: num(r.runsCompleted),
    wins: num(r.wins),
    losses: num(r.losses),
    bossesDefeated: num(r.bossesDefeated),
    contractsCompleted: num(r.contractsCompleted),
    legendaryOrMythicArtifactsDiscovered: num(
      r.legendaryOrMythicArtifactsDiscovered,
    ),
    discoveredCrisisIds: strArray(r.discoveredCrisisIds).filter((id) =>
      KNOWN_CRISIS_IDS.has(id),
    ),
    winsWithSectors15Plus: num(r.winsWithSectors15Plus),
    runsWithCredits3000Plus: num(r.runsWithCredits3000Plus),
    winsWithHostileRep: num(r.winsWithHostileRep),
    unlockedAchievementIds: strArray(r.unlockedAchievementIds).filter((id) =>
      ACHIEVEMENT_IDS.has(id),
    ),
    unlockedShipIds: strArray(r.unlockedShipIds).filter((id) =>
      KNOWN_SHIP_IDS.has(id),
    ),
    lastRecordedRunId:
      typeof r.lastRecordedRunId === "string" ? r.lastRecordedRunId : null,
  };
}

export function loadMetaProgress(): MetaProgressState {
  if (typeof window === "undefined") return emptyMetaProgress();
  try {
    const raw = localStorage.getItem(META_PROGRESS_STORAGE_KEY);
    if (!raw) return emptyMetaProgress();
    const parsed = JSON.parse(raw) as PersistedMetaProgress;
    // Версия пока всего одна — миграции добавятся сюда по мере роста
    // metaVersion, по тому же паттерну, что src/game/saves/migrations.ts.
    return normalizeMetaProgress(parsed.state);
  } catch (e) {
    console.error("[MetaProgress] Failed to load, resetting:", e);
    return emptyMetaProgress();
  }
}

export function saveMetaProgress(state: MetaProgressState): void {
  if (typeof window === "undefined") return;
  try {
    const persisted: PersistedMetaProgress = {
      version: CURRENT_META_VERSION,
      state,
    };
    localStorage.setItem(
      META_PROGRESS_STORAGE_KEY,
      JSON.stringify(persisted),
    );
  } catch (e) {
    console.error("[MetaProgress] Failed to save:", e);
  }
}
