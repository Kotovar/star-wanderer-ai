import { MutationName } from "@/game/types";

// Helper functions for mutation traits

export const getMutationTraitName = (type: MutationName): string => {
    const names: Record<MutationName, string> = {
        nightmares: "Мутация: Кошмары",
        paranoid: "Мутация: Паранойя",
        unstable: "Мутация: Нестабильность",
    };
    return names[type] || "Мутация";
};

export const getMutationTraitDesc = (type: MutationName): string => {
    const descs: Record<MutationName, string> = {
        nightmares: "-10 счастья каждый ход",
        paranoid: "-15 морали, +10% уклонение",
        unstable: "Случайные перепады настроения",
    };
    return descs[type] || "Неизвестная мутация";
};
