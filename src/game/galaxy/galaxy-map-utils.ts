import type {
    Sector,
    Module,
    StarType,
    GalaxyTierAll,
    Artifact,
} from "@/game/types";
import { findActiveArtifact } from "../artifacts";
import { ARTIFACT_TYPES } from "../constants";

type TierDetails = {
    ring: string;
    glow: string;
    name: string;
};

// Tier colors - names are now translated via locale files
export const TIER_COLORS: Record<GalaxyTierAll, TierDetails> = {
    1: {
        ring: "#00ff41",
        glow: "rgba(0, 255, 65, 0.15)",
        name: "tier1", // Translation key: galaxy.tiers.tier1
    },
    2: {
        ring: "#ffaa00",
        glow: "rgba(255, 170, 0, 0.15)",
        name: "tier2", // Translation key: galaxy.tiers.tier2
    },
    3: {
        ring: "#ff0040",
        glow: "rgba(255, 0, 64, 0.15)",
        name: "tier3", // Translation key: galaxy.tiers.tier3
    },
    4: {
        ring: "#ff00ff",
        glow: "rgba(255, 0, 255, 0.15)",
        name: "tier4", // Translation key: galaxy.tiers.tier4
    },
};

// Get engine level from modules
export function getEngineLevel(modules: Module[]): number {
    const engines = modules.filter(
        (m) =>
            m.type === "engine" &&
            !m.disabled &&
            !m.manualDisabled &&
            m.health > 0,
    );
    if (engines.length === 0) return 1;
    return Math.max(...engines.map((e) => e.level || 1));
}

// Get scanner level from modules
export function getScannerLevel(modules: Module[]): number {
    const scanners = modules.filter(
        (m) =>
            m.type === "scanner" &&
            !m.disabled &&
            !m.manualDisabled &&
            m.health > 0,
    );
    if (scanners.length === 0) return 0;
    return Math.max(...scanners.map((s) => s.level || 1));
}

// Check if player can see tier 4 sectors (scanner level 4 or special artifact)
export function canSeeTier4(modules: Module[], artifacts: Artifact[]): boolean {
    // Check for scanner level 4
    const scannerLevel = getScannerLevel(modules);
    if (scannerLevel >= 4) return true;

    const allSeeing = findActiveArtifact(
        artifacts,
        ARTIFACT_TYPES.EYE_OF_SINGULARITY,
    );

    if (allSeeing) return true;

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
    if (tier === 1) return maxRadius * 0.38;
    if (tier === 2) return maxRadius * 0.67;
    if (tier === 3) return maxRadius * 0.87;
    if (tier === 4) return maxRadius * 1.1;
    return maxRadius * 0.9;
}

