"use client";

import { useGameStore } from "@/game/store";
import { useTranslation } from "@/lib/useTranslation";
import { getLocationName } from "@/lib/translationHelpers";
import { formatContractDescription } from "@/game/contracts/formatContractDescription";
import { getRelayOffers } from "@/game/slices/outposts/helpers";

/**
 * Что ретранслятор слышит в соседних секторах.
 *
 * Контракты лежат на планетах с самой генерации — модуль не создаёт работу,
 * он даёт услышать её, не прилетая. Список только читается: взять контракт
 * по-прежнему можно лишь на месте, иначе исчезнет смысл куда-то лететь.
 */
export function RelayOffers() {
    const { t } = useTranslation();
    const outposts = useGameStore((s) => s.outposts);
    const sectors = useGameStore((s) => s.galaxy.sectors);

    const offers = getRelayOffers(outposts, sectors);
    if (offers.length === 0) return null;

    return (
        <div className="space-y-1.5">
            <div className="text-[10px] text-[#8a9ba3]">
                {t("outposts.relay_hint")}
            </div>
            {offers.map(({ contract, sectorName, planetName }) => (
                <div
                    key={contract.id}
                    className="border border-[#00d4ff33] bg-[rgba(0,212,255,0.05)] p-2 text-[11px]"
                >
                    <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[#00d4ff]">
                            {formatContractDescription(contract, t)}
                        </span>
                        <span className="shrink-0 text-[#00ff41]">
                            {contract.reward}₢
                        </span>
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-[#8a9ba3]">
                        {getLocationName(planetName, t)},{" "}
                        {getLocationName(sectorName, t)}
                    </div>
                </div>
            ))}
        </div>
    );
}
