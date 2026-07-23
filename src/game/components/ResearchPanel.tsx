"use client";

import { calculateResearchOutput } from "@/game/slices/research/helpers/researchHelpers";
import { showHintOnce } from "@/game/hints/showHint";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useGameStore } from "@/game/store";
import {
  RESEARCH_TREE,
  RESEARCH_RESOURCES,
  canResearchTech,
} from "@/game/constants";
import { LAB_MODULE_TYPES } from "@/game/constants/modules";
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
import { Button } from "@/components/ui/button";
import { TechIcon } from "./TechIcon";

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
  // T2 — col 1
  shield_booster: [1, 0],
  ion_drive: [1, 2.2],
  plasma_weapons: [1, 3.4],
  combat_drones: [1, 4.5],
  quantum_scanner: [1, 6.8],
  lab_network: [1, 5.75],
  relic_chamber: [1, 8],
  expedition_kits: [1, 9.5], // atmospheric_analysis → here
  cargo_expansion: [1, 10.5],
  crew_training: [1, 11.5],
  xenobiology: [1, 12.5],
  bio_membrane_shield: [1, 13.5],
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

const CATEGORY_META: Record<
  ResearchCategory,
  { title: string; short: string; description: string }
> = {
  ship_systems: {
    title: "Корабельный контур",
    short: "Корпус",
    description: "живучесть, щиты и устойчивость корабля",
  },
  weapons: {
    title: "Оружейная доктрина",
    short: "Оружие",
    description: "урон, вооружение и контроль боя",
  },
  science: {
    title: "Разведка и наука",
    short: "Наука",
    description: "сканирование, лаборатории и дальняя навигация",
  },
  engineering: {
    title: "Инженерная школа",
    short: "Инженерия",
    description: "двигатели, ремонт и автономность",
  },
  biology: {
    title: "Биологическая адаптация",
    short: "Биология",
    description: "экипаж, медицина и ксенобиология",
  },
  ancient_tech: {
    title: "Древние системы",
    short: "Древние",
    description: "поздние прорывы и технологии Предтеч",
  },
  artifacts: {
    title: "Артефактная школа",
    short: "Артефакты",
    description: "реликвии, слоты и усиление находок",
  },
};

type TechDirectoryFilter = "all" | "active" | "ready" | "opened" | "researched";
type TechDirectoryStatus =
  | "active"
  | "ready"
  | "opened"
  | "researched"
  | "blocked";

const TECH_DIRECTORY_FILTERS: {
  id: TechDirectoryFilter;
  label: string;
}[] = [
  { id: "all", label: "Все" },
  { id: "active", label: "В разработке" },
  { id: "ready", label: "Готово" },
  { id: "opened", label: "Открыто" },
  { id: "researched", label: "Изучено" },
];

interface TechDirectoryRow {
  tech: Technology;
  status: TechDirectoryStatus;
  canStart: boolean;
  isResearched: boolean;
  isActive: boolean;
  isOpened: boolean;
  canPayResources: boolean;
  name: string;
}

function getDirectoryStatusText(status: TechDirectoryStatus): string {
  return status === "active"
    ? "В процессе"
    : status === "ready"
      ? "Можно начать"
      : status === "opened"
        ? "Открыта ветка"
        : status === "researched"
          ? "Изучена"
          : "Недоступна";
}

function getDirectoryStatusColor(status: TechDirectoryStatus): string {
  return status === "active"
    ? "#00d4ff"
    : status === "ready"
      ? "#00ff41"
      : status === "opened"
        ? "#ffb000"
        : status === "researched"
          ? "#00aa66"
          : "#666";
}

interface TechDirectoryProps {
  rows: TechDirectoryRow[];
  filter: TechDirectoryFilter;
  searchText: string;
  canResearch: boolean;
  hasActiveResearch: boolean;
  onFilterChange: (filter: TechDirectoryFilter) => void;
  onSearchChange: (value: string) => void;
  onSelectTech: (techId: TechnologyId) => void;
  onQuickStart: (techId: TechnologyId) => void;
}