// Draw static legend (fuel, engine, captain info) - drawn BEFORE transform
export function drawStaticLegend(
    ctx: CanvasRenderingContext2D,
    modules: Module[],
    captainLevel: number,
    fuel: number,
    t: (key: string) => string,
) {
    const legendX = 10;
    const legendY = 10;
    const engineLevel = getEngineLevel(modules);

    ctx.font = "13px Share Tech Mono";
    ctx.textAlign = "left";

    // Safeguard against NaN or undefined fuel
    const displayFuel = fuel !== undefined && !isNaN(fuel) ? fuel : 0;
    ctx.fillStyle = "#9933ff";
    ctx.fillText(
        `${t("galaxy.legend.fuel")}: ${displayFuel}`,
        legendX,
        legendY + 16,
    );

    ctx.fillStyle = "#00ff41";
    ctx.fillText(
        `${t("galaxy.legend.engine")}: Ур.${engineLevel}`,
        legendX,
        legendY + 32,
    );

    ctx.fillStyle = "#888";
    ctx.fillText(
        `${t("galaxy.legend.captain")}: Ур.${captainLevel}`,
        legendX,
        legendY + 48,
    );
    ctx.fillText(t("galaxy.legend.sector_info_1"), legendX, legendY + 68);
    ctx.fillText(t("galaxy.legend.sector_info_2"), legendX, legendY + 84);
    ctx.fillText(t("galaxy.legend.sector_info_3"), legendX, legendY + 100);
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
    calculateFuelCost: (targetSectorId: number) => number,
    areEnginesFunctional: () => boolean,
    areFuelTanksFunctional: () => boolean,
    isCurrentSector: boolean,
    // Optional callbacks to update sector position in store
    updateSectorPosition?: (sectorId: number, x: number, y: number) => void,
) {
    const tier = sector.tier;
    const isAccessible =
        canAccessTier(tier, modules, captainLevel) &&
        areEnginesFunctional() &&
        areFuelTanksFunctional();
    const fuelCost = calculateFuelCost(sector.id);
    // Safeguard against NaN or undefined fuel
    const safeFuel = fuel !== undefined && !isNaN(fuel) ? fuel : 0;
    const canAffordFuel = safeFuel >= fuelCost;

    const angle = sector.mapAngle ?? 0;
    const radius = getSectorRadius(maxRadius, tier);

    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + 10 + Math.sin(angle) * radius;

    // Update sector position in store if callback provided
    if (updateSectorPosition && (sector.mapX !== x || sector.mapY !== y)) {
        updateSectorPosition(sector.id, x, y);
    }

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

    drawStar(ctx, x, y, sector.star, isCurrentSector, isAccessible, sector.id);
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
    if (sector.visited || isCurrent) {
        ctx.font = "10px Share Tech Mono";
        ctx.textAlign = "center";
        ctx.fillStyle = isCurrent ? "#ffb000" : "#00ff41";

        if (isCurrent) {
            // Draw spaceship icon for current sector
            ctx.font = "16px Arial";
            ctx.fillText("🚀", x, y - 24);
        } else {
            // Draw checkmark for visited sectors
            ctx.font = "10px Share Tech Mono";
            ctx.fillText("✓", x, y - 26);
        }
    }

    ctx.font = `${isCurrent ? "bold " : ""}10px Share Tech Mono`;
    ctx.fillStyle = isAccessible
        ? isCurrent
            ? "#ffb000"
            : TIER_COLORS[sector.tier].ring
        : "#555";
    ctx.textAlign = "center";
    ctx.fillText(sector.name, x, y - 18);

    if (isAccessible && !isCurrent) {
        ctx.font = "8px Share Tech Mono";
        ctx.fillStyle = canAffordFuel ? "#9933ff" : "#ff0040";
        ctx.fillText(`⛽${fuelCost}`, x, y - 10);
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
    artifacts: Artifact[],
) {
    const tierRadius = [
        maxRadius * 0.5,
        maxRadius * 0.75,
        maxRadius * 0.95,
        maxRadius * 1.15,
    ];

    const canSeeT4 = canSeeTier4(modules, artifacts);

    tierRadius.forEach((radius, idx) => {
        const tier = (idx + 1) as GalaxyTierAll;
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
    colors: TierDetails,
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
    colors: TierDetails,
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
    seed?: number,
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
        drawTripleStar(ctx, x, y, size, isActive, seed);
    } else if (starType === "double") {
        drawDoubleStar(ctx, x, y, size, isActive, seed);
    } else if (starType === "red_dwarf") {
        drawRedDwarf(ctx, x, y, size, isActive);
    } else if (starType === "yellow_dwarf") {
        drawYellowDwarf(ctx, x, y, size, isActive);
    } else if (starType === "white_dwarf") {
        drawWhiteDwarf(ctx, x, y, size, isActive);
    } else if (starType === "blue_giant") {
        drawBlueGiant(ctx, x, y, size, isActive);
    } else if (starType === "red_supergiant") {
        drawRedSupergiant(ctx, x, y, size, isActive);
    } else if (starType === "neutron_star") {
        drawNeutronStar(ctx, x, y, size, isActive);
    } else if (starType === "gas_giant") {
        drawGasGiant(ctx, x, y, size, isActive);
    } else if (starType === "variable_star") {
        drawVariableStar(ctx, x, y, size, isActive);
    } else if (starType === "stellar_remnant") {
        drawStellarRemnant(ctx, x, y, size, isActive);
    } else {
        drawYellowDwarf(ctx, x, y, size, isActive);
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
    seed?: number,
) {
    // Different color combinations for triple stars
    const colorSets = [
        { c1: "#ffdd44", c2: "#ffaa00", c3: "#ff6600" }, // Yellow-Orange-Red
        { c1: "#ffdd44", c2: "#ffdd44", c3: "#ffaa00" }, // All yellow-orange
        { c1: "#ffaa00", c2: "#ff6644", c3: "#ffdd44" }, // Orange-Red-Yellow
        { c1: "#ffdd44", c2: "#ffee88", c3: "#ffcc00" }, // Light yellow variations
    ];
    // Use seed deterministically
    const index =
        seed !== undefined && seed !== null
            ? Math.abs(seed) % colorSets.length
            : Math.floor(Math.random() * colorSets.length);
    const colorSet = colorSets[index];

    for (let i = 0; i < 3; i++) {
        const angle = i * ((Math.PI * 2) / 3);
        const sx = x + Math.cos(angle) * (size * 0.5);
        const sy = y + Math.sin(angle) * (size * 0.5);
        const colors = [colorSet.c1, colorSet.c2, colorSet.c3];
        ctx.fillStyle = isActive ? colors[i] : darkenColor(colors[i], 30);
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
    seed?: number,
) {
    // Different color combinations for double stars
    const colorSets = [
        { c1: "#ffdd44", c2: "#ffaa00" }, // Yellow-Orange
        { c1: "#ffaa00", c2: "#ff6644" }, // Orange-Red
        { c1: "#ffdd44", c2: "#ffee88" }, // Light yellow - Yellow
        { c1: "#ff6644", c2: "#ffdd44" }, // Red-Yellow
        { c1: "#ffcc00", c2: "#ff9900" }, // Gold-Orange
    ];
    // Use seed deterministically
    const index =
        seed !== undefined && seed !== null
            ? Math.abs(seed) % colorSets.length
            : Math.floor(Math.random() * colorSets.length);
    const colorSet = colorSets[index];

    ctx.fillStyle = isActive ? colorSet.c1 : darkenColor(colorSet.c1, 30);
    ctx.beginPath();
    ctx.arc(x - size * 0.4, y, size * 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isActive ? colorSet.c2 : darkenColor(colorSet.c2, 30);
    ctx.beginPath();
    ctx.arc(x + size * 0.4, y, size * 0.6, 0, Math.PI * 2);
    ctx.fill();
}

// Helper to darken colors for inactive state
function darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max((num >> 16) - amt, 0);
    const G = Math.max(((num >> 8) & 0x00ff) - amt, 0);
    const B = Math.max((num & 0x0000ff) - amt, 0);
    return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
}

/**
 * Красный карлик - маленький, тусклый, красный
 */
function drawRedDwarf(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    isActive: boolean,
) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, isActive ? "#ff6644" : "#cc4422");
    gradient.addColorStop(0.7, isActive ? "#cc3311" : "#882200");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Жёлтый карлик - звезда главной последовательности (как Солнце)
 */
function drawYellowDwarf(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    isActive: boolean,
) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 1.3);
    gradient.addColorStop(0, isActive ? "#ffff88" : "#ffee88");
    gradient.addColorStop(0.5, isActive ? "#ffdd44" : "#ffcc00");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.3, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Белый карлик - маленький, яркий, белый/голубоватый
 */
function drawWhiteDwarf(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    isActive: boolean,
) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 0.8);
    gradient.addColorStop(0, isActive ? "#ffffff" : "#eeeeee");
    gradient.addColorStop(0.4, isActive ? "#aaddff" : "#88aacc");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Голубой гигант - большой, яркий, сине-белый
 */
function drawBlueGiant(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    isActive: boolean,
) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 1.8);
    gradient.addColorStop(0, isActive ? "#ffffff" : "#e0e0ff");
    gradient.addColorStop(0.3, isActive ? "#66aaff" : "#4488dd");
    gradient.addColorStop(0.7, isActive ? "#2266aa" : "#114488");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.8, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Красный сверхгигант - огромный, тусклый, красный
 */
