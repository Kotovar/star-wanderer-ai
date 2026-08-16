import { useGameStore } from "@/game/store";
import { getCrewDisplayName } from "@/game/crew/crewNames";
import { getTraitById } from "@/game/crew/generation";
import { getLivingShipCrew } from "@/game/crew/stationed";
import {
    DEFAULT_MAX_HEALTH,
    MUTATION_TRAITS,
    RACES,
    BONDING_TRAITS,
} from "@/game/constants";
import type {
    CrewMember,
    Profession,
    Quality,
} from "@/game/types";

export { getPilotInCockpit } from "./getPilotInCockpit";

export {
    generateCrewTraits,
    getRandomName,
    getTraitById,
} from "@/game/crew/generation";

/** Процент здоровья, ниже которого член экипажа считается критически раненым — вне зависимости от причины. */
const CRITICAL_CREW_HEALTH_PERCENT = 30;

/**
 * Член экипажа критически ранен прямо сейчас — неважно, почему (бой,
 * проклятый артефакт, болезнь): урон превышает лечение/регенерацию.
 * Не учитывает состояние приписанного модуля — см. isCrewAtRisk.
 */
export const isCrewHealthCritical = (crewMember: CrewMember): boolean =>
    crewMember.health > 0 &&
    (crewMember.health / (crewMember.maxHealth || DEFAULT_MAX_HEALTH)) * 100 <
        CRITICAL_CREW_HEALTH_PERCENT;

/**
 * Конвертирует случайное число [0, 1) в Quality.
 * Распределение: 25% poor / 35% average / 25% good / 15% excellent.
 */
export const rollQuality = (rand: number): Quality => {
    if (rand < 0.25) return "poor";
    if (rand < 0.6) return "average";
    if (rand < 0.85) return "good";
    return "excellent";
};

/**
 * Начисляет опыт всему экипажу.
 *
 * Обновляет значение опыта для каждого члена экипажа и опционально
 * добавляет запись в лог игры.
 *
 * @param expAmount - Количество опыта для начисления
 * @param logMessage - Опциональное сообщение для лога
 */
export const giveCrewExperience = (expAmount: number, logMessage?: string) => {
    const state = useGameStore.getState();

    const experience = state.crew.flatMap((crewMember) => {
        const result = useGameStore.getState().gainExp(crewMember, expAmount);
        return result
            ? [{ crewMemberId: crewMember.id, name: getCrewDisplayName(crewMember), amount: result.finalAmount }]
            : [];
    });

    if (logMessage) {
        useGameStore.getState().addLog(logMessage, "info");
    }

    return experience;
};

/**
 * Находит всех членов экипажа указанной профессии.
 *
 * @param crew - Массив экипажа для поиска
 * @param profession - Профессия для поиска
 * @returns Массив членов экипажа с указанной профессией
 */
export const getCrewByProfession = <T extends { profession: Profession }>(
    crew: T[],
    profession: Profession,
): T[] => crew.filter((c) => c.profession === profession);

/**
 * Даёт случайную мутацию члену экипажа (если у него ещё нет всех мутаций).
 * Возвращает название мутации или null если добавить некуда.
 */
export const giveRandomMutation = (
    crewMember: CrewMember,
    set: (
        fn: (s: { crew: CrewMember[] }) => Partial<{ crew: CrewMember[] }>,
    ) => void,
): string | null => {
    // Небиологические расы (canGetSick=false) не мутируют
    if (RACES[crewMember.race]?.canGetSick === false) return null;

    const existingIds = new Set(crewMember.traits.map((t) => t.id));
    const available = MUTATION_TRAITS.filter((id) => !existingIds.has(id));
    if (available.length === 0) return null;
    const newTraitId = available[Math.floor(Math.random() * available.length)];
    const newTrait = getTraitById(newTraitId);
    set((s) => ({
        crew: s.crew.map((c) => {
            if (c.id !== crewMember.id) return c;
            const updated = { ...c, traits: [...c.traits, newTrait] };
            // healthPenalty мутации реально снижает максимум здоровья
            const penalty = newTrait.effect?.healthPenalty;
            if (penalty) {
                const newMax = Math.max(
                    1,
                    Math.floor(updated.maxHealth * (1 - penalty)),
                );
                updated.maxHealth = newMax;
                updated.health = Math.min(updated.health, newMax);
            }
            return updated;
        }),
    }));
    return newTrait.name;
};

/**
 * Даёт члену экипажа случайный ещё не полученный бондинг-трейт (см.
 * BONDING_TRAITS) — вызывается только из crew_relation_bonding события.
 * Возвращает название трейта или null, если получать больше нечего.
 */
export const giveRandomBondingTrait = (
    crewMember: CrewMember,
    set: (
        fn: (s: { crew: CrewMember[] }) => Partial<{ crew: CrewMember[] }>,
    ) => void,
): string | null => {
    const existingIds = new Set(crewMember.traits.map((t) => t.id));
    const available = BONDING_TRAITS.filter((id) => !existingIds.has(id));
    if (available.length === 0) return null;
    const newTraitId = available[Math.floor(Math.random() * available.length)];
    const newTrait = getTraitById(newTraitId);
    set((s) => ({
        crew: s.crew.map((c) =>
            c.id === crewMember.id
                ? { ...c, traits: [...c.traits, newTrait] }
                : c,
        ),
    }));
    return newTrait.name;
};

/**
 * Лучший (по уровню) член экипажа заданной профессии
 */
export const getBestByProfession = (
    crew: CrewMember[],
    profession: Profession,
): CrewMember | undefined =>
    crew
        .filter((c) => c.profession === profession)
        .sort((a, b) => (b.level ?? 1) - (a.level ?? 1))[0];

/**
 * Максимальный уровень среди учёных, которые могут работать прямо сейчас:
 * живых и находящихся на борту (0, если таких нет). Используется для проверки
 * требований к исследованию аномалий/артефактов — раньше труп в отсеке и
 * учёный, приписанный к аванпосту за несколько секторов, засчитывались наравне
 * с работающим.
 */
export const getMaxScientistLevel = (crew: CrewMember[]): number => {
    const scientists = getLivingShipCrew(crew).filter(
        (c) => c.profession === "scientist",
    );
    return scientists.length > 0
        ? Math.max(...scientists.map((s) => s.level || 1))
        : 0;
};
