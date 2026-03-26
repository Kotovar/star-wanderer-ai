"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { useGameStore } from "@/game/store";
import {
    RESEARCH_TREE,
    RESEARCH_RESOURCES,
    RACES,
    canResearchTech,
} from "@/game/constants";
import { AUGMENTATIONS } from "@/game/constants/augmentations";
import { LAB_MODULE_TYPES } from "@/game/constants/modules";
import { getTaskBonusMultiplier } from "@/game/slices/gameLoop/processors/crewAssignments/constants";
import type {
    ResearchCategory,
    Module,
    CrewMember,
    TechnologyId,
    Technology,
    TradeGood,
} from "@/game/types";
import { typedKeys } from "@/lib/utils";
import { useTranslation, store } from "@/lib/useTranslation";
import { getTechTranslation } from "@/lib/techTranslations";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

// ─── Layout constants ──────────────────────────────────────────────────────────
const NODE_W = 162;
const NODE_H = 84;
const COL_GAP = 204;
const ROW_GAP = 96;
const PAD_X = 90;
const PAD_Y = 50;

const TREE_LAYOUT: Record<TechnologyId, [number, number]> = {
    // T1 — col 0
    reinforced_hull: [0, 0],
    efficient_reactor: [0, 2.2],
    ion_cannon: [0, 3.4], // no prereqs → plasma_weapons
    targeting_matrix: [0, 4.5],
    scanner_mk2: [0, 5.75],
    artifact_study: [0, 8],
    automated_repair: [0, 9.5], // shifted +2 to make room for artifact branch
    medbay_upgrade: [0, 11.5],
    xenobiology: [1, 12.5],
    // T2 — col 1
    shield_booster: [1, 0],
    ion_drive: [1, 2.2],
    plasma_weapons: [1, 3.4],
    combat_drones: [1, 4.5],
    quantum_scanner: [1, 6.8],
    lab_network: [1, 5.75],
    relic_chamber: [1, 8],
    cargo_expansion: [1, 10.5],
    crew_training: [1, 11.5],
    // T3 — col 2
    phase_shield: [2, 0],
    storm_shields: [2, 1.1], // shield_booster → storm_shields
    singularity_reactor: [2, 2.2],
    antimatter_weapons: [2, 3.4],
    quantum_torpedo: [2, 4.5],
    atmospheric_analysis: [2, 5.75], // lab_network + quantum_scanner → here
    deep_scan: [2, 6.8],
    ancient_resonance: [2, 8],
    nanite_hull: [2, 9.5],
    planetary_drill: [2, 10.5], // cargo_expansion → here
    neural_interface: [2, 11.5],
    genetic_enhancement: [2, 12.5],

    // T4 — col 3

    void_resonance: [3, 1.1],
    modular_arsenal: [3, 4], // antimatter_weapons + quantum_torpedo → here
    artifact_mastery: [3, 8],
    stellar_genetics: [3, 11.5],
    cybernetic_augmentation: [3, 12.5],
    // T5 — col 4 / 5
    ancient_power: [4, 2.2],
    warp_drive: [4, 3.4],
};

const CANVAS_W = Math.ceil(PAD_X + 5.5 * COL_GAP + NODE_W / 2 + PAD_X);
const CANVAS_H = Math.ceil(PAD_Y + 13.5 * ROW_GAP + NODE_H / 2 + PAD_Y);

// ─── Category colors ───────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<ResearchCategory, string> = {
    ship_systems: "#00d4ff",
    weapons: "#ff0040",
    science: "#9933ff",
    engineering: "#ffb000",
    biology: "#00ff41",
    ancient_tech: "#ffd700",
    artifacts: "#ff6600",
};

// ─── Edge helpers ─────────────────────────────────────────────────────────────
function getNodeCenter(id: TechnologyId): [number, number] {
    const [col, row] = TREE_LAYOUT[id];
    return [PAD_X + col * COL_GAP, PAD_Y + row * ROW_GAP];
}