function TechDirectory({
  rows,
  filter,
  searchText,
  canResearch,
  hasActiveResearch,
  onFilterChange,
  onSearchChange,
  onSelectTech,
  onQuickStart,
}: TechDirectoryProps) {
  return (
    <div className="space-y-2 border-t border-[#1a1a1a] pt-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-52">
          <input
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск технологий..."
            className="w-full px-2 py-1 text-xs bg-[#080808] border border-[#333] text-[#888] placeholder:text-[#555] outline-none focus:border-[#00ff41]"
          />
        </div>
        <div className="text-[10px] text-[#888]">
          Найдено: {rows.length}
        </div>
        {canResearch ? (
          <div className="text-[10px] text-[#00d4ff]">Лаб: активна</div>
        ) : (
          <div className="text-[10px] text-[#ffb000]">Лаб/учёные не готовы</div>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {TECH_DIRECTORY_FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => onFilterChange(entry.id)}
            className="px-2 py-1 text-[10px] border cursor-pointer"
            style={{
              borderColor:
                filter === entry.id ? "#00ff41" : "#333",
              color: filter === entry.id ? "#00ff41" : "#777",
              backgroundColor:
                filter === entry.id ? "rgba(0,255,65,0.07)" : "rgba(0,0,0,0.18)",
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="max-h-36 overflow-y-auto pr-1 space-y-1">
        {rows.length === 0 ? (
          <div className="text-xs text-[#555] p-2 border border-dashed border-[#333]">
            Нет технологий по заданным условиям
          </div>
        ) : (
          rows.map((row) => {
            const statusColor = getDirectoryStatusColor(row.status);
            const canQuickStart = row.canStart && !hasActiveResearch && canResearch;
            return (
              <div
                key={row.tech.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectTech(row.tech.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectTech(row.tech.id);
                  }
                }}
                aria-label={`Открыть технологию ${row.name}`}
                className="w-full border border-[#1f1f1f] text-left p-2 transition-all cursor-pointer"
                style={{
                  backgroundColor: row.isActive
                    ? "rgba(0,212,255,0.06)"
                    : "rgba(0,0,0,0.22)",
                  borderColor: `${statusColor}55`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] text-[#ccc] truncate">
                      {row.name}
                    </div>
                    <div className="text-[9px] text-[#666]">
                      T{row.tech.tier} · {CATEGORY_META[row.tech.category].short}
                    </div>
                  </div>
                  <div
                    className="text-[10px]"
                    style={{ color: statusColor }}
                  >
                    {getDirectoryStatusText(row.status)}
                  </div>
                </div>
                <div className="mt-1 text-[9px] text-[#666]">
                  {row.tech.bonuses.map((bonus) => bonus.description).join("; ")}
                </div>
                <div className="mt-1 flex items-center gap-1">
                  {row.isOpened && (
                    <span className="text-[8px] text-[#ffb000] px-1.5 py-0.5 border border-[#ffb00055]">
                      {canResearch
                        ? row.canPayResources
                          ? "есть ресурсы"
                          : "нужны ресурсы"
                        : "нужна лаборатория"}
                    </span>
                  )}
                  {row.isActive && (
                    <span className="text-[8px] text-[#00d4ff] px-1.5 py-0.5 border border-[#00d4ff55]">
                      В работе
                    </span>
                  )}
                  <div className="ml-auto" />
                  {canQuickStart && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickStart(row.tech.id);
                      }}
                      className="text-[9px] px-1.5 py-0.5 border cursor-pointer"
                      style={{
                        borderColor: "#00ff41",
                        color: "#00ff41",
                        backgroundColor: "rgba(0,255,65,0.08)",
                      }}
                    >
                      Старт
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

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
  isMuted: boolean;
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
  isMuted,
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
        opacity: isMuted ? 0.34 : 1,
      }}
      className="border transition-all duration-200 select-none"
    >
      <div
        className={`flex items-start h-full px-2 pt-2 pb-1 gap-1.5 ${textOpacity}`}
      >
        <span className="shrink-0 leading-none mt-0.5">
          {isDiscovered ? (
            <TechIcon techId={tech.id} size={28} />
          ) : (
            <span className="text-xl">?</span>
          )}
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
  // Активные указатели для pinch-zoom (тач)
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDist = useRef(0);
  const pinchStartZoom = useRef(0.8);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      // Начало pinch
      dragging.current = false;
      const pts = [...pointers.current.values()];
      pinchStartDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartZoom.current = zoom;
    } else if (pointers.current.size === 1) {
      dragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
    }
  }, [zoom]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Pinch-zoom: два указателя
    if (pointers.current.size >= 2) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchStartDist.current > 0) {
        const ratio = dist / pinchStartDist.current;
        setZoom(Math.max(0.25, Math.min(2, pinchStartZoom.current * ratio)));
      }
      return;
    }

    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      pinchStartDist.current = 0;
    }
    if (pointers.current.size === 0) {
      dragging.current = false;
    } else if (pointers.current.size === 1) {
      // Остался один палец — продолжаем пан
      const [pt] = [...pointers.current.values()];
      lastPos.current = pt;
      dragging.current = true;
    }
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.25, Math.min(2, z * factor)));
  }, []);

  return (
    <div
      className="h-[60dvh] flex-none overflow-hidden min-h-80 bg-[#030608] cursor-grab active:cursor-grabbing lg:h-auto lg:flex-1 lg:min-h-0"
      style={{ userSelect: "none", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
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
  focusedCategory: ResearchCategory | null;
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
  focusedCategory,
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
          const fromTech = RESEARCH_TREE[fromId];
          const toTech = RESEARCH_TREE[toId];
          const isMuted =
            !!focusedCategory &&
            fromTech.category !== focusedCategory &&
            toTech.category !== focusedCategory;
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
              opacity={isMuted ? 0.25 : 1}
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
        const isMuted =
          !!focusedCategory && tech.category !== focusedCategory;

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
            isMuted={isMuted}
            lang={lang}
            onClick={() => onSelectTech(tech.id)}
          />
        );
      })}
    </div>
  );
}

