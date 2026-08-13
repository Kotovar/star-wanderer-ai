import { getPreSpacefaringCivilization } from "@/game/constants";
import type {
    GameStore,
    Location,
    Outpost,
    PreSpacefaringActionStep,
    SetState,
    TradeGood,
} from "@/game/types";
import { patchLocation } from "@/game/utils/patchLocation";
import { store as i18nStore } from "@/lib/useTranslation";

export type PreSpacefaringContactActionBlocker =
    | "wrong_location"
    | "no_contact"
    | "already_complete"
    | "step_mismatch"
    | "invalid_action"
    | "base_present"
    | "missing_goods";

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

    const civilization = getPreSpacefaringCivilization(
        contact.civilizationId,
    );
    const action = civilization?.actions.find(
        (entry) => entry.id === actionId && entry.step === expectedStep,
    );
    if (
        !civilization ||
        !action ||
        civilization.development !== contact.development
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
        );
        return;
    }

    const location = state.currentLocation;
    const contact = location?.preSpacefaringContact;
    const civilization = contact
        ? getPreSpacefaringCivilization(contact.civilizationId)
        : undefined;
    const action = civilization?.actions.find(
        (entry) => entry.id === actionId && entry.step === expectedStep,
    );
    if (!location || !contact || !action) return;

    const nextStep = contact.step === 0 ? 1 : contact.step === 1 ? 2 : 3;
    set((draft) => ({
        ship: {
            ...draft.ship,
            tradeGoods: action.requiredGood
                ? spendTradeGood(draft.ship.tradeGoods, action.requiredGood)
                : draft.ship.tradeGoods,
        },
        research: {
            ...draft.research,
            resources: action.reward.researchResources.reduce(
                (resources, reward) => ({
                    ...resources,
                    [reward.type]:
                        (resources[reward.type] ?? 0) + reward.quantity,
                }),
                draft.research.resources,
            ),
        },
        ...patchLocation(draft, planetId, {
            preSpacefaringContact: {
                ...contact,
                step: nextStep,
                outcome: action.outcome,
            },
        }),
    }));
    get().addLog(i18nStore.t("game_logs.pre_spacefaring_action_done"), "info");
    get().nextTurn();
}
