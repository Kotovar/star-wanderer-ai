import type { ArtifactType } from "@/game/types";

const FRACTIONAL_PERCENTAGE_EFFECTS = new Set<ArtifactType>([
    "damage_reflect",
    "crit_chance",
    "crit_damage_boost",
    "damage_boost",
    "credit_booster",
    "accuracy_boost",
    "evasion_boost",
    "shield_regen_boost",
]);

const WHOLE_PERCENTAGE_EFFECTS = new Set<ArtifactType>([
    "nanite_repair",
    "auto_repair",
]);

const formatArtifactEffectValue = (type: ArtifactType, value: number) => {
    if (FRACTIONAL_PERCENTAGE_EFFECTS.has(type)) {
        return `${Math.round(value * 100)}%`;
    }

    if (WHOLE_PERCENTAGE_EFFECTS.has(type)) {
        return `${Math.round(value)}%`;
    }

    return String(value);
};

export const getArtifactEffectDisplay = (
    type: ArtifactType,
    baseValue: number,
    currentValue: number,
) => ({
    baseValue,
    currentValue,
    isModified: baseValue !== currentValue,
    baseLabel: formatArtifactEffectValue(type, baseValue),
    currentLabel: formatArtifactEffectValue(type, currentValue),
});
