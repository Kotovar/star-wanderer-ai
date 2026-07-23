import { toast } from "sonner";
import { store as i18nStore } from "@/lib/useTranslation";

const HINTS_KEY = "sw_hints_seen_v1";

function getSeenHints(): string[] {
    try {
        return JSON.parse(localStorage.getItem(HINTS_KEY) ?? "[]");
    } catch {
        return [];
    }
}

/**
 * Показывает контекстную подсказку один раз за игрока (флаг в localStorage),
 * в момент, когда он впервые сталкивается с механикой — вместо стены текста
 * в стартовом туториале. Дублируется в toast (не пропустишь на экране) и в
 * игровой лог (остаётся в истории).
 */
export function showHintOnce(
    addLog: (message: string, type?: "info") => void,
    hintId: string,
    messageKey: string,
): void {
    if (typeof window === "undefined") return;

    const seen = getSeenHints();
    if (seen.includes(hintId)) return;
    localStorage.setItem(HINTS_KEY, JSON.stringify([...seen, hintId]));

    const message = i18nStore.t(messageKey);
    toast(message, { duration: 6000 });
    addLog(`💡 ${message}`, "info");
}