function buildEdgePath(from: TechnologyId, to: TechnologyId): string {
    const [fx, fy] = getNodeCenter(from);
    const [tx, ty] = getNodeCenter(to);
    const sx = fx + NODE_W / 2;
    const ex = tx - NODE_W / 2;
    const mid = (sx + ex) / 2;
    return `M ${sx} ${fy} C ${mid} ${fy}, ${mid} ${ty}, ${ex} ${ty}`;
}

interface EdgeInfo {
    path: string;
    fromId: TechnologyId;
    toId: TechnologyId;
}

function buildAllEdges(): EdgeInfo[] {
    const edges: EdgeInfo[] = [];
    for (const tech of Object.values(RESEARCH_TREE)) {
        for (const prereqId of tech.prerequisites) {
            edges.push({
                path: buildEdgePath(prereqId, tech.id),
                fromId: prereqId,
                toId: tech.id,
            });
        }
    }
    return edges;
}

const ALL_EDGES = buildAllEdges();

// ─── Tech Node ────────────────────────────────────────────────────────────────
interface TechNodeProps {
    tech: Technology;
    isResearched: boolean;
    isDiscovered: boolean;
    isOpened: boolean; // Требования выполнены, но не хватает ресурсов/условий
    isReady: boolean; // Всё готово для начала исследования
    isActive: boolean;
    isSelected: boolean;
    activeProgress: number;
    canResearch: boolean; // Есть лаборатория и учёный
    lang: "ru" | "en";
    onClick: () => void;
}

function TechNode({
    tech,
    isResearched,
    isDiscovered,
    isOpened,
    isReady,
    isActive,
    isSelected,
    activeProgress,
    canResearch,
    lang,
    onClick,
}: TechNodeProps) {
    const [cx, cy] = getNodeCenter(tech.id);
    const catColor = CATEGORY_COLORS[tech.category];
    const t = (key: string) => store.t(key);

    // Бордер всегда цвет категории; для неизвестных — тёмный
    const borderColor = isDiscovered || isOpened ? catColor : "#2a2a2a";

    let bgColor = "rgba(0,0,0,0.6)";
    let textOpacity = "opacity-40";
    let glowStyle = "";

    if (isResearched) {
        bgColor = `${catColor}14`; // ~8% opacity tint
        textOpacity = "opacity-100";
        glowStyle = `0 0 8px ${catColor}66`;
    } else if (isActive) {
        bgColor = "rgba(0,212,255,0.10)";
        textOpacity = "opacity-100";
        glowStyle = "0 0 12px rgba(0,212,255,0.5)";
    } else if (isReady) {
        bgColor = `${catColor}0d`; // ~5% opacity tint
        textOpacity = "opacity-100";
    } else if (isOpened) {
        bgColor = "rgba(0,0,0,0.5)";
        textOpacity = "opacity-100";
    } else if (isDiscovered) {
        bgColor = "rgba(0,0,0,0.5)";
        textOpacity = "opacity-60";
    }

    if (isSelected) {
        glowStyle = `0 0 0 2px ${catColor}${glowStyle ? `, ${glowStyle}` : ""}`;
    }

    const translation = getTechTranslation(tech.id, lang);

    // Нельзя кликнуть по неизведанным технологиям
    const canClick = isDiscovered || isOpened || isReady || isActive;

    return (
        <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
                if (canClick) {
                    e.stopPropagation();
                    onClick();
                }
            }}
            style={{
                position: "absolute",
                left: cx - NODE_W / 2,
                top: cy - NODE_H / 2,
                width: NODE_W,
                height: NODE_H,
                borderColor,
                backgroundColor: bgColor,
                boxShadow: glowStyle || undefined,
                cursor: canClick ? "pointer" : "not-allowed",
            }}
            className="border transition-all duration-200 select-none"
        >
            <div
                className={`flex items-start h-full px-2 pt-2 pb-1 gap-1.5 ${textOpacity}`}
            >
                <span className="text-xl shrink-0 leading-none mt-0.5">
                    {isDiscovered ? tech.icon : "❓"}
                </span>
                <div className="flex-1 min-w-0">
                    <div
                        className="text-[11px] font-bold leading-tight"
                        style={{ color: isDiscovered ? catColor : "#444" }}
                    >
                        {isDiscovered ? translation.name : "???"}
                    </div>
                    <div
                        className="text-[9px] mt-0.5 leading-snug overflow-hidden"
                        style={{
                            color: "#666",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                        }}
                    >
                        {isDiscovered ? translation.description : ""}
                    </div>
                    {isActive ? (
                        <div className="mt-0.5 h-1 bg-[#1a3a40] rounded overflow-hidden">
                            <div
                                className="h-full bg-[#00d4ff] rounded transition-all"
                                style={{ width: `${activeProgress}%` }}
                            />
                        </div>
                    ) : (
                        <div
                            className="text-[9px] mt-0.5"
                            style={{ color: "#555" }}
                        >
                            {isResearched ? (
                                <span style={{ color: "#00ff41" }}>
                                    {t("research.tech_status.researched")}
                                </span>
                            ) : isReady ? (
                                <span style={{ color: "#00ff41" }}>
                                    {t("research.tech_status.ready")}
                                </span>
                            ) : isOpened ? (
                                <span style={{ color: "#ffb000" }}>
                                    {canResearch
                                        ? t("research.tech_status.opened")
                                        : t("research.tech_status.no_lab")}
                                </span>
                            ) : isDiscovered ? (
                                <span style={{ color: "#ff4444" }}>
                                    {t("research.tech_status.blocked")}
                                </span>
                            ) : (
                                <span style={{ color: "#444" }}>
                                    {t("research.tech_status.unknown")}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Pan/Zoom canvas ──────────────────────────────────────────────────────────
function PanZoomCanvas({ children }: { children: React.ReactNode }) {
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(0.8);
    const dragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        dragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
    }, []);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        if (!dragging.current) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        lastPos.current = { x: e.clientX, y: e.clientY };
        setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    }, []);

    const stopDrag = useCallback(() => {
        dragging.current = false;
    }, []);

    const onWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom((z) => Math.max(0.25, Math.min(2, z * factor)));
    }, []);

    return (
        <div
            className="flex-1 overflow-hidden min-h-0 bg-[#030608] cursor-grab active:cursor-grabbing"
            style={{ userSelect: "none" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
            onWheel={onWheel}
        >
            <div
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: "0 0",
                }}
            >
                {children}
            </div>
        </div>
    );
}