function drawRedSupergiant(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    isActive: boolean,
) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2.2);
    gradient.addColorStop(0, isActive ? "#ff8866" : "#dd6644");
    gradient.addColorStop(0.4, isActive ? "#ff4422" : "#cc3311");
    gradient.addColorStop(0.8, isActive ? "#aa1100" : "#660000");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 2.2, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Нейтронная звезда - очень маленькая, яркая, с пульсирующим эффектом
 */
function drawNeutronStar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    isActive: boolean,
) {
    // Внешнее свечение
    const outerGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 1.5);
    outerGradient.addColorStop(0, "rgba(100, 100, 255, 0.3)");
    outerGradient.addColorStop(1, "transparent");
    ctx.fillStyle = outerGradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Основная звезда
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 0.5);
    gradient.addColorStop(0, isActive ? "#ffffff" : "#cccccc");
    gradient.addColorStop(0.5, isActive ? "#6688ff" : "#4466cc");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Пульсирующее кольцо (если активна)
    if (isActive) {
        ctx.strokeStyle = "rgba(100, 150, 255, 0.6)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
        ctx.stroke();
    }
}

/**
 * Газовый гигант - огромный зелёный шар с атмосферными полосами
 */
function drawGasGiant(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    isActive: boolean,
) {
    // Внешнее зелёное свечение
    const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5);
    outerGlow.addColorStop(
        0,
        isActive ? "rgba(0, 255, 100, 0.4)" : "rgba(0, 200, 50, 0.25)",
    );
    outerGlow.addColorStop(
        0.5,
        isActive ? "rgba(0, 200, 50, 0.2)" : "rgba(0, 150, 40, 0.1)",
    );
    outerGlow.addColorStop(1, "transparent");
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Основной зелёный шар
    const bodyGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 1.8);
    bodyGradient.addColorStop(0, isActive ? "#00ff66" : "#00cc55");
    bodyGradient.addColorStop(0.5, isActive ? "#00cc55" : "#009933");
    bodyGradient.addColorStop(0.8, isActive ? "#009933" : "#006622");
    bodyGradient.addColorStop(1, "transparent");
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Атмосферные полосы (горизонтальные зелёные ленты)
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size * 1.7, 0, Math.PI * 2);
    ctx.clip();

    // Полоса 1 - светлая
    ctx.fillStyle = isActive
        ? "rgba(100, 255, 150, 0.5)"
        : "rgba(50, 200, 100, 0.35)";
    ctx.fillRect(x - size * 2, y - size * 0.8, size * 4, size * 0.3);

    // Полоса 2 - тёмная
    ctx.fillStyle = isActive
        ? "rgba(0, 150, 50, 0.6)"
        : "rgba(0, 100, 40, 0.4)";
    ctx.fillRect(x - size * 2, y - size * 0.15, size * 4, size * 0.35);

    // Полоса 3 - светлая
    ctx.fillStyle = isActive
        ? "rgba(50, 255, 100, 0.4)"
        : "rgba(30, 180, 80, 0.3)";
    ctx.fillRect(x - size * 2, y + size * 0.5, size * 4, size * 0.3);

    ctx.restore();

    // Лёгкое мерцание (турбулентность атмосферы)
    if (isActive) {
        ctx.strokeStyle = "rgba(150, 255, 200, 0.3)";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(x, y, size * 1.85, 0, Math.PI * 2);
        ctx.stroke();
    }
}

