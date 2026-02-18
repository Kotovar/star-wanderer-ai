"use client";

import { useRef, useState } from "react";
import { useGameStore } from "../store";
import { MODULE_TYPES, WEAPON_TYPES, RACES } from "../constants";
import type { Module, CrewMember } from "../types";

const CELL_SIZE = 100;

export function ShipGrid() {
    const ship = useGameStore((s) => s.ship);
    const modules = useGameStore((s) => s.ship.modules);
    const gridSize = useGameStore((s) => s.ship.gridSize);
    const crew = useGameStore((s) => s.crew);
    const moveModule = useGameStore((s) => s.moveModule);
    const canPlaceModule = useGameStore((s) => s.canPlaceModule);
    const currentCombat = useGameStore((s) => s.currentCombat);

    const [draggedModule, setDraggedModule] = useState<Module | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [tempPos, setTempPos] = useState<{ x: number; y: number } | null>(
        null,
    );

    const isCombatMode = !!currentCombat;

    // SVG dimensions
    const svgSize = gridSize * CELL_SIZE;

    const handleMouseDown = (e, module) => {
        // Получаем <svg> из текущего <g>
        const svg = (e.currentTarget as SVGGraphicsElement).ownerSVGElement;
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
            className={`p-1 md:p-2 select-none transition-colors overflow-hidden max-w-full w-full ${
                ship?.moduleMovedThisTurn
                    ? "bg-[#050810] border border-[#ffb000]"
                    : "bg-[#050810] border border-[#00ff41]"
            }`}
        >
            <svg
                width={gridSize * CELL_SIZE}
                height={gridSize * CELL_SIZE}
                viewBox={`0 0 ${gridSize * CELL_SIZE} ${gridSize * CELL_SIZE}`}
                className={`w-full h-auto select-none max-h-[400px] md:max-h-none ${
                    isCombatMode
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
                        />
                    </g>
                ))}
            </svg>

            {isCombatMode && (
                <div className="text-[#ff0040] text-[10px] mt-1 text-center">
                    ⚠️ Нельзя перемещать модули во время боя!
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
}

function ModuleRenderer({
    module,
    cellSize,
    crew,
    isDragging,
    tempPos,
}: ModuleRendererProps) {
    // Use tempPos when dragging, otherwise use module's original position
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
                {module.name}
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

            {module.disabled && <DisabledOverlay x={x} y={y} w={w} h={h} />}
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
    weapons: Array<{ type: string } | null>;
    x: number;
    y: number;
    w: number;
    h: number;
}) {
    const iconY = y + h / 2 + 10;
    const spacing = w / (weapons.length + 1);

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
    const healthBarWidth = w - 20;
    const healthWidth = (module.health / 100) * healthBarWidth;

    return (
        <>
            <rect
                x={x + 10}
                y={y + h - 15}
                width={healthBarWidth}
                height={5}
                fill="#ff0040"
            />
            <rect
                x={x + 10}
                y={y + h - 15}
                width={healthWidth}
                height={5}
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
    const iconSize = 18;
    const startX = x + w - (crew.length * (iconSize + 4) + 4);
    const startY = y + 4;

    return (
        <>
            {crew.map((c, idx) => (
                <CrewIcon
                    key={c.id}
                    crewMember={c}
                    x={startX + idx * (iconSize + 4)}
                    y={startY}
                    size={iconSize}
                />
            ))}
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
    const color = race?.color || "#00ff41";
    const cx = x + size / 2;
    const cy = y + size / 2;
    const s = size / 2;

    return (
        <g
            className="select-none"
            style={{ userSelect: "none", WebkitUserSelect: "none" }}
        >
            <path
                d={getProfessionPath(cx, cy, s, crewMember.profession)}
                fill={color}
                className="select-none"
            />
            {crewMember.assignment && (
                <circle
                    cx={cx}
                    cy={cy}
                    r={s}
                    fill="none"
                    stroke="#ffb000"
                    strokeWidth={2}
                    className="select-none"
                />
            )}
            <text
                x={cx}
                y={cy}
                fill="#050810"
                fontSize="9"
                fontFamily="Share Tech Mono"
                textAnchor="middle"
                fontWeight="bold"
                dominantBaseline="middle"
                className="select-none"
                style={{ userSelect: "none", WebkitUserSelect: "none" }}
            >
                {crewMember.name.charAt(0).toUpperCase()}
            </text>
        </g>
    );
}

function getProfessionPath(
    cx: number,
    cy: number,
    s: number,
    profession: string,
): string {
    switch (profession) {
        case "pilot":
            return `M ${cx} ${cy - s} L ${cx + s} ${cy + s * 0.7} L ${cx - s} ${cy + s * 0.7} Z`;
        case "engineer":
            return `M ${cx - s * 0.8} ${cy - s * 0.8} L ${cx + s * 0.8} ${cy - s * 0.8} L ${cx + s * 0.8} ${cy + s * 0.8} L ${cx - s * 0.8} ${cy + s * 0.8} Z`;
        case "medic":
            return `M ${cx} ${cy - s} L ${cx + s} ${cy} L ${cx} ${cy + s} L ${cx - s} ${cy} Z`;
        case "scout": {
            let path = "";
            for (let i = 0; i < 5; i++) {
                const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                const px = cx + s * Math.cos(angle);
                const py = cy + s * Math.sin(angle);
                path += i === 0 ? `M ${px} ${py} ` : `L ${px} ${py} `;
            }
            return path + "Z";
        }
        case "scientist": {
            let path = "";
            for (let i = 0; i < 6; i++) {
                const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
                const px = cx + s * Math.cos(angle);
                const py = cy + s * Math.sin(angle);
                path += i === 0 ? `M ${px} ${py} ` : `L ${px} ${py} `;
            }
            return path + "Z";
        }
        default:
            return `M ${cx - s} ${cy} A ${s} ${s} 0 1 1 ${cx + s} ${cy} A ${s} ${s} 0 1 1 ${cx - s} ${cy}`;
    }
}
