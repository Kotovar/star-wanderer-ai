import { MODULES_BY_LEVEL } from "@/game/components/station";
import { RESEARCH_TREE } from "@/game/constants/research";
import type { GameState } from "@/game/types/game";
import { getActiveModules } from "@/game/modules/utils";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";

const capacityDefault =
    MODULES_BY_LEVEL[1].find((module) => module.moduleType === "cargo")
        ?.capacity ?? 40;

/**
 * Вычисляет общую грузоподъёмность корабля
 * Суммирует capacity всех активных грузовых модулей
 *
 * @param state - Текущее состояние игры
 * @returns Общая грузоподъёмность (по умолчанию 40 на модуль)
 */
export const getCargoCapacity = (state: GameState) => {
    const cargoModules = getActiveModules(state.ship.modules, "cargo");
    let capacity = cargoModules.reduce(
        (sum, m) => sum + (m.capacity ?? capacityDefault),
        0,
    );

    // === Бонус от исследований (cargo_capacity) — runtime ===
    const techCargoBonus = state.research.researchedTechs.reduce((sum, techId) => {
        const tech = RESEARCH_TREE[techId];
        return sum + tech.bonuses
            .filter((b) => b.type === "cargo_capacity")
            .reduce((s, b) => s + b.value, 0);
    }, 0);
    if (techCargoBonus > 0) {
        capacity = Math.floor(capacity * (1 + techCargoBonus));
    }

    // === Бонус от сращивания ксеноморфов ===
    const mergeBonus = getMergeEffectsBonus(state.crew, state.ship.modules);
    if (mergeBonus.cargoCapacity) {
        capacity = Math.floor(capacity * (1 + mergeBonus.cargoCapacity / 100));
    }

    return capacity;
};
