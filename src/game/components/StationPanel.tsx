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
import { getRaceReputation, getRaceReputationLevel } from "../reputation/utils";
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
            const crewRace = c.member.race as RaceId;
            if (
                crewRace &&
                getRaceReputationLevel(raceReputation, crewRace) === "hostile"
            ) {
                return false;
            }
            return true;
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
    const fuelPricePerUnit = 2;
    const fullRefuelPrice = fuelNeeded * fuelPricePerUnit;

    if (!currentLocation) return null;

    return (
        <div className="flex flex-col gap-4 h-full">
            <StationHeader
                location={currentLocation}
                sectorTier={sectorTier}
                race={race}
                raceReputation={raceReputation}
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
                        gridTemplateColumns: `repeat(${3 + (allowsTrade ? 1 : 0) + (allowsCraft ? 1 : 0) + (hasDiplomacy ? 1 : 0)}, minmax(0, 1fr))`,
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
                    {hasDiplomacy && (
                        <TabsTrigger
                            value="diplomacy"
                            className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2"
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
                                                    className="bg-transparent border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] text-xs px-2 py-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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
                                                className="flex items-center justify-between gap-3 p-2 rounded border border-[#ff0040] bg-[rgba(255,0,64,0.05)]"
                                            >
                                                <div className="text-xs text-[#ff0040]">
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
    t,
}: {
    location: { name: string; stationType?: string; dominantRace?: RaceId };
    sectorTier: number;
    race: (typeof RACES)[keyof typeof RACES] | null;
    raceReputation: Record<RaceId, number> | undefined;
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
                        <RaceSprite
                            race={location.dominantRace ?? "human"}
                            size={40}
                            title={t(`race_names.${location.dominantRace}`)}
                        />
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

                    {/* Reputation badge */}
                    {raceReputation && location.dominantRace && (
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded border text-xs"
                            style={{
                                borderColor:
                                    REPUTATION_COLORS[
                                        getReputationLevel(
                                            getRaceReputation(
                                                raceReputation,
                                                location.dominantRace,
                                            ),
                                        )
                                    ],
                                backgroundColor: `${
                                    REPUTATION_COLORS[
                                        getReputationLevel(
                                            getRaceReputation(
                                                raceReputation,
                                                location.dominantRace,
                                            ),
                                        )
                                    ]
                                }15`,
                            }}
                        >
                            <span>
                                {
                                    REPUTATION_ICONS[
                                        getReputationLevel(
                                            getRaceReputation(
                                                raceReputation,
                                                location.dominantRace,
                                            ),
                                        )
                                    ]
                                }
                            </span>
                            <span
                                style={{
                                    color: REPUTATION_COLORS[
                                        getReputationLevel(
                                            getRaceReputation(
                                                raceReputation,
                                                location.dominantRace,
                                            ),
                                        )
                                    ],
                                }}
                            >
                                {t(
                                    `reputation.levels.${getRaceReputationLevel(raceReputation, location.dominantRace)}`,
                                )}
                            </span>
                            <span className="text-gray-400">
                                (
                                {getRaceReputation(
                                    raceReputation,
                                    location.dominantRace,
                                ) > 0
                                    ? "+"
                                    : ""}
                                {getRaceReputation(
                                    raceReputation,
                                    location.dominantRace,
                                )}
                                )
                            </span>
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
