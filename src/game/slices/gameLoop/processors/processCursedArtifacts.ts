import { store as i18nStore } from "@/lib/useTranslation";
import { getCrewDisplayName } from "@/game/crew/crewNames";
import type {
    GameState,
    GameStore,
    SetState,
    ArtifactNegativeType,
} from "@/game/types";
import {
    getLivingShipCrew,
    giveRandomMutation,
    shiftHappiness,
} from "@/game/crew";
import { getArtifactNegativeEffects, changeHealthByPercent } from "@/game/artifacts";
import { showHintOnce } from "@/game/hints/showHint";

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
    state: GameState,
    set: SetState,
    get: () => GameStore,
    artifact: { name: string },
    value: number,
) {
    const affected = new Set(getLivingShipCrew(state.crew).map((c) => c.id));
    if (affected.size === 0) return;

    set((s) => ({
        crew: s.crew.map((c) =>
            affected.has(c.id) ? shiftHappiness(c, -value) : c,
        ),
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

    // value — проценты от максимума модуля; проклятие не добивает его до нуля
    set((s) => ({
        ship: {
            ...s.ship,
            modules: s.ship.modules.map((m, i) =>
                i === randomModuleIdx
                    ? { ...m, health: changeHealthByPercent(m, -value, 1) }
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
    getLivingShipCrew(state.crew).forEach((crewMember) => {
        if (Math.random() * 100 < value) {
            set((s) => ({
                crew: s.crew.filter((c) => c.id !== crewMember.id),
            }));
            get().addLog( i18nStore.t("game_logs.processCursedArtifacts_3", { artifact_name: artifact.name, crewMember_name: getCrewDisplayName(crewMember) }),
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
    getLivingShipCrew(state.crew).forEach((crewMember) => {
        if (Math.random() * 100 < value) {
            const mutationName = giveRandomMutation(crewMember, set);
            if (mutationName) {
                get().addLog( i18nStore.t("game_logs.processCursedArtifacts_4", { artifact_name: artifact.name, crewMember_name: getCrewDisplayName(crewMember), mutationName }),
                    "warning",
                );
                showHintOnce(get().addLog, "first_mutation", "hints.first_mutation");
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
        // Оба поля разом: раньше читалось только `negativeEffect`, и эффект,
        // положенный в массив `negativeEffects`, здесь молча пропадал
        getArtifactNegativeEffects(artifact).forEach((negative) => {
            // Отсутствие обработчика значит, что эффект применяется в другом
            // месте (засады — в signals, самоурон — после боя, и т.д.)
            CURSE_HANDLERS[negative.type]?.process(
                state,
                set,
                get,
                artifact,
                negative.value ?? 0,
            );
        });
    });
};
