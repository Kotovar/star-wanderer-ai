"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import { useGameStore } from "../store";
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RACES } from "../constants/races";
import {
    FUEL_PRICE_PER_UNIT,
    GENETIC_THERAPY_PRICE,
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
    StationConfig,
    WeaponType,
} from "@/game/types";
import { ShopTab } from "./station/ShopTab";
import { TradeTab } from "./station/TradeTab";
import { CrewTab } from "./station/CrewTab";
import { ServicesTab } from "./station/ServicesTab";
import { CraftingTab } from "./station/CraftingTab";
import { PirateTab } from "./station/PirateTab";
import { ModuleUpgradeModal } from "./station/ModuleUpgradeModal";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import { getLocationName } from "@/lib/translationHelpers";
import {
    formatContractDescription,
    formatPirateReturnInstruction,
} from "@/game/contracts/formatContractDescription";
import { getSectorRule } from "@/game/galaxy/sectorRules";
import {
    canHireRace,
    getRaceReputation,
    getRaceReputationLevel,
} from "../reputation/utils";
import {
    getDiplomacyCost,
    MAX_DIPLOMATIC_REP,
    DIPLOMACY_BLOCK_SIZE,
    TRANSLATOR_HIRE_COST,
    TRANSLATOR_DIPLOMACY_DISCOUNT,
} from "../reputation/diplomacy";
import {
    REPUTATION_COLORS,
    REPUTATION_ICONS,
    getReputationLevel,
} from "../types/reputation";
import { RaceSprite } from "./RaceSprite";
import { getEmergencyFuelAmount } from "@/game/progression/emergencyFuel";
import { calculateFuelCostForUI } from "@/game/slices/travel/helpers";
import { GameDialogContent } from "./GameDialog";

import {
    generateStationItems,
    generateStationCrew,
} from "./station/station-data";
import { RESEARCH_BOOST_EFFECT_ID } from "@/game/slices/research/methods/activateResearchBoost";
import {
    getStationRateValue,
    getStationRates,
    getStationServiceKeys,
    STATION_DISCOVERY_ICONS,
} from "@/game/stations/discovery";
import {
    getResearchMaterialPurchaseKey,
    getResearchMaterialStock,
    getResearchMaterialStocks,
    RESEARCH_STATION_BUY_PRICES,
} from "@/game/stations/researchMaterials";
import { getNebulaFrontProgress } from "@/game/crises/nebulaFront";
import { getPirateRank } from "@/game/slices/pirate/standing";
import { hasRequiredDeliveryCargo } from "@/game/contracts/contractCargo";
import { getFreeCargoSpace } from "@/game/slices/ship/helpers/getCargoCapacity";
import {
    getStationCraftingCapabilities,
    getStationInstallationCapabilities,
} from "@/game/galaxy/config";

const STATION_BACKGROUNDS = {
    trade: "/assets/station-backgrounds/trade-hub.webp",
    military: "/assets/station-backgrounds/military-bastion.webp",
    research: "/assets/station-backgrounds/research-observatory.webp",
    mining: "/assets/station-backgrounds/mining-refinery.webp",
    shipyard: "/assets/station-backgrounds/shipyard-drydock.webp",
    medical: "/assets/station-backgrounds/medical-bay.webp",
    diplomatic: "/assets/station-backgrounds/diplomatic-forum.webp",
    pirate: "/assets/station-backgrounds/pirate-haven.webp",
} satisfies Record<StationName, string>;

