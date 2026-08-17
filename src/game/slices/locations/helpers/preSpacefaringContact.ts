import {
    getPreSpacefaringActions,
    getPreSpacefaringCivilization,
    OBSERVE_UNITS,
} from "@/game/constants";
import type {
    GameStore,
    Goods,
    Location,
    Outpost,
    PreSpacefaringAction,
    PreSpacefaringActionStep,
    PreSpacefaringContact,
    ResearchResourceType,
    SetState,
    TradeGood,
} from "@/game/types";
import { patchLocation } from "@/game/utils/patchLocation";
import { store as i18nStore } from "@/lib/useTranslation";
import {
    getPreSpacefaringCredits,
    getPreSpacefaringPayoutUnits,
    splitPayoutUnits,
} from "./preSpacefaringState";

export type PreSpacefaringContactActionBlocker =
    | "wrong_location"
    | "no_contact"
    | "already_complete"
    | "step_mismatch"
    | "invalid_action"
    | "base_present"
    | "missing_goods";

export interface PreSpacefaringContactSummary {
    actionIds: string[];
    goodsSpent: Partial<Record<Goods, number>>;
    researchReceived: Partial<Record<ResearchResourceType, number>>;
    turnsSpent: number;
}

/**
 * Что действие приносит игроку прямо сейчас. Наблюдение — знакомство,
 * дар — вложение без немедленной отдачи, исход — расчёт по таблицам.
 */
export function getPreSpacefaringActionReward(
    contact: Pick<PreSpacefaringContact, "development" | "temperament">,
    action: PreSpacefaringAction,
    giftGiven: boolean,
): { resources: { type: ResearchResourceType; quantity: number }[]; credits: number } {
    if (action.step === 0) {
        return {
            resources: splitPayoutUnits(contact.development, OBSERVE_UNITS),
            credits: 0,
        };
    }
    if (action.step === 1 || !action.outcome) {
        return { resources: [], credits: 0 };
    }
    // Заповедник и партнёрство платят потом — их выдаёт claim, не этот шаг.
    if (action.outcome === "protected" || action.outcome === "partnered") {
        return { resources: [], credits: 0 };
    }
    const units = getPreSpacefaringPayoutUnits(
        contact.development,
        contact.temperament,
        action.outcome,
        giftGiven,
    );
    return {
        resources: units === null ? [] : splitPayoutUnits(contact.development, units),
        credits: getPreSpacefaringCredits(
            contact.development,
            contact.temperament,
            action.outcome,
        ),
    };
}

export function getPreSpacefaringContactSummary(
    contact: PreSpacefaringContact,
): PreSpacefaringContactSummary {
    const actions = (contact.actionHistory ?? []).flatMap((actionId) => {
        for (const step of [0, 1, 2] as const) {
            const action = getPreSpacefaringActions(
                contact.temperament,
                step,
            ).find((entry) => entry.id === actionId);
            if (action) return [action];
        }
        return [];
    });
    const goodsSpent: Partial<Record<Goods, number>> = {};
    const researchReceived: Partial<Record<ResearchResourceType, number>> = {};

    for (const action of actions) {
        if (action.requiredGood) {
            goodsSpent[action.requiredGood.id] =
                (goodsSpent[action.requiredGood.id] ?? 0) +
                action.requiredGood.quantity;
        }
        const reward = getPreSpacefaringActionReward(
            contact,
            action,
            contact.giftGiven === true,
        );
        for (const entry of reward.resources) {
            researchReceived[entry.type] =
                (researchReceived[entry.type] ?? 0) + entry.quantity;
        }
    }

    return {
        actionIds: actions.map((action) => action.id),
        goodsSpent,
        researchReceived,
        turnsSpent: actions.length,
    };
}

const hasRequiredGood = (
    goods: TradeGood[],
    required: { id: string; quantity: number } | undefined,
) =>
    !required ||
    (goods.find((good) => good.item === required.id)?.quantity ?? 0) >=
        required.quantity;

