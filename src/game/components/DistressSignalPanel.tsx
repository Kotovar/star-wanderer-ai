"use client";

import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";

// Get reveal chance based on scan level
function getRevealChance(scanLevel: number): number {
    if (scanLevel >= 15) return 75;
    if (scanLevel >= 8) return 50;
    if (scanLevel >= 5) return 30;
    if (scanLevel >= 3) return 15;
    return 0;
}

// Get scanner level label
function getScannerLevelLabel(scanLevel: number): string {
    if (scanLevel >= 15) return "LV4";
    if (scanLevel >= 8) return "LV3";
    if (scanLevel >= 5) return "LV2";
    if (scanLevel >= 3) return "LV1";
    return "нет";
}

const OUTCOME_INFO = {
    pirate_ambush: {
        icon: "🚨",
        color: "#ff0040",
        name: "Засада пиратов",
        desc: "Пираты используют ложный сигнал для ловушки!",
        bgClass: "bg-[rgba(255,0,64,0.1)]",
    },
    survivors: {
        icon: "💚",
        color: "#00ff41",
        name: "Выжившие",
        desc: "На борту настоящие выжившие, ждут спасения.",
        bgClass: "bg-[rgba(0,255,65,0.1)]",
    },
    abandoned_cargo: {
        icon: "📦",
        color: "#00d4ff",
        name: "Заброшенный груз",
        desc: "Корабль покинут, груз можно забрать.",
        bgClass: "bg-[rgba(0,212,255,0.1)]",
    },
};