function StationDiscoveryModal({
    stationType,
    stationConfig,
    onClose,
}: {
    stationType: StationName | null;
    stationConfig?: StationConfig;
    onClose: () => void;
}) {
    const { t } = useTranslation();
    if (!stationType) return null;
    const isPirateStation = stationType === "pirate";

    const marketRates = getStationRates(stationConfig).map((rate) => ({
        label: t(`station_discovery.rate_${rate.key}`),
        value: getStationRateValue(rate),
        color:
            rate.kind === "discount" ? "text-[#00ff41]" : "text-[#ffb000]",
    }));

    const guaranteedRows = [
        {
            label: t("station_discovery.guaranteed_crew"),
            values: stationConfig?.guaranteedProfessions?.map((profession) =>
                t(`professions.${profession}`),
            ) ?? [],
            color: "border-[#00d4ff66] text-[#00d4ff]",
        },
        {
            label: t("station_discovery.guaranteed_modules"),
            values: stationConfig?.guaranteedModules.map((module) =>
                t(`module_names.${module}`),
            ) ?? [],
            color: "border-[#00ff4166] text-[#00ff41]",
        },
        {
            label: t("station_discovery.guaranteed_weapons"),
            values: stationConfig?.guaranteedWeapons.map((weapon) =>
                t(`weapon_types.${weapon}`),
            ) ?? [],
            color: "border-[#ffb00066] text-[#ffb000]",
        },
    ];

    const services = getStationServiceKeys(stationType, stationConfig).map(
        (service) => t(`station_discovery.service_${service}`),
    );

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <GameDialogContent className="max-h-[85dvh] max-w-xl overflow-y-auto bg-[rgba(5,12,20,0.98)]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 font-['Orbitron'] text-[#00d4ff]">
                        <span className="flex size-10 items-center justify-center border border-[#00d4ff88] bg-[rgba(0,212,255,0.1)] text-2xl">
                            {STATION_DISCOVERY_ICONS[stationType]}
                        </span>
                        <span>
                            {t("station_discovery.title", {
                                type: t(`locations.station_types.${stationType}`),
                            })}
                        </span>
                    </DialogTitle>
                    <DialogDescription className="text-xs uppercase tracking-[0.16em] text-[#6b8791]">
                        {t("station_discovery.manifest")}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 p-4">
                    <section>
                        <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-[#00d4ff]">
                            <span>
                                {t(
                                    isPirateStation
                                        ? "station_discovery.pirate_market_conditions"
                                        : "station_discovery.market_conditions",
                                )}
                            </span>
                            <span className="text-[#4c6873]">MARKET</span>
                        </div>
                        {isPirateStation ? (
                            <div className="border border-[#ff004044] bg-[rgba(255,0,64,0.06)] px-3 py-2 text-sm text-[#ffb3bf]">
                                {t("station_discovery.pirate_market_desc")}
                            </div>
                        ) : marketRates.length > 0 ? (
                            <div className="grid grid-cols-2 gap-px border border-[#00d4ff44] bg-[#00d4ff44] sm:grid-cols-3">
                                {marketRates.map((rate) => (
                                    <div
                                        key={rate.label}
                                        className="bg-[rgba(5,12,20,0.98)] px-3 py-2"
                                    >
                                        <div className={`font-['Orbitron'] text-lg ${rate.color}`}>
                                            {rate.value}
                                        </div>
                                        <div className="text-[10px] uppercase tracking-wide text-[#8fa3aa]">
                                            {rate.label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="border border-[#00d4ff44] bg-[rgba(0,212,255,0.05)] px-3 py-2 text-sm text-[#8fa3aa]">
                                {t("station_discovery.standard_rates")}
                            </div>
                        )}
                    </section>

                    {!isPirateStation && (
                        <section className="overflow-hidden border border-[#00ff4144]">
                            <div className="border-b border-[#00ff4144] bg-[rgba(0,255,65,0.06)] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#00ff41]">
                                {t("station_discovery.guaranteed_stock")}
                            </div>
                            {guaranteedRows.map((row) => (
                                <div
                                    key={row.label}
                                    className="grid grid-cols-[7rem_1fr] gap-2 border-b border-[#00ff4122] px-3 py-2 last:border-b-0 sm:grid-cols-[9rem_1fr]"
                                >
                                    <div className="pt-0.5 text-[10px] font-bold uppercase tracking-wide text-[#8fa3aa]">
                                        {row.label}
                                    </div>
                                    {row.values.length > 0 ? (
                                        <div className="flex flex-wrap gap-1.5">
                                            {row.values.map((value) => (
                                                <span
                                                    key={value}
                                                    className={`border px-1.5 py-0.5 text-xs ${row.color}`}
                                                >
                                                    {value}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-[#576b72]">
                                            {t("station_discovery.no_guarantees")}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </section>
                    )}

                    <section>
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#ffb000]">
                            {t("station_discovery.available_services")}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {services.map((service) => (
                                <span
                                    key={service}
                                    className="border border-[#ffb00055] bg-[rgba(255,176,0,0.07)] px-2 py-1 text-xs text-[#ffd27a]"
                                >
                                    {service}
                                </span>
                            ))}
                        </div>
                    </section>
                    <Button
                        onClick={onClose}
                        className="w-full cursor-pointer border border-[#00ff41] bg-transparent text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
                    >
                        {t("station_discovery.continue")}
                    </Button>
                </div>
            </GameDialogContent>
        </Dialog>
    );
}

export function StationPanel() {
    const { t } = useTranslation();
    const currentLocation = useGameStore((s) => s.currentLocation);
    const currentSector = useGameStore((s) => s.currentSector);
    const credits = useGameStore((s) => s.credits);
    const wantedHeat = useGameStore((s) => s.wantedHeat ?? 0);
    const pirateStanding = useGameStore((s) => s.pirateStanding ?? 0);
    const assaultPirateBase = useGameStore((s) => s.assaultPirateBase);
    const ship = useGameStore((s) => s.ship);
    const stationInventory = useGameStore((s) => s.stationInventory);
    const stationPrices = useGameStore((s) => s.stationPrices);
    const stationStock = useGameStore((s) => s.stationStock);
    const raceReputation = useGameStore((s) => s.raceReputation);
    const buyItem = useGameStore((s) => s.buyItem);
    const repairShip = useGameStore((s) => s.repairShip);
    const healCrew = useGameStore((s) => s.healCrew);
    const cureMutation = useGameStore((s) => s.cureMutation);
    const treatNegativeTrait = useGameStore((s) => s.treatNegativeTrait);

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
    const freeCargoSpace = useGameStore(getFreeCargoSpace);
    const buyProbe = useGameStore((s) => s.buyProbe);
    const research = useGameStore((s) => s.research);
    const activateResearchBoost = useGameStore((s) => s.activateResearchBoost);
    const activeCrisis = useGameStore((s) => s.activeCrisis);
    const nebulae = useGameStore((s) => s.galaxy.nebulae);
    const stabilizeNebulaFront = useGameStore((s) => s.stabilizeNebulaFront);
    const researchBoostEffect = useGameStore((s) =>
        s.activeEffects.find((e) => e.id === RESEARCH_BOOST_EFFECT_ID),
    );
    const addLog = useGameStore((s) => s.addLog);

    const getCrewCapacity = useGameStore((s) => s.getCrewCapacity);
    const getCargoCapacity = useGameStore((s) => s.getCargoCapacity);
    const crew = useGameStore((s) => s.crew);
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const discoverRace = useGameStore((s) => s.discoverRace);
    const knownRaces = useGameStore((s) => s.knownRaces);
    const discoverStationType = useGameStore((s) => s.discoverStationType);
    const discoverWeaponTypes = useGameStore((s) => s.discoverWeaponTypes);
    const discoveredStationTypes = useGameStore(
        (s) => s.discoveredStationTypes ?? [],
    );
    const bannedPlanets = useGameStore((s) => s.bannedPlanets);
    const emergencyFuelStationIds = useGameStore(
        (s) => s.emergencyFuelStationIds,
    );
    const sendDiplomaticGift = useGameStore((s) => s.sendDiplomaticGift);
    const removePlanetBan = useGameStore((s) => s.removePlanetBan);
    const hireTranslator = useGameStore((s) => s.hireTranslator);
    const diplomaticTranslatorRaceIds = useGameStore(
        (s) => s.diplomaticTranslatorRaceIds,
    );
    const activeContracts = useGameStore((s) => s.activeContracts);
    const completedContractIds = useGameStore((s) => s.completedContractIds);
    const turn = useGameStore((s) => s.turn);
    const completeDeliveryContract = useGameStore(
        (s) => s.completeDeliveryContract,
    );
    const hiredCrew = useGameStore((s) => s.hiredCrew);
    const acceptPirateContract = useGameStore((s) => s.acceptPirateContract);
    const performPirateContractObjective = useGameStore(
        (s) => s.performPirateContractObjective,
    );
    const completePirateContract = useGameStore((s) => s.completePirateContract);
    const reducePirateHeat = useGameStore((s) => s.reducePirateHeat);
    const refreshPirateStationContracts = useGameStore(
        (s) => s.refreshPirateStationContracts,
    );
    const [activeTab, setActiveTab] = useState(() =>
        currentLocation?.stationType === "pirate" ? "black-market" : "shop",
    );
    const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
    const [pendingUpgrade, setPendingUpgrade] = useState<ShopItem | null>(null);
    const [discoveredStationType, setDiscoveredStationType] =
        useState<StationName | null>(null);
    const pendingStationTypeRef = useRef<StationName | null>(null);

    const stationId = currentLocation?.stationId || currentLocation?.id || "";
    const sectorTier = currentSector?.tier || 1;
    const repairBlockedBySector =
        getSectorRule(currentSector?.ruleId)?.restrictions?.noRepair === true;
    const stationType = currentLocation?.stationType ?? null;
    const stationConfig = currentLocation?.stationConfig;
    const isResearchStation = stationType === "research";
    const isMiningStation = stationType === "mining";
    const nebulaFrontProgress = getNebulaFrontProgress(activeCrisis, nebulae);

    // Station service flags (default true for backwards compat with old saves)
    const allowsTrade = stationConfig?.allowsTrade ?? true;
    const craftingCapabilities = getStationCraftingCapabilities(
        stationType ?? undefined,
        stationConfig,
    );
    const installationCapabilities = getStationInstallationCapabilities(
        stationType ?? undefined,
        stationConfig,
    );
    const allowsCraft =
        craftingCapabilities.weapons || craftingCapabilities.modules;
    const allowsModuleInstall = installationCapabilities.modules;
    const allowsWeaponInstall = installationCapabilities.weapons;
    const allowsCrewHeal = stationConfig?.allowsCrewHeal ?? true;
    const allowsMutationCure =
        allowsCrewHeal && researchedTechs.includes("xenobiology");
    const allowsGeneticTherapy =
        allowsCrewHeal && researchedTechs.includes("genetic_enhancement");
    const allowsAugmentation =
        stationType === "medical" &&
        allowsCrewHeal &&
        researchedTechs.includes("cybernetic_augmentation");

    const isDiplomaticStation = stationType === "diplomatic";
    const isPirateStation = stationType === "pirate";
    const hasDiplomacy = isDiplomaticStation;
    const activeStationTab = isPirateStation
        ? activeTab === "black-market" ||
          activeTab === "pirate-contracts" ||
          activeTab === "trophies" ||
          activeTab === "services"
            ? activeTab
            : "black-market"
        : activeTab === "black-market" ||
            activeTab === "pirate-contracts" ||
            activeTab === "trophies"
          ? "shop"
          : activeTab;

    useEffect(() => {
        if (isPirateStation) refreshPirateStationContracts();
    }, [
        currentLocation?.id,
        isPirateStation,
        refreshPirateStationContracts,
        turn,
    ]);

    const stationItems = useMemo(
        () =>
            generateStationItems(
                stationId,
                sectorTier,
                currentLocation?.stationConfig,
                pirateStanding,
            ),
        [stationId, sectorTier, currentLocation?.stationConfig, pirateStanding],
    );
    const researchMaterialStock = useMemo(
        () => getResearchMaterialStocks(stationId, stationInventory),
        [stationId, stationInventory],
    );

    const crewWithMutations = useMemo(
        () =>
            crew
                .map((c) => ({
                    id: c.id,
                    name: c.name,
                    nameId: c.nameId,
                    race: c.race,
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

    const crewWithNegativeTraits = useMemo(
        () =>
            crew
                .map((c) => ({
                    id: c.id,
                    name: c.name,
                    nameId: c.nameId,
                    race: c.race,
                    geneticTherapyUsed: c.geneticTherapyUsed ?? false,
                    negativeTraits: (c.traits ?? [])
                        .filter(
                            (trait: CrewTrait) =>
                                trait.type === "negative" && trait.id !== null,
                        )
                        .map((trait: CrewTrait) => ({
                            id: trait.id ?? "",
                            name: trait.name,
                        })),
                }))
                .filter((c) => c.negativeTraits.length > 0),
        [crew],
    );

    const dominantRace = currentLocation?.dominantRace;
    const race = dominantRace ? RACES[dominantRace] : null;

    const showStationDiscovery = useCallback((nextStationType: StationName) => {
        setDiscoveredStationType(nextStationType);
    }, []);

    useEffect(() => {
        if (dominantRace && race && !knownRaces.includes(dominantRace)) {
            discoverRace(dominantRace);
        }
    }, [dominantRace, race, knownRaces, discoverRace]);

    useEffect(() => {
        const showPendingStation = () => {
            const pendingStationType = pendingStationTypeRef.current;
            if (!pendingStationType) return;

            pendingStationTypeRef.current = null;
            showStationDiscovery(pendingStationType);
        };

        window.addEventListener("race-discovery:closed", showPendingStation);
        return () =>
            window.removeEventListener(
                "race-discovery:closed",
                showPendingStation,
            );
    }, [showStationDiscovery]);

    useEffect(() => {
        if (!stationType || discoveredStationTypes.includes(stationType)) {
            return;
        }

        discoverStationType(stationType);
        if (dominantRace && !knownRaces.includes(dominantRace)) {
            pendingStationTypeRef.current = stationType;
            return;
        }

        queueMicrotask(() => showStationDiscovery(stationType));
    }, [
        stationType,
        dominantRace,
        knownRaces,
        discoveredStationTypes,
        discoverStationType,
        showStationDiscovery,
    ]);

    // Каталог оружия: типы, впервые увиденные в продаже на станции
    useEffect(() => {
        const weaponTypesForSale = stationItems
            .filter((item) => item.type === "weapon" && item.weaponType)
            .map((item) => item.weaponType as WeaponType);
        if (weaponTypesForSale.length === 0) return;
        discoverWeaponTypes(weaponTypesForSale);
    }, [stationItems, discoverWeaponTypes]);

    const deliveryContracts = activeContracts.filter(
        (c) =>
            c.type === "delivery" &&
            c.targetLocationId === currentLocation?.id &&
            hasRequiredDeliveryCargo(ship.cargo, c),
    );
    // Подряд на эту базу: пираты не знают, что ты за ними пришёл, поэтому
    // стыковка обычная — а решение принимается здесь
    const purgeContract = activeContracts.find(
        (contract) =>
            contract.type === "pirate_purge" &&
            contract.targetLocationId === currentLocation?.id,
    );
    const pirateTargetContracts = activeContracts.filter(
        (contract) =>
            (contract.type === "pirate_smuggling" ||
                contract.type === "pirate_heist") &&
            !contract.pirateObjectiveComplete &&
            contract.targetLocationId === currentLocation?.id,
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
    const pirateTabProps = {
        stationId,
        locationId: currentLocation.id,
        stationPrices,
        stationStock,
        credits: displayCredits,
        ship,
        cargoCapacity: getCargoCapacity(),
        probes,
        heat: wantedHeat,
        standing: pirateStanding,
        contracts: currentLocation.pirateContracts ?? [],
        activeContracts,
        completedContractIds,
        currentTurn: turn,
        buyTradeGood,
        sellTradeGood,
        acceptPirateContract,
        completePirateContract,
        reducePirateHeat,
    };

    return (
        <div className="flex flex-col gap-2 sm:gap-4 lg:h-full">
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
                        pirateStanding={
                            isPirateStation ? pirateStanding : undefined
                        }
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

            {purgeContract && (
                <section className="border-2 border-[#ff0040] bg-[rgba(255,0,64,0.1)] p-3">
                    <div className="font-bold text-sm text-[#ff0040]">
                        ⚔ {t("pirate.purge_title")}
                    </div>
                    <div className="mt-1 text-[11px] leading-snug text-[#ffb000]">
                        {t("pirate.purge_warning")}
                    </div>
                    <div className="mt-1 text-[11px] text-[#888]">
                        💰 {purgeContract.reward}₢ · {t("locations.threat")}{" "}
                        {purgeContract.targetThreat ?? 2}
                    </div>
                    <Button
                        onClick={assaultPirateBase}
                        className="mt-2 cursor-pointer border border-[#ff0040] bg-transparent px-2 py-1 text-xs text-[#ff6677] hover:bg-[#ff0040] hover:text-[#050810]"
                    >
                        {t("pirate.purge_action")}
                    </Button>
                </section>
            )}

            {pirateTargetContracts.length > 0 && (
                <section className="border border-[#ff0040] bg-[rgba(255,0,64,0.06)] p-3">
                    <div className="font-bold text-sm text-[#ff6677]">
                        ☠ {t("pirate.objective_title")}
                    </div>
                    <div className="mt-2 flex flex-col gap-2">
                        {pirateTargetContracts.map((contract) => (
                            <div
                                key={contract.id}
                                className="border border-[#ff004066] bg-[rgba(5,8,16,0.6)] p-2"
                            >
                                <div className="text-xs text-[#ffb000]">
                                    {formatContractDescription(contract, t)}
                                </div>
                                <div className="mt-1 text-[11px] text-[#888]">
                                    {formatPirateReturnInstruction(contract, t)}
                                </div>
                                <Button
                                    onClick={() =>
                                        performPirateContractObjective(contract.id)
                                    }
                                    className="mt-2 cursor-pointer border border-[#ff0040] bg-transparent px-2 py-1 text-xs text-[#ff6677] hover:bg-[#ff0040] hover:text-[#050810]"
                                >
                                    {contract.type === "pirate_smuggling"
                                        ? t("pirate.objective_smuggling_action", {
                                              quantity: contract.quantity ?? 0,
                                          })
                                        : t("pirate.objective_heist_action")}
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <Tabs
                value={activeStationTab}
                onValueChange={setActiveTab}
                className="w-full mt-2 flex-1 min-h-0"
            >
                <TabsList
                    className="sticky top-0 z-20 flex h-auto w-full overflow-x-auto border border-[#00ff41] bg-[rgba(5,8,16,0.98)]"
                >
                    {isPirateStation ? (
                        <>
                            <TabsTrigger
                                value="black-market"
                                className="cursor-pointer data-[state=active]:bg-[#ff0040] data-[state=active]:text-[#050810] text-[#ff0040] text-xs py-2.5 sm:py-2 shrink-0 whitespace-nowrap px-3"
                            >
                                ☠ {t("pirate.black_market")}
                            </TabsTrigger>
                            <TabsTrigger
                                value="trophies"
                                title={t("pirate.trophies_hint")}
                                className="cursor-pointer data-[state=active]:bg-[#ffb000] data-[state=active]:text-[#050810] text-[#ffb000] text-xs py-2.5 sm:py-2 shrink-0 whitespace-nowrap px-3"
                            >
                                🛠 {t("pirate.trophies")}
                            </TabsTrigger>
                            <TabsTrigger
                                value="pirate-contracts"
                                className="cursor-pointer data-[state=active]:bg-[#00d4ff] data-[state=active]:text-[#050810] text-[#00d4ff] text-xs py-2.5 sm:py-2 shrink-0 whitespace-nowrap px-3"
                            >
                                📜 {t("pirate.contract_board")}
                            </TabsTrigger>
                        </>
                    ) : (
                        <>
                            <TabsTrigger
                                value="shop"
                                title={t("station.modules_tab_hint")}
                                className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2.5 sm:py-2 shrink-0 whitespace-nowrap px-3"
                            >
                                🛠 {t("station.modules_tab")}
                            </TabsTrigger>
                            {allowsTrade && (
                                <TabsTrigger
                                    value="trade"
                                    title={t("station.trade_tab_hint")}
                                    className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2.5 sm:py-2 shrink-0 whitespace-nowrap px-3"
                                >
                                    💱 {t("station.trade_tab")}
                                </TabsTrigger>
                            )}
                            {isMiningStation && (
                                <TabsTrigger
                                    value="minerals"
                                    title={t("station.minerals_tab_hint")}
                                    className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2.5 sm:py-2 shrink-0 whitespace-nowrap px-3"
                                >
                                    ⛏ {t("station.minerals_tab")}
                                </TabsTrigger>
                            )}
                            <TabsTrigger
                                value="crew"
                                title={t("station.crew_tab_hint")}
                                className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2.5 sm:py-2 shrink-0 whitespace-nowrap px-3"
                            >
                                👥 {t("station.crew_tab")}
                            </TabsTrigger>
                        </>
                    )}
                    <TabsTrigger
                        value="services"
                        title={t("station.services_tab_hint")}
                        className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2.5 sm:py-2 shrink-0 whitespace-nowrap px-3"
                    >
                        🔧 {t("station.services_tab")}
                    </TabsTrigger>
                    {!isPirateStation && allowsCraft && (
                        <TabsTrigger
                            value="crafting"
                            title={t("station.craft_tab_hint")}
                            className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2.5 sm:py-2 shrink-0 whitespace-nowrap px-3"
                        >
                            📐 {t("station.craft")}
                        </TabsTrigger>
                    )}
                    {!isPirateStation && hasDiplomacy && (
                        <TabsTrigger
                            value="diplomacy"
                            title={t("station.diplomacy_tab_hint")}
                            className="cursor-pointer data-[state=active]:bg-[#00ff41] data-[state=active]:text-[#050810] text-[#00ff41] text-xs py-2.5 sm:py-2 shrink-0 whitespace-nowrap px-3"
                        >
                            <span>🤝 {t("station.diplomacy_tab")}</span>
                        </TabsTrigger>
                    )}
                </TabsList>

                {!isPirateStation && (
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
                )}

                {!isPirateStation && allowsTrade && (
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

                {!isPirateStation && isMiningStation && (
                    <TabsContent
                        value="minerals"
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
                            onlyGoods={["minerals", "rare_minerals"]}
                            sellOnly
                        />
                    </TabsContent>
                )}

                {!isPirateStation && (
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
                        hireCrew={(member, price, locationId, confirmOxygen) =>
                            hireCrew(
                                {
                                    ...(member as Partial<CrewMember>),
                                    price,
                                } as Partial<CrewMember> & {
                                    price: number;
                                },
                                locationId ?? stationId,
                                confirmOxygen,
                            )
                        }
                        />
                    </TabsContent>
                )}

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
                        treatNegativeTrait={treatNegativeTrait}
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
                        geneticTherapyCost={GENETIC_THERAPY_PRICE}
                        canRepair={canRepairShip()}
                        repairUnavailableReason={
                            repairBlockedBySector
                                ? t("sector_rules.logs.repair_blocked")
                                : undefined
                        }
                        canHeal={canHealCrew()}
                        allowsCrewHeal={allowsCrewHeal}
                        allowsModuleInstall={allowsModuleInstall}
                        allowsWeaponInstall={allowsWeaponInstall}
                        allowsMutationCure={allowsMutationCure}
                        allowsGeneticTherapy={allowsGeneticTherapy}
                        allowsAugmentation={allowsAugmentation}
                        stationId={stationId}
                        dominantRace={dominantRace}
                        sectorTier={sectorTier}
                        raceReputation={raceReputation}
                        crewWithMutations={crewWithMutations}
                        crewWithNegativeTraits={crewWithNegativeTraits}
                        onInstallAugmentation={installAugmentation}
                        onRemoveAugmentation={removeAugmentation}
                        probes={probes}
                        freeCargoSpace={freeCargoSpace}
                        onBuyProbe={buyProbe}
                        isResearchStation={isResearchStation}
                        researchResources={research.resources}
                        researchMaterialStock={researchMaterialStock}
                        researchBoostTurnsRemaining={
                            researchBoostEffect?.turnsRemaining ?? 0
                        }
                        onActivateResearchBoost={activateResearchBoost}
                        nebulaFrontProgress={nebulaFrontProgress}
                        onStabilizeNebulaFront={stabilizeNebulaFront}
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
                                creditsEarnedThisRun:
                                    s.creditsEarnedThisRun + earned,
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
                                t("game_logs.research_data_sold", { qty, earned }),
                                "info",
                                "research",
                            );
                        }}
                        onBuyResearchResource={(type, qty) => {
                            const price = RESEARCH_STATION_BUY_PRICES[type] ?? 0;
                            const cost = price * qty;
                            if (price <= 0) return;
                            const currentState = useGameStore.getState();
                            if (
                                qty >
                                getResearchMaterialStock(
                                    stationId,
                                    type,
                                    currentState.stationInventory,
                                )
                            ) {
                                addLog(t("game_logs.err_station_no_stock"), "error");
                                return;
                            }
                            if (currentState.credits < cost) {
                                addLog(
                                    t("game_logs.research_materials_not_enough_credits"),
                                    "error",
                                    "research",
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
                                stationInventory: {
                                    ...s.stationInventory,
                                    [stationId]: {
                                        ...s.stationInventory[stationId],
                                        [getResearchMaterialPurchaseKey(type)]:
                                            (s.stationInventory[stationId]?.[
                                                getResearchMaterialPurchaseKey(type)
                                            ] ?? 0) + qty,
                                    },
                                },
                            }));
                            addLog(
                                t("game_logs.research_materials_bought", { qty, cost }),
                                "info",
                                "research",
                            );
                        }}
                    />
                </TabsContent>
                {!isPirateStation && allowsCraft && (
                    <TabsContent
                        value="crafting"
                        className="mt-4 min-h-0 overflow-hidden flex flex-col"
                    >
                        <CraftingTab
                            allowsWeaponCraft={craftingCapabilities.weapons}
                            allowsModuleCraft={craftingCapabilities.modules}
                        />
                    </TabsContent>
                )}
                {!isPirateStation && hasDiplomacy && (
                    <TabsContent
                        value="diplomacy"
                        className="mt-4 min-h-0 overflow-y-auto scrollbar-gutter-stable flex flex-col gap-4"
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
                                    const hasTranslator =
                                        diplomaticTranslatorRaceIds.includes(
                                            raceId,
                                        );
                                    const cost = atCap
                                        ? 0
                                        : getDiplomacyCost(
                                              rep,
                                              DIPLOMACY_BLOCK_SIZE,
                                              hasTranslator,
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
                                                    {hasTranslator && (
                                                        <div className="text-[10px] text-[#00d4ff]">
                                                            🗣️{" "}
                                                            {t(
                                                                "station.diplomacy_translator_hired",
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
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
                                                        disabled={
                                                            credits < cost
                                                        }
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
                                                {!hasTranslator && (
                                                    <Button
                                                        onClick={() =>
                                                            hireTranslator(
                                                                raceId,
                                                            )
                                                        }
                                                        disabled={
                                                            credits <
                                                            TRANSLATOR_HIRE_COST
                                                        }
                                                        title={t(
                                                            "station.diplomacy_translators_desc",
                                                            {
                                                                percent: Math.round(
                                                                    (1 -
                                                                        TRANSLATOR_DIPLOMACY_DISCOUNT) *
                                                                        100,
                                                                ),
                                                            },
                                                        )}
                                                        className="bg-transparent border border-[#00d4ff] text-[#00d4ff] hover:bg-[#00d4ff] hover:text-[#050810] text-xs px-2 py-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                                    >
                                                        {t(
                                                            "station.diplomacy_hire_translator",
                                                            {
                                                                cost: TRANSLATOR_HIRE_COST,
                                                            },
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
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
                {isPirateStation && (
                    <>
                        <TabsContent
                            value="black-market"
                            className="mt-4 min-h-0 overflow-y-auto flex flex-col gap-4"
                        >
                            <PirateTab view="market" {...pirateTabProps} />
                        </TabsContent>
                        <TabsContent
                            value="trophies"
                            className="mt-4 min-h-0 overflow-hidden flex flex-col"
                        >
                            <div className="mb-2 border border-[#ffb00066] bg-[rgba(255,176,0,0.06)] p-2 text-[11px] leading-snug text-[#ffb000]">
                                ⚠ {t("pirate.trophies_desc")}
                            </div>
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
                        <TabsContent
                            value="pirate-contracts"
                            className="mt-4 min-h-0 overflow-y-auto flex flex-col gap-4"
                        >
                            <PirateTab view="contracts" {...pirateTabProps} />
                        </TabsContent>
                    </>
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
            <StationDiscoveryModal
                stationType={discoveredStationType}
                stationConfig={stationConfig}
                onClose={() => setDiscoveredStationType(null)}
            />
        </div>
    );
}

function StationHeader({
    location,
    sectorTier,
    race,
    raceReputation,
    pirateStanding,
    onLeave,
    t,
}: {
    location: { name: string; stationType?: string; dominantRace?: RaceId };
    sectorTier: number;
    race: (typeof RACES)[keyof typeof RACES] | null;
    raceReputation: Record<RaceId, number> | undefined;
    /** Задан только на пиратской базе: там хозяин не раса, а сами пираты */
    pirateStanding?: number;
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
        return getLocationName(fullName, t);
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

            {pirateStanding !== undefined ? (
                <div className="flex flex-wrap items-center gap-2 text-xs sm:gap-3 sm:text-sm">
                    <div className="flex items-center gap-1.5 rounded border border-[#ff0040] bg-[rgba(255,0,64,0.08)] px-1.5 py-0.5 sm:gap-2 sm:px-3 sm:py-1.5">
                        <span className="text-xl sm:text-2xl">☠</span>
                        <div>
                            <div className="font-bold text-[#ff6677]">
                                {t("pirate.faction_name")}
                            </div>
                            <div className="hidden text-xs text-gray-400 sm:block">
                                {t("pirate.faction_owner")}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 rounded border border-[#00d4ff] bg-[rgba(0,212,255,0.08)] px-1.5 py-0.5 text-xs sm:px-3 sm:py-1.5">
                        <span>☠</span>
                        <span className="text-[#00d4ff]">
                            {t(`pirate.rank_${getPirateRank(pirateStanding)}`)}
                        </span>
                        <span className="text-gray-400">({pirateStanding})</span>
                    </div>
                </div>
            ) : (
                race && (
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
                )
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
    t: (key: string, params?: Record<string, string | number>) => string;
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
                                {formatContractDescription(c, t)}
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
