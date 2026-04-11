"use client";

import { useState, MouseEvent } from "react";
import { useGameStore } from "../store";
import { WEAPON_TYPES } from "../constants";
import { RACES } from "../constants/races";
import type { Module, CrewMember, Weapon } from "../types";
import { MODULE_TYPES } from "../constants/modules";
import { useTranslation } from "@/lib/useTranslation";
import { getModuleTranslation } from "@/lib/moduleTranslations";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CELL_SIZE = 100;

// Health bar geometry (shared between HealthBar and CrewIcons)
const HEALTH_BAR_BOTTOM_OFFSET = 15; // px from module bottom to health bar top
const HEALTH_BAR_HEIGHT = 5;
const HEALTH_BAR_SIDE_PADDING = 10; // x offset from module edge

// Crew icon layout
const CREW_ICON_SIZE = 16;
const CREW_ICON_GAP = 3;
const CREW_ICON_PADDING = 8; // horizontal padding inside module
const CREW_ICON_HEALTH_BAR_MARGIN = 3; // gap between icon rows and health bar


export function ShipGrid() {
  const ship = useGameStore((s) => s.ship);
  const modules = useGameStore((s) => s.ship.modules);
  const gridSize = useGameStore((s) => s.ship.gridSize);
  const crew = useGameStore((s) => s.crew);
  const moveModule = useGameStore((s) => s.moveModule);
  const canPlaceModule = useGameStore((s) => s.canPlaceModule);
  const currentCombat = useGameStore((s) => s.currentCombat);
  const { t, currentLanguage } = useTranslation();

  const [draggedModule, setDraggedModule] = useState<Module | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [tempPos, setTempPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const isCombatMode = !!currentCombat;

  // SVG dimensions
  const svgSize = gridSize * CELL_SIZE;

  const handleMouseDown = (e: MouseEvent<SVGGElement>, module: Module) => {
    // Получаем <svg> из текущего <g>
    const svg = e.currentTarget.ownerSVGElement;
    if (!svg) return;
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

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isCombatMode || !draggedModule) return;

    const svg = e.currentTarget; // всегда сам SVG
    const rect = svg.getBoundingClientRect();

    // масштаб между CSS-размером и viewBox
    const scaleX = svgSize / rect.width;
    const scaleY = svgSize / rect.height;

    // курсор в координатах SVG
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

  const handleMouseUp = () => {
    if (isCombatMode) return;

    if (!draggedModule || !tempPos) {
      setDraggedModule(null);
      setTempPos(null);
      return;
    }

    // Only move if position actually changed
    const moved =
      draggedModule.x !== tempPos.x || draggedModule.y !== tempPos.y;

    if (moved && canPlaceModule(draggedModule, tempPos.x, tempPos.y)) {
      moveModule(draggedModule.id, tempPos.x, tempPos.y);
    }

    setDraggedModule(null);
    setTempPos(null);
  };

  return (
    <div
      className={`p-1 md:p-2 select-none transition-colors overflow-hidden max-w-full w-full ${ship?.moduleMovedThisTurn
        ? "bg-[#050810] border border-[#ffb000]"
        : "bg-[#050810] border border-[#00ff41]"
        }`}
    >
      {!isCombatMode && (
        <div className="mb-2 px-1 text-[10px] text-[#666] space-y-1">
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

      <svg
        width={gridSize * CELL_SIZE}
        height={gridSize * CELL_SIZE}
        viewBox={`0 0 ${gridSize * CELL_SIZE} ${gridSize * CELL_SIZE}`}
        className={`w-full h-auto select-none max-h-100 md:max-h-none ${isCombatMode
          ? "cursor-not-allowed"
          : "cursor-grab active:cursor-grabbing"
          }`}
        style={{ userSelect: "none", WebkitUserSelect: "none" }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Grid gridSize={gridSize} cellSize={CELL_SIZE} />
        {modules.map((mod) => (
          <g
            key={mod.id}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (!ship.moduleMovedThisTurn) {
                handleMouseDown(e, mod);
              }
            }}
            style={{
              cursor:
                isCombatMode || ship.moduleMovedThisTurn
                  ? "not-allowed"
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
            />
          </g>
        ))}
      </svg>

      {isCombatMode && (
        <div className="text-[#ff0040] text-[10px] mt-1 text-center">
          {t("ship.cannot_move_combat")}
        </div>
      )}
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
}

function ModuleRenderer({
  module,
  cellSize,
  crew,
  isDragging,
  tempPos,
  currentLanguage,
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

  const crewInModule = crew.filter((c) => c.moduleId === module.id);

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
        fill={style.color}
        className="select-none"
      />
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
        {getModuleTranslation(module.type, currentLanguage).name}
      </text>

      {module.type === "weaponbay" && module.weapons && (
        <WeaponsRenderer
          weapons={module.weapons}
          x={x}
          y={y}
          w={w}
          h={h}
        />
      )}

      <HealthBar module={module} x={x} y={y} w={w} h={h} />

      {(module.disabled || module.manualDisabled) && (
        <DisabledOverlay x={x} y={y} w={w} h={h} />
      )}
      {module.health < 30 && <DamageOverlay x={x} y={y} w={w} h={h} />}

      {crewInModule.length > 0 && (
        <CrewIcons crew={crewInModule} x={x} y={y} w={w} h={h} />
      )}
    </g>
  );
}

function WeaponsRenderer({
  weapons,
  x,
  y,
  w,
  h,
}: {
  weapons: (Weapon | null)[];
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const iconY = y + h / 2 + 10;
  const spacing = w / ((weapons?.length ?? 0) + 1);

  return (
    <>
      {weapons.map((weapon, idx) =>
        weapon ? (
          <text
            key={idx}
            x={x + spacing * (idx + 1)}
            y={iconY}
            fill={WEAPON_TYPES[weapon.type].color}
            fontSize="20"
            fontFamily="Share Tech Mono"
            textAnchor="middle"
            fontWeight="bold"
          >
            {WEAPON_TYPES[weapon.type].icon}
          </text>
        ) : (
          <text
            key={idx}
            x={x + spacing * (idx + 1)}
            y={iconY}
            fill="#444444"
            fontSize="16"
            fontFamily="Share Tech Mono"
            textAnchor="middle"
            fontWeight="bold"
          >
            ○
          </text>
        ),
      )}
    </>
  );
}

function HealthBar({
  module,
  x,
  y,
  w,
  h,
}: {
  module: Module;
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const healthBarWidth = w - HEALTH_BAR_SIDE_PADDING * 2;
  const healthWidth =
    (module.health / (module.maxHealth || 100)) * healthBarWidth;

  return (
    <>
      <rect
        x={x + HEALTH_BAR_SIDE_PADDING}
        y={y + h - HEALTH_BAR_BOTTOM_OFFSET}
        width={healthBarWidth}
        height={HEALTH_BAR_HEIGHT}
        fill="#ff0040"
      />
      <rect
        x={x + HEALTH_BAR_SIDE_PADDING}
        y={y + h - HEALTH_BAR_BOTTOM_OFFSET}
        width={healthWidth}
        height={HEALTH_BAR_HEIGHT}
        fill={module.health > 50 ? "#00ff41" : "#ffb000"}
      />
    </>
  );
}

function DisabledOverlay({
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
        fill="rgba(255,0,64,0.3)"
      />
      <text
        x={x + w / 2}
        y={y + h / 2}
        fill="#ff0040"
        fontSize="24"
        fontFamily="Share Tech Mono"
        textAnchor="middle"
        fontWeight="bold"
      >
        ⚠
      </text>
    </>
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
}: {
  crew: CrewMember[];
  x: number;
  y: number;
  w: number;
  h: number;
}) {
  const iconsPerRow = Math.max(1, Math.floor((w - CREW_ICON_PADDING * 2) / (CREW_ICON_SIZE + CREW_ICON_GAP)));
  const healthBarOffset = HEALTH_BAR_BOTTOM_OFFSET + CREW_ICON_HEALTH_BAR_MARGIN;
  const rowHeight = CREW_ICON_SIZE + CREW_ICON_GAP;
  const rows = Math.ceil(crew.length / iconsPerRow);

  return (
    <>
      {crew.map((c, idx) => {
        const col = idx % iconsPerRow;
        const row = Math.floor(idx / iconsPerRow);
        const iconX = x + CREW_ICON_PADDING + col * (CREW_ICON_SIZE + CREW_ICON_GAP);
        const iconY = y + h - healthBarOffset - rowHeight * (rows - row);
        return (
          <CrewIcon
            key={c.id}
            crewMember={c}
            x={iconX}
            y={iconY}
            size={CREW_ICON_SIZE}
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
}: {
  crewMember: CrewMember;
  x: number;
  y: number;
  size: number;
}) {
  const race = RACES[crewMember.race];
  const raceColor = race?.color || "#00ff41";
  const cx = x + size / 2;
  // Silhouette fills the full icon (no strip offset)
  const scy = y + size / 2;
  const sf = size / 2;
  const badgeR = size * 0.19;

  return (
    <g
      className="select-none"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      {/* Race silhouette — transparent background */}
      {getRaceSilhouette(cx, scy, sf, y, crewMember.race, raceColor)}

      {/* Profession symbol — small badge bottom-right corner */}
      <ProfessionSymbol
        profession={crewMember.profession}
        x={x}
        y={y}
        size={size}
      />

      {/* Assignment indicator — gold dot bottom-left */}
      {crewMember.assignment && (
        <circle
          cx={x + size * 0.22}
          cy={y + size - size * 0.22}
          r={size * 0.16}
          fill="#ffb000"
          className="select-none"
        />
      )}

      {/* Level badge — shown only when level > 1 */}
      {crewMember.level > 1 && (
        <g className="select-none">
          <circle
            cx={x + size - badgeR}
            cy={y + badgeR}
            r={badgeR}
            fill="#050810"
          />
          <circle
            cx={x + size - badgeR}
            cy={y + badgeR}
            r={badgeR}
            fill="none"
            stroke={raceColor}
            strokeWidth={0.7}
          />
          <text
            x={x + size - badgeR}
            y={y + badgeR}
            fill={raceColor}
            fontSize={size * 0.25}
            fontFamily="Share Tech Mono"
            textAnchor="middle"
            dominantBaseline="middle"
            fontWeight="bold"
            className="select-none"
            style={{ userSelect: "none", WebkitUserSelect: "none" }}
          >
            {crewMember.level}
          </text>
        </g>
      )}
    </g>
  );
}

/**
 * Draws a small profession-specific symbol at the bottom-center of an icon.
 * Each profession has a unique geometric shape, no color coding.
 */
function ProfessionSymbol({
  profession,
  x,
  y,
  size,
}: {
  profession: string;
  x: number;
  y: number;
  size: number;
}) {
  // Bottom-right corner — doesn't overlap the main silhouette
  const r = size * 0.14;
  const bgR = r * 1.4;
  const bx = x + size - bgR;
  const by = y + size - bgR;

  const symbol = (() => {
    switch (profession) {
      case "pilot":
        // Spacesuit helmet: dome arc + collar + visor cutout
        return (
          <g>
            <path
              d={`M ${bx - r} ${by + r * 0.1}
                                A ${r} ${r} 0 0 1 ${bx + r} ${by + r * 0.1}
                                L ${bx + r * 0.72} ${by + r * 0.65}
                                L ${bx - r * 0.72} ${by + r * 0.65}
                                Z`}
              fill="white"
              opacity={0.9}
            />
            {/* Visor */}
            <rect
              x={bx - r * 0.52}
              y={by - r * 0.42}
              width={r * 1.04}
              height={r * 0.36}
              fill="#050810"
              opacity={0.85}
            />
          </g>
        );
      case "engineer":
        // Bolt: wide flat head + narrow shaft
        return (
          <g>
            <rect x={bx - r} y={by - r} width={r * 2} height={r * 0.72} fill="white" opacity={0.9} />
            <rect x={bx - r * 0.28} y={by - r * 0.28} width={r * 0.56} height={r * 1.28} fill="white" opacity={0.9} />
          </g>
        );
      case "medic":
        // Circle with cross ⊕
        return (
          <g>
            <circle cx={bx} cy={by} r={r} fill="none" stroke="white" strokeWidth={r * 0.35} opacity={0.9} />
            <line x1={bx} y1={by - r * 0.6} x2={bx} y2={by + r * 0.6} stroke="white" strokeWidth={r * 0.35} opacity={0.9} />
            <line x1={bx - r * 0.6} y1={by} x2={bx + r * 0.6} y2={by} stroke="white" strokeWidth={r * 0.35} opacity={0.9} />
          </g>
        );
      case "scout":
        // Eye shape with pupil
        return (
          <g>
            <path
              d={`M ${bx - r} ${by} Q ${bx} ${by - r * 0.72} ${bx + r} ${by} Q ${bx} ${by + r * 0.72} ${bx - r} ${by} Z`}
              fill="white"
              opacity={0.9}
            />
            <circle cx={bx} cy={by} r={r * 0.32} fill="#050810" opacity={0.85} />
          </g>
        );
      case "scientist":
        // Microscope: eyepiece circle + tapered body + wide base
        return (
          <g>
            <circle cx={bx} cy={by - r * 0.72} r={r * 0.26} fill="white" opacity={0.9} />
            <path
              d={`M ${bx - r * 0.2} ${by - r * 0.46}
                                L ${bx + r * 0.2} ${by - r * 0.46}
                                L ${bx + r * 0.44} ${by + r * 0.38}
                                L ${bx - r * 0.44} ${by + r * 0.38}
                                Z`}
              fill="white"
              opacity={0.9}
            />
            <rect x={bx - r * 0.78} y={by + r * 0.38} width={r * 1.56} height={r * 0.36} fill="white" opacity={0.9} />
          </g>
        );
      case "gunner":
        // Bullet: pointed tip + rectangular body
        return (
          <g>
            <path
              d={`M ${bx} ${by - r}
                                L ${bx + r * 0.38} ${by - r * 0.3}
                                L ${bx - r * 0.38} ${by - r * 0.3}
                                Z`}
              fill="white"
              opacity={0.9}
            />
            <rect x={bx - r * 0.38} y={by - r * 0.3} width={r * 0.76} height={r * 1.3} fill="white" opacity={0.9} />
          </g>
        );
      default:
        return <circle cx={bx} cy={by} r={r * 0.6} fill="white" opacity={0.5} />;
    }
  })();

  return (
    <g className="select-none">
      <circle cx={bx} cy={by} r={bgR} fill="#050810" opacity={0.7} />
      {symbol}
    </g>
  );
}

/**
 * Draws a race-specific silhouette in SVG.
 * cx, scy — center of the silhouette area; sf — half-height of that area; y — top of the icon.
 * All coordinates are scaled relative to sf so the silhouette works at any icon size.
 */
function getRaceSilhouette(
  cx: number,
  scy: number,
  sf: number,
  y: number,
  race: string,
  color: string,
): React.ReactElement {
  switch (race) {
    case "human": {
      // Round head + shoulder bust
      const hr = sf * 0.32;
      const headCy = scy - sf * 0.32;
      const bodyTopY = scy - sf * 0.02;
      return (
        <g>
          <circle cx={cx} cy={headCy} r={hr} fill={color} />
          <path
            d={`M ${cx - sf * 0.6} ${scy + sf * 0.88}
                            C ${cx - sf * 0.6} ${bodyTopY} ${cx - sf * 0.25} ${bodyTopY} ${cx} ${bodyTopY}
                            C ${cx + sf * 0.25} ${bodyTopY} ${cx + sf * 0.6} ${bodyTopY} ${cx + sf * 0.6} ${scy + sf * 0.88}
                            Z`}
            fill={color}
          />
        </g>
      );
    }

    case "synthetic": {
      // Square robot head + antenna + body
      const hw = sf * 0.52;
      const hh = sf * 0.48;
      const headTop = scy - sf * 0.78;
      const headBottom = headTop + hh * 2;
      return (
        <g>
          {/* Antenna */}
          <line x1={cx} y1={y} x2={cx} y2={headTop} stroke={color} strokeWidth={sf * 0.1} />
          <circle cx={cx} cy={y + sf * 0.06} r={sf * 0.1} fill={color} />
          {/* Head box */}
          <rect x={cx - hw} y={headTop} width={hw * 2} height={hh * 2} fill={color} />
          {/* Eye slits (negative space) */}
          <rect x={cx - hw * 0.62} y={scy - hh * 0.38} width={hw * 0.45} height={hh * 0.42} fill="#080d16" />
          <rect x={cx + hw * 0.17} y={scy - hh * 0.38} width={hw * 0.45} height={hh * 0.42} fill="#080d16" />
          {/* Neck + shoulder plate */}
          <rect x={cx - hw * 0.38} y={headBottom} width={hw * 0.76} height={sf * 0.22} fill={color} />
          <rect x={cx - hw * 0.88} y={headBottom + sf * 0.17} width={hw * 1.76} height={sf * 0.42} fill={color} />
        </g>
      );
    }

    case "krylorian": {
      // Elongated reptilian head + dorsal crest spikes
      return (
        <g>
          {/* Main head shape */}
          <path
            d={`M ${cx} ${y + sf * 0.08}
                            L ${cx + sf * 0.55} ${scy - sf * 0.18}
                            L ${cx + sf * 0.5} ${scy + sf * 0.35}
                            L ${cx + sf * 0.42} ${scy + sf * 0.88}
                            L ${cx - sf * 0.42} ${scy + sf * 0.88}
                            L ${cx - sf * 0.5} ${scy + sf * 0.35}
                            L ${cx - sf * 0.55} ${scy - sf * 0.18}
                            Z`}
            fill={color}
          />
          {/* Dorsal crest — 3 small spikes */}
          <path
            d={`M ${cx - sf * 0.22} ${y + sf * 0.08}
                            L ${cx - sf * 0.12} ${y}
                            L ${cx - sf * 0.02} ${y + sf * 0.08}
                            L ${cx + sf * 0.08} ${y}
                            L ${cx + sf * 0.18} ${y + sf * 0.08}
                            L ${cx + sf * 0.28} ${y}
                            L ${cx + sf * 0.33} ${y + sf * 0.08}`}
            fill={color}
          />
        </g>
      );
    }

    case "crystalline": {
      // Crystal cluster — central tall spire + two flanking spires
      return (
        <g>
          {/* Left spire */}
          <polygon
            points={`${cx - sf * 0.18},${y + sf * 0.28} ${cx - sf * 0.62},${y + sf * 0.52} ${cx - sf * 0.62},${scy + sf * 0.88} ${cx - sf * 0.14},${scy + sf * 0.88}`}
            fill={color}
          />
          {/* Right spire */}
          <polygon
            points={`${cx + sf * 0.18},${y + sf * 0.28} ${cx + sf * 0.62},${y + sf * 0.52} ${cx + sf * 0.62},${scy + sf * 0.88} ${cx + sf * 0.14},${scy + sf * 0.88}`}
            fill={color}
          />
          {/* Center spire (tallest) */}
          <polygon
            points={`${cx},${y} ${cx + sf * 0.3},${y + sf * 0.45} ${cx + sf * 0.24},${scy + sf * 0.88} ${cx - sf * 0.24},${scy + sf * 0.88} ${cx - sf * 0.3},${y + sf * 0.45}`}
            fill={color}
          />
          {/* Facet line on center spire */}
          <line x1={cx} y1={y} x2={cx} y2={scy + sf * 0.88} stroke="#080d16" strokeWidth={sf * 0.08} opacity={0.55} />
        </g>
      );
    }

    case "voidborn": {
      // Ethereal oval form + large slit eye + wispy tendrils
      return (
        <g>
          {/* Main ethereal form */}
          <ellipse cx={cx} cy={scy - sf * 0.05} rx={sf * 0.68} ry={sf * 0.72} fill={color} opacity={0.75} />
          {/* Wispy tendrils at bottom */}
          <line x1={cx - sf * 0.24} y1={scy + sf * 0.62} x2={cx - sf * 0.34} y2={scy + sf * 0.9} stroke={color} strokeWidth={sf * 0.12} strokeLinecap="round" />
          <line x1={cx} y1={scy + sf * 0.67} x2={cx} y2={scy + sf * 0.92} stroke={color} strokeWidth={sf * 0.12} strokeLinecap="round" />
          <line x1={cx + sf * 0.24} y1={scy + sf * 0.62} x2={cx + sf * 0.34} y2={scy + sf * 0.9} stroke={color} strokeWidth={sf * 0.12} strokeLinecap="round" />
          {/* Eye socket */}
          <ellipse cx={cx} cy={scy - sf * 0.1} rx={sf * 0.36} ry={sf * 0.25} fill="#080d16" />
          {/* Vertical slit pupil */}
          <ellipse cx={cx} cy={scy - sf * 0.1} rx={sf * 0.1} ry={sf * 0.21} fill={color} opacity={0.9} />
        </g>
      );
    }

    case "xenosymbiont": {
      // Organic blob body + tentacles hanging from the base
      return (
        <g>
          {/* Main blob */}
          <path
            d={`M ${cx} ${y + sf * 0.05}
                            C ${cx + sf * 0.68} ${y + sf * 0.05} ${cx + sf * 0.74} ${scy + sf * 0.05} ${cx + sf * 0.63} ${scy + sf * 0.45}
                            C ${cx + sf * 0.5} ${scy + sf * 0.65} ${cx + sf * 0.14} ${scy + sf * 0.55} ${cx + sf * 0.05} ${scy + sf * 0.6}
                            C ${cx - sf * 0.05} ${scy + sf * 0.55} ${cx - sf * 0.5} ${scy + sf * 0.65} ${cx - sf * 0.63} ${scy + sf * 0.45}
                            C ${cx - sf * 0.74} ${scy + sf * 0.05} ${cx - sf * 0.68} ${y + sf * 0.05} ${cx} ${y + sf * 0.05}
                            Z`}
            fill={color}
          />
          {/* 3 tentacles */}
          <path d={`M ${cx - sf * 0.28} ${scy + sf * 0.58} Q ${cx - sf * 0.44} ${scy + sf * 0.8} ${cx - sf * 0.34} ${scy + sf * 0.93}`} stroke={color} strokeWidth={sf * 0.15} fill="none" strokeLinecap="round" />
          <path d={`M ${cx} ${scy + sf * 0.6} Q ${cx} ${scy + sf * 0.82} ${cx + sf * 0.08} ${scy + sf * 0.93}`} stroke={color} strokeWidth={sf * 0.15} fill="none" strokeLinecap="round" />
          <path d={`M ${cx + sf * 0.28} ${scy + sf * 0.58} Q ${cx + sf * 0.44} ${scy + sf * 0.8} ${cx + sf * 0.34} ${scy + sf * 0.93}`} stroke={color} strokeWidth={sf * 0.15} fill="none" strokeLinecap="round" />
          {/* Organic spot markings */}
          <circle cx={cx - sf * 0.15} cy={scy - sf * 0.24} r={sf * 0.1} fill="#080d16" opacity={0.5} />
          <circle cx={cx + sf * 0.24} cy={scy + sf * 0.04} r={sf * 0.08} fill="#080d16" opacity={0.5} />
        </g>
      );
    }

    default:
      return <circle cx={cx} cy={scy} r={sf * 0.7} fill={color} />;
  }
}
