"use client";

import { Button } from "@/components/ui/button";
import { formatContractDescription } from "@/game/contracts/formatContractDescription";
import { getContractTurnsRemaining } from "@/game/contracts/contractDeadline";
import {
    getPirateContrabandBuyPrice,
    getPirateContrabandSellPrice,
} from "@/game/slices/trade/constants";
import { useTranslation } from "@/lib/useTranslation";
import { TRADE_GOODS } from "@/game/constants";
import { typedKeys } from "@/lib/utils";
import type { Goods, Contract } from "@/game/types";

interface PirateTabProps {
    view: "market" | "contracts";
    stationId: string;
    locationId: string;
    stationPrices: Record<
        string,
        Record<string, { buy: number; sell: number }>
    >;
    stationStock: Record<string, Record<string, number>>;
    credits: number;
    ship: {
        tradeGoods: Array<{ item: string; quantity: number }>;
        cargo: Array<{ quantity: number }>;
    };
    cargoCapacity: number;
    probes: number;
    heat: number;
    contracts: Contract[];
    activeContracts: Contract[];
    completedContractIds: string[];
    currentTurn: number;
    buyTradeGood: (goodId: Goods, quantity: number) => void;
    sellTradeGood: (goodId: Goods, quantity: number) => void;
    acceptPirateContract: (contractId: string) => void;
    completePirateContract: (contractId: string) => void;
    reducePirateHeat: (amount: number, cost: number) => void;
}

