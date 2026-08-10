import type {
    Sector,
    Module,
    StarType,
    GalaxyTierAll,
    Artifact,
    Nebula,
} from "@/game/types";
import { drawStarSprite } from "@/game/assets/starSprites";
import { getSectorRule } from "./sectorRules";
import { findActiveArtifact } from "../artifacts";
import { ARTIFACT_TYPES } from "../constants";

type TierDetails = {
    ring: string;
    glow: string;
    name: string;
};

export type GalaxyMapObjectiveKind =
    | "contract"
    | "artifact"
    | "signal"
    | "boss"
    | "final"
    | "navigator";

export type GalaxyMapObjective = {
    sectorId: number;
    kind: GalaxyMapObjectiveKind;
    label: string;
};

// Tier colors - names are now translated via locale files
const TIER_COLORS: Record<GalaxyTierAll, TierDetails> = {
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
function getEngineLevel(modules: Module[]): number {
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
function getScannerLevel(modules: Module[]): number {
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

// Check if player can see tier 4 sectors (scanner level 4, scan range >= 25, or special artifact)
export function canSeeTier4(modules: Module[], artifacts: Artifact[], scanRange?: number): boolean {
    const scannerLevel = getScannerLevel(modules);
    if (scannerLevel >= 4) return true;

    if (scanRange !== undefined && scanRange >= 25) return true;

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

const OBJECTIVE_COLORS: Record<GalaxyMapObjectiveKind, string> = {
    contract: "#ffb000",
    artifact: "#00d4ff",
    signal: "#76dff5",
    boss: "#ff0040",
    final: "#ff00ff",
    navigator: "#ffb000",
};

/** Рисует компактные маркеры уже известных целей рядом со звёздными системами. */
export function drawGalaxyObjectiveMarkers(
    ctx: CanvasRenderingContext2D,
    sectors: Sector[],
    objectives: GalaxyMapObjective[],
    centerX: number,
    centerY: number,
    maxRadius: number,
    canvasWidth: number,
    canvasHeight: number,
    time: number = 0,
) {
    if (objectives.length === 0) return;

    const objectiveKindsBySector = new Map<
        number,
        GalaxyMapObjectiveKind[]
    >();
    for (const objective of objectives) {
        const kinds = objectiveKindsBySector.get(objective.sectorId) ?? [];
        if (!kinds.includes(objective.kind)) {
            kinds.push(objective.kind);
            objectiveKindsBySector.set(objective.sectorId, kinds);
        }
    }

    const isMobile = Math.min(canvasWidth, canvasHeight) < 450;
    const markerSize = isMobile ? 3 : 5;
    const markerOffset = isMobile ? 12 : 21;

    for (const sector of sectors) {
        const kinds = objectiveKindsBySector.get(sector.id);
        if (!kinds || sector.mapAngle === undefined) continue;

        const radius = getSectorRadius(maxRadius, sector.tier);
        const x = centerX + Math.cos(sector.mapAngle) * radius;
        const y = centerY + Math.sin(sector.mapAngle) * radius;

        kinds.forEach((kind, index) => {
            const angle =
                Math.PI / 2 + (index - (kinds.length - 1) / 2) * 0.65;
            const markerX = x + Math.cos(angle) * markerOffset;
            const markerY = y + Math.sin(angle) * markerOffset;
            const pulse = 1 + Math.sin(time * 0.003 + index) * 0.12;
            const size = markerSize * pulse;

            ctx.save();
            ctx.translate(markerX, markerY);
            ctx.strokeStyle = OBJECTIVE_COLORS[kind];
            ctx.fillStyle = "#050810";
            ctx.lineWidth = isMobile ? 1 : 1.5;
            ctx.shadowColor = OBJECTIVE_COLORS[kind];
            ctx.shadowBlur = isMobile ? 3 : 7;

            ctx.beginPath();
            if (kind === "contract") {
                ctx.moveTo(0, -size);
                ctx.lineTo(size, size);
                ctx.lineTo(-size, size);
                ctx.closePath();
            } else if (kind === "artifact") {
                ctx.moveTo(0, -size);
                ctx.lineTo(size, 0);
                ctx.lineTo(0, size);
                ctx.lineTo(-size, 0);
                ctx.closePath();
            } else if (kind === "signal") {
                ctx.moveTo(0, -size);
                ctx.lineTo(size, 0);
                ctx.lineTo(0, size);
                ctx.lineTo(-size, 0);
                ctx.closePath();
            } else if (kind === "boss") {
                ctx.moveTo(-size, 0);
                ctx.lineTo(size, 0);
                ctx.moveTo(0, -size);
                ctx.lineTo(0, size);
            } else if (kind === "navigator") {
                ctx.arc(0, 0, size, 0, Math.PI * 2);
                ctx.moveTo(-size * 1.4, 0);
                ctx.lineTo(size * 1.4, 0);
                ctx.moveTo(0, -size * 1.4);
                ctx.lineTo(0, size * 1.4);
            } else {
                ctx.arc(0, 0, size, 0, Math.PI * 2);
                ctx.moveTo(-size * 0.45, 0);
                ctx.lineTo(size * 0.45, 0);
            }
            ctx.fill();
            ctx.stroke();
            if (kind === "signal") {
                ctx.beginPath();
                ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        });
    }
}

// Navigation status for the DOM map HUD.
export function getGalaxyMapStatus(
    modules: Module[],
    captainLevel: number,
    fuel: number,
) {
    const engineLevel = getEngineLevel(modules);
    return {
        fuel: Number.isFinite(fuel) ? fuel : 0,
        engineLevel,
        captainLevel,
        tiers: ([1, 2, 3] as const).map((tier) => ({
            tier,
            unlocked: canAccessTier(tier, modules, captainLevel),
        })),
    };
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
    canvasWidth?: number,
    canvasHeight?: number,
    playerShipImage?: HTMLImageElement | null,
    starSpriteSheet?: HTMLImageElement | null,
    time: number = 0,
    sectorName = sector.name,
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
    const y = centerY + Math.sin(angle) * radius;

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
        sectorName,
        x,
        y,
        isAccessible,
        isCurrentSector,
        canAffordFuel,
        fuelCost,
        canvasWidth,
        canvasHeight,
        playerShipImage,
        time,
    );

    drawStar(
        ctx,
        x,
        y,
        sector.star,
        isCurrentSector,
        isAccessible,
        sector.id,
        canvasWidth,
        canvasHeight,
        starSpriteSheet,
    );
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
    sectorName: string,
    x: number,
    y: number,
    isAccessible: boolean,
    isCurrent: boolean,
    canAffordFuel: boolean,
    fuelCost: number,
    canvasWidth?: number,
    canvasHeight?: number,
    playerShipImage?: HTMLImageElement | null,
    time: number = 0,
) {
    const minDim = Math.min(canvasWidth ?? 600, canvasHeight ?? 600);
    const isMobile = minDim < 450;
    const nameFontSize = isMobile ? 5 : 10;
    const fuelFontSize = isMobile ? 3 : 8;

    const shipSize = isMobile ? 16 : 30;
    const shipOffsetY = isMobile ? 26 : 46;
    const checkOffsetY  = isMobile ? 13 : 26;
    const nameOffsetY   = isMobile ? 7  : 18;
    const fuelOffsetY   = isMobile ? 3  : 10;

    if (sector.visited || isCurrent) {
        ctx.textAlign = "center";
        ctx.fillStyle = isCurrent ? "#ffb000" : "#00ff41";

        if (isCurrent) {
            const bobOffset = Math.sin(time * 0.0014) * (isMobile ? 1.1 : 1.8);
            drawPlayerShipMarker(
                ctx,
                x,
                y - shipOffsetY + bobOffset,
                shipSize,
                playerShipImage,
                time,
            );
        } else {
            // Draw checkmark for visited sectors
            ctx.font = `${nameFontSize}px Share Tech Mono`;
            ctx.fillText("✓", x, y - checkOffsetY);
        }
    }

    if (
        sector.visited &&
        sector.locations.some((location) => location.type === "station")
    ) {
        ctx.font = `${fuelFontSize}px Share Tech Mono`;
        ctx.fillStyle = "#ffb000";
        ctx.fillText("⌂", x + (isMobile ? 11 : 20), y - checkOffsetY);
    }

    ctx.font = `${isCurrent ? "bold " : ""}${nameFontSize}px Share Tech Mono`;
    ctx.fillStyle = isCurrent
        ? "#ffb000"
        : isAccessible
          ? "#00d4ff"
          : "#44515a";
    ctx.textAlign = "center";
    ctx.fillText(sectorName, x, y - nameOffsetY);

    if (isAccessible && !isCurrent) {
        ctx.font = `${fuelFontSize}px Share Tech Mono`;
        ctx.fillStyle = canAffordFuel ? "#00d4ff" : "#ff0040";
        ctx.fillText(`⛽${fuelCost}`, x, y - fuelOffsetY);
    }
}

function drawPlayerShipMarker(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    image?: HTMLImageElement | null,
    time: number = 0,
) {
    ctx.save();

    const glowPulse = 0.9 + Math.sin(time * 0.0018) * 0.1;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 0.72);
    glow.addColorStop(0, `rgba(0, 212, 255, ${0.38 * glowPulse})`);
    glow.addColorStop(0.58, `rgba(255, 176, 0, ${0.14 * glowPulse})`);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.72, 0, Math.PI * 2);
    ctx.fill();

    if (image?.complete && image.naturalWidth > 0) {
        ctx.drawImage(image, x - size / 2, y - size / 2, size, size);
    }
    ctx.restore();
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
    scanRange?: number,
    canvasWidth?: number,
    canvasHeight?: number,
) {
    const minDim = Math.min(canvasWidth ?? 600, canvasHeight ?? 600);
    const isMobile = minDim < 450;
    const tierRadius = isMobile
        ? [
            maxRadius * 0.46,
            maxRadius * 0.76,
            maxRadius * 1.04,
            maxRadius * 1.30,
          ]
        : [
            maxRadius * 0.5,
            maxRadius * 0.75,
            maxRadius * 0.95,
            maxRadius * 1.15,
          ];

    const canSeeT4 = canSeeTier4(modules, artifacts, scanRange);

    tierRadius.forEach((radius, idx) => {
        const tier = (idx + 1) as GalaxyTierAll;
        const colors = TIER_COLORS[tier];
        const isAccessible = canAccessTier(tier, modules, captainLevel);

        // Tier 4 ring is only visible when scanner level 4 or all-seeing artifact
        if (tier === 4 && !canSeeT4) return;

        drawTierGlow(ctx, centerX, centerY, radius, colors, isAccessible);
        drawTierRing(ctx, centerX, centerY, radius, colors, isAccessible, tier, isMobile);
    });
}

export function drawNebulae(
    ctx: CanvasRenderingContext2D,
    nebulae: Nebula[],
    centerX: number,
    centerY: number,
    maxRadius: number,
    time: number,
): void {
    if (nebulae.length === 0) return;

    const pulse = time === 0 ? 1 : 0.9 + Math.sin(time * 0.0015) * 0.1;
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (const nebula of nebulae) {
        const x = centerX + nebula.x * maxRadius;
        const y = centerY + nebula.y * maxRadius;
        const radius = nebula.radius * maxRadius;

        const cyan = ctx.createRadialGradient(x, y, 0, x, y, radius);
        cyan.addColorStop(0, `rgba(0, 212, 255, ${0.16 * pulse})`);
        cyan.addColorStop(0.62, `rgba(0, 212, 255, ${0.07 * pulse})`);
        cyan.addColorStop(1, "transparent");
        ctx.fillStyle = cyan;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        const violet = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.82);
        violet.addColorStop(0, `rgba(153, 51, 255, ${0.14 * pulse})`);
        violet.addColorStop(0.7, `rgba(153, 51, 255, ${0.05 * pulse})`);
        violet.addColorStop(1, "transparent");
        ctx.fillStyle = violet;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.82, 0, Math.PI * 2);
        ctx.fill();

        ctx.setLineDash([4, 5]);
        ctx.strokeStyle = `rgba(160, 116, 255, ${0.16 * pulse})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.restore();
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
    thin = false,
) {
    ctx.strokeStyle = isAccessible ? colors.ring : "#444";
    ctx.lineWidth = thin ? 0.65 : (tier === 2 ? 1.5 : 1.1);
    ctx.setLineDash(tier === 2 ? [5, 5] : []);
    ctx.globalAlpha = isAccessible ? 0.46 : 0.22;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
}

// Draw star types
function drawStar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    star: { type?: StarType } | undefined,
    isActive: boolean,
    isAccessible: boolean,
    seed?: number,
    canvasWidth?: number,
    canvasHeight?: number,
    starSpriteSheet?: HTMLImageElement | null,
) {
    const minDim = Math.min(canvasWidth ?? 600, canvasHeight ?? 600);
    const size = minDim < 450
        ? (isActive ? 3 : 2)
        : (isActive ? 8 : 6);
    const starType = star?.type;

    if (starType && starSpriteSheet?.complete && starSpriteSheet.naturalWidth > 0) {
        const spriteSize = minDim < 450
            ? (isActive ? 15 : 12)
            : (isActive ? 30 : 24);
        drawStarSprite(
            ctx,
            starSpriteSheet,
            starType,
            x,
            y,
            spriteSize,
            isAccessible ? 1 : 0.45,
        );
        return;
    }

    if (!isAccessible) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "#333";
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return;
    }

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
    } else if (starType === "brown_dwarf") {
        drawBrownDwarf(ctx, x, y, size, isActive);
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
 * Коричневый карлик - огромный зелёный шар с атмосферными полосами
 */
function drawBrownDwarf(
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

/**
 * Значки аванпостов поверх секторов на карте галактики.
 *
 * Отдельным проходом, а не параметром `drawSector`: у той и без того
 * двадцать аргументов, а значок ничего не знает про сектор кроме координат.
 * Полный бункер горит янтарным — единственный повод менять маршрут должен
 * быть виден с общей карты, а не только вблизи.
 */
export function drawOutpostSectorMarkers(
    ctx: CanvasRenderingContext2D,
    sectors: { id: number; tier: number; mapAngle?: number }[],
    outposts: { sectorId: number; full: boolean; isBase: boolean }[],
    centerX: number,
    centerY: number,
    maxRadius: number,
) {
    if (outposts.length === 0) return;

    const bySector = new Map<number, { full: boolean; isBase: boolean }>();
    for (const outpost of outposts) {
        const seen = bySector.get(outpost.sectorId);
        bySector.set(outpost.sectorId, {
            full: (seen?.full ?? false) || outpost.full,
            // База важнее сборщика: если в системе есть и то и другое,
            // показываем базу — она одна за забег
            isBase: (seen?.isBase ?? false) || outpost.isBase,
        });
    }

    for (const sector of sectors) {
        if (sector.mapAngle === undefined) continue;
        const marker = bySector.get(sector.id);
        if (marker === undefined) continue;
        const anyFull = marker.full;

        const radius = getSectorRadius(maxRadius, sector.tier);
        const x = centerX + Math.cos(sector.mapAngle) * radius + 15;
        const y = centerY + Math.sin(sector.mapAngle) * radius - 15;
        // База янтарная, сборщик циановый — как и на карте сектора
        const color = anyFull || marker.isBase ? "#ffb000" : "#00d4ff";

        ctx.save();

        if (anyFull) {
            const glow = ctx.createRadialGradient(x, y, 0, x, y, 10);
            glow.addColorStop(0, "rgba(255,176,0,0.5)");
            glow.addColorStop(1, "transparent");
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = "#0b1218";
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(x - 5, y - 3, 10, 6, 1.5);
        ctx.fill();
        ctx.stroke();

        if (marker.isBase) {
            ctx.beginPath();
            ctx.moveTo(x - 6, y - 3);
            ctx.lineTo(x, y - 7.5);
            ctx.lineTo(x + 6, y - 3);
            ctx.closePath();
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.moveTo(x, y - 3);
            ctx.lineTo(x, y - 7);
            ctx.stroke();
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y - 7.5, 1.4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

/** Visible, non-interactive markers for the rule assigned to a sector. */
export function drawSectorRuleMarkers(
    ctx: CanvasRenderingContext2D,
    sectors: Pick<Sector, "tier" | "mapAngle" | "ruleId">[],
    centerX: number,
    centerY: number,
    maxRadius: number,
    canvasWidth?: number,
    canvasHeight?: number,
) {
    const isMobile = Math.min(canvasWidth ?? 600, canvasHeight ?? 600) < 450;

    for (const sector of sectors) {
        const rule = getSectorRule(sector.ruleId);
        if (!rule || sector.mapAngle === undefined) continue;

        const radius = getSectorRadius(maxRadius, sector.tier);
        const x = centerX + Math.cos(sector.mapAngle) * radius;
        const y = centerY + Math.sin(sector.mapAngle) * radius;
        const badgeOffset = isMobile ? 9 : 13;
        const badgeRadius = isMobile ? 5 : 8;
        const badgeX = x + badgeOffset;
        const badgeY = y - badgeOffset;

        ctx.save();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `bold ${isMobile ? 7 : 12}px Share Tech Mono`;
        ctx.strokeStyle = rule.color;
        ctx.lineWidth = isMobile ? 1 : 1.5;
        ctx.globalAlpha = 0.72;
        ctx.beginPath();
        ctx.moveTo(x + badgeOffset * 0.4, y - badgeOffset * 0.4);
        ctx.lineTo(badgeX - badgeRadius * 0.45, badgeY + badgeRadius * 0.45);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#050810";
        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = rule.color;
        ctx.shadowColor = rule.color;
        ctx.shadowBlur = isMobile ? 4 : 7;
        ctx.fillText(rule.icon, badgeX, badgeY + (isMobile ? 0.5 : 1));
        ctx.restore();
    }
}