// ─── SVG + nodes canvas ───────────────────────────────────────────────────────
interface TechCanvasProps {
    researchedTechs: TechnologyId[];
    discoveredTechs: string[];
    activeResearch: { techId: TechnologyId; progress: number } | null;
    selectedTech: TechnologyId | null;
    onSelectTech: (id: TechnologyId) => void;
    lang: "ru" | "en";
    canStartResearch: (tech: Technology) => boolean;
    canResearch: boolean;
}

function TechCanvas({
    researchedTechs,
    discoveredTechs,
    activeResearch,
    selectedTech,
    onSelectTech,
    lang,
    canStartResearch,
    canResearch,
}: TechCanvasProps) {
    const TIER_LABELS = [
        "T1 — Базовые",
        "T2 — Продвинутые",
        "T3 — Элитные",
        "T4 — Древние",
        "T5 — Предтечи",
    ];
    const TIER_COLS = [0, 1, 2, 3, 4] as const;
    const TIER_COLORS = ["#00ff41", "#ffb000", "#9933ff", "#ffd700", "#ff6600"];

    return (
        <div
            style={{ position: "relative", width: CANVAS_W, height: CANVAS_H }}
        >
            {TIER_COLS.map((col, i) => (
                <div
                    key={col}
                    style={{
                        position: "absolute",
                        left: PAD_X + col * COL_GAP - NODE_W / 2,
                        top: -20,
                        width: NODE_W,
                        textAlign: "center",
                        color: TIER_COLORS[i],
                        fontSize: 10,
                        fontFamily: "Orbitron, monospace",
                        letterSpacing: "0.05em",
                        opacity: 0.6,
                    }}
                >
                    {TIER_LABELS[i]}
                </div>
            ))}

            <svg
                style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                }}
                width={CANVAS_W}
                height={CANVAS_H}
            >
                {ALL_EDGES.map(({ path, fromId, toId }) => {
                    const fromResearched = researchedTechs.includes(fromId);
                    const toActive = activeResearch?.techId === toId;
                    const color = fromResearched
                        ? "#00ff4166"
                        : toActive
                          ? "#00d4ff55"
                          : "#252525";
                    return (
                        <path
                            key={`${fromId}->${toId}`}
                            d={path}
                            stroke={color}
                            strokeWidth={fromResearched ? 2 : 1.5}
                            fill="none"
                            strokeDasharray={fromResearched ? undefined : "4 3"}
                        />
                    );
                })}
            </svg>

            {(Object.values(RESEARCH_TREE) as Technology[]).map((tech) => {
                const isResearched = researchedTechs.includes(tech.id);
                const isDiscovered =
                    discoveredTechs.includes(tech.id) || isResearched;
                // Требования (предварительные технологии) выполнены
                const prereqsMet = canResearchTech(tech.id, researchedTechs);
                const isActive = activeResearch?.techId === tech.id;
                const isSelected = selectedTech === tech.id;
                const activeProgress = isActive
                    ? Math.round(
                          (activeResearch.progress / tech.scienceCost) * 100,
                      )
                    : 0;

                // Технология открыта (требования выполнены), но может не хватать условий
                const isOpened = prereqsMet && !isResearched;
                // Технология готова к исследованию (все условия выполнены)
                const isReady =
                    prereqsMet && !isResearched && canStartResearch(tech);

                return (
                    <TechNode
                        key={tech.id}
                        tech={tech}
                        isResearched={isResearched}
                        isDiscovered={isDiscovered}
                        isOpened={isOpened}
                        isReady={isReady}
                        isActive={isActive}
                        isSelected={isSelected}
                        activeProgress={activeProgress}
                        canResearch={canResearch}
                        lang={lang}
                        onClick={() => onSelectTech(tech.id)}
                    />
                );
            })}
        </div>
    );
}