const spendTradeGood = (
    goods: TradeGood[],
    required: { id: string; quantity: number },
) =>
    goods.flatMap((good) => {
        if (good.item !== required.id) return [good];
        const quantity = good.quantity - required.quantity;
        return quantity > 0 ? [{ ...good, quantity }] : [];
    });

export function getPreSpacefaringContactActionBlocker(
    planetId: string,
    currentLocation: Location | null,
    outposts: Outpost[],
    tradeGoods: TradeGood[],
    actionId: string,
    expectedStep: PreSpacefaringActionStep,
): PreSpacefaringContactActionBlocker | null {
    if (
        !currentLocation ||
        currentLocation.id !== planetId ||
        currentLocation.type !== "planet" ||
        !currentLocation.isEmpty
    ) {
        return "wrong_location";
    }
    const contact = currentLocation.preSpacefaringContact;
    if (!contact) return "no_contact";
    if (contact.step === 3) return "already_complete";
    if (contact.step !== expectedStep) return "step_mismatch";
    if (
        currentLocation.outpostId ||
        outposts.some((outpost) => outpost.locationId === planetId)
    ) {
        return "base_present";
    }

    const civilization = getPreSpacefaringCivilization(contact.civilizationId);
    const action = getPreSpacefaringActions(
        contact.temperament,
        expectedStep,
    ).find((entry) => entry.id === actionId);
    if (
        !civilization ||
        !action ||
        civilization.development !== contact.development ||
        civilization.temperament !== contact.temperament
    ) {
        return "invalid_action";
    }
    return hasRequiredGood(tradeGoods, action.requiredGood)
        ? null
        : "missing_goods";
}

export function advancePreSpacefaringContact(
    planetId: string,
    actionId: string,
    expectedStep: PreSpacefaringActionStep,
    set: SetState,
    get: () => GameStore,
): void {
    const state = get();
    const blocker = getPreSpacefaringContactActionBlocker(
        planetId,
        state.currentLocation,
        state.outposts,
        state.ship.tradeGoods,
        actionId,
        expectedStep,
    );
    if (blocker) {
        get().addLog(
            i18nStore.t(`game_logs.pre_spacefaring_action_${blocker}`),
            "warning",
            "exploration",
        );
        return;
    }

    const location = state.currentLocation;
    const contact = location?.preSpacefaringContact;
    if (!location || !contact) return;
    const action = getPreSpacefaringActions(
        contact.temperament,
        expectedStep,
    ).find((entry) => entry.id === actionId);
    if (!action) return;

    const nextStep = contact.step === 0 ? 1 : contact.step === 1 ? 2 : 3;
    const giftGiven = contact.giftGiven === true || action.grantsGiftBonus === true;
    const reward = getPreSpacefaringActionReward(contact, action, giftGiven);

    set((draft) => ({
        credits: draft.credits + reward.credits,
        ship: {
            ...draft.ship,
            tradeGoods: action.requiredGood
                ? spendTradeGood(draft.ship.tradeGoods, action.requiredGood)
                : draft.ship.tradeGoods,
        },
        research: {
            ...draft.research,
            resources: reward.resources.reduce(
                (resources, entry) => ({
                    ...resources,
                    [entry.type]:
                        (resources[entry.type] ?? 0) + entry.quantity,
                }),
                draft.research.resources,
            ),
        },
        ...patchLocation(draft, planetId, {
            preSpacefaringContact: {
                ...contact,
                step: nextStep,
                outcome: action.outcome ?? contact.outcome,
                giftGiven,
                ...(nextStep === 3 ? { resolvedAtTurn: draft.turn } : {}),
                ...(contact.actionHistory === undefined
                    ? {}
                    : {
                          actionHistory: [...contact.actionHistory, action.id],
                      }),
            },
        }),
    }));
    get().addLog(
        i18nStore.t("game_logs.pre_spacefaring_action_done"),
        "info",
        "exploration",
    );
    get().nextTurn();
}