/**
 * Переменная звезда - медленно меняет яркость
 */
function drawVariableStar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    isActive: boolean,
) {
    // Жёлто-оранжевое свечение с пульсацией
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 1.5);
    gradient.addColorStop(
        0,
        isActive ? "rgba(255, 255, 200, 0.9)" : "rgba(255, 255, 180, 0.7)",
    );
    gradient.addColorStop(
        0.5,
        isActive ? "rgba(255, 200, 100, 0.5)" : "rgba(255, 180, 80, 0.35)",
    );
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Ядро
    const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    coreGradient.addColorStop(0, isActive ? "#ffffc8" : "#eee0a0");
    coreGradient.addColorStop(0.6, isActive ? "#ffc864" : "#cc9944");
    coreGradient.addColorStop(1, "transparent");
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
}

/**
 * Звёздный остаток - тусклый, угасающий белый карлик
 */
function drawStellarRemnant(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    isActive: boolean,
) {
    // Тусклое серое свечение
    const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
    outerGlow.addColorStop(
        0,
        isActive ? "rgba(180, 180, 180, 0.4)" : "rgba(150, 150, 150, 0.25)",
    );
    outerGlow.addColorStop(
        0.5,
        isActive ? "rgba(150, 150, 150, 0.2)" : "rgba(120, 120, 120, 0.1)",
    );
    outerGlow.addColorStop(1, "transparent");
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(x, y, size * 2, 0, Math.PI * 2);
    ctx.fill();

    // Тусклое ядро
    const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 1.2);
    coreGradient.addColorStop(0, isActive ? "#d0d0d0" : "#a0a0a0");
    coreGradient.addColorStop(0.6, isActive ? "#a0a0a0" : "#707070");
    coreGradient.addColorStop(1, "transparent");
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Частицы вокруг (звёздная пыль)
    ctx.fillStyle = isActive
        ? "rgba(200, 200, 200, 0.5)"
        : "rgba(150, 150, 150, 0.3)";
    const particlePositions = [
        { x: -size * 1.5, y: -size * 0.8 },
        { x: size * 1.3, y: -size * 0.5 },
        { x: -size * 1.2, y: size * 1.0 },
        { x: size * 1.6, y: size * 0.6 },
        { x: -size * 0.6, y: size * 1.4 },
    ];
    particlePositions.forEach((pos) => {
        ctx.beginPath();
        ctx.arc(x + pos.x, y + pos.y, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
    });
}