export function DistressSignalPanel() {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const respondToDistressSignal = useGameStore(
        (s) => s.respondToDistressSignal,
    );
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const getScanLevel = useGameStore((s) => s.getScanLevel);

    if (!currentLocation) return null;

    const scanLevel = getScanLevel();
    const outcome = currentLocation.signalType;
    const isResolved = currentLocation.signalResolved;
    const isRevealed = currentLocation.signalRevealed;
    const revealChecked = currentLocation.signalRevealChecked;

    // Check if this is already completed

    // If signal is resolved and we know the outcome - show results
    if (isResolved && outcome) {
        const info = OUTCOME_INFO[outcome];

        return (
            <div className="flex flex-col gap-4">
                <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
                    ▸ СИГНАЛ БЕДСТВИЯ [ИССЛЕДОВАНО]
                </div>

                <div
                    className={`${info.bgClass} border p-3 text-sm`}
                    style={{ borderColor: info.color }}
                >
                    <span style={{ color: info.color }} className="font-bold">
                        {info.icon} {info.name}!
                    </span>
                    <br />
                    <br />
                    <span className="text-[#888]">{info.desc}</span>
                    {outcome === "pirate_ambush" && (
                        <>
                            <br />
                            <br />
                            <span className="text-[#ffb000]">
                                Здесь были обнаружены враги.
                            </span>
                        </>
                    )}
                    {outcome === "survivors" && (
                        <>
                            <br />
                            <br />
                            <span className="text-[#00ff41]">
                                Капсула с выжившими добавлена в трюм.
                            </span>
                            <br />
                            <span className="text-[#ffb000]">
                                Доставьте на станцию или колонию для получения
                                награды.
                            </span>
                        </>
                    )}
                    {outcome === "abandoned_cargo" && (
                        <>
                            <br />
                            <br />
                            <span className="text-[#00d4ff]">
                                Пустой корабль дрейфует в космосе.
                            </span>
                            {/* Show loot details */}
                            {currentLocation.signalLoot && (
                                <>
                                    <br />
                                    <br />
                                    <div className="border-t border-[#00d4ff] pt-2 mt-2">
                                        <span className="text-[#ffb000] font-bold">
                                            Найдено:
                                        </span>
                                        {currentLocation.signalLoot.credits && (
                                            <div className="text-[#00ff41] text-xs mt-1">
                                                💰{" "}
                                                {
                                                    currentLocation.signalLoot
                                                        .credits
                                                }
                                                ₢
                                            </div>
                                        )}
                                        {currentLocation.signalLoot
                                            .tradeGood && (
                                            <div className="text-[#00d4ff] text-xs">
                                                📦{" "}
                                                {
                                                    currentLocation.signalLoot
                                                        .tradeGood.name
                                                }{" "}
                                                (
                                                {
                                                    currentLocation.signalLoot
                                                        .tradeGood.quantity
                                                }
                                                т)
                                            </div>
                                        )}
                                        {currentLocation.signalLoot
                                            .artifact && (
                                            <div className="text-[#ff00ff] text-xs">
                                                ★{" "}
                                                {
                                                    currentLocation.signalLoot
                                                        .artifact
                                                }
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                <Button
                    onClick={showSectorMap}
                    className="bg-transparent border-2 border-[#666] text-[#666] hover:bg-[#666] hover:text-[#050810] uppercase tracking-wider mt-3"
                >
                    ПОКИНУТЬ СИГНАЛ
                </Button>
            </div>
        );
    }

    // If scanner revealed the outcome (but not yet resolved)
    if (isRevealed && outcome && !isResolved) {
        const info = OUTCOME_INFO[outcome];

        return (
            <div className="flex flex-col gap-4">
                <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
                    ▸ СИГНАЛ БЕДСТВИЯ
                </div>

                <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-3 text-sm">
                    <span className="text-[#00ff41]">📡 Сканер обнаружил:</span>
                    <br />
                    <span style={{ color: info.color }} className="font-bold">
                        {info.icon} {info.name}
                    </span>
                    <br />
                    <span className="text-[#888]">{info.desc}</span>
                </div>

                <div className="text-sm leading-relaxed">
                    <span className="text-[#ffb000]">
                        Сканер смог проанализировать сигнал и определить тип
                        ситуации.
                    </span>
                </div>

                <Button
                    onClick={() => {
                        respondToDistressSignal();
                    }}
                    className={`bg-transparent border-2 uppercase tracking-wider mt-3`}
                    style={{
                        borderColor:
                            outcome === "pirate_ambush"
                                ? "#ff0040"
                                : outcome === "survivors"
                                  ? "#00ff41"
                                  : "#00d4ff",
                        color:
                            outcome === "pirate_ambush"
                                ? "#ff0040"
                                : outcome === "survivors"
                                  ? "#00ff41"
                                  : "#00d4ff",
                    }}
                >
                    {outcome === "pirate_ambush"
                        ? "⚔️ ПРИБЛИЗИТЬСЯ К БОЮ"
                        : "ПРИБЛИЗИТЬСЯ"}
                </Button>

                <Button
                    onClick={showSectorMap}
                    className="bg-transparent border-2 border-[#666] text-[#666] hover:bg-[#666] hover:text-[#050810] uppercase tracking-wider"
                >
                    ИГНОРИРОВАТЬ
                </Button>
            </div>
        );
    }

    // Unknown signal - offer to investigate
    // Show scanner chance if available and not yet checked
    const revealChance = getRevealChance(scanLevel);
    const scannerLabel = getScannerLevelLabel(scanLevel);

    return (
        <div className="flex flex-col gap-4">
            <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
                ▸ СИГНАЛ БЕДСТВИЯ
            </div>

            <div className="text-sm leading-relaxed">
                <span className="text-[#ffaa00]">
                    ⚠ Обнаружен аварийный маяк!
                </span>
                <br />
                <br />
                Корабль подаёт сигналы бедствия. На связи только статика.
                <br />
                <br />
                <span className="text-[#888]">Возможные сценарии:</span>
                <br />
                <span className="text-[#00ff41]">• Выжившие ждут спасения</span>
                <br />
                <span className="text-[#00d4ff]">• Заброшенный груз</span>
                <br />
                <span className="text-[#ff0040]">• Засада пиратов</span>
                <br />
                <br />
                <span className="text-[#ffb000]">
                    Внимание: исход неизвестен до прибытия!
                </span>
            </div>

            {/* Scanner info */}
            {scanLevel > 0 && !revealChecked && (
                <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-3 text-sm">
                    <span className="text-[#00ff41]">
                        📡 Сканер {scannerLabel}:
                    </span>
                    <br />
                    <span className="text-[#888]">
                        Шанс определить тип сигнала:{" "}
                    </span>
                    <span className="text-[#ffb000]">{revealChance}%</span>
                </div>
            )}

            {scanLevel > 0 && revealChecked && !isRevealed && (
                <div className="bg-[rgba(100,100,100,0.1)] border border-[#666] p-3 text-sm">
                    <span className="text-[#888]">
                        📡 Сканер не смог определить тип сигнала.
                    </span>
                </div>
            )}

            <div className="bg-[rgba(255,176,0,0.1)] border border-[#ffb000] p-3 text-sm">
                <span className="text-[#ffb000]">? Риск: </span>
                <span className="text-white">
                    Вы не узнаете правду, пока не подойдёте ближе.
                </span>
            </div>

            <Button
                onClick={() => {
                    respondToDistressSignal();
                }}
                className="bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider mt-5"
            >
                ОТКЛИКНУТЬСЯ
            </Button>

            <Button
                onClick={showSectorMap}
                className="bg-transparent border-2 border-[#666] text-[#666] hover:bg-[#666] hover:text-[#050810] uppercase tracking-wider"
            >
                ИГНОРИРОВАТЬ
            </Button>
        </div>
    );
}
