"use client";

import { useRef, useEffect } from "react";
import { useGameStore } from "../store";
import {
    drawLegend,
    drawSector,
    drawTierRings,
    canSeeTier4,
} from "./galaxy-map-utils";

// Generate stars once and reuse them
function generateStars(
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    maxRadius: number,
) {
    const stars: Array<{
        x: number;
        y: number;
        radius: number;
        brightness: number;
    }> = [];

    for (let i = 0; i < 300; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const distFromCenter = Math.sqrt(
            (x - centerX) ** 2 + (y - centerY) ** 2,
        );
        if (distFromCenter > maxRadius * 1.1) {
            stars.push({
                x,
                y,
                radius: Math.random() * 1.2,
                brightness: Math.random() * 0.5,
            });
        }
    }

    return stars;
}

export function GalaxyMap() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const starsRef = useRef<Array<{
        x: number;
        y: number;
        radius: number;
        brightness: number;
    }> | null>(null);
    const initializedRef = useRef(false);
    const canvasSizeRef = useRef({ width: 0, height: 0 });

    const sectors = useGameStore((s) => s.galaxy.sectors);
    const currentSector = useGameStore((s) => s.currentSector);
    const selectSector = useGameStore((s) => s.selectSector);
    const modules = useGameStore((s) => s.ship.modules);
    const artifacts = useGameStore((s) => s.artifacts);
    const captainLevel = useGameStore(
        (s) => s.crew.find((c) => c.profession === "pilot")?.level ?? 1,
    );
    const fuel = useGameStore((s) => s.ship.fuel);
    const calculateFuelCost = useGameStore((s) => s.calculateFuelCost);
    const areEnginesFunctional = useGameStore((s) => s.areEnginesFunctional);
    const areFuelTanksFunctional = useGameStore(
        (s) => s.areFuelTanksFunctional,
    );

    // Initialize canvas size once
    useEffect(() => {
        const container = containerRef.current;
        if (!container || initializedRef.current) return;

        const rect = container.getBoundingClientRect();
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);

        canvasSizeRef.current = { width, height };
        initializedRef.current = true;
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container || !initializedRef.current) return;

        // Use cached canvas size to prevent drift
        const { width, height } = canvasSizeRef.current;

        // Set canvas size only if changed
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) * 0.42;

        // Generate stars once when container size changes
        if (!starsRef.current || starsRef.current.length === 0) {
            starsRef.current = generateStars(
                width,
                height,
                centerX,
                centerY,
                maxRadius,
            );
        }

        // Clear canvas
        ctx.fillStyle = "#050810";
        ctx.fillRect(0, 0, width, height);

        // Draw static background gradients
        for (let i = 0; i < 3; i++) {
            const gradient = ctx.createRadialGradient(
                centerX,
                centerY,
                0,
                centerX,
                centerY,
                maxRadius * 1.2,
            );
            gradient.addColorStop(0, "rgba(100, 50, 150, 0.03)");
            gradient.addColorStop(0.5, "rgba(50, 100, 150, 0.02)");
            gradient.addColorStop(1, "transparent");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        }

        // Draw stars from cached array
        if (starsRef.current) {
            starsRef.current.forEach((star) => {
                ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + star.brightness})`;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // Draw dynamic elements
        drawTierRings(
            ctx,
            centerX,
            centerY,
            maxRadius,
            modules,
            captainLevel,
            artifacts,
        );
        drawCenterMarker(ctx, centerX, centerY);
        drawSectors(
            ctx,
            sectors,
            centerX,
            centerY,
            maxRadius,
            modules,
            captainLevel,
            fuel,
            calculateFuelCost,
            areEnginesFunctional,
            areFuelTanksFunctional,
            currentSector,
            artifacts,
        );
        drawLegend(ctx, width, height, modules, captainLevel, fuel, artifacts);
    }, [
        sectors,
        currentSector,
        modules,
        artifacts,
        captainLevel,
        fuel,
        calculateFuelCost,
        areEnginesFunctional,
        areFuelTanksFunctional,
    ]);

    const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        for (const sector of sectors) {
            if (sector.mapX === undefined || sector.mapY === undefined)
                continue;
            const dist = Math.sqrt(
                (clickX - sector.mapX) ** 2 + (clickY - sector.mapY) ** 2,
            );
            if (dist < 35) {
                selectSector(sector.id);
                break;
            }
        }
    };

    return (
        <div ref={containerRef} className="w-full h-full flex-1">
            <canvas
                ref={canvasRef}
                className="border-2 border-[#00ff41] bg-[#050810] cursor-pointer w-full h-full"
                onClick={handleClick}
            />
        </div>
    );
}

function drawCenterMarker(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#00ff41";
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawSectors(
    ctx: CanvasRenderingContext2D,
    sectors: ReturnType<typeof useGameStore.getState>["galaxy"]["sectors"],
    centerX: number,
    centerY: number,
    maxRadius: number,
    modules: ReturnType<typeof useGameStore.getState>["ship"]["modules"],
    captainLevel: number,
    fuel: number,
    calculateFuelCost: (targetTier: number) => number,
    areEnginesFunctional: () => boolean,
    areFuelTanksFunctional: () => boolean,
    currentSector: ReturnType<typeof useGameStore.getState>["currentSector"],
    artifacts: ReturnType<typeof useGameStore.getState>["artifacts"],
) {
    const canSeeT4 = canSeeTier4(modules, artifacts);

    sectors.forEach((sector) => {
        // Hide tier 4 sectors until scanner level 4 or all-seeing artifact
        if (sector.tier === 4 && !canSeeT4) return;

        drawSector(
            ctx,
            sector,
            centerX,
            centerY,
            maxRadius,
            modules,
            captainLevel,
            fuel,
            calculateFuelCost,
            areEnginesFunctional,
            areFuelTanksFunctional,
            sector.id === currentSector?.id,
        );
    });
}
