import { toast } from "sonner";
import {
    getLoadedTranslationCatalogs,
    store as i18nStore,
} from "@/lib/useTranslation";
import type { LogCategory, LogEntry, LogMessage } from "@/game/types/logs";
import type { GameState } from "@/game/types/game";
import {
    LOG_TYPES,
    createLogEntry,
    inferLocalizedLogMessage,
    isLocalizedLogMessage,
    renderLocalizedLogMessage,
    updateLog,
} from "./utils";

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
    addLog: (
        message: LogMessage,
        type?: LogEntry["type"],
        category?: LogCategory,
    ) => void;
}

/**
 * Начальное состояние слайса лога
 * Используется при инициализации store
 */
const logInitialState: Pick<LogSlice, "log"> = {
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

    addLog: (message, type = LOG_TYPES.INFO, category) => {
        const localized = isLocalizedLogMessage(message)
            ? message
            : inferLocalizedLogMessage(message, getLoadedTranslationCatalogs());
        const renderedMessage = isLocalizedLogMessage(message)
            ? renderLocalizedLogMessage(
                  message,
                  i18nStore.t.bind(i18nStore),
              )
            : message;

        set((state) => {
            const newEntry = createLogEntry(
                renderedMessage,
                type,
                state.turn,
                category,
                localized,
            );
            state.log = updateLog(state.log, newEntry);
        });

        // Критические события дублируются попапом, чтобы их нельзя было
        // пропустить в ленте лога
        if (type === LOG_TYPES.ERROR) {
            toast.error(renderedMessage);
        }
    },
});
