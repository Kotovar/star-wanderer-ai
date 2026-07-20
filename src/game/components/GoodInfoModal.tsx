"use client";

import { useMemo } from "react";
import { useGameStore } from "../store";
import { TRADE_GOODS } from "../constants";
import { useTranslation } from "@/lib/useTranslation";
import { getLocationName } from "@/lib/translationHelpers";
import { applyCrisisMarketModifier } from "@/game/stations/crisisMarket";
import type { Goods } from "@/game/types";

interface GoodInfoModalProps {
    goodId: Goods;
    onClose: () => void;
}

/**
 * Модалка деталей товара: цены на всех станциях, где игрок был в доке.
 * Открывается кликом по товару в торговле или в трюме.
 */
export function GoodInfoModal({ goodId, onClose }: GoodInfoModalProps) {
    const { t } = useTranslation();
    const sectors = useGameStore((s) => s.galaxy.sectors);
    const knownTradeStations = useGameStore((s) => s.knownTradeStations);
    const stationPrices = useGameStore((s) => s.stationPrices);
    const activeCrisisId = useGameStore((s) => s.activeCrisis?.id);
    // currentLocation переживает вылет из сектора, поэтому "текущей"
    // станция считается только когда игрок реально в доке
    const currentStationId = useGameStore((s) =>
        s.gameMode === "station" ? s.currentLocation?.stationId : undefined,
    );
    const inHold = useGameStore(
        (s) =>
            s.ship.tradeGoods.find((g) => g.item === goodId)?.quantity ?? 0,
    );

    const rows = useMemo(() => {
        const known = new Set(knownTradeStations);
        const result: {
            stationId: string;
            stationName: string;
            sectorName: string;
            buyPerTon: number;
            sellPerTon: number;
            isCurrent: boolean;
        }[] = [];
        for (const sector of sectors) {
            for (const loc of sector.locations) {
                if (
                    loc.type !== "station" ||
                    !loc.stationId ||
                    !known.has(loc.stationId) ||
                    !(loc.stationConfig?.allowsTrade ?? true)
                ) {
                    continue;
                }
                const raw = stationPrices[loc.stationId]?.[goodId];
                if (!raw) continue;
                const prices = applyCrisisMarketModifier(
                    raw,
                    activeCrisisId,
                    goodId,
                );
                result.push({
                    stationId: loc.stationId,
                    stationName: loc.name,
                    sectorName: sector.name,
                    buyPerTon: Math.floor(prices.buy / 5),
                    sellPerTon: Math.floor(prices.sell / 5),
                    isCurrent: loc.stationId === currentStationId,
                });
            }
        }
        return result.sort((a, b) => b.sellPerTon - a.sellPerTon);
    }, [
        sectors,
        knownTradeStations,
        stationPrices,
        activeCrisisId,
        goodId,
        currentStationId,
    ]);

    const goodName =
        t(`trade.goods.${goodId}`) !== `trade.goods.${goodId}`
            ? t(`trade.goods.${goodId}`)
            : TRADE_GOODS[goodId]?.name || goodId;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.7)] p-4"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-labelledby="good-info-title"
                className="w-full max-w-md border border-ring bg-[rgba(5,8,16,0.98)] p-4 shadow-[0_0_24px_rgba(0,212,255,0.18)]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between">
                    <div
                        id="good-info-title"
                        className="font-['Orbitron'] text-sm font-bold uppercase tracking-wider text-ring"
                    >
                        {t("good_info.title", { good: goodName })}
                    </div>
                    <button
                        onClick={onClose}
                        className="cursor-pointer text-ring opacity-70 hover:opacity-100"
                        title={t("common.close")}
                    >
                        ✕
                    </button>
                </div>
                <div className="mt-1 text-xs text-[#00d4ff]">
                    {t("trade.in_hold", { quantity: inHold })}
                </div>
                <div className="mt-3 max-h-[50vh] overflow-y-auto pr-1">
                    {rows.length === 0 ? (
                        <div className="text-xs leading-relaxed text-[#888]">
                            {t("good_info.no_data")}
                        </div>
                    ) : (
                        rows.map((row) => (
                            <div
                                key={row.stationId}
                                className={`mb-1.5 border p-2 text-xs ${
                                    row.isCurrent
                                        ? "border-[#00ff41] bg-[rgba(0,255,65,0.05)]"
                                        : "border-[#00d4ff33]"
                                }`}
                            >
                                <div className="text-[#00d4ff]">
                                    {getLocationName(row.stationName, t)},{" "}
                                    {row.sectorName}
                                    {row.isCurrent && (
                                        <span className="ml-2 text-[10px] uppercase text-[#00ff41]">
                                            {t("good_info.current_station")}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-1 text-[#ffb000]">
                                    {t("trade.buy_label")}{" "}
                                    {t("trade.per_ton", {
                                        price: row.buyPerTon,
                                    })}
                                    {" | "}
                                    {t("trade.sell_label")}{" "}
                                    {t("trade.per_ton", {
                                        price: row.sellPerTon,
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
