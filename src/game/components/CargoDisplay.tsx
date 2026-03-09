"use client";

import { useGameStore } from "../store";
import { TRADE_GOODS } from "../constants/goods";
import { DELIVERY_GOODS } from "../constants/contracts";
import { useTranslation } from "@/lib/useTranslation";

export function CargoDisplay() {
    const ship = useGameStore((s) => s.ship);
    const { t } = useTranslation();
    const cargoModules = ship.modules.filter(
        (m) =>
            m.type === "cargo" &&
            !m.disabled &&
            !m.manualDisabled &&
            m.health > 0,
    );

    if (cargoModules.length === 0) {
        return (
            <div className="text-xs text-[#888]">{t("cargo.no_module")}</div>
        );
    }

    // Sum capacity from all cargo modules
    const totalCapacity = cargoModules.reduce(
        (sum, m) => sum + (m.capacity || 0),
        0,
    );

    const contractCargo = ship.cargo.reduce((sum, c) => sum + c.quantity, 0);
    const tradeCargo = ship.tradeGoods.reduce((sum, g) => sum + g.quantity, 0);
    const totalCargo = contractCargo + tradeCargo;

    return (
        <div>
            <div className="mb-2.5 text-xs">
                {t("cargo.capacity_label")}:{" "}
                <span className="text-[#ffb000]">
                    {totalCargo}/{totalCapacity}т
                </span>
            </div>
            {totalCargo === 0 ? (
                <div className="text-[11px] text-[#888]">
                    {t("cargo.hold_empty")}
                </div>
            ) : (
                <div>
                    {ship.cargo.map((c, i) => {
                        // Try to get cargo name from DELIVERY_GOODS first, then TRADE_GOODS
                        const cargoName =
                            DELIVERY_GOODS[
                                c.item as keyof typeof DELIVERY_GOODS
                            ]?.name ||
                            TRADE_GOODS[c.item as keyof typeof TRADE_GOODS]
                                ?.name ||
                            c.item;
                        return (
                            <div
                                key={i}
                                className="bg-[rgba(0,0,0,0.3)] border border-[#ffb000] p-2 mb-1.5 text-xs"
                            >
                                📦 {cargoName} x{c.quantity}т{" "}
                                <span className="text-[#00d4ff]">
                                    [Задание]
                                </span>
                            </div>
                        );
                    })}
                    {ship.tradeGoods.map((g, i) => (
                        <div
                            key={i}
                            className="bg-[rgba(0,0,0,0.3)] border border-[#ffb000] p-2 mb-1.5 text-xs"
                        >
                            💰 {TRADE_GOODS[g.item]?.name || g.item} x
                            {g.quantity}т
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
