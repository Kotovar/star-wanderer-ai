"use client";

import { useMemo, useEffect } from "react";
import { useGameStore } from "@/game/store";
import { TRADE_GOODS } from "@/game/constants/goods";
import { RACES } from "@/game/constants/races";
import { Button } from "@/components/ui/button";
import { getRandomName } from "@/game/crew/utils";
import { generateCrewTraits } from "@/game/crew/utils";
import { PROFESSION_NAMES, CREW_BASE_PRICES } from "@/game/constants/crew";
import { Goods } from "@/game/types/goods";
import { Profession } from "@/game/types/crew";
import { useTranslation } from "@/lib/useTranslation";
import { getRaceReputationLevel } from "@/game/reputation/utils";
import { applyReputationPriceModifier } from "@/game/reputation/priceModifier";
import type { Quality, RaceId } from "@/game/types";

const INITIAL_STOCK: Goods[] = ["water", "food", "medicine"];

export function FriendlyShipPanel() {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const credits = useGameStore((s) => s.credits);
    const ship = useGameStore((s) => s.ship);
    const crew = useGameStore((s) => s.crew);
    const knownRaces = useGameStore((s) => s.knownRaces);
    const discoverRace = useGameStore((s) => s.discoverRace);

    // Ensure credits are always displayed as integers
    const displayCredits = Math.floor(credits);

    const { t } = useTranslation();

    const hireCrew = useGameStore((s) => s.hireCrew);
    const getCrewCapacity = useGameStore((s) => s.getCrewCapacity);
    const acceptContract = useGameStore((s) => s.acceptContract);
    const completeDeliveryContract = useGameStore(
        (s) => s.completeDeliveryContract,
    );
    const activeContracts = useGameStore((s) => s.activeContracts);

    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const attackFriendlyShip = useGameStore((s) => s.attackFriendlyShip);
    const raceReputation = useGameStore((s) => s.raceReputation);
    const shipQuestsTaken = useGameStore((s) => s.shipQuestsTaken);
    const hiredCrewFromShips = useGameStore((s) => s.hiredCrewFromShips);
    const friendlyShipStock = useGameStore((s) => s.friendlyShipStock);
    const distressRespondedShips = useGameStore(
        (s) => s.distressRespondedShips,
    );
    const addLog = useGameStore((s) => s.addLog);

    const dominantRace = currentLocation?.dominantRace;
    const race = dominantRace ? RACES[dominantRace] : null;

    // Discover race when encountering a friendly ship
    useEffect(() => {
        if (dominantRace && race && !knownRaces.includes(dominantRace)) {
            discoverRace(dominantRace);
        }
    }, [dominantRace, race, knownRaces, discoverRace]);

    const seedRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    };

    const shipId = currentLocation?.id ?? "";

    let seed = 0;
    for (let i = 0; i < shipId.length; i++) {
        seed = (seed << 5) - seed + shipId.charCodeAt(i);
        seed = seed & seed;
    }

    useEffect(() => {
        if (!shipId || friendlyShipStock[shipId]) return;

        const initialStock: Record<string, number> = {};
        INITIAL_STOCK.forEach((gid, idx) => {
            initialStock[gid] =
                5 + Math.floor(seedRandom(seed + idx + 10) * 10);
        });

        useGameStore.setState((s) => ({
            friendlyShipStock: {
                ...s.friendlyShipStock,
                [shipId]: initialStock,
            },
        }));
    }, [friendlyShipStock, seed, shipId]);

    // Initialize or get stock for this friendly ship
    const getShipStock = (goodId: string): number => {
        if (!shipId) return 0;
        const stock = friendlyShipStock[shipId];
        if (!stock) return 0;
        return stock[goodId] || 0;
    };

    // Calculate available cargo space
    const cargoModules = ship.modules.filter(
        (m) =>
            m.type === "cargo" &&
            !m.disabled &&
            !m.manualDisabled &&
            m.health > 0,
    );
    const totalCargoCapacity = cargoModules.reduce(
        (sum, m) => sum + (m.capacity || 0),
        0,
    );
    const probes = useGameStore((s) => s.probes);
    const currentCargo =
        ship.cargo.reduce((s, c) => s + c.quantity, 0) +
        ship.tradeGoods.reduce((s, g) => s + g.quantity, 0) +
        probes;
    const availSpace = totalCargoCapacity - currentCargo;

    // Memoize crew data to prevent regeneration on every render
    const crewData = useMemo(() => {
        const professions: Profession[] = [
            "pilot",
            "engineer",
            "medic",
            "scout",
            "scientist",
            "gunner",
        ];
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
        const crewName = getRandomName(
            availableProfession,
            crewRaceId,
            seed + 104,
        );

        const qualityRoll = seedRandom(seed + 102);
        let quality: Quality;
        if (qualityRoll < 0.25) quality = "poor";
        else if (qualityRoll < 0.6) quality = "average";
        else if (qualityRoll < 0.85) quality = "good";
        else quality = "excellent";

        const { traits, priceModifier } = generateCrewTraits(
            quality,
            0,
            crewRace.hasHappiness,
        );
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
    }, [seed]);

    if (!currentLocation) return null;

    const shipQuest = currentLocation.pregeneratedQuest ?? null;

    const {
        crewRaceId,
        crewRace,
        crewName,
        availableProfession,
        availableLevel,
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

    const tradeGoods = INITIAL_STOCK.map((gid, idx) => ({
        id: gid,
        ...TRADE_GOODS[gid],
        price: Math.floor(
            TRADE_GOODS[gid].basePrice * (0.9 + seedRandom(seed + idx) * 0.4),
        ),
        stock: getShipStock(gid),
    }));

    // Handle accepting quest from ship
    const handleAcceptQuest = () => {
        if (!shipQuest) return;

        // Mark this ship as having its quest taken
        useGameStore.setState((s) => ({
            shipQuestsTaken: [...s.shipQuestsTaken, currentLocation.id],
        }));

        acceptContract(shipQuest);
    };

    return (
        <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2">
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
                            // Base prices (for 5 tons)
                            const baseBuyPrice = g.price;
                            const baseSellPrice = Math.floor(g.price * 0.6);

                            // Apply reputation modifier with anti-arbitrage protection (for 5 tons)
                            const buyPriceFor5 = dominantRace
                                ? applyReputationPriceModifier(
                                      raceReputation,
                                      dominantRace,
                                      baseBuyPrice,
                                      "buy",
                                      baseSellPrice,
                                      5, // quantity = 5 for base price
                                  )
                                : baseBuyPrice;
                            const sellPriceFor5 = dominantRace
                                ? applyReputationPriceModifier(
                                      raceReputation,
                                      dominantRace,
                                      baseSellPrice,
                                      "sell",
                                      baseBuyPrice,
                                      5, // quantity = 5 for base price
                                  )
                                : baseSellPrice;

                            const buyPriceWithRep = buyPriceFor5;
                            const sellPriceWithRep = sellPriceFor5;

                            const buyPricePerUnit = Math.floor(
                                buyPriceWithRep / 5,
                            );
                            const sellPricePerUnit = Math.floor(
                                sellPriceWithRep / 5,
                            );
                            const baseBuyPricePerUnit = Math.floor(
                                baseBuyPrice / 5,
                            );
                            const baseSellPricePerUnit = Math.floor(
                                baseSellPrice / 5,
                            );

                            const buyModified =
                                buyPricePerUnit !== baseBuyPricePerUnit;
                            const sellModified =
                                sellPricePerUnit !== baseSellPricePerUnit;

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
                                            Купить:{" "}
                                            <span
                                                className={
                                                    buyModified
                                                        ? "text-[#00ff41] font-bold"
                                                        : ""
                                                }
                                            >
                                                {buyPricePerUnit}₢/т
                                            </span>
                                            {buyModified && (
                                                <span className="text-[#888] ml-1">
                                                    ({baseBuyPricePerUnit}₢/т)
                                                </span>
                                            )}
                                            {" | "}
                                            Продать:{" "}
                                            <span
                                                className={
                                                    sellModified
                                                        ? "text-[#00ff41] font-bold"
                                                        : ""
                                                }
                                            >
                                                {sellPricePerUnit}₢/т
                                            </span>
                                            {sellModified && (
                                                <span className="text-[#888] ml-1">
                                                    ({baseSellPricePerUnit}₢/т)
                                                </span>
                                            )}
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
                                                displayCredits <
                                                    buyPricePerUnit ||
                                                g.stock < 1
                                            }
                                            onClick={() => {
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
                                                    ship: {
                                                        ...s.ship,
                                                        tradeGoods:
                                                            s.ship.tradeGoods.some(
                                                                (tg) =>
                                                                    tg.item ===
                                                                    g.id,
                                                            )
                                                                ? s.ship.tradeGoods.map(
                                                                      (tg) =>
                                                                          tg.item ===
                                                                          g.id
                                                                              ? {
                                                                                    ...tg,
                                                                                    quantity:
                                                                                        tg.quantity +
                                                                                        1,
                                                                                }
                                                                              : tg,
                                                                  )
                                                                : [
                                                                      ...s.ship
                                                                          .tradeGoods,
                                                                      {
                                                                          item: g.id,
                                                                          quantity: 1,
                                                                          buyPrice:
                                                                              g.price,
                                                                      },
                                                                  ],
                                                    },
                                                }));
                                            }}
                                            className=" bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-[9px] px-1.5 cursor-pointer disabled:cursor-not-allowed"
                                        >
                                            +1
                                        </Button>
                                        <Button
                                            disabled={
                                                availSpace < 5 ||
                                                displayCredits < g.price ||
                                                g.stock < 5
                                            }
                                            onClick={() => {
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
                                                    ship: {
                                                        ...s.ship,
                                                        tradeGoods:
                                                            s.ship.tradeGoods.some(
                                                                (tg) =>
                                                                    tg.item ===
                                                                    g.id,
                                                            )
                                                                ? s.ship.tradeGoods.map(
                                                                      (tg) =>
                                                                          tg.item ===
                                                                          g.id
                                                                              ? {
                                                                                    ...tg,
                                                                                    quantity:
                                                                                        tg.quantity +
                                                                                        5,
                                                                                }
                                                                              : tg,
                                                                  )
                                                                : [
                                                                      ...s.ship
                                                                          .tradeGoods,
                                                                      {
                                                                          item: g.id,
                                                                          quantity: 5,
                                                                          buyPrice:
                                                                              g.price,
                                                                      },
                                                                  ],
                                                    },
                                                }));
                                            }}
                                            className="bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-[9px] px-1.5 cursor-pointer disabled:cursor-not-allowed"
                                        >
                                            +5
                                        </Button>
                                        <Button
                                            disabled={
                                                availSpace < 15 ||
                                                displayCredits < g.price * 3 ||
                                                g.stock < 15
                                            }
                                            onClick={() => {
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
                                                    ship: {
                                                        ...s.ship,
                                                        tradeGoods:
                                                            s.ship.tradeGoods.some(
                                                                (tg) =>
                                                                    tg.item ===
                                                                    g.id,
                                                            )
                                                                ? s.ship.tradeGoods.map(
                                                                      (tg) =>
                                                                          tg.item ===
                                                                          g.id
                                                                              ? {
                                                                                    ...tg,
                                                                                    quantity:
                                                                                        tg.quantity +
                                                                                        15,
                                                                                }
                                                                              : tg,
                                                                  )
                                                                : [
                                                                      ...s.ship
                                                                          .tradeGoods,
                                                                      {
                                                                          item: g.id,
                                                                          quantity: 15,
                                                                          buyPrice:
                                                                              g.price,
                                                                      },
                                                                  ],
                                                    },
                                                }));
                                            }}
                                            className="bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-[9px] px-1.5 cursor-pointer disabled:cursor-not-allowed"
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
                                                useGameStore.setState((s) => {
                                                    const newTradeGoods =
                                                        s.ship.tradeGoods
                                                            .map((tg) =>
                                                                tg.item === g.id
                                                                    ? {
                                                                          ...tg,
                                                                          quantity:
                                                                              tg.quantity -
                                                                              1,
                                                                      }
                                                                    : tg,
                                                            )
                                                            .filter(
                                                                (tg) =>
                                                                    tg.quantity >
                                                                    0,
                                                            );

                                                    return {
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
                                                                        0) + 1,
                                                            },
                                                        },
                                                        credits:
                                                            s.credits +
                                                            sellPricePerUnit,
                                                        ship: {
                                                            ...s.ship,
                                                            tradeGoods:
                                                                newTradeGoods,
                                                        },
                                                    };
                                                });
                                            }}
                                            className="bg-transparent border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase text-[9px] px-1.5 cursor-pointer disabled:cursor-not-allowed"
                                        >
                                            -1
                                        </Button>
                                        <Button
                                            disabled={
                                                !playerGood ||
                                                playerGood.quantity < 5
                                            }
                                            onClick={() => {
                                                useGameStore.setState((s) => {
                                                    const newTradeGoods =
                                                        s.ship.tradeGoods
                                                            .map((tg) =>
                                                                tg.item === g.id
                                                                    ? {
                                                                          ...tg,
                                                                          quantity:
                                                                              tg.quantity -
                                                                              5,
                                                                      }
                                                                    : tg,
                                                            )
                                                            .filter(
                                                                (tg) =>
                                                                    tg.quantity >
                                                                    0,
                                                            );

                                                    return {
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
                                                                        0) + 5,
                                                            },
                                                        },
                                                        credits:
                                                            s.credits +
                                                            g.price * 0.6,
                                                        ship: {
                                                            ...s.ship,
                                                            tradeGoods:
                                                                newTradeGoods,
                                                        },
                                                    };
                                                });
                                            }}
                                            className="bg-transparent border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase text-[9px] px-1.5 cursor-pointer disabled:cursor-not-allowed"
                                        >
                                            -5
                                        </Button>
                                        <Button
                                            disabled={
                                                !playerGood ||
                                                playerGood.quantity < 15
                                            }
                                            onClick={() => {
                                                useGameStore.setState((s) => {
                                                    const newTradeGoods =
                                                        s.ship.tradeGoods
                                                            .map((tg) =>
                                                                tg.item === g.id
                                                                    ? {
                                                                          ...tg,
                                                                          quantity:
                                                                              tg.quantity -
                                                                              15,
                                                                      }
                                                                    : tg,
                                                            )
                                                            .filter(
                                                                (tg) =>
                                                                    tg.quantity >
                                                                    0,
                                                            );

                                                    return {
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
                                                                        0) + 15,
                                                            },
                                                        },
                                                        credits:
                                                            s.credits +
                                                            g.price * 1.8,
                                                        ship: {
                                                            ...s.ship,
                                                            tradeGoods:
                                                                newTradeGoods,
                                                        },
                                                    };
                                                });
                                            }}
                                            className="bg-transparent border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase text-[9px] px-1.5 cursor-pointer disabled:cursor-not-allowed"
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
                                <span className="text-[#ffb000]">
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
                                    {traits.map((trait, ti) => (
                                        <div
                                            key={ti}
                                            style={{
                                                color:
                                                    trait.type === "positive"
                                                        ? "#00ff41"
                                                        : trait.type ===
                                                            "negative"
                                                          ? "#ff4444"
                                                          : "#ffb000",
                                            }}
                                        >
                                            {trait.type === "positive"
                                                ? "✓"
                                                : trait.type === "negative"
                                                  ? "✗"
                                                  : "⚡"}{" "}
                                            {trait.name}: {trait.desc}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <Button
                            disabled={
                                displayCredits < crewPrice ||
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
                            className="cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-xs"
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
                                        📦 Груз &quot;{c.cargo}&quot; (
                                        {c.quantity ?? 10}т)
                                    </div>
                                    <div className="text-[#ffb000] text-xs mt-1">
                                        💰 {c.reward}₢
                                    </div>
                                </div>
                                <Button
                                    onClick={() =>
                                        completeDeliveryContract(c.id)
                                    }
                                    className="cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-xs"
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
                <div className="border p-2 bg-[rgba(0,255,65,0.05)]">
                    <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000] mt-2">
                        {t("friendly_ship.contract")}
                    </div>
                    <div className="text-sm p-2.5">
                        {shipQuest ? (
                            <>
                                <div className="mb-2">{shipQuest.desc}</div>
                                {shipQuest.type === "delivery" && (
                                    <div className="text-[11px] text-[#888]">
                                        {t("contracts.quest_delivery_cargo")}
                                    </div>
                                )}
                                <div className="text-[#ffb000] text-xs mt-2">
                                    {t("contracts.reward_label")}{" "}
                                    {shipQuest.reward}₢
                                </div>
                            </>
                        ) : (
                            <div className="text-[#888] text-xs">
                                {t("contracts.no_quests")}
                            </div>
                        )}
                    </div>
                    <Button
                        onClick={handleAcceptQuest}
                        disabled={!shipQuest}
                        className="cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t("contracts.accept")}
                    </Button>
                </div>
            )}

            {/* Quest already taken message */}
            {currentLocation.hasQuest && questAlreadyTaken && (
                <div className="text-sm text-[#888] mt-5 p-2.5 border border-[#888] bg-[rgba(100,100,100,0.1)]">
                    Задание с этого корабля уже взято.
                </div>
            )}

            {/* Distress Signal */}
            {currentLocation.hasDistress &&
                (() => {
                    const distressNeedTypes = ["fuel", "medicine"] as const;
                    type DistressNeed = (typeof distressNeedTypes)[number];
                    const needType: DistressNeed =
                        distressNeedTypes[
                            Math.floor(
                                seedRandom(seed + 200) *
                                    distressNeedTypes.length,
                            )
                        ];
                    const fuelAmount =
                        10 + Math.floor(seedRandom(seed + 201) * 16); // 10-25
                    const medicineAmount =
                        2 + Math.floor(seedRandom(seed + 202) * 5); // 2-6
                    const amount =
                        needType === "fuel" ? fuelAmount : medicineAmount;
                    const creditReward =
                        needType === "fuel"
                            ? fuelAmount * 8
                            : medicineAmount * 40;
                    const researchRewardRoll = seedRandom(seed + 203);
                    const hasResearchReward = researchRewardRoll < 0.45;
                    const researchRewardType =
                        researchRewardRoll < 0.25
                            ? ("tech_salvage" as const)
                            : ("alien_biology" as const);
                    const researchRewardAmount =
                        1 + Math.floor(seedRandom(seed + 204) * 2); // 1-2

                    const distressAlreadyHelped =
                        distressRespondedShips.includes(currentLocation.id);

                    const playerFuel = ship.fuel;
                    const playerMedicine =
                        needType === "medicine"
                            ? (ship.cargo.find((c) => c.item === "medicine")
                                  ?.quantity ?? 0)
                            : 0;

                    const canHelp =
                        !distressAlreadyHelped &&
                        (needType === "fuel"
                            ? playerFuel >= amount
                            : playerMedicine >= amount);

                    const handleHelp = () => {
                        useGameStore.setState((s) => {
                            const newResources = {
                                ...s.research.resources,
                            };
                            if (hasResearchReward) {
                                newResources[researchRewardType] =
                                    (newResources[researchRewardType] ?? 0) +
                                    researchRewardAmount;
                            }

                            let newCargo = s.ship.cargo;
                            let newFuel = s.ship.fuel;
                            if (needType === "fuel") {
                                newFuel = s.ship.fuel - amount;
                            } else {
                                newCargo = s.ship.cargo
                                    .map((c) =>
                                        c.item === "medicine"
                                            ? {
                                                  ...c,
                                                  quantity: c.quantity - amount,
                                              }
                                            : c,
                                    )
                                    .filter((c) => c.quantity > 0);
                            }

                            return {
                                distressRespondedShips: [
                                    ...s.distressRespondedShips,
                                    currentLocation.id,
                                ],
                                credits: s.credits + creditReward,
                                ship: {
                                    ...s.ship,
                                    fuel: newFuel,
                                    cargo: newCargo,
                                },
                                research: {
                                    ...s.research,
                                    resources: newResources,
                                },
                            };
                        });
                        addLog(
                            `🆘 Помогли кораблю в бедствии. Получено: ${creditReward}₢${hasResearchReward ? ` + ${researchRewardAmount}× исследовательский ресурс` : ""}`,
                            "info",
                        );
                    };

                    const needLabel =
                        needType === "fuel"
                            ? `⛽ Топливо: ${amount} ед.`
                            : `💊 Медикаменты: ${amount} ед.`;

                    const playerHasLabel =
                        needType === "fuel"
                            ? `На борту: ${playerFuel} ед.`
                            : `На борту: ${playerMedicine} ед.`;

                    return (
                        <div className="border border-[#ff6600] bg-[rgba(255,102,0,0.05)] p-3 mt-2">
                            <div className="font-['Orbitron'] font-bold text-base text-[#ff6600] mb-2">
                                ⚠️ Сигнал бедствия
                            </div>
                            {distressAlreadyHelped ? (
                                <div className="text-sm text-[#888]">
                                    Вы уже оказали помощь этому кораблю.
                                </div>
                            ) : (
                                <>
                                    <div className="text-sm text-[#ccc] mb-2">
                                        Повреждённый корабль запрашивает ресурсы
                                        для аварийного ремонта.
                                    </div>
                                    <div className="flex flex-col gap-1 text-xs mb-3">
                                        <div className="text-[#ffb000]">
                                            Требуется: {needLabel}
                                        </div>
                                        <div
                                            className={
                                                canHelp
                                                    ? "text-[#00ff41]"
                                                    : "text-[#ff4444]"
                                            }
                                        >
                                            {playerHasLabel}
                                        </div>
                                        <div className="text-[#00d4ff] mt-1">
                                            Награда: {creditReward}₢
                                            {hasResearchReward && (
                                                <span className="ml-2">
                                                    +{researchRewardAmount}×{" "}
                                                    {researchRewardType ===
                                                    "tech_salvage"
                                                        ? "🔧 Технологический лом"
                                                        : "🧬 Чужеродная биология"}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        disabled={!canHelp}
                                        onClick={handleHelp}
                                        className="cursor-pointer bg-transparent border-2 border-[#ff6600] text-[#ff6600] hover:bg-[#ff6600] hover:text-[#050810] uppercase text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        ПОМОЧЬ
                                    </Button>
                                </>
                            )}
                        </div>
                    );
                })()}

            <div className="flex gap-2.5 flex-wrap mt-5">
                <Button
                    onClick={showSectorMap}
                    className="cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider"
                >
                    {t("friendly_ship.leave")}
                </Button>
                {currentLocation.dominantRace &&
                    getRaceReputationLevel(
                        raceReputation,
                        currentLocation.dominantRace,
                    ) !== "hostile" && (
                        <Button
                            onClick={attackFriendlyShip}
                            className="cursor-pointer bg-transparent border-2 border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-white uppercase tracking-wider"
                        >
                            {t("friendly_ship.attack")}
                        </Button>
                    )}
            </div>
        </div>
    );
}
