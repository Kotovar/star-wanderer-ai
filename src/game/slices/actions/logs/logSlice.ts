import type { LogEntry } from "@/game/types/logs";
import type { GameState } from "@/game/types/game";
import { LOG_TYPES, createLogEntry, updateLog } from "./utils";

/**
 * Интерфейс LogSlice
 * Содержит состояние лога и методы для работы с ним
 */
export interface LogSlice {
    /**
     * Список записей лога
     * Хранит последние MAX_LOG_ENTRIES записей
     * Новые записи добавляются в начало массива
     */
    log: LogEntry[];

    /**
     * Добавляет новую запись в лог
     * @param message - Текст сообщения
     * @param type - Тип сообщения (по умолчанию "info")
     *
     * @example
     * ```ts
     * addLog("Двигатели запущены", "info");
     * addLog("Низкий уровень топлива!", "warning");
     * addLog("Получено повреждение щита", "combat");
     * ```
     */
    addLog: (message: string, type?: LogEntry["type"]) => void;
}

/**
 * Начальное состояние слайса лога
 * Используется при инициализации store
 */
export const logInitialState: Pick<LogSlice, "log"> = {
    log: [],
};

/**
 * Создаёт слайс лога с поддержкой immer
 * Позволяет мутировать состояние напрямую внутри set()
 *
 * @example
 * ```ts
 * export const useGameStore = create<GameStore>()(
 *   immer((set, get) => ({
 *     ...initialState,
 *     ...createLogSlice(set, get),
 *     ...createShipSlice(set, get),
 *   }))
 * )
 * ```
 *
 * @param set - Функция для обновления состояния
 * @param get - Функция для получения текущего состояния
 * @returns Объект с состоянием лога и методами управления
 */
export const createLogSlice = (
    set: (fn: (state: GameState & LogSlice) => void) => void,
): LogSlice => ({
    ...logInitialState,

    addLog: (message, type = LOG_TYPES.INFO) => {
        set((state) => {
            const newEntry = createLogEntry(message, type, state.turn);
            state.log = updateLog(state.log, newEntry);
        });
    },
});
