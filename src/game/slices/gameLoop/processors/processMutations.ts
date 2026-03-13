import type {
    GameState,
    GameStore,
    MutationName,
    SetState,
} from "@/game/types";
import { typedKeys } from "@/lib";

/**
 * Конфигурация эффектов мутаций
 */
const MUTATION_CONFIG: Record<
    MutationName,
    {
        name: string;
        happinessDrain: number;
        logTemplate: string;
        randomRange?: { min: number; max: number };
    }
> = {
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
};

/**
 * Границы счастья
 */
const HAPPINESS_MIN = 0;
const HAPPINESS_MAX = 100;

type MutationEffect = {
    id: MutationName;
    name: string;
    effect: (happiness: number) => {
        happiness: number;
        log: string;
        skipLog?: boolean;
    };
};

/**
 * Создаёт функцию эффекта мутации на основе конфигурации
 */
const createMutationEffect = (id: MutationName): MutationEffect["effect"] => {
    const config = MUTATION_CONFIG[id];

    return (happiness) => {
        let newHappiness = happiness;
        let logValue: number;

        if (config.randomRange) {
            // Нестабильность: случайное изменение
            const range = config.randomRange.max - config.randomRange.min + 1;
            const randomChange =
                Math.floor(Math.random() * range) + config.randomRange.min;
            newHappiness = happiness + randomChange;
            logValue = randomChange;
        } else {
            // Кошмары/Паранойя: фиксированное снижение
            newHappiness = happiness - config.happinessDrain;
            logValue = config.happinessDrain;
        }

        // Применяем границы
        newHappiness = Math.max(
            HAPPINESS_MIN,
            Math.min(HAPPINESS_MAX, newHappiness),
        );

        // Форматируем лог
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

/**
 * Конфигурация эффектов мутаций
 */
const MUTATION_EFFECTS: MutationEffect[] = typedKeys(MUTATION_CONFIG).map(
    (id) => ({
        id,
        name: MUTATION_CONFIG[id].name,
        effect: createMutationEffect(id),
    }),
);

/**
 * Проверяет, является ли трейт мутацией, и возвращает её ID
 */
const getMutationId = (traitName: string): string | null => {
    if (!traitName.startsWith("Мутация:")) return null;
    const mutation = MUTATION_EFFECTS.find((m) => traitName.includes(m.name));
    return mutation?.id ?? null;
};

/**
 * Обработка мутаций экипажа
 *
 * Применяет негативные эффекты мутаций каждый ход:
 * - Кошмары (nightmares) -10 счастья
 * - Паранойя (paranoid) -15 счастья
 * - Нестабильность (unstable) - случайное изменение счастья (-20..+10)
 *
 * @param state - Текущее состояние игры
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const processMutations = (
    state: GameState,
    set: SetState,
    get: () => GameStore,
): void => {
    const updates = new Map<number, { happiness: number; logs: string[] }>();

    // Собираем все изменения
    state.crew.forEach((crewMember) => {
        crewMember.traits.forEach((trait) => {
            const mutationId = getMutationId(trait.name);
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

    // Применяем все изменения одним batch
    if (updates.size > 0) {
        set((s) => ({
            crew: s.crew.map((c) => {
                const update = updates.get(c.id);
                if (!update) return c;
                return { ...c, happiness: update.happiness };
            }),
        }));

        // Логируем все эффекты
        updates.forEach((update) => {
            update.logs.forEach((log) => {
                get().addLog(log, "warning");
            });
        });
    }
};
