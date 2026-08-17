export const LOG_CATEGORIES = [
    "combat",
    "crew",
    "research",
    "contracts",
    "exploration",
    "reputation",
    "system",
] as const;

export type LogCategory = (typeof LOG_CATEGORIES)[number];

export type LogMessageParam = string | number;

export type LogMessageParams = Record<string, LogMessageParam>;

/** Стабильное описание локализуемой записи для сохранения и повторного рендера. */
export interface LocalizedLogMessage {
    key: string;
    params?: LogMessageParams;
}

export type LogMessage = string | LocalizedLogMessage;

export interface LogEntry {
    message: string;
    type: "info" | "warning" | "error" | "combat";
    turn: number;
    category?: LogCategory;
    /** Ключ и параметры сохраняются отдельно от fallback-текста, чтобы журнал переживал смену языка. */
    messageKey?: string;
    messageParams?: LogMessageParams;
}