// ─── Tech detail modal ────────────────────────────────────────────────────────
interface TechModalProps {
    tech: Technology | null;
    researchedTechs: TechnologyId[];
    getResourceQty: (type: string) => number;
    credits: number;
    canResearch: boolean;
    activeResearchId: TechnologyId | null;
    activeProgress: number;
    onStart: (id: TechnologyId) => void;
    onClose: () => void;
    lang: "ru" | "en";
}

function TechModal({
    tech,
    researchedTechs,
    getResourceQty,
    credits,
    canResearch,
    activeResearchId,
    activeProgress,
    onStart,
    onClose,
    lang,
}: TechModalProps) {
    if (!tech) return null;

    const translation = getTechTranslation(tech.id, lang);
    const catColor = CATEGORY_COLORS[tech.category];
    const isResearched = researchedTechs.includes(tech.id);
    const isActive = activeResearchId === tech.id;
    const prereqsMet = canResearchTech(tech.id, researchedTechs);
    const canStart = canResearch && prereqsMet && !isResearched && !isActive;

    const hasAllResources = typedKeys(tech.resources).every(
        (type) => getResourceQty(type) >= (tech.resources[type] ?? 0),
    );
    const hasCredits = credits >= tech.credits;

    return (
        <Dialog open={!!tech} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                showCloseButton={false}
                className="max-w-xl p-0 border gap-0"
                style={{
                    backgroundColor: "#060d10",
                    borderColor: catColor + "55",
                    boxShadow: `0 0 32px ${catColor}22`,
                }}
            >
                <DialogTitle className="sr-only">
                    {translation.name}
                </DialogTitle>

                {/* Header */}
                <div
                    className="flex items-start gap-3 p-4 border-b"
                    style={{ borderColor: catColor + "33" }}
                >
                    <span className="text-4xl leading-none mt-0.5">
                        {tech.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                        <div
                            className="font-['Orbitron'] font-bold text-base leading-tight"
                            style={{ color: catColor }}
                        >
                            {translation.name}
                        </div>
                        <div className="text-xs text-[#666] mt-0.5">
                            Тир {tech.tier} · {tech.category.replace("_", " ")}
                        </div>
                        <div className="text-[11px] text-[#888] mt-1.5 leading-snug">
                            {translation.description}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[#555] hover:text-[#aaa] text-lg leading-none cursor-pointer shrink-0"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div
                    className="grid grid-cols-3 gap-0 divide-x"
                    style={{ borderColor: "#1a1a1a" }}
                >
                    {/* Prerequisites */}
                    <div className="p-4">
                        <div className="text-[#ffb000] font-bold mb-2 text-[10px] uppercase tracking-wider">
                            Требования
                        </div>
                        {tech.prerequisites.length === 0 ? (
                            <div className="text-[#555] text-xs">Нет</div>
                        ) : (
                            tech.prerequisites.map((prereq) => {
                                const done = researchedTechs.includes(prereq);
                                return (
                                    <div
                                        key={prereq}
                                        className="flex items-start gap-1.5 mb-1 text-xs"
                                        style={{
                                            color: done ? "#00ff41" : "#ff0040",
                                        }}
                                    >
                                        <span className="shrink-0 mt-px">
                                            {done ? "✓" : "✗"}
                                        </span>
                                        <span className="leading-tight">
                                            {
                                                getTechTranslation(prereq, lang)
                                                    .name
                                            }
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Resources */}
                    <div className="p-4" style={{ borderColor: "#1a1a1a" }}>
                        <div className="text-[#ffb000] font-bold mb-2 text-[10px] uppercase tracking-wider">
                            Ресурсы
                        </div>
                        {typedKeys(tech.resources).map((type) => {
                            const need = tech.resources[type] ?? 0;
                            const have = getResourceQty(type);
                            const ok = have >= need;
                            const res = RESEARCH_RESOURCES[type];
                            return (
                                <div
                                    key={type}
                                    className="flex items-center gap-1.5 mb-1 text-xs"
                                    style={{
                                        color: ok ? "#00ff41" : "#ff4466",
                                    }}
                                >
                                    <span>{res.icon}</span>
                                    <span className="flex-1 text-[#888]">
                                        {res.name}
                                    </span>
                                    <span className="font-bold">
                                        {have}/{need}
                                    </span>
                                </div>
                            );
                        })}
                        <div
                            className="flex items-center gap-1.5 mt-1.5 text-xs"
                            style={{
                                color: hasCredits ? "#00ff41" : "#ff4466",
                            }}
                        >
                            <span>₢</span>
                            <span className="flex-1 text-[#888]">Кредиты</span>
                            <span className="font-bold">
                                {credits}/{tech.credits}
                            </span>
                        </div>
                    </div>

                    {/* Bonuses */}
                    <div className="p-4" style={{ borderColor: "#1a1a1a" }}>
                        <div className="text-[#ffb000] font-bold mb-2 text-[10px] uppercase tracking-wider">
                            Эффекты
                        </div>
                        {tech.bonuses.map((b, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-1 mb-1 text-xs leading-tight"
                                style={{ color: "#00ff41" }}
                            >
                                <span className="shrink-0 mt-px">▸</span>
                                <span>{b.description}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action footer */}
                <div
                    className="p-4 border-t"
                    style={{ borderColor: catColor + "33" }}
                >
                    {isResearched ? (
                        <div
                            className="text-center text-xs py-2 border"
                            style={{
                                color: "#00ff41",
                                borderColor: "#00ff4133",
                            }}
                        >
                            ✓ Технология изучена
                        </div>
                    ) : isActive ? (
                        <div>
                            <div className="text-[#00d4ff] text-xs font-bold mb-1.5 text-center">
                                🔬 Исследование: {activeProgress}%
                            </div>
                            <div className="h-2 bg-[#0a1a20] rounded overflow-hidden">
                                <div
                                    className="h-full bg-[#00d4ff] rounded transition-all"
                                    style={{ width: `${activeProgress}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() =>
                                canStart &&
                                hasAllResources &&
                                hasCredits &&
                                onStart(tech.id)
                            }
                            disabled={
                                !canStart || !hasAllResources || !hasCredits
                            }
                            className="w-full border text-xs py-2 uppercase tracking-widest font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
                            style={
                                canStart && hasAllResources && hasCredits
                                    ? {
                                          borderColor: "#00ff41",
                                          color: "#00ff41",
                                          backgroundColor:
                                              "rgba(0,255,65,0.05)",
                                      }
                                    : {
                                          borderColor: "#333",
                                          color: "#444",
                                      }
                            }
                        >
                            {!canResearch
                                ? "Нужна лаборатория и учёный"
                                : !prereqsMet
                                  ? "Не выполнены требования"
                                  : !hasAllResources
                                    ? "Недостаточно ресурсов"
                                    : !hasCredits
                                      ? "Недостаточно кредитов"
                                      : "▶ Начать исследование"}
                        </button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function ResearchPanel() {
    const research = useGameStore((s) => s.research);
    const credits = useGameStore((s) => s.credits);
    const crew = useGameStore((s) => s.crew);
    const ship = useGameStore((s) => s.ship);
    const startResearch = useGameStore((s) => s.startResearch);
    const { t, currentLanguage } = useTranslation();

    const [selectedTech, setSelectedTech] = useState<TechnologyId | null>(null);

    const scientists = useMemo(
        () => crew.filter((c: CrewMember) => c.profession === "scientist"),
        [crew],
    );
    const hasLab = useMemo(
        () =>
            ship.modules.some(
                (m: Module) =>
                    LAB_MODULE_TYPES.includes(m.type) &&
                    m.health > 0 &&
                    !m.disabled &&
                    !m.manualDisabled,
            ),
        [ship],
    );
    const canResearch = hasLab && scientists.length > 0;

    const getResourceQty = useCallback(
        (type: string): number => {
            let qty =
                research?.resources[
                    type as keyof typeof research.resources
                ] ?? 0;
            if (type === "rare_minerals") {
                const tg = (ship.tradeGoods as TradeGood[]).find(
                    (g) => g.item === "rare_minerals",
                );
                qty += tg?.quantity ?? 0;
            }
            return qty;
        },
        [research, ship],
    );

    const researchedTechs = useMemo(
        () => research?.researchedTechs ?? [],
        [research],
    );
    const discoveredTechs = research?.discoveredTechs ?? [];
    const activeResearch = research?.activeResearch ?? null;

    const canStartResearch = useCallback(
        (tech: Technology): boolean => {
            if (!canResearch) return false;
            if (credits < tech.credits) return false;
            for (const [type, needed] of Object.entries(tech.resources)) {
                if (getResourceQty(type) < (needed ?? 0)) return false;
            }
            return true;
        },
        [canResearch, credits, getResourceQty],
    );

    const sciencePerTurn = useMemo(() => {
        const labs = ship.modules.filter(
            (m: Module) =>
                LAB_MODULE_TYPES.includes(m.type) &&
                m.health > 0 &&
                !m.disabled &&
                !m.manualDisabled,
        );
        const labOutput = labs.reduce(
            (s: number, m: Module) => s + (m.researchOutput ?? 0),
            0,
        );

        let scientistBonus = 0;
        const cappedScientists = [...scientists]
            .sort((a: CrewMember, b: CrewMember) => {
                if (
                    (a.assignment === "research") !==
                    (b.assignment === "research")
                )
                    return a.assignment === "research" ? -1 : 1;
                return (b.level ?? 1) - (a.level ?? 1);
            })
            .slice(0, labs.length);
        cappedScientists.forEach((s: CrewMember) => {
            let scientistContribution = 5 + (s.level ?? 1);
            if (s.assignment === "research") {
                scientistContribution *= 2;
            }
            const raceScienceBonus = RACES[s.race]?.crewBonuses?.science || 0;
            if (raceScienceBonus > 0) {
                scientistContribution = Math.floor(
                    scientistContribution * (1 + raceScienceBonus),
                );
            }
            scientistContribution = Math.floor(
                scientistContribution * getTaskBonusMultiplier(s),
            );
            scientistBonus += scientistContribution;
        });

        const techSpeedBonus = researchedTechs.reduce((sum, techId) => {
            const tech = RESEARCH_TREE[techId];
            return (
                sum +
                tech.bonuses
                    .filter((b) => b.type === "research_speed")
                    .reduce((s, b) => s + b.value, 0)
            );
        }, 0);

        let totalOutput = labOutput + scientistBonus;
        if (techSpeedBonus > 0) {
            totalOutput += Math.floor(totalOutput * techSpeedBonus);
        }

        cappedScientists.forEach((s: CrewMember) => {
            if (s.augmentation) {
                const augEffect = AUGMENTATIONS[s.augmentation]?.effect;
                if (augEffect?.researchSpeedBonus) {
                    totalOutput += Math.floor(
                        totalOutput * augEffect.researchSpeedBonus,
                    );
                }
            }
        });

        return totalOutput;
    }, [ship, scientists, researchedTechs]);

    const selectedTechnology = selectedTech
        ? RESEARCH_TREE[selectedTech]
        : null;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* ── Header ── */}
            <div className="shrink-0 p-2 border-b border-[#1a1a1a] space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <div
                        className={`text-xs font-bold px-2 py-1 border ${
                            canResearch
                                ? "border-[#00ff41] text-[#00ff41] bg-[rgba(0,255,65,0.05)]"
                                : hasLab
                                  ? "border-[#ffb000] text-[#ffb000] bg-[rgba(255,176,0,0.05)]"
                                  : "border-[#ff0040] text-[#ff0040] bg-[rgba(255,0,64,0.05)]"
                        }`}
                    >
                        {hasLab
                            ? scientists.length > 0
                                ? t("research.lab_status", {
                                      count: scientists.length,
                                      science: sciencePerTurn,
                                  })
                                : t("research.no_scientists")
                            : t("research.lab_required")}
                    </div>
                    {activeResearch && (
                        <div className="text-[10px] text-[#00d4ff] text-right">
                            <div className="font-bold">
                                {
                                    getTechTranslation(
                                        activeResearch.techId,
                                        currentLanguage,
                                    ).name
                                }
                            </div>
                            <div className="text-[#555]">
                                {Math.round(
                                    (activeResearch.progress /
                                        (RESEARCH_TREE[activeResearch.techId]
                                            ?.scienceCost || 1)) *
                                        100,
                                )}
                                % · {activeResearch.turnsRemaining} ходов
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-1">
                    {typedKeys(RESEARCH_RESOURCES).map((type) => {
                        const res = RESEARCH_RESOURCES[type];
                        const qty = getResourceQty(type);
                        return (
                            <div
                                key={type}
                                className="flex items-center gap-1 px-1.5 py-0.5 border text-[10px]"
                                style={{
                                    borderColor: res.color + "66",
                                    backgroundColor: res.color + "10",
                                    color: qty > 0 ? res.color : "#444",
                                }}
                                title={res.name}
                            >
                                <span>{res.icon}</span>
                                <span className="font-bold">{qty}</span>
                            </div>
                        );
                    })}
                    <div className="flex items-center gap-1 px-1.5 py-0.5 border border-[#ffb00066] bg-[#ffb00010] text-[10px] text-[#ffb000]">
                        <span>₢</span>
                        <span className="font-bold">{credits}</span>
                    </div>
                    <div className="flex items-center gap-1 px-1.5 py-0.5 border border-[#33333366] bg-[#33333310] text-[10px] text-[#555]">
                        <span>🖱 перетащи / колесо мыши = масштаб</span>
                    </div>
                </div>
            </div>

            {/* ── Pan/Zoom tree ── */}
            <PanZoomCanvas>
                <TechCanvas
                    researchedTechs={researchedTechs}
                    discoveredTechs={discoveredTechs}
                    activeResearch={activeResearch}
                    selectedTech={selectedTech}
                    onSelectTech={(id) =>
                        setSelectedTech(selectedTech === id ? null : id)
                    }
                    lang={currentLanguage}
                    canStartResearch={canStartResearch}
                    canResearch={canResearch}
                />
            </PanZoomCanvas>

            {/* ── Tech detail modal ── */}
            <TechModal
                tech={selectedTechnology}
                researchedTechs={researchedTechs}
                getResourceQty={getResourceQty}
                credits={credits}
                canResearch={canResearch}
                activeResearchId={activeResearch?.techId ?? null}
                activeProgress={activeResearch?.progress ?? 0}
                onStart={(id) => {
                    startResearch(id);
                    setSelectedTech(null);
                }}
                onClose={() => setSelectedTech(null)}
                lang={currentLanguage}
            />
        </div>
    );
}
