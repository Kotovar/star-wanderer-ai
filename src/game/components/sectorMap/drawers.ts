import { drawStarSprite } from "@/game/assets/starSprites";
import { PLANET_COLORS_IN_SECTOR } from "@/game/constants";
import type { Location, StarType, StormType } from "@/game/types";
import type { PlanetType } from "@/game/types/planets";


const PLANET_SPRITE_SHEET_WIDTH = 1535;
const PLANET_SPRITE_SHEET_HEIGHT = 1024;
const GAS_PLANET_SPRITE_SHEET_WIDTH = 2400;
const GAS_PLANET_SPRITE_SHEET_HEIGHT = 600;

const PLANET_SPRITE_ORDER: PlanetType[] = [
  "Пустынная",
  "Ледяная",
  "Лесная",
  "Вулканическая",
  "Океаническая",
  "Кристаллическая",
  "Радиоактивная",
  "Тропическая",
  "Арктическая",
  "Разрушенная войной",
  "Планета-кольцо",
  "Приливная",
];

const GAS_PLANET_SPRITE_ORDER = [
  "hydrogen",
  "methane",
  "ammonia",
  "nitrogen",
] as const;

type SpriteRect = { x: number; y: number; width: number; height: number };

const STATION_SPRITES: Record<string, SpriteRect> = {
  trade: { x: 28, y: 156, width: 333, height: 354 },
  military: { x: 391, y: 157, width: 304, height: 350 },
  research: { x: 735, y: 150, width: 304, height: 351 },
  mining: { x: 1067, y: 158, width: 357, height: 359 },
  shipyard: { x: 133, y: 586, width: 362, height: 328 },
  medical: { x: 567, y: 599, width: 318, height: 304 },
  diplomatic: { x: 944, y: 566, width: 346, height: 358 },
};

export const seededRandom = (loc: Location, seed: number = 0): number => {
  const str = loc.id || "unknown";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash = hash & hash;
  }
  const x = Math.sin(hash + seed) * 10000;
  return x - Math.floor(x);
};

// Draw star at center with animations
export function drawStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  star: { type: StarType; name: string } | undefined,
  sectorId?: number,
  time?: number,
  spriteSheet?: HTMLImageElement,
) {
  if (!star) return;

  const currentTime = time || 0;

  if (spriteSheet?.complete && spriteSheet.naturalWidth > 0) {
    const baseSizeByType: Record<StarType, number> = {
      red_dwarf: 92,
      yellow_dwarf: 104,
      white_dwarf: 84,
      blue_giant: 126,
      red_supergiant: 146,
      neutron_star: 86,
      gas_giant: 116,
      double: 126,
      triple: 132,
      blackhole: 124,
      variable_star: 128,
      stellar_remnant: 116,
    };

    drawStarSprite(
      ctx,
      spriteSheet,
      star.type,
      x,
      y,
      baseSizeByType[star.type] ?? 108,
    );
    return;
  }

  if (star.type === "blackhole") {
    // Black hole with rotating accretion disk
    const rotation = currentTime * 0.0005;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 50);
    gradient.addColorStop(0, "#000");
    gradient.addColorStop(0.5, "#1a0a2e");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 50, 0, Math.PI * 2);
    ctx.fill();

    // Event horizon (pulsing)
    const pulse = Math.sin(currentTime * 0.002) * 2;
    ctx.strokeStyle = "#ff00ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 20 + pulse, 0, Math.PI * 2);
    ctx.stroke();

    // Rotating accretion disk
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.strokeStyle = "rgba(255, 100, 255, 0.5)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 15, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else if (star.type === "triple") {
    // Three stars orbiting around center
    const orbitSpeed = 0.0003;
    const orbitRadius = 20;
    const rotation = currentTime * orbitSpeed;

    const colorSets = [
      { c1: "#ffdd44", c2: "#ffaa00", c3: "#ff6600" },
      { c1: "#ffdd44", c2: "#ffdd44", c3: "#ffaa00" },
      { c1: "#ffaa00", c2: "#ff6644", c3: "#ffdd44" },
      { c1: "#ffdd44", c2: "#ffee88", c3: "#ffcc00" },
    ];
    const index =
      sectorId !== undefined ? Math.abs(sectorId) % colorSets.length : 0;
    const colorSet = colorSets[index];
    const colors = [colorSet.c1, colorSet.c2, colorSet.c3];

    for (let i = 0; i < 3; i++) {
      const angle = rotation + i * ((Math.PI * 2) / 3);
      const sx = x + Math.cos(angle) * orbitRadius;
      const sy = y + Math.sin(angle) * orbitRadius;

      // Glow
      const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, 20);
      gradient.addColorStop(0, "#fff");
      gradient.addColorStop(0.3, colors[i]);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(sx, sy, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (star.type === "double") {
    // Binary stars orbiting each other
    const orbitSpeed = 0.0005;
    const orbitRadius = 15;
    const rotation = currentTime * orbitSpeed;

    const colorSets = [
      { c1: "#ffdd44", c2: "#ffaa00" },
      { c1: "#ffaa00", c2: "#ff6644" },
      { c1: "#ffdd44", c2: "#ffee88" },
      { c1: "#ff6644", c2: "#ffdd44" },
      { c1: "#ffcc00", c2: "#ff9900" },
    ];
    const index =
      sectorId !== undefined ? Math.abs(sectorId) % colorSets.length : 0;
    const colorSet = colorSets[index];
    const colors = [colorSet.c1, colorSet.c2];

    for (let i = 0; i < 2; i++) {
      const angle = rotation + i * Math.PI;
      const sx = x + Math.cos(angle) * orbitRadius;
      const sy = y + Math.sin(angle) * orbitRadius;

      // Glow
      const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, 25);
      gradient.addColorStop(0, "#fff");
      gradient.addColorStop(0.3, colors[i]);
      gradient.addColorStop(1, "transparent");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(sx, sy, 25, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (star.type === "red_dwarf") {
    // Red dwarf with pulsing effect
    const pulse = Math.sin(currentTime * 0.001) * 2;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 25 + pulse);
    gradient.addColorStop(0, "#ff6644");
    gradient.addColorStop(0.6, "#cc3311");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 25 + pulse, 0, Math.PI * 2);
    ctx.fill();
  } else if (star.type === "yellow_dwarf") {
    // Yellow dwarf (Sun-like) with pulsing
    const pulse = Math.sin(currentTime * 0.0015) * 2;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 35 + pulse);
    gradient.addColorStop(0, "#fff");
    gradient.addColorStop(0.2, "#ffff88");
    gradient.addColorStop(0.5, "#ffdd44");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 35 + pulse, 0, Math.PI * 2);
    ctx.fill();
  } else if (star.type === "white_dwarf") {
    // White dwarf with fast pulsing
    const pulse = Math.sin(currentTime * 0.002) * 1.5;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20 + pulse);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.4, "#aaddff");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 20 + pulse, 0, Math.PI * 2);
    ctx.fill();
  } else if (star.type === "blue_giant") {
    // Blue giant with slow majestic pulsing
    const pulse = Math.sin(currentTime * 0.0008) * 3;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 45 + pulse);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.3, "#66aaff");
    gradient.addColorStop(0.7, "#2266aa");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 45 + pulse, 0, Math.PI * 2);
    ctx.fill();
  } else if (star.type === "red_supergiant") {
    // Red supergiant with slow rotation and pulsing
    const pulse = Math.sin(currentTime * 0.001) * 3;

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 55 + pulse);
    gradient.addColorStop(0, "#ff8866");
    gradient.addColorStop(0.4, "#ff4422");
    gradient.addColorStop(0.8, "#aa1100");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 55 + pulse, 0, Math.PI * 2);
    ctx.fill();
  } else if (star.type === "neutron_star") {
    // Neutron star with fast pulsing
    const pulse = Math.sin(currentTime * 0.003) * 2;

    // Outer glow
    const outerGradient = ctx.createRadialGradient(x, y, 0, x, y, 30);
    outerGradient.addColorStop(0, "rgba(100, 100, 255, 0.4)");
    outerGradient.addColorStop(1, "transparent");
    ctx.fillStyle = outerGradient;
    ctx.beginPath();
    ctx.arc(x, y, 30 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Core
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.5, "#6688ff");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();

    // Pulsing ring
    ctx.strokeStyle = "rgba(100, 150, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.stroke();
  } else if (star.type === "gas_giant") {
    // Gas giant - green color like on galaxy map
    const pulse = Math.sin(currentTime * 0.001) * 2;

    // Outer green glow
    const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, 60 + pulse);
    outerGlow.addColorStop(0, "rgba(0, 255, 100, 0.4)");
    outerGlow.addColorStop(0.5, "rgba(0, 200, 50, 0.2)");
    outerGlow.addColorStop(1, "transparent");
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(x, y, 60 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Main green sphere
    const bodyGradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
    bodyGradient.addColorStop(0, "#00ff66");
    bodyGradient.addColorStop(0.5, "#00cc55");
    bodyGradient.addColorStop(0.8, "#009933");
    bodyGradient.addColorStop(1, "transparent");
    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fill();

    // Atmospheric bands (horizontal green ribbons)
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 38, 0, Math.PI * 2);
    ctx.clip();

    // Band 1 - light
    ctx.fillStyle = "rgba(100, 255, 150, 0.5)";
    ctx.fillRect(x - 45, y - 15, 90, 5);

    // Band 2 - dark
    ctx.fillStyle = "rgba(0, 150, 50, 0.6)";
    ctx.fillRect(x - 45, y - 3, 90, 6);

    // Band 3 - light
    ctx.fillStyle = "rgba(50, 255, 100, 0.4)";
    ctx.fillRect(x - 45, y + 10, 90, 5);

    // Band 4 - dark
    ctx.fillStyle = "rgba(0, 120, 40, 0.5)";
    ctx.fillRect(x - 45, y + 20, 90, 4);

    ctx.restore();
  } else if (star.type === "variable_star") {
    // Variable star - slowly changes brightness
    const brightness = 0.5 + Math.sin(currentTime * 0.0005) * 0.3;
    const size = 32 + Math.sin(currentTime * 0.0005) * 8;
    // Outer glow (pulsing)
    const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, size * 1.5);
    outerGlow.addColorStop(0, `rgba(255, 200, 100, ${brightness * 0.6})`);
    outerGlow.addColorStop(0.5, `rgba(255, 150, 50, ${brightness * 0.3})`);
    outerGlow.addColorStop(1, "transparent");
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(x, y, size * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Core (pulsing)
    const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    coreGradient.addColorStop(0, `rgba(255, 255, 200, ${brightness})`);
    coreGradient.addColorStop(
      0.4,
      `rgba(255, 200, 100, ${brightness * 0.8})`,
    );
    coreGradient.addColorStop(1, "transparent");
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  } else if (star.type === "stellar_remnant") {
    // Stellar remnant - dim, fading star with particles
    const pulse = Math.sin(currentTime * 0.0008) * 3;

    // Faint outer glow
    const outerGlow = ctx.createRadialGradient(x, y, 0, x, y, 50 + pulse);
    outerGlow.addColorStop(0, "rgba(150, 150, 150, 0.3)");
    outerGlow.addColorStop(0.5, "rgba(100, 100, 100, 0.15)");
    outerGlow.addColorStop(1, "transparent");
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(x, y, 50 + pulse, 0, Math.PI * 2);
    ctx.fill();

    // Dim core
    const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
    coreGradient.addColorStop(0, "rgba(200, 200, 200, 0.6)");
    coreGradient.addColorStop(0.5, "rgba(150, 150, 150, 0.4)");
    coreGradient.addColorStop(1, "transparent");
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();

    // Faint particles around
    ctx.fillStyle = "rgba(180, 180, 180, 0.4)";
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + currentTime * 0.0002;
      const dist = 35 + Math.sin(currentTime * 0.001 + i) * 5;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Default star
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 30);
    gradient.addColorStop(0, "#fff");
    gradient.addColorStop(0.5, "#ffdd44");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 30, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Draw planet (inspired by solar system planets)
