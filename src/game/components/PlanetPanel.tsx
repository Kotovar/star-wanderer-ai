"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "../store";
import {
    PLANET_SPECIALIZATIONS,
    PLANET_DESCRIPTIONS,
} from "@/game/constants/planets";
import { RACES } from "@/game/constants/races";
import { Button } from "@/components/ui/button";
import { PlanetSpecializationPanel } from "./PlanetSpecializationPanel";

export function PlanetPanel() {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const crew = useGameStore((s) => s.crew);
    const credits = useGameStore((s) => s.credits);
    const activeContracts = useGameStore((s) => s.activeContracts);
    const completedContractIds = useGameStore((s) => s.completedContractIds);

    const acceptContract = useGameStore((s) => s.acceptContract);
    const completeDeliveryContract = useGameStore(
        (s) => s.completeDeliveryContract,
    );
    const sendScoutingMission = useGameStore((s) => s.sendScoutingMission);
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const discoverRace = useGameStore((s) => s.discoverRace);
    const knownRaces = useGameStore((s) => s.knownRaces);
    const ship = useGameStore((s) => s.ship);

    const [showSpecialization, setShowSpecialization] = useState(false);
    const planetId = currentLocation?.id;
    const isOnCooldown = useGameStore(
        (s) => !!(planetId && s.planetCooldowns[planetId]),
    );

    // Discover race when visiting (useEffect to avoid setState during render)
    const dominantRace = currentLocation?.dominantRace;
    const race = dominantRace ? RACES[dominantRace] : null;

    useEffect(() => {
        if (dominantRace && race && !knownRaces.includes(dominantRace)) {
            discoverRace(dominantRace);
        }
    }, [dominantRace, race, knownRaces, discoverRace]);

    if (!currentLocation) return null;

    // Empty planet
    if (currentLocation.isEmpty) {
        const hasScout = crew.some((c) => c.profession === "scout");
        const scoutedTimes = currentLocation.scoutedTimes || 0;
        const canScout = scoutedTimes < 3;
        const lastScoutResult = currentLocation.lastScoutResult;
        const currentLocationPlanetType = currentLocation.planetType;

        return (
            <div className="flex flex-col gap-4">
                <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
                    ▸ {currentLocation.name} - {currentLocationPlanetType ?? ""}
                </div>
                <div className="text-sm text-[#888] italic">
                    {currentLocationPlanetType
                        ? PLANET_DESCRIPTIONS[currentLocationPlanetType]
                        : "Описание недоступно"}
                </div>
                <div className="text-sm leading-relaxed">
                    Пустая планета. Нет населения и заданий.
                    <br />
                    <br />
                    {canScout ? (
                        <span className="text-[#ffb000]">
                            Эта планета доступна для разведки ({scoutedTimes}
                            /3).
                        </span>
                    ) : (
                        <span className="text-[#00ff41]">
                            Планета полностью исследована (3/3).
                        </span>
                    )}
                </div>

                {/* Last scouting result */}
                {lastScoutResult && (
                    <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-3 mt-2">
                        <div className="text-[#ffb000] font-bold text-sm mb-1">
                            Последняя разведка:
                        </div>
                        {lastScoutResult.type === "credits" && (
                            <div className="text-[#00ff41] text-sm">
                                💰 Найдены ресурсы: +{lastScoutResult.value}₢
                            </div>
                        )}
                        {lastScoutResult.type === "tradeGood" && (
                            <div className="text-[#00ff41] text-sm">
                                📦 Найден груз: {lastScoutResult.itemName} (5т)
                            </div>
                        )}
                        {lastScoutResult.type === "nothing" && (
                            <div className="text-[#888] text-sm">
                                ❌ Ничего не найдено
                            </div>
                        )}
                        {lastScoutResult.type === "enemy" && (
                            <div className="text-[#ff0040] text-sm">
                                ⚔️ Засада! Враг с угрозой{" "}
                                {lastScoutResult.enemyThreat}
                            </div>
                        )}
                    </div>
                )}

                {hasScout && canScout && (
                    <>
                        <div className="font-['Orbitron'] font-bold text-base text-[#ffb000] mt-4">
                            Разведка
                        </div>
                        <div className="text-sm leading-relaxed">
                            Отправьте разведчика для исследования планеты.
                            <br />• Ресурсы (100-300₢)
                            <br />• Торговые товары (5т)
                            <br />• Встреча с врагами
                        </div>
                        <Button
                            onClick={() =>
                                sendScoutingMission(currentLocation.id)
                            }
                            className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider mt-3"
                        >
                            ОТПРАВИТЬ РАЗВЕДКУ
                        </Button>
                    </>
                )}

                {!hasScout && canScout && (
                    <div className="text-[#ff0040] text-sm mt-4 p-3 border border-[#ff0040] bg-[rgba(255,0,64,0.1)]">
                        Для разведки требуется член экипажа с профессией
                        &quot;Разведчик&quot;.
                    </div>
                )}

                <div className="flex gap-2.5 flex-wrap mt-5">
                    <Button
                        onClick={showSectorMap}
                        className="bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider"
                    >
                        ПОКИНУТЬ ПЛАНЕТУ
                    </Button>
                </div>
            </div>
        );
    }

    // Inhabited planet
    // Check for delivery contracts that target THIS specific location
    const deliveryContracts = activeContracts.filter(
        (c) =>
            c.type === "delivery" &&
            c.targetLocationId === currentLocation.id &&
            ship.cargo.some((cargo) => cargo.contractId === c.id), // Must have the cargo
    );

    // Filter available contracts - exclude completed ones
    const availableContracts = (currentLocation.contracts || []).filter(
        (c) =>
            !completedContractIds.includes(c.id) &&
            !activeContracts.some((ac) => ac.id === c.id),
    );

    const currentLocationPlanetType = currentLocation.planetType;
    return (
        <div className="flex flex-col gap-4">
            <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
                ▸ {currentLocation.name} - {currentLocationPlanetType ?? ""}
            </div>

            {/* Planet type description */}
            <div className="text-sm text-[#888] italic leading-relaxed">
                {currentLocationPlanetType
                    ? PLANET_DESCRIPTIONS[currentLocationPlanetType]
                    : "Описание недоступно"}
            </div>

            {/* Population and Race info */}
            <div className="flex items-center gap-3 text-sm">
                {race && (
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
                            {currentLocation.population && (
                                <div className="text-xs text-gray-400">
                                    👥{" "}
                                    {currentLocation.population.toLocaleString()}{" "}
                                    тыс.
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* Planet Specialization Button */}
                {race &&
                    currentLocation.dominantRace &&
                    PLANET_SPECIALIZATIONS[currentLocation.dominantRace] && (
                        <Button
                            onClick={() => setShowSpecialization(true)}
                            disabled={isOnCooldown}
                            className={`bg-transparent border-2 text-xs px-3 py-1.5 uppercase ${
                                isOnCooldown
                                    ? "border-[#444] text-[#444] cursor-not-allowed"
                                    : "border-[#9933ff] text-[#9933ff] hover:bg-[#9933ff] hover:text-[#050810]"
                            }`}
                        >
                            {isOnCooldown ? "⏱️ Использовано" : "🌟 Активность"}
                        </Button>
                    )}
            </div>

            <div className="text-sm">
                Населённая планета.
                {availableContracts.length > 0
                    ? " Доступны задачи."
                    : " Задач нет."}
            </div>

            {/* Delivery contracts completion */}
            {deliveryContracts.length > 0 && (
                <>
                    <div className="font-['Orbitron'] font-bold text-base text-[#00ff41] mt-4">
                        Сдать груз
                    </div>
                    <div className="text-xs text-[#888] mb-2">
                        Вы прибыли в место назначения
                    </div>
                    <div className="flex flex-col gap-2">
                        {deliveryContracts.map((c) => (
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

            {/* Available contracts */}
            {availableContracts.length > 0 && (
                <>
                    <div className="font-['Orbitron'] font-bold text-base text-[#ffb000] mt-4">
                        Доступные задачи
                    </div>
                    <div className="flex flex-col gap-2 max-h-75 overflow-y-auto">
                        {availableContracts.map((c) => {
                            const isActive = activeContracts.some(
                                (ac) => ac.id === c.id,
                            );
                            const isCompleted = completedContractIds.includes(
                                c.id,
                            );
                            if (isCompleted) return null;

                            // Get race info for race-specific quests
                            const raceInfo = c.requiredRace
                                ? RACES[c.requiredRace]
                                : null;

                            // Determine destination type text
                            const getDestText = (contract: typeof c) => {
                                if (!contract.targetLocationType)
                                    return (
                                        contract.targetSectorName ||
                                        "Неизвестно"
                                    );
                                const typeText =
                                    contract.targetLocationType === "planet"
                                        ? "планете"
                                        : contract.targetLocationType ===
                                            "station"
                                          ? "станции"
                                          : "кораблю";
                                return `${contract.targetLocationName} (${typeText}), сектор ${contract.targetSectorName}`;
                            };

                            return (
                                <div
                                    key={c.id}
                                    className={`bg-[rgba(0,255,65,0.05)] border p-3 ${isActive ? "opacity-40" : ""} ${c.isRaceQuest ? "border-[#9933ff]" : "border-[#00ff41]"}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="text-[#00d4ff] font-bold flex items-center gap-2">
                                                {c.desc}
                                                {c.isRaceQuest && raceInfo && (
                                                    <span
                                                        className="text-xs px-1 py-0.5 rounded"
                                                        style={{
                                                            backgroundColor: `${raceInfo.color}20`,
                                                            color: raceInfo.color,
                                                        }}
                                                    >
                                                        {raceInfo.icon}{" "}
                                                        {raceInfo.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            disabled={isActive || credits < 50}
                                            onClick={() => acceptContract(c)}
                                            className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-xs ml-2"
                                        >
                                            {isActive ? "ПРИНЯТ" : "ПРИНЯТЬ"}
                                        </Button>
                                    </div>

                                    {/* Quest details */}
                                    <div className="text-[11px] mt-2 space-y-1">
                                        {/* What to do */}
                                        <div className="text-[#00ff41]">
                                            {c.type === "delivery" &&
                                                `📦 Доставить "${c.cargo}" (10т) на ${getDestText(c)}`}
                                            {c.type === "combat" &&
                                                `⚔ Уничтожить всех врагов в секторе ${c.sectorName}`}
                                            {c.type === "research" &&
                                                `🔬 Исследовать ${c.requiresAnomalies} аномалии`}
                                            {c.type === "bounty" &&
                                                `🎯 Уничтожить врага (угроза ${c.targetThreat}) в секторе ${c.targetSectorName}`}
                                            {c.type === "diplomacy" &&
                                                `🌍 Посетить планету ${c.targetPlanetName} (${c.targetPlanetType}) в секторе ${c.targetSectorName}`}
                                            {c.type === "patrol" &&
                                                `🦠 Посетить сектора: ${c.targetSectorNames} (${c.visitedSectors?.length || 0}/${c.targetSectors?.length || 0})`}
                                            {c.type === "rescue" &&
                                                `👁️ Войти в ${c.stormName || "шторм"} в секторе ${c.sectorName}`}
                                            {c.type === "mining" &&
                                                `💎 Найти артефакт (исследовать аномалии или победить босса)`}
                                        </div>

                                        {/* Where to turn in */}
                                        <div className="text-[#ffb000]">
                                            {c.type === "delivery" &&
                                                `✓ Сдать груз на месте назначения`}
                                            {c.type === "combat" &&
                                                `✓ Автоматически после победы`}
                                            {c.type === "research" &&
                                                `✓ Автоматически после исследования`}
                                            {c.type === "bounty" &&
                                                `✓ Автоматически после победы`}
                                            {c.type === "diplomacy" &&
                                                `✓ Автоматически при посещении планеты`}
                                            {c.type === "patrol" &&
                                                `✓ Автоматически после посещения всех секторов`}
                                            {c.type === "rescue" &&
                                                `✓ Автоматически после прохождения шторма`}
                                            {c.type === "mining" &&
                                                `✓ Автоматически при находке артефакта`}
                                        </div>

                                        {/* Reward */}
                                        <div className="text-[#ffaa00] font-bold">
                                            💰 Награда: {c.reward}₢
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {availableContracts.length === 0 &&
                deliveryContracts.length === 0 && (
                    <div className="text-sm text-[#888] mt-4">
                        Нет доступных заданий.
                    </div>
                )}

            <div className="flex gap-2.5 flex-wrap mt-5">
                <Button
                    onClick={showSectorMap}
                    className="bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider"
                >
                    ПОКИНУТЬ ПЛАНЕТУ
                </Button>
            </div>

            {/* Planet Specialization Modal */}
            {showSpecialization && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                    <div className="bg-[rgba(10,20,30,0.95)] border-2 border-[#9933ff] p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
                        <PlanetSpecializationPanel
                            onClose={() => setShowSpecialization(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
