import { store as i18nStore } from "@/lib/useTranslation";
import { getTechBonusSum } from "@/game/research";
import type { GameStore, SetState } from "@/game/types";

/**
 * Автоматический ремонт модулей нанитами (automated_repair + nanite_hull).
 * Восстанавливает % здоровья всех активных модулей за ход.
 */
export const processNaniteRepair = (
    get: () => GameStore,
    set: SetState,
): void => {
    const state = get();

    // Суммируем nanite_repair от researched techs (automated_repair: 2%, nanite_hull: 5%)
    const repairPercent = getTechBonusSum(state.research, "nanite_repair");

    if (repairPercent <= 0) return;

    const repairMultiplier = repairPercent / 100;
    let totalRepaired = 0;

    set((s) => {
        const newModules = s.ship.modules.map((m) => {
            if (!m.health || !m.maxHealth || m.health >= m.maxHealth) return m;
            const heal = Math.ceil(m.maxHealth * repairMultiplier);
            const newHealth = Math.min(m.maxHealth, m.health + heal);
            totalRepaired += newHealth - m.health;
            return { ...m, health: newHealth };
        });

        return { ship: { ...s.ship, modules: newModules } };
    });

    if (totalRepaired > 0) {
        get().addLog( i18nStore.t("game_logs.naniteRepair_1", { repairPercent, totalRepaired }),
            "info",
        );
    }
};
