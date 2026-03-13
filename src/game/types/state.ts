import type { GameState } from "@/game/types";

/**
 * Тип для set с поддержкой immer
 * Позволяет обновлять состояние через мутации или через возврат объекта
 */
export type SetState = {
    (
        partial:
            | Partial<GameState>
            | ((state: GameState) => Partial<GameState>),
    ): void;
};
