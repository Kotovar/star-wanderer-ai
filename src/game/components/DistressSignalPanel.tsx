"use client";

import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";

// Get scanner range label
export function getScannerRangeLabel(
    scanRange: number,
    t: (key: string) => string,
): string {
    if (scanRange >= 15) return t("galaxy.scanner_levels.level_4");
    if (scanRange >= 8) return t("galaxy.scanner_levels.level_3");
    if (scanRange >= 5) return t("galaxy.scanner_levels.level_2");
    if (scanRange >= 3) return t("galaxy.scanner_levels.level_1");
    return t("galaxy.labels.scanner_absent");
}

const OUTCOME_INFO = {
    pirate_ambush: {
        icon: "🚨",
        color: "#ff0040",
        nameKey: "distress_signal.pirate_ambush",
        descKey: "distress_signal.pirate_ambush_desc",
        bgClass: "bg-[rgba(255,0,64,0.1)]",
    },
    survivors: {
        icon: "💚",
        color: "#00ff41",
        nameKey: "distress_signal.survivors",
        descKey: "distress_signal.survivors_desc",
        bgClass: "bg-[rgba(0,255,65,0.1)]",
    },
    abandoned_cargo: {
        icon: "📦",
        color: "#00d4ff",
        nameKey: "distress_signal.abandoned_cargo",
        descKey: "distress_signal.abandoned_cargo_desc",
        bgClass: "bg-[rgba(0,212,255,0.1)]",
    },
};

export function DistressSignalPanel() {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const respondToDistressSignal = useGameStore(
        (s) => s.respondToDistressSignal,
    );
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const getSignalRevealChance = useGameStore((s) => s.getSignalRevealChance);
    const getEffectiveScanRange = useGameStore((s) => s.getEffectiveScanRange);
    const { t } = useTranslation();

    if (!currentLocation) return null;

    const scanRange = getEffectiveScanRange();
    const revealChance = getSignalRevealChance();
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
                    {t("distress_signal.title_investigated")}
                </div>

                <div
                    className={`${info.bgClass} border p-3 text-sm`}
                    style={{ borderColor: info.color }}
                >
                    <span style={{ color: info.color }} className="font-bold">
                        {info.icon} {t(info.nameKey)}!
                    </span>
                    <br />
                    <br />
                    <span className="text-[#888]">{t(info.descKey)}</span>
                    {outcome === "pirate_ambush" && (
                        <>
                            <br />
                            <br />
                            <span className="text-[#ffb000]">
                                {t("distress_signal.enemy_found")}
                            </span>
                        </>
                    )}
                    {outcome === "survivors" && (
                        <>
                            <br />
                            <br />
                            <span className="text-[#00ff41]">
                                {t("distress_signal.survivors_saved")}
                            </span>
                        </>
                    )}
                    {outcome === "abandoned_cargo" && (
                        <>
                            <br />
                            <br />
                            <span className="text-[#00d4ff]">
                                {t("distress_signal.abandoned_ship")}
                            </span>
                            {/* Show loot details */}
                            {currentLocation.signalLoot && (
                                <>
                                    <br />
                                    <br />
                                    <div className="border-t border-[#00d4ff] pt-2 mt-2">
                                        <span className="text-[#ffb000] font-bold">
                                            {t("distress_signal.found")}
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
                    className="cursor-pointer bg-transparent border-2 border-[#666] text-[#666] hover:bg-[#666] hover:text-[#050810] uppercase tracking-wider mt-3"
                >
                    {t("distress_signal.leave_signal")}
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
                    {t("distress_signal.title")}
                </div>

                <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-3 text-sm">
                    <span className="text-[#00ff41]">
                        {t("distress_signal.scanner_detected")}
                    </span>
                    <br />
                    <span style={{ color: info.color }} className="font-bold">
                        {info.icon} {t(info.nameKey)}
                    </span>
                    <br />
                    <span className="text-[#888]">{t(info.descKey)}</span>
                </div>

                <div className="text-sm leading-relaxed">
                    <span className="text-[#ffb000]">
                        {t("distress_signal.scanner_analyzed")}
                    </span>
                </div>

                <Button
                    onClick={() => {
                        respondToDistressSignal();
                    }}
                    className={`cursor-pointer bg-transparent border-2 uppercase tracking-wider mt-3`}
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
                        ? t("distress_signal.approach_combat")
                        : t("distress_signal.approach")}
                </Button>

                <Button
                    onClick={showSectorMap}
                    className="bg-transparent border-2 border-[#666] text-[#666] hover:bg-[#666] hover:text-[#050810] uppercase tracking-wider"
                >
                    {t("distress_signal.ignore")}
                </Button>
            </div>
        );
    }

    // Unknown signal - offer to investigate
    // Show scanner chance if available and not yet checked
    const scannerLabel = getScannerRangeLabel(scanRange, t);

    return (
        <div className="flex flex-col gap-4">
            <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
                {t("distress_signal.title")}
            </div>

            <div className="text-sm leading-relaxed">
                <span className="text-[#ffaa00]">
                    {t("distress_signal.warning_detected")}
                </span>
                <br />
                <br />
                {t("distress_signal.static_message")}
                <br />
                <br />
                <span className="text-[#888]">
                    {t("distress_signal.possible_scenarios")}
                </span>
                <br />
                <span className="text-[#00ff41]">
                    {t("distress_signal.survivors_waiting")}
                </span>
                <br />
                <span className="text-[#00d4ff]">
                    {t("distress_signal.abandoned_cargo_item")}
                </span>
                <br />
                <span className="text-[#ff0040]">
                    {t("distress_signal.pirate_ambush_item")}
                </span>
                <br />
                <br />
                <span className="text-[#ffb000]">
                    {t("distress_signal.risk_warning")}
                </span>
            </div>

            {/* Scanner info */}
            {scanRange > 0 && !revealChecked && (
                <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-3 text-sm">
                    <span className="text-[#00ff41]">
                        {t("distress_signal.scanner_label").replace(
                            "{{label}}",
                            scannerLabel,
                        )}
                    </span>
                    <br />
                    <span className="text-[#888]">
                        {t("distress_signal.reveal_chance")}{" "}
                    </span>
                    <span className="text-[#ffb000]">{revealChance}%</span>
                </div>
            )}

            {scanRange > 0 && revealChecked && !isRevealed && (
                <div className="bg-[rgba(100,100,100,0.1)] border border-[#666] p-3 text-sm">
                    <span className="text-[#888]">
                        {t("distress_signal.scanner_failed")}
                    </span>
                </div>
            )}

            <div className="bg-[rgba(255,176,0,0.1)] border border-[#ffb000] p-3 text-sm">
                <span className="text-[#ffb000]">
                    {t("distress_signal.risk_title")}{" "}
                </span>
                <span className="text-white">
                    {t("distress_signal.risk_text")}
                </span>
            </div>

            <div className="flex items-center gap-4 justify-center-safe">
                <Button
                    onClick={() => {
                        respondToDistressSignal();
                    }}
                    className=" cursor-pointer bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider "
                >
                    {t("distress_signal.respond")}
                </Button>

                <Button
                    onClick={showSectorMap}
                    className=" cursor-pointer bg-transparent border-2 border-[#666] text-[#666] hover:bg-[#666] hover:text-[#050810] uppercase tracking-wider"
                >
                    {t("distress_signal.ignore")}
                </Button>
            </div>
        </div>
    );
}
