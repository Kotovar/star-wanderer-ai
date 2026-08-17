import type {
    LocalizedLogMessage,
    LogCategory,
    LogEntry,
    LogMessage,
    LogMessageParams,
} from "@/game/types/logs";

export type LogTranslator = (
    key: string,
    params?: LogMessageParams,
) => string;

export type TranslationCatalog = Record<string, unknown>;

type TranslationTemplate = {
    key: string;
    matcher: RegExp;
    params: string[];
};

const LEGACY_LOG_PATHS = [
    "game_logs",
    "services",
    "sector_rules.logs",
] as const;

const templateCache = new WeakMap<object, TranslationTemplate[]>();

/**
 * Максимальное количество записей в логе
 * Старые записи автоматически удаляются при добавлении новых
 */
const MAX_LOG_ENTRIES = 100;

/**
 * Типы сообщений лога
 * Определяют важность и способ отображения сообщения
 */
export const LOG_TYPES: Record<string, LogEntry["type"]> = {
    INFO: "info",
    WARNING: "warning",
    ERROR: "error",
    COMBAT: "combat",
};

export function isLocalizedLogMessage(
    message: LogMessage,
): message is LocalizedLogMessage {
    return typeof message === "object" && message !== null && "key" in message;
}

export function renderLocalizedLogMessage(
    message: LocalizedLogMessage,
    t: LogTranslator,
    fallback = message.key,
): string {
    const translated = t(message.key, message.params);
    return translated === message.key ? fallback : translated;
}

/**
 * В старых сохранениях остался только уже отрендеренный текст. Для строк из
 * каталога восстанавливаем ключ и значения плейсхолдеров без эвристик по словам.
 */
export function inferLocalizedLogMessage(
    message: string,
    catalogs: TranslationCatalog[],
): LocalizedLogMessage | undefined {
    const matches = new Map<string, LocalizedLogMessage>();

    for (const catalog of catalogs) {
        for (const template of getTranslationTemplates(catalog)) {
            const result = template.matcher.exec(message);
            if (!result) continue;

            const params = template.params.reduce<LogMessageParams>(
                (next, param, index) => {
                    const value = result[index + 1];
                    if (value !== undefined && next[param] === undefined) {
                        next[param] = value;
                    }
                    return next;
                },
                {},
            );
            const localized: LocalizedLogMessage = {
                key: template.key,
                ...(Object.keys(params).length > 0 ? { params } : {}),
            };
            matches.set(`${localized.key}:${JSON.stringify(localized.params)}`, localized);
        }
    }

    return matches.size === 1 ? matches.values().next().value : undefined;
}

export function getLogMessage(
    entry: LogEntry,
    t: LogTranslator,
    catalogs: TranslationCatalog[],
): string {
    const localized = entry.messageKey
        ? { key: entry.messageKey, params: entry.messageParams }
        : inferLocalizedLogMessage(entry.message, catalogs);

    return localized
        ? renderLocalizedLogMessage(localized, t, entry.message)
        : entry.message;
}

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
    category?: LogCategory,
    localized?: LocalizedLogMessage,
): LogEntry {
    return {
        message,
        type,
        turn,
        ...(category ? { category } : {}),
        ...(localized
            ? {
                  messageKey: localized.key,
                  ...(localized.params ? { messageParams: localized.params } : {}),
              }
            : {}),
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

function getTranslationTemplates(
    catalog: TranslationCatalog,
): TranslationTemplate[] {
    const cached = templateCache.get(catalog);
    if (cached) return cached;

    const templates: TranslationTemplate[] = [];
    for (const path of LEGACY_LOG_PATHS) {
        const value = getCatalogValue(catalog, path);
        if (value !== undefined) collectTranslationTemplates(value, path, templates);
    }
    templateCache.set(catalog, templates);
    return templates;
}

function getCatalogValue(
    catalog: TranslationCatalog,
    path: string,
): unknown {
    return path.split(".").reduce<unknown>((value, key) => {
        if (!value || typeof value !== "object") return undefined;
        return (value as Record<string, unknown>)[key];
    }, catalog);
}

function collectTranslationTemplates(
    value: unknown,
    key: string,
    templates: TranslationTemplate[],
): void {
    if (typeof value === "string") {
        const template = createTranslationTemplate(key, value);
        if (template) templates.push(template);
        return;
    }
    if (!value || typeof value !== "object") return;

    for (const [childKey, childValue] of Object.entries(value)) {
        collectTranslationTemplates(childValue, `${key}.${childKey}`, templates);
    }
}

function createTranslationTemplate(
    key: string,
    value: string,
): TranslationTemplate | undefined {
    const params: string[] = [];
    let cursor = 0;
    let source = "^";
    const placeholders = /\{\{(\w+)\}\}/g;

    for (const match of value.matchAll(placeholders)) {
        source += escapeRegExp(value.slice(cursor, match.index));
        source += "([\\s\\S]*?)";
        params.push(match[1]);
        cursor = (match.index ?? 0) + match[0].length;
    }
    source += escapeRegExp(value.slice(cursor));
    source += "$";

    // Фрагменты вроде "{{value}}₢" совпадают с любым денежным сообщением и
    // не годятся для безопасного восстановления полного ключа.
    if (!/[\p{L}\p{N}]{3}/u.test(value.replace(placeholders, ""))) {
        return undefined;
    }

    return { key, matcher: new RegExp(source), params };
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
