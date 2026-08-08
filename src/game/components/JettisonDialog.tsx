"use client";

import { useState } from "react";
import { Dialog, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GameDialogContent } from "./GameDialog";
import { useTranslation } from "@/lib/useTranslation";
import { useGameStore } from "@/game/store";
import { WEAPON_TYPES } from "@/game/constants/weapons";
import type { JettisonTarget } from "@/game/slices/ship/helpers/jettison";
import type { GasType } from "@/game/types/outposts";
import type { Goods } from "@/game/types";

interface Entry {
    key: string;
    label: string;
    quantity: number;
    color: string;
    target: JettisonTarget;
}

/**
 * Шлюз: единственное место, откуда груз уходит за борт.
 *
 * Собран одним экраном, а не корзиной в каждой строке трюма: групп шесть,
 * разметка у них разная, а выброс — действие редкое и необратимое, ему лучше
 * отдельная дверь. Подтверждение встроено в строку: первое нажатие меняет
 * кнопку на «точно?», выбросит только второе.
 */
export function JettisonDialog({ onClose }: { onClose: () => void }) {
    const { t } = useTranslation();
    const ship = useGameStore((s) => s.ship);
    const gases = useGameStore((s) => s.gases);
    const probes = useGameStore((s) => s.probes);
    const jettisonCargo = useGameStore((s) => s.jettisonCargo);

    const [amounts, setAmounts] = useState<Record<string, number>>({});
    const [confirming, setConfirming] = useState<string | null>(null);

    const entries: Entry[] = [
        ...ship.cargo.map((item, index) => ({
            key: `cargo-${index}`,
            label:
                item.isCraftedWeapon && item.weaponType
                    ? `${WEAPON_TYPES[item.weaponType]?.icon ?? "◆"} ${t(`weapon_types.${item.weaponType}`)}`
                    : item.isModule
                      ? `🔧 ${item.module?.name ?? item.item}`
                      : `📦 ${t(`cargo_items.${item.item}`, { defaultValue: item.item })}`,
            quantity: item.quantity,
            color: item.isCraftedWeapon ? "#00d4ff" : item.isModule ? "#ffb000" : "#00ff41",
            target: { kind: "cargo" as const, index },
        })),
        ...ship.tradeGoods.map((good) => ({
            key: `good-${good.item}`,
            label: `⬢ ${t(`trade.goods.${good.item}`)}`,
            quantity: good.quantity,
            color: "#00ff41",
            target: { kind: "trade_good" as const, good: good.item as Goods },
        })),
        ...(Object.entries(gases ?? {}) as [GasType, number][])
            .filter(([, amount]) => amount > 0)
            .map(([gas, amount]) => ({
                key: `gas-${gas}`,
                label: `🛰 ${t(`gases.${gas}.name`)}`,
                quantity: amount,
                color: "#00d4ff",
                target: { kind: "gas" as const, gas },
            })),
        ...(probes > 0
            ? [
                  {
                      key: "probes",
                      label: `🔬 ${t("cargo.section_probes")}`,
                      quantity: probes,
                      color: "#7b4fff",
                      target: { kind: "probes" as const },
                  },
              ]
            : []),
    ];

    const amountFor = (entry: Entry) =>
        Math.min(entry.quantity, amounts[entry.key] ?? entry.quantity);

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <GameDialogContent variant="danger" className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-['Orbitron'] text-[#ff667f]">
                        🗑 {t("cargo.jettison_title")}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-[#8a9ba3]">
                        {t("cargo.jettison_warning")}
                    </DialogDescription>
                </DialogHeader>

                {entries.length === 0 ? (
                    <div className="text-xs text-[#888]">{t("cargo.hold_empty")}</div>
                ) : (
                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                        {entries.map((entry) => {
                            const amount = amountFor(entry);
                            const isConfirming = confirming === entry.key;
                            return (
                                <div
                                    key={entry.key}
                                    className="border border-[#333] bg-[rgba(0,0,0,0.3)] p-2"
                                >
                                    <div
                                        className="text-xs"
                                        style={{ color: entry.color }}
                                    >
                                        {entry.label}{" "}
                                        <span className="text-[#666]">
                                            ×{entry.quantity}
                                        </span>
                                    </div>

                                    <div className="mt-1.5 flex items-center gap-2">
                                        <input
                                            type="range"
                                            min={1}
                                            max={entry.quantity}
                                            value={amount}
                                            aria-label={entry.label}
                                            onChange={(e) => {
                                                setConfirming(null);
                                                setAmounts((prev) => ({
                                                    ...prev,
                                                    [entry.key]: Number(
                                                        e.target.value,
                                                    ),
                                                }));
                                            }}
                                            className="h-1 flex-1 cursor-pointer accent-[#ff667f]"
                                        />
                                        <span className="w-12 shrink-0 text-right font-mono text-[11px] text-white">
                                            {amount}/{entry.quantity}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isConfirming) {
                                                    jettisonCargo(
                                                        entry.target,
                                                        amount,
                                                    );
                                                    setConfirming(null);
                                                } else {
                                                    setConfirming(entry.key);
                                                }
                                            }}
                                            className={`shrink-0 cursor-pointer border px-2 py-1 text-[10px] uppercase tracking-wider ${
                                                isConfirming
                                                    ? "border-[#ff0040] bg-[rgba(255,0,64,0.18)] text-[#ff667f]"
                                                    : "border-[#555] text-[#b9c6cc] hover:border-[#ff0040] hover:text-[#ff667f]"
                                            }`}
                                        >
                                            {/* Обе надписи всегда в потоке, в
                                                одной ячейке грида: ширина
                                                кнопки равна максимальной из
                                                них, и макет не прыгает при
                                                смене состояния — на любом
                                                языке, без подбора ширины */}
                                            <span className="grid">
                                                <span
                                                    className="col-start-1 row-start-1"
                                                    style={{
                                                        visibility: isConfirming
                                                            ? "visible"
                                                            : "hidden",
                                                    }}
                                                >
                                                    {t("cargo.jettison_confirm")}
                                                </span>
                                                <span
                                                    className="col-start-1 row-start-1"
                                                    style={{
                                                        visibility: isConfirming
                                                            ? "hidden"
                                                            : "visible",
                                                    }}
                                                >
                                                    {t("cargo.jettison_action")}
                                                </span>
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="mt-2 cursor-pointer border-2 border-[#555] px-3 py-2 text-xs uppercase text-[#b9c6cc] hover:bg-[#222]"
                >
                    {t("common.close")}
                </button>
            </GameDialogContent>
        </Dialog>
    );
}
