import type { GameState, GameStore } from "@/game/types";

/**
 * Проверка повреждений модулей и урон экипажу
 */
export const checkModuleDamage = (
    state: GameState,
    get: () => GameStore,
    set: (fn: (s: GameState) => void) => void,
): void => {
    const currentState = get();
    const crewInDamagedModules = currentState.crew.filter((c) => {
        if (c.moduleId === undefined) return false;
        const shipModule = currentState.ship.modules.find(
            (m) => m.id === c.moduleId,
        );
        if (!shipModule) return false;
        const healthPercent =
            (shipModule.health / (shipModule.maxHealth || 100)) * 100;
        return healthPercent < 30;
    });

    if (crewInDamagedModules.length > 0) {
        crewInDamagedModules.forEach((crewMember) => {
            const shipModule = currentState.ship.modules.find(
                (m) => m.id === crewMember.moduleId,
            );
            if (!shipModule) return;

            const healthPercent =
                (shipModule.health / (shipModule.maxHealth || 100)) * 100;
            const damage = healthPercent <= 0 ? 15 : 5;

            set((s) => ({
                crew: s.crew.map((c) =>
                    c.id === crewMember.id
                        ? {
                              ...c,
                              health: Math.max(1, c.health - damage),
                          }
                        : c,
                ),
            }));

            get().addLog(
                `⚠️ ${crewMember.name} получил -${damage}% урона в ${shipModule.name} (${Math.round(healthPercent)}% ❤️)`,
                "warning",
            );
        });
    }

    const brokenModulesWithCrew = state.ship.modules.filter(
        (m) =>
            m.health <= 0 &&
            state.crew.some((c) => c.moduleId === m.id),
    );
    if (brokenModulesWithCrew.length > 0) {
        brokenModulesWithCrew.forEach((m) => {
            const damage = 10;
            set((s) => ({
                crew: s.crew.map((c) =>
                    c.moduleId === m.id
                        ? {
                              ...c,
                              health: Math.max(0, c.health - damage),
                          }
                        : c,
                ),
            }));
            get().addLog(
                `⚠️ Экипаж в "${m.name}": -${damage} (модуль разрушен)`,
                "error",
            );
        });
        const deadCrew = get().crew.filter((c) => c.health <= 0);
        if (deadCrew.length > 0) {
            set((s) => ({
                crew: s.crew.filter((c) => c.health > 0),
            }));
            get().addLog(
                `☠️ Погибли: ${deadCrew.map((c) => c.name).join(", ")}`,
                "error",
            );
        }
    }
};
