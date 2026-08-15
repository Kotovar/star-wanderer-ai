import type { CrewBuildOptions } from "@/game/crew/buildCrewMember";
import { isHardwareCrew, shiftHappiness } from "@/game/crew/happiness";
import type { CrewMember, CrewUpkeepReport } from "@/game/types";

/**
 * Жалованье экипажу: единственная обязательная трата, привязанная к ходу.
 *
 * Раз в период, а не каждый ход — списание видно как событие, а не как шум
 * в логе, и до выплаты можно показать обратный отсчёт.
 */

/** Раз во сколько ходов начисляется жалованье */
export const UPKEEP_INTERVAL = 50;

/** Базовое жалованье одного члена экипажа за период */
const BASE_WAGE = 50;

/** Прибавка за каждый уровень выше первого */
const WAGE_PER_LEVEL = 25;

/** Синтетикам нужны запчасти, а не паёк */
const SYNTHETIC_WAGE_MULTIPLIER = 0.5;

/** Прибавка к настроению органиков за полностью выплаченный период */
export const PAID_HAPPINESS_BONUS = 5;

/** Падение настроения органиков, когда жалованье выплачено не полностью */
export const UNPAID_HAPPINESS_PENALTY = 10;

/**
 * Урон синтетикам при недоплате: эмоций у них нет, зато есть износ.
 * Без денег не закуплены запчасти — тот же принцип, что при перенаселённости.
 */
export const UNPAID_HARDWARE_DAMAGE = 5;

/** Всё, что нужно для расчёта жалованья: уровень и раса */
type WageInput = Pick<CrewMember, "level" | "race">;

/** Жалованье одного члена экипажа за период */
export const getMemberWage = (member: WageInput): number => {
    const level = Math.max(1, member.level ?? 1);
    const wage = BASE_WAGE + WAGE_PER_LEVEL * (level - 1);
    return Math.round(
        wage * (member.race === "synthetic" ? SYNTHETIC_WAGE_MULTIPLIER : 1),
    );
};

/**
 * Жалованье всему экипажу за период.
 * Приписанные к аванпостам тоже получают: они остаются в `state.crew`.
 */
export const getCrewUpkeep = (crew: readonly CrewMember[]): number =>
    crew.reduce((sum, member) => sum + getMemberWage(member), 0);

/**
 * Оценка жалованья по стартовому шаблону — экипажа ещё не существует,
 * известны только опции сборки. Случайные раса и уровень считаются
 * по нижней границе: это оценка «не меньше чем».
 */
export const getTemplateCrewUpkeep = (
    crew: readonly CrewBuildOptions[],
): number =>
    crew.reduce((sum, options) => {
        const level = Array.isArray(options.level)
            ? options.level[0]
            : (options.level ?? 1);
        const race =
            options.race && options.race !== "random" ? options.race : "human";
        return sum + getMemberWage({ level, race });
    }, 0);

/** Сколько ходов осталось до ближайшей выплаты (1..UPKEEP_INTERVAL) */
export const getTurnsUntilUpkeep = (turn: number): number =>
    UPKEEP_INTERVAL - (turn % UPKEEP_INTERVAL);

/**
 * Закрывает расчётный период: сколько списать и как это встретит экипаж.
 *
 * Выплатили — органики довольны, синтетикам закуплены запчасти.
 * Не хватило — органики теряют настроение (дальше обычное дезертирство),
 * а синтетики изнашиваются: эмоций у них нет, иначе долг им ничего не стоил бы.
 */
export const settleUpkeep = (
    crew: readonly CrewMember[],
    credits: number,
    turn: number,
): { crew: CrewMember[]; report: CrewUpkeepReport } => {
    const due = getCrewUpkeep(crew);
    const paid = Math.min(credits, due);
    const fullyPaid = paid >= due;

    return {
        crew: crew.map((member) => {
            if (fullyPaid) return shiftHappiness(member, PAID_HAPPINESS_BONUS);
            if (isHardwareCrew(member)) {
                return {
                    ...member,
                    health: Math.max(0, member.health - UNPAID_HARDWARE_DAMAGE),
                };
            }
            return shiftHappiness(member, -UNPAID_HAPPINESS_PENALTY);
        }),
        report: {
            turn,
            due,
            paid,
            creditsLeft: credits - paid,
            happinessChange: fullyPaid
                ? PAID_HAPPINESS_BONUS
                : -UNPAID_HAPPINESS_PENALTY,
            hardwareDamage: fullyPaid ? 0 : UNPAID_HARDWARE_DAMAGE,
            organicCount: crew.filter((member) => !isHardwareCrew(member)).length,
            syntheticCount: crew.filter(isHardwareCrew).length,
        },
    };
};
