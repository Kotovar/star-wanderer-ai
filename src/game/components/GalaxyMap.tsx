"use client";

import { useRef, useEffect } from "react";
import { useGameStore } from "../store";
import { drawLegend, drawSector, drawTierRings } from "./galaxy-map-utils";

export function GalaxyMap() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const sectors = useGameStore((s) => s.galaxy.sectors);
    const currentSector = useGameStore((s) => s.currentSector);
    const selectSector = useGameStore((s) => s.selectSector);
    const engineTier = useGameStore((s) => s.ship.engineTier);
    const captainLevel = useGameStore(
        (s) => s.crew.find((c) => c.profession === "pilot")?.level ?? 1,
    );
    const fuel = useGameStore((s) => s.ship.fuel);
    const calculateFuelCost = useGameStore((s) => s.calculateFuelCost);
    const areEnginesFunctional = useGameStore((s) => s.areEnginesFunctional);
    const areFuelTanksFunctional = useGameStore(
        (s) => s.areFuelTanksFunctional,
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = container.clientWidth;
        const height = container.clientHeight;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(width, height) * 0.42;

        drawBackground(ctx, width, height, centerX, centerY, maxRadius);
        drawTierRings(
            ctx,
            centerX,
            centerY,
            maxRadius,
            engineTier,
            captainLevel,
        );
        drawCenterMarker(ctx, centerX, centerY);
        drawSectors(
            ctx,
            sectors,
            centerX,
            centerY,
            maxRadius,
            engineTier,
            captainLevel,
            fuel,
            calculateFuelCost,
            areEnginesFunctional,
            areFuelTanksFunctional,
            currentSector,
        );
        drawLegend(ctx, width, height, engineTier, captainLevel, fuel);
    }, [
        sectors,
        currentSector,
        engineTier,
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

function drawBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    centerX: number,
    centerY: number,
    maxRadius: number,
) {
    ctx.fillStyle = "#050810";
    ctx.fillRect(0, 0, width, height);

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

    for (let i = 0; i < 300; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const distFromCenter = Math.sqrt(
            (x - centerX) ** 2 + (y - centerY) ** 2,
        );
        if (distFromCenter > maxRadius * 1.1) {
            const brightness = Math.random() * 0.5;
            ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + brightness})`;
            ctx.beginPath();
            ctx.arc(x, y, Math.random() * 1.2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
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
    engineTier: number,
    captainLevel: number,
    fuel: number,
    calculateFuelCost: () => number,
    areEnginesFunctional: () => boolean,
    areFuelTanksFunctional: () => boolean,
    currentSector: ReturnType<typeof useGameStore.getState>["currentSector"],
) {
    sectors.forEach((sector) => {
        drawSector(
            ctx,
            sector,
            centerX,
            centerY,
            maxRadius,
            engineTier,
            captainLevel,
            fuel,
            calculateFuelCost,
            areEnginesFunctional,
            areFuelTanksFunctional,
            sector.id === currentSector?.id,
        );
    });
}
