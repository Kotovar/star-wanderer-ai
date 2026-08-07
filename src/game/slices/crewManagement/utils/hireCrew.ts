import { getTechBonusSum } from "@/game/research";
import { store as i18nStore } from "@/lib/useTranslation";
import type {
    GameStore,
    CrewMember,
    HireCrewResult,
    RaceId,
    SetState,
} from "@/game/types";
import { playSound } from "@/sounds";
import { buildCrewMember } from "@/game/crew/buildCrewMember";
import { canHireRace } from "@/game/reputation/utils";
import { RACES } from "@/game/constants/races";
import { unlockSyntheticDroneIfEligible } from "@/game/metaProgress/store";

/**
 * Результат проверки возможности найма
 */
interface HireValidation {
    /** Можно ли нанять */
    canHire: boolean;
    /** Сообщение об ошибке */
    error?: string;
}

export const getOxygenHireWarning = (
    state: Pick<GameStore, "crew" | "getOxygenCapacity">,
    candidateRace: RaceId,
): Extract<HireCrewResult, { status: "oxygen_confirmation_required" }> | null => {
    if (!RACES[candidateRace].requiresOxygen) return null;

    const needed =
        state.crew.filter((member) => RACES[member.race].requiresOxygen)
            .length + 1;
    const capacity = state.getOxygenCapacity();
    return needed > capacity
        ? { status: "oxygen_confirmation_required", needed, capacity }
        : null;
};

/**
 * Проверяет возможность найма экипажа
 * @param state - Текущее состояние игры
 * @param price - Цена найма
 * @returns Результат проверки
 */
const validateHireCrew = (
    state: GameStore,
    price: number,
    race?: RaceId,
): HireValidation => {
    // Проверка цены
    if (isNaN(price) || price < 0) {
        return { canHire: false, error: i18nStore.t("game_logs.err_invalid_price") };
    }

    if (state.credits < price) {
        return { canHire: false, error: i18nStore.t("game_logs.err_no_credits") };
    }

    if (!canHireRace(state.raceReputation, race)) {
        return { canHire: false, error: i18nStore.t("game_logs.err_hostile_race") };
    }

    return { canHire: true };
};

/**
 * Наём члена экипажа
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 * @param crewData - Данные экипажа
 * @param locationId - ID локации (станции или корабля)
 * @param confirmOxygen - Игрок подтвердил риск нехватки кислорода
 */
export const hireCrew = (
    set: SetState,
    get: () => GameStore,
    crewData: Partial<CrewMember> & { price: number },
    locationId?: string,
    confirmOxygen = false,
): HireCrewResult => {
    const state = get();

    // Проверка возможности найма
    const validation = validateHireCrew(state, crewData.price, crewData.race);
    if (!validation.canHire) {
        if (validation.error) {
            get().addLog(validation.error, "error");
        }
        return "blocked";
    }

    const candidateRace = crewData.race ?? "human";
    const oxygenWarning = getOxygenHireWarning(state, candidateRace);
    if (oxygenWarning && !confirmOxygen) {
        return oxygenWarning;
    }

    // Поиск модуля жизнеобеспечения для начального размещения
    const lifesupportModule = state.ship.modules.find(
        (m) => m.type === "lifesupport",
    );
    const initialModuleId =
        lifesupportModule?.id || state.ship.modules[0]?.id || 1;

    const newCrew = buildCrewMember({
        name: crewData.name,
        race: crewData.race,
        profession: crewData.profession,
        level: crewData.level,
        traits: crewData.traits,
        exp: crewData.exp,
        // Сохраняем ветки прокачки, уже показанные игроку в превью кандидата
        // (см. generateStationCrew) — иначе они бы перевыбирались заново
        // случайно прямо здесь, расходясь с тем, что было на экране найма.
        techPerks: crewData.techPerks,
        moduleId: initialModuleId,
    });

    // Применяем crew_health бонус от исследований к новому члену экипажа
    const crewHealthBonus = getTechBonusSum(state.research, "crew_health");
    if (crewHealthBonus > 0) {
        newCrew.maxHealth = Math.floor(
            newCrew.maxHealth * (1 + crewHealthBonus),
        );
        newCrew.health = newCrew.maxHealth;
    }

    // Обновление состояния
    const hiredCrewKey = locationId || "unknown";

    set((s) => ({
        credits: s.credits - crewData.price,
        crew: [...s.crew, newCrew],
        hiredCrewFromShips: locationId
            ? [...s.hiredCrewFromShips, locationId]
            : s.hiredCrewFromShips,
        hiredCrew: {
            ...s.hiredCrew,
            [hiredCrewKey]: [
                ...(s.hiredCrew[hiredCrewKey] || []),
                newCrew.name,
            ],
        },
    }));

    if (unlockSyntheticDroneIfEligible(get().crew)) {
        get().addLog(i18nStore.t("game_logs.synthetic_drone_unlocked"), "info");
    }

    // Повышение репутации с расой за найм экипажа (+1~3 в зависимости от уровня)
    if (newCrew.race) {
        const reputationGain = Math.min(3, Math.max(1, newCrew.level || 1)); // +1~3 за уровень
        get().changeReputation(newCrew.race, reputationGain);
        get().addLog( i18nStore.t("game_logs.hireCrew_1", { value: getRaceName(newCrew.race), reputationGain }),
            "info",
        );
    }

    get().addLog( i18nStore.t("game_logs.hireCrew_2", { newCrew_name: newCrew.name, price: crewData.price }), "info");
    playSound("world_crew_milestone");
    return "hired";
};

/**
 * Получить название расы
 */
function getRaceName(raceId: string): string {
    return i18nStore.t(`races.${raceId}.plural`);
}