export function PirateTab({
    view,
    stationId,
    locationId,
    stationPrices,
    stationStock,
    credits,
    ship,
    cargoCapacity,
    probes,
    heat,
    contracts,
    activeContracts,
    completedContractIds,
    currentTurn,
    buyTradeGood,
    sellTradeGood,
    acceptPirateContract,
    completePirateContract,
    reducePirateHeat,
}: PirateTabProps) {
    const { t } = useTranslation();
    const currentCargo =
        ship.cargo.reduce((s, c) => s + c.quantity, 0) +
        ship.tradeGoods.reduce((s, g) => s + g.quantity, 0) +
        probes;
    const availSpace = cargoCapacity - currentCargo;
    const boardContracts = [
        ...contracts,
        ...activeContracts.filter(
            (active) =>
                (active.type === "pirate_smuggling" ||
                    active.type === "pirate_bounty" ||
                    active.type === "pirate_heist") &&
                active.sourcePlanetId === locationId &&
                !contracts.some((offer) => offer.id === active.id),
        ),
    ];

    const heatLevel =
        heat < 20 ? t("pirate.heat_low") :
        heat < 50 ? t("pirate.heat_medium") :
        heat < 80 ? t("pirate.heat_high") : t("pirate.heat_critical");

    return (
        <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto pr-1 pb-2">
            {view === "market" && (
                <>
                    {/* Heat display */}
                    <div className="p-3 border border-[#ff0040] bg-[rgba(255,0,64,0.05)]">
                        <div className="text-[#ff0040] font-bold text-sm">
                            {t("pirate.heat_title")}: {heat} / 100
                        </div>
                        <div className="text-xs text-[#888]">{heatLevel}</div>
                        <div className="w-full h-2 bg-[#330000] mt-2 rounded">
                            <div
                                className="h-full rounded bg-gradient-to-r from-[#ff6600] to-[#ff0040]"
                                style={{ width: `${Math.min(100, heat)}%` }}
                            />
                        </div>
                    </div>

                    {/* Smuggler's Den */}
                    <div className="p-3 border border-[#ffb000] bg-[rgba(255,176,0,0.05)]">
                        <div className="text-[#ffb000] font-bold text-sm mb-2">
                            {t("pirate.smugglers_den")}
                        </div>
                        <div className="text-xs text-[#888] mb-2">
                            {t("pirate.smugglers_den_desc")}
                        </div>
                        <Button
                            onClick={() => reducePirateHeat(15, 500)}
                            disabled={credits < 500 || heat <= 0}
                            className="bg-transparent border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {t("pirate.reduce_heat", { amount: 15, cost: 500 })}
                        </Button>
                    </div>

                    {/* Black Market */}
                    <div>
                        <div className="text-[#00ff41] font-bold text-sm mb-2">
                            {t("pirate.black_market")}
                        </div>
                        <div className="flex flex-col gap-2">
                            {stationId &&
                                typedKeys(TRADE_GOODS).map((goodId) => {
                                    const prices = stationPrices[stationId]?.[goodId];
                                    const stock = stationStock[stationId]?.[goodId] || 0;
                                    const playerGood = ship.tradeGoods.find(
                                        (g) => g.item === goodId,
                                    );
                                    if (!prices) return null;

                                    return (
                                        <PirateTradeRow
                                            key={goodId}
                                            goodId={goodId}
                                            prices={prices}
                                            stock={stock}
                                            playerGood={playerGood}
                                            credits={credits}
                                            availSpace={availSpace}
                                            onBuy={buyTradeGood}
                                            onSell={sellTradeGood}
                                        />
                                    );
                                })}
                        </div>
                    </div>
                </>
            )}

            {view === "contracts" && (
                <>
                    {/* Contract Board */}
                    <div>
                        <div className="text-[#00d4ff] font-bold text-sm mb-2">
                            {t("pirate.contract_board")}
                        </div>
                        <div className="flex flex-col gap-2">
                            {boardContracts.length === 0 && (
                                <div className="text-xs text-[#555]">
                                    {t("pirate.no_contracts")}
                                </div>
                            )}
                            {boardContracts.map((contract) => {
                                const activeContract = activeContracts.find(
                                    (active) => active.id === contract.id,
                                );
                                const isCompleted = completedContractIds.includes(
                                    contract.id,
                                );
                                const turnsRemaining = activeContract
                                    ? getContractTurnsRemaining(activeContract, currentTurn)
                                    : null;
                                return (
                                    <div
                                        key={contract.id}
                                        className="flex justify-between items-center bg-[rgba(0,212,255,0.05)] border border-[#00d4ff] p-3"
                                    >
                                        <div className="flex-1">
                                            <div className="text-[#00d4ff] font-bold text-sm">
                                                {formatContractDescription(contract, t)}
                                            </div>
                                            <div className="text-[#ffb000] text-xs mt-1">
                                                💰 {contract.reward}₢
                                            </div>
                                            {turnsRemaining !== null && (
                                                <div className="text-[11px] text-[#ffb000] mt-1">
                                                    ⏳ {t("contracts.turns_left", { count: turnsRemaining })}
                                                </div>
                                            )}
                                            {contract.cargo && (
                                                <div className="text-[11px] text-[#888]">
                                                    📦 {contract.quantity}т {t(`trade.goods.${contract.cargo}`)}
                                                </div>
                                            )}
                                        </div>
                                        {isCompleted ? (
                                            <div className="text-xs font-bold text-[#00ff41]">
                                                {t("contracts.completed")}
                                            </div>
                                        ) : !activeContract ? (
                                            <Button
                                                onClick={() =>
                                                    acceptPirateContract(contract.id)
                                                }
                                                className="bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] text-xs px-2 py-1 cursor-pointer"
                                            >
                                                {t("pirate.accept")}
                                            </Button>
                                        ) : activeContract.pirateObjectiveComplete ? (
                                            <Button
                                                onClick={() =>
                                                    completePirateContract(contract.id)
                                                }
                                                className="bg-transparent border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] text-xs px-2 py-1 cursor-pointer"
                                            >
                                                {t("pirate.complete")}
                                            </Button>
                                        ) : (
                                            <div className="text-right text-[11px] text-[#ffb000]">
                                                {t("contracts.in_progress")}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function PirateTradeRow({
    goodId,
    prices,
    stock,
    playerGood,
    credits,
    availSpace,
    onBuy,
    onSell,
}: {
    goodId: Goods;
    prices: { buy: number; sell: number };
    stock: number;
    playerGood: { item: string; quantity: number } | undefined;
    credits: number;
    availSpace: number;
    onBuy: (goodId: Goods, quantity: number) => void;
    onSell: (goodId: Goods, quantity: number) => void;
}) {
    const { t } = useTranslation();
    const isContraband = goodId === "contraband";
    const buyPrice = isContraband
        ? getPirateContrabandBuyPrice(prices.buy, prices.sell)
        : prices.buy;
    const sellPrice = isContraband
        ? getPirateContrabandSellPrice(prices.sell)
        : prices.sell;
    const buyPerUnit = Math.floor(buyPrice / 5);
    const sellPerUnit = Math.floor(sellPrice / 5);

    return (
        <div
            className={`flex justify-between items-center p-3 border ${
                isContraband
                    ? "border-[#ff0040] bg-[rgba(255,0,64,0.08)]"
                    : "border-[#00ff41] bg-[rgba(0,255,65,0.05)]"
            }`}
        >
            <div className="flex-1">
                <div
                    className={`font-bold ${
                        isContraband ? "text-[#ff0040]" : "text-[#00d4ff]"
                    }`}
                >
                    {t(`trade.goods.${goodId}`)}
                    {isContraband && (
                        <span className="ml-2 text-[10px]">⚠️ {t("pirate.illegal")}</span>
                    )}
                </div>
                <div className="text-[#ffb000] text-xs mt-1">
                    {t("trade.buy_label")} {t("trade.per_ton", { price: buyPerUnit })} |{" "}
                    {t("trade.sell_label")} {t("trade.per_ton", { price: sellPerUnit })}
                </div>
                <div className="text-[11px] mt-1">
                    <span className="text-[#00ff41]">
                        {t("trade.at_station", { stock })}
                    </span>
                    {playerGood && (
                        <span className="text-[#00d4ff] ml-3">
                            {t("trade.in_hold", { quantity: playerGood.quantity })}
                        </span>
                    )}
                </div>
            </div>
            <div className="flex flex-wrap gap-1">
                <Button
                    onClick={() => onBuy(goodId, 1)}
                    disabled={
                        availSpace < 1 ||
                        credits < buyPerUnit ||
                        stock < 1
                    }
                    className="bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-[9px] px-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                    +1
                </Button>
                <Button
                    onClick={() => onBuy(goodId, 5)}
                    disabled={
                        availSpace < 5 ||
                        credits < buyPrice ||
                        stock < 5
                    }
                    className="bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-[9px] px-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                    +5
                </Button>
                <Button
                    onClick={() => onBuy(goodId, 15)}
                    disabled={
                        availSpace < 15 ||
                        credits < buyPrice * 3 ||
                        stock < 15
                    }
                    className="bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-[9px] px-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                    +15
                </Button>
                <Button
                    onClick={() => onSell(goodId, 15)}
                    disabled={!playerGood || playerGood.quantity < 15}
                    className="bg-transparent border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase text-[9px] px-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                    -15
                </Button>
                <Button
                    onClick={() => onSell(goodId, 5)}
                    disabled={!playerGood || playerGood.quantity < 5}
                    className="bg-transparent border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase text-[9px] px-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                    -5
                </Button>
                <Button
                    onClick={() => onSell(goodId, 1)}
                    disabled={!playerGood || playerGood.quantity < 1}
                    className="bg-transparent border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase text-[9px] px-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                    -1
                </Button>
            </div>
        </div>
    );
}
