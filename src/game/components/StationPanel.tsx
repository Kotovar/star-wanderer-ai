"use client";

import { useState, useEffect, useMemo } from "react";
import { useGameStore } from "../store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RACES } from "../constants/races";
import type { RaceId, Contract, ShopItem, CrewMember } from "../types";
import { ShopTab } from "./station/ShopTab";
import { TradeTab } from "./station/TradeTab";
import { CrewTab } from "./station/CrewTab";
import { ServicesTab } from "./station/ServicesTab";
import { ModuleUpgradeModal } from "./station/ModuleUpgradeModal";
import { Button } from "@/components/ui/button";
// import {
//     Dialog,
//     DialogContent,
//     DialogHeader,
//     DialogTitle,
// } from "@/components/ui/dialog";

// Re-export these from the original file - they contain complex logic
export {
    MODULES_BY_LEVEL,
    UPGRADES_BY_TIER,
    WEAPONS,
    generateStationItems,
    getStationCrewCount,
    generateStationCrew,
} from "./station/station-data";

import {
    generateStationItems,
    // getStationCrewCount,
    generateStationCrew,
} from "./station/station-data";

export function StationPanel() {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const currentSector = useGameStore((s) => s.currentSector);
    const credits = useGameStore((s) => s.credits);
    const ship = useGameStore((s) => s.ship);
    const stationInventory = useGameStore((s) => s.stationInventory);
    const stationPrices = useGameStore((s) => s.stationPrices);
    const stationStock = useGameStore((s) => s.stationStock);
    const buyItem = useGameStore((s) => s.buyItem);
    const repairShip = useGameStore((s) => s.repairShip);
    const healCrew = useGameStore((s) => s.healCrew);
    const scrapModule = useGameStore((s) => s.scrapModule);
    const buyTradeGood = useGameStore((s) => s.buyTradeGood);
    const sellTradeGood = useGameStore((s) => s.sellTradeGood);
    const hireCrew = useGameStore((s) => s.hireCrew);
    const refuel = useGameStore((s) => s.refuel);
    const getCrewCapacity = useGameStore((s) => s.getCrewCapacity);
    const crew = useGameStore((s) => s.crew);
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const discoverRace = useGameStore((s) => s.discoverRace);
    const knownRaces = useGameStore((s) => s.knownRaces);
    const activeContracts = useGameStore((s) => s.activeContracts);
    const completeDeliveryContract = useGameStore(
        (s) => s.completeDeliveryContract,
    );
    const hiredCrew = useGameStore((s) => s.hiredCrew);

    const [activeTab, setActiveTab] = useState("shop");
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [pendingUpgrade, setPendingUpgrade] = useState<ShopItem | null>(null);

    const stationId = currentLocation?.stationId || "";
    const sectorTier = currentSector?.tier || 1;
    const weaponBays = ship.modules.filter(
        (m) => m.type === "weaponbay",
    ).length;
    const stationConfig = currentLocation?.stationConfig;

    const stationItems = useMemo(
        () =>
            generateStationItems(
                stationId,
                sectorTier,
                currentLocation?.stationType,
            ),
        [stationId, sectorTier, currentLocation?.stationType],
    );

    const dominantRace = currentLocation?.dominantRace;
    const race = dominantRace ? RACES[dominantRace] : null;

    useEffect(() => {
        if (dominantRace && race && !knownRaces.includes(dominantRace)) {
            discoverRace(dominantRace);
        }
    }, [dominantRace, race, knownRaces, discoverRace]);

    const deliveryContracts = activeContracts.filter(
        (c) =>
            c.type === "delivery" &&
            c.targetLocationId === currentLocation?.id &&
            ship.cargo.some((cargo) => cargo.contractId === c.id),
    );

    // Get hired crew names for this station
    const availableCrew = useMemo(() => {
        const hiredCrewNames = hiredCrew[stationId] || [];

        return generateStationCrew(
            stationId,
            currentLocation?.dominantRace,
        ).filter((c) => !hiredCrewNames.includes(c.member.name));
    }, [currentLocation?.dominantRace, hiredCrew, stationId]);
    const hasSpace = crew.length < getCrewCapacity();

    // const captainLevel = crew.find((c) => c.profession === "pilot")?.level ?? 1;

    const fuel = ship.fuel;
    const maxFuel = ship.maxFuel;
    const fuelNeeded = maxFuel - fuel;
    const fuelPricePerUnit = 2;
    const fullRefuelPrice = fuelNeeded * fuelPricePerUnit;

    if (!currentLocation) return null;

    return (
        <div className="flex flex-col gap-4">
            <StationHeader
                location={currentLocation}
                sectorTier={sectorTier}
                race={race}
            />

            {deliveryContracts.length > 0 && (
                <DeliveryContracts
                    contracts={deliveryContracts}
                    onComplete={completeDeliveryContract}
                />
            )}

            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full mt-2"
            >
                <TabsList className="grid w-full grid-cols-4 bg-[rgba(0,255,65,0.1)] border border-[#00ff41] h-auto">
                    <TabsTrigger
                        value="shop"
                        className="data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2"
                    >
                        МОДУЛИ
                    </TabsTrigger>
                    <TabsTrigger
                        value="trade"
                        className="data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2"
                    >
                        ТОРГОВЛЯ
                    </TabsTrigger>
                    <TabsTrigger
                        value="crew"
                        className="data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2"
                    >
                        ЭКИПАЖ
                    </TabsTrigger>
                    <TabsTrigger
                        value="services"
                        className="data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2"
                    >
                        УСЛУГИ
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="shop" className="mt-4">
                    <ShopCount
                        stationItems={stationItems}
                        inv={stationInventory[stationId] || {}}
                    />
                    <ShopTab
                        stationId={stationId}
                        stationItems={stationItems}
                        stationInventory={stationInventory}
                        credits={credits}
                        weaponBays={weaponBays}
                        ship={ship}
                        stationConfig={stationConfig}
                        buyItem={buyItem}
                        onUpgradeClick={(item) => {
                            setPendingUpgrade(item);
                            setUpgradeModalOpen(true);
                        }}
                    />
                </TabsContent>

                <TabsContent value="trade" className="mt-4">
                    <TradeTab
                        stationId={stationId}
                        stationPrices={stationPrices}
                        stationStock={stationStock}
                        credits={credits}
                        ship={ship}
                        buyTradeGood={buyTradeGood}
                        sellTradeGood={sellTradeGood}
                    />
                </TabsContent>

                <TabsContent value="crew" className="mt-4">
                    <CrewTab
                        availableCrew={
                            availableCrew as Array<{
                                member: {
                                    name: string;
                                    race: RaceId;
                                    profession: string;
                                    level?: number;
                                    traits: Array<{
                                        name: string;
                                        desc: string;
                                        type: string;
                                    }>;
                                };
                                price: number;
                                quality: string;
                            }>
                        }
                        hasSpace={hasSpace}
                        credits={credits}
                        locationId={stationId}
                        hireCrew={(member, price) =>
                            hireCrew(
                                {
                                    ...(member as Partial<CrewMember>),
                                    price,
                                } as Partial<CrewMember> & {
                                    price: number;
                                },
                                stationId,
                            )
                        }
                    />
                </TabsContent>

                <TabsContent value="services" className="mt-4">
                    <ServicesTab
                        fuel={fuel}
                        maxFuel={maxFuel}
                        fuelPricePerUnit={fuelPricePerUnit}
                        fullRefuelPrice={fullRefuelPrice}
                        refuel={refuel}
                        repairShip={repairShip}
                        healCrew={healCrew}
                        scrapModule={scrapModule}
                        credits={credits}
                        ship={ship}
                    />
                </TabsContent>
            </Tabs>

            <Button
                onClick={showSectorMap}
                className="bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider"
            >
                ПОКИНУТЬ СТАНЦИЮ
            </Button>

            <ModuleUpgradeModal
                open={upgradeModalOpen}
                onOpenChange={setUpgradeModalOpen}
                pendingUpgrade={pendingUpgrade}
                shipModules={ship.modules}
                buyItem={buyItem}
            />
        </div>
    );
}

