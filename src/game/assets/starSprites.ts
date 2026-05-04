import type { StarType } from "@/game/types";

export const STAR_SPRITE_SHEET = "/assets/stars.png";
export const STAR_SPRITE_SHEET_WIDTH = 1448;
export const STAR_SPRITE_SHEET_HEIGHT = 1086;
export const STAR_SPRITE_COLUMNS = 4;
export const STAR_SPRITE_ROWS = 3;
export const STAR_SPRITE_CELL_SIZE = 362;
type StarSpriteRect = { x: number; y: number; width: number; height: number };

export const STAR_SPRITE_ORDER: StarType[] = [
  "red_dwarf",
  "yellow_dwarf",
  "white_dwarf",
  "blue_giant",
  "red_supergiant",
  "neutron_star",
  "gas_giant",
  "double",
  "triple",
  "blackhole",
  "variable_star",
  "stellar_remnant",
];

const STAR_SPRITE_RECTS: Partial<Record<StarType, StarSpriteRect>> = {
  white_dwarf: { x: 724, y: 10, width: 326, height: 326 },
  blue_giant: { x: 1044, y: 0, width: 404, height: 362 },
  neutron_star: { x: 392, y: 394, width: 290, height: 286 },
  double: { x: 1078, y: 396, width: 360, height: 296 },
  triple: { x: 20, y: 756, width: 308, height: 306 },
};

export function getStarSpriteRect(starType: StarType): StarSpriteRect {
  const customRect = STAR_SPRITE_RECTS[starType];
  if (customRect) return customRect;

  const index = STAR_SPRITE_ORDER.indexOf(starType);
  const safeIndex = index === -1 ? 1 : index;
  const column = safeIndex % STAR_SPRITE_COLUMNS;
  const row = Math.floor(safeIndex / STAR_SPRITE_COLUMNS);

  return {
    x: column * STAR_SPRITE_CELL_SIZE,
    y: row * STAR_SPRITE_CELL_SIZE,
    width: STAR_SPRITE_CELL_SIZE,
    height: STAR_SPRITE_CELL_SIZE,
  };
}

export function getStarSpriteBackgroundStyle(starType: StarType, size = 20) {
  const rect = getStarSpriteRect(starType);
  const scaleX = size / rect.width;
  const scaleY = size / rect.height;

  return {
    backgroundImage: `url('${STAR_SPRITE_SHEET}')`,
    backgroundPosition: `${-rect.x * scaleX}px ${-rect.y * scaleY}px`,
    backgroundSize: `${STAR_SPRITE_SHEET_WIDTH * scaleX}px ${STAR_SPRITE_SHEET_HEIGHT * scaleY}px`,
  };
}

export function drawStarSprite(
  ctx: CanvasRenderingContext2D,
  spriteSheet: HTMLImageElement,
  starType: StarType,
  x: number,
  y: number,
  size: number,
  alpha = 1,
) {
  const rect = getStarSpriteRect(starType);

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(
    spriteSheet,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    x - size / 2,
    y - size / 2,
    size,
    size,
  );
  ctx.restore();
}
