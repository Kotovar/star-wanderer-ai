import type {
    Artifact,
    CrewMember,
    GameStore,
    Module,
    SetState,
} from "@/game/types";
import { findActiveArtifact } from "@/game/artifacts";
import { ARTIFACT_TYPES } from "@/game/constants";

/**
 * Проверяет, есть ли у игрока активный ИИ-артефакт
 * @param artifacts - Список артефактов игрока
 * @returns true, если активный ИИ-артефакт найден
 */
const hasActiveAIArtifact = (artifacts: Artifact[]) =>
    findActiveArtifact(artifacts, ARTIFACT_TYPES.AI_NEURAL_LINK);

/**
 * Проверяет, есть ли у игрока рабочий ИИ-модуль
 * @param modules - Список модулей корабля
 * @returns true, если ИИ-модуль найден и исправен
 */
const hasFunctionalAIModule = (modules: Module[]) =>
    modules.some((m) => m.type === "ai_core" && m.health > 0);

/**
 * Проверяет, может ли корабль функционировать без экипажа
 * @param artifacts - Список артефактов игрока
 * @param modules - Список модулей корабля
 * @returns true, если корабль может работать без экипажа
 */
const canShipOperateWithoutCrew = (artifacts: Artifact[], modules: Module[]) =>
    !!hasActiveAIArtifact(artifacts) || hasFunctionalAIModule(modules);

/**
 * Проверяет, разрушен ли корпус корабля (все модули имеют 0 здоровья)
 * @param modules - Список модулей корабля
 * @returns true, если корпус разрушен
 */
const isHullDestroyed = (modules: Module[]) => {
    const totalHullHealth = modules.reduce((sum, m) => sum + m.health, 0);
    return totalHullHealth <= 0;
};

/**
 * Проверяет, погиб ли весь экипаж
 * @param crew - Список членов экипажа
 * @returns true, если экипаж пуст
 */
const isCrewDead = (crew: CrewMember[]) => crew.length === 0;

/**
 * Проверяет условия проигрыша в игре
 * @param set - Функция обновления состояния
 * @param get - Функция получения текущего состояния
 */
export const checkGameOver = (set: SetState, get: () => GameStore): void => {
    const state = get();

    if (state.gameOver) {
        return;
    }

    const hasAI = canShipOperateWithoutCrew(
        state.artifacts,
        state.ship.modules,
    );

    // Проверка разрушения корпуса
    if (isHullDestroyed(state.ship.modules)) {
        set({
            gameOver: true,
            gameOverReason:
                "💥 Корпус корабля разрушен! Все модули уничтожены. Корабль не может продолжать полёт.",
        });
        get().addLog("ИГРА ОКОНЧЕНА: Корпус разрушен", "error");
        return;
    }

    // Проверка гибели экипажа (без возможности работы без экипажа)
    if (isCrewDead(state.crew) && !hasAI) {
        let reason =
            "☠️ Весь экипаж погиб! Корабль не может функционировать без экипажа.";

        if (
            !hasActiveAIArtifact(state.artifacts) &&
            !hasFunctionalAIModule(state.ship.modules)
        ) {
            reason +=
                " Нет ИИ Ядра (артефакта или модуля) для управления без экипажа.";
        }

        set({
            gameOver: true,
            gameOverReason: reason,
        });
        get().addLog("ИГРА ОКОНЧЕНА: Корабль без экипажа", "error");
        return;
    }
};
