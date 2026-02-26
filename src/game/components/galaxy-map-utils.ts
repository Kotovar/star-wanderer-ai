import type { Sector, Module, StarType } from "../types";

// Tier colors
export const TIER_COLORS = {
    1: {
        ring: "#00ff41",
        glow: "rgba(0, 255, 65, 0.15)",
        name: "Тир 1 - Безопасный",
    },
    2: {
        ring: "#ffaa00",
        glow: "rgba(255, 170, 0, 0.15)",
        name: "Тир 2 - Средний",
    },
    3: {
        ring: "#ff0040",
        glow: "rgba(255, 0, 64, 0.15)",
        name: "Тир 3 - Опасный",
    },
    4: {
        ring: "#ff00ff",
        glow: "rgba(255, 0, 255, 0.15)",
        name: "Тир 4 - Граница Галактики",
    },
};

// Get engine level from modules
export function getEngineLevel(modules: Module[]): number {
    const engines = modules.filter(
        (m) => m.type === "engine" && !m.disabled && m.health > 0,
    );
    if (engines.length === 0) return 1;
    return Math.max(...engines.map((e) => e.level || 1));
}

// Get scanner level from modules
export function getScannerLevel(modules: Module[]): number {
    const scanners = modules.filter(
        (m) => m.type === "scanner" && !m.disabled && m.health > 0,
    );
    if (scanners.length === 0) return 0;
    return Math.max(...scanners.map((s) => s.level || 1));
}

// Check if player can see tier 4 sectors (scanner level 4 or special artifact)
export function canSeeTier4(
    modules: Module[],
    artifacts: Array<{
        effect?: { type?: string; active?: boolean };
        id?: string;
    }>,
): boolean {
    // Check for scanner level 4
    const scannerLevel = getScannerLevel(modules);
    if (scannerLevel >= 4) return true;

    // Check for all-seeing eye artifact
    const hasAllSeeingEye = artifacts.some(
        (a) => a.effect?.type === "all_seeing" && a.effect?.active,
    );
    if (hasAllSeeingEye) return true;

    return false;
}

// Check if player can access a tier
export function canAccessTier(
    tier: number,
    modules: Module[],
    captainLevel: number,
): boolean {
    if (tier === 1) return true;
    const engineLevel = getEngineLevel(modules);
    if (tier === 2) return engineLevel >= 2 && captainLevel >= 2;
    if (tier === 3) return engineLevel >= 3 && captainLevel >= 3;
    if (tier === 4) {
        // Tier 4 requires captain level 4 and engine level 4
        return engineLevel >= 4 && captainLevel >= 4;
    }
    return false;
}

// Get radius for sector based on tier
export function getSectorRadius(maxRadius: number, tier: number): number {
    if (tier === 1) return maxRadius * 0.33;
    if (tier === 2) return maxRadius * 0.6;
    if (tier === 3) return maxRadius * 0.85;
    if (tier === 4) return maxRadius * 1.1;
    return maxRadius * 0.9;
}

// Draw static legend (fuel, engine, captain info) - drawn BEFORE transform
export function drawStaticLegend(
    ctx: CanvasRenderingContext2D,
    modules: Module[],
    captainLevel: number,
    fuel: number,
) {
    const legendX = 10;
    const legendY = 10;
    const engineLevel = getEngineLevel(modules);

    ctx.font = "13px Share Tech Mono";
    ctx.textAlign = "left";

    // Safeguard against NaN or undefined fuel
    const displayFuel = fuel !== undefined && !isNaN(fuel) ? fuel : 0;
    ctx.fillStyle = "#9933ff";
    ctx.fillText(`⛽ Топливо: ${displayFuel}`, legendX, legendY + 16);

    ctx.fillStyle = "#00ff41";
    ctx.fillText(`Двигатель: Ур.${engineLevel}`, legendX, legendY + 32);

    ctx.fillStyle = "#888";
    ctx.fillText(`Капитан: Ур.${captainLevel}`, legendX, legendY + 48);
    ctx.fillText("Сектор 1: Двиг.Ур1 + Кап.Ур1", legendX, legendY + 68);
    ctx.fillText("Сектор 2: Двиг.Ур2 + Кап.Ур2", legendX, legendY + 84);
    ctx.fillText("Сектор 3: Двиг.Ур3 + Кап.Ур3", legendX, legendY + 100);
}

// Draw a sector on the galaxy map
export function drawSector(
    ctx: CanvasRenderingContext2D,
    sector: Sector,
    centerX: number,
    centerY: number,
    maxRadius: number,
    modules: Module[],
    captainLevel: number,
    fuel: number,
    calculateFuelCost: (targetTier: number) => number,
    areEnginesFunctional: () => boolean,
    areFuelTanksFunctional: () => boolean,
    isCurrentSector: boolean,
) {
    const tier = sector.tier;
    const isAccessible =
        canAccessTier(tier, modules, captainLevel) &&
        areEnginesFunctional() &&
        areFuelTanksFunctional();
    const fuelCost = calculateFuelCost(tier);
    // Safeguard against NaN or undefined fuel
    const safeFuel = fuel !== undefined && !isNaN(fuel) ? fuel : 0;
    const canAffordFuel = safeFuel >= fuelCost;

    const angle = sector.mapAngle ?? 0;
    const radius = getSectorRadius(maxRadius, tier);

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + 10 + Math.sin(angle) * radius;

    sector.mapX = x;
    sector.mapY = y;

    if (isCurrentSector) {
        drawSectorGlow(ctx, x, y);
    }

    drawSectorText(
        ctx,
        sector,
        x,
        y,
        isAccessible,
        isCurrentSector,
        canAffordFuel,
        fuelCost,
    );

    drawStar(ctx, x, y, sector.star, isCurrentSector, isAccessible);
}

