"use client";

import { Button } from "@/components/ui/button";
import { TRADE_GOODS } from "../../constants";

interface TradeTabProps {
    stationId: string;
    stationPrices: Record<
        string,
        Record<string, { buy: number; sell: number }>
    >;
    stationStock: Record<string, Record<string, number>>;
    credits: number;
    ship: {
        tradeGoods: Array<{ item: string; quantity: number }>;
        cargo: Array<{ quantity: number }>;
        modules: Array<{ type: string; capacity?: number }>;
    };
    buyTradeGood: (goodId: string, quantity: number) => void;
    sellTradeGood: (goodId: string, quantity: number) => void;
}

export function TradeTab({
    stationId,
    stationPrices,
    stationStock,
    credits,
    ship,
    buyTradeGood,
    sellTradeGood,
}: TradeTabProps) {
    const cargoModule = ship.modules.find((m) => m.type === "cargo");
    const currentCargo =
        ship.cargo.reduce((s, c) => s + c.quantity, 0) +
        ship.tradeGoods.reduce((s, g) => s + g.quantity, 0);
    const availSpace = cargoModule?.capacity
        ? cargoModule.capacity - currentCargo
        : 0;

    return (
        <div className="flex flex-col gap-2.5 max-h-100 overflow-y-auto pr-1 pb-2">
            {stationId &&
                Object.keys(TRADE_GOODS).map((goodId) => {
                    const good = { id: goodId, ...TRADE_GOODS[goodId] };
                    const prices = stationPrices[stationId]?.[goodId];
                    const stock = stationStock[stationId]?.[goodId] || 0;
                    const playerGood = ship.tradeGoods.find(
                        (g) => g.item === goodId,
                    );

                    if (!prices) return null;

                    return (
                        <TradeGoodRow
                            key={goodId}
                            good={good}
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
    );
}

interface TradeGoodRowProps {
    good: { id: string; name: string };
    prices: { buy: number; sell: number };
    stock: number;
    playerGood: { item: string; quantity: number } | undefined;
    credits: number;
    availSpace: number;
    onBuy: (goodId: string, quantity: number) => void;
    onSell: (goodId: string, quantity: number) => void;
}

function TradeGoodRow({
    good,
    prices,
    stock,
    playerGood,
    credits,
    availSpace,
    onBuy,
    onSell,
}: TradeGoodRowProps) {
    return (
        <div className="flex justify-between items-center bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-3">
            <TradeGoodInfo
                good={good}
                prices={prices}
                stock={stock}
                playerGood={playerGood}
            />
            <TradeButtons
                goodId={good.id}
                prices={prices}
                stock={stock}
                playerGood={playerGood}
                credits={credits}
                availSpace={availSpace}
                onBuy={onBuy}
                onSell={onSell}
            />
        </div>
    );
}

function TradeGoodInfo({
    good,
    prices,
    stock,
    playerGood,
}: {
    good: { id: string; name: string };
    prices: { buy: number; sell: number };
    stock: number;
    playerGood: { item: string; quantity: number } | undefined;
}) {
    // Calculate per-unit price (prices are stored as 5-ton batches)
    const buyPerUnit = Math.floor(prices.buy / 5);
    const sellPerUnit = Math.floor(prices.sell / 5);

    return (
        <div className="flex-1">
            <div className="text-[#00d4ff] font-bold">{good.name}</div>
            <div className="text-[#ffb000] text-xs mt-1">
                Купить: {buyPerUnit}₢/т | Продать: {sellPerUnit}₢/т
            </div>
            <div className="text-[11px] mt-1">
                <span className="text-[#00ff41]">На станции: {stock}т</span>
                {playerGood && (
                    <span className="text-[#00d4ff] ml-3">
                        В трюме: {playerGood.quantity}т
                    </span>
                )}
            </div>
        </div>
    );
}

function TradeButtons({
    goodId,
    prices,
    stock,
    playerGood,
    credits,
    availSpace,
    onBuy,
    onSell,
}: {
    goodId: string;
    prices: { buy: number; sell: number };
    stock: number;
    playerGood: { item: string; quantity: number } | undefined;
    credits: number;
    availSpace: number;
    onBuy: (goodId: string, quantity: number) => void;
    onSell: (goodId: string, quantity: number) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1">
            <BuyButton
                quantity={1}
                disabled={
                    availSpace < 1 ||
                    credits < Math.floor(prices.buy / 5) ||
                    stock < 1
                }
                onBuy={() => onBuy(goodId, 1)}
            />
            <BuyButton
                quantity={5}
                disabled={availSpace < 5 || credits < prices.buy || stock < 5}
                onBuy={() => onBuy(goodId, 5)}
            />
            <BuyButton
                quantity={15}
                disabled={
                    availSpace < 15 ||
                    credits < Math.floor(prices.buy * 3) ||
                    stock < 15
                }
                onBuy={() => onBuy(goodId, 15)}
            />
            <SellButton
                quantity={15}
                disabled={!playerGood || playerGood.quantity < 15}
                onSell={() => onSell(goodId, 15)}
            />
            <SellButton
                quantity={5}
                disabled={!playerGood || playerGood.quantity < 5}
                onSell={() => onSell(goodId, 5)}
            />
            <SellButton
                quantity={1}
                disabled={!playerGood || playerGood.quantity < 1}
                onSell={() => onSell(goodId, 1)}
            />
        </div>
    );
}

function BuyButton({
    quantity,
    disabled,
    onBuy,
}: {
    quantity: number;
    disabled: boolean;
    onBuy: () => void;
}) {
    return (
        <Button
            disabled={disabled}
            onClick={onBuy}
            className="bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-[9px] px-1.5"
        >
            +{quantity}
        </Button>
    );
}

function SellButton({
    quantity,
    disabled,
    onSell,
}: {
    quantity: number;
    disabled: boolean;
    onSell: () => void;
}) {
    return (
        <Button
            disabled={disabled}
            onClick={onSell}
            className="bg-transparent border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase text-[9px] px-1.5"
        >
            -{quantity}
        </Button>
    );
}
