import type { GameStore, CrewMember, SetState } from "@/game/types";
import { playSound } from "@/sounds";
import {
    CURSE_REMOVAL_MIN_SCIENTIST_LEVEL,
    CURSE_REMOVAL_DAMAGE,
} from "../constants";

/**
 * Активирует или деактивирует артефакт
 *
 * @param artifactId - ID артефакта для переключения
 * @param state - Текущее состояние игры
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @returns void
 */
export const toggleArtifact = (
    artifactId: string,
    state: GameStore,
    set: SetState,
    get: () => GameStore,
): void => {
    const artifact = state.artifacts.find((a) => a.id === artifactId);

    if (!artifact || !artifact.researched) return;

    const newActive = !artifact.effect.active;

    // Проверка: если артефакт проклят и пытаемся деактивировать
    if (!newActive && artifact.cursed) {
        const scientist = findQualifiedScientist(state.crew);

        if (!scientist) {
            get().addLog(
                "⚠️ Нельзя отключить проклятый артефакт без учёного 3+ уровня!",
                "error",
            );
            playSound("error");
            return;
        }

        // Наносим урон учёному
        damageScientist(scientist.id, set, get);
    }

    // Переключаем состояние артефакта
    set((s) => ({
        artifacts: s.artifacts.map((a) =>
            a.id === artifactId
                ? {
                      ...a,
                      effect: { ...a.effect, active: newActive },
                  }
                : a,
        ),
    }));

    get().addLog(
        `${artifact.name}: ${newActive ? "активирован" : "деактивирован"}`,
        "info",
    );
    playSound(newActive ? "artifact" : "error");
    get().updateShipStats();
};

/**
 * Находит учёного достаточного уровня для снятия проклятия
 *
 * @param crew - Список экипажа
 * @returns Учёный или undefined
 */
const findQualifiedScientist = (crew: CrewMember[]): CrewMember | undefined => {
    return crew.find(
        (c) =>
            c.profession === "scientist" &&
            c.level >= CURSE_REMOVAL_MIN_SCIENTIST_LEVEL,
    );
};

/**
 * Наносит урон учёному при снятии проклятия
 *
 * @param scientistId - ID учёного
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
const damageScientist = (
    scientistId: number,
    set: SetState,
    get: () => GameStore,
): void => {
    set((s) => ({
        crew: s.crew.map((c) =>
            c.id === scientistId
                ? { ...c, health: Math.max(1, c.health - CURSE_REMOVAL_DAMAGE) }
                : c,
        ),
    }));

    const scientist = get().crew.find((c) => c.id === scientistId);
    if (scientist) {
        get().addLog(
            `⚠️ ${scientist.name} пострадал от проклятия! -${CURSE_REMOVAL_DAMAGE} здоровья`,
            "warning",
        );
    }
};
