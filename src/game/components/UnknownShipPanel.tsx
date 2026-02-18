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

    if (!currentLocation) return null;

    const isShip = ["enemy", "friendly_ship"].includes(currentLocation.type);
    const isAnomaly = currentLocation.type === "anomaly";
    const isBoss = currentLocation.type === "ancient_boss";
    const isStorm = currentLocation.type === "storm";
    const scanLevel = getScanLevel();
    const hasScanner = scanLevel > 0;

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

    // Get appropriate title and description - always the same for unknown objects
    const getTitle = () => {
        return "❓ Неизвестный объект";
    };

    const getDescription = () => {
        return "Датчики не могут определить тип этого объекта.";
    };

    return (
        <div className="bg-[rgba(50,50,50,0.3)] border-2 border-[#666] p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold font-['Orbitron'] text-[#888]">
                    {getTitle()}
                </h2>
            </div>

            <div className="bg-[rgba(0,0,0,0.4)] p-3 mb-4 border border-[#666]">
                <p className="text-[#888] mb-2">{getDescription()}</p>
                <p className="text-[#ffb000]">
                    Требуется сканер для получения информации.
                </p>
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
                <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                        <span className="text-[#00d4ff]">🛡 Щиты:</span>
                        <span className="text-[#00ff41] ml-1">
                            {ship.shields}/{ship.maxShields}
                        </span>
                    </div>
                    <div>
                        <span className="text-[#ffb000]">🔧 Броня:</span>
                        <span className="text-[#00ff41] ml-1">
                            {ship.armor}%
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
