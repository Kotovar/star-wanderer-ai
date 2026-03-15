import type { GameStore, SetState, RaceId } from "@/game/types";
import { applyPlanetEffect } from "./helpers/applyEffect";
import { removeExpiredEffects as removeExpiredEffectsHelper } from "./helpers/removeEffect";
import { trainCrewMember } from "./helpers/trainCrew";
import { scanSector as scanSectorHelper } from "./helpers/scanSector";
import { playSound } from "@/sounds";

/**
 * Интерфейс PlanetEffectsSlice
 * Содержит методы для управления эффектами планет (активация, снятие, кулдауны)
 */
export interface PlanetEffectsSlice {
    /**
     * Активирует эффект доминирующей расы на планете
     * @param raceId - ID расы, чей эффект активируется
     * @param planetId - Опциональный ID планеты (для установки кулдауна)
     */
    activatePlanetEffect: (raceId: RaceId, planetId?: string) => void;

    /**
     * Снимает истёкшие эффекты и удаляет бонусы из состояния
     */
    removeExpiredEffects: () => void;

    /**
     * Обучает члена экипажа (эффект человеческой академии)
     * @param crewMemberId - ID члена экипажа для обучения
     */
    trainCrew: (crewMemberId: number) => void;

    /**
     * Сканирует сектор (эффект архивов синтетиков)
     */
    scanSector: () => void;
}

/**
 * Создаёт planetEffects слайс для управления эффектами планет
 *
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @returns Объект с методами управления эффектами планет
 */
export const createPlanetEffectsSlice = (
    set: SetState,
    get: () => GameStore,
): PlanetEffectsSlice => ({
    activatePlanetEffect: (raceId, planetId) => {
        const success = applyPlanetEffect(raceId, planetId, set, get);
        if (success) {
            playSound("success");
        }
    },

    removeExpiredEffects: () => {
        removeExpiredEffectsHelper(set, get);
    },

    trainCrew: (crewMemberId) => {
        trainCrewMember(crewMemberId, set, get);
    },

    scanSector: () => {
        scanSectorHelper(set, get);
    },
});
