import { store as i18nStore } from "@/lib/useTranslation";
import { getArtifactEffectValue, changeHealthByPercent } from "@/game/artifacts";
import type { GameState, GameStore, SetState } from "@/game/types";

/**
 * Обработка положительных эффектов артефактов
 *
 * Здесь остались только артефакты, которые действительно меняют состояние
 * каждый ход — авторемонт модулей:
 * - nanite_repair (Нанитовая Обшивка)
 * - auto_repair (Паразитические Наниты)
 *
 * Остальные эффекты (энергия, щиты, урон, сканирование, перелёты) считаются
 * в местах, где они применяются, и раньше лишь дублировались сюда одинаковой
 * строкой в журнал каждый ход. Текущие значения видны в панели артефактов.
 *
 * @param state - Текущее состояние игры
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const processArtifactEffects = (
    state: GameState,
    set: SetState,
    get: () => GameStore,
): void => {
    const repairArtifacts = state.artifacts.filter(
        (a) =>
            a.effect.active &&
            (a.effect.type === "nanite_repair" ||
                a.effect.type === "auto_repair"),
    );

    repairArtifacts.forEach((artifact) => {
        // value — это проценты от максимума модуля, а не плоские единицы
        const repairPercent = getArtifactEffectValue(artifact, state);
        set((s) => ({
            ship: {
                ...s.ship,
                modules: s.ship.modules.map((m) => ({
                    ...m,
                    health: changeHealthByPercent(m, repairPercent),
                })),
            },
        }));

        const logKey =
            artifact.effect.type === "nanite_repair"
                ? "game_logs.processArtifactEffects_3"
                : "game_logs.processArtifactEffects_4";
        get().addLog(
            i18nStore.t(logKey, { repairAmount: repairPercent }),
            "info",
        );
    });
};
