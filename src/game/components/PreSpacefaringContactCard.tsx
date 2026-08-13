"use client";

import { Button } from "@/components/ui/button";
import { getPreSpacefaringCivilization } from "@/game/constants";
import {
    getPreSpacefaringContactActionBlocker,
    getPreSpacefaringContactSummary,
} from "@/game/slices/locations/helpers/preSpacefaringContact";
import { useGameStore } from "@/game/store";
import type { Location, PreSpacefaringAction } from "@/game/types";
import { useTranslation } from "@/lib/useTranslation";

export function PreSpacefaringContactCard({ location }: { location: Location }) {
    const { t } = useTranslation();
    const currentLocation = useGameStore((state) => state.currentLocation);
    const outposts = useGameStore((state) => state.outposts);
    const tradeGoods = useGameStore((state) => state.ship.tradeGoods);
    const advance = useGameStore(
        (state) => state.advancePreSpacefaringContact,
    );
    const contact = location.preSpacefaringContact;
    const civilization = contact
        ? getPreSpacefaringCivilization(contact.civilizationId)
        : undefined;

    if (!contact || !civilization) return null;

    const actions =
        contact.step === 3
            ? []
            : civilization.actions.filter(
                  (action) => action.step === contact.step,
              );
    const contactSummary = getPreSpacefaringContactSummary(
        civilization.id,
        contact.actionHistory,
    );
    const completedActions = contactSummary.actionIds.flatMap((actionId) => {
        const action = civilization.actions.find(
            (entry) => entry.id === actionId,
        );
        return action ? [action] : [];
    });
    const formatActionEffect = (action: PreSpacefaringAction) =>
        [
            action.requiredGood
                ? t("pre_spacefaring.summary_spent", {
                      value: `${action.requiredGood.quantity} × ${t(`trade.goods.${action.requiredGood.id}`)}`,
                  })
                : null,
            t("pre_spacefaring.summary_received", {
                value: action.reward.researchResources
                    .map(
                        (reward) =>
                            `+${reward.quantity} ${t(`blueprints.resources.${reward.type}`)}`,
                    )
                    .join(", "),
            }),
            t("pre_spacefaring.summary_turns", { count: 1 }),
        ]
            .filter((effect): effect is string => effect !== null)
            .join(" · ");
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
                {t(
                    `pre_spacefaring.civilizations.${civilization.id}.name`,
                )}
                {" · "}
                {t(`pre_spacefaring.development.${contact.development}`)}
            </div>

            {contact.step === 3 ? (
                <div className="mt-3 space-y-3 text-xs text-[#b9c6cc]">
                    <div>{t(`pre_spacefaring.outcomes.${contact.outcome}`)}</div>
                    {contact.actionHistory === undefined ? (
                        <div className="text-[#ffb000]">
                            {t(
                                "pre_spacefaring.legacy_history_unavailable",
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2 border-t border-[#00d4ff33] pt-2">
                            <div className="font-['Orbitron'] text-[10px] font-bold uppercase tracking-wider text-[#00d4ff]">
                                {t("pre_spacefaring.summary_title")}
                            </div>
                            <ol className="space-y-1">
                                {completedActions.map((action, index) => (
                                    <li key={`${action.id}-${index}`}>
                                        <div className="text-[#d9eef5]">
                                            {index + 1}.{" "}
                                            {t(
                                                `pre_spacefaring.actions.${action.id}`,
                                            )}
                                        </div>
                                        <div className="text-[10px] text-[#8faab5]">
                                            {formatActionEffect(action)}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                            <div className="space-y-1 border-t border-[#00d4ff22] pt-2 text-[10px] text-[#b9c6cc]">
                                {spentTotals && (
                                    <div>
                                        {t("pre_spacefaring.summary_spent", {
                                            value: spentTotals,
                                        })}
                                    </div>
                                )}
                                <div>
                                    {t("pre_spacefaring.summary_received", {
                                        value: receivedTotals,
                                    })}
                                </div>
                                <div>
                                    {t("pre_spacefaring.summary_turns", {
                                        count: contactSummary.turnsSpent,
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="border-t border-[#00d4ff22] pt-2 text-[10px] text-[#8faab5]">
                        {t("pre_spacefaring.summary_permanent_effect")}
                    </div>
                </div>
            ) : (
                <div className="mt-3 space-y-2">
                    {actions.map((action) => {
                        const blocker =
                            getPreSpacefaringContactActionBlocker(
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
                                    {t(
                                        `pre_spacefaring.actions.${action.id}`,
                                    )}
                                </Button>
                                <div className="mt-1 text-[10px] text-[#8faab5]">
                                    {formatActionEffect(action)}
                                </div>
                                {blocker && (
                                    <div className="mt-1 text-[10px] text-[#ffb000]">
                                        {t(
                                            `pre_spacefaring.blocked.${blocker}`,
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