export function drawPlanet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  loc: Location,
  completed: boolean,
  spriteSheet?: HTMLImageElement,
) {
  const radius = 12;
  const planetType = loc.planetType;
  if (planetType && spriteSheet?.complete) {
    const index = PLANET_SPRITE_ORDER.indexOf(planetType);
    if (index >= 0) {
      const cols = 4;
      const spriteW = PLANET_SPRITE_SHEET_WIDTH / cols;
      const spriteH = PLANET_SPRITE_SHEET_HEIGHT / 3;
      const sx = (index % cols) * spriteW;
      const sy = Math.floor(index / cols) * spriteH;
      const size = loc.planetType === "Планета-кольцо" ? 42 : 36;

      ctx.save();
      ctx.globalAlpha = completed ? 0.4 : 1;
      ctx.drawImage(
        spriteSheet,
        sx,
        sy,
        spriteW,
        spriteH,
        x - size / 2,
        y - size / 2,
        size,
        size,
      );
      ctx.restore();
      return;
    }
  }

  const colors = planetType
    ? PLANET_COLORS_IN_SECTOR[planetType]
    : {
      base: "#888888",
      atmosphere: "#aaaaaa",
    };

  if (completed) {
    ctx.globalAlpha = 0.4;
  }

  // Atmosphere glow
  const glowGradient = ctx.createRadialGradient(
    x,
    y,
    radius * 0.8,
    x,
    y,
    radius * 1.5,
  );
  glowGradient.addColorStop(0, "transparent");
  glowGradient.addColorStop(0.5, colors.atmosphere + "40");
  glowGradient.addColorStop(1, "transparent");
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Planet body with gradient
  const planetGradient = ctx.createRadialGradient(
    x - radius * 0.3,
    y - radius * 0.3,
    0,
    x,
    y,
    radius,
  );
  planetGradient.addColorStop(0, colors.atmosphere);
  planetGradient.addColorStop(0.7, colors.base);
  planetGradient.addColorStop(1, colors.base + "aa");
  ctx.fillStyle = planetGradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Add rings for ringed planets
  if (
    (loc.planetType === "Планета-кольцо" || loc.planetType === "Ледяная") &&
    !loc.isEmpty
  ) {
    const ringColor = colors.rings || colors.atmosphere;
    ctx.strokeStyle = ringColor + "80";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      radius * 1.8,
      radius * 0.4,
      Math.PI / 6,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  // Surface details
  ctx.strokeStyle = colors.base + "60";
  ctx.lineWidth = 1;

  if (loc.planetType === "Пустынная") {
    // Desert dunes pattern
    ctx.fillStyle = "#e6a85c";
    for (let i = 0; i < 4; i++) {
      const angle = seededRandom(loc, i) * Math.PI * 2;
      const dist = seededRandom(loc, i + 10) * radius * 0.5;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        2.5,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    // Sand ripples
    ctx.strokeStyle = "#8b5a2b";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      const yOff = (i - 1) * 4;
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.6, y + yOff);
      ctx.quadraticCurveTo(x - radius * 0.3, y + yOff - 2, x, y + yOff);
      ctx.quadraticCurveTo(
        x + radius * 0.3,
        y + yOff + 2,
        x + radius * 0.6,
        y + yOff,
      );
      ctx.stroke();
    }
  }

  if (loc.planetType === "Лесная") {
    // Forest patches
    ctx.fillStyle = "#2d5a2d";
    for (let i = 0; i < 5; i++) {
      const angle = seededRandom(loc, i) * Math.PI * 2;
      const dist = seededRandom(loc, i + 10) * radius * 0.6;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
    // Tree clusters (small dots)
    ctx.fillStyle = "#1a4a2a";
    for (let i = 0; i < 8; i++) {
      const angle = seededRandom(loc, i + 20) * Math.PI * 2;
      const dist = seededRandom(loc, i + 30) * radius * 0.7;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        1.5,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  if (loc.planetType === "Океаническая") {
    // Ocean waves
    ctx.strokeStyle = "#4a8bc9";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const angle = seededRandom(loc, i) * Math.PI * 2;
      const dist = seededRandom(loc, i + 10) * radius * 0.5;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        4,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    // Islands
    ctx.fillStyle = "#8b7355";
    for (let i = 0; i < 3; i++) {
      const angle = seededRandom(loc, i + 20) * Math.PI * 2;
      const dist = seededRandom(loc, i + 30) * radius * 0.6;
      ctx.beginPath();
      ctx.ellipse(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        3,
        2,
        seededRandom(loc, i + 40) * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  if (loc.planetType === "Кристаллическая") {
    // Crystal spikes
    ctx.fillStyle = "#9ef7ff";
    for (let i = 0; i < 4; i++) {
      const angle = seededRandom(loc, i) * Math.PI * 2;
      const dist = seededRandom(loc, i + 10) * radius * 0.55;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.moveTo(px, py - 3);
      ctx.lineTo(px + 2.5, py + 1.5);
      ctx.lineTo(px, py + 4);
      ctx.lineTo(px - 2.5, py + 1.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = "#d8ffff";
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.45, 0.2, Math.PI + 0.4);
    ctx.stroke();
  }

  if (loc.planetType === "Вулканическая") {
    // Lava spots
    ctx.fillStyle = "#ff4400";
    for (let i = 0; i < 3; i++) {
      const angle = seededRandom(loc, i) * Math.PI * 2;
      const dist = seededRandom(loc, i + 10) * radius * 0.6;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  if (loc.planetType === "Радиоактивная") {
    // Radioactive glow spots
    ctx.fillStyle = "#7fff00";
    for (let i = 0; i < 5; i++) {
      const angle = seededRandom(loc, i) * Math.PI * 2;
      const dist = seededRandom(loc, i + 10) * radius * 0.7;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        1.5,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  if (loc.planetType === "Тропическая") {
    // Jungle patterns
    ctx.fillStyle = "#006400";
    for (let i = 0; i < 4; i++) {
      const angle = seededRandom(loc, i) * Math.PI * 2;
      const dist = seededRandom(loc, i + 10) * radius * 0.5;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  if (loc.planetType === "Арктическая") {
    // Ice cracks
    ctx.strokeStyle = "#87ceeb";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const angle = seededRandom(loc, i) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(
        x + Math.cos(angle) * radius * 0.8,
        y + Math.sin(angle) * radius * 0.8,
      );
      ctx.stroke();
    }
  }

  if (loc.planetType === "Разрушенная войной") {
    // Crater scars
    ctx.fillStyle = "#2a2a2a";
    for (let i = 0; i < 4; i++) {
      const angle = seededRandom(loc, i) * Math.PI * 2;
      const dist = seededRandom(loc, i + 10) * radius * 0.6;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  if (loc.planetType === "Приливная") {
    // Tidal volcanic vents
    ctx.fillStyle = "#ff4500";
    for (let i = 0; i < 4; i++) {
      const angle = seededRandom(loc, i) * Math.PI * 2;
      const dist = seededRandom(loc, i + 10) * radius * 0.5;
      ctx.beginPath();
      ctx.arc(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        2.5,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
}

// Draw space station
export function drawStation(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  loc: Location,
  completed: boolean,
  spriteSheet?: HTMLImageElement,
) {
  const stationType = loc.stationType || "trade";
  const sprite = STATION_SPRITES[stationType];
  if (sprite && spriteSheet?.complete) {
    const maxSize = 52;
    const scale = Math.min(maxSize / sprite.width, maxSize / sprite.height);
    const drawWidth = sprite.width * scale;
    const drawHeight = sprite.height * scale;

    ctx.save();
    ctx.globalAlpha = completed ? 0.4 : 1;
    ctx.drawImage(
      spriteSheet,
      sprite.x,
      sprite.y,
      sprite.width,
      sprite.height,
      x - drawWidth / 2,
      y - drawHeight / 2,
      drawWidth,
      drawHeight,
    );
    ctx.restore();
    return;
  }

  if (completed) {
    ctx.globalAlpha = 0.4;
  }

  const stationColors: Record<string, { primary: string; secondary: string; accent: string }> = {
    trade: { primary: "#5ab8d4", secondary: "#2a5a6a", accent: "#00ff88" },
    military: { primary: "#8a7aaa", secondary: "#3a2a4a", accent: "#ff4444" },
    mining: { primary: "#c4a85a", secondary: "#6a5a2a", accent: "#ffaa00" },
    research: { primary: "#8a6aca", secondary: "#4a2a6a", accent: "#00d4ff" },
    shipyard: { primary: "#aa7a4a", secondary: "#4a3a1a", accent: "#ff8800" },
    medical: { primary: "#4aaa7a", secondary: "#1a4a3a", accent: "#00ff88" },
    diplomatic: { primary: "#d4af37", secondary: "#5a4a10", accent: "#ffffff" },
  };

  const colors = stationColors[stationType] || stationColors.trade;

  switch (stationType) {
    case "trade": {
      // ТОРГОВАЯ: Гексагональное кольцо + 3 стыковочных рукава + огни доков
      const hexR = 12;
      // Hexagon fill
      ctx.fillStyle = colors.secondary + "66";
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 6;
        const hx = x + hexR * Math.cos(a);
        const hy = y + hexR * Math.sin(a);
        if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      // Hexagon stroke
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 6;
        const hx = x + hexR * Math.cos(a);
        const hy = y + hexR * Math.sin(a);
        if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
      // 3 docking arms at 90°, 210°, 330°
      for (let i = 0; i < 3; i++) {
        const a = (i * 2 * Math.PI) / 3 - Math.PI / 2;
        const sx = x + hexR * Math.cos(a);
        const sy = y + hexR * Math.sin(a);
        const ex = x + 21 * Math.cos(a);
        const ey = y + 21 * Math.sin(a);
        ctx.strokeStyle = colors.secondary;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        // Docking port ring
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ex, ey, 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = colors.accent + "88";
        ctx.beginPath();
        ctx.arc(ex, ey, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Central hub
      ctx.fillStyle = colors.primary;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "military": {
      // ВОЕННАЯ: Внешнее бронекольцо + 4 орудийные платформы + прицел
      // Outer armor ring
      ctx.strokeStyle = colors.primary + "55";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 21, 0, Math.PI * 2);
      ctx.stroke();
      // Struts to platforms
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(x + 8 * Math.cos(a), y + 8 * Math.sin(a));
        ctx.lineTo(x + 15 * Math.cos(a), y + 15 * Math.sin(a));
        ctx.stroke();
      }
      // 4 weapon platforms at N/S/E/W
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        const px = x + 15 * Math.cos(a);
        const py = y + 15 * Math.sin(a);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a);
        // Platform body
        ctx.fillStyle = colors.secondary;
        ctx.beginPath();
        ctx.moveTo(-4, -4);
        ctx.lineTo(4, -4);
        ctx.lineTo(5, 0);
        ctx.lineTo(4, 4);
        ctx.lineTo(-4, 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 1;
        ctx.stroke();
        // Twin gun barrels pointing outward
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(4, -2);
        ctx.lineTo(9, -2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(4, 2);
        ctx.lineTo(9, 2);
        ctx.stroke();
        // Warning light
        ctx.fillStyle = colors.accent;
        ctx.beginPath();
        ctx.arc(-3, 0, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      // Central fortified hex command center
      ctx.fillStyle = colors.secondary;
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const hx = x + 7 * Math.cos(a);
        const hy = y + 7 * Math.sin(a);
        if (i === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Targeting reticle
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = colors.accent + "99";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - 6, y); ctx.lineTo(x - 4, y);
      ctx.moveTo(x + 4, y); ctx.lineTo(x + 6, y);
      ctx.moveTo(x, y - 6); ctx.lineTo(x, y - 4);
      ctx.moveTo(x, y + 4); ctx.lineTo(x, y + 6);
      ctx.stroke();
      break;
    }

    case "mining":
      // Central hub
      ctx.fillStyle = colors.primary;
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Mining station: industrial, drills, cargo containers
      ctx.fillStyle = colors.secondary;
      // Mining arms with drills (centered)
      ctx.fillRect(x - 20, y - 2, 12, 4); // Left arm
      ctx.fillRect(x + 8, y - 2, 12, 4); // Right arm
      ctx.fillRect(x - 2, y - 20, 4, 12); // Top arm
      ctx.fillRect(x - 2, y + 8, 4, 12); // Bottom arm
      // Drill heads (centered on arms)
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(x - 20, y, 3, 0, Math.PI * 2); // Left drill
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 20, y, 3, 0, Math.PI * 2); // Right drill
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y - 20, 3, 0, Math.PI * 2); // Top drill
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y + 20, 3, 0, Math.PI * 2); // Bottom drill
      ctx.fill();
      // Cargo containers around
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 10, y - 14, 6, 6);
      ctx.strokeRect(x + 4, y - 14, 6, 6);
      ctx.strokeRect(x - 10, y + 8, 6, 6);
      ctx.strokeRect(x + 4, y + 8, 6, 6);
      break;

    case "research": {
      // ИССЛЕДОВАТЕЛЬСКАЯ: Сенсорная мачта + 2 тарелки + атомные орбитальные кольца
      // Orbital rings (behind everything)
      ctx.strokeStyle = colors.accent + "44";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(x, y, 21, 9, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, y, 21, 9, -Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      // Main sensor mast (spine)
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + 16);
      ctx.lineTo(x, y - 22);
      ctx.stroke();
      // Cross bars
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 9, y + 5); ctx.lineTo(x + 9, y + 5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 5); ctx.lineTo(x + 6, y - 5);
      ctx.stroke();
      // Upper satellite dish — bowl opens LEFT (at y-12 on mast)
      // arm from mast to dish center
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - 12);
      ctx.lineTo(x - 8, y - 12);
      ctx.stroke();
      // bowl arc: left semicircle
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x - 8, y - 12, 6, Math.PI / 2, Math.PI * 1.5);
      ctx.stroke();
      // feed point light
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(x - 14, y - 12, 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Lower satellite dish — bowl opens RIGHT (at y+8 on mast)
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.lineTo(x + 8, y + 8);
      ctx.stroke();
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x + 8, y + 8, 6, Math.PI * 1.5, Math.PI / 2);
      ctx.stroke();
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(x + 14, y + 8, 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Central science module
      ctx.fillStyle = colors.secondary;
      ctx.fillRect(x - 4, y - 1, 8, 7);
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 4, y - 1, 8, 7);
      // Antenna tip light
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(x, y - 22, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y - 22, 1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case "shipyard":
      // Central hub
      ctx.fillStyle = colors.primary;
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Shipyard: dry-dock C-clamps on sides + ship skeleton inside
      ctx.fillStyle = colors.secondary;
      ctx.lineWidth = 2;
      // Left dry-dock clamp (C-shape opening right)
      ctx.strokeStyle = colors.primary;
      ctx.beginPath();
      ctx.moveTo(x - 18, y - 10);
      ctx.lineTo(x - 10, y - 10);
      ctx.lineTo(x - 10, y - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 18, y + 10);
      ctx.lineTo(x - 10, y + 10);
      ctx.lineTo(x - 10, y + 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x - 18, y - 10);
      ctx.lineTo(x - 18, y + 10);
      ctx.stroke();
      // Right dry-dock clamp (C-shape opening left)
      ctx.beginPath();
      ctx.moveTo(x + 18, y - 10);
      ctx.lineTo(x + 10, y - 10);
      ctx.lineTo(x + 10, y - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 18, y + 10);
      ctx.lineTo(x + 10, y + 10);
      ctx.lineTo(x + 10, y + 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 18, y - 10);
      ctx.lineTo(x + 18, y + 10);
      ctx.stroke();
      // Ship skeleton outline in dock
      ctx.strokeStyle = colors.accent + "aa";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x - 4, y - 4);
      ctx.lineTo(x + 6, y - 4);
      ctx.lineTo(x + 8, y);
      ctx.lineTo(x + 6, y + 4);
      ctx.lineTo(x - 4, y + 4);
      ctx.closePath();
      ctx.stroke();
      // Orange accent lights on clamp tips
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(x - 18, y - 10, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - 18, y + 10, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 18, y - 10, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 18, y + 10, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "medical": {
      // МЕДИЦИНСКАЯ: Кольцо жизнеобеспечения + медицинский крест + яркое ядро
      // Outer life support ring
      ctx.strokeStyle = colors.primary + "88";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 19, 0, Math.PI * 2);
      ctx.stroke();
      // 4 life support module pods on ring (at 45°, 135°, 225°, 315°)
      ctx.fillStyle = colors.secondary;
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2 + Math.PI / 4;
        const mx = x + 19 * Math.cos(a);
        const my = y + 19 * Math.sin(a);
        ctx.save();
        ctx.translate(mx, my);
        ctx.rotate(a);
        ctx.fillRect(-3.5, -2.5, 7, 5);
        ctx.strokeRect(-3.5, -2.5, 7, 5);
        ctx.restore();
      }
      // Medical cross — vertical bar
      ctx.fillStyle = colors.secondary;
      ctx.fillRect(x - 4, y - 14, 8, 28);
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x - 4, y - 14, 8, 28);
      // Medical cross — horizontal bar
      ctx.fillStyle = colors.secondary;
      ctx.fillRect(x - 14, y - 4, 28, 8);
      ctx.strokeStyle = colors.primary;
      ctx.strokeRect(x - 14, y - 4, 28, 8);
      // Bright central core
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(x, y, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      // Accent lights at cross tips
      ctx.fillStyle = colors.accent;
      const medLights: [number, number][] = [
        [x, y - 14], [x, y + 14], [x - 14, y], [x + 14, y],
      ];
      for (const [lx, ly] of medLights) {
        ctx.beginPath();
        ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case "diplomatic": {
      // ДИПЛОМАТИЧЕСКАЯ: Два кольца + звезда мира в центре
      // Outer glow
      const dipGlow = ctx.createRadialGradient(x, y, 0, x, y, 22);
      dipGlow.addColorStop(0, colors.primary + "44");
      dipGlow.addColorStop(1, "transparent");
      ctx.fillStyle = dipGlow;
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();

      // Left ring
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x - 5, y, 7, 0, Math.PI * 2);
      ctx.stroke();

      // Right ring
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + 5, y, 7, 0, Math.PI * 2);
      ctx.stroke();

      // Center overlap fill (golden)
      ctx.fillStyle = colors.primary + "cc";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      drawSparkGlyph(ctx, x, y, 4, colors.secondary);
      break;
    }
  }

  ctx.globalAlpha = 1;
}

// Draw unknown object (when no scanner) - for anomalies, storms, etc.
// Hexagonal shape to distinguish from ship (which is arrow-shaped)
export function drawUnknown(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  completed: boolean,
) {
  if (completed) {
    ctx.globalAlpha = 0.4;
  }

  // Mystery glow with resonant purple/cyan interference.
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, 24);
  gradient.addColorStop(0, "rgba(174, 132, 255, 0.32)");
  gradient.addColorStop(0.55, "rgba(94, 74, 140, 0.22)");
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.fill();

  // Outer distorted hex frame.
  ctx.strokeStyle = "#9276bf";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const radius = i % 2 === 0 ? 15 : 13;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.stroke();

  // Inner shell.
  ctx.fillStyle = "#14121b";
  ctx.fill();
  ctx.strokeStyle = "#56476f";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const px = x + Math.cos(angle) * 9;
    const py = y + Math.sin(angle) * 9;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.stroke();

  // Resonant core.
  const core = ctx.createRadialGradient(x, y, 0, x, y, 5);
  core.addColorStop(0, "rgba(225, 239, 255, 0.95)");
  core.addColorStop(0.5, "rgba(189, 156, 255, 0.85)");
  core.addColorStop(1, "rgba(189, 156, 255, 0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();

  // Small anomaly markers around the shell.
  ctx.fillStyle = "#a58cdf";
  for (let i = 0; i < 3; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.arc(
      x + Math.cos(angle) * 12,
      y + Math.sin(angle) * 12,
      1.4,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // Subtle question mark so the icon still reads as "unknown".
  ctx.font = "bold 12px Share Tech Mono";
  ctx.fillStyle = "#e7ddff";
  ctx.textAlign = "center";
  ctx.fillText("?", x, y + 4);

  ctx.globalAlpha = 1;
}

// Draw unknown ship (gray, ship-like shape) - for enemy/friendly without scanner
// Distinctly different from unknown object (which is a circle with ?)
export function drawUnknownShip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  completed: boolean,
) {
  if (completed) {
    ctx.globalAlpha = 0.4;
  }

  // Stealth-contact glow.
  const grayGlow = ctx.createRadialGradient(x, y, 0, x, y, 26);
  grayGlow.addColorStop(0, "rgba(170, 182, 200, 0.24)");
  grayGlow.addColorStop(0.5, "rgba(94, 104, 118, 0.18)");
  grayGlow.addColorStop(1, "transparent");
  ctx.fillStyle = grayGlow;
  ctx.beginPath();
  ctx.arc(x, y, 26, 0, Math.PI * 2);
  ctx.fill();

  // Shadow scanner arc behind hull.
  ctx.strokeStyle = "#606b79";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, 18, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();

  // Main hull.
  ctx.fillStyle = "#2d3440";
  ctx.strokeStyle = "#9ba5b3";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x, y - 17);
  ctx.lineTo(x - 7, y - 7);
  ctx.lineTo(x - 13, y + 6);
  ctx.lineTo(x - 7, y + 5);
  ctx.lineTo(x - 4, y + 12);
  ctx.lineTo(x, y + 8);
  ctx.lineTo(x + 4, y + 12);
  ctx.lineTo(x + 7, y + 5);
  ctx.lineTo(x + 13, y + 6);
  ctx.lineTo(x + 7, y - 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cockpit slit.
  ctx.fillStyle = "#171c22";
  ctx.beginPath();
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x - 4.5, y - 1.5);
  ctx.lineTo(x + 4.5, y - 1.5);
  ctx.closePath();
  ctx.fill();

  // Hull segmentation.
  ctx.strokeStyle = "#5f6875";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 2);
  ctx.lineTo(x + 8, y + 2);
  ctx.moveTo(x - 5, y + 6);
  ctx.lineTo(x + 5, y + 6);
  ctx.stroke();

  // Engine pods.
  ctx.fillStyle = "#737e8e";
  ctx.beginPath();
  ctx.arc(x - 4, y + 9, 1.8, 0, Math.PI * 2);
  ctx.arc(x + 4, y + 9, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
}

// Draw enemy ship (always visible - scanner check done before calling)
export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  loc: Location,
  completed: boolean,
) {
  if (completed) {
    ctx.globalAlpha = 0.3;
  }

  const shipType = loc.enemyType || "pirate";

  // Danger glow (red)
  const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
  glowGradient.addColorStop(0, "rgba(255, 0, 64, 0.3)");
  glowGradient.addColorStop(1, "transparent");
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fill();

  // Ship type-specific designs
  switch (shipType) {
    case "pirate":
      // Pirate: jagged, scrap-metal look with multiple weapons
      ctx.fillStyle = "#8b0000";
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 2;

      // Jagged hull
      ctx.beginPath();
      ctx.moveTo(x, y - 15);
      ctx.lineTo(x - 10, y - 5);
      ctx.lineTo(x - 14, y + 8);
      ctx.lineTo(x - 6, y + 10);
      ctx.lineTo(x, y + 5);
      ctx.lineTo(x + 6, y + 10);
      ctx.lineTo(x + 14, y + 8);
      ctx.lineTo(x + 10, y - 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Multiple weapon ports (scattered)
      ctx.fillStyle = "#ff6600";
      ctx.beginPath();
      ctx.arc(x - 8, y - 2, 2, 0, Math.PI * 2);
      ctx.arc(x + 8, y - 2, 2, 0, Math.PI * 2);
      ctx.arc(x - 10, y + 6, 2, 0, Math.PI * 2);
      ctx.arc(x + 10, y + 6, 2, 0, Math.PI * 2);
      ctx.fill();

      // Skull-like cockpit
      ctx.fillStyle = "#ff4444";
      ctx.beginPath();
      ctx.arc(x, y - 8, 3, 0, Math.PI * 2);
      ctx.fill();

      // Engine
      ctx.fillStyle = "#ff4400";
      ctx.beginPath();
      ctx.moveTo(x - 4, y + 8);
      ctx.lineTo(x, y + 15);
      ctx.lineTo(x + 4, y + 8);
      ctx.closePath();
      ctx.fill();
      break;

    case "raider":
      // Raider: sleek, fast, aggressive design
      ctx.fillStyle = "#a02020";
      ctx.strokeStyle = "#ff5555";
      ctx.lineWidth = 2;

      // Sleek pointed hull
      ctx.beginPath();
      ctx.moveTo(x, y - 18);
      ctx.lineTo(x - 8, y + 2);
      ctx.lineTo(x - 12, y + 10);
      ctx.lineTo(x - 4, y + 8);
      ctx.lineTo(x, y + 5);
      ctx.lineTo(x + 4, y + 8);
      ctx.lineTo(x + 12, y + 10);
      ctx.lineTo(x + 8, y + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Forward cannons
      ctx.fillStyle = "#ff6600";
      ctx.fillRect(x - 3, y - 12, 2, 8);
      ctx.fillRect(x + 1, y - 12, 2, 8);

      // Cockpit slit
      ctx.fillStyle = "#ff4444";
      ctx.fillRect(x - 4, y - 6, 8, 3);

      // Twin engines
      ctx.fillStyle = "#ff4400";
      ctx.beginPath();
      ctx.arc(x - 6, y + 10, 3, 0, Math.PI * 2);
      ctx.arc(x + 6, y + 10, 3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "mercenary":
      // Mercenary: professional, military-grade, angular
      ctx.fillStyle = "#6a3a3a";
      ctx.strokeStyle = "#ff6666";
      ctx.lineWidth = 2;

      // Angular military hull
      ctx.beginPath();
      ctx.moveTo(x, y - 14);
      ctx.lineTo(x - 12, y + 2);
      ctx.lineTo(x - 8, y + 6);
      ctx.lineTo(x - 12, y + 10);
      ctx.lineTo(x - 4, y + 10);
      ctx.lineTo(x, y + 6);
      ctx.lineTo(x + 4, y + 10);
      ctx.lineTo(x + 12, y + 10);
      ctx.lineTo(x + 8, y + 6);
      ctx.lineTo(x + 12, y + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Weapon mounts (symmetrical)
      ctx.fillStyle = "#ff6600";
      ctx.beginPath();
      ctx.arc(x - 10, y, 2.5, 0, Math.PI * 2);
      ctx.arc(x + 10, y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Military cockpit
      ctx.fillStyle = "#ff5555";
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x - 4, y - 4);
      ctx.lineTo(x + 4, y - 4);
      ctx.closePath();
      ctx.fill();

      // Engine cluster
      ctx.fillStyle = "#ff4400";
      ctx.beginPath();
      ctx.arc(x, y + 12, 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "marauder":
      // Marauder: scavenged, mismatched, opportunistic
      ctx.fillStyle = "#7a2a2a";
      ctx.strokeStyle = "#ff5555";
      ctx.lineWidth = 2;

      // Asymmetric hull (scavenged look)
      ctx.beginPath();
      ctx.moveTo(x - 2, y - 14);
      ctx.lineTo(x - 10, y - 2);
      ctx.lineTo(x - 14, y + 6);
      ctx.lineTo(x - 8, y + 10);
      ctx.lineTo(x, y + 6);
      ctx.lineTo(x + 10, y + 8);
      ctx.lineTo(x + 12, y + 2);
      ctx.lineTo(x + 8, y - 6);
      ctx.lineTo(x + 4, y - 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Mismatched weapons
      ctx.fillStyle = "#ff6600";
      ctx.beginPath();
      ctx.arc(x - 8, y - 4, 2, 0, Math.PI * 2);
      ctx.arc(x + 6, y + 4, 2.5, 0, Math.PI * 2);
      ctx.arc(x - 6, y + 8, 2, 0, Math.PI * 2);
      ctx.fill();

      // Patched cockpit
      ctx.fillStyle = "#ff5555";
      ctx.beginPath();
      ctx.arc(x + 2, y - 6, 3, 0, Math.PI * 2);
      ctx.fill();

      // Uneven engines
      ctx.fillStyle = "#ff4400";
      ctx.beginPath();
      ctx.arc(x - 4, y + 10, 2.5, 0, Math.PI * 2);
      ctx.arc(x + 6, y + 10, 3, 0, Math.PI * 2);
      ctx.fill();
      break;

    default:
      // Generic enemy ship
      ctx.fillStyle = "#8b0000";
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(x, y - 15);
      ctx.lineTo(x - 12, y + 10);
      ctx.lineTo(x, y + 5);
      ctx.lineTo(x + 12, y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Weapon ports
      ctx.fillStyle = "#ff6600";
      ctx.beginPath();
      ctx.arc(x - 6, y + 3, 2, 0, Math.PI * 2);
      ctx.arc(x + 6, y + 3, 2, 0, Math.PI * 2);
      ctx.fill();

      // Engine glow
      ctx.fillStyle = "#ff4400";
      ctx.beginPath();
      ctx.moveTo(x - 5, y + 10);
      ctx.lineTo(x, y + 16);
      ctx.lineTo(x + 5, y + 10);
      ctx.closePath();
      ctx.fill();
      break;
  }

  ctx.globalAlpha = 1;
}

// Draw anomaly — shape varies by tier
export function drawAnomaly(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  loc: Location,
  completed: boolean,
) {
  if (completed) {
    ctx.globalAlpha = 0.3;
  }

  const color = loc.anomalyColor || "#00ff41";
  const tier = loc.anomalyTier ?? 1;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  if (tier === 1) {
    // Tier 1: simple pulsing circle + "?"
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = completed ? 0.1 : 0.15;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = completed ? 0.3 : 1;

    ctx.font = "bold 13px Share Tech Mono";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText("?", x, y + 5);
  } else if (tier === 2) {
    // Tier 2: diamond (rotated square)
    const r = 11;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.stroke();

    ctx.globalAlpha = completed ? 0.1 : 0.18;
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r, y);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = completed ? 0.3 : 1;

    // inner dot
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (tier === 3) {
    // Tier 3: 6-pointed star
    const outerR = 13;
    const innerR = 6;
    const points = 6;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.globalAlpha = completed ? 0.1 : 0.2;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = completed ? 0.3 : 1;

    // center glow
    const grad3 = ctx.createRadialGradient(x, y, 0, x, y, 5);
    grad3.addColorStop(0, "#fff");
    grad3.addColorStop(1, color);
    ctx.fillStyle = grad3;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Tier 4: 4-pointed star + two orbital rings
    const outerR = 14;
    const innerR = 5;
    const points = 4;
    ctx.lineWidth = 2;

    // Outer orbital ring
    ctx.globalAlpha = completed ? 0.15 : 0.4;
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Inner orbital ring
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = completed ? 0.3 : 1;

    // 4-pointed star
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 4;
      const r = i % 2 === 0 ? outerR : innerR;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.globalAlpha = completed ? 0.1 : 0.25;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 4;
      const r = i % 2 === 0 ? outerR : innerR;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = completed ? 0.3 : 1;

    // Bright core
    const grad4 = ctx.createRadialGradient(x, y, 0, x, y, 6);
    grad4.addColorStop(0, "#fff");
    grad4.addColorStop(0.5, color);
    grad4.addColorStop(1, "transparent");
    ctx.fillStyle = grad4;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

// Draw friendly ship (always visible - scanner check done before calling)
export function drawFriendlyShip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  loc: Location,
  completed: boolean,
) {
  if (completed) {
    ctx.globalAlpha = 0.4;
  }

  const shipRace = loc.shipRace || "human";
  const shipName = loc.name || "";

  // Determine ship type from name
  const getShipType = (name: string): string => {
    if (name.includes("Торговец") || name.includes("Trader"))
      return "trader";
    if (name.includes("Наём") || name.includes("Mercenary"))
      return "mercenary";
    if (
      name.includes("Курьер") ||
      name.includes("Courier") ||
      name.includes("Фрегат")
    )
      return "courier";
    if (name.includes("Баржа") || name.includes("Barge")) return "barge";
    if (name.includes("Зонд") || name.includes("Probe")) return "probe";
    if (name.includes("Исслед") || name.includes("Explorer"))
      return "explorer";
    return "default";
  };

  const shipType = getShipType(shipName);

  // Race colors
  const raceColors: Record<
    string,
    { primary: string; secondary: string; accent: string }
  > = {
    human: { primary: "#2a6a8a", secondary: "#4a9aba", accent: "#7fc8dc" },
    synthetic: {
      primary: "#6a6a7a",
      secondary: "#8a8a9a",
      accent: "#00ffff",
    },
    xenosymbiont: {
      primary: "#4a8a4a",
      secondary: "#6aaa6a",
      accent: "#88ff88",
    },
    krylorian: {
      primary: "#8a6a4a",
      secondary: "#aa8a6a",
      accent: "#ffcc88",
    },
    voidborn: {
      primary: "#4a3a5a",
      secondary: "#6a5a7a",
      accent: "#aa88ff",
    },
    crystalline: {
      primary: "#5a7a9a",
      secondary: "#7a9aba",
      accent: "#aaddff",
    },
  };

  const colors = raceColors[shipRace] || raceColors.human;

  // Friendly glow (blue/cyan)
  const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
  glowGradient.addColorStop(0, "rgba(0, 180, 255, 0.3)");
  glowGradient.addColorStop(1, "transparent");
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fill();

  // Ship type-specific designs
  switch (shipType) {
    case "trader":
      // Trader: bulky cargo holds
      ctx.fillStyle = colors.primary;
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = 2;

      // Main hull
      ctx.beginPath();
      ctx.ellipse(x, y, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cargo containers on sides
      ctx.fillStyle = colors.secondary;
      ctx.fillRect(x - 18, y - 6, 6, 12);
      ctx.fillRect(x + 12, y - 6, 6, 12);

      // Cockpit
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(x, y - 2, 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "mercenary":
      // Mercenary: angular, weapon mounts
      ctx.fillStyle = colors.primary;
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = 2;

      // Angular hull
      ctx.beginPath();
      ctx.moveTo(x, y - 14);
      ctx.lineTo(x - 12, y + 6);
      ctx.lineTo(x - 6, y + 6);
      ctx.lineTo(x, y + 2);
      ctx.lineTo(x + 6, y + 6);
      ctx.lineTo(x + 12, y + 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Weapon mounts
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(x - 10, y - 4, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 10, y - 4, 2, 0, Math.PI * 2);
      ctx.fill();

      // Cockpit slit
      ctx.fillStyle = colors.secondary;
      ctx.fillRect(x - 4, y - 6, 8, 3);
      break;

    case "courier":
      // Courier: sleek, fast design
      ctx.fillStyle = colors.primary;
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = 2;

      // Sleek pointed hull
      ctx.beginPath();
      ctx.moveTo(x, y - 16);
      ctx.lineTo(x - 8, y + 4);
      ctx.lineTo(x, y + 2);
      ctx.lineTo(x + 8, y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Engine boost
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(x, y + 8, 3, 0, Math.PI * 2);
      ctx.fill();

      // Wings
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 4);
      ctx.lineTo(x - 14, y + 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 6, y - 4);
      ctx.lineTo(x + 14, y + 2);
      ctx.stroke();
      break;

    case "barge":
      // Barge: massive, blocky
      ctx.fillStyle = colors.primary;
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = 2;

      // Large rectangular hull
      ctx.fillRect(x - 16, y - 10, 32, 20);
      ctx.strokeRect(x - 16, y - 10, 32, 20);

      // Bridge tower
      ctx.fillStyle = colors.secondary;
      ctx.fillRect(x - 6, y - 14, 12, 8);

      // Engine cluster
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(x - 8, y + 12, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 8, y + 12, 3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "probe":
      // Probe: small, automated
      ctx.fillStyle = colors.primary;
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = 1.5;

      // Central sphere
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Solar panels (cross shape)
      ctx.fillStyle = colors.secondary;
      ctx.fillRect(x - 14, y - 2, 8, 4);
      ctx.fillRect(x + 6, y - 2, 8, 4);
      ctx.fillRect(x - 2, y - 14, 4, 8);
      ctx.fillRect(x - 2, y + 6, 4, 8);

      // Antenna
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x, y - 16);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y - 17, 2, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case "explorer":
      // Explorer: scientific equipment, sensors
      ctx.fillStyle = colors.primary;
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = 2;

      // Main hull (teardrop shape)
      ctx.beginPath();
      ctx.moveTo(x, y - 14);
      ctx.quadraticCurveTo(x - 10, y, x - 8, y + 10);
      ctx.lineTo(x + 8, y + 10);
      ctx.quadraticCurveTo(x + 10, y, x, y - 14);
      ctx.fill();
      ctx.stroke();

      // Sensor dishes
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x - 12, y - 6, 4, 0, Math.PI, false);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 12, y - 6, 4, 0, Math.PI, false);
      ctx.stroke();

      // Lab module
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(x, y + 4, 3, 0, Math.PI * 2);
      ctx.fill();
      break;

    default:
      // Generic ship
      ctx.fillStyle = colors.primary;
      ctx.strokeStyle = colors.secondary;
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(x, y - 12);
      ctx.lineTo(x - 10, y + 8);
      ctx.lineTo(x, y + 4);
      ctx.lineTo(x + 10, y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit
      ctx.fillStyle = colors.accent;
      ctx.beginPath();
      ctx.arc(x, y - 4, 3, 0, Math.PI * 2);
      ctx.fill();

      // Engine
      ctx.fillStyle = colors.secondary;
      ctx.beginPath();
      ctx.arc(x, y + 6, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
  }

  ctx.globalAlpha = 1;
}

// Draw asteroid belt
export function drawAsteroidBelt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  loc: Location,
  completed: boolean,
) {
  if (completed || loc.mined) {
    ctx.globalAlpha = 0.4;
  }

  const tier = loc.asteroidTier || 1;
  const color =
    tier === 1
      ? "#8b7355"
      : tier === 2
        ? "#a0522d"
        : tier === 3
          ? "#cd853f"
          : "#ffb000"; // tier 4 = gold
  const isAncient = tier === 4;

  // Ancient glow
  if (isAncient) {
    const ancientGlow = ctx.createRadialGradient(x, y, 0, x, y, 25);
    ancientGlow.addColorStop(0, "rgba(255, 170, 0, 0.3)");
    ancientGlow.addColorStop(1, "transparent");
    ctx.fillStyle = ancientGlow;
    ctx.beginPath();
    ctx.arc(x, y, 25, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dust cloud
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, 18);
  gradient.addColorStop(0, color + "40");
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.fill();

  // Hash function for deterministic pseudo-random values
  const hash = (n: number): number => {
    const h = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return h - Math.floor(h);
  };

  // Use location ID to seed the hash for consistent asteroid positions
  const locId = loc.id || "unknown";
  let locHash = 0;
  for (let i = 0; i < locId.length; i++) {
    locHash = (locHash << 5) - locHash + locId.charCodeAt(i);
    locHash = locHash & locHash;
  }
  locHash = Math.abs(locHash);

  // Draw multiple small asteroids (deterministic positions and sizes)
  ctx.fillStyle = color;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const dist = 6 + hash(locHash + i) * 4;
    const ax = x + Math.cos(angle) * dist;
    const ay = y + Math.sin(angle) * dist;
    const size = 2 + hash(locHash + i + 100) * 2;

    ctx.beginPath();
    ctx.moveTo(ax + size, ay);
    ctx.lineTo(ax, ay + size);
    ctx.lineTo(ax - size, ay);
    ctx.lineTo(ax, ay - size);
    ctx.closePath();
    ctx.fill();
  }

  // Center asteroid (larger)
  ctx.fillStyle = "#cd853f";
  ctx.beginPath();
  ctx.moveTo(x + 4, y);
  ctx.lineTo(x, y + 3);
  ctx.lineTo(x - 4, y);
  ctx.lineTo(x, y - 3);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 1;
}

export function drawSparkGlyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.28, y - size * 0.28);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x + size * 0.28, y + size * 0.28);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size * 0.28, y + size * 0.28);
  ctx.lineTo(x - size, y);
  ctx.lineTo(x - size * 0.28, y - size * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawBoltGlyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + size * 0.1, y - size);
  ctx.lineTo(x - size * 0.55, y + size * 0.1);
  ctx.lineTo(x - size * 0.05, y + size * 0.1);
  ctx.lineTo(x - size * 0.25, y + size);
  ctx.lineTo(x + size * 0.6, y - size * 0.25);
  ctx.lineTo(x + size * 0.08, y - size * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawRadiationGlyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.moveTo(
      x + Math.cos(angle - 0.22) * size * 0.38,
      y + Math.sin(angle - 0.22) * size * 0.38,
    );
    ctx.arc(x, y, size, angle - 0.36, angle + 0.36);
    ctx.lineTo(
      x + Math.cos(angle + 0.22) * size * 0.38,
      y + Math.sin(angle + 0.22) * size * 0.38,
    );
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#061106";
  ctx.beginPath();
  ctx.arc(x, y, size * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGravityGlyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.68, Math.PI * 0.1, Math.PI * 1.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, size * 0.38, Math.PI * 1.05, Math.PI * 2.45);
  ctx.stroke();
  ctx.fillStyle = "#030006";
  ctx.beginPath();
  ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawHourglassGlyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.55, y - size);
  ctx.lineTo(x + size * 0.55, y - size);
  ctx.lineTo(x - size * 0.55, y + size);
  ctx.lineTo(x + size * 0.55, y + size);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y - size * 0.55, size * 0.15, 0, Math.PI * 2);
  ctx.arc(x, y + size * 0.55, size * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawHexGlyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  for (let layer = 0; layer < 2; layer++) {
    const radius = size * (layer === 0 ? 0.85 : 0.45);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6 - Math.PI / 6;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

export function drawStormGlyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  stormType: StormType,
  color: string,
) {
  switch (stormType) {
    case "radiation":
      drawRadiationGlyph(ctx, x, y, 8, color);
      break;
    case "ionic":
      drawBoltGlyph(ctx, x, y, 8, color);
      break;
    case "plasma":
      drawSparkGlyph(ctx, x, y, 8, color);
      break;
    case "gravitational":
      drawGravityGlyph(ctx, x, y, 9, color);
      break;
    case "temporal":
      drawHourglassGlyph(ctx, x, y, 8, color);
      break;
    case "nanite":
      drawHexGlyph(ctx, x, y, 8, color);
      break;
    default:
      drawSparkGlyph(ctx, x, y, 7, color);
      break;
  }
}

export function drawGearGlyph(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    ctx.beginPath();
    ctx.moveTo(
      x + Math.cos(angle) * size * 0.55,
      y + Math.sin(angle) * size * 0.55,
    );
    ctx.lineTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, size * 0.62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, size * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Draw storm
export function drawStorm(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  loc: Location,
  completed: boolean,
) {
  if (completed) {
    ctx.globalAlpha = 0.4;
  }

  const stormType = loc.stormType || "radiation";

  let color: string;

  switch (stormType) {
    case "radiation":
      color = "#00ff00";
      break;
    case "ionic":
      color = "#00d4ff";
      break;
    case "plasma":
      color = "#ff4400";
      break;
    case "gravitational":
      color = "#9d00ff";
      break;
    case "temporal":
      color = "#ff00ff";
      break;
    case "nanite":
      color = "#ffaa00";
      break;
    default:
      color = "#00ff00";
  }

  // Storm cloud base
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
  gradient.addColorStop(0, color + "60");
  gradient.addColorStop(0.5, color + "30");
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();

  // Unique visual effects for each storm type
  switch (stormType) {
    case "radiation":
      // Radiation: pulsing waves emanating from center
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const radius = 6 + i * 5;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3;
        const rx = x + Math.cos(angle) * 14;
        const ry = y + Math.sin(angle) * 14;
        drawRadiationGlyph(ctx, rx, ry, 3.5, color);
      }
      break;

    case "ionic":
      // Ionic: lightning bolts striking outward
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        const startX = x + Math.cos(angle) * 8;
        const startY = y + Math.sin(angle) * 8;
        const endX = x + Math.cos(angle) * 18;
        const endY = y + Math.sin(angle) * 18;
        // Zigzag lightning
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 6;
        const midY = (startY + endY) / 2 + (Math.random() - 0.5) * 6;
        ctx.lineTo(midX, midY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
      break;

    case "plasma":
      // Plasma: simple fiery blobs without animation
      ctx.fillStyle = color + "60";
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI * 2) / 4;
        const dist = 10;
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;
        const blobSize = 4;
        ctx.beginPath();
        ctx.arc(px, py, blobSize, 0, Math.PI * 2);
        ctx.fill();
      }
      // Simple center glow
      const plasmaGradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
      plasmaGradient.addColorStop(0, color + "80");
      plasmaGradient.addColorStop(1, "transparent");
      ctx.fillStyle = plasmaGradient;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "gravitational":
      // Gravitational: spiral arms pulling inward
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      for (let arm = 0; arm < 3; arm++) {
        const baseAngle = (arm * Math.PI * 2) / 3;
        ctx.beginPath();
        for (let t = 0; t <= 1; t += 0.1) {
          const spiralAngle = baseAngle + t * Math.PI;
          const radius = 18 - t * 14;
          const sx = x + Math.cos(spiralAngle) * radius;
          const sy = y + Math.sin(spiralAngle) * radius;
          if (t === 0) {
            ctx.moveTo(sx, sy);
          } else {
            ctx.lineTo(sx, sy);
          }
        }
        ctx.stroke();
      }
      // Dark core
      const coreGradient = ctx.createRadialGradient(x, y, 0, x, y, 8);
      coreGradient.addColorStop(0, "#000");
      coreGradient.addColorStop(0.5, color + "40");
      coreGradient.addColorStop(1, "transparent");
      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "temporal":
      // Temporal: concentric rings with gaps (time distortion)
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const radius = 5 + i * 4;
        const startAngle = i * 0.3;
        const endAngle = Math.PI * 2 - i * 0.3;
        ctx.beginPath();
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.stroke();
      }
      // Pulsing dots on rings
      ctx.fillStyle = color;
      for (let i = 0; i < 3; i++) {
        const angle = (i * Math.PI * 2) / 3 + Date.now() * 0.001;
        const radius = 8 + i * 3;
        const dx = x + Math.cos(angle) * radius;
        const dy = y + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.arc(dx, dy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case "nanite":
      // Nanite: swarm of small particles
      ctx.fillStyle = color;
      const particleCount = 20;
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const dist = 6 + (i % 5) * 3;
        const px = x + Math.cos(angle + i * 0.3) * dist;
        const py = y + Math.sin(angle + i * 0.3) * dist;
        ctx.beginPath();
        ctx.rect(px - 1.5, py - 1.5, 3, 3); // Small squares
        ctx.fill();
      }
      // Hexagonal boundary
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const angle = (i * Math.PI * 2) / 6;
        const hx = x + Math.cos(angle) * 18;
        const hy = y + Math.sin(angle) * 18;
        if (i === 0) {
          ctx.moveTo(hx, hy);
        } else {
          ctx.lineTo(hx, hy);
        }
      }
      ctx.closePath();
      ctx.stroke();
      break;
  }

  // Storm symbol in center
  drawStormGlyph(ctx, x, y, stormType, color);

  ctx.globalAlpha = 1;
}

// Draw distress signal
export function drawDistressSignal(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  loc: Location,
  completed: boolean,
  time: number = 0,
) {
  const isResolved = completed || loc.signalResolved;
  const baseAlpha = isResolved ? 0.35 : 1;
  const t = time / 1000; // секунды

  // Цвет зависит от раскрытого типа сигнала
  let color = "#ffaa00"; // неизвестно
  if (loc.signalRevealed && loc.signalType) {
    if (loc.signalType === "pirate_ambush") color = "#ff0040";
    else if (loc.signalType === "survivors") color = "#00ff41";
    else if (loc.signalType === "abandoned_cargo") color = "#00d4ff";
  }
  if (isResolved) color = "#666666";

  // Разбиваем hex-цвет на RGB для rgba()
  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };
  const rgb = hexToRgb(color);

  // ── Одно медленное кольцо ─────────────────────────────────────────
  if (!isResolved) {
    const phase = (t * 0.18) % 1; // очень медленное расширение
    const ringRadius = 10 + phase * 14;
    const ringAlpha = (1 - phase) * 0.18;
    ctx.globalAlpha = ringAlpha;
    ctx.strokeStyle = `rgba(${rgb}, 1)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ── Фоновое свечение ──────────────────────────────────────────────
  const glowPulse = isResolved
    ? 0.12
    : 0.18 + 0.05 * Math.sin(t * Math.PI * 0.6); // очень медленная пульсация
  ctx.globalAlpha = baseAlpha;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, 16);
  gradient.addColorStop(0, `rgba(${rgb}, ${glowPulse})`);
  gradient.addColorStop(0.6, `rgba(${rgb}, ${glowPulse * 0.3})`);
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, 16, 0, Math.PI * 2);
  ctx.fill();

  // ── Ромбовидный корпус маяка ──────────────────────────────────────
  const corePulse = isResolved ? 1 : 1 + 0.03 * Math.sin(t * Math.PI * 0.6); // едва заметная пульсация
  const s = 7 * corePulse;
  ctx.globalAlpha = baseAlpha;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4); // 45° → ромб
  ctx.fillStyle = isResolved ? "#111" : "#100500";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.rect(-s, -s, s * 2, s * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // ── Внутренний сигнал маяка ───────────────────────────────────────
  const signalBlink = isResolved
    ? 0.6
    : 0.88 + 0.12 * Math.sin(t * Math.PI * 0.6); // синхронно с glow
  ctx.globalAlpha = baseAlpha * signalBlink;
  ctx.strokeStyle = isResolved ? "#666" : color;
  ctx.fillStyle = isResolved ? "#666" : color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, y + 5);
  ctx.lineTo(x, y - 5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y - 5, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y - 2, 4.8, -Math.PI * 0.78, -Math.PI * 0.22);
  ctx.arc(x, y - 2, 4.8, Math.PI * 0.22, Math.PI * 0.78);
  ctx.stroke();

  // Сброс
  ctx.globalAlpha = 1;
  ctx.textBaseline = "alphabetic";
}

// Draw Ancient Boss - Relict of lost civilization
export function drawAncientBoss(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  loc: Location,
  completed: boolean,
) {
  if (completed || loc.bossDefeated) {
    ctx.globalAlpha = 0.4;
  }

  const bossType = loc.bossType || "default";

  // Danger aura (purple for ancient)
  const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, 35);
  glowGradient.addColorStop(0, "rgba(255, 0, 255, 0.4)");
  glowGradient.addColorStop(0.5, "rgba(255, 0, 255, 0.2)");
  glowGradient.addColorStop(1, "transparent");
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(x, y, 35, 0, Math.PI * 2);
  ctx.fill();

  // Hexagonal frame (ancient tech)
  ctx.strokeStyle = "#ff00ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
    const px = x + Math.cos(angle) * 18;
    const py = y + Math.sin(angle) * 18;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.stroke();

  // Boss-specific icons
  switch (bossType) {
    case "sentinel":
      // ⚙️ Страж Врат - Gear/Watchman
      ctx.fillStyle = "#ffaa00";
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      // Gear teeth
      ctx.strokeStyle = "#ffcc00";
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(angle) * 12, y + Math.sin(angle) * 12);
        ctx.lineTo(x + Math.cos(angle) * 16, y + Math.sin(angle) * 16);
        ctx.stroke();
      }
      // Central eye
      ctx.fillStyle = "#00ffff";
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "stalker":
      // Nova Stalker - flame collector
      ctx.fillStyle = "#ff4400";
      ctx.beginPath();
      ctx.moveTo(x, y - 14);
      ctx.lineTo(x - 8, y + 6);
      ctx.lineTo(x - 4, y + 6);
      ctx.lineTo(x, y - 4);
      ctx.lineTo(x + 4, y + 6);
      ctx.lineTo(x + 8, y + 6);
      ctx.closePath();
      ctx.fill();
      // Solar flare accents
      ctx.fillStyle = "#ffaa00";
      ctx.beginPath();
      ctx.arc(x - 6, y - 8, 3, 0, Math.PI * 2);
      ctx.arc(x + 6, y - 8, 3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "leech":
      // 🩸 Пустотный Паразит - Void Leech (tentacles)
      ctx.fillStyle = "#aa00ff";
      ctx.beginPath();
      ctx.arc(x, y - 4, 8, 0, Math.PI * 2);
      ctx.fill();
      // Tentacles
      ctx.strokeStyle = "#cc44ff";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const angle = Math.PI + (i / 3) * Math.PI;
        ctx.beginPath();
        ctx.moveTo(x, y + 4);
        ctx.quadraticCurveTo(
          x + Math.sin(angle) * 10,
          y + 8,
          x + Math.sin(angle) * 14,
          y + 14,
        );
        ctx.stroke();
      }
      break;

    case "harvester":
      // 🌀 Жнец Прайм - Harvester (spiral collector)
      ctx.strokeStyle = "#00ff88";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x, y, 8 + i * 3, angle, angle + Math.PI);
        ctx.stroke();
      }
      // Central core
      ctx.fillStyle = "#00ff88";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "hunter":
      // Phase Hunter - lightning bolt
      ctx.fillStyle = "#00d4ff";
      ctx.beginPath();
      ctx.moveTo(x + 4, y - 14);
      ctx.lineTo(x - 6, y - 4);
      ctx.lineTo(x, y - 4);
      ctx.lineTo(x - 4, y + 14);
      ctx.lineTo(x + 6, y + 4);
      ctx.lineTo(x, y + 4);
      ctx.closePath();
      ctx.fill();
      // Phase rings
      ctx.strokeStyle = "#00d4ff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.stroke();
      break;

    case "reaver":
      // ❄️ Ледяной Разоритель - Cryo Reaver (snowflake)
      ctx.strokeStyle = "#88ffff";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * 12, y + Math.sin(angle) * 12);
        ctx.stroke();
      }
      // Ice crystals
      ctx.fillStyle = "#88ffff";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "oracle":
      // 👁️ Оракул Пустоты - Void Oracle (all-seeing eye)
      ctx.fillStyle = "#ff00ff";
      ctx.beginPath();
      ctx.ellipse(x, y, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eye pupil
      ctx.fillStyle = "#00ffff";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      // Eyelids
      ctx.strokeStyle = "#ff00ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 10, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 10, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
      break;

    case "destroyer":
      // Nexus Destroyer - disruptor core
      ctx.fillStyle = "#ff4444";
      ctx.beginPath();
      ctx.arc(x, y - 4, 8, 0, Math.PI * 2);
      ctx.fill();
      // Eye sockets
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(x - 3, y - 6, 2, 0, Math.PI * 2);
      ctx.arc(x + 3, y - 6, 2, 0, Math.PI * 2);
      ctx.fill();
      // Cross bones
      ctx.strokeStyle = "#ff4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 8, y + 4);
      ctx.lineTo(x + 8, y + 12);
      ctx.moveTo(x + 8, y + 4);
      ctx.lineTo(x - 8, y + 12);
      ctx.stroke();
      break;

    case "warden":
      // Chronos Warden - hourglass
      ctx.strokeStyle = "#ffaa00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 8, y - 10);
      ctx.lineTo(x + 8, y - 10);
      ctx.lineTo(x + 4, y);
      ctx.lineTo(x + 8, y + 10);
      ctx.lineTo(x - 8, y + 10);
      ctx.lineTo(x - 4, y);
      ctx.closePath();
      ctx.stroke();
      // Sand
      ctx.fillStyle = "#ffaa00";
      ctx.beginPath();
      ctx.arc(x, y - 5, 3, 0, Math.PI * 2);
      ctx.fill();
      break;

    case "eternal":
      // ♾️ Вечный - The Eternal (infinity symbol)
      ctx.strokeStyle = "#aa00ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x - 8, y - 8, x - 14, y, x - 8, y + 8);
      ctx.bezierCurveTo(x - 4, y + 4, x, y, x, y);
      ctx.bezierCurveTo(x + 4, y - 4, x + 8, y + 8, x + 8, y + 8);
      ctx.bezierCurveTo(x + 14, y, x + 8, y - 8, x, y);
      ctx.stroke();
      // Center glow
      ctx.fillStyle = "#cc44ff";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      break;

    default:
      // Generic ancient boss
      ctx.fillStyle = "#ff00ff";
      ctx.beginPath();
      ctx.arc(x, y, 12, 0, Math.PI * 2);
      ctx.fill();
      drawGearGlyph(ctx, x, y, 8, "#fff");
      break;
  }

  ctx.globalAlpha = 1;
}

// Draw meteors - shooting stars flying across the sector
export function drawMeteors(
  ctx: CanvasRenderingContext2D,
  animState: {
    meteors: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      length: number;
      brightness: number;
      active: boolean;
    }>;
    time: number;
  },
) {
  animState.meteors.forEach((meteor) => {
    if (!meteor.active) return;

    const angle = Math.atan2(meteor.vy, meteor.vx);
    const tailX = meteor.x - Math.cos(angle) * meteor.length;
    const tailY = meteor.y - Math.sin(angle) * meteor.length;

    // Meteor gradient tail
    const gradient = ctx.createLinearGradient(
      meteor.x,
      meteor.y,
      tailX,
      tailY,
    );
    gradient.addColorStop(0, `rgba(255, 255, 255, ${meteor.brightness})`);
    gradient.addColorStop(
      0.3,
      `rgba(200, 200, 255, ${meteor.brightness * 0.6})`,
    );
    gradient.addColorStop(1, "transparent");

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(meteor.x, meteor.y);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();

    // Bright head
    ctx.fillStyle = `rgba(255, 255, 255, ${meteor.brightness})`;
    ctx.beginPath();
    ctx.arc(meteor.x, meteor.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Draw cosmic dust particles - floating space debris
export function drawParticles(
  ctx: CanvasRenderingContext2D,
  animState: {
    particles: Array<{
      nx: number;
      ny: number;
      size: number;
      vx: number;
      vy: number;
      brightness: number;
      color: string;
    }>;
    time: number;
  },
  width: number,
  height: number,
) {
  animState.particles.forEach((particle) => {
    const x = particle.nx * width;
    const y = particle.ny * height;

    // Twinkle effect
    const twinkle =
      Math.sin(animState.time * 0.003 + particle.brightness * Math.PI) *
      0.3 +
      0.7;

    ctx.fillStyle = particle.color.replace(
      /[\d.]+\)$/g,
      `${particle.brightness * twinkle * 0.5})`,
    );
    ctx.beginPath();
    ctx.arc(x, y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Draw twinkling stars on main canvas (overlay for animation)
export function drawTwinklingStars(
  ctx: CanvasRenderingContext2D,
  stars: Array<{
    nx: number;
    ny: number;
    size: number;
    brightness: number;
    twinkleSpeed: number;
    twinkleOffset: number;
  }>,
  time: number,
  width: number,
  height: number,
) {
  stars.forEach((star) => {
    const x = star.nx * width;
    const y = star.ny * height;
    const twinkle =
      Math.sin(time * 0.002 * star.twinkleSpeed + star.twinkleOffset) *
      0.3 +
      0.7;
    const alpha = (0.3 + star.brightness * 0.7) * twinkle;

    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Draw derelict ship
export function drawDerelictShip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  loc: Location,
  completed: boolean,
) {
  const isExplored = completed || loc.derelictExplored;
  ctx.globalAlpha = isExplored ? 0.3 : 1;

  // Dim residual heat glow (no power)
  const dimGlow = ctx.createRadialGradient(x, y, 0, x, y, 18);
  dimGlow.addColorStop(0, "rgba(50, 65, 85, 0.3)");
  dimGlow.addColorStop(1, "transparent");
  ctx.fillStyle = dimGlow;
  ctx.beginPath();
  ctx.arc(x, y, 18, 0, Math.PI * 2);
  ctx.fill();

  // Floating debris pieces
  ctx.fillStyle = "#3a4a5a";
  const debrisPieces: [number, number, number, number][] = [
    [14, -10, 2, 2],
    [-13, 9, 2, 2],
    [8, 13, 1, 2],
    [-16, -4, 2, 1],
  ];
  for (const [dx, dy, w, h] of debrisPieces) {
    ctx.fillRect(x + dx, y + dy, w, h);
  }

  // Draw ship hull tilted ~22° (listing/drifting)
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.38);

  // Main hull body
  ctx.fillStyle = "#1e2d3d";
  ctx.strokeStyle = "#4a5f72";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -14);   // nose
  ctx.lineTo(-11, 7);   // left wing tip
  ctx.lineTo(-4, 3);    // left engine notch
  ctx.lineTo(0, 9);     // center rear
  ctx.lineTo(4, 3);     // right engine notch
  ctx.lineTo(9, 7);     // right wing tip (shorter — damaged)
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Dark cockpit (no power)
  ctx.fillStyle = "#111827";
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(-3, 1);
  ctx.lineTo(3, 1);
  ctx.closePath();
  ctx.fill();

  // Hull damage crack
  ctx.strokeStyle = "#cc4400";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-1, -5);
  ctx.lineTo(3, 0);
  ctx.lineTo(1, 4);
  ctx.stroke();

  // Dead engine nozzles (no glow)
  ctx.fillStyle = "#252535";
  ctx.strokeStyle = "#3a3a50";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(-3, 6, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(3, 6, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Broken right wing structural fragment
  ctx.strokeStyle = "#4a5f72";
  ctx.lineWidth = 1;
  ctx.setLineDash([1, 2]);
  ctx.beginPath();
  ctx.moveTo(8, 6);
  ctx.lineTo(13, 4);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();

  // Emergency distress beacon (amber) — only if not yet explored
  if (!isExplored) {
    const bx = x + 12;
    const by = y - 12;
    const beaconGlow = ctx.createRadialGradient(bx, by, 0, bx, by, 6);
    beaconGlow.addColorStop(0, "rgba(255, 140, 0, 0.45)");
    beaconGlow.addColorStop(1, "transparent");
    ctx.fillStyle = beaconGlow;
    ctx.beginPath();
    ctx.arc(bx, by, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff8800";
    ctx.beginPath();
    ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

export function drawGasGiant(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  loc: Location,
  completed: boolean,
  spriteSheet?: HTMLImageElement,
) {
  const isDived = !!loc.gasGiantLastDiveAt;
  const atmosphere = loc.gasGiantAtmosphere ?? "hydrogen";

  if (spriteSheet?.complete) {
    const index = GAS_PLANET_SPRITE_ORDER.indexOf(atmosphere);
    if (index >= 0) {
      const spriteW =
        GAS_PLANET_SPRITE_SHEET_WIDTH / GAS_PLANET_SPRITE_ORDER.length;
      const spriteH = GAS_PLANET_SPRITE_SHEET_HEIGHT;
      const size = 50;

      ctx.save();
      ctx.globalAlpha = completed || isDived ? 0.45 : 1;
      ctx.drawImage(
        spriteSheet,
        index * spriteW,
        0,
        spriteW,
        spriteH,
        x - size / 2,
        y - size / 2,
        size,
        size,
      );
      ctx.restore();
      return;
    }
  }

  ctx.globalAlpha = completed || isDived ? 0.45 : 1;

  const r = 18;

  const coreColor =
    atmosphere === "hydrogen"
      ? "#cc88ff"
      : atmosphere === "methane"
        ? "#88ddbb"
        : atmosphere === "ammonia"
          ? "#ffdd88"
          : "#aaddff";
  const bandColor =
    atmosphere === "hydrogen"
      ? "#7b4fff"
      : atmosphere === "methane"
        ? "#228855"
        : atmosphere === "ammonia"
          ? "#cc8800"
          : "#3399cc";

  // Sphere gradient
  const grad = ctx.createRadialGradient(
    x - r * 0.3,
    y - r * 0.3,
    r * 0.1,
    x,
    y,
    r,
  );
  grad.addColorStop(0, coreColor);
  grad.addColorStop(0.5, bandColor);
  grad.addColorStop(1, "rgba(5,8,16,0.9)");

  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Cloud bands clipped to circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = `${bandColor}55`;
  ctx.fillRect(x - r, y - r * 0.55, r * 2, r * 0.28);
  ctx.fillRect(x - r, y + r * 0.12, r * 2, r * 0.22);
  ctx.restore();

  // Outer glow ring
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.strokeStyle = coreColor;
  ctx.lineWidth = 1;
  ctx.globalAlpha = (completed || isDived ? 0.45 : 1) * 0.6;
  ctx.stroke();

  // Accent dot if not yet dived
  if (!isDived && !completed) {
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(x + r - 4, y - r + 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

export function drawWreckField(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  loc: Location,
  completed: boolean,
) {
  const exhausted = loc.wreckExhausted ?? false;
  const tier = (loc.wreckTier ?? 1) as 1 | 2 | 3;
  ctx.globalAlpha = completed || exhausted ? 0.4 : 1;

  const color = tier === 3 ? "#c8832a" : tier === 2 ? "#a0785a" : "#8b7355";

  // Radiation glow
  const glow = ctx.createRadialGradient(x, y, 2, x, y, 22);
  glow.addColorStop(0, `${color}33`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, 22, 0, Math.PI * 2);
  ctx.fill();

  // Scattered debris fragments — deterministic positions per tier
  type Frag = { dx: number; dy: number; w: number; h: number; rot: number };
  const frags: Frag[][] = [
    [
      { dx: -6, dy: -4, w: 9, h: 3, rot: -22 },
      { dx: 5, dy: -6, w: 6, h: 2, rot: 40 },
      { dx: -2, dy: 5, w: 7, h: 2, rot: 15 },
      { dx: 6, dy: 4, w: 5, h: 2, rot: -55 },
      { dx: -7, dy: 3, w: 5, h: 2, rot: 30 },
    ],
    [
      { dx: -7, dy: -5, w: 11, h: 3, rot: -18 },
      { dx: 6, dy: -7, w: 8, h: 2, rot: 45 },
      { dx: -2, dy: 6, w: 9, h: 3, rot: 12 },
      { dx: 7, dy: 3, w: 6, h: 2, rot: -60 },
      { dx: -8, dy: 4, w: 7, h: 2, rot: 28 },
      { dx: 3, dy: 8, w: 5, h: 2, rot: -35 },
      { dx: -4, dy: -9, w: 5, h: 2, rot: 55 },
      { dx: 9, dy: 6, w: 4, h: 2, rot: 20 },
    ],
    [
      { dx: -8, dy: -6, w: 13, h: 4, rot: -15 },
      { dx: 7, dy: -8, w: 10, h: 3, rot: 42 },
      { dx: -3, dy: 7, w: 11, h: 3, rot: 10 },
      { dx: 8, dy: 3, w: 8, h: 3, rot: -58 },
      { dx: -9, dy: 5, w: 8, h: 2, rot: 25 },
      { dx: 4, dy: 9, w: 7, h: 2, rot: -32 },
      { dx: -5, dy: -10, w: 6, h: 2, rot: 52 },
      { dx: 10, dy: 7, w: 5, h: 2, rot: 18 },
      { dx: -1, dy: 0, w: 4, h: 2, rot: -70 },
      { dx: 5, dy: -2, w: 5, h: 2, rot: 35 },
      { dx: -7, dy: 9, w: 4, h: 2, rot: -10 },
    ],
  ];

  ctx.fillStyle = color;
  for (const f of frags[tier - 1]) {
    ctx.save();
    ctx.translate(x + f.dx, y + f.dy);
    ctx.rotate((f.rot * Math.PI) / 180);
    ctx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
    ctx.restore();
  }

  // Radiation ring for tier 3
  if (tier === 3 && !exhausted) {
    ctx.beginPath();
    ctx.arc(x, y, 17, 0, Math.PI * 2);
    ctx.strokeStyle = "#ff6600";
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.35;
    ctx.setLineDash([3, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.globalAlpha = 1;
}
