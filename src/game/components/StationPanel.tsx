"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useGameStore } from "../store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RACES } from "../constants/races";
import {
    FUEL_PRICE_PER_UNIT,
    MUTATION_CURE_PRICE,
} from "../slices/services/constants";
import type {
    RaceId,
    Contract,
    ShopItem,
    CrewMember,
    Profession,
    CrewTrait,
    StationName,
} from "@/game/types";
import { ShopTab } from "./station/ShopTab";
import { TradeTab } from "./station/TradeTab";
import { CrewTab } from "./station/CrewTab";
import { ServicesTab, RESEARCH_BUY_PRICES } from "./station/ServicesTab";
import { CraftingTab } from "./station/CraftingTab";
import { ModuleUpgradeModal } from "./station/ModuleUpgradeModal";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import {
    canHireRace,
    getRaceReputation,
    getRaceReputationLevel,
} from "../reputation/utils";
import {
    getDiplomacyCost,
    MAX_DIPLOMATIC_REP,
    DIPLOMACY_BLOCK_SIZE,
} from "../reputation/diplomacy";
import {
    REPUTATION_COLORS,
    REPUTATION_ICONS,
    getReputationLevel,
} from "../types/reputation";
import { RaceSprite } from "./RaceSprite";
import { getEmergencyFuelAmount } from "@/game/progression/emergencyFuel";
import { calculateFuelCostForUI } from "@/game/slices/travel/helpers";

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

const STATION_BACKGROUNDS = {
    trade: "/assets/station-backgrounds/trade-hub.webp",
    military: "/assets/station-backgrounds/military-bastion.webp",
    research: "/assets/station-backgrounds/research-observatory.webp",
    mining: "/assets/station-backgrounds/mining-refinery.webp",
    shipyard: "/assets/station-backgrounds/shipyard-drydock.webp",
    medical: "/assets/station-backgrounds/medical-bay.webp",
    diplomatic: "/assets/station-backgrounds/diplomatic-forum.webp",
} satisfies Record<StationName, string>;

