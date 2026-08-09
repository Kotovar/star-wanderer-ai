"use client";

import { Button } from "@/components/ui/button";
import { SectionPanel } from "../SectionPanel";
import { useTranslation } from "@/lib/useTranslation";
import { useGameStore } from "@/game/store";
import {
    CRYOGEN_CONSUMPTION_REDUCTION,
    GAS_BASE_PRICE,
    GAS_BUY_RATE,
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
    const credits = useGameStore((s) => s.credits);
    const sellGas = useGameStore((s) => s.sellGas);
    const buyGas = useGameStore((s) => s.buyGas);

    const held = (Object.entries(gases) as [GasType, number][]).filter(
        ([, amount]) => amount > 0,
    );
    // Полимеры станция ещё и продаёт: гибридный модуль требует их рецептом, и
    // без метанового гиганта под сборщик забег упирался бы в тупик
    const polymerPrice = Math.round(GAS_BASE_PRICE.polymers * GAS_BUY_RATE);
    if (held.length === 0 && credits < polymerPrice) return null;

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

            <div className="flex items-center justify-between gap-2 border-t border-[#00d4ff22] pt-1.5">
                <div className="min-w-0">
                    <div className="text-[11px] text-white sm:text-xs">
                        {GAS_ICONS.polymers} {t("gases.polymers.name")}
                    </div>
                    <div className="text-[10px] text-[#8a9ba3]">
                        {t("outposts.gas_buy_price", { price: polymerPrice })}
                    </div>
                </div>
                <div className="flex gap-1">
                    {[5, 10].map((qty) => (
                        <Button
                            key={qty}
                            onClick={() => buyGas("polymers", qty)}
                            disabled={credits < polymerPrice * qty}
                            className="min-h-8 cursor-pointer border border-[#9933ff] bg-transparent px-2 text-[10px] uppercase tracking-wider text-[#b184ff] hover:bg-[rgba(153,51,255,0.15)] disabled:cursor-default disabled:opacity-40 sm:text-xs"
                        >
                            +{qty} · {polymerPrice * qty}₢
                        </Button>
                    ))}
                </div>
            </div>
        </SectionPanel>
    );
}
