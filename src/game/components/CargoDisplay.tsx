"use client";

import { useGameStore } from "../store";
import { TRADE_GOODS } from "../constants";

export function CargoDisplay() {
    const ship = useGameStore((s) => s.ship);
    const cargoModule = ship.modules.find((m) => m.type === "cargo");

    if (!cargoModule) {
        return <div className="text-xs text-[#888]">Нет грузового отсека</div>;
    }

    const contractCargo = ship.cargo.reduce((sum, c) => sum + c.quantity, 0);
    const tradeCargo = ship.tradeGoods.reduce((sum, g) => sum + g.quantity, 0);
    const totalCargo = contractCargo + tradeCargo;

    return (
        <div>
            <div className="mb-2.5 text-xs">
                Вместимость:{" "}
                <span className="text-[#ffb000]">
                    {totalCargo}/{cargoModule.capacity}т
                </span>
            </div>
            {totalCargo === 0 ? (
                <div className="text-[11px] text-[#888]">Трюм пуст</div>
            ) : (
                <div>
                    {ship.cargo.map((c, i) => (
                        <div
                            key={i}
                            className="bg-[rgba(0,0,0,0.3)] border border-[#ffb000] p-2 mb-1.5 text-xs"
                        >
                            📦 {c.item} x{c.quantity}т{" "}
                            <span className="text-[#00d4ff]">[КОНТРАКТ]</span>
                        </div>
                    ))}
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
