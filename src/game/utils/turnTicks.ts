import type { GameState } from "@/game/types";

/**
 * Пересекли ли ходы границу кратности `interval` с прошлого обработанного хода.
 *
 * Проверка `turn % interval === 0` тихо теряет тик, когда счётчик прыгает
 * больше чем на 1: бой добавляет 1–3 хода (applyCombatTimeCost), а часть
 * действий (орбитальный скан, бурение, стройка) делает свой `turn + 1` мимо
 * nextTurn. Один пропуск кратного хода = период без жалованья.
 *
 * `lastProcessedTurn` пишется в конце nextTurn; у старых сохранений его нет —
 * тогда откатываемся на прежнее поведение «предыдущий ход».
 */
export const crossedTurnInterval = (
    state: Pick<GameState, "turn" | "lastProcessedTurn">,
    interval: number,
): boolean =>
    Math.floor(state.turn / interval) >
    Math.floor((state.lastProcessedTurn ?? state.turn - 1) / interval);
