"use client";

import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";
import type { Artifact } from "../types";

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
    rare: "Редкий",
    legendary: "Легендарный",
    mythic: "Мифический",
    cursed: "⚠️ Проклятый",
};

const EFFECT_ICONS: Record<string, string> = {
    free_power: "⚡",
    damage_reflect: "🛡️",
    sector_teleport: "🌀",
    shield_regen: "💚",
    fuel_free: "⛽",
    crew_immortal: "💖",
    crit_chance: "💥",
    scan_boost: "📡",
    artifact_finder: "🧭",
    damage_boost: "⚔️",
    abyss_power: "⚛️",
    all_seeing: "👁️",
    undying_crew: "🧬",
    credit_booster: "📦",
    auto_repair: "🔧",
    critical_overload: "💥",
    dark_shield: "🛡️",
    void_engine: "🌀",
};

function ArtifactCard({
    artifact,
    onResearch,
    onToggle,
}: {
    artifact: Artifact;
    onResearch: () => void;
    onToggle: () => void;
}) {
    const colors = RARITY_COLORS[artifact.rarity];
    const icon = EFFECT_ICONS[artifact.effect.type] || "?";

    return (
        <div
            className={`border-2 p-3 ${artifact.discovered ? "" : "opacity-40"}`}
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
                            {RARITY_NAMES[artifact.rarity]}
                        </div>
                    </div>
                </div>

                {artifact.effect.active && (
                    <span className="text-xs text-[#00ff41] bg-[rgba(0,255,65,0.2)] px-2 py-1">
                        АКТИВЕН
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

                    <div className="text-xs mt-2">
                        <span className="text-[#888]">Требуется учёный: </span>
                        <span
                            className={
                                artifact.researched
                                    ? "text-[#00ff41]"
                                    : "text-[#ffb000]"
                            }
                        >
                            Ур. {artifact.requiresScientistLevel}
                        </span>
                    </div>

                    {!artifact.researched && (
                        <Button
                            onClick={onResearch}
                            className={`w-full mt-3 text-xs py-1 ${
                                artifact.cursed
                                    ? "bg-transparent border border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810]"
                                    : "bg-transparent border border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810]"
                            }`}
                        >
                            {artifact.cursed
                                ? "⚠️ ИЗУЧИТЬ (ОПАСНО)"
                                : "ИЗУЧИТЬ"}
                        </Button>
                    )}

                    {artifact.researched && (
                        <Button
                            onClick={onToggle}
                            className={`w-full mt-3 text-xs py-1 ${
                                artifact.effect.active
                                    ? artifact.cursed
                                        ? "bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
                                        : "bg-transparent border border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810]"
                                    : "bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
                            }`}
                        >
                            {artifact.effect.active
                                ? artifact.cursed
                                    ? "✓ АКТИВ (НЕЙТРАЛИЗОВАТЬ)"
                                    : "ДЕАКТИВИРОВАТЬ"
                                : "АКТИВИРОВАТЬ"}
                        </Button>
                    )}
                </>
            )}

            {!artifact.discovered && (
                <div className="text-xs text-[#666] mt-2 italic">
                    Ещё не обнаружен...
                </div>
            )}
        </div>
    );
}

export function ArtifactPanel() {
    const artifacts = useGameStore((s) => s.artifacts);
    const researchArtifact = useGameStore((s) => s.researchArtifact);
    const toggleArtifact = useGameStore((s) => s.toggleArtifact);
    const closeArtifactsPanel = useGameStore((s) => s.closeArtifactsPanel);
    const crew = useGameStore((s) => s.crew);

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

    // Separate regular and cursed artifacts
    const regularArtifacts = artifacts.filter((a) => !a.cursed);
    const cursedArtifacts = artifacts.filter((a) => a.cursed);

    return (
        <div className="flex flex-col gap-4">
            <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
                ▸ АРТЕФАКТЫ ДРЕВНИХ
            </div>

            <div className="text-sm text-[#888]">
                Обнаружено:{" "}
                <span className="text-[#00ff41]">{discoveredCount}</span> /{" "}
                {artifacts.length}
                {" | "}
                Изучено:{" "}
                <span className="text-[#ffb000]">{researchedCount}</span>
                {" | "}
                Активно: <span className="text-[#00d4ff]">{activeCount}</span>
                {cursedActive > 0 && (
                    <span className="text-[#ff0040]">
                        {" "}
                        ({cursedActive} проклятых)
                    </span>
                )}
            </div>

            <div className="text-xs text-[#888] mb-2">
                Учёные на борту:{" "}
                {scientists.length > 0 ? `Ур. ${maxScientistLevel}` : "нет"}
            </div>

            {/* Regular artifacts */}
            {regularArtifacts.length > 0 && (
                <div className="grid gap-3 max-h-60 overflow-y-auto pr-2">
                    {regularArtifacts.map((artifact) => (
                        <ArtifactCard
                            key={artifact.id}
                            artifact={artifact}
                            onResearch={() => researchArtifact(artifact.id)}
                            onToggle={() => toggleArtifact(artifact.id)}
                        />
                    ))}
                </div>
            )}

            {/* Cursed artifacts section */}
            {cursedArtifacts.length > 0 && (
                <>
                    <div className="font-['Orbitron'] font-bold text-sm text-[#ff0040] mt-2 border-t border-[#ff004044] pt-3">
                        ⚠️ ПРОКЛЯТЫЕ АРТЕФАКТЫ
                    </div>
                    <div className="text-xs text-[#ff6666] bg-[rgba(255,0,64,0.1)] p-2 border-l-2 border-[#ff0040]">
                        Сила этих артефактов сопровождается ценой. Каждый ход
                        активный проклятый артефакт оказывает негативное
                        воздействие на корабль или экипаж.
                    </div>
                    <div className="grid gap-3 max-h-60 overflow-y-auto pr-2">
                        {cursedArtifacts.map((artifact) => (
                            <ArtifactCard
                                key={artifact.id}
                                artifact={artifact}
                                onResearch={() => researchArtifact(artifact.id)}
                                onToggle={() => toggleArtifact(artifact.id)}
                            />
                        ))}
                    </div>
                </>
            )}

            <div className="bg-[rgba(255,176,0,0.1)] border border-[#ffb000] p-3 text-xs mt-2">
                <span className="text-[#ffb000]">★ Совет: </span>
                <span className="text-[#888]">
                    Обычные артефакты можно найти в аномалиях и штормах.
                    Проклятые артефакты встречаются реже, но их эффекты очень
                    мощные — и опасные.
                </span>
            </div>

            <Button
                onClick={closeArtifactsPanel}
                className="bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider mt-5"
            >
                ЗАКРЫТЬ
            </Button>
        </div>
    );
}
