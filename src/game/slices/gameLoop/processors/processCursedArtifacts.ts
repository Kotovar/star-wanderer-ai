import type {
    GameState,
    GameStore,
    SetState,
    ArtifactNegativeType,
} from "@/game/types";
import { MUTATION_TRAITS } from "@/game/constants";
import { getTraitById } from "@/game/crew/utils";

/**
 * Обработчик негативного эффекта проклятого артефакта
 */
interface CurseHandler {
    process: (
        state: GameState,
        set: SetState,
        get: () => GameStore,
        artifact: { name: string },
        value: number,
    ) => void;
    logMessage: (artifactName: string, value: number) => string;
}

/**
 * Обработчики проклятых эффектов
 */
const CURSE_HANDLERS: Record<ArtifactNegativeType, CurseHandler | undefined> = {
    happiness_drain: {
        process: applyStatDrain,
        logMessage: (name, value) =>
            `⚠️ ${name}: -${value} счастья/морали экипажу`,
    },
    module_damage: {
        process: applyModuleDamage,
        logMessage: (name, value) =>
            `⚠️ ${name}: случайный модуль повреждён на -${value}%`,
    },
    crew_desertion: {
        process: applyCrewDesertion,
        logMessage: (name) => `⚠️ ${name}: член экипажа покинул корабль`,
    },
    crew_mutation: {
        process: applyCrewMutation,
        logMessage: (name) => `⚠️ ${name}: член экипажа мутировал`,
    },
    ambush_chance: undefined, // Обрабатывается в signals/utils.ts
    self_damage: undefined, // Обрабатывается  после боя
    health_drain: undefined, // Обрабатывается при перемещении
    evasion_penalty: undefined, // снижение шанса на уворот
};

/**
 * Снижение счастья экипажа
 */
function applyStatDrain(
    _state: GameState,
    set: SetState,
    _get: () => GameStore,
    _artifact: { name: string },
    value: number,
) {
    set((s) => ({
        crew: s.crew.map((c) => {
            if (c.race === "synthetic") return c;
            return {
                ...c,
                happiness: Math.max(0, c.happiness - value),
            };
        }),
    }));
}

/**
 * Повреждение случайного модуля
 */
function applyModuleDamage(
    state: GameState,
    set: SetState,
    get: () => GameStore,
    artifact: { name: string },
    value: number,
) {
    if (state.ship.modules.length === 0) return;

    const randomModuleIdx = Math.floor(
        Math.random() * state.ship.modules.length,
    );
    const targetModule = state.ship.modules[randomModuleIdx];

    set((s) => ({
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m, i) =>
                i === randomModuleIdx
                    ? { ...m, health: Math.max(1, m.health - value) }
                    : m,
            ),
        },
    }));

    get().addLog(
        `⚠️ ${artifact.name}: ${targetModule.name} повреждён на -${value}%`,
        "warning",
    );
}

/**
 * Дезертирство экипажа
 */
function applyCrewDesertion(
    state: GameState,
    set: SetState,
    get: () => GameStore,
    artifact: { name: string },
    value: number,
) {
    state.crew.forEach((crewMember) => {
        if (Math.random() * 100 < value) {
            set((s) => ({
                crew: s.crew.filter((c) => c.id !== crewMember.id),
            }));
            get().addLog(
                `⚠️ ${artifact.name}: ${crewMember.name} покинул корабль`,
                "warning",
            );
        }
    });
}

/**
 * Мутация экипажа
 */
function applyCrewMutation(
    state: GameState,
    set: SetState,
    get: () => GameStore,
    artifact: { name: string },
    value: number,
) {
    state.crew.forEach((crewMember) => {
        if (Math.random() * 100 < value) {
            const existingIds = new Set(crewMember.traits.map((t) => t.id));
            const available = MUTATION_TRAITS.filter(
                (t) => !existingIds.has(t),
            );

            if (available.length === 0) return;

            const newTrait =
                available[Math.floor(Math.random() * available.length)];

            set((s) => ({
                crew: s.crew.map((c) =>
                    c.id === crewMember.id
                        ? {
                              ...c,
                              traits: [...c.traits, getTraitById(newTrait)],
                          }
                        : c,
                ),
            }));

            get().addLog(
                `⚠️ ${artifact.name}: ${crewMember.name} мутировал`,
                "warning",
            );
        }
    });
}

/**
 * Обработка проклятых артефактов
 *
 * Обрабатывает негативные эффекты каждый ход:
 * - happiness_drain (Реактор Бездны, Тёмный Щит) - снижение счастья/морали
 * - module_damage (Чёрный Ящик) - повреждение модуля
 * - crew_desertion (Паразитические Наниты) - дезертирство
 * - crew_mutation (Биосфера Древних) - мутация экипажа
 *
 * @param state - Текущее состояние игры
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const processCursedArtifacts = (
    state: GameState,
    set: SetState,
    get: () => GameStore,
): void => {
    const cursedArtifacts = state.artifacts.filter(
        (a) => a.cursed && a.effect.active,
    );

    cursedArtifacts.forEach((artifact) => {
        const negativeType = artifact.negativeEffect?.type;
        const negativeValue = artifact.negativeEffect?.value ?? 0;

        if (!negativeType) return;

        const handler = CURSE_HANDLERS[negativeType];

        if (!handler) {
            // Эффект обрабатывается в другом месте
            return;
        }

        handler.process(state, set, get, artifact, negativeValue);
        handler.logMessage(artifact.name, negativeValue);
    });
};
