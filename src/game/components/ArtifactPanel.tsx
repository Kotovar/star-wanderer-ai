"use client";

import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { useTranslation } from "@/lib/useTranslation";
import { getTechBonusSum } from "@/game/research";
import { DEFAULT_ARTIFACT_SLOTS } from "@/game/slices/artifacts/constants";
import type { Artifact, ArtifactType } from "@/game/types";
import { getLocationName } from "@/lib/translationHelpers";

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

type ArtifactFilter =
    | "all"
    | "regular"
    | "cursed"
    | "discovered"
    | "researched"
    | "active"
    | "hinted";

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
    const hintSource = artifact.hintSource ?? "unknown";

    return (
        <div
            className={`border-2 p-3 cursor-pointer ${artifact.discovered || artifact.hinted ? "" : "opacity-40"}`}
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

                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {artifact.hinted && !artifact.discovered && (
                        <span className="text-xs text-ring bg-[rgba(0,212,255,0.15)] px-2 py-1">
                            {t(`artifacts.hint_label_${hintSource}`)}
                        </span>
                    )}
                    {artifact.effect.active && (
                        <span className="text-xs text-[#00ff41] bg-[rgba(0,255,65,0.2)] px-2 py-1">
                            {t("artifacts.active_label")}
                        </span>
                    )}
                </div>
            </div>

            {artifact.discovered && (
                <>
                    {/* Positive effect */}
                    <div className="text-xs mt-2 leading-relaxed text-[#00ff41]">
                        ★ {artifact.description}
                    </div>

                    {/* Negative effect for cursed artifacts */}
                    {artifact.cursed && artifact.negativeEffect && (
                        <div className="text-xs mt-2 leading-relaxed text-destructive bg-[rgba(255,0,64,0.1)] p-2 border-l-2 border-destructive">
                            ⚠ {artifact.negativeEffect.description}
                        </div>
                    )}
                    {artifact.cursed &&
                        artifact.negativeEffects?.map((neg, i) => (
                            <div
                                key={i}
                                className="text-xs mt-1 leading-relaxed text-destructive bg-[rgba(255,0,64,0.1)] p-2 border-l-2 border-destructive"
                            >
                                ⚠ {neg.description}
                            </div>
                        ))}

                    {/* Active curse losses indicator */}
                    {artifact.cursed &&
                        artifact.effect.active &&
                        artifact.negativeEffect && (
                            <div className="text-xs mt-1 text-[#ff4444] bg-[rgba(255,0,0,0.15)] px-2 py-1 border border-destructive animate-pulse">
                                ☠️ АКТИВНО — потери каждый ход:{" "}
                                {artifact.negativeEffect.description}
                            </div>
                        )}
                    {artifact.cursed &&
                        artifact.effect.active &&
                        artifact.negativeEffects?.map((neg, i) => (
                            <div
                                key={i}
                                className="text-xs mt-1 text-[#ff4444] bg-[rgba(255,0,0,0.15)] px-2 py-1 border border-destructive animate-pulse"
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
                                    : "text-accent"
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
                                    ? "border-destructive text-destructive hover:bg-destructive"
                                    : "border-accent text-accent hover:bg-accent"
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
                                              : "bg-transparent border border-destructive text-destructive hover:bg-destructive hover:text-[#050810]"
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
                <div className="mt-2 space-y-1">
                    <div className="text-xs text-[#666] italic">
                        {t("artifacts.undiscovered")}
                    </div>
                    {artifact.hintedAt ? (
                        <div className="text-[10px] text-ring flex items-center gap-1">
                            <span>🧭</span>
                            <span>
                                {t("artifacts.hint_location")}: {" "}
                                {artifact.hintedAt.sectorName} · {" "}
                                {getLocationName(
                                    artifact.hintedAt.locationName,
                                    t,
                                )}
                            </span>
                        </div>
                    ) : (
                        <div className="text-[10px] text-[#444] flex items-center gap-1">
                            <span>📍</span>
                            <span>{t("artifacts.undiscovered_hint")}</span>
                        </div>
                    )}
                    {artifact.hinted && (
                        <div className="text-[10px] text-ring flex items-center gap-1">
                            <span>📡</span>
                            <span>{t(`artifacts.hint_text_${hintSource}`)}</span>
                        </div>
                    )}
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
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const { t } = useTranslation();
    const [artifactSearchText, setArtifactSearchText] = useState("");
    const [artifactFilter, setArtifactFilter] =
        useState<ArtifactFilter>("all");

    const scientists = crew.filter((c) => c.profession === "scientist");
    const maxScientistLevel =
        scientists.length > 0
            ? Math.max(...scientists.map((s) => s.level || 1))
            : 0;
    const discoveredCount = artifacts.filter((a) => a.discovered).length;
    const researchedCount = artifacts.filter((a) => a.researched).length;
    const activeCount = artifacts.filter((a) => a.effect.active).length;
    const hintedCount = artifacts.filter(
        (a) => !a.discovered && a.hinted,
    ).length;
    const cursedActive = artifacts.filter(
        (a) => a.cursed && a.effect.active,
    ).length;
    const maxSlots =
        DEFAULT_ARTIFACT_SLOTS + getTechBonusSum(research, "artifact_slots");
    const slotsAtLimit = activeCount >= maxSlots;

    const regularArtifacts = artifacts.filter((a) => !a.cursed);
    const cursedArtifacts = artifacts.filter((a) => a.cursed);
    const discoveredRegularCount = regularArtifacts.filter(
        (a) => a.discovered,
    ).length;
    const discoveredCursedCount = cursedArtifacts.filter((a) => a.discovered).length;

    const filteredArtifacts = useMemo(() => {
        const query = artifactSearchText.trim().toLowerCase();
        return artifacts.filter((artifact) => {
            const matchesSearch = query
                ? artifact.name.toLowerCase().includes(query)
                : true;
            const matchesFilter =
                artifactFilter === "all"
                    ? true
                    : artifactFilter === "regular"
                        ? !artifact.cursed
                        : artifactFilter === "cursed"
                          ? artifact.cursed
                          : artifactFilter === "discovered"
                            ? artifact.discovered
                            : artifactFilter === "researched"
                              ? artifact.researched
                              : artifactFilter === "active"
                                ? artifact.effect.active
                                : !artifact.discovered && !!artifact.hinted;
            return matchesSearch && matchesFilter;
        });
    }, [artifactSearchText, artifactFilter, artifacts]);

    const filterButtons = useMemo(
        () =>
            [
                { id: "all", label: "Все" },
                {
                    id: "regular",
                    label: `${t("artifacts.tabs.regular")} (${discoveredRegularCount}/${regularArtifacts.length})`,
                },
                {
                    id: "cursed",
                    label: `${t("artifacts.tabs.cursed")} (${discoveredCursedCount}/${cursedArtifacts.length})`,
                },
                {
                    id: "discovered",
                    label: `${t("artifacts.discovered")} (${discoveredCount})`,
                },
                {
                    id: "researched",
                    label: `${t("artifacts.researched")} (${researchedCount})`,
                },
                {
                    id: "active",
                    label: `${t("artifacts.active")} (${activeCount})`,
                },
                {
                    id: "hinted",
                    label: `📡 ${t("artifacts.hints")} (${hintedCount})`,
                },
        ] satisfies Array<{ id: ArtifactFilter; label: string }>,
        [
            discoveredRegularCount,
            regularArtifacts.length,
            discoveredCursedCount,
            cursedArtifacts.length,
            discoveredCount,
            researchedCount,
            activeCount,
            hintedCount,
            t,
        ],
    );

    return (
        <div className="flex flex-col h-full min-h-0 overflow-hidden gap-2">
            {/* Header */}
            <div className="shrink-0">
                <div className="flex items-start justify-between gap-3 border-b border-[#ffb00044] pb-3">
                    <div className="font-['Orbitron'] font-bold text-lg text-accent">
                        {t("artifacts.title")}
                    </div>
                    <Button
                        onClick={showSectorMap}
                        className="shrink-0 cursor-pointer border border-[#00ff41] bg-transparent text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
                    >
                        {t("common.back_to_map")}
                    </Button>
                </div>

                <div className="text-sm text-[#888]">
                    {t("artifacts.active_artifacts")}:{" "}
                    <span
                        className={
                            slotsAtLimit ? "text-destructive" : "text-ring"
                        }
                    >
                        {activeCount}/{maxSlots}
                    </span>
                    {slotsAtLimit && (
                        <span className="text-destructive">
                            {" "}
                            — {t("artifacts.slots_full")}
                        </span>
                    )}
                    {cursedActive > 0 && (
                        <span className="text-destructive">
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

                <div className="mt-2">
                    <input
                        value={artifactSearchText}
                        onChange={(event) =>
                            setArtifactSearchText(event.target.value)
                        }
                        placeholder="Поиск артефактов..."
                        className="w-full px-2 py-1 text-xs bg-[#080808] border border-[#333] text-[#888] placeholder:text-[#555] outline-none focus:border-[#00ff41]"
                    />
                </div>
                <div className="mt-2 flex flex-nowrap gap-1 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible lg:pb-0">
                    {filterButtons.map((button) => (
                        <button
                            type="button"
                            key={button.id}
                            onClick={() =>
                                setArtifactFilter(button.id)
                            }
                            className="shrink-0 whitespace-nowrap px-2 py-1 text-[10px] border cursor-pointer"
                            style={{
                                borderColor:
                                    artifactFilter === button.id
                                        ? "#00ff41"
                                        : "#333",
                                color:
                                    artifactFilter === button.id
                                        ? "#00ff41"
                                        : "#777",
                                backgroundColor:
                                    artifactFilter === button.id
                                        ? "rgba(0,255,65,0.07)"
                                        : "rgba(0,0,0,0.18)",
                            }}
                        >
                            {button.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden mt-2">
                <div className="h-full overflow-y-auto pr-2 grid gap-3">
                    {filteredArtifacts.map((artifact) => (
                        <ArtifactCard
                            key={artifact.id}
                            artifact={artifact}
                            onResearch={() => researchArtifact(artifact.id)}
                            onToggle={() => toggleArtifact(artifact.id)}
                            slotsAtLimit={slotsAtLimit}
                        />
                    ))}
                    {filteredArtifacts.length === 0 && (
                        <div className="text-sm text-[#888] text-center py-8">
                            {artifactFilter === "cursed"
                                ? t("artifacts.no_cursed")
                                : artifactFilter === "regular"
                                  ? t("artifacts.no_regular")
                                  : t("artifacts.no_results")}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer - Advice */}
            <div className="hidden shrink-0 mt-auto lg:block">
                <div className="bg-[rgba(255,176,0,0.1)] border border-accent p-3 text-xs">
                    <span className="text-accent">
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
