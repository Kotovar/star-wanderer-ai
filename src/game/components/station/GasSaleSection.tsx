"use client";

import { Button } from "@/components/ui/button";
import { SectionPanel } from "../SectionPanel";
import { useTranslation } from "@/lib/useTranslation";
import { useGameStore } from "@/game/store";
import {
    CRYOGEN_CONSUMPTION_REDUCTION,
    GAS_BASE_PRICE,
    GAS_SELL_RATE,
} from "@/game/constants/outposts";
import type { GasType } from "@/game/types/outposts";

const GAS_ICONS: Record<GasType, string> = {
    deuterium: "⚗️",
    polymers: "🧪",
    biosynth: "🧬",
    cryogen: "❄️",
};

/**
 * Продажа газа с аванпостов. Отдельным блоком, а не строкой в общем списке:
 * газ живёт своим пулом, у него нет складов станции, скачков цен и
 * репутационных наценок — вклинивать его в торговый ряд значило бы врать
 * про то, что это обычный товар.
 */
export function GasSaleSection() {
    const { t } = useTranslation();
    const gases = useGameStore((s) => s.gases);
    const sellGas = useGameStore((s) => s.sellGas);

    const held = (Object.entries(gases) as [GasType, number][]).filter(
        ([, amount]) => amount > 0,
    );
    if (held.length === 0) return null;

    return (
        <SectionPanel padding="sm" className="flex flex-col gap-1.5">
            <div className="text-[11px] uppercase tracking-wider text-[#00d4ff] sm:text-xs">
                🛰️ {t("outposts.gas_from_outposts")}
            </div>

            {held.map(([gas, amount]) => {
                const price = Math.round(GAS_BASE_PRICE[gas] * GAS_SELL_RATE);
                const sellable = price > 0;

                return (
                    <div
                        key={gas}
                        className="flex items-center justify-between gap-2"
                    >
                        <div className="min-w-0">
                            <div className="text-[11px] text-white sm:text-xs">
                                {GAS_ICONS[gas]} {t(`gases.${gas}.name`)} ×
                                {amount}
                            </div>
                            <div className="text-[10px] text-[#8a9ba3]">
                                {sellable
                                    ? t("outposts.gas_price", { price })
                                    : t("outposts.cryogen_burning", {
                                          value: CRYOGEN_CONSUMPTION_REDUCTION,
                                      })}
                            </div>
                        </div>

                        {sellable && (
                            <Button
                                onClick={() => sellGas(gas, amount)}
                                className="min-h-8 cursor-pointer border border-[#00d4ff] bg-transparent px-2 text-[10px] uppercase tracking-wider text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810] sm:text-xs"
                            >
                                {t("outposts.sell_all", {
                                    total: price * amount,
                                })}
                            </Button>
                        )}
                    </div>
                );
            })}
        </SectionPanel>
    );
}
