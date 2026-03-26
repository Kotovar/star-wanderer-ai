import {
    calculateAverageDefense,
    calculateTotalShields,
    calculateTotalFuelCapacity,
} from "../utils";
import { findActiveArtifact, getArtifactEffectValue } from "@/game/artifacts";
import { ARTIFACT_TYPES } from "@/game/constants";
import { RESEARCH_TREE } from "@/game/constants/research";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import { getActiveModules } from "@/game/modules/utils";
import type { GameState } from "@/game/types";

/**
 * Обновляет все характеристики корабля
 * Пересчитывает защиту, щиты, кислород, топливо и ёмкость экипажа
 * на основе текущих модулей, артефактов и эффектов
 *
 * @param state - Текущее состояние игры
 */
export const updateShipStats = (state: GameState): void => {
    const { artifacts, ship } = state;
    const { modules } = ship;

    // === Расчёт защиты ===
    const averageDefense = calculateAverageDefense(modules);
    const crystallineArmor = findActiveArtifact(
        artifacts,
        ARTIFACT_TYPES.CRYSTALLINE_ARMOR,
    );
    let finalDefense = averageDefense;

    if (crystallineArmor) {
        const armorBonus = getArtifactEffectValue(crystallineArmor, state);
        finalDefense += armorBonus;
    }

    // === Расчёт щитов ===
    let totalShields = calculateTotalShields(modules);

    // === Бонус от исследований (shield_strength) — runtime ===
    const techShieldBonus = state.research.researchedTechs.reduce((sum, techId) => {
        const tech = RESEARCH_TREE[techId];
        return sum + tech.bonuses
            .filter((b) => b.type === "shield_strength")
            .reduce((s, b) => s + b.value, 0);
    }, 0);
    if (techShieldBonus > 0) {
        totalShields = Math.floor(totalShields * (1 + techShieldBonus));
    }

    const darkShield = findActiveArtifact(
        artifacts,
        ARTIFACT_TYPES.DARK_SHIELD,
    );
    if (darkShield) {
        totalShields += getArtifactEffectValue(darkShield, state);
    }

    // Сохраняем бонусные щиты от эффектов планет
    const bonusShields = ship.bonusShields || 0;
    let maxShieldsWithBonus = totalShields + bonusShields;

    // === Расчёт топлива и вместимости экипажа ===
    let totalFuelCapacity = calculateTotalFuelCapacity(modules);

    // === Бонусы от сращивания ксеноморфов ===
    const mergeBonus = getMergeEffectsBonus(state.crew, state.ship.modules);
    if (mergeBonus.shieldCapacity) {
        maxShieldsWithBonus = Math.floor(
            maxShieldsWithBonus * (1 + mergeBonus.shieldCapacity / 100),
        );
    }
    if (mergeBonus.fuelCapacity) {
        totalFuelCapacity = Math.floor(
            totalFuelCapacity * (1 + mergeBonus.fuelCapacity / 100),
        );
    }

    // Защита от NaN или undefined для текущего топлива
    const currentFuel = ship.fuel || 0;

    // === Обновление состояния корабля ===
    ship.armor = finalDefense;
    ship.maxShields = maxShieldsWithBonus;
    ship.shields = Math.min(ship.shields, maxShieldsWithBonus);
    const quartersBonus = [...getActiveModules(modules, "quarters"), ...getActiveModules(modules, "habitat_module")].reduce(
        (sum, m) => sum + (m.capacity ?? 0),
        0,
    );
    ship.crewCapacity = modules.filter((m) => m.type !== "quarters" && m.type !== "habitat_module").length + quartersBonus;
    ship.maxFuel = totalFuelCapacity;
    ship.fuel = Math.min(currentFuel, totalFuelCapacity);
};
