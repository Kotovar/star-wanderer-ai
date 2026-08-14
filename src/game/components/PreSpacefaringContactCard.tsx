"use client";

import { Button } from "@/components/ui/button";
import {
    getPreSpacefaringActions,
    getPreSpacefaringCivilization,
    getUnavailableOutcomes,
} from "@/game/constants";
import {
    getPreSpacefaringActionReward,
    getPreSpacefaringContactActionBlocker,
    getPreSpacefaringContactSummary,
} from "@/game/slices/locations/helpers/preSpacefaringContact";
import { resolvePreSpacefaringState } from "@/game/slices/locations/helpers/preSpacefaringState";
import { useGameStore } from "@/game/store";
import type { Location, PreSpacefaringAction } from "@/game/types";
import { useTranslation } from "@/lib/useTranslation";

export function PreSpacefaringContactCard({ location }: { location: Location }) {
    const { t } = useTranslation();
    const currentLocation = useGameStore((state) => state.currentLocation);
    const outposts = useGameStore((state) => state.outposts);
    const tradeGoods = useGameStore((state) => state.ship.tradeGoods);
    const turn = useGameStore((state) => state.turn);
    const advance = useGameStore((state) => state.advancePreSpacefaringContact);
    const claim = useGameStore((state) => state.claimPreSpacefaringYield);
    const contact = location.preSpacefaringContact;
    const civilization = contact
        ? getPreSpacefaringCivilization(contact.civilizationId)
        : undefined;

    if (!contact || !civilization) return null;

    const temperamentKnown = contact.step > 0;
    const actions =
        contact.step === 3
            ? []
            : getPreSpacefaringActions(contact.temperament, contact.step);
    const unavailable =
        contact.step === 2 ? getUnavailableOutcomes(contact.temperament) : [];
    const world = resolvePreSpacefaringState(contact, turn);
    const claimLabel = world.claimable
        .map(
            (entry) =>
                `+${entry.quantity} ${t(`blueprints.resources.${entry.type}`)}`,
        )
        .join(", ");
    const contactSummary = getPreSpacefaringContactSummary(contact);
    const formatActionEffect = (action: PreSpacefaringAction) => {
        const reward = getPreSpacefaringActionReward(
            contact,
            action,
            contact.giftGiven === true || action.grantsGiftBonus === true,
        );
        const received = reward.resources
            .map(
                (entry) =>
                    `+${entry.quantity} ${t(`blueprints.resources.${entry.type}`)}`,
            )
            .join(", ");
        return [
            action.requiredGood
                ? t("pre_spacefaring.summary_spent", {
                      value: `${action.requiredGood.quantity} × ${t(`trade.goods.${action.requiredGood.id}`)}`,
                  })
                : null,
            received
                ? t("pre_spacefaring.summary_received", { value: received })
                : null,
            reward.credits > 0 ? `+${reward.credits} ₢` : null,
            t("pre_spacefaring.summary_turns", { count: 1 }),
        ]
            .filter((effect): effect is string => effect !== null)
            .join(" · ");
    };
    const spentTotals = Object.entries(contactSummary.goodsSpent)
        .map(([good, quantity]) => `${quantity} × ${t(`trade.goods.${good}`)}`)
        .join(", ");
    const receivedTotals = Object.entries(contactSummary.researchReceived)
        .map(
            ([resource, quantity]) =>
                `+${quantity} ${t(`blueprints.resources.${resource}`)}`,
        )
        .join(", ");

    return (
        <div className="border border-[#00d4ff66] bg-[rgba(0,212,255,0.04)] p-3">
            <div className="font-['Orbitron'] text-sm font-bold text-[#00d4ff]">
                ◈ {t("pre_spacefaring.title")}
            </div>
            <div className="mt-1 text-xs text-[#aaa]">
                {t(`pre_spacefaring.civilizations.${civilization.id}.name`)}
                {" · "}
                {t(`pre_spacefaring.development.${contact.development}`)}
            </div>
            <div className="mt-2 text-[11px] leading-relaxed text-[#8faab5]">
                {t(`pre_spacefaring.civilizations.${civilization.id}.lore`)}
            </div>
            <div className="mt-2 border-t border-[#00d4ff22] pt-2 text-[11px]">
                {temperamentKnown ? (
                    <>
                        <span className="text-[#00d4ff]">
                            {t(
                                `pre_spacefaring.temperaments.${contact.temperament}.name`,
                            )}
                        </span>
                        <span className="text-[#8faab5]">
                            {" — "}
                            {t(
                                `pre_spacefaring.temperaments.${contact.temperament}.hint`,
                            )}
                        </span>
                    </>
                ) : (
                    <span className="text-[#ffb000]">
                        {t("pre_spacefaring.temperament_unknown")}
                    </span>
                )}
            </div>

            {contact.step === 3 ? (
                <div className="mt-3 space-y-3 text-xs text-[#b9c6cc]">
                    <div>{t(`pre_spacefaring.outcomes.${contact.outcome}`)}</div>
                    {world.status !== "unresolved" && (
                        <div className="text-[#d9eef5]">
                            {t(`pre_spacefaring.status.${world.status}`)}
                        </div>
                    )}
                    {world.turnsUntilMaturity !== undefined && (
                        <div className="text-[10px] text-[#8faab5]">
                            {t("pre_spacefaring.growing_countdown", {
                                count: world.turnsUntilMaturity,
                            })}
                        </div>
                    )}
                    {contact.resolvedAtTurn !== undefined &&
                        (contact.outcome === "protected" ||
                            contact.outcome === "partnered") &&
                        (world.claimable.length > 0 ? (
                            <Button
                                onClick={() => claim(location.id)}
                                className="w-full border border-[#00d4ff66] bg-transparent text-left text-xs text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810]"
                            >
                                {t("pre_spacefaring.claim_button", {
                                    value: claimLabel,
                                })}
                            </Button>
                        ) : (
                            <div className="text-[10px] text-[#8faab5]">
                                {t("pre_spacefaring.claim_nothing")}
                            </div>
                        ))}
                    {contact.actionHistory === undefined ? (
                        <div className="text-[#ffb000]">
                            {t("pre_spacefaring.legacy_history_unavailable")}
                        </div>
                    ) : (
                        <div className="space-y-2 border-t border-[#00d4ff33] pt-2">
                            <div className="font-['Orbitron'] text-[10px] font-bold uppercase tracking-wider text-[#00d4ff]">
                                {t("pre_spacefaring.summary_title")}
                            </div>
                            <ol className="space-y-1">
                                {contactSummary.actionIds.map(
                                    (actionId, index) => (
                                        <li key={`${actionId}-${index}`}>
                                            <div className="text-[#d9eef5]">
                                                {index + 1}.{" "}
                                                {t(
                                                    `pre_spacefaring.actions.${actionId}`,
                                                )}
                                            </div>
                                        </li>
                                    ),
                                )}
                            </ol>
                            <div className="space-y-1 border-t border-[#00d4ff22] pt-2 text-[10px] text-[#b9c6cc]">
                                {spentTotals && (
                                    <div>
                                        {t("pre_spacefaring.summary_spent", {
                                            value: spentTotals,
                                        })}
                                    </div>
                                )}
                                {receivedTotals && (
                                    <div>
                                        {t("pre_spacefaring.summary_received", {
                                            value: receivedTotals,
                                        })}
                                    </div>
                                )}
                                <div>
                                    {t("pre_spacefaring.summary_turns", {
                                        count: contactSummary.turnsSpent,
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="mt-3 space-y-2">
                    {actions.map((action) => {
                        const blocker = getPreSpacefaringContactActionBlocker(
                            location.id,
                            currentLocation,
                            outposts,
                            tradeGoods,
                            action.id,
                            action.step,
                        );
                        return (
                            <div key={action.id}>
                                <Button
                                    onClick={() =>
                                        advance(
                                            location.id,
                                            action.id,
                                            action.step,
                                        )
                                    }
                                    disabled={blocker !== null}
                                    className="w-full border border-[#00d4ff66] bg-transparent text-left text-xs text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810] disabled:cursor-default disabled:opacity-40"
                                >
                                    {t(`pre_spacefaring.actions.${action.id}`)}
                                </Button>
                                <div className="mt-1 text-[10px] text-[#8faab5]">
                                    {formatActionEffect(action)}
                                </div>
                                {blocker && (
                                    <div className="mt-1 text-[10px] text-[#ffb000]">
                                        {t(`pre_spacefaring.blocked.${blocker}`)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    {unavailable.map((outcome) => (
                        <div key={outcome} className="opacity-50">
                            <div className="w-full border border-[#00d4ff33] p-2 text-left text-xs text-[#8faab5]">
                                {t(`pre_spacefaring.actions.contact_${outcome}`)}
                            </div>
                            <div className="mt-1 text-[10px] text-[#ffb000]">
                                {t(
                                    `pre_spacefaring.temperaments.${contact.temperament}.blocked_${outcome}`,
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
