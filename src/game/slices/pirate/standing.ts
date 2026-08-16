/**
 * Репутация с пиратами — то, чего у чёрного рынка не было вовсе, хотя у каждой
 * легальной станции есть раса и отношения с ней. Доска, цены и трофеи не
 * различали первый заказ и двадцатый.
 *
 * Модуль намеренно чистый: его читают и слайсы, и интерфейс, и чек-скрипты.
 */

/** Прибавка за сданное пиратское задание */
export const PIRATE_STANDING_PER_CONTRACT = 10;

/**
 * Потеря за просроченное. Больше прибавки: у пиратов подвести с заказом
 * дороже, чем выполнить его — заслужить доверие медленнее, чем потерять.
 */
export const PIRATE_STANDING_ON_EXPIRY = 15;

/** Порог, с которого пираты считают тебя своим */
export const PIRATE_RANK_ASSOCIATE = 30;

/** Порог, с которого ты подельник и получаешь лучшие условия */
export const PIRATE_RANK_INSIDER = 70;

export type PirateRank = "outsider" | "associate" | "insider";

/**
 * Поле новое, и в сейвах до его появления его просто нет. Каждый читатель
 * ставит `?? 0`, но одного пропущенного хватило бы, чтобы NaN разошёлся по
 * всем ценам — поэтому нечисло гасится здесь, в основании шкалы.
 */
export const clampPirateStanding = (standing: number): number =>
    Number.isFinite(standing)
        ? Math.max(0, Math.min(100, Math.round(standing)))
        : 0;

export const getPirateRank = (standing: number): PirateRank =>
    standing >= PIRATE_RANK_INSIDER
        ? "insider"
        : standing >= PIRATE_RANK_ASSOCIATE
          ? "associate"
          : "outsider";

/** Доля пути от чужака до подельника: единый источник для всех льгот */
const getStandingProgress = (standing: number): number =>
    clampPirateStanding(standing) / 100;

/** Насколько подельник получает больше за задание, чем чужак (до +50%) */
const CONTRACT_REWARD_BONUS = 0.5;

/**
 * Награда за пиратское задание с учётом репутации. Считается и при показе
 * доски, и при выплате: расхождение показанной и начисленной суммы — ровно
 * тот класс багов, что уже ловили на ценах чёрного рынка.
 */
export const getPirateContractReward = (
    reward: number,
    standing: number,
): number =>
    Math.floor(reward * (1 + getStandingProgress(standing) * CONTRACT_REWARD_BONUS));

/** Базовая цена трофея для чужака: и так дешевле любой легальной скидки */
export const TROPHY_BASE_PRICE_MULTIPLIER = 0.55;

/** Сколько от неё скидывает полная репутация */
const TROPHY_STANDING_DISCOUNT = 0.15;

/** Множитель цены трофейного склада: 0.55 у чужака → 0.40 у подельника */
export const getTrophyPriceMultiplier = (standing: number): number =>
    TROPHY_BASE_PRICE_MULTIPLIER -
    getStandingProgress(standing) * TROPHY_STANDING_DISCOUNT;

/** Сколько розыска снимает одна отмывка в «Приюте контрабандистов» */
export const LAUNDERING_HEAT = 15;

const LAUNDERING_BASE_COST = 500;

/** Сколько от цены отмывки скидывает полная репутация */
const LAUNDERING_STANDING_DISCOUNT = 0.4;

/** Цена отмывки: 500₢ у чужака → 300₢ у подельника */
export const getLaunderingCost = (standing: number): number =>
    Math.round(
        LAUNDERING_BASE_COST *
            (1 - getStandingProgress(standing) * LAUNDERING_STANDING_DISCOUNT),
    );
