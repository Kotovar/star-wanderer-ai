import type { StarType, TravelEventType } from "../types/locations/sectors";

export interface StarTypeEffect {
    /**
     * Модификатор счастья за ход для каждого живого члена экипажа (через
     * `shiftHappiness`), пока корабль стоит в секторе — не в пути.
     */
    happinessPerTurn?: number;
    /** % к уклонению корабля в бою, пока корабль в этом секторе */
    evasionBonus?: number;
    /** Фиксированный бонус к эффективному диапазону сканера */
    scanRangeBonus?: number;
    /**
     * Амплитуда колебания диапазона сканера (±N). Применяется как
     * `Math.round(Math.sin(state.turn) * jitter)` — детерминированная
     * функция хода, не `Math.random()` (см. Global Constraints).
     */
    scanRangeJitter?: number;
    /** Фиксированный бонус к энергии корабля */
    powerBonus?: number;
    /** % (0-1) к добыче ресурсов (alien_biology, rare_minerals, void_membrane) при погружении в газовый гигант в этом секторе */
    gasDiveYieldBonus?: number;
    /** % (0-1) к находкам при разграблении обломков / добыче астероидов в этом секторе */
    salvageYieldBonus?: number;
    /**
     * Тип travel-события, получающий доп. вес при вылете из этого сектора
     * назначения (см. `pickTravelEvent` в Task 7).
     */
    extraTravelEventWeight?: TravelEventType;
    /**
     * Шанс за ход (0-1): случайному функциональному модулю снимается 2 HP,
     * с полом в 10 HP (см. Task 8).
     */
    moduleDecayChance?: number;
}

export const STAR_TYPE_EFFECTS: Record<StarType, StarTypeEffect> = {
    // Уже есть выделенные механики (applyNeutronRadiation,
    // travelThroughBlackHole) — сознательно не трогаем здесь.
    neutron_star: {},
    blackhole: {},

    yellow_dwarf: { happinessPerTurn: 1 },
    red_dwarf: { evasionBonus: 3 },
    brown_dwarf: { gasDiveYieldBonus: 0.2 },
    variable_star: { scanRangeJitter: 2 },
    stellar_remnant: { salvageYieldBonus: 0.25 },
    white_dwarf: { scanRangeBonus: 2 },
    double: { powerBonus: 1 },
    triple: { extraTravelEventWeight: "asteroids" },
    blue_giant: { happinessPerTurn: -1 },
    red_supergiant: { moduleDecayChance: 0.1 },
};

export function getStarTypeEffect(starType: StarType): StarTypeEffect {
    return STAR_TYPE_EFFECTS[starType] ?? {};
}
