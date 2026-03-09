import type { CrewTrait, GameState, GameStore } from "@/game/types";

/**
 * Обработка трейтов морали
 */
export const processMoraleTraits = (
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    get().crew.forEach((c) => {
        c.traits?.forEach((trait: CrewTrait) => {
            if (!trait.effect.moduleMorale) return;

            const moraleBonus = trait.effect.moduleMorale;
            const crewInSameModule = get().crew.filter(
                (cr) =>
                    cr.moduleId === c.moduleId &&
                    cr.id !== c.id &&
                    cr.happiness < (cr.maxHappiness || 100),
            );

            if (crewInSameModule.length === 0) return;

            set((s) => ({
                crew: s.crew.map((cr) =>
                    cr.moduleId === c.moduleId && cr.id !== c.id
                        ? {
                              ...cr,
                              happiness: Math.min(
                                  cr.maxHappiness || 100,
                                  cr.happiness + moraleBonus,
                              ),
                          }
                        : cr,
                ),
            }));
            get().addLog(
                `★ ${c.name} (${trait.name}): +${moraleBonus} настроения модулю`,
                "info",
            );
        });
    });
};

/**
 * Удаление несчастного экипажа
 */
export const processUnhappyCrew = (
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    const unhappyCrew = get().crew.filter((c) => c.happiness === 0);
    unhappyCrew.forEach((c) => {
        get().addLog(`${c.name} покинул корабль!`, "error");
        set((s) => ({ crew: s.crew.filter((cr) => cr.id !== c.id) }));
    });
};

/**
 * Проверка критической нехватки энергии
 */
export const processPowerCheck = (
    state: GameState,
    set: (fn: (s: GameState) => void) => void,
    get: () => GameStore,
): void => {
    const power = get().getTotalPower();
    const boost = get().crew.find((c) => c.assignment === "power") ? 5 : 0;
    const consumption = get().getTotalConsumption();
    const available = power + boost - consumption;

    if (available >= 0) return;

    get().addLog("КРИТИЧНО: Недостаток энергии!", "error");
    set((s) => ({
        crew: s.crew.map((c) => ({
            ...c,
            happiness: Math.max(0, c.happiness - 10),
        })),
    }));

    if (Math.random() < 0.4) {
        const mod =
            get().ship.modules[
                Math.floor(Math.random() * get().ship.modules.length)
            ];
        set((s) => ({
            ship: {
                ...s.ship,
                modules: s.ship.modules.map((m) =>
                    m.id === mod.id
                        ? {
                              ...m,
                              health: Math.max(0, m.health - 15),
                          }
                        : m,
                ),
            },
        }));
        get().addLog(`"${mod.name}" повреждён перегрузкой!`, "error");
    }
};
