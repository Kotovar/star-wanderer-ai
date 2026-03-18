"use client";

import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTranslation } from "@/lib/useTranslation";
import { getTechBonusSum } from "@/game/research";
import { DEFAULT_ARTIFACT_SLOTS } from "@/game/slices/artifacts/constants";
import type { Artifact, ArtifactType } from "@/game/types";

const RARITY_COLORS: Record<
    string,
    { border: string; bg: string; text: string }
> = {
    rare: { border: "#00d4ff", bg: "rgba(0, 212, 255, 0.1)", text: "#00d4ff" },
    legendary: {
        border: "#ffaa00",
        bg: "rgba(255, 170, 0, 0.1)",
        text: "#ffaa00",
    },
    mythic: {
        border: "#ff00ff",
        bg: "rgba(255, 0, 255, 0.1)",
        text: "#ff00ff",
    },
    cursed: { border: "#ff0040", bg: "rgba(255, 0, 64, 0.1)", text: "#ff0040" },
};

const RARITY_NAMES: Record<string, string> = {
    rare: "artifacts.rarity.rare",
    legendary: "artifacts.rarity.legendary",
    mythic: "artifacts.rarity.mythic",
    cursed: "artifacts.rarity.cursed",
};

function getRarityName(rarity: string, t: (key: string) => string): string {
    return t(RARITY_NAMES[rarity] || `artifacts.rarity.${rarity}`);
}

const EFFECT_ICONS: Record<ArtifactType, string> = {
    free_power: "⚡",
    damage_reflect: "🛡️",
    sector_teleport: "🌀",
    shield_regen_boost: "💚",
    fuel_free: "⛽",
    crew_immortal: "💖",
    crit_chance: "💥",
    crit_damage_boost: "🌟",
    quantum_scan: "📡",
    artifact_finder: "🧭",
    damage_boost: "⚔️",
    module_armor: "🔰",
    nanite_repair: "🔩",
    abyss_power: "⚛️",
    all_seeing: "👁️",
    undying_crew: "🧬",
    credit_booster: "📦",
    auto_repair: "🔧",
    dark_shield: "🌑",
    ai_control: "🤖",
    void_engine: "💫",
    accuracy_boost: "🎯",
    evasion_boost: "💨",
};

