import { RESEARCH_TREE } from "@/game/constants";
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
    const repairPercent = state.research.researchedTechs.reduce(
        (sum, techId) => {
            const tech = RESEARCH_TREE[techId];
            return (
                sum +
                tech.bonuses
                    .filter((b) => b.type === "nanite_repair")
                    .reduce((s, b) => s + b.value, 0)
            );
        },
        0,
    );

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
        get().addLog(
            `🔧 Наниты отремонтировали модули (+${repairPercent}% за ход, +${totalRepaired} HP)`,
            "info",
        );
    }
};
