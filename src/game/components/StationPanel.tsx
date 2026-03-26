"use client";

import { useState, useEffect, useMemo } from "react";
import { useGameStore } from "../store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RACES } from "../constants/races";
import { MUTATION_CURE_PRICE } from "../slices/services/constants";
import type {
    RaceId,
    Contract,
    ShopItem,
    CrewMember,
    Profession,
    CrewTrait,
} from "@/game/types";
import { ShopTab } from "./station/ShopTab";
import { TradeTab } from "./station/TradeTab";
import { CrewTab } from "./station/CrewTab";
import { ServicesTab } from "./station/ServicesTab";
import { CraftingTab } from "./station/CraftingTab";
import { ModuleUpgradeModal } from "./station/ModuleUpgradeModal";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";

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
    generateStationCrew,
} from "./station/station-data";
import { DELIVERY_GOODS } from "@/game/constants";
import { DELIVERY_CONTRACT_CARGO_AMOUNT } from "@/game/slices/contracts/constants";

export function StationPanel() {
    const { t } = useTranslation();
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
    const cureMutation = useGameStore((s) => s.cureMutation);
    const researchedTechs = useGameStore((s) => s.research.researchedTechs);
    const scrapModule = useGameStore((s) => s.scrapModule);
    const removeWeapon = useGameStore((s) => s.removeWeapon);
    const installModuleFromCargo = useGameStore(
        (s) => s.installModuleFromCargo,
    );
    const installCraftedWeapon = useGameStore((s) => s.installCraftedWeapon);
    const installAugmentation = useGameStore((s) => s.installAugmentation);
    const removeAugmentation = useGameStore((s) => s.removeAugmentation);
    const getRepairCost = useGameStore((s) => s.getRepairCost);
    const getHealCost = useGameStore((s) => s.getHealCost);
    const canRepairShip = useGameStore((s) => s.canRepairShip);
    const canHealCrew = useGameStore((s) => s.canHealCrew);
    const buyTradeGood = useGameStore((s) => s.buyTradeGood);
    const sellTradeGood = useGameStore((s) => s.sellTradeGood);
    const hireCrew = useGameStore((s) => s.hireCrew);
    const refuel = useGameStore((s) => s.refuel);
    const getCrewCapacity = useGameStore((s) => s.getCrewCapacity);
    const getCargoCapacity = useGameStore((s) => s.getCargoCapacity);
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
    const stationConfig = currentLocation?.stationConfig;

    // Station service flags (default true for backwards compat with old saves)
    const allowsTrade = stationConfig?.allowsTrade ?? true;
    const allowsCraft = stationConfig?.allowsCraft ?? true;
    const allowsModuleInstall = stationConfig?.allowsModuleInstall ?? true;
    const allowsCrewHeal = stationConfig?.allowsCrewHeal ?? true;
    const allowsMutationCure =
        allowsCrewHeal && researchedTechs.includes("xenobiology");
    const allowsAugmentation =
        allowsCrewHeal && researchedTechs.includes("cybernetic_augmentation");

    const stationItems = useMemo(
        () =>
            generateStationItems(
                stationId,
                sectorTier,
                currentLocation?.stationConfig,
            ),
        [stationId, sectorTier, currentLocation?.stationConfig],
    );

    const crewWithMutations = useMemo(
        () =>
            crew
                .map((c) => ({
                    id: c.id,
                    name: c.name,
                    mutations: (c.traits ?? [])
                        .filter(
                            (trait: CrewTrait) =>
                                trait.type === "mutation" && trait.id !== null,
                        )
                        .map((trait: CrewTrait) => ({
                            id: trait.id ?? "",
                            name: trait.name,
                        })),
                }))
                .filter((c) => c.mutations.length > 0),
        [crew],
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
            currentLocation?.stationConfig,
        ).filter((c) => !hiredCrewNames.includes(c.member.name));
    }, [
        currentLocation?.dominantRace,
        hiredCrew,
        stationId,
        currentLocation?.stationConfig,
    ]);
    const hasSpace = crew.length < getCrewCapacity();

    // const captainLevel = crew.find((c) => c.profession === "pilot")?.level ?? 1;

    const fuel = ship.fuel;
    const maxFuel = ship.maxFuel;
    const fuelNeeded = maxFuel - fuel;
    const fuelPricePerUnit = 2;
    const fullRefuelPrice = fuelNeeded * fuelPricePerUnit;

    if (!currentLocation) return null;

    return (
        <div className="flex flex-col gap-4 h-full">
            <StationHeader
                location={currentLocation}
                sectorTier={sectorTier}
                race={race}
                t={t}
            />

            <Button
                onClick={showSectorMap}
                className="bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider w-fit cursor-pointer"
            >
                {t("station.leave")}
            </Button>

            {deliveryContracts.length > 0 && (
                <DeliveryContracts
                    contracts={deliveryContracts}
                    onComplete={completeDeliveryContract}
                    t={t}
                />
            )}

            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full mt-2 flex-1 min-h-0"
            >
                <TabsList
                    className="grid w-full bg-[rgba(0,255,65,0.1)] border border-[#00ff41] h-auto"
                    style={{
                        gridTemplateColumns: `repeat(${3 + (allowsTrade ? 1 : 0) + (allowsCraft ? 1 : 0)}, minmax(0, 1fr))`,
                    }}
                >
                    <TabsTrigger
                        value="shop"
                        className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2"
                    >
                        {t("station.modules_tab")}
                    </TabsTrigger>
                    {allowsTrade && (
                        <TabsTrigger
                            value="trade"
                            className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2"
                        >
                            {t("station.trade_tab")}
                        </TabsTrigger>
                    )}
                    <TabsTrigger
                        value="crew"
                        className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2"
                    >
                        {t("station.crew_tab")}
                    </TabsTrigger>
                    <TabsTrigger
                        value="services"
                        className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2"
                    >
                        {t("station.services_tab")}
                    </TabsTrigger>
                    {allowsCraft && (
                        <TabsTrigger
                            value="crafting"
                            className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2"
                        >
                            {t("station.craft")}
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="shop" className="mt-4 min-h-0 overflow-hidden flex flex-col">
                    <ShopTab
                        stationId={stationId}
                        stationItems={stationItems}
                        stationInventory={stationInventory}
                        credits={credits}
                        ship={ship}
                        stationConfig={stationConfig}
                        buyItem={buyItem}
                        onUpgradeClick={(item) => {
                            setPendingUpgrade(item);
                            setUpgradeModalOpen(true);
                        }}
                    />
                </TabsContent>

                {allowsTrade && (
                    <TabsContent value="trade" className="mt-4 min-h-0 overflow-hidden flex flex-col">
                        <TradeTab
                            stationId={stationId}
                            stationPrices={stationPrices}
                            stationStock={stationStock}
                            credits={credits}
                            ship={ship}
                            cargoCapacity={getCargoCapacity()}
                            buyTradeGood={buyTradeGood}
                            sellTradeGood={sellTradeGood}
                        />
                    </TabsContent>
                )}

                <TabsContent value="crew" className="mt-4 min-h-0 overflow-hidden flex flex-col">
                    <CrewTab
                        availableCrew={
                            availableCrew as Array<{
                                member: {
                                    name: string;
                                    race: RaceId;
                                    profession: Profession;
                                    level?: number;
                                    traits: CrewTrait[];
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

                <TabsContent value="services" className="mt-4 min-h-0 overflow-hidden flex flex-col">
                    <ServicesTab
                        fuel={fuel}
                        maxFuel={maxFuel}
                        fuelPricePerUnit={fuelPricePerUnit}
                        fullRefuelPrice={fullRefuelPrice}
                        refuel={refuel}
                        repairShip={repairShip}
                        healCrew={healCrew}
                        scrapModule={scrapModule}
                        removeWeapon={removeWeapon}
                        installModuleFromCargo={installModuleFromCargo}
                        installCraftedWeapon={installCraftedWeapon}
                        cureMutation={cureMutation}
                        credits={credits}
                        ship={{
                            ...ship,
                            cargo: ship.cargo,
                            gridSize: ship.gridSize,
                        }}
                        crew={crew}
                        repairCost={getRepairCost().cost}
                        healCost={getHealCost().cost}
                        mutationCureCost={MUTATION_CURE_PRICE}
                        canRepair={canRepairShip()}
                        canHeal={canHealCrew()}
                        allowsCrewHeal={allowsCrewHeal}
                        allowsModuleInstall={allowsModuleInstall}
                        allowsMutationCure={allowsMutationCure}
                        allowsAugmentation={allowsAugmentation}
                        crewWithMutations={crewWithMutations}
                        onInstallAugmentation={installAugmentation}
                        onRemoveAugmentation={removeAugmentation}
                    />
                </TabsContent>
                {allowsCraft && (
                    <TabsContent value="crafting" className="mt-4 min-h-0 overflow-hidden flex flex-col">
                        <CraftingTab />
                    </TabsContent>
                )}
            </Tabs>

            <ModuleUpgradeModal
                open={upgradeModalOpen}
                onOpenChange={setUpgradeModalOpen}
                pendingUpgrade={pendingUpgrade}
                stationItems={stationItems}
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
    t,
}: {
    location: { name: string; stationType?: string; dominantRace?: RaceId };
    sectorTier: number;
    race: (typeof RACES)[keyof typeof RACES] | null;
    t: (key: string, params?: Record<string, string | number>) => string;
}) {
    // Station type is already a translation key (trade, military, mining, research)
    const stationTypeKey = location.stationType || undefined;

    // Extract station name - handle both "station_name.X" keys and "Станция X" / "Station X" formats
    const getStationName = (fullName: string) => {
        // Handle translation key format "station_name.A"
        if (fullName.startsWith("station_name.")) {
            return fullName.replace("station_name.", "");
        }
        // Handle Russian format "Станция A"
        if (fullName.startsWith("Станция ")) {
            return fullName.replace("Станция ", "");
        }
        // Handle English format "Station A"
        if (fullName.startsWith("Station ")) {
            return fullName.replace("Station ", "");
        }
        return fullName;
    };

    return (
        <>
            <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
                {t("station_upgrades.title", {
                    name: getStationName(location.name),
                    type: stationTypeKey
                        ? t(`station_upgrades.station_types.${stationTypeKey}`)
                        : t("events.station"),
                })}
            </div>
            <div className="text-xs text-[#888]">
                {t("station.sector_tier").replace(
                    "{{tier}}",
                    String(sectorTier),
                )}
            </div>

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
                                {t(`race_names.${location.dominantRace}`) ||
                                    race.pluralName}
                            </div>
                            <div className="text-xs text-gray-400">
                                {t("station_upgrades.dominant_race")}
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
    t,
}: {
    contracts: Contract[];
    onComplete: (id: string) => void;
    t: (key: string) => string;
}) {
    const [completingId, setCompletingId] = useState<string | null>(null);

    const handleComplete = (id: string) => {
        setCompletingId(id);
        setTimeout(() => {
            onComplete(id);
            setCompletingId(null);
        }, 300);
    };

    return (
        <>
            <div className="font-['Orbitron'] font-bold text-base text-[#00ff41] mt-4">
                {t("station.deliver_cargo")}
            </div>
            <div className="text-xs text-[#888] mb-2">
                {t("station.arrived_at_destination")}
            </div>
            <div className="flex flex-col gap-2">
                {contracts.map((c) => (
                    <div
                        key={c.id}
                        className={`flex justify-between items-center bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-3 transition-all duration-300 ${
                            completingId === c.id
                                ? "opacity-0 scale-95"
                                : "opacity-100 scale-100"
                        }`}
                    >
                        <div className="flex-1">
                            <div className="text-[#00d4ff] font-bold">
                                {c.desc}
                            </div>
                            <div className="text-[11px] mt-1 text-[#00ff41]">
                                📦 Груз &quot;
                                {c.cargo
                                    ? (DELIVERY_GOODS[
                                          c.cargo as keyof typeof DELIVERY_GOODS
                                      ]?.name ?? c.cargo)
                                    : ""}
                                &quot; (
                                {c.quantity ?? DELIVERY_CONTRACT_CARGO_AMOUNT}
                                т)
                            </div>
                            <div className="text-[#ffb000] text-xs mt-1">
                                💰 {c.reward}₢
                            </div>
                        </div>
                        <Button
                            onClick={() => handleComplete(c.id)}
                            disabled={completingId !== null}
                            className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t("station.submit")}
                        </Button>
                    </div>
                ))}
            </div>
        </>
    );
}
