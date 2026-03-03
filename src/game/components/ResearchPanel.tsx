"use client";

import { useState } from "react";
import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import {
    RESEARCH_TREE,
    RESEARCH_RESOURCES,
    getTechnologiesByTier,
    canResearchTech,
    type Technology,
} from "@/game/constants/research";
import type {
    ResearchTier,
    ResearchCategory,
    Module,
    CrewMember,
    ResearchData,
    TradeGood,
} from "@/game/types";
import { typedKeys } from "@/lib/utils";

const CATEGORY_COLORS: Record<ResearchCategory, string> = {
    ship_systems: "#00d4ff",
    weapons: "#ff0040",
    science: "#9933ff",
    engineering: "#ffb000",
    biology: "#00ff41",
    ancient_tech: "#ffd700",
};

const CATEGORY_ICONS: Record<ResearchCategory, string> = {
    ship_systems: "⚙️",
    weapons: "⚔️",
    science: "🔬",
    engineering: "🔧",
    biology: "🧬",
    ancient_tech: "👁️",
};

const CATEGORY_NAMES: Record<ResearchCategory, string> = {
    ship_systems: "Системы",
    weapons: "Оружие",
    science: "Наука",
    engineering: "Инженерия",
    biology: "Биология",
    ancient_tech: "Древние",
};

interface ResearchContentProps {
    research: ResearchData;
    credits: number;
    ship: { modules: Module[]; tradeGoods: TradeGood[] };
    scientists: CrewMember[];
    hasLab: boolean;
    canResearch: boolean;
    selectedTier: ResearchTier;
    setSelectedTier: (tier: ResearchTier) => void;
    selectedCategory: ResearchCategory | "all";
    setSelectedCategory: (cat: ResearchCategory | "all") => void;
    selectedTech: string | null;
    setSelectedTech: (tech: string | null) => void;
    researchedTechs: string[];
    getResearchResourceQuantity: (type: string) => number;
    hasResources: (tech: Technology) => boolean;
    calculateEstimatedTurns: () => number;
    selectedTechnology: Technology | null;
    startResearch: (techId: string) => void;
    isMobile?: boolean;
}

