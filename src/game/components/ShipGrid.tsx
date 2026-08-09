"use client";

import { useRef, useState } from "react";
import { useGameStore } from "../store";
import { CREW_ASSIGNMENT_ICONS } from "../constants/crew";
import { RACES } from "../constants/races";
import type { Module, CrewMember } from "../types";
import { MODULE_TYPES } from "../constants/modules";
import { useTranslation } from "@/lib/useTranslation";
import { getModuleTranslation } from "@/lib/moduleTranslations";
import { getActiveAssignment } from "@/game/crew/assignments";
import { isCrewHealthCritical } from "@/game/crew/utils";
import { isModuleCritical } from "@/game/modules/utils";
import { ProfessionSprite } from "./ProfessionSprite";
import { getCrewIconLayout } from "./crewIconLayout";
import {
  hasMergedXenosymbiont,
  SymbiosisModuleOverlay,
} from "./SymbiosisModuleOverlay";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WeaponSlotsRenderer } from "./WeaponSlotsRenderer";
import { MODULE_ART } from "./moduleArt";
import {
  HealthBar,
  DisabledOverlay,
  LevelBadge,
} from "./shipGrid/ModuleCellParts";
import { ModuleDetailDialog } from "./ModuleList";
import { resolveModulePointerUp } from "./shipGridInteraction";

const CELL_SIZE = 100;

const MODULE_ART_URLS = Object.values(MODULE_ART).flatMap((art) =>
  Object.values(art).filter((url): url is string => url !== undefined),
);

export function preloadModuleArt() {
  for (const moduleArt of MODULE_ART_URLS) {
    const image = new Image();
    image.onerror = () => {
      image.onerror = null;
      image.src = moduleArt;
    };
    image.src = moduleArt.replace(".webp", ".avif");
  }
}

// Health bar geometry (shared between HealthBar and CrewIcons)
const HEALTH_BAR_BOTTOM_OFFSET = 15; // px from module bottom to health bar top
const HEALTH_BAR_HEIGHT = 5;
const HEALTH_BAR_SIDE_PADDING = 10; // x offset from module edge

// Crew icon layout
const CREW_ICON_SIZE = 20;
const CREW_ICON_GAP = 3;
const CREW_ICON_PADDING = 4; // four crew members fit across a 1x1 module
const CREW_ICON_HEALTH_BAR_MARGIN = 3; // gap between icon rows and health bar

