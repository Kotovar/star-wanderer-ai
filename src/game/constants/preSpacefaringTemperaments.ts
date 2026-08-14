import type { Goods } from "@/game/types/goods";
import type {
    PreSpacefaringDevelopment,
    PreSpacefaringOutcome,
    PreSpacefaringTemperament,
} from "@/game/types/planets";
import type { ResearchResourceType } from "@/game/types/research";

export const PRE_SPACEFARING_TEMPERAMENTS: readonly PreSpacefaringTemperament[] =
    ["insular", "curious", "devout", "martial", "waning"] as const;

/**
 * Что цивилизация принимает в дар на шаге 1. `null` — не принимает ничего:
 * у замкнутых дар не отвергается вежливо, его просто не существует как хода.
 */
export const TEMPERAMENT_GIFT: Record<
    PreSpacefaringTemperament,
    { id: Goods; quantity: number } | null
> = {
    insular: null,
    curious: { id: "electronics", quantity: 1 },
    devout: { id: "rare_minerals", quantity: 1 },
    martial: { id: "spares", quantity: 2 },
    waning: { id: "medicine", quantity: 2 },
};

/**
 * Множитель выплаты по паре «характер × исход». `null` — исход недоступен.
 *
 * Таблица — единственный источник правды и о размере, и о доступности:
 * список вариантов шага 2 выводится из неё, поэтому рассинхрона между
 * «вариант показан» и «вариант что-то даёт» быть не может.
 *
 * У каждого характера ровно один лучший исход. Замкнутых надо оставить в
 * покое, любопытных взять в партнёры, верующих оставить под покровительством,
 * воинственных вооружить, угасающих спасти. ×0.25 у воинственных за
 * заповедник — не штраф за жадность, а следствие: предоставленные себе, они
 * друг друга уничтожат.
 */
export const TEMPERAMENT_OUTCOME_MULTIPLIER: Record<
    PreSpacefaringTemperament,
    Record<PreSpacefaringOutcome, number | null>
> = {
    insular: { protected: 1.5, assisted: 0.5, partnered: null, exploited: 1.0 },
    curious: { protected: 1.0, assisted: 1.0, partnered: 1.5, exploited: 1.25 },
    devout: { protected: 1.5, assisted: 1.0, partnered: 1.0, exploited: 1.25 },
    martial: { protected: 0.25, assisted: 1.5, partnered: 0.75, exploited: 1.25 },
    waning: { protected: null, assisted: 2.0, partnered: 0.5, exploited: 1.5 },
};

/** Насколько развитый мир щедрее первобытного */
export const DEVELOPMENT_MULTIPLIER: Record<PreSpacefaringDevelopment, number> =
    {
        primitive: 1,
        agrarian: 1.25,
        industrial: 1.5,
        modern: 2,
    };

/** Чем мир вообще способен поделиться на своём уровне */
export const DEVELOPMENT_RESOURCES: Record<
    PreSpacefaringDevelopment,
    readonly ResearchResourceType[]
> = {
    primitive: ["alien_biology"],
    agrarian: ["alien_biology", "ancient_data"],
    industrial: ["tech_salvage", "rare_minerals"],
    modern: ["energy_samples", "tech_salvage"],
};

/** Базовые величины до множителей. */
export const OUTCOME_BASE_UNITS: Record<PreSpacefaringOutcome, number> = {
    protected: 10,
    assisted: 5,
    partnered: 1,
    exploited: 8,
};

/** Наблюдение шага 0 — знакомство, а не выдача: одна единица независимо от всего */
export const OBSERVE_UNITS = 1;

/** Дар на шаге 1 не даёт ничего сразу, он повышает финальную выплату */
export const GIFT_MULTIPLIER = 1.25;

/** Кредиты за эксплуатацию — до множителей уровня и характера */
export const EXPLOIT_BASE_CREDITS = 1500;

/** Сроки одинаковы для всех характеров и уровней. */
export const PROTECTED_MATURATION_TURNS = 28;
export const PARTNER_SHARE_INTERVAL_TURNS = 6;

/** Потолок накопления долей. */
export const PARTNER_SHARE_CAP = 6;