function ResearchContent({
    research,
    credits,
    ship,
    scientists,
    hasLab,
    canResearch,
    selectedTier,
    setSelectedTier,
    selectedCategory,
    setSelectedCategory,
    selectedTech,
    setSelectedTech,
    researchedTechs,
    getResearchResourceQuantity,
    hasResources,
    calculateEstimatedTurns,
    selectedTechnology,
    startResearch,
    isMobile = false,
}: ResearchContentProps) {
    const technologies = getTechnologiesByTier(selectedTier).filter(
        (tech) =>
            selectedCategory === "all" || tech.category === selectedCategory,
    );

    const discoveredTechs = research?.discoveredTechs || [];

    return (
        <div className="flex flex-col gap-3 p-4">
            {/* Lab status */}
            <div
                className={`p-2 md:p-3 border ${hasLab ? "border-[#00ff41] bg-[rgba(0,255,65,0.05)]" : "border-[#ff0040] bg-[rgba(255,0,64,0.05)]"}`}
            >
                <div className="flex justify-between items-center">
                    <div>
                        <div className="text-[#ffb000] font-bold text-xs md:text-sm">
                            {hasLab
                                ? "✅ Лаборатория активна"
                                : "❌ Требуется лаборатория"}
                        </div>
                        <div className="text-xs text-[#888] mt-1">
                            {hasLab ? (
                                scientists.length > 0 ? (
                                    `👨‍🔬 Учёных: ${scientists.length}`
                                ) : (
                                    <span className="text-[#ff0040]">
                                        ⚠️ Нет учёных
                                    </span>
                                )
                            ) : (
                                <span className="text-[#ff0040]">
                                    Постройте модуль
                                </span>
                            )}
                        </div>
                    </div>
                    {research?.activeResearch && !isMobile && (
                        <div className="text-right hidden md:block">
                            <div className="text-[#00d4ff] font-bold text-xs">
                                🔬{" "}
                                {
                                    RESEARCH_TREE[
                                        research.activeResearch.techId
                                    ].name
                                }
                            </div>
                            <div className="text-[10px] text-[#888]">
                                {research.activeResearch.progress}% | Ходов:{" "}
                                {research.activeResearch.turnsRemaining}
                            </div>
                        </div>
                    )}
                </div>
                {/* Research points display */}
                {hasLab && (
                    <div className="mt-2 pt-2 border-t border-[#00ff41]">
                        <div className="text-xs text-[#888]">
                            🔬 Наука:{" "}
                            <span className="text-[#00d4ff] font-bold">
                                {(() => {
                                    const labs = ship.modules.filter(
                                        (m: Module) =>
                                            m.type === "lab" &&
                                            m.health > 0 &&
                                            !m.disabled,
                                    );
                                    let output = labs.reduce(
                                        (sum: number, m: Module) =>
                                            sum + (m.researchOutput || 0),
                                        0,
                                    );
                                    scientists.forEach((s) => {
                                        output += 5;
                                        if (s.assignment === "research") {
                                            output = Math.floor(output * 2);
                                        }
                                        output += s.level || 1;
                                    });
                                    return output;
                                })()}
                                /ход
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Research resources */}
            <div className="p-2 md:p-3 border border-[#9933ff] bg-[rgba(153,51,255,0.05)]">
                <div className="font-['Orbitron'] font-bold text-xs md:text-sm text-[#9933ff] mb-2">
                    ▸ РЕСУРСЫ
                </div>
                <div className="flex flex-wrap gap-1 md:gap-2">
                    {typedKeys(RESEARCH_RESOURCES).map((type) => {
                        const data = RESEARCH_RESOURCES[type];
                        const quantity = getResearchResourceQuantity(type);
                        return (
                            <div
                                key={type}
                                className="flex items-center gap-1 md:gap-2 px-2 py-1 rounded border text-xs"
                                style={{
                                    borderColor: data.color,
                                    backgroundColor: `${data.color}10`,
                                    color: data.color,
                                }}
                            >
                                <span>{data.icon}</span>
                                <span className="font-bold">{quantity}</span>
                                {!isMobile && (
                                    <span className="text-[#888] hidden md:inline">
                                        {data.name}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Tier selector */}
            <div className="flex gap-1 overflow-x-auto">
                {[1, 2, 3, 4].map((tier) => (
                    <Button
                        key={tier}
                        onClick={() => setSelectedTier(tier as ResearchTier)}
                        className={`flex-1 min-w-12.5 md:min-w-15 border-2 uppercase text-xs cursor-pointer ${
                            selectedTier === tier
                                ? "border-[#ffb000] bg-[#ffb000] text-[#050810]"
                                : "border-[#444] text-[#888] hover:border-[#ffb000]"
                        }`}
                    >
                        T{tier}
                    </Button>
                ))}
            </div>

            {/* Category filter */}
            <div className="flex gap-1 flex-wrap">
                <Button
                    onClick={() => setSelectedCategory("all")}
                    className={`min-w-12.5 md:min-w-17.5 border-2 text-xs cursor-pointer ${
                        selectedCategory === "all"
                            ? "border-white bg-white text-[#050810]"
                            : "border-[#333] text-[#666] hover:border-[#555]"
                    }`}
                >
                    Все
                </Button>
                {typedKeys(isMobile ? CATEGORY_ICONS : CATEGORY_NAMES).map(
                    (catId) => {
                        const label = isMobile
                            ? CATEGORY_ICONS[catId]
                            : CATEGORY_NAMES[catId];
                        const isActive = selectedCategory === catId;
                        return (
                            <Button
                                key={catId}
                                onClick={() => setSelectedCategory(catId)}
                                className={`min-w-8.75 md:min-w-15 border-2 text-xs cursor-pointer ${
                                    isActive
                                        ? "border-[#ffb000] bg-[#ffb000] text-[#050810]"
                                        : "border-[#333] text-[#666] hover:border-[#555]"
                                }`}
                                style={{
                                    borderColor: isActive
                                        ? CATEGORY_COLORS[catId]
                                        : undefined,
                                    color: isActive
                                        ? CATEGORY_COLORS[catId]
                                        : undefined,
                                }}
                            >
                                {label}
                            </Button>
                        );
                    },
                )}
            </div>

            {/* Technology tree */}
            <div
                className={`space-y-2 overflow-y-auto scrollbar-gutter-stable min-h-[30vh] ${selectedTechnology ? "max-h-[20vh] md:max-h-[25vh]" : "max-h-[30vh] md:max-h-[35vh]"}`}
            >
                {technologies.map((tech) => {
                    const isResearched = researchedTechs.includes(tech.id);
                    const isDiscovered =
                        discoveredTechs.includes(tech.id) || isResearched;
                    const isAvailable = canResearchTech(
                        tech.id,
                        researchedTechs,
                    );
                    const isActive =
                        research?.activeResearch?.techId === tech.id;

                    if (!isDiscovered) {
                        return (
                            <div
                                key={tech.id}
                                className="p-2 border border-[#333] bg-[rgba(0,0,0,0.3)] opacity-50"
                            >
                                <div className="text-[#444] text-xs">???</div>
                            </div>
                        );
                    }

                    return (
                        <div
                            key={tech.id}
                            className={`p-2 border cursor-pointer transition-all ${
                                isActive
                                    ? "border-[#00ff41] bg-[rgba(0,255,65,0.1)]"
                                    : isResearched
                                      ? "border-[#00ff41] bg-[rgba(0,255,65,0.05)]"
                                      : isAvailable
                                        ? "border-[#ffb000] bg-[rgba(255,176,0,0.05)]"
                                        : "border-[#333] bg-[rgba(0,0,0,0.3)]"
                            }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTech(
                                    selectedTech === tech.id ? null : tech.id,
                                );
                            }}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">{tech.icon}</span>
                                    <div>
                                        <div
                                            className="font-bold text-xs md:text-sm"
                                            style={{
                                                color: CATEGORY_COLORS[
                                                    tech.category
                                                ],
                                            }}
                                        >
                                            {tech.name}
                                        </div>
                                        <div className="text-[10px] text-[#888]">
                                            {isResearched ? (
                                                <span className="text-[#00ff41]">
                                                    ✅
                                                </span>
                                            ) : isActive ? (
                                                <span className="text-[#00d4ff]">
                                                    🔬
                                                </span>
                                            ) : isAvailable ? (
                                                <span className="text-[#ffb000]">
                                                    Доступно
                                                </span>
                                            ) : (
                                                <span className="text-[#444]">
                                                    🔒
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right text-[10px]">
                                    <div className="text-[#ffb000]">
                                        {tech.credits}₢
                                    </div>
                                    <div className="text-[#888]">
                                        {calculateEstimatedTurns()} ход.
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Selected tech details */}
            {selectedTechnology && (
                <div className="border border-[#ffb000] bg-[rgba(255,176,0,0.05)] p-2 md:p-3 relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTech(null);
                        }}
                        className="absolute top-1 right-2 text-[#ffb000] hover:text-[#00ff41] text-lg cursor-pointer"
                        aria-label="Закрыть"
                    >
                        ✕
                    </button>
                    <div className="flex items-center gap-2 mb-2 pr-6">
                        <span className="text-2xl md:text-3xl">
                            {selectedTechnology.icon}
                        </span>
                        <div
                            className="font-['Orbitron'] font-bold text-xs md:text-sm"
                            style={{
                                color: CATEGORY_COLORS[
                                    selectedTechnology.category
                                ],
                            }}
                        >
                            {selectedTechnology.name}
                        </div>
                    </div>
                    <div className="text-xs text-[#888] mb-2">
                        {selectedTechnology.description}
                    </div>

                    {/* Requirements */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div>
                            <div className="text-[#ffb000] font-bold mb-1">
                                ▸ Требования:
                            </div>
                            <div className="text-[#888]">
                                {selectedTechnology.prerequisites.length > 0 ? (
                                    <ul className="list-disc list-inside text-[10px]">
                                        {selectedTechnology.prerequisites.map(
                                            (prereq: string) => (
                                                <li
                                                    key={prereq}
                                                    className={
                                                        researchedTechs.includes(
                                                            prereq,
                                                        )
                                                            ? "text-[#00ff41]"
                                                            : "text-[#ff0040]"
                                                    }
                                                >
                                                    {RESEARCH_TREE[prereq].name}
                                                </li>
                                            ),
                                        )}
                                    </ul>
                                ) : (
                                    <span className="text-[#888]">Нет</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="text-[#ffb000] font-bold mb-1">
                                ▸ Ресурсы:
                            </div>
                            <div className="text-[#888]">
                                {typedKeys(selectedTechnology.resources)
                                    .length > 0 ? (
                                    <ul className="list-disc list-inside text-[10px]">
                                        {typedKeys(
                                            selectedTechnology.resources,
                                        ).map((type) => {
                                            const qty =
                                                selectedTechnology.resources[
                                                    type
                                                ] ?? 0;
                                            const owned =
                                                getResearchResourceQuantity(
                                                    type,
                                                );
                                            const resourceData =
                                                RESEARCH_RESOURCES[type];
                                            return (
                                                <li
                                                    key={type}
                                                    className={
                                                        owned >= qty
                                                            ? "text-[#00ff41]"
                                                            : "text-[#ff0040]"
                                                    }
                                                >
                                                    {resourceData.icon} {owned}/
                                                    {qty}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <span className="text-[#888]">Нет</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bonuses */}
                    <div className="mb-2">
                        <div className="text-[#ffb000] font-bold text-xs mb-1">
                            ▸ Бонусы:
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {selectedTechnology.bonuses.map(
                                (
                                    bonus: { description: string },
                                    idx: number,
                                ) => (
                                    <div
                                        key={idx}
                                        className="px-1 py-0.5 rounded border border-[#00ff41] text-[10px] text-[#00ff41]"
                                    >
                                        {bonus.description}
                                    </div>
                                ),
                            )}
                        </div>
                    </div>

                    {/* Action button */}
                    {researchedTechs.includes(selectedTechnology.id) ? (
                        <Button
                            disabled
                            className="w-full border-2 uppercase text-xs border-[#444] text-[#444] cursor-not-allowed"
                        >
                            ✅ ИЗУЧЕНО
                        </Button>
                    ) : research?.activeResearch?.techId ===
                      selectedTechnology.id ? (
                        <div className="text-[#00d4ff] text-center font-bold text-xs py-1">
                            🔬 {research.activeResearch.progress}%
                        </div>
                    ) : (
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                startResearch(selectedTechnology.id);
                            }}
                            disabled={
                                !canResearchTech(
                                    selectedTechnology.id,
                                    researchedTechs,
                                ) ||
                                !hasResources(selectedTechnology) ||
                                credits < selectedTechnology.credits ||
                                !canResearch
                            }
                            className={`w-full border-2 uppercase text-xs ${
                                !canResearch
                                    ? "border-[#444] text-[#444] cursor-not-allowed"
                                    : !hasResources(selectedTechnology) ||
                                        credits < selectedTechnology.credits
                                      ? "border-[#ff0040] text-[#ff0040] cursor-not-allowed"
                                      : "border-[#00ff41] text-[#00ff41]"
                            }`}
                        >
                            {!canResearch
                                ? "Нет лабораторий/учёного"
                                : !hasResources(selectedTechnology)
                                  ? "Нет ресурсов"
                                  : credits < selectedTechnology.credits
                                    ? "Нет кредитов"
                                    : `НАЧАТЬ (${calculateEstimatedTurns()} ход.)`}
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}

export function ResearchPanel() {
    const research = useGameStore((s) => s.research);
    const credits = useGameStore((s) => s.credits);
    const crew = useGameStore((s) => s.crew);
    const ship = useGameStore((s) => s.ship);

    const startResearch = useGameStore((s) => s.startResearch);

    const [selectedTier, setSelectedTier] = useState<ResearchTier>(1);
    const [selectedTech, setSelectedTech] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<
        ResearchCategory | "all"
    >("all");

    const scientists = crew.filter((c) => c.profession === "scientist");
    const hasLab = ship.modules.some(
        (m) => m.type === "lab" && m.health > 0 && !m.disabled,
    );
    const canResearch = hasLab && scientists.length > 0;

    const getResearchResourceQuantity = (type: string): number => {
        if (type === "rare_minerals") {
            const tradeGood = ship.tradeGoods.find(
                (tg) => tg.item === "rare_minerals",
            );
            return tradeGood?.quantity || 0;
        }
        const researchResource =
            research?.resources[type as keyof typeof research.resources];
        if (researchResource) {
            return researchResource;
        }
        return 0;
    };

    const hasResources = (tech: Technology): boolean => {
        for (const resourceType of typedKeys(tech.resources)) {
            const required = tech.resources[resourceType];
            const available = getResearchResourceQuantity(resourceType);
            if (required === undefined || available < required) return false;
        }
        return true;
    };

    const calculateEstimatedTurns = (): number => {
        if (!canResearch) return 999;
        const labs = ship.modules.filter(
            (m: Module) => m.type === "lab" && m.health > 0 && !m.disabled,
        );
        let output = labs.reduce(
            (sum: number, m: Module) => sum + (m.researchOutput || 0),
            0,
        );
        scientists.forEach((scientist) => {
            output += 5;
            if (scientist.assignment === "research") {
                output = Math.floor(output * 2);
            }
            output += scientist.level || 1;
        });
        return output > 0 ? Math.ceil(100 / output) : 999;
    };

    const selectedTechnology = selectedTech
        ? RESEARCH_TREE[selectedTech]
        : null;
    const researchedTechs = research?.researchedTechs || [];

    const researchProps = {
        research,
        credits,
        ship,
        scientists,
        hasLab,
        canResearch,
        selectedTier,
        setSelectedTier,
        selectedCategory,
        setSelectedCategory,
        selectedTech,
        setSelectedTech,
        researchedTechs,
        getResearchResourceQuantity,
        hasResources,
        calculateEstimatedTurns,
        selectedTechnology,
        startResearch,
    };

    return (
        <div className="h-full overflow-hidden">
            <ResearchContent {...researchProps} />
        </div>
    );
}