interface ResearchPathPanelProps {
  researchedTechs: TechnologyId[];
  activeResearch: { techId: TechnologyId; progress: number } | null;
  focusedCategory: ResearchCategory | null;
  onFocusCategory: (category: ResearchCategory | null) => void;
  canStartResearch: (tech: Technology) => boolean;
  lang: "ru" | "en";
}

function ResearchPathPanel({
  researchedTechs,
  activeResearch,
  focusedCategory,
  onFocusCategory,
  canStartResearch,
  lang,
}: ResearchPathPanelProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4 xl:grid-cols-7">
      {typedKeys(CATEGORY_META).map((category) => {
        const techs = (Object.values(RESEARCH_TREE) as Technology[]).filter(
          (tech) => tech.category === category,
        );
        const done = techs.filter((tech) =>
          researchedTechs.includes(tech.id),
        ).length;
        const readyTech = techs.find(
          (tech) =>
            !researchedTechs.includes(tech.id) &&
            canResearchTech(tech.id, researchedTechs) &&
            canStartResearch(tech),
        );
        const activeInPath = activeResearch
          ? RESEARCH_TREE[activeResearch.techId]?.category === category
          : false;
        const isFocused = focusedCategory === category;
        const color = CATEGORY_COLORS[category];
        const meta = CATEGORY_META[category];

        return (
          <button
            key={category}
            type="button"
            onClick={() => onFocusCategory(isFocused ? null : category)}
            className="min-h-19.5 border p-2 text-left transition-all cursor-pointer"
            style={{
              borderColor: isFocused || activeInPath ? color : `${color}55`,
              backgroundColor: isFocused
                ? `${color}16`
                : activeInPath
                  ? `${color}10`
                  : "rgba(0,0,0,0.22)",
              boxShadow: isFocused ? `0 0 12px ${color}33` : undefined,
            }}
            title={meta.description}
          >
            <div
              className="font-['Orbitron'] text-[10px] font-bold uppercase leading-tight"
              style={{ color }}
            >
              {meta.short}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px]">
              <span className="text-[#667766]">
                {done}/{techs.length}
              </span>
              {activeInPath && <span className="text-[#00d4ff]">активно</span>}
              {!activeInPath && readyTech && (
                <span className="text-[#00ff41]">готово</span>
              )}
            </div>
            <div className="mt-1 h-1 border border-[#1a3320] bg-[#050810]">
              <div
                className="h-full transition-all"
                style={{
                  width: `${Math.round((done / techs.length) * 100)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <div className="mt-1 text-[9px] leading-snug text-[#555]">
              {readyTech
                ? `След.: ${getTechTranslation(readyTech.id, lang).name}`
                : meta.description}
            </div>
          </button>
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
          <TechIcon techId={tech.id} size={48} className="mt-0.5" />
          <div className="flex-1 min-w-0">
            <div
              className="font-['Orbitron'] font-bold text-base leading-tight"
              style={{ color: catColor }}
            >
              {translation.name}
            </div>
            <div className="text-xs text-[#666] mt-0.5">
              Этап {tech.tier} · {CATEGORY_META[tech.category].title}
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
  const showSectorMap = useGameStore((s) => s.showSectorMap);
  const addLog = useGameStore((s) => s.addLog);
  const { t, currentLanguage } = useTranslation();

  useEffect(() => {
    showHintOnce(addLog, "research", "hints.research");
  }, [addLog]);

  // Ensure credits are always displayed as integers
  const displayCredits = Math.floor(credits);

  const [selectedTech, setSelectedTech] = useState<TechnologyId | null>(null);
  const [focusedCategory, setFocusedCategory] =
    useState<ResearchCategory | null>(null);
  const [techSearchText, setTechSearchText] = useState("");
  const [techDirectoryFilter, setTechDirectoryFilter] =
    useState<TechDirectoryFilter>("all");

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
        research?.resources[type as keyof typeof research.resources] ??
        0;
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
  const discoveredTechs = useMemo(
    () => research?.discoveredTechs ?? [],
    [research],
  );
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

  const techDirectoryRows = useMemo(() => {
    const normalizedSearch = techSearchText.trim().toLowerCase();
    return (Object.values(RESEARCH_TREE) as Technology[])
      .map((tech) => {
        const isResearched = researchedTechs.includes(tech.id);
        const isDiscovered = discoveredTechs.includes(tech.id) || isResearched;
        if (!isDiscovered) return null;

        const isActive = activeResearch?.techId === tech.id;
        const prereqsMet = canResearchTech(tech.id, researchedTechs);
        const isOpened = prereqsMet && !isResearched;
        const canPayResources = (() => {
          if (credits < tech.credits) return false;
          for (const [type, needed] of Object.entries(tech.resources)) {
            if (getResourceQty(type) < (needed ?? 0)) return false;
          }
          return true;
        })();
        const isReady = isOpened && canResearch && canPayResources;

        const status: TechDirectoryStatus = isActive
          ? "active"
          : isResearched
            ? "researched"
            : isReady
              ? "ready"
              : isOpened
                ? "opened"
                : "blocked";

        const name = getTechTranslation(tech.id, currentLanguage).name;
        if (
          normalizedSearch &&
          !name.toLowerCase().includes(normalizedSearch)
        ) {
          return null;
        }

        if (focusedCategory && tech.category !== focusedCategory) {
          return null;
        }

        return {
          tech,
          status,
          canStart: isReady,
          isResearched,
          isActive,
          isOpened,
          canPayResources,
          name,
        } satisfies TechDirectoryRow;
      })
      .filter((tech): tech is TechDirectoryRow => tech !== null)
      .filter((tech) => {
        if (techDirectoryFilter === "all") return true;
        if (techDirectoryFilter === "active") return tech.isActive;
        if (techDirectoryFilter === "ready") return tech.status === "ready";
        if (techDirectoryFilter === "opened") return tech.status === "opened";
        if (techDirectoryFilter === "researched")
          return tech.status === "researched";
        return true;
      })
      .sort((a, b) => {
        if (a.status === "active" && b.status !== "active") return -1;
        if (b.status === "active" && a.status !== "active") return 1;

        if (a.tech.tier !== b.tech.tier) return a.tech.tier - b.tech.tier;
        return a.name.localeCompare(b.name);
      });
  }, [
    canResearch,
    currentLanguage,
    discoveredTechs,
    focusedCategory,
    researchedTechs,
    techDirectoryFilter,
    techSearchText,
    getResourceQty,
    credits,
    activeResearch?.techId,
  ]);

  const activeResearchId = activeResearch?.techId ?? null;
  const handleQuickStart = useCallback(
    (techId: TechnologyId) => {
      if (activeResearchId || !canResearch) return;
      const tech = RESEARCH_TREE[techId];
      if (tech && canStartResearch(tech)) {
        startResearch(techId);
        setSelectedTech(null);
      }
    },
    [activeResearchId, canResearch, canStartResearch, startResearch],
  );

  const sciencePerTurn = useMemo(
    () => calculateResearchOutput({ ship, crew, research }).totalOutput,
    [ship, crew, research],
  );

  const selectedTechnology = selectedTech
    ? RESEARCH_TREE[selectedTech]
    : null;

  return (
    <div className="flex flex-col min-h-full lg:h-full lg:overflow-hidden">
      {/* ── Header ── */}
      <div className="shrink-0 p-2 border-b border-[#1a1a1a] space-y-2">
        <div className="flex items-start justify-between gap-3 border-b border-[#9933ff44] pb-2">
          <div className="font-['Orbitron'] text-lg font-bold uppercase tracking-[0.14em] text-[#b46cff]">
            🔬 {t("research.panel_title")}
          </div>
          <Button
            onClick={showSectorMap}
            className="shrink-0 cursor-pointer border border-[#00ff41] bg-transparent text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
          >
            {t("common.back_to_map")}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div
            className={`text-xs font-bold px-2 py-1 border ${canResearch
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

        <ResearchPathPanel
          researchedTechs={researchedTechs}
          activeResearch={activeResearch}
          focusedCategory={focusedCategory}
          onFocusCategory={setFocusedCategory}
          canStartResearch={canStartResearch}
          lang={currentLanguage}
        />

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
            <span className="font-bold">{displayCredits}</span>
          </div>
          <div className="flex items-center gap-1 px-1.5 py-0.5 border border-[#33333366] bg-[#33333310] text-[10px] text-[#555]">
            <span>{t("research.pan_zoom_hint")}</span>
          </div>
        </div>

        <TechDirectory
          rows={techDirectoryRows}
          filter={techDirectoryFilter}
          searchText={techSearchText}
          canResearch={canResearch}
          hasActiveResearch={Boolean(activeResearchId)}
          onFilterChange={setTechDirectoryFilter}
          onSearchChange={setTechSearchText}
          onSelectTech={(id) =>
            setSelectedTech((current) => (current === id ? null : id))
          }
          onQuickStart={handleQuickStart}
        />
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
          focusedCategory={focusedCategory}
        />
      </PanZoomCanvas>

      {/* ── Tech detail modal ── */}
      <TechModal
        tech={selectedTechnology}
        researchedTechs={researchedTechs}
        getResourceQty={getResourceQty}
        credits={displayCredits}
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
