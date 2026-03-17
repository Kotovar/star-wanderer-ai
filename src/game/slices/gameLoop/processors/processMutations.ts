import type {
    CrewTrait,
    GameState,
    GameStore,
    MutationTraitId,
    SetState,
} from "@/game/types";
import { typedKeys } from "@/lib";

type MutationConfig = {
    name: string;
    /** Снижение счастья за ход. 0 = нет эффекта по умолчанию. */
    happinessDrain: number;
    logTemplate: string;
    randomRange?: { min: number; max: number };
};

/**
 * Конфигурация per-turn эффектов мутаций.
 * Мутации без реализации имеют happinessDrain: 0 — processMutations их пропускает.
 */
const MUTATION_CONFIG: Record<MutationTraitId, MutationConfig> = {
    // === Поведенческие (per-turn эффекты) ===
    nightmares: {
        name: "Кошмары",
        happinessDrain: 10,
        logTemplate: "-{value} счастья",
    },
    paranoid: {
        name: "Паранойя",
        happinessDrain: 15,
        logTemplate: "-{value} счастья",
    },
    unstable: {
        name: "Нестабильность",
        happinessDrain: 0,
        logTemplate: "{value} счастья",
        randomRange: { min: -20, max: 10 },
    },

    // === Физические (эффект в trait.effect, per-turn — нет) ===
    tentacles:    { name: "Щупальца",    happinessDrain: 0, logTemplate: "" },
    third_eye:    { name: "Третий глаз", happinessDrain: 0, logTemplate: "" },
    chitin:       { name: "Хитин",       happinessDrain: 0, logTemplate: "" },
    telepathy:    { name: "Телепатия",   happinessDrain: 0, logTemplate: "" },
    regeneration: { name: "Регенерация", happinessDrain: 0, logTemplate: "" },
    photosynthesis: { name: "Фотосинтез", happinessDrain: 0, logTemplate: "" },
};

const HAPPINESS_MIN = 0;
const HAPPINESS_MAX = 100;

type MutationEffect = {
    id: MutationTraitId;
    name: string;
    effect: (happiness: number) => {
        happiness: number;
        log: string;
        skipLog?: boolean;
    };
};

const createMutationEffect = (id: MutationTraitId): MutationEffect["effect"] => {
    const config = MUTATION_CONFIG[id];

    // Мутация без per-turn эффекта — пропускаем
    if (config.happinessDrain === 0 && !config.randomRange) {
        return (happiness) => ({ happiness, log: "", skipLog: true });
    }

    return (happiness) => {
        let newHappiness = happiness;
        let logValue: number;

        if (config.randomRange) {
            const range = config.randomRange.max - config.randomRange.min + 1;
            const randomChange =
                Math.floor(Math.random() * range) + config.randomRange.min;
            newHappiness = happiness + randomChange;
            logValue = randomChange;
        } else {
            newHappiness = happiness - config.happinessDrain;
            logValue = config.happinessDrain;
        }

        newHappiness = Math.max(HAPPINESS_MIN, Math.min(HAPPINESS_MAX, newHappiness));

        let log = config.logTemplate.replace("{value}", String(logValue));
        if (config.randomRange && logValue > 0) {
            log = "+" + log;
        }

        return {
            happiness: newHappiness,
            log,
            skipLog: config.randomRange && logValue === 0,
        };
    };
};

const MUTATION_EFFECTS: MutationEffect[] = typedKeys(MUTATION_CONFIG).map(
    (id) => ({
        id,
        name: MUTATION_CONFIG[id].name,
        effect: createMutationEffect(id),
    }),
);

/** Проверяет, является ли трейт мутацией с per-turn эффектом, и возвращает её ID. */
const getMutationId = (trait: CrewTrait): MutationTraitId | null => {
    if (trait.id && trait.id in MUTATION_CONFIG) {
        return trait.id as MutationTraitId;
    }
    return null;
};

/**
 * Обработка per-turn эффектов мутаций экипажа.
 *
 * - Кошмары (nightmares): -10 счастья/ход
 * - Паранойя (paranoid): -15 счастья/ход
 * - Нестабильность (unstable): случайное изменение счастья (-20..+10)
 * - Остальные мутации: пропускаются (их эффекты в trait.effect)
 */
export const processMutations = (
    state: GameState,
    set: SetState,
    get: () => GameStore,
): void => {
    const updates = new Map<number, { happiness: number; logs: string[] }>();

    state.crew.forEach((crewMember) => {
        crewMember.traits.forEach((trait) => {
            const mutationId = getMutationId(trait);
            if (!mutationId) return;

            const mutation = MUTATION_EFFECTS.find((m) => m.id === mutationId);
            if (!mutation) return;

            const result = mutation.effect(crewMember.happiness);
            if (result.skipLog) return;

            const existingUpdate = updates.get(crewMember.id);
            if (!existingUpdate) {
                updates.set(crewMember.id, {
                    happiness: crewMember.happiness,
                    logs: [],
                });
            }

            const update = updates.get(crewMember.id);
            if (!update) return;

            update.happiness = result.happiness;
            update.logs.push(
                `⚠️ ${crewMember.name}: Мутация ${mutation.name} ${result.log}`,
            );
        });
    });

    if (updates.size > 0) {
        set((s) => ({
            crew: s.crew.map((c) => {
                const update = updates.get(c.id);
                if (!update) return c;
                return { ...c, happiness: update.happiness };
            }),
        }));

        updates.forEach((update) => {
            update.logs.forEach((log) => {
                get().addLog(log, "warning");
            });
        });
    }
};
