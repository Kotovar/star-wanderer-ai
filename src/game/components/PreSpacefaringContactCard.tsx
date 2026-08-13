"use client";

import { Button } from "@/components/ui/button";
import { getPreSpacefaringCivilization } from "@/game/constants";
import {
    getPreSpacefaringContactActionBlocker,
} from "@/game/slices/locations/helpers/preSpacefaringContact";
import { useGameStore } from "@/game/store";
import type { Location } from "@/game/types";
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
                <div className="mt-1 text-xs text-[#b9c6cc]">
                    {t(`pre_spacefaring.outcomes.${contact.outcome}`)}
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
