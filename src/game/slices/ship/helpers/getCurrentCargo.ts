import type { GameState } from "@/game/types";

/**
 * Рассчитывает текущее количество груза на корабле
 * @param state - Текущее состояние игры
 * @returns Общее количество груза
 */
export const getCurrentCargo = (state: GameState) =>
    state.ship.cargo.reduce((sum, cargo) => sum + cargo.quantity, 0) +
    state.ship.tradeGoods.reduce((sum, tg) => sum + tg.quantity, 0) +
    // Газ с аванпостов — объёмный товар, который везут на продажу, а не
    // научный образец: он обязан занимать трюм, иначе бункер на 40 единиц
    // не создаёт никакого давления и вывоз ничего не стоит
    getGasVolume(state.gases) +
    state.probes;

/** Сколько места занимает газ. Пустой пул у сейвов до миграции — ноль */
export const getGasVolume = (
    gases: GameState["gases"] | undefined,
): number =>
    Object.values(gases ?? {}).reduce<number>(
        (sum, amount) => sum + (amount ?? 0),
        0,
    );
