"use client";

import { Button } from "@/components/ui/button";

interface ServicesTabProps {
    fuel: number;
    maxFuel: number;
    fuelPricePerUnit: number;
    fullRefuelPrice: number;
    refuel: (amount: number, price: number) => void;
    repairShip: () => void;
    healCrew: () => void;
    scrapModule: (moduleId: number) => void;
    credits: number;
    ship: {
        modules: Array<{
            id: number;
            name: string;
            type: string;
            level?: number;
            disabled?: boolean;
        }>;
    };
}

export function ServicesTab({
    fuel,
    maxFuel,
    fuelPricePerUnit,
    fullRefuelPrice,
    refuel,
    repairShip,
    healCrew,
    scrapModule,
    credits,
    ship,
}: ServicesTabProps) {
    const fuelNeeded = maxFuel - fuel;

    return (
        <div className="flex flex-col gap-4">
            <RefuelSection
                fuel={fuel}
                maxFuel={maxFuel}
                fuelNeeded={fuelNeeded}
                fuelPricePerUnit={fuelPricePerUnit}
                fullRefuelPrice={fullRefuelPrice}
                credits={credits}
                onRefuel={refuel}
            />

            <RepairSection credits={credits} onRepair={repairShip} />
            <HealSection credits={credits} onHeal={healCrew} />
            <ScrapModuleSection ship={ship} onScrap={scrapModule} />
        </div>
    );
}

function RefuelSection({
    fuel,
    maxFuel,
    fuelNeeded,
    fuelPricePerUnit,
    fullRefuelPrice,
    credits,
    onRefuel,
}: {
    fuel: number;
    maxFuel: number;
    fuelNeeded: number;
    fuelPricePerUnit: number;
    fullRefuelPrice: number;
    credits: number;
    onRefuel: (amount: number, price: number) => void;
}) {
    return (
        <div className="bg-[rgba(153,51,255,0.05)] border border-[#9933ff] p-4">
            <div className="text-[#9933ff] font-bold mb-2">
                ⛽ Заправка топливом
            </div>
            <div className="text-sm text-[#00ff41] mb-2">
                Топливо: {fuel}/{maxFuel}
            </div>
            <div className="text-xs mb-3">
                <span className="text-[#ffb000]">
                    Цена: {fuelPricePerUnit}₢ за единицу
                </span>
            </div>
            <div className="flex gap-2">
                <RefuelButton
                    amount={10}
                    price={fuelPricePerUnit * 10}
                    disabled={
                        fuelNeeded <= 0 || credits < fuelPricePerUnit * 10
                    }
                    onRefuel={onRefuel}
                />
                <RefuelButton
                    amount={25}
                    price={fuelPricePerUnit * 25}
                    disabled={
                        fuelNeeded <= 0 || credits < fuelPricePerUnit * 25
                    }
                    onRefuel={onRefuel}
                />
                <RefuelButton
                    amount={fuelNeeded}
                    price={fullRefuelPrice}
                    label="ПОЛНЫЙ БАК"
                    disabled={fuelNeeded <= 0 || credits < fullRefuelPrice}
                    onRefuel={onRefuel}
                />
            </div>
        </div>
    );
}

function RefuelButton({
    amount,
    price,
    label,
    disabled,
    onRefuel,
}: {
    amount: number;
    price: number;
    label?: string;
    disabled: boolean;
    onRefuel: (amount: number, price: number) => void;
}) {
    return (
        <Button
            disabled={disabled}
            onClick={() => onRefuel(amount, price)}
            className="bg-transparent border-2 border-[#9933ff] text-[#9933ff] hover:bg-[#9933ff] hover:text-[#050810] uppercase text-xs"
        >
            {label || `+${amount} (${price}₢)`}
        </Button>
    );
}
function RepairSection({
    credits,
    onRepair,
}: {
    credits: number;
    onRepair: () => void;
}) {
    return (
        <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-4">
            <div className="text-[#00d4ff] font-bold mb-2">
                🔧 Ремонт корабля
            </div>
            <div className="text-sm text-[#00ff41] mb-3">
                Полное восстановление всех модулей до 100%
            </div>
            <div className="flex justify-between items-center">
                <span className="text-[#ffb000]">💰 200₢</span>
                <Button
                    disabled={credits < 200}
                    onClick={onRepair}
                    className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-xs"
                >
                    РЕМОНТ
                </Button>
            </div>
        </div>
    );
}

function HealSection({
    credits,
    onHeal,
}: {
    credits: number;
    onHeal: () => void;
}) {
    return (
        <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-4">
            <div className="text-[#00d4ff] font-bold mb-2">
                💊 Лечение экипажа
            </div>
            <div className="text-sm text-[#00ff41] mb-3">
                Восстановление здоровья до 100% и поднятие настроения на +20
            </div>
            <div className="flex justify-between items-center">
                <span className="text-[#ffb000]">💰 150₢</span>
                <Button
                    disabled={credits < 150}
                    onClick={onHeal}
                    className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-xs"
                >
                    ЛЕЧЕНИЕ
                </Button>
            </div>
        </div>
    );
}

function ScrapModuleSection({
    ship,
    onScrap,
}: {
    ship: ServicesTabProps["ship"];
    onScrap: (moduleId: number) => void;
}) {
    // Essential modules that must have at least 1
    const essentialTypes = [
        "cockpit",
        "reactor",
        "fueltank",
        "engine",
        "lifesupport",
    ];

    // Count enabled modules by type
    const moduleCounts: Record<string, number> = {};
    ship.modules.forEach((m) => {
        if (!(m.disabled ?? false)) {
            moduleCounts[m.type] = (moduleCounts[m.type] || 0) + 1;
        }
    });

    // Get modules that can be scrapped (not the last essential one)
    const scrappableModules = ship.modules.filter((m) => {
        if (m.disabled ?? false) return false;
        if (!essentialTypes.includes(m.type)) return true;
        return (moduleCounts[m.type] || 0) > 1;
    });

    if (scrappableModules.length === 0) return null;

    return (
        <div className="bg-[rgba(255,0,64,0.05)] border border-[#ff0040] p-4">
            <div className="text-[#ff0040] font-bold mb-2">
                ♻️ Утилизация модулей
            </div>
            <div className="text-sm text-[#888] mb-3">
                Получите 20-40% от стоимости модуля
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
                {scrappableModules.map((mod) => (
                    <div
                        key={mod.id}
                        className="flex justify-between items-center bg-[rgba(0,0,0,0.3)] border border-[#ff0040] p-2"
                    >
                        <div className="text-xs">
                            <div className="text-[#00d4ff]">
                                {mod.name}{" "}
                                {mod.level ? `(МК-${mod.level})` : ""}
                            </div>
                            <div className="text-[#888]">
                                ~{Math.floor(300 * 0.3)}-{Math.floor(300 * 0.4)}
                                ₢
                            </div>
                        </div>
                        <Button
                            onClick={() => onScrap(mod.id)}
                            className="bg-transparent border-2 border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810] uppercase text-xs"
                        >
                            УТИЛИЗИРОВАТЬ
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
