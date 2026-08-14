import {
    DEVELOPMENT_MULTIPLIER,
    DEVELOPMENT_RESOURCES,
    EXPLOIT_BASE_CREDITS,
    GIFT_MULTIPLIER,
    OUTCOME_BASE_UNITS,
    PARTNER_SHARE_CAP,
    PARTNER_SHARE_INTERVAL_TURNS,
    PROTECTED_MATURATION_TURNS,
    TEMPERAMENT_OUTCOME_MULTIPLIER,
} from "@/game/constants/preSpacefaringTemperaments";
import { patchLocation } from "@/game/utils/patchLocation";
import { store as i18nStore } from "@/lib/useTranslation";
import type {
    GameStore,
    PreSpacefaringContact,
    PreSpacefaringDevelopment,
    PreSpacefaringOutcome,
    PreSpacefaringTemperament,
    ResearchResourceType,
    SetState,
} from "@/game/types";

export type PreSpacefaringWorldStatus =
    | "unresolved"
    | "growing"
    | "matured"
    | "dependent"
    | "partner"
    | "collapsed";

export interface PreSpacefaringWorldState {
    status: PreSpacefaringWorldStatus;
    claimable: { type: ResearchResourceType; quantity: number }[];
    turnsUntilMaturity?: number;
}

/**
 * Сколько единиц даёт исход. `null` — исход недоступен этому характеру.
 * Для партнёрства это размер одной доли, а не итог.
 */
export function getPreSpacefaringPayoutUnits(
    development: PreSpacefaringDevelopment,
    temperament: PreSpacefaringTemperament,
    outcome: PreSpacefaringOutcome,
    giftGiven: boolean,
): number | null {
    const temperamentMultiplier =
        TEMPERAMENT_OUTCOME_MULTIPLIER[temperament][outcome];
    if (temperamentMultiplier === null) return null;
    return Math.max(
        1,
        Math.round(
            OUTCOME_BASE_UNITS[outcome] *
                DEVELOPMENT_MULTIPLIER[development] *
                temperamentMultiplier *
                (giftGiven ? GIFT_MULTIPLIER : 1),
        ),
    );
}

/** Делит выплату по типам ресурсов уровня; остаток уходит первому типу */
export function splitPayoutUnits(
    development: PreSpacefaringDevelopment,
    units: number,
): { type: ResearchResourceType; quantity: number }[] {
    if (units <= 0) return [];
    const types = DEVELOPMENT_RESOURCES[development];
    if (types.length === 1) return [{ type: types[0], quantity: units }];
    const second = Math.floor(units / 2);
    return [
        { type: types[0], quantity: units - second },
        { type: types[1], quantity: second },
    ];
}

/** Кредиты платит только эксплуатация — за вывезенное, а не за отношения */
export function getPreSpacefaringCredits(
    development: PreSpacefaringDevelopment,
    temperament: PreSpacefaringTemperament,
    outcome: PreSpacefaringOutcome,
): number {
    if (outcome !== "exploited") return 0;
    const temperamentMultiplier =
        TEMPERAMENT_OUTCOME_MULTIPLIER[temperament].exploited;
    if (temperamentMultiplier === null) return 0;
    return Math.round(
        EXPLOIT_BASE_CREDITS *
            DEVELOPMENT_MULTIPLIER[development] *
            temperamentMultiplier,
    );
}

/** Текущее состояние мира без записи в состояние и без тика галактики. */
export function resolvePreSpacefaringState(
    contact: PreSpacefaringContact,
    currentTurn: number,
): PreSpacefaringWorldState {
    if (contact.step !== 3 || !contact.outcome) {
        return { status: "unresolved", claimable: [] };
    }
    const { outcome, development, temperament } = contact;
    if (outcome === "assisted") return { status: "dependent", claimable: [] };
    if (outcome === "exploited") return { status: "collapsed", claimable: [] };

    const pendingStatus: PreSpacefaringWorldStatus =
        outcome === "partnered" ? "partner" : "growing";
    if (contact.resolvedAtTurn === undefined) {
        return { status: pendingStatus, claimable: [] };
    }

    const perPayout = getPreSpacefaringPayoutUnits(
        development,
        temperament,
        outcome,
        contact.giftGiven === true,
    );
    if (perPayout === null) return { status: pendingStatus, claimable: [] };

    if (outcome === "protected") {
        if (contact.lastClaimTurn !== undefined) {
            return { status: "matured", claimable: [] };
        }
        const elapsed = currentTurn - contact.resolvedAtTurn;
        if (elapsed < PROTECTED_MATURATION_TURNS) {
            return {
                status: "growing",
                claimable: [],
                turnsUntilMaturity: PROTECTED_MATURATION_TURNS - elapsed,
            };
        }
        return {
            status: "matured",
            claimable: splitPayoutUnits(development, perPayout),
        };
    }

    const since = contact.lastClaimTurn ?? contact.resolvedAtTurn;
    const shares = Math.min(
        Math.floor((currentTurn - since) / PARTNER_SHARE_INTERVAL_TURNS),
        PARTNER_SHARE_CAP,
    );
    return {
        status: "partner",
        claimable:
            shares > 0 ? splitPayoutUnits(development, perPayout * shares) : [],
    };
}

/**
 * Переносит накопленное в ресурсы. Ход не тратится: это вывоз, а не
 * решение, — так же устроен сбор с аутпоста (`collectOutpost.ts`).
 */
export function claimPreSpacefaringYield(
    planetId: string,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const location = state.currentLocation;
    if (!location || location.id !== planetId) return;
    const contact = location.preSpacefaringContact;
    if (!contact) return;

    const world = resolvePreSpacefaringState(contact, state.turn);
    if (world.claimable.length === 0) return;

    set((draft) => ({
        research: {
            ...draft.research,
            resources: world.claimable.reduce(
                (resources, entry) => ({
                    ...resources,
                    [entry.type]: (resources[entry.type] ?? 0) + entry.quantity,
                }),
                draft.research.resources,
            ),
        },
        ...patchLocation(draft, planetId, {
            preSpacefaringContact: {
                ...contact,
                lastClaimTurn: draft.turn,
            },
        }),
    }));
    get().addLog(i18nStore.t("game_logs.pre_spacefaring_yield_claimed"), "info");
    get().saveGame();
}
