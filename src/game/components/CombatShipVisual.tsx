"use client";

import { useRef, useEffect } from "react";
import type { Module, CrewMember, EnemyModule } from "../types";
import { MODULE_TYPES } from "../constants/modules";
import { RACES } from "../constants/races";
import { useTranslation } from "@/lib/useTranslation";
import { getModuleTranslation } from "@/lib/moduleTranslations";
import {
  drawSymbiosisModuleOverlay,
  hasMergedXenosymbiont,
} from "./SymbiosisModuleOverlay";
import { setupHiDPICanvas } from "./canvas-utils";

interface CombatShipVisualProps {
  modules: Module[] | EnemyModule[];
  crew: CrewMember[];
  isEnemy?: boolean;
  isBoss?: boolean;
  onModuleClick?: (moduleId: number) => void;
  title: string;
  shields?: number;
  hitFlash?: "shield" | "hull" | null;
  selectedModuleId?: number;
  damageHit?: {
    eventId?: number;
    moduleId: number;
    shieldDamage: number;
    hullDamage: number;
    isCrit?: boolean;
    missed?: boolean;
  } | null;
}

export function CombatShipVisual({
  modules,
  crew,
  isEnemy = false,
  isBoss = false,
  onModuleClick,
  title,
  shields,
  hitFlash,
  selectedModuleId,
  damageHit,
}: CombatShipVisualProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentLanguage } = useTranslation();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cellSize = 120;

    const gap = 4;
    const gridSize = Math.ceil(Math.sqrt(modules.length));
    const canvasSize = gridSize * (cellSize + gap) - gap;

    setupHiDPICanvas(canvas, ctx, canvasSize, canvasSize);

    // Draw modules
    modules.forEach((mod, idx) => {
      const col = idx % gridSize;
      const row = Math.floor(idx / gridSize);
      const x = col * (cellSize + gap);
      const y = row * (cellSize + gap);

      const isDestroyed = mod.health <= 0;
      const moduleStyle = (
        MODULE_TYPES as Record<string, { color: string; borderColor: string }>
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

      if (!isEnemy && hasMergedXenosymbiont(crew, mod.id)) {
        drawSymbiosisModuleOverlay(ctx, x, y, cellSize, cellSize);
      }

      // Module name - split into multiple lines if needed
      ctx.fillStyle = isDestroyed ? "#555555" : moduleStyle.borderColor;
      ctx.font = "bold 13px Share Tech Mono";
      ctx.textAlign = "center";
      const shortName = getModuleTranslation(
        mod.type,
        currentLanguage,
        mod.name,
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
              const wordWidth = ctx.measureText(words[i] + " ").width;
              if (line1Width + wordWidth <= maxWidth) {
                line1Width += wordWidth;
                splitIdx = i + 1;
              } else {
                break;
              }
            }

            const line1 =
              splitIdx > 0 ? words.slice(0, splitIdx).join(" ") : words[0];
            const line2 =
              splitIdx > 0
                ? words.slice(splitIdx).join(" ")
                : shortName.substring(Math.floor(shortName.length / 2));

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
      // Selected module highlight
      if (mod.id === selectedModuleId && !isDestroyed) {
        ctx.strokeStyle = "#00d4ff";
        ctx.lineWidth = 4;
        ctx.shadowColor = "#00d4ff";
        ctx.shadowBlur = 14;
        ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        ctx.shadowBlur = 0;
      }
    });
  }, [modules, crew, isEnemy, isBoss, currentLanguage, selectedModuleId]);

  const visualGridSize = Math.ceil(Math.sqrt(modules.length));
  const visualCellSize = 120;
  const visualGap = 4;
  const visualCanvasSize =
    visualGridSize * (visualCellSize + visualGap) - visualGap;
  const hitModuleIndex =
    damageHit && (damageHit.hullDamage > 0 || damageHit.missed)
      ? modules.findIndex((mod) => mod.id === damageHit.moduleId)
      : -1;
  const hitModuleCol =
    hitModuleIndex >= 0 ? hitModuleIndex % visualGridSize : 0;
  const hitModuleRow =
    hitModuleIndex >= 0 ? Math.floor(hitModuleIndex / visualGridSize) : 0;
  const hitModuleCenterX =
    hitModuleCol * (visualCellSize + visualGap) + visualCellSize / 2;
  const hitModuleCenterY =
    hitModuleRow * (visualCellSize + visualGap) + visualCellSize / 2;

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onModuleClick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Canvas may be CSS-scaled (max-w-full); map display px -> logical draw px.
    const scale = visualCanvasSize / rect.width || 1;
    const x = (e.clientX - rect.left) * scale;
    const y = (e.clientY - rect.top) * scale;

    const cellSize = 120;
    const gap = 4;
    const inset = 2;
    const gridSize = visualGridSize;

    modules.forEach((mod, idx) => {
      const col = idx % gridSize;
      const row = Math.floor(idx / gridSize);
      const modX = col * (cellSize + gap);
      const modY = row * (cellSize + gap);

      if (
        x >= modX + inset &&
        x <= modX + cellSize - inset &&
        y >= modY + inset &&
        y <= modY + cellSize - inset &&
        mod.health > 0
      ) {
        onModuleClick(mod.id);
      }
    });
  };

  const hasShields = (shields ?? 0) > 0;
  const shieldGlow = hasShields
    ? "0 0 18px 6px rgba(30,120,255,0.7), 0 0 40px 12px rgba(0,80,220,0.35)"
    : "none";

  return (
    <div className="flex flex-col items-center">
      {title && (
        <div
          className={`text-base font-bold mb-4 px-4 py-2 rounded ${
            isEnemy
              ? isBoss
                ? "bg-[rgba(255,0,255,0.2)] text-[#ff00ff]"
                : "bg-[rgba(255,0,64,0.2)] text-destructive"
              : "bg-[rgba(0,255,65,0.2)] text-ring"
          }`}
        >
          {title}
        </div>
      )}
      <div
        className="relative"
        style={{ boxShadow: shieldGlow, transition: "box-shadow 0.4s ease" }}
      >
        <canvas
          ref={canvasRef}
          className={`max-w-full ${onModuleClick ? "cursor-pointer" : "cursor-default"}`}
          onClick={handleCanvasClick}
        />
        {hitFlash && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor:
                hitFlash === "shield"
                  ? "rgba(30,120,255,0.45)"
                  : "rgba(255,0,64,0.45)",
              animation: "combatHitFlash 0.5s ease-out forwards",
            }}
          />
        )}
        {damageHit && damageHit.shieldDamage > 0 && (
          <div
            key={`shield-${damageHit.eventId}`}
            className={`combat-damage-number pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 font-['Orbitron'] text-[#66aaff] ${
              damageHit.isCrit ? "text-xl font-black" : "text-sm font-bold"
            }`}
            style={{
              textShadow: "0 0 8px #0080ff, 0 0 14px #0080ff",
            }}
          >
            -{damageHit.shieldDamage}
          </div>
        )}
        {damageHit &&
          (damageHit.hullDamage > 0 || damageHit.missed) &&
          hitModuleIndex >= 0 && (
            <div
              key={`hull-${damageHit.eventId}`}
              className={`combat-damage-number pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 font-['Orbitron'] ${
                damageHit.missed
                  ? "text-[10px] font-bold text-[#889988]"
                  : damageHit.isCrit
                    ? "text-xl font-black text-[#ffccd5]"
                    : "text-sm font-bold text-[#ffccd5]"
              }`}
              style={{
                left: `${(hitModuleCenterX / visualCanvasSize) * 100}%`,
                top: `${(hitModuleCenterY / visualCanvasSize) * 100}%`,
                textShadow: damageHit.missed
                  ? "0 0 8px #445544"
                  : "0 0 8px #ff0040, 0 0 14px #ff0040",
              }}
            >
              {damageHit.missed ? "ПРОМАХ" : `-${damageHit.hullDamage}`}
            </div>
          )}
      </div>
    </div>
  );
}
