"use client";

import { useRef, useEffect } from "react";
import type { Module, CrewMember } from "../types";
import type { EnemyModule } from "../types/combat";
import { MODULE_TYPES } from "../constants/modules";
import { RACES } from "../constants/races";
import { useTranslation } from "@/lib/useTranslation";
import { getModuleTranslation } from "@/lib/moduleTranslations";

interface CombatShipVisualProps {
    modules: Module[] | EnemyModule[];
    crew: CrewMember[];
    isEnemy?: boolean;
    isBoss?: boolean;
    onModuleClick?: (moduleId: number) => void;
    canSelectTarget: boolean;
    title: string;
}

export function CombatShipVisual({
    modules,
    crew,
    isEnemy = false,
    isBoss = false,
    onModuleClick,
    canSelectTarget,
    title,
}: CombatShipVisualProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { t, currentLanguage } = useTranslation();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const cellSize = 120;

        const gap = 4;
        const gridSize = Math.ceil(Math.sqrt(modules.length));
        const canvasSize = gridSize * (cellSize + gap) - gap;

        canvas.width = canvasSize;
        canvas.height = canvasSize;

        // Draw modules
        modules.forEach((mod, idx) => {
            const col = idx % gridSize;
            const row = Math.floor(idx / gridSize);
            const x = col * (cellSize + gap);
            const y = row * (cellSize + gap);

            const isDestroyed = mod.health <= 0;
            const moduleStyle = (
                MODULE_TYPES as Record<
                    string,
                    { color: string; borderColor: string }
                >
            )[mod.type] || {
                color: "#333333aa",
                borderColor: "#888888",
            };

            // Module background - use actual color from MODULE_TYPES
            ctx.fillStyle = isDestroyed ? "#1a1a2e" : moduleStyle.color;
            ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

            // Module border
            ctx.strokeStyle = isDestroyed
                ? "#444444"
                : isEnemy
                  ? "#ff0040"
                  : moduleStyle.borderColor;
            ctx.lineWidth = isDestroyed ? 2 : 3;
            ctx.strokeRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

            // Module name - split into multiple lines if needed
            ctx.fillStyle = isDestroyed ? "#555555" : moduleStyle.borderColor;
            ctx.font = "bold 13px Share Tech Mono";
            ctx.textAlign = "center";
            const shortName = getModuleTranslation(
                mod.type,
                currentLanguage,
            ).name;

            // Optimized: Quick length check first (faster than measureText)
            const maxWidth = cellSize - 16;

            if (shortName.length <= 11) {
                // Short enough - definitely fits in one line
                ctx.fillText(shortName, x + cellSize / 2, y + 20);
            } else {
                // Measure to be sure
                const metrics = ctx.measureText(shortName);

                if (metrics.width <= maxWidth) {
                    // Fits in one line
                    ctx.fillText(shortName, x + cellSize / 2, y + 20);
                } else {
                    // Split into two lines - optimized version
                    const words = shortName.split(" ");

                    if (words.length > 1) {
                        // Find split point - measure each word only once
                        let line1Width = 0;
                        let splitIdx = 0;

                        for (let i = 0; i < words.length; i++) {
                            const wordWidth = ctx.measureText(
                                words[i] + " ",
                            ).width;
                            if (line1Width + wordWidth <= maxWidth) {
                                line1Width += wordWidth;
                                splitIdx = i + 1;
                            } else {
                                break;
                            }
                        }

                        const line1 =
                            splitIdx > 0
                                ? words.slice(0, splitIdx).join(" ")
                                : words[0];
                        const line2 =
                            splitIdx > 0
                                ? words.slice(splitIdx).join(" ")
                                : shortName.substring(
                                      Math.floor(shortName.length / 2),
                                  );

                        ctx.fillText(line1, x + cellSize / 2, y + 18);
                        ctx.fillText(line2, x + cellSize / 2, y + 32);
                    } else {
                        // Single long word - split in half
                        const halfLen = Math.floor(shortName.length / 2);
                        ctx.fillText(
                            shortName.substring(0, halfLen),
                            x + cellSize / 2,
                            y + 18,
                        );
                        ctx.fillText(
                            shortName.substring(halfLen),
                            x + cellSize / 2,
                            y + 32,
                        );
                    }
                }
            }

            // Health bar
            const healthBarWidth = cellSize - 20;
            const healthPercent = mod.health / (mod.maxHealth || 100);
            ctx.fillStyle = "#0a0f1a";
            ctx.fillRect(x + 10, y + cellSize - 18, healthBarWidth, 8);
            ctx.fillStyle = isDestroyed
                ? "#444444"
                : mod.health > 50
                  ? "#00ff41"
                  : "#ffb000";
            ctx.fillRect(
                x + 10,
                y + cellSize - 18,
                healthBarWidth * healthPercent,
                8,
            );

            // Destroyed overlay
            if (isDestroyed) {
                ctx.fillStyle = "rgba(255,0,64,0.4)";
                ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);
                ctx.fillStyle = "#ff0040";
                ctx.font = "bold 26px Share Tech Mono";
                ctx.fillText("💀", x + cellSize / 2, y + cellSize / 2 + 8);
            }

            // Crew icons
            const crewInModule = crew.filter((c) => c.moduleId === mod.id);
            if (crewInModule.length > 0 && !isDestroyed) {
                const iconSize = 22;
                crewInModule.forEach((c, cIdx) => {
                    const race = RACES[c.race];
                    const crewX = x + 6 + cIdx * (iconSize + 4);
                    const crewY = y + 6;
                    const crewColor = race?.color || "#00ff41";

                    // Crew shape based on profession
                    ctx.fillStyle = crewColor;
                    ctx.beginPath();
                    if (c.profession === "gunner" || c.profession === "pilot") {
                        // Triangle
                        ctx.moveTo(crewX + iconSize / 2, crewY);
                        ctx.lineTo(crewX + iconSize, crewY + iconSize);
                        ctx.lineTo(crewX, crewY + iconSize);
                    } else if (c.profession === "engineer") {
                        // Square
                        ctx.fillRect(crewX, crewY, iconSize, iconSize);
                    } else {
                        // Circle
                        ctx.arc(
                            crewX + iconSize / 2,
                            crewY + iconSize / 2,
                            iconSize / 2,
                            0,
                            Math.PI * 2,
                        );
                    }
                    ctx.fill();

                    // Assignment indicator
                    if (c.assignment) {
                        ctx.strokeStyle = "#ffb000";
                        ctx.lineWidth = 2;
                        ctx.strokeRect(crewX, crewY, iconSize, iconSize);
                    }

                    // First letter
                    ctx.fillStyle = "#050810";
                    ctx.font = "bold 12px Share Tech Mono";
                    ctx.textAlign = "center";
                    ctx.fillText(
                        c.name.charAt(0).toUpperCase(),
                        crewX + iconSize / 2,
                        crewY + iconSize / 2 + 3,
                    );
                });
            }
        });
    }, [modules, crew, isEnemy, isBoss, currentLanguage]);

    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!canSelectTarget || !onModuleClick) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const cellSize = 120;
        const padding = 2;
        const gridSize = Math.ceil(Math.sqrt(modules.length));

        modules.forEach((mod, idx) => {
            const col = idx % gridSize;
            const row = Math.floor(idx / gridSize);
            const modX = padding + col * (cellSize + 5);
            const modY = padding + row * (cellSize + 5);

            if (
                x >= modX + 4 &&
                x <= modX + cellSize - 4 &&
                y >= modY + 4 &&
                y <= modY + cellSize - 4 &&
                mod.health > 0
            ) {
                onModuleClick(mod.id);
            }
        });
    };

    return (
        <div className="flex flex-col items-center">
            {title && (
                <div
                    className={`text-base font-bold mb-4 px-4 py-2 rounded ${
                        isEnemy
                            ? isBoss
                                ? "bg-[rgba(255,0,255,0.2)] text-[#ff00ff]"
                                : "bg-[rgba(255,0,64,0.2)] text-[#ff0040]"
                            : "bg-[rgba(0,255,65,0.2)] text-[#00d4ff]"
                    }`}
                >
                    {title}
                </div>
            )}
            <canvas
                ref={canvasRef}
                width={400}
                height={400}
                className={`max-w-full ${
                    canSelectTarget && onModuleClick
                        ? "cursor-pointer"
                        : "cursor-not-allowed"
                }`}
                onClick={handleCanvasClick}
            />
            {!canSelectTarget && isEnemy && (
                <div className="text-[11px] text-[#ffaa00] mt-2 text-center">
                    {t("combat.random_target")}
                </div>
            )}
        </div>
    );
}
