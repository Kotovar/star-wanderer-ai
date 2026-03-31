/**
 * Уровни репутации между расами
 */
export type ReputationLevel =
    | "hostile" // -100 to -51: Враждебный
    | "unfriendly" // -50 to -11: Недружелюбный
    | "neutral" // -10 to 10: Нейтральный
    | "friendly" // 11 to 50: Дружелюбный
    | "allied"; // 51 to 100: Союзный

/**
 * Получение уровня репутации по числовому значению
 */
export function getReputationLevel(reputation: number): ReputationLevel {
    if (reputation <= -51) return "hostile";
    if (reputation <= -11) return "unfriendly";
    if (reputation <= 10) return "neutral";
    if (reputation <= 50) return "friendly";
    return "allied";
}

/**
 * Цвета для уровней репутации (UI)
 */
export const REPUTATION_COLORS: Record<ReputationLevel, string> = {
    hostile: "#ef4444", // red-500
    unfriendly: "#f97316", // orange-500
    neutral: "#6b7280", // gray-500
    friendly: "#22c55e", // green-500
    allied: "#3b82f6", // blue-500
};

/**
 * Иконки для уровней репутации
 */
export const REPUTATION_ICONS: Record<ReputationLevel, string> = {
    hostile: "⚔️",
    unfriendly: "😠",
    neutral: "😐",
    friendly: "😊",
    allied: "🤝",
};

/**
 * Описания уровней репутации для UI
 */
export const REPUTATION_DESCRIPTIONS: Record<ReputationLevel, string> = {
    hostile: "Враждебный — атакуют при встрече",
    unfriendly: "Недружелюбный — высокие цены, нет контрактов",
    neutral: "Нейтральный — обычные отношения",
    friendly: "Дружелюбный — скидки, доступны контракты",
    allied: "Союзный — максимальные скидки, все контракты",
};