function StationHeader({
    location,
    sectorTier,
    race,
}: {
    location: { name: string; stationType?: string; dominantRace?: RaceId };
    sectorTier: number;
    race: (typeof RACES)[keyof typeof RACES] | null;
}) {
    return (
        <>
            <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
                ▸ {location.name} - {location.stationType || "Станция"}
            </div>
            <div className="text-xs text-[#888]">Тир сектора: {sectorTier}</div>

            {race && (
                <div
                    className="flex items-center gap-3 text-sm"
                    style={{
                        borderColor: race.color,
                    }}
                >
                    <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded border"
                        style={{
                            borderColor: race.color,
                            backgroundColor: `${race.color}15`,
                        }}
                    >
                        <span className="text-xl">{race.icon}</span>
                        <div>
                            <div
                                style={{ color: race.color }}
                                className="font-bold"
                            >
                                {race.pluralName}
                            </div>
                            <div className="text-xs text-gray-400">
                                Доминирующая раса
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function DeliveryContracts({
    contracts,
    onComplete,
}: {
    contracts: Contract[];
    onComplete: (id: string) => void;
}) {
    return (
        <>
            <div className="font-['Orbitron'] font-bold text-base text-[#00ff41] mt-4">
                Сдать груз
            </div>
            <div className="text-xs text-[#888] mb-2">
                Вы прибыли в место назначения
            </div>
            <div className="flex flex-col gap-2">
                {contracts.map((c) => (
                    <div
                        key={c.id}
                        className="flex justify-between items-center bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-3"
                    >
                        <div className="flex-1">
                            <div className="text-[#00d4ff] font-bold">
                                {c.desc}
                            </div>
                            <div className="text-[11px] mt-1 text-[#00ff41]">
                                📦 Груз &quot;{c.cargo}&quot; (10т)
                            </div>
                            <div className="text-[#ffb000] text-xs mt-1">
                                💰 {c.reward}₢
                            </div>
                        </div>
                        <Button
                            onClick={() => onComplete(c.id)}
                            className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-xs"
                        >
                            СДАТЬ
                        </Button>
                    </div>
                ))}
            </div>
        </>
    );
}

function ShopCount({
    stationItems,
    inv,
}: {
    stationItems: ShopItem[];
    inv: Record<string, number>;
}) {
    const availableCount = stationItems.filter((item) => {
        const stockLeft =
            inv[item.id] !== undefined
                ? Math.max(0, item.stock - inv[item.id])
                : item.stock;
        return stockLeft > 0;
    }).length;

    return (
        <div className="text-xs text-[#888] mb-3">
            Доступно товаров: {availableCount}
        </div>
    );
}
