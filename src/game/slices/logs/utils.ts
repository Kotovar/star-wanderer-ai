import type { LogEntry } from "@/game/types/logs";

/**
 * Максимальное количество записей в логе
 * Старые записи автоматически удаляются при добавлении новых
 */
export const MAX_LOG_ENTRIES = 100;

/**
 * Типы сообщений лога
 * Определяют важность и способ отображения сообщения
 */
export const LOG_TYPES = {
    /** Обычное информационное сообщение */
    INFO: "info" as const,
    /** Предупреждение о потенциальной проблеме */
    WARNING: "warning" as const,
    /** Сообщение об ошибке */
    ERROR: "error" as const,
    /** Сообщение о событии в бою */
    COMBAT: "combat" as const,
} as const;

/**
 * Создаёт новую запись лога
 * @param message - Текст сообщения
 * @param type - Тип сообщения
 * @param turn - Номер текущего хода
 * @returns Новая запись лога
 */
export function createLogEntry(
    message: string,
    type: LogEntry["type"],
    turn: number,
): LogEntry {
    return {
        message,
        type,
        turn,
    };
}

/**
 * Обновляет лог, добавляя новую запись в начало
 * и удаляя старые записи, если превышен лимит
 * @param currentLog - Текущий список записей
 * @param newEntry - Новая запись для добавления
 * @returns Обновлённый список записей
 */
export function updateLog(
    currentLog: LogEntry[],
    newEntry: LogEntry,
): LogEntry[] {
    return [newEntry, ...currentLog].slice(0, MAX_LOG_ENTRIES);
}