export function StationPanel() {
    const { t } = useTranslation();
    const currentLocation = useGameStore((s) => s.currentLocation);
    const currentSector = useGameStore((s) => s.currentSector);
    const credits = useGameStore((s) => s.credits);
    const ship = useGameStore((s) => s.ship);
    const stationInventory = useGameStore((s) => s.stationInventory);
    const stationPrices = useGameStore((s) => s.stationPrices);
    const stationStock = useGameStore((s) => s.stationStock);
    const raceReputation = useGameStore((s) => s.raceReputation);
    const buyItem = useGameStore((s) => s.buyItem);
    const repairShip = useGameStore((s) => s.repairShip);
    const healCrew = useGameStore((s) => s.healCrew);
    const cureMutation = useGameStore((s) => s.cureMutation);

    // Ensure credits are always displayed as integers
    const displayCredits = Math.floor(credits);
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
    const probes = useGameStore((s) => s.probes);
    const buyProbe = useGameStore((s) => s.buyProbe);
    const research = useGameStore((s) => s.research);
    const addLog = useGameStore((s) => s.addLog);
    const getCrewCapacity = useGameStore((s) => s.getCrewCapacity);
    const getCargoCapacity = useGameStore((s) => s.getCargoCapacity);
    const crew = useGameStore((s) => s.crew);
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const discoverRace = useGameStore((s) => s.discoverRace);
    const knownRaces = useGameStore((s) => s.knownRaces);
    const bannedPlanets = useGameStore((s) => s.bannedPlanets);
    const emergencyFuelStationIds = useGameStore(
        (s) => s.emergencyFuelStationIds,
    );
    const sendDiplomaticGift = useGameStore((s) => s.sendDiplomaticGift);
    const removePlanetBan = useGameStore((s) => s.removePlanetBan);
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
    const isResearchStation = currentLocation?.stationType === "research";

    // Station service flags (default true for backwards compat with old saves)
    const allowsTrade = stationConfig?.allowsTrade ?? true;
    const allowsCraft = stationConfig?.allowsCraft ?? true;
    const allowsModuleInstall = stationConfig?.allowsModuleInstall ?? true;
    const allowsCrewHeal = stationConfig?.allowsCrewHeal ?? true;
    const allowsMutationCure =
        allowsCrewHeal && researchedTechs.includes("xenobiology");
    const allowsAugmentation =
        allowsCrewHeal && researchedTechs.includes("cybernetic_augmentation");

    const isDiplomaticStation = currentLocation?.stationType === "diplomatic";
    const hasDiplomacy = isDiplomaticStation;

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
        ).filter((c) => {
            if (hiredCrewNames.includes(c.member.name)) return false;
            // Block hiring crew from races that are hostile to us
            return canHireRace(raceReputation, c.member.race as RaceId);
        });
    }, [
        currentLocation?.dominantRace,
        hiredCrew,
        raceReputation,
        stationId,
        currentLocation?.stationConfig,
    ]);
    const hasSpace = crew.length < getCrewCapacity();

    // const captainLevel = crew.find((c) => c.profession === "pilot")?.level ?? 1;

    const fuel = ship.fuel;
    const maxFuel = ship.maxFuel;
    const fuelNeeded = maxFuel - fuel;
    const fuelPricePerUnit = FUEL_PRICE_PER_UNIT;
    const fullRefuelPrice = fuelNeeded * fuelPricePerUnit;
    const state = useGameStore.getState();
    const minimumJumpCost = Math.min(
        ...state.galaxy.sectors
            .filter((sector) => sector.id !== currentSector?.id)
            .map((sector) => calculateFuelCostForUI(state, sector.id).fuelCost),
    );
    const emergencyFuelAmount = getEmergencyFuelAmount(
        fuel,
        maxFuel,
        credits,
        minimumJumpCost,
        stationId,
        emergencyFuelStationIds,
        FUEL_PRICE_PER_UNIT,
    );

    const claimEmergencyFuel = () => {
        if (emergencyFuelAmount <= 0) return;
        useGameStore.setState((draft) => ({
            ship: {
                ...draft.ship,
                fuel: Math.min(
                    draft.ship.maxFuel,
                    draft.ship.fuel + emergencyFuelAmount,
                ),
            },
            emergencyFuelStationIds: [
                ...draft.emergencyFuelStationIds,
                stationId,
            ],
        }));
        addLog(t("services.emergency_fuel_log", { amount: emergencyFuelAmount }), "info");
        useGameStore.getState().saveGame();
    };

    if (!currentLocation) return null;
    const stationBackground =
        STATION_BACKGROUNDS[currentLocation.stationType ?? "trade"] ??
        STATION_BACKGROUNDS.trade;

    return (
        <div className="flex flex-col gap-2 sm:gap-4 h-full">
            <section className="relative min-h-0 sm:min-h-52 overflow-hidden rounded border border-[#00ff4155]">
                <Image
                    src={stationBackground}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    preload
                    unoptimized
                    className="object-cover"
                />
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "linear-gradient(90deg, rgba(5,8,16,0.97) 0%, rgba(5,8,16,0.78) 57%, rgba(5,8,16,0.22) 100%)",
                    }}
                />
                <div
                    className="absolute inset-x-0 bottom-0 h-2/3"
                    style={{
                        background:
                            "linear-gradient(0deg, rgba(5,8,16,0.9) 0%, rgba(5,8,16,0) 100%)",
                    }}
                />
                <div className="relative z-10 flex min-h-0 sm:min-h-52 flex-col justify-between gap-2 sm:gap-4 p-3 sm:p-5">
                    <StationHeader
                        location={currentLocation}
                        sectorTier={sectorTier}
                        race={race}
                        raceReputation={raceReputation}
                        onLeave={showSectorMap}
                        t={t}
                    />
                </div>
            </section>

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
                    className="flex w-full overflow-x-auto bg-[rgba(0,255,65,0.1)] border border-[#00ff41] h-auto"
                >
                    <TabsTrigger
                        value="shop"
                        className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2 shrink-0 whitespace-nowrap px-3"
                    >
                        {t("station.modules_tab")}
                    </TabsTrigger>
                    {allowsTrade && (
                        <TabsTrigger
                            value="trade"
                            className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2 shrink-0 whitespace-nowrap px-3"
                        >
                            {t("station.trade_tab")}
                        </TabsTrigger>
                    )}
                    <TabsTrigger
                        value="crew"
                        className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2 shrink-0 whitespace-nowrap px-3"
                    >
                        {t("station.crew_tab")}
                    </TabsTrigger>
                    <TabsTrigger
                        value="services"
                        className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2 shrink-0 whitespace-nowrap px-3"
                    >
                        {t("station.services_tab")}
                    </TabsTrigger>
                    {allowsCraft && (
                        <TabsTrigger
                            value="crafting"
                            className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2 shrink-0 whitespace-nowrap px-3"
                        >
                            {t("station.craft")}
                        </TabsTrigger>
                    )}
                    {hasDiplomacy && (
                        <TabsTrigger
                            value="diplomacy"
                            className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2 shrink-0 whitespace-nowrap px-3"
                        >
                            <span>{t("station.diplomacy_tab")}</span>
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent
                    value="shop"
                    className="mt-4 min-h-0 overflow-hidden flex flex-col"
                >
                    <ShopTab
                        stationId={stationId}
                        stationItems={stationItems}
                        stationInventory={stationInventory}
                        credits={displayCredits}
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
                    <TabsContent
                        value="trade"
                        className="mt-4 min-h-0 overflow-hidden flex flex-col"
                    >
                        <TradeTab
                            stationId={stationId}
                            stationPrices={stationPrices}
                            stationStock={stationStock}
                            credits={displayCredits}
                            ship={ship}
                            cargoCapacity={getCargoCapacity()}
                            buyTradeGood={buyTradeGood}
                            sellTradeGood={sellTradeGood}
                        />
                    </TabsContent>
                )}

                <TabsContent
                    value="crew"
                    className="mt-4 min-h-0 overflow-hidden flex flex-col"
                >
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
                        credits={displayCredits}
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

                <TabsContent
                    value="services"
                    className="mt-4 min-h-0 overflow-hidden flex flex-col"
                >
                    <ServicesTab
                        fuel={fuel}
                        maxFuel={maxFuel}
                        fuelPricePerUnit={fuelPricePerUnit}
                        fullRefuelPrice={fullRefuelPrice}
                        refuel={refuel}
                        emergencyFuelAmount={emergencyFuelAmount}
                        onClaimEmergencyFuel={claimEmergencyFuel}
                        repairShip={repairShip}
                        healCrew={healCrew}
                        scrapModule={scrapModule}
                        removeWeapon={removeWeapon}
                        installModuleFromCargo={installModuleFromCargo}
                        installCraftedWeapon={installCraftedWeapon}
                        cureMutation={cureMutation}
                        credits={displayCredits}
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
                        probes={probes}
                        onBuyProbe={buyProbe}
                        isResearchStation={isResearchStation}
                        researchResources={research.resources}
                        onSellResearchResource={(type, qty) => {
                            const price =
                                {
                                    tech_salvage: 50,
                                    rare_minerals: 80,
                                    alien_biology: 120,
                                    ancient_data: 150,
                                    energy_samples: 200,
                                    void_membrane: 300,
                                    quantum_crystals: 500,
                                }[type] ?? 0;
                            const earned = price * qty;
                            useGameStore.setState((s) => ({
                                credits: s.credits + earned,
                                research: {
                                    ...s.research,
                                    resources: {
                                        ...s.research.resources,
                                        [type]: Math.max(
                                            0,
                                            (s.research.resources[type] ?? 0) -
                                                qty,
                                        ),
                                    },
                                },
                            }));
                            addLog(
                                `📊 Проданы исследовательские данные: ${qty}× → +${earned}₢`,
                                "info",
                            );
                        }}
                        onBuyResearchResource={(type, qty) => {
                            const price = RESEARCH_BUY_PRICES[type] ?? 0;
                            const cost = price * qty;
                            if (price <= 0) return;
                            if (useGameStore.getState().credits < cost) {
                                addLog(
                                    "Недостаточно кредитов для закупки материалов!",
                                    "error",
                                );
                                return;
                            }
                            useGameStore.setState((s) => ({
                                credits: s.credits - cost,
                                research: {
                                    ...s.research,
                                    resources: {
                                        ...s.research.resources,
                                        [type]:
                                            (s.research.resources[type] ?? 0) +
                                            qty,
                                    },
                                },
                            }));
                            addLog(
                                `🔬 Закуплены исследовательские материалы: ${qty}× → -${cost}₢`,
                                "info",
                            );
                        }}
                    />
                </TabsContent>
                {allowsCraft && (
                    <TabsContent
                        value="crafting"
                        className="mt-4 min-h-0 overflow-hidden flex flex-col"
                    >
                        <CraftingTab />
                    </TabsContent>
                )}
                {hasDiplomacy && (
                    <TabsContent
                        value="diplomacy"
                        className="mt-4 min-h-0 overflow-y-auto flex flex-col gap-4"
                    >
                        {/* Reputation purchase */}
                        <div>
                            <div className="text-xs text-[#888] mb-2">
                                {t("station.diplomacy_title")}
                            </div>
                            <div className="flex flex-col gap-2">
                                {knownRaces.map((raceId) => {
                                    const raceData = RACES[raceId];
                                    const rep = raceReputation[raceId] ?? 0;
                                    const atCap = rep >= MAX_DIPLOMATIC_REP;
                                    const cost = atCap
                                        ? 0
                                        : getDiplomacyCost(
                                              rep,
                                              DIPLOMACY_BLOCK_SIZE,
                                          );
                                    const repColor =
                                        getRaceReputationLevel(
                                            raceReputation,
                                            raceId,
                                        ) === "hostile"
                                            ? "#ff0040"
                                            : rep < 0
                                              ? "#ffb000"
                                              : "#00ff41";
                                    return (
                                        <div
                                            key={raceId}
                                            className="flex items-center justify-between gap-3 p-2 rounded border border-[#333]"
                                        >
                                            <div className="flex items-center gap-2">
                                                <RaceSprite
                                                    race={raceId}
                                                    size={26}
                                                    title={raceData.name}
                                                />
                                                <div>
                                                    <div
                                                        className="text-xs font-bold"
                                                        style={{
                                                            color: raceData.color,
                                                        }}
                                                    >
                                                        {raceData.name}
                                                    </div>
                                                    <div
                                                        className="text-xs"
                                                        style={{
                                                            color: repColor,
                                                        }}
                                                    >
                                                        {t(
                                                            "station.diplomacy_current",
                                                            {
                                                                rep: `${rep > 0 ? "+" : ""}${rep}`,
                                                            },
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {atCap ? (
                                                <span className="text-xs text-[#888]">
                                                    {t(
                                                        "station.diplomacy_max_reached",
                                                    )}
                                                </span>
                                            ) : (
                                                <Button
                                                    onClick={() =>
                                                        sendDiplomaticGift(
                                                            raceId,
                                                            DIPLOMACY_BLOCK_SIZE,
                                                        )
                                                    }
                                                    disabled={credits < cost}
                                                    className="bg-transparent border border-accent text-accent hover:bg-accent hover:text-[#050810] text-xs px-2 py-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    {t(
                                                        "station.diplomacy_buy_rep",
                                                        {
                                                            amount: DIPLOMACY_BLOCK_SIZE,
                                                        },
                                                    )}{" "}
                                                    / {cost}₢
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Banned planet removal */}
                        <div>
                            <div className="text-xs text-[#888] mb-2">
                                {t("station.diplomacy_banned_planets")}
                            </div>
                            {bannedPlanets.length === 0 ? (
                                <div className="text-xs text-[#555]">
                                    {t("station.diplomacy_no_banned")}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {bannedPlanets.map((planetId) => {
                                        const planetLoc =
                                            currentSector?.locations.find(
                                                (l) => l.id === planetId,
                                            ) ?? null;
                                        const displayName =
                                            planetLoc?.name ?? planetId;
                                        return (
                                            <div
                                                key={planetId}
                                                className="flex items-center justify-between gap-3 p-2 rounded border border-destructive bg-[rgba(255,0,64,0.05)]"
                                            >
                                                <div className="text-xs text-destructive">
                                                    ⛔ {displayName}
                                                </div>
                                                <Button
                                                    onClick={() =>
                                                        removePlanetBan(
                                                            planetId,
                                                        )
                                                    }
                                                    disabled={credits < 2000}
                                                    className="bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] text-xs px-2 py-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    {t(
                                                        "station.diplomacy_lift_ban",
                                                    )}
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
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
    raceReputation,
    onLeave,
    t,
}: {
    location: { name: string; stationType?: string; dominantRace?: RaceId };
    sectorTier: number;
    race: (typeof RACES)[keyof typeof RACES] | null;
    raceReputation: Record<RaceId, number> | undefined;
    onLeave: () => void;
    t: (key: string, params?: Record<string, string | number>) => string;
}) {
    // Station type is already a translation key (trade, military, mining, research)
    const stationTypeKey = location.stationType || undefined;

    // Extract station name - handle station_name.X formats
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

    const dominantRace = location.dominantRace;
    const hasRep = Boolean(raceReputation && dominantRace);
    const repValue =
        raceReputation && dominantRace
            ? getRaceReputation(raceReputation, dominantRace)
            : 0;
    const repLevel = getReputationLevel(repValue);
    const repColor = REPUTATION_COLORS[repLevel];
    const repIcon = REPUTATION_ICONS[repLevel];
    const repSigned = (repValue > 0 ? "+" : "") + repValue;
    const repTextLevel =
        raceReputation && dominantRace
            ? getRaceReputationLevel(raceReputation, dominantRace)
            : "";

    return (
        <>
            <div className="flex items-start justify-between gap-2">
                <div>
                    <div className="font-['Orbitron'] font-bold text-sm sm:text-lg text-accent">
                        {t("station_upgrades.title", {
                            name: getStationName(location.name),
                            type: stationTypeKey
                                ? t(
                                      `station_upgrades.station_types.${stationTypeKey}`,
                                  )
                                : t("events.station"),
                        })}
                    </div>
                    <div className="text-xs text-[#888]">
                        {t("station.sector_tier").replace(
                            "{{tier}}",
                            String(sectorTier),
                        )}
                    </div>
                </div>
                <Button
                    onClick={onLeave}
                    className="h-auto shrink-0 cursor-pointer border-2 border-accent bg-transparent px-2 py-1 text-[10px] uppercase tracking-wider text-accent hover:bg-accent hover:text-[#050810] sm:px-4 sm:py-2 sm:text-sm"
                >
                    {t("station.leave")}
                </Button>
            </div>

            {race && (
                <div
                    className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm"
                    style={{
                        borderColor: race.color,
                    }}
                >
                    <div
                        className="flex items-center gap-1.5 px-1.5 py-0.5 sm:gap-2 sm:px-3 sm:py-1.5 rounded border"
                        style={{
                            borderColor: race.color,
                            backgroundColor: `${race.color}15`,
                        }}
                    >
                        <RaceSprite
                            race={dominantRace ?? "human"}
                            size={28}
                            title={t(`race_names.${dominantRace}`)}
                        />
                        <div>
                            <div
                                style={{ color: race.color }}
                                className="font-bold flex items-center gap-1.5"
                            >
                                {t(`race_names.${dominantRace}`) ||
                                    race.pluralName}
                                {hasRep && (
                                    <span
                                        className="sm:hidden text-xs font-normal"
                                        style={{ color: repColor }}
                                        title={t(
                                            `reputation.levels.${repTextLevel}`,
                                        )}
                                    >
                                        {repIcon} {repSigned}
                                    </span>
                                )}
                            </div>
                            <div className="hidden sm:block text-xs text-gray-400">
                                {t("station_upgrades.dominant_race")}
                            </div>
                        </div>
                    </div>

                    {/* Полный бейдж репутации — только десктоп */}
                    {hasRep && (
                        <div
                            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded border text-xs"
                            style={{
                                borderColor: repColor,
                                backgroundColor: `${repColor}15`,
                            }}
                        >
                            <span>{repIcon}</span>
                            <span style={{ color: repColor }}>
                                {t(`reputation.levels.${repTextLevel}`)}
                            </span>
                            <span className="text-gray-400">({repSigned})</span>
                        </div>
                    )}
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
                            <div className="text-ring font-bold">
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
                            <div className="text-accent text-xs mt-1">
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
