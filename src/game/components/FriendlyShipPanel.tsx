"use client";

import { useMemo, useEffect } from "react";
import { useGameStore } from "../store";
import {
    TRADE_GOODS,
    generateCrewTraits,
    PROFESSION_NAMES,
    CREW_BASE_PRICES,
    RACES,
    getRandomRaceName,
} from "../constants";
import { Button } from "@/components/ui/button";
import type { RaceId, Contract } from "../types";

export function FriendlyShipPanel() {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const credits = useGameStore((s) => s.credits);
    const ship = useGameStore((s) => s.ship);
    const crew = useGameStore((s) => s.crew);

    const hireCrew = useGameStore((s) => s.hireCrew);
    const getCrewCapacity = useGameStore((s) => s.getCrewCapacity);
    const acceptContract = useGameStore((s) => s.acceptContract);
    const completeDeliveryContract = useGameStore(
        (s) => s.completeDeliveryContract,
    );
    const activeContracts = useGameStore((s) => s.activeContracts);
    const currentSector = useGameStore((s) => s.currentSector);
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const shipQuestsTaken = useGameStore((s) => s.shipQuestsTaken);
    const hiredCrewFromShips = useGameStore((s) => s.hiredCrewFromShips);
    const friendlyShipStock = useGameStore((s) => s.friendlyShipStock);

    // Initialize or get stock for this friendly ship
    const getShipStock = (goodId: string): number => {
        const shipId = currentLocation?.id;
        if (!shipId) return 0;
        const stock = friendlyShipStock[shipId];
        if (!stock) return 0;
        return stock[goodId] || 0;
    };

    // Calculate available cargo space
    const cargoModule = ship.modules.find((m) => m.type === "cargo");
    const currentCargo =
        ship.cargo.reduce((s, c) => s + c.quantity, 0) +
        ship.tradeGoods.reduce((s, g) => s + g.quantity, 0);
    const availSpace = cargoModule?.capacity
        ? cargoModule.capacity - currentCargo
        : 0;

    // Memoize crew data to prevent regeneration on every render
    const crewData = useMemo(() => {
        const seedRandom = (seed: number) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };

        let seed = 0;
        for (let i = 0; i < (currentLocation?.id || "").length; i++) {
            seed =
                (seed << 5) - seed + (currentLocation?.id || "").charCodeAt(i);
            seed = seed & seed;
        }

        const professions: Array<
            "pilot" | "engineer" | "medic" | "scout" | "scientist" | "gunner"
        > = ["pilot", "engineer", "medic", "scout", "scientist", "gunner"];
        const availableProfession =
            professions[
                Math.floor(seedRandom(seed + 100) * professions.length)
            ];
        const availableLevel =
            availableProfession === "scientist"
                ? 1 + Math.floor(seedRandom(seed + 101) * 3)
                : undefined;

        const raceOptions: RaceId[] = [
            "human",
            "synthetic",
            "xenosymbiont",
            "krylorian",
            "voidborn",
            "crystalline",
        ];
        const crewRaceId: RaceId =
            raceOptions[
                Math.floor(seedRandom(seed + 103) * raceOptions.length)
            ];
        const crewRace = RACES[crewRaceId];
        const crewName = getRandomRaceName(
            crewRaceId,
            availableProfession,
            seed + 104,
        );

        const qualityRoll = seedRandom(seed + 102);
        let quality: "poor" | "average" | "good" | "excellent";
        if (qualityRoll < 0.25) quality = "poor";
        else if (qualityRoll < 0.6) quality = "average";
        else if (qualityRoll < 0.85) quality = "good";
        else quality = "excellent";

        const { traits, priceModifier } = generateCrewTraits(quality);
        const basePrice = CREW_BASE_PRICES[availableProfession];
        const levelMod = availableLevel ? 1 + (availableLevel - 1) * 0.2 : 1;
        const crewPrice = Math.round(basePrice * priceModifier * levelMod);

        return {
            crewRaceId,
            crewRace,
            crewName,
            availableProfession,
            availableLevel,
            quality,
            traits,
            crewPrice,
        };
    }, [currentLocation?.id]);

    if (!currentLocation) return null;

    const {
        crewRaceId,
        crewRace,
        crewName,
        availableProfession,
        availableLevel,
        quality,
        traits,
        crewPrice,
    } = crewData;

    // Check if quest already taken from this ship
    const questAlreadyTaken = shipQuestsTaken.includes(currentLocation.id);

    // Check if crew already hired from this ship
    const crewAlreadyHired = hiredCrewFromShips.includes(currentLocation.id);

    // Check for delivery contracts that can be turned in at this ship
    const completableContracts = activeContracts.filter(
        (c) =>
            c.type === "delivery" &&
            c.targetLocationId === currentLocation.id &&
            ship.cargo.some((cargo) => cargo.contractId === c.id),
    );

    // Generate trade goods with seeded random for consistency
    const seedRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    };

    let seed = 0;
    for (let i = 0; i < (currentLocation.id || "").length; i++) {
        seed = (seed << 5) - seed + currentLocation.id.charCodeAt(i);
        seed = seed & seed;
    }

    const shipId = currentLocation.id;

    // Initialize stock for this ship if not exists (useEffect to avoid setState during render)
    useEffect(() => {
        if (!friendlyShipStock[shipId]) {
            const initialStock: Record<string, number> = {};
            ["water", "food", "medicine"].forEach((gid, idx) => {
                initialStock[gid] =
                    5 + Math.floor(seedRandom(seed + idx + 10) * 10);
            });
            useGameStore.setState((s) => ({
                friendlyShipStock: {
                    ...s.friendlyShipStock,
                    [shipId]: initialStock,
                },
            }));
        }
    }, [shipId, friendlyShipStock, seed]);

    const tradeGoods = ["water", "food", "medicine"].map((gid, idx) => ({
        id: gid,
        ...TRADE_GOODS[gid],
        price: Math.floor(
            TRADE_GOODS[gid].basePrice * (0.9 + seedRandom(seed + idx) * 0.4),
        ),
        stock: getShipStock(gid),
    }));

    const getQualityColor = (q: string) => {
        switch (q) {
            case "poor":
                return "#888";
            case "average":
                return "#00ff41";
            case "good":
                return "#00d4ff";
            case "excellent":
                return "#ffb000";
            default:
                return "#00ff41";
        }
    };

    const getQualityLabel = (q: string) => {
        switch (q) {
            case "poor":
                return "Низкое";
            case "average":
                return "Обычное";
            case "good":
                return "Хорошее";
            case "excellent":
                return "Отличное";
            default:
                return "";
        }
    };

    // Generate quest with specific destination (not back to this ship!)
    const generateQuest = (): Contract | null => {
        const currentSectorId = currentSector?.id;
        const galaxy = useGameStore.getState().galaxy;

        // Find sectors that are NOT the current sector
        const otherSectors = galaxy.sectors.filter(
            (s) => s.id !== currentSectorId,
        );
        if (otherSectors.length === 0) return null;

        const targetSector =
            otherSectors[Math.floor(Math.random() * otherSectors.length)];

        // Pick a specific destination in the target sector
        const validDestinations = targetSector.locations.filter(
            (l) =>
                (l.type === "planet" && !l.isEmpty) ||
                l.type === "station" ||
                l.type === "friendly_ship",
        );

        if (validDestinations.length === 0) return null;

        const dest =
            validDestinations[
                Math.floor(Math.random() * validDestinations.length)
            ];
        const destType =
            dest.type === "planet"
                ? "planet"
                : dest.type === "station"
                  ? "station"
                  : "ship";

        return {
            id: `ship-${currentLocation.id}-${Date.now()}`,
            type: "delivery" as const,
            desc: "📦 Срочная доставка",
            cargo: "Срочный груз",
            reward: 400,
            targetSector: targetSector.id,
            targetSectorName: targetSector.name,
            targetLocationId: dest.id,
            targetLocationName: dest.name,
            targetLocationType: destType as "planet" | "station" | "ship",
            sourcePlanetId: currentLocation.id,
            sourceName: currentLocation.name,
            sourceType: "ship" as const,
            sourceSectorName: currentSector?.name,
        };
    };

    // Handle accepting quest from ship
    const handleAcceptQuest = () => {
        const quest = generateQuest();
        if (!quest) return;

        // Mark this ship as having its quest taken
        useGameStore.setState((s) => ({
            shipQuestsTaken: [...s.shipQuestsTaken, currentLocation.id],
        }));

        acceptContract(quest);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
                ▸ {currentLocation.name}
            </div>
            <div className="text-sm leading-relaxed">
                {currentLocation.greeting ||
                    "Вы встретили дружественный корабль."}
            </div>

            {/* Trader */}
            {currentLocation.hasTrader && (
                <>
                    <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000] mt-5">
                        Торговля
                    </div>
                    <div className="flex flex-col gap-2.5 max-h-100 overflow-y-auto pr-1 pb-2">
                        {tradeGoods.map((g) => {
                            const playerGood = ship.tradeGoods.find(
                                (tg) => tg.item === g.id,
                            );
                            const buyPricePerUnit = Math.floor(g.price / 5);
                            const sellPricePerUnit = Math.floor(
                                (g.price * 0.6) / 5,
                            );

                            return (
                                <div
                                    key={g.id}
                                    className="flex justify-between items-center bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-3"
                                >
                                    <div className="flex-1">
                                        <div className="text-[#00d4ff] font-bold">
                                            {g.name}
                                        </div>
                                        <div className="text-[#ffb000] text-xs mt-1">
                                            Купить: {buyPricePerUnit}₢/т |
                                            Продать: {sellPricePerUnit}₢/т
                                        </div>
                                        <div className="text-[11px] mt-1">
                                            <span className="text-[#00ff41]">
                                                На корабле: {g.stock}т
                                            </span>
                                            {playerGood && (
                                                <span className="text-[#00d4ff] ml-3">
                                                    В трюме:{" "}
                                                    {playerGood.quantity}т
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {/* Buy buttons */}
                                        <Button
                                            disabled={
                                                availSpace < 1 ||
                                                credits < buyPricePerUnit ||
                                                g.stock < 1
                                            }
                                            onClick={() => {
                                                const existing =
                                                    ship.tradeGoods.find(
                                                        (tg) =>
                                                            tg.item === g.id,
                                                    );
                                                if (existing) {
                                                    existing.quantity += 1;
                                                } else {
                                                    ship.tradeGoods.push({
                                                        item: g.id,
                                                        quantity: 1,
                                                        buyPrice: g.price,
                                                    });
                                                }
                                                useGameStore.setState((s) => ({
                                                    friendlyShipStock: {
                                                        ...s.friendlyShipStock,
                                                        [shipId]: {
                                                            ...s
                                                                .friendlyShipStock[
                                                                shipId
                                                            ],
                                                            [g.id]:
                                                                (s
                                                                    .friendlyShipStock[
                                                                    shipId
                                                                ]?.[g.id] ||
                                                                    0) - 1,
                                                        },
                                                    },
                                                    credits:
                                                        s.credits -
                                                        buyPricePerUnit,
                                                    ship: { ...s.ship },
                                                }));
                                            }}
                                            className="bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-[9px] px-1.5"
                                        >
                                            +1
                                        </Button>
                                        <Button
                                            disabled={
                                                availSpace < 5 ||
                                                credits < g.price ||
                                                g.stock < 5
                                            }
                                            onClick={() => {
                                                const existing =
                                                    ship.tradeGoods.find(
                                                        (tg) =>
                                                            tg.item === g.id,
                                                    );
                                                if (existing) {
                                                    existing.quantity += 5;
                                                } else {
                                                    ship.tradeGoods.push({
                                                        item: g.id,
                                                        quantity: 5,
                                                        buyPrice: g.price,
                                                    });
                                                }
                                                useGameStore.setState((s) => ({
                                                    friendlyShipStock: {
                                                        ...s.friendlyShipStock,
                                                        [shipId]: {
                                                            ...s
                                                                .friendlyShipStock[
                                                                shipId
                                                            ],
                                                            [g.id]:
                                                                (s
                                                                    .friendlyShipStock[
                                                                    shipId
                                                                ]?.[g.id] ||
                                                                    0) - 5,
                                                        },
                                                    },
                                                    credits:
                                                        s.credits - g.price,
                                                    ship: { ...s.ship },
                                                }));
                                            }}
                                            className="bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-[9px] px-1.5"
                                        >
                                            +5
                                        </Button>
                                        <Button
                                            disabled={
                                                availSpace < 15 ||
                                                credits < g.price * 3 ||
                                                g.stock < 15
                                            }
                                            onClick={() => {
                                                const existing =
                                                    ship.tradeGoods.find(
                                                        (tg) =>
                                                            tg.item === g.id,
                                                    );
                                                if (existing) {
                                                    existing.quantity += 15;
                                                } else {
                                                    ship.tradeGoods.push({
                                                        item: g.id,
                                                        quantity: 15,
                                                        buyPrice: g.price,
                                                    });
                                                }
                                                useGameStore.setState((s) => ({
                                                    friendlyShipStock: {
                                                        ...s.friendlyShipStock,
                                                        [shipId]: {
                                                            ...s
                                                                .friendlyShipStock[
                                                                shipId
                                                            ],
                                                            [g.id]:
                                                                (s
                                                                    .friendlyShipStock[
                                                                    shipId
                                                                ]?.[g.id] ||
                                                                    0) - 15,
                                                        },
                                                    },
                                                    credits:
                                                        s.credits - g.price * 3,
                                                    ship: { ...s.ship },
                                                }));
                                            }}
                                            className="bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-[9px] px-1.5"
                                        >
                                            +15
                                        </Button>
                                        {/* Sell buttons */}
                                        <Button
                                            disabled={
                                                !playerGood ||
                                                playerGood.quantity < 1
                                            }
                                            onClick={() => {
                                                if (playerGood) {
                                                    playerGood.quantity -= 1;
                                                    if (
                                                        playerGood.quantity <= 0
                                                    ) {
                                                        ship.tradeGoods =
                                                            ship.tradeGoods.filter(
                                                                (tg) =>
                                                                    tg.item !==
                                                                    g.id,
                                                            );
                                                    }
                                                    useGameStore.setState(
                                                        (s) => ({
                                                            friendlyShipStock: {
                                                                ...s.friendlyShipStock,
                                                                [shipId]: {
                                                                    ...s
                                                                        .friendlyShipStock[
                                                                        shipId
                                                                    ],
                                                                    [g.id]:
                                                                        (s
                                                                            .friendlyShipStock[
                                                                            shipId
                                                                        ]?.[
                                                                            g.id
                                                                        ] ||
                                                                            0) +
                                                                        1,
                                                                },
                                                            },
                                                            credits:
                                                                s.credits +
                                                                sellPricePerUnit,
                                                            ship: { ...s.ship },
                                                        }),
                                                    );
                                                }
                                            }}
                                            className="bg-transparent border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase text-[9px] px-1.5"
                                        >
                                            -1
                                        </Button>
                                        <Button
                                            disabled={
                                                !playerGood ||
                                                playerGood.quantity < 5
                                            }
                                            onClick={() => {
                                                if (playerGood) {
                                                    playerGood.quantity -= 5;
                                                    if (
                                                        playerGood.quantity <= 0
                                                    ) {
                                                        ship.tradeGoods =
                                                            ship.tradeGoods.filter(
                                                                (tg) =>
                                                                    tg.item !==
                                                                    g.id,
                                                            );
                                                    }
                                                    useGameStore.setState(
                                                        (s) => ({
                                                            friendlyShipStock: {
                                                                ...s.friendlyShipStock,
                                                                [shipId]: {
                                                                    ...s
                                                                        .friendlyShipStock[
                                                                        shipId
                                                                    ],
                                                                    [g.id]:
                                                                        (s
                                                                            .friendlyShipStock[
                                                                            shipId
                                                                        ]?.[
                                                                            g.id
                                                                        ] ||
                                                                            0) +
                                                                        5,
                                                                },
                                                            },
                                                            credits:
                                                                s.credits +
                                                                g.price * 0.6,
                                                            ship: { ...s.ship },
                                                        }),
                                                    );
                                                }
                                            }}
                                            className="bg-transparent border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase text-[9px] px-1.5"
                                        >
                                            -5
                                        </Button>
                                        <Button
                                            disabled={
                                                !playerGood ||
                                                playerGood.quantity < 15
                                            }
                                            onClick={() => {
                                                if (playerGood) {
                                                    playerGood.quantity -= 15;
                                                    if (
                                                        playerGood.quantity <= 0
                                                    ) {
                                                        ship.tradeGoods =
                                                            ship.tradeGoods.filter(
                                                                (tg) =>
                                                                    tg.item !==
                                                                    g.id,
                                                            );
                                                    }
                                                    useGameStore.setState(
                                                        (s) => ({
                                                            friendlyShipStock: {
                                                                ...s.friendlyShipStock,
                                                                [shipId]: {
                                                                    ...s
                                                                        .friendlyShipStock[
                                                                        shipId
                                                                    ],
                                                                    [g.id]:
                                                                        (s
                                                                            .friendlyShipStock[
                                                                            shipId
                                                                        ]?.[
                                                                            g.id
                                                                        ] ||
                                                                            0) +
                                                                        15,
                                                                },
                                                            },
                                                            credits:
                                                                s.credits +
                                                                g.price * 1.8,
                                                            ship: { ...s.ship },
                                                        }),
                                                    );
                                                }
                                            }}
                                            className="bg-transparent border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase text-[9px] px-1.5"
                                        >
                                            -15
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {/* Crew */}
            {currentLocation.hasCrew && !crewAlreadyHired && (
                <>
                    <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000] mt-5">
                        Экипаж
                    </div>
                    <div className="flex justify-between items-center bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-3">
                        <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span style={{ color: crewRace.color }}>
                                    {crewRace.icon}
                                </span>
                                <span className="text-[#00d4ff] font-bold">
                                    {crewName}
                                    {availableLevel
                                        ? ` LV${availableLevel}`
                                        : ""}
                                </span>
                                <span
                                    className="text-[10px] px-1.5 py-0.5 rounded border"
                                    style={{
                                        borderColor: crewRace.color,
                                        color: crewRace.color,
                                    }}
                                >
                                    {crewRace.name}
                                </span>
                            </div>
                            <div className="text-xs mt-1">
                                <span
                                    style={{ color: getQualityColor(quality) }}
                                >
                                    ★ {getQualityLabel(quality)}
                                </span>
                                <span className="text-[#ffb000] ml-3">
                                    💰 {crewPrice}₢
                                </span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                                {PROFESSION_NAMES[availableProfession]}
                            </div>
                            {crewRace.crewBonuses &&
                                Object.keys(crewRace.crewBonuses).length >
                                    0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {crewRace.crewBonuses.combat && (
                                            <span className="text-[10px] bg-[#ff004020] text-[#ff0040] px-1 rounded">
                                                ⚔️ +
                                                {Math.round(
                                                    crewRace.crewBonuses
                                                        .combat * 100,
                                                )}
                                                %
                                            </span>
                                        )}
                                        {crewRace.crewBonuses.repair && (
                                            <span className="text-[10px] bg-[#ffb00020] text-[#ffb000] px-1 rounded">
                                                🔧 +
                                                {Math.round(
                                                    crewRace.crewBonuses
                                                        .repair * 100,
                                                )}
                                                %
                                            </span>
                                        )}
                                        {crewRace.crewBonuses.science && (
                                            <span className="text-[10px] bg-[#00d4ff20] text-[#00d4ff] px-1 rounded">
                                                🔬 +
                                                {Math.round(
                                                    crewRace.crewBonuses
                                                        .science * 100,
                                                )}
                                                %
                                            </span>
                                        )}
                                        {crewRace.crewBonuses.adaptation && (
                                            <span className="text-[10px] bg-[#00ff4120] text-[#00ff41] px-1 rounded">
                                                🌍 +
                                                {Math.round(
                                                    crewRace.crewBonuses
                                                        .adaptation * 100,
                                                )}
                                                %
                                            </span>
                                        )}
                                    </div>
                                )}
                            {traits.length > 0 && (
                                <div className="text-[10px] mt-2 space-y-1">
                                    {traits.map((t, ti) => (
                                        <div
                                            key={ti}
                                            style={{
                                                color:
                                                    t.type === "positive"
                                                        ? "#00ff41"
                                                        : t.type === "negative"
                                                          ? "#ff4444"
                                                          : "#ffb000",
                                            }}
                                        >
                                            {t.type === "positive"
                                                ? "✓"
                                                : t.type === "negative"
                                                  ? "✗"
                                                  : "⚡"}{" "}
                                            {t.name}: {t.desc}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Button
                            disabled={
                                credits < crewPrice ||
                                crew.length >= getCrewCapacity()
                            }
                            onClick={() =>
                                hireCrew(
                                    {
                                        name: crewName,
                                        race: crewRaceId,
                                        profession: availableProfession,
                                        level: availableLevel,
                                        price: crewPrice,
                                        traits,
                                    },
                                    currentLocation.id,
                                )
                            }
                            className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-xs"
                        >
                            НАНЯТЬ
                        </Button>
                    </div>
                </>
            )}

            {/* Complete delivery contracts at this ship */}
            {completableContracts.length > 0 && (
                <>
                    <div className="font-['Orbitron'] font-bold text-base text-[#00ff41] mt-5">
                        Сдать груз
                    </div>
                    <div className="text-xs text-[#888] mb-2">
                        Вы прибыли в место назначения
                    </div>
                    <div className="flex flex-col gap-2">
                        {completableContracts.map((c) => (
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
                                    onClick={() =>
                                        completeDeliveryContract(c.id)
                                    }
                                    className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-xs"
                                >
                                    СДАТЬ
                                </Button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Quest */}
            {currentLocation.hasQuest && !questAlreadyTaken && (
                <>
                    <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000] mt-5">
                        Задание
                    </div>
                    <div className="text-sm p-2.5">
                        <div className="mb-2">
                            Срочная доставка груза в другой сектор.
                        </div>
                        <div className="text-[11px] text-[#888]">
                            📦 Груз будет загружен на ваш корабль
                        </div>
                        <div className="text-[#ffb000] text-xs mt-2">
                            💰 Награда: 400₢
                        </div>
                    </div>
                    <Button
                        onClick={handleAcceptQuest}
                        className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider"
                    >
                        ПРИНЯТЬ
                    </Button>
                </>
            )}

            {/* Quest already taken message */}
            {currentLocation.hasQuest && questAlreadyTaken && (
                <div className="text-sm text-[#888] mt-5 p-2.5 border border-[#888] bg-[rgba(100,100,100,0.1)]">
                    Задание с этого корабля уже взято.
                </div>
            )}

            <div className="flex gap-2.5 flex-wrap mt-5">
                <Button
                    onClick={showSectorMap}
                    className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider"
                >
                    ПОКИНУТЬ
                </Button>
            </div>
        </div>
    );
}
