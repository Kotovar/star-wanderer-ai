import { store as i18nStore } from "@/lib/useTranslation";
import type { ModuleType } from "@/game/types/modules";
import type { XenosymbiontMergeEffect } from "@/game/types/races";

export type MergeEffectKey = keyof Omit<
    XenosymbiontMergeEffect,
    "moduleId" | "moduleType"
>;

type MergeEffects = Partial<Record<MergeEffectKey, number>>;

/** Эффекты, выраженные как флэт-число, а не процент */
const FLAT_EFFECTS: Partial<Record<MergeEffectKey, string>> = {
    crewHealthRegen: "HP/ход",
    scanRange: "кл.",
};

/** Эффекты, где меньше — лучше (снижение чего-то плохого) */
const NEGATIVE_EFFECTS = new Set<MergeEffectKey>([
    "energyReduction",
    "glitchResistance",
]);

function formatMergeEffectValue(key: MergeEffectKey, value: number): string {
    const sign = NEGATIVE_EFFECTS.has(key) ? "-" : "+";
    const unit = FLAT_EFFECTS[key];
    return unit ? `${sign}${value} ${unit}` : `${sign}${value}%`;
}

export interface MergeEffectEntry {
    key: MergeEffectKey;
    label: string;
    valueText: string;
}

/**
 * Разворачивает объект эффектов сращивания в список подписанных строк —
 * единая точка форматирования для меню задач и карточки модуля.
 */
export function getMergeEffectEntries(
    effects: MergeEffects,
): MergeEffectEntry[] {
    return (Object.entries(effects) as [MergeEffectKey, number | undefined][])
        .filter((entry): entry is [MergeEffectKey, number] => !!entry[1])
        .map(([key, value]) => ({
            key,
            label: i18nStore.t(`merge_effects.${key}`),
            valueText: formatMergeEffectValue(key, value),
        }));
}

/** Компактная однострочная сводка — для превью в меню задач */
export function formatMergeEffectSummary(effects: MergeEffects): string {
    return getMergeEffectEntries(effects)
        .map((e) => `${e.valueText} ${e.label.toLowerCase()}`)
        .join(", ");
}

/**
 * Считает прибавку процентного эффекта сращивания к конкретному числовому
 * полю модуля: floor(base * (1 + percent/100)) — та же формула, что и в
 * реальных геймплейных расчётах (getOxygenCapacity, getCargoCapacity,
 * getTotalPower и т.д.), поэтому показанное число совпадает с фактическим.
 * Применимо только к модулям, где эффект скопирован 1:1 на их собственное
 * поле (одна лаборатория/грузовой отсек/etc. — не сумма нескольких модулей).
 */
export function computeMergePercentDelta(
    baseValue: number,
    percent: number | undefined,
): number | null {
    if (!percent) return null;
    const delta = Math.floor(baseValue * (1 + percent / 100)) - baseValue;
    return delta !== 0 ? delta : null;
}

/**
 * Эффекты, уже показанные "инлайн" рядом с базовым значением стата модуля
 * (например, Кислород: 5(+1)) — их не нужно повторять в общем списке эффектов
 * сращивания под карточкой модуля.
 */
const INLINED_MERGE_KEYS: Partial<Record<ModuleType, MergeEffectKey[]>> = {
    reactor: ["powerOutput"],
    fueltank: ["fuelCapacity"],
    cargo: ["cargoCapacity"],
    scanner: ["scanRange"],
    lab: ["researchSpeed"],
    shield: ["shieldCapacity"],
    lifesupport: ["oxygenEfficiency"],
    repair_bay: ["repairBonus"],
    medical: ["healing"],
    habitat_module: ["healing"],
    bio_research_lab: ["researchSpeed"],
    deep_survey_array: ["scanRange"],
};

/** Список эффектов сращивания без тех, что уже показаны инлайн у своего стата */
export function getStandaloneMergeEffectEntries(
    moduleType: ModuleType,
    effects: MergeEffects,
): MergeEffectEntry[] {
    const inlined = INLINED_MERGE_KEYS[moduleType];
    return getMergeEffectEntries(effects).filter(
        (entry) => !inlined?.includes(entry.key),
    );
}