function ArtifactCard({
    artifact,
    onResearch,
    onToggle,
    slotsAtLimit,
}: {
    artifact: Artifact;
    onResearch: () => void;
    onToggle: () => void;
    slotsAtLimit: boolean;
}) {
    const { t } = useTranslation();
    const colors = RARITY_COLORS[artifact.rarity];
    const icon = EFFECT_ICONS[artifact.effect.type] || "?";

    return (
        <div
            className={`border-2 p-3 cursor-pointer ${artifact.discovered ? "" : "opacity-40"}`}
            style={{
                borderColor: colors.border,
                backgroundColor: artifact.effect.active
                    ? colors.bg
                    : "transparent",
            }}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">
                        {artifact.discovered ? icon : "❓"}
                    </span>
                    <div>
                        <div
                            className="font-bold text-sm"
                            style={{
                                color: artifact.discovered ? "#fff" : "#666",
                            }}
                        >
                            {artifact.discovered ? artifact.name : "???"}
                        </div>
                        <div className="text-xs" style={{ color: colors.text }}>
                            {getRarityName(artifact.rarity, t)}
                        </div>
                    </div>
                </div>

                {artifact.effect.active && (
                    <span className="text-xs text-[#00ff41] bg-[rgba(0,255,65,0.2)] px-2 py-1">
                        {t("artifacts.active_label")}
                    </span>
                )}
            </div>

            {artifact.discovered && (
                <>
                    {/* Positive effect */}
                    <div className="text-xs mt-2 leading-relaxed text-[#00ff41]">
                        ★ {artifact.description}
                    </div>

                    {/* Negative effect for cursed artifacts */}
                    {artifact.cursed && artifact.negativeEffect && (
                        <div className="text-xs mt-2 leading-relaxed text-[#ff0040] bg-[rgba(255,0,64,0.1)] p-2 border-l-2 border-[#ff0040]">
                            ⚠ {artifact.negativeEffect.description}
                        </div>
                    )}
                    {artifact.cursed &&
                        artifact.negativeEffects?.map((neg, i) => (
                            <div
                                key={i}
                                className="text-xs mt-1 leading-relaxed text-[#ff0040] bg-[rgba(255,0,64,0.1)] p-2 border-l-2 border-[#ff0040]"
                            >
                                ⚠ {neg.description}
                            </div>
                        ))}

                    {/* Active curse losses indicator */}
                    {artifact.cursed &&
                        artifact.effect.active &&
                        artifact.negativeEffect && (
                            <div className="text-xs mt-1 text-[#ff4444] bg-[rgba(255,0,0,0.15)] px-2 py-1 border border-[#ff0040] animate-pulse">
                                ☠️ АКТИВНО — потери каждый ход:{" "}
                                {artifact.negativeEffect.description}
                            </div>
                        )}
                    {artifact.cursed &&
                        artifact.effect.active &&
                        artifact.negativeEffects?.map((neg, i) => (
                            <div
                                key={i}
                                className="text-xs mt-1 text-[#ff4444] bg-[rgba(255,0,0,0.15)] px-2 py-1 border border-[#ff0040] animate-pulse"
                            >
                                ☠️ АКТИВНО: {neg.description}
                            </div>
                        ))}

                    <div className="text-xs mt-2">
                        <span className="text-[#888]">
                            {t("artifacts.requires_scientist")}:{" "}
                        </span>
                        <span
                            className={
                                artifact.researched
                                    ? "text-[#00ff41]"
                                    : "text-[#ffb000]"
                            }
                        >
                            {t("crew.level")} {artifact.requiresScientistLevel}
                        </span>
                    </div>

                    {!artifact.researched && (
                        <Button
                            onClick={onResearch}
                            className={`cursor-pointer w-full mt-3 text-xs py-1 bg-transparent border hover:text-[#050810] ${
                                artifact.cursed
                                    ? "border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040]"
                                    : "border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000]"
                            }`}
                        >
                            {artifact.cursed
                                ? t("artifacts.research_btn_dangerous")
                                : t("artifacts.research_btn")}
                        </Button>
                    )}

                    {artifact.researched && (
                        <>
                            {!artifact.effect.active && slotsAtLimit && (
                                <div className="text-xs mt-2 text-[#888] text-center">
                                    {t("artifacts.slots_full_hint")}
                                </div>
                            )}
                            <Button
                                onClick={onToggle}
                                disabled={
                                    !artifact.effect.active && slotsAtLimit
                                }
                                className={`cursor-pointer w-full mt-3 text-xs py-1 ${
                                    !artifact.effect.active && slotsAtLimit
                                        ? "bg-transparent border border-[#444] text-[#444] cursor-not-allowed opacity-50"
                                        : artifact.effect.active
                                          ? artifact.cursed
                                              ? "bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
                                              : "bg-transparent border border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810]"
                                          : "bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
                                }`}
                            >
                                {artifact.effect.active
                                    ? artifact.cursed
                                        ? t("artifacts.active_neutralize_btn")
                                        : t("artifacts.deactivate_btn")
                                    : t("artifacts.activate_btn")}
                            </Button>
                        </>
                    )}
                </>
            )}

            {!artifact.discovered && (
                <div className="text-xs text-[#666] mt-2 italic">
                    {t("artifacts.undiscovered")}
                </div>
            )}
        </div>
    );
}

