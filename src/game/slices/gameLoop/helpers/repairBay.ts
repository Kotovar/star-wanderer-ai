import type { GameStore, SetState } from "@/game/types";
import { getActiveModules } from "@/game/modules/utils";
import { XENOSYMBIONT_MERGE_EFFECTS } from "@/game/constants/races";

/** Минимальный % здоровья модуля, при котором дроны его игнорируют */
const REPAIR_THRESHOLD = 0.95;
const DEFAULT_REPAIR_AMOUNT = 3;
const DEFAULT_REPAIR_TARGETS = 1;
const XENO_REPAIR_BONUS =
    1 + (XENOSYMBIONT_MERGE_EFFECTS.repair_bay.effects.repairBonus ?? 0) / 100;

/**
 * Ремонтные дроны восстанавливают HP случайным повреждённым модулям.
 * Каждый активный repair_bay ремонтирует repairTargets модулей на repairAmount HP.
 * Модули с health >= 95% maxHealth игнорируются — дроны не тратятся впустую.
 */
export const processRepairBay = (
    get: () => GameStore,
    set: SetState,
): void => {
    const state = get();
    const repairBays = getActiveModules(state.ship.modules, "repair_bay");
    if (repairBays.length === 0) return;

    // Суммируем суммарный ремонт от всех отсеков
    // Если с отсеком сращён ксеноморф — ремонт +50% HP
    let totalAmount = 0;
    let totalTargets = 0;
    repairBays.forEach((bay) => {
        let amount = bay.repairAmount ?? DEFAULT_REPAIR_AMOUNT;
        const hasXenoMerged = state.crew.some(
            (c) => c.isMerged && c.mergedModuleId === bay.id && c.race === "xenosymbiont",
        );
        if (hasXenoMerged) {
            amount = Math.floor(amount * XENO_REPAIR_BONUS);
        }
        totalAmount += amount;
        totalTargets += bay.repairTargets ?? DEFAULT_REPAIR_TARGETS;
    });

    // Находим кандидатов для ремонта (повреждённые, не сами repair_bay)
    const damaged = state.ship.modules.filter(
        (m) =>
            m.type !== "repair_bay" &&
            m.health < (m.maxHealth || 100) * REPAIR_THRESHOLD,
    );

    if (damaged.length === 0) return;

    // Выбираем случайных кандидатов (без повторений)
    const shuffled = [...damaged].sort(() => Math.random() - 0.5);
    const targets = shuffled.slice(0, Math.min(totalTargets, shuffled.length));

    let totalRepaired = 0;

    set((s) => ({
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m) => {
                if (!targets.some((t) => t.id === m.id)) return m;
                const maxHp = m.maxHealth || 100;
                const newHealth = Math.min(maxHp, m.health + totalAmount);
                totalRepaired += newHealth - m.health;
                return { ...m, health: newHealth };
            }),
        },
    }));

    if (totalRepaired > 0) {
        get().addLog(
            `🔧 Ремонтные дроны восстановили ${targets.length} модул${targets.length === 1 ? "ь" : "и"} (+${totalRepaired} HP)`,
            "info",
        );
    }
};
