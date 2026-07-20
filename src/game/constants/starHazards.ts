import type { StarType } from "@/game/types";

/**
 * Уровень опасности звезды (0 = низкая … 4 = экстремальная).
 * Совпадает с флейвор-текстом `star_info.<type>.hazard` в локалях —
 * значения там не декоративные, а буквально эта шкала.
 */
export const STAR_HAZARD_LEVEL: Record<StarType, number> = {
    red_dwarf: 0,
    yellow_dwarf: 0,
    gas_giant: 0,
    variable_star: 0,
    stellar_remnant: 0,
    white_dwarf: 1,
    double: 1,
    triple: 1,
    blue_giant: 2,
    red_supergiant: 2,
    neutron_star: 3,
    blackhole: 4,
};

/** С этого уровня опасности звезда начинает глушить регенерацию щитов */
export const STAR_SHIELD_REGEN_PENALTY_THRESHOLD = 2;

/**
 * Штраф к скорости регенерации щитов за единицу уровня опасности (для
 * уровней >= порога) — множитель, а не фиксированное число, чтобы эффект
 * оставался ощутимым независимо от того, сколько модулей/артефактов/техов
 * прокачано на реген. При уровне 4 (чёрная дыра) регенерация щитов
 * полностью блокируется (4 × 0.25 = 100%).
 */
export const STAR_SHIELD_REGEN_PENALTY_PER_LEVEL = 0.25;

/** Множитель к шансу случайного события в пути за единицу уровня опасности звезды назначения */
export const STAR_EVENT_CHANCE_PER_LEVEL = 0.15;

/** Верхняя граница итогового шанса случайного события в пути */
export const STAR_EVENT_CHANCE_CAP = 0.9;
