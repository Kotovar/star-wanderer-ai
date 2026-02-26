"use client";

import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";

export function UnknownShipPanel() {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const currentSector = useGameStore((s) => s.currentSector);
    const ship = useGameStore((s) => s.ship);
    const crew = useGameStore((s) => s.crew);
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const startCombat = useGameStore((s) => s.startCombat);
    const startBossCombat = useGameStore((s) => s.startBossCombat);
    const getScanLevel = useGameStore((s) => s.getScanLevel);
    const artifacts = useGameStore((s) => s.artifacts);
    const captain = useGameStore((s) =>
        s.crew.find((c) => c.profession === "pilot"),
    );

    if (!currentLocation) return null;

    const isShip = ["enemy", "friendly_ship"].includes(currentLocation.type);
    const scanLevel = getScanLevel();
    const hasScanner = scanLevel > 0;

    // Eye of Singularity - reveals all enemies like scanner level 3
    const hasAllSeeing = artifacts.some(
        (a) => a.effect.type === "all_seeing" && a.effect.active,
    );
    const effectiveScanner = hasScanner || hasAllSeeing;

    const handleApproach = () => {
        // Mark location as revealed on sector map
        const revealedLocation = { ...currentLocation, signalRevealed: true };

        // Update the location in the current sector
        if (currentSector) {
            useGameStore.setState((s) => {
                const updatedSector = s.currentSector
                    ? {
                          ...s.currentSector,
                          locations: s.currentSector.locations.map((l) =>
                              l.id === currentLocation.id
                                  ? revealedLocation
                                  : l,
                          ),
                      }
                    : null;
                return {
                    currentLocation: revealedLocation,
                    currentSector: updatedSector,
                };
            });
        }

        // Now we discover what it actually is
        if (currentLocation.type === "enemy") {
            // If no scanner, this is an ambush - enemy attacks first
            startCombat(currentLocation, !hasScanner);
        } else if (currentLocation.type === "ancient_boss") {
            startBossCombat(currentLocation);
        } else if (currentLocation.type === "friendly_ship") {
            useGameStore.setState({ gameMode: "friendly_ship" });
        } else if (currentLocation.type === "anomaly") {
            useGameStore.setState({ gameMode: "anomaly" });
        } else if (currentLocation.type === "storm") {
            useGameStore.setState({ gameMode: "storm" });
        }
    };

    // Get appropriate title and description
    const getTitle = () => {
        if (effectiveScanner) {
            // Eye of Singularity reveals the true identity
            return currentLocation.name;
        }
        return "❓ Неизвестный объект";
    };

    const getDescription = () => {
        if (effectiveScanner) {
            // Show actual type info
            if (currentLocation.type === "enemy") {
                return `⚔️ Вражеский корабль (угроза ${currentLocation.threat || 1})`;
            } else if (currentLocation.type === "friendly_ship") {
                return `🤝 Дружеский корабль`;
            } else if (currentLocation.type === "ancient_boss") {
                return `⚠️ Древний корабль`;
            } else if (currentLocation.type === "anomaly") {
                const type =
                    currentLocation.anomalyType === "good"
                        ? "✓ Благоприятная"
                        : "⚠ Опасная";
                return `🔮 ${type}`;
            } else if (currentLocation.type === "storm") {
                return `🌪️ Космический шторм`;
            }
        }
        return "Датчики не могут определить тип этого объекта.";
    };

    const currentHull = ship.modules.reduce((s, m) => s + m.health, 0);
    const maxHull = ship.modules.reduce(
        (s, m) => s + (m.maxHealth || m.health),
        0,
    );

    return (
        <div className="bg-[rgba(50,50,50,0.3)] border-2 border-[#666] p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold font-['Orbitron'] text-[#888]">
                    {getTitle()}
                </h2>
            </div>

            <div className="bg-[rgba(0,0,0,0.4)] p-3 mb-4 border border-[#666]">
                <p className="text-[#888] mb-2">{getDescription()}</p>
                {!effectiveScanner && (
                    <p className="text-[#ffb000]">
                        Требуется сканер для получения информации.
                    </p>
                )}
            </div>

            <div className="bg-[rgba(0,0,0,0.3)] p-3 mb-4 border border-[#ff4444]">
                <p className="text-[#ff4444] font-bold mb-2">
                    ⚠ ПРЕДУПРЕЖДЕНИЕ
                </p>
                <p className="text-[#888] text-sm">
                    {isShip
                        ? "Приближение к неизвестному кораблю может быть опасно! Это может быть как враг, так и дружественный корабль."
                        : "Приближение к неизвестному объекту может быть опасно!"}
                </p>
            </div>

            <div className="bg-[rgba(0,0,0,0.3)] p-3 mb-4 border border-[#00ff41]">
                <p className="text-[#ffb000] mb-2">Ваши показатели:</p>
                <div className="grid grid-cols-4 gap-2 text-sm">
                    <div>
                        <span className="text-[#00d4ff]">🛡 Щиты:</span>
                        <span className="text-[#00ff41] ml-1">
                            {ship.shields}/{ship.maxShields}
                        </span>
                    </div>
                    <div>
                        <span className="text-[#ffb000]">🔧 Защита:</span>
                        <span className="text-[#00ff41] ml-1">
                            {ship.armor}
                        </span>
                    </div>
                    <div>
                        <span className="text-[#ffb000]">🔧 Корпус:</span>
                        <span className="text-[#00ff41] ml-1">
                            {currentHull}/{maxHull}
                        </span>
                    </div>
                    <div>
                        <span className="text-[#ff4444]">❤ Экипаж:</span>
                        <span className="text-[#00ff41] ml-1">
                            {crew.filter((c) => c.health > 50).length}/
                            {crew.length}
                        </span>
                    </div>
                </div>
                <div className="mt-2 text-sm">
                    <span className="text-[#00ff41]">🎯 Уклонение:</span>
                    {(captain?.level || 1) + (ship.bonusEvasion || 0)}%
                    {ship.bonusEvasion ? (
                        <span className="text-[#9933ff]">
                            {" "}
                            (+{ship.bonusEvasion}% бонус)
                        </span>
                    ) : null}
                    {/*<span className="text-[#00ff41] ml-1">{captainLevel}%</span>*/}
                </div>
            </div>

            <div className="flex gap-4">
                <Button
                    onClick={handleApproach}
                    className="flex-1 bg-[#ff4444] hover:bg-[#ff6666] text-white font-bold"
                >
                    ❓ ПРИБЛИЗИТЬСЯ
                </Button>
                <Button
                    onClick={showSectorMap}
                    className="bg-transparent border-2 border-[#666] text-[#888] hover:bg-[rgba(100,100,100,0.2)]"
                >
                    ОТСТУПИТЬ
                </Button>
            </div>
        </div>
    );
}