export function ShipGrid() {
  const ship = useGameStore((s) => s.ship);
  const modules = useGameStore((s) => s.ship.modules);
  const gridSize = useGameStore((s) => s.ship.gridSize);
  const crew = useGameStore((s) => s.crew);
  const moveModule = useGameStore((s) => s.moveModule);
  const moveCrewMember = useGameStore((s) => s.moveCrewMember);
  const canPlaceModule = useGameStore((s) => s.canPlaceModule);
  const isModuleAdjacent = useGameStore((s) => s.isModuleAdjacent);
  const currentCombat = useGameStore((s) => s.currentCombat);
  const crewAutomationEnabled = useGameStore((s) => s.crewAutomation.enabled);
  const { t, currentLanguage } = useTranslation();

  const [draggedModule, setDraggedModule] = useState<Module | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [tempPos, setTempPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [draggedCrew, setDraggedCrew] = useState<CrewMember | null>(null);
  const [crewDragPos, setCrewDragPos] = useState({ x: 0, y: 0 });
  const [crewDropModuleId, setCrewDropModuleId] = useState<number | null>(null);
  const crewDropModuleRef = useRef<number | null>(null);

  const isCombatMode = !!currentCombat;
  const selectedModule =
    modules.find((module) => module.id === selectedModuleId) ?? null;
  const idleCrewCount = crew.filter(
    (member) => !getActiveAssignment(member, isCombatMode),
  ).length;
  // SVG dimensions
  const svgSize = gridSize * CELL_SIZE;

  const handlePointerDown = (
    e: React.PointerEvent<SVGGElement>,
    module: Module,
  ) => {
    // Получаем <svg> из текущего <g>
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    // Захват указателя: события move/up продолжат идти на <svg> даже за пределами
    svg.setPointerCapture?.(e.pointerId);
    const rect = svg.getBoundingClientRect();
    const scaleX = svgSize / rect.width;
    const scaleY = svgSize / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    // Далее вычисляем смещение внутри модуля:
    const moduleX = module.x * CELL_SIZE;
    const moduleY = module.y * CELL_SIZE;
    const offsetX = mouseX - moduleX;
    const offsetY = mouseY - moduleY;
    setDragOffset({ x: offsetX, y: offsetY });
    setDraggedModule(module);
    setTempPos({ x: module.x, y: module.y });
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggedCrew) {
      const rect = e.currentTarget.getBoundingClientRect();
      const point = {
        x: (e.clientX - rect.left) * (svgSize / rect.width),
        y: (e.clientY - rect.top) * (svgSize / rect.height),
      };
      const target = modules.find(
        (module) =>
          !module.disabled &&
          !module.manualDisabled &&
          isModuleAdjacent(draggedCrew.moduleId, module.id) &&
          point.x >= module.x * CELL_SIZE &&
          point.x <= (module.x + module.width) * CELL_SIZE &&
          point.y >= module.y * CELL_SIZE &&
          point.y <= (module.y + module.height) * CELL_SIZE,
      );
      setCrewDragPos(point);
      crewDropModuleRef.current = target?.id ?? null;
      setCrewDropModuleId(target?.id ?? null);
      return;
    }

    if (isCombatMode || ship.moduleMovedThisTurn || !draggedModule) return;

    const svg = e.currentTarget; // всегда сам SVG
    const rect = svg.getBoundingClientRect();

    // масштаб между CSS-размером и viewBox
    const scaleX = svgSize / rect.width;
    const scaleY = svgSize / rect.height;

    // указатель в координатах SVG
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // позиция модуля с учётом offset
    const newX = Math.floor(
      (mouseX - dragOffset.x + CELL_SIZE / 2) / CELL_SIZE,
    );

    const newY = Math.floor(
      (mouseY - dragOffset.y + CELL_SIZE / 2) / CELL_SIZE,
    );

    // ограничение границами сетки
    const clampedX = Math.max(
      0,
      Math.min(newX, gridSize - draggedModule.width),
    );

    const clampedY = Math.max(
      0,
      Math.min(newY, gridSize - draggedModule.height),
    );

    setTempPos({ x: clampedX, y: clampedY });
  };

  const handlePointerUp = () => {
    if (draggedCrew) {
      if (!crewAutomationEnabled && crewDropModuleRef.current !== null) {
        moveCrewMember(draggedCrew.id, crewDropModuleRef.current);
      }
      setDraggedCrew(null);
      crewDropModuleRef.current = null;
      setCrewDropModuleId(null);
      return;
    }

    const canMove = !isCombatMode && !ship.moduleMovedThisTurn;
    const action = resolveModulePointerUp(
      draggedModule,
      tempPos,
      canMove,
      Boolean(
        canMove &&
        draggedModule &&
        tempPos &&
        canPlaceModule(draggedModule, tempPos.x, tempPos.y),
      ),
    );

    if (action?.type === "move") {
      moveModule(action.moduleId, action.x, action.y);
    } else if (action?.type === "open") {
      setSelectedModuleId(action.moduleId);
    }

    setDraggedModule(null);
    setTempPos(null);
  };

  const cancelModuleDrag = () => {
    setDraggedModule(null);
    setTempPos(null);
  };

  const handleCrewPointerDown = (
    e: React.PointerEvent<SVGGElement>,
    member: CrewMember,
  ) => {
    e.stopPropagation();
    if (crewAutomationEnabled || member.movedThisTurn) return;
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
    svg.setPointerCapture?.(e.pointerId);
    const rect = svg.getBoundingClientRect();
    setDraggedCrew(member);
    setCrewDragPos({
      x: (e.clientX - rect.left) * (svgSize / rect.width),
      y: (e.clientY - rect.top) * (svgSize / rect.height),
    });
  };

  const cancelCrewDrag = () => {
    setDraggedCrew(null);
    crewDropModuleRef.current = null;
    setCrewDropModuleId(null);
  };

  return (
    <div
      className={`p-1 md:p-2 select-none transition-colors overflow-hidden max-w-full w-full lg:h-full lg:flex lg:flex-col ${ship?.moduleMovedThisTurn
        ? "bg-[#050810] border border-accent"
        : "bg-[#050810] border border-[#00ff41]"
        }`}
    >
      {!isCombatMode && (
        <div className="relative min-h-5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 py-0.5 pr-7 pl-1 text-[9px] uppercase tracking-[0.14em] text-[#526452] pointer-events-none">
            <span className={idleCrewCount > 0 ? "text-accent" : "text-[#00ff41]"}>
              {t("crew.idle_count")}: {idleCrewCount}
            </span>
          </div>
          <button
            onClick={() => setShowLegend((s) => !s)}
            className="absolute right-0 top-0 z-10 w-5 h-5 flex items-center justify-center border border-[#00ff4166] bg-[rgba(0,255,65,0.08)] text-[#00ff41] text-[10px] hover:bg-[rgba(0,255,65,0.2)] transition-colors cursor-pointer"
            title={showLegend ? "Скрыть легенду" : "Показать легенду"}
          >
            {showLegend ? "✕" : "?"}
          </button>
          {showLegend && (
            <div className="absolute right-0 top-6 z-20 w-64 max-w-[80vw] px-2 py-2 text-[10px] text-[#666] space-y-1 border border-[#00ff4155] bg-[#050810] shadow-[0_0_15px_rgba(0,255,65,0.2)]">
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {[
                  { type: "reactor", color: "#ffb000" },
                  { type: "cockpit", color: "#00d4ff" },
                  { type: "weaponbay", color: "#ff00ff" },
                  { type: "shield", color: "#0080ff" },
                  { type: "engine", color: "#ff6600" },
                  { type: "lifesupport", color: "#00ff41" },
                  { type: "cargo", color: "#ff0040" },
                  { type: "fueltank", color: "#9933ff" },
                  { type: "medical", color: "#00ffaa" },
                  { type: "scanner", color: "#ffff00" },
                  { type: "lab", color: "#00ff41" },
                  { type: "quarters", color: "#ffa500" },
                  { type: "repair_bay", color: "#c0c0c0" },
                  { type: "ai_core", color: "#00ffff" },
                  { type: "drill", color: "#cd853f" },
                ].map(({ type, color }) => (
                  <Tooltip key={type} delayDuration={600}>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-0.5 cursor-help">
                        <span style={{ color }}>■</span>
                        <span>{getModuleTranslation(type, currentLanguage).name}</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t(`module_descriptions.${type}`)}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 border-t border-[#ffffff11] pt-1">
                {[
                  { type: "bio_research_lab", color: "#00ffaa" },
                  { type: "pulse_drive", color: "#ff6600" },
                  { type: "habitat_module", color: "#ffa500" },
                  { type: "deep_survey_array", color: "#ffff00" },
                ].map(({ type, color }) => (
                  <Tooltip key={type} delayDuration={600}>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-0.5 cursor-help">
                        <span style={{ color }}>■</span>
                        <span>{getModuleTranslation(type, currentLanguage).name}</span>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t(`module_descriptions.${type}`)}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="w-full lg:flex-1 lg:min-h-0 lg:grid lg:place-items-center lg:@container-[size]">
        <svg
          width={gridSize * CELL_SIZE}
          height={gridSize * CELL_SIZE}
          viewBox={`0 0 ${gridSize * CELL_SIZE} ${gridSize * CELL_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          className={`w-full h-auto select-none max-h-100 lg:w-[min(100cqw,100cqh)] lg:h-[min(100cqw,100cqh)] lg:max-h-none ${isCombatMode
            ? "cursor-not-allowed"
            : "cursor-grab active:cursor-grabbing"
            }`}
          style={{ userSelect: "none", WebkitUserSelect: "none", touchAction: "none" }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            if (draggedCrew) cancelCrewDrag();
            else cancelModuleDrag();
          }}
        >
        <Grid gridSize={gridSize} cellSize={CELL_SIZE} />
        {modules.map((mod) => (
          <g
            key={mod.id}
            onPointerDown={(e) => {
              e.stopPropagation();
              handlePointerDown(e, mod);
            }}
            style={{
              cursor:
                isCombatMode || ship.moduleMovedThisTurn
                  ? "pointer"
                  : "grab",
            }}
          >
            <ModuleRenderer
              module={mod}
              cellSize={CELL_SIZE}
              crew={crew}
              isDragging={draggedModule?.id === mod.id}
              tempPos={
                draggedModule?.id === mod.id ? tempPos : null
              }
              currentLanguage={currentLanguage}
              isCombatMode={isCombatMode}
              onCrewPointerDown={handleCrewPointerDown}
            />
          </g>
        ))}
        {draggedCrew &&
          modules
            .filter(
              (module) =>
                !module.disabled &&
                !module.manualDisabled &&
                isModuleAdjacent(draggedCrew.moduleId, module.id),
            )
            .map((module) => (
              <rect
                key={module.id}
                x={module.x * CELL_SIZE + 4}
                y={module.y * CELL_SIZE + 4}
                width={module.width * CELL_SIZE - 8}
                height={module.height * CELL_SIZE - 8}
                fill={
                  crewDropModuleId === module.id
                    ? "rgba(255,176,0,0.18)"
                    : "rgba(0,255,65,0.08)"
                }
                stroke={crewDropModuleId === module.id ? "#ffb000" : "#00ff41"}
                strokeWidth="2"
                strokeDasharray="6 4"
                pointerEvents="none"
              />
            ))}
        {draggedCrew && (
          <ProfessionSprite
            race={draggedCrew.race}
            profession={draggedCrew.profession}
            x={crewDragPos.x - CREW_ICON_SIZE / 2}
            y={crewDragPos.y - CREW_ICON_SIZE / 2}
            size={CREW_ICON_SIZE}
            title={draggedCrew.name}
          />
        )}
        </svg>
      </div>

      {isCombatMode && (
        <div className="text-destructive text-[10px] mt-1 text-center">
          {t("ship.cannot_move_combat")}
        </div>
      )}

      <ModuleDetailDialog
        module={selectedModule}
        onClose={() => setSelectedModuleId(null)}
      />
    </div>
  );
}

function Grid({ gridSize, cellSize }: { gridSize: number; cellSize: number }) {
  const lines: React.ReactElement[] = [];

  for (let i = 0; i <= gridSize; i++) {
    lines.push(
      <line
        key={`v${i}`}
        x1={i * cellSize}
        y1={0}
        x2={i * cellSize}
        y2={gridSize * cellSize}
        stroke="#00ff4133"
        strokeWidth={1}
      />,
    );
    lines.push(
      <line
        key={`h${i}`}
        x1={0}
        y1={i * cellSize}
        x2={gridSize * cellSize}
        y2={i * cellSize}
        stroke="#00ff4133"
        strokeWidth={1}
      />,
    );
  }

  return <g>{lines}</g>;
}

interface ModuleRendererProps {
  module: Module;
  cellSize: number;
  crew: CrewMember[];
  isDragging: boolean;
  tempPos?: { x: number; y: number } | null;
  currentLanguage: "ru" | "en";
  isCombatMode: boolean;
  onCrewPointerDown: (
    e: React.PointerEvent<SVGGElement>,
    member: CrewMember,
  ) => void;
}

function ModuleRenderer({
  module,
  cellSize,
  crew,
  isDragging,
  tempPos,
  currentLanguage,
  isCombatMode,
  onCrewPointerDown,
}: ModuleRendererProps) {
  // Use tempPos when dragging, otherwise use module's original position
  //
  if (module.type === "weaponShed") {
    return;
  }

  const posX = isDragging && tempPos ? tempPos.x : module.x;
  const posY = isDragging && tempPos ? tempPos.y : module.y;
  const x = posX * cellSize;
  const y = posY * cellSize;
  const w = module.width * cellSize;
  const h = module.height * cellSize;
  const style = MODULE_TYPES[module.type] || {
    color: "#ffffff33",
    borderColor: "#ffffff",
  };
  const moduleArt =
    MODULE_ART[module.type]?.[`${module.width}x${module.height}`];

  const crewInModule = crew.filter((c) => c.moduleId === module.id);
  const hasSymbiosis = hasMergedXenosymbiont(crew, module.id);

  return (
    <g
      className="select-none"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      <rect
        x={x + 2}
        y={y + 2}
        width={w - 4}
        height={h - 4}
        fill={moduleArt ? "#050810" : style.color}
        className="select-none"
      />
      {moduleArt && (
        <>
          <image
            href={moduleArt.replace(".webp", ".avif")}
            onError={(event) => {
              const image = event.currentTarget;
              if (image.getAttribute("href")?.endsWith(".avif")) {
                image.setAttribute("href", moduleArt);
              }
            }}
            x={x + 2}
            y={y + 2}
            width={w - 4}
            height={h - 4}
            preserveAspectRatio="xMidYMid meet"
            pointerEvents="none"
            aria-hidden="true"
          />
          <rect
            x={x + 2}
            y={y + 2}
            width={w - 4}
            height={h - 4}
            fill={style.color}
            fillOpacity={0.35}
            pointerEvents="none"
          />
        </>
      )}
      <rect
        x={x + 2}
        y={y + 2}
        width={w - 4}
        height={h - 4}
        fill="none"
        stroke={isDragging ? "#ffb000" : style.borderColor}
        strokeWidth={isDragging ? 3 : 2}
        className="select-none"
      />
      {hasSymbiosis && <SymbiosisModuleOverlay x={x} y={y} w={w} h={h} />}
      <text
        x={x + w / 2}
        y={y + 20}
        fill={style.borderColor}
        fontSize="11"
        fontFamily="Share Tech Mono"
        textAnchor="middle"
        className="select-none"
        style={{ userSelect: "none", WebkitUserSelect: "none" }}
      >
        {getModuleTranslation(module.type, currentLanguage, module.name).name}
      </text>

      {module.type === "weaponbay" && module.weapons && (
        <WeaponSlotsRenderer
          weapons={module.weapons}
          x={x}
          y={y}
          w={w}
          h={h}
        />
      )}
      <HealthBar
        module={module}
        x={x}
        y={y}
        w={w}
        h={h}
        sidePadding={HEALTH_BAR_SIDE_PADDING}
        bottomOffset={HEALTH_BAR_BOTTOM_OFFSET}
        barHeight={HEALTH_BAR_HEIGHT}
      />

      {(module.disabled || module.manualDisabled) && (
        <DisabledOverlay x={x} y={y} w={w} h={h} fontSize={24} />
      )}
      {module.health < 30 && <DamageOverlay x={x} y={y} w={w} h={h} />}

      {crewInModule.length > 0 && (
        <CrewIcons
          crew={crewInModule}
          x={x}
          y={y}
          w={w}
          h={h}
          isCombatMode={isCombatMode}
          onCrewPointerDown={onCrewPointerDown}
          moduleCritical={isModuleCritical(module)}
        />
      )}
    </g>
  );
}

function DamageOverlay({
  x,
  y,
  w,
  h,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  return (
    <>
      <rect
        x={x + 2}
        y={y + 2}
        width={w - 4}
        height={h - 4}
        fill="rgba(255,0,0,0.4)"
      />
      <text
        x={x + w / 2}
        y={y + h / 2}
        fill="#ff0000"
        fontSize="20"
        fontFamily="Share Tech Mono"
        textAnchor="middle"
        fontWeight="bold"
      >
        💥
      </text>
    </>
  );
}

function CrewIcons({
  crew,
  x,
  y,
  w,
  h,
  isCombatMode,
  onCrewPointerDown,
  moduleCritical,
}: {
  crew: CrewMember[];
  x: number;
  y: number;
  w: number;
  h: number;
  isCombatMode: boolean;
  onCrewPointerDown: (
    e: React.PointerEvent<SVGGElement>,
    member: CrewMember,
  ) => void;
  moduleCritical: boolean;
}) {
  const layout = getCrewIconLayout({
    count: crew.length,
    x,
    y,
    width: w,
    height: h,
    iconSize: CREW_ICON_SIZE,
    iconGap: CREW_ICON_GAP,
    horizontalPadding: CREW_ICON_PADDING,
    topInset: 24,
    bottomInset:
      HEALTH_BAR_BOTTOM_OFFSET + CREW_ICON_HEALTH_BAR_MARGIN + CREW_ICON_GAP,
  });

  return (
    <>
      {crew.map((c, idx) => {
        const icon = layout[idx];
        return (
          <CrewIcon
            key={c.id}
            crewMember={c}
            x={icon.x}
            y={icon.y}
            size={icon.size}
            isCombatMode={isCombatMode}
            onPointerDown={onCrewPointerDown}
            atRisk={moduleCritical || isCrewHealthCritical(c)}
          />
        );
      })}
    </>
  );
}

function CrewIcon({
  crewMember,
  x,
  y,
  size,
  isCombatMode,
  onPointerDown,
  atRisk,
}: {
  crewMember: CrewMember;
  x: number;
  y: number;
  size: number;
  isCombatMode: boolean;
  onPointerDown: (
    e: React.PointerEvent<SVGGElement>,
    member: CrewMember,
  ) => void;
  atRisk: boolean;
}) {
  const { t } = useTranslation();
  const race = RACES[crewMember.race];
  const raceColor = atRisk ? "#ff2b4d" : race?.color || "#00ff41";
  const badgeR = size * 0.19;
  const activeTask = getActiveAssignment(crewMember, isCombatMode);
  const hasActiveTask = !!activeTask;

  return (
    <g
      className="select-none"
      onPointerDown={(e) => onPointerDown(e, crewMember)}
      style={{
        cursor: crewMember.movedThisTurn ? "not-allowed" : "grab",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {atRisk && (
        <rect
          className="animate-pulse"
          x={x - 2.5}
          y={y - 2.5}
          width={size + 5}
          height={size + 5}
          rx={3}
          fill="none"
          stroke="#ff2b4d"
          strokeWidth={1.5}
          strokeDasharray="3 2"
          pointerEvents="none"
        >
          <title>{t("crew.at_risk_hint")}</title>
        </rect>
      )}
      <rect
        x={x - 0.5}
        y={y - 0.5}
        width={size + 1}
        height={size + 1}
        rx={2}
        fill="#050810"
        fillOpacity={0.82}
        stroke={raceColor}
        strokeOpacity={0.9}
        strokeWidth={atRisk ? 1.75 : 1}
        pointerEvents="none"
      />
      <ProfessionSprite
        race={crewMember.race}
        profession={crewMember.profession}
        x={x}
        y={y}
        size={size}
        title={crewMember.name}
      />

      <g className={hasActiveTask ? undefined : "animate-pulse"}>
        <title>
          {t(hasActiveTask ? "crew.active_task" : "crew.no_active_task")}
        </title>
        {!hasActiveTask && (
          <circle
            cx={x + size / 2}
            cy={y - 3}
            r={size * 0.2}
            fill="#050810"
            stroke="#ffb000"
            strokeWidth="1"
          />
        )}
        <text
          x={x + size / 2}
          y={y - 3}
          fill={hasActiveTask ? "#00ff41" : "#ffb000"}
          fontSize={size * 0.42}
          fontFamily="Share Tech Mono"
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {activeTask ? CREW_ASSIGNMENT_ICONS[activeTask] : "!"}
        </text>
      </g>

      <LevelBadge
        x={x}
        y={y}
        size={size}
        badgeR={badgeR}
        raceColor={raceColor}
        level={crewMember.level}
      />
    </g>
  );
}