export function ArtifactPanel() {
    const artifacts = useGameStore((s) => s.artifacts);
    const researchArtifact = useGameStore((s) => s.researchArtifact);
    const toggleArtifact = useGameStore((s) => s.toggleArtifact);
    const crew = useGameStore((s) => s.crew);
    const research = useGameStore((s) => s.research);
    const { t } = useTranslation();

    const scientists = crew.filter((c) => c.profession === "scientist");
    const maxScientistLevel =
        scientists.length > 0
            ? Math.max(...scientists.map((s) => s.level || 1))
            : 0;

    const discoveredCount = artifacts.filter((a) => a.discovered).length;
    const researchedCount = artifacts.filter((a) => a.researched).length;
    const activeCount = artifacts.filter((a) => a.effect.active).length;
    const cursedActive = artifacts.filter(
        (a) => a.cursed && a.effect.active,
    ).length;
    const maxSlots =
        DEFAULT_ARTIFACT_SLOTS + getTechBonusSum(research, "artifact_slots");
    const slotsAtLimit = activeCount >= maxSlots;

    // Separate regular and cursed artifacts
    const regularArtifacts = artifacts.filter((a) => !a.cursed);
    const cursedArtifacts = artifacts.filter((a) => a.cursed);

    return (
        <div className="flex flex-col h-full overflow-hidden gap-2">
            {/* Header */}
            <div className="shrink-0">
                <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
                    {t("artifacts.title")}
                </div>

                <div className="text-sm text-[#888]">
                    {t("artifacts.discovered")}:{" "}
                    <span className="text-[#00ff41]">{discoveredCount}</span> /{" "}
                    {artifacts.length}
                    {" | "}
                    {t("artifacts.researched")}:{" "}
                    <span className="text-[#ffb000]">{researchedCount}</span>
                </div>
                <div className="text-sm text-[#888]">
                    {t("artifacts.active_artifacts")}:{" "}
                    <span
                        className={
                            slotsAtLimit ? "text-[#ff0040]" : "text-[#00d4ff]"
                        }
                    >
                        {activeCount}/{maxSlots}
                    </span>
                    {slotsAtLimit && (
                        <span className="text-[#ff0040]">
                            {" "}
                            — {t("artifacts.slots_full")}
                        </span>
                    )}
                    {cursedActive > 0 && (
                        <span className="text-[#ff0040]">
                            {" "}
                            ({cursedActive} ☠️ {t("artifacts.cursed_active")})
                        </span>
                    )}
                </div>

                <div className="text-xs text-[#888]">
                    {t("artifacts.scientists_onboard")}:{" "}
                    {scientists.length > 0
                        ? `${t("crew.level")} ${maxScientistLevel}`
                        : t("artifacts.no_scientists")}
                </div>
            </div>

            {/* Tabs for regular and cursed artifacts */}
            <Tabs
                defaultValue="regular"
                className="flex-1 overflow-hidden flex flex-col"
            >
                <TabsList className="shrink-0">
                    <TabsTrigger
                        value="regular"
                        className="text-[#00d4ff] data-[state=active]:border-[#00d4ff] data-[state=active]:bg-[rgba(0,212,255,0.1)] cursor-pointer"
                    >
                        {t("artifacts.tabs.regular")} (
                        {discoveredCount -
                            cursedArtifacts.filter((a) => a.discovered).length}
                        /{regularArtifacts.length})
                    </TabsTrigger>
                    <TabsTrigger
                        value="cursed"
                        className="text-[#ff0040] data-[state=active]:border-[#ff0040] data-[state=active]:bg-[rgba(255,0,64,0.1)] cursor-pointer"
                    >
                        {t("artifacts.tabs.cursed")} (
                        {cursedArtifacts.filter((a) => a.discovered).length}/
                        {cursedArtifacts.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent
                    value="regular"
                    className="flex-1 overflow-hidden mt-2"
                >
                    <div className="h-full overflow-y-auto pr-2 grid gap-3">
                        {regularArtifacts.map((artifact) => (
                            <ArtifactCard
                                key={artifact.id}
                                artifact={artifact}
                                onResearch={() => researchArtifact(artifact.id)}
                                onToggle={() => toggleArtifact(artifact.id)}
                                slotsAtLimit={slotsAtLimit}
                            />
                        ))}
                        {regularArtifacts.length === 0 && (
                            <div className="text-sm text-[#888] text-center py-8">
                                {t("artifacts.no_regular")}
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent
                    value="cursed"
                    className="flex-1 overflow-hidden mt-2"
                >
                    <div className="h-full overflow-y-auto pr-2 space-y-3">
                        <div className="grid gap-3">
                            {cursedArtifacts.map((artifact) => (
                                <ArtifactCard
                                    key={artifact.id}
                                    artifact={artifact}
                                    onResearch={() =>
                                        researchArtifact(artifact.id)
                                    }
                                    onToggle={() => toggleArtifact(artifact.id)}
                                    slotsAtLimit={slotsAtLimit}
                                />
                            ))}
                        </div>
                        {cursedArtifacts.length === 0 && (
                            <div className="text-sm text-[#888] text-center py-8">
                                {t("artifacts.no_cursed")}
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>

            {/* Footer - Advice */}
            <div className="shrink-0 mt-auto">
                <div className="bg-[rgba(255,176,0,0.1)] border border-[#ffb000] p-3 text-xs">
                    <span className="text-[#ffb000]">
                        {t("artifacts.tip_title")}
                    </span>
                    <span className="text-[#888]">
                        {t("artifacts.tip_text")}
                    </span>
                </div>
            </div>
        </div>
    );
}
