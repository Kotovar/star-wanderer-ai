import type { GameState, GameStore } from "@/game/types";
import { performEnemyAttack } from "./enemyCounterAttack";

/**
 * Обрабатывает атаку врага по кораблю игрока — используется вне обычного
 * раунда боя (форсированная атака: засада, экшен `processEnemyAttack`),
 * поэтому не восстанавливает щиты врага перед атакой (в отличие от
 * `handleEnemyCounterAttack`, который выполняется после хода игрока).
 */
export function executeEnemyAttack(
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
) {
    performEnemyAttack(state, set, get, { regenShieldsFirst: false });
}