function drawSectorGlow(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
    glowGradient.addColorStop(0, "rgba(255, 176, 0, 0.4)");
    glowGradient.addColorStop(1, "transparent");
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();
}

function drawSectorText(
    ctx: CanvasRenderingContext2D,
    sector: Sector,
    x: number,
    y: number,
    isAccessible: boolean,
    isCurrent: boolean,
    canAffordFuel: boolean,
    fuelCost: number,
) {
    ctx.font = `${isCurrent ? "bold " : ""}12px Share Tech Mono`;
    ctx.fillStyle = isAccessible
        ? isCurrent
            ? "#ffb000"
            : TIER_COLORS[sector.tier].ring
        : "#555";
    ctx.textAlign = "center";
    ctx.fillText(sector.name, x, y - 20);

    if (sector.visited || isCurrent) {
        ctx.font = "10px Share Tech Mono";
        ctx.fillStyle = isCurrent ? "#ffb000" : "#00ff41";
        ctx.fillText("✓", x + 32, y - 22);
    }

    if (isAccessible && !isCurrent) {
        ctx.font = "11px Share Tech Mono";
        ctx.fillStyle = canAffordFuel ? "#9933ff" : "#ff0040";
        ctx.fillText(`⛽${fuelCost}`, x, y - 6);
    }
}

// Draw tier rings on galaxy map
export function drawTierRings(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    maxRadius: number,
    modules: Module[],
    captainLevel: number,
    artifacts: Array<{
        effect?: { type?: string; active?: boolean };
        id?: string;
    }>,
) {
    const tierRadii = [
        maxRadius * 0.5,
        maxRadius * 0.8,
        maxRadius * 0.95,
        maxRadius * 1.15,
    ];

    const canSeeT4 = canSeeTier4(modules, artifacts);

    tierRadii.forEach((radius, idx) => {
        const tier = (idx + 1) as 1 | 2 | 3 | 4;
        const colors = TIER_COLORS[tier];
        const isAccessible = canAccessTier(tier, modules, captainLevel);

        // Tier 4 ring is only visible when scanner level 4 or all-seeing artifact
        if (tier === 4 && !canSeeT4) return;

        drawTierGlow(ctx, centerX, centerY, radius, colors, isAccessible);
        drawTierRing(ctx, centerX, centerY, radius, colors, isAccessible, tier);
    });
}

function drawTierGlow(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    colors: (typeof TIER_COLORS)[1],
    isAccessible: boolean,
) {
    const glowGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        radius - 20,
        centerX,
        centerY,
        radius + 20,
    );
    glowGradient.addColorStop(0, "transparent");
    glowGradient.addColorStop(
        0.5,
        isAccessible ? colors.glow : "rgba(100, 100, 100, 0.05)",
    );
    glowGradient.addColorStop(1, "transparent");
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 20, 0, Math.PI * 2);
    ctx.fill();
}

function drawTierRing(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    colors: (typeof TIER_COLORS)[1],
    isAccessible: boolean,
    tier: number,
) {
    ctx.strokeStyle = isAccessible ? colors.ring : "#444";
    ctx.lineWidth = tier === 2 ? 2 : 1.5;
    ctx.setLineDash(tier === 2 ? [5, 5] : []);
    ctx.globalAlpha = isAccessible ? 0.6 : 0.3;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
}

// Draw star types
export function drawStar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    star: { type?: StarType } | undefined,
    isActive: boolean,
    isAccessible: boolean,
) {
    const size = isActive ? 8 : 6;

    if (!isAccessible) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return;
    }

    const starType = star?.type;

    if (starType === "blackhole") {
        drawBlackHole(ctx, x, y, size);
    } else if (starType === "triple") {
        drawTripleStar(ctx, x, y, size, isActive);
    } else if (starType === "double") {
        drawDoubleStar(ctx, x, y, size, isActive);
    } else {
        drawSingleStar(ctx, x, y, size, isActive);
    }

    ctx.globalAlpha = isAccessible ? 1 : 0.4;
}

function drawBlackHole(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
) {
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
}

function drawTripleStar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    isActive: boolean,
) {
    for (let i = 0; i < 3; i++) {
        const angle = i * ((Math.PI * 2) / 3);
        const sx = x + Math.cos(angle) * (size * 0.5);
        const sy = y + Math.sin(angle) * (size * 0.5);
        ctx.fillStyle = isActive ? "#ffdd44" : "#ffaa00";
        ctx.beginPath();
        ctx.arc(sx, sy, size * 0.4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawDoubleStar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    isActive: boolean,
) {
    ctx.fillStyle = isActive ? "#ffdd44" : "#ffaa00";
    ctx.beginPath();
    ctx.arc(x - size * 0.4, y, size * 0.6, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
}

function drawSingleStar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    isActive: boolean,
) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 1.5);
    gradient.addColorStop(0, isActive ? "#fff" : "#ffee88");
    gradient.addColorStop(0.5, isActive ? "#ffcc00" : "#ff9900");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
    ctx.fill();
}
