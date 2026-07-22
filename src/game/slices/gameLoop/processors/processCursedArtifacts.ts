import { store as i18nStore } from "@/lib/useTranslation";
import type {
    GameState,
    GameStore,
    SetState,
    ArtifactNegativeType,
} from "@/game/types";
import { giveRandomMutation, shiftHappiness } from "@/game/crew";

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
}

/**
 * Обработчики проклятых эффектов (каждый логирует сам)
 */
const CURSE_HANDLERS: Record<ArtifactNegativeType, CurseHandler | undefined> = {
    happiness_drain: { process: applyStatDrain },
    module_damage: { process: applyModuleDamage },
    crew_desertion: { process: applyCrewDesertion },
    crew_mutation: { process: applyCrewMutation },
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
    get: () => GameStore,
    artifact: { name: string },
    value: number,
) {
    set((s) => ({
        crew: s.crew.map((c) => shiftHappiness(c, -value)),
    }));
    get().addLog( i18nStore.t("game_logs.processCursedArtifacts_1", { artifact_name: artifact.name, value }),
        "warning",
    );
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

    get().addLog( i18nStore.t("game_logs.processCursedArtifacts_2", { artifact_name: artifact.name, targetModule_name: targetModule.name, value }),
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
            get().addLog( i18nStore.t("game_logs.processCursedArtifacts_3", { artifact_name: artifact.name, crewMember_name: crewMember.name }),
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
            const mutationName = giveRandomMutation(crewMember, set);
            if (mutationName) {
                get().addLog( i18nStore.t("game_logs.processCursedArtifacts_4", { artifact_name: artifact.name, crewMember_name: crewMember.name, mutationName }),
                    "warning",
                );
            }
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
    });
};
