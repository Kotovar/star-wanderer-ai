import type { CSSProperties } from "react";

const ICON_SPRITE_SHEET = "/assets/icons.png";
const ICON_SPRITE_WIDTH = 1448;
const ICON_SPRITE_HEIGHT = 1086;
const EXTRA_ICON_SPRITE_SHEET = "/assets/icons-add.png";
const EXTRA_ICON_SPRITE_WIDTH = 1672;
const EXTRA_ICON_SPRITE_HEIGHT = 941;

export type StatIconType =
  | "power_consumption"
  | "power_generation"
  | "capacity"
  | "armor"
  | "health"
  | "fuel_efficiency"
  | "oxygen"
  | "cargo"
  | "research"
  | "scan_range"
  | "repair"
  | "damage_bonus"
  | "shield_regen"
  | "shields"
  | "evasion"
  | "crew"
  | "crit_chance"
  | "crit_damage"
  | "accuracy"
  | "targeting"
  | "engine_level"
  | "captain_level"
  | "reflection"
  | "credit_bonus";

type IconRect = {
  sheet: string;
  sheetWidth: number;
  sheetHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

const icon = (
  x: number,
  y: number,
  width: number,
  height: number,
): IconRect => ({
  sheet: ICON_SPRITE_SHEET,
  sheetWidth: ICON_SPRITE_WIDTH,
  sheetHeight: ICON_SPRITE_HEIGHT,
  x,
  y,
  width,
  height,
});

const extraIcon = (
  x: number,
  y: number,
  width: number,
  height: number,
): IconRect => ({
  sheet: EXTRA_ICON_SPRITE_SHEET,
  sheetWidth: EXTRA_ICON_SPRITE_WIDTH,
  sheetHeight: EXTRA_ICON_SPRITE_HEIGHT,
  x,
  y,
  width,
  height,
});

const STAT_ICON_RECTS: Record<StatIconType, IconRect> = {
  power_consumption: icon(103, 79, 171, 192),
  power_generation: icon(370, 77, 178, 194),
  capacity: icon(632, 87, 185, 184),
  armor: icon(912, 69, 159, 202),
  health: icon(1168, 89, 176, 181),
  fuel_efficiency: icon(91, 320, 194, 177),
  oxygen: icon(386, 312, 144, 193),
  cargo: icon(628, 323, 192, 180),
  research: icon(909, 307, 162, 203),
  scan_range: icon(1168, 309, 187, 201),
  repair: icon(95, 556, 181, 188),
  damage_bonus: icon(356, 555, 192, 247),
  shield_regen: icon(611, 554, 225, 239),
  shields: icon(892, 549, 188, 242),
  evasion: icon(1158, 554, 200, 254),
  crew: icon(75, 813, 221, 174),
  crit_chance: icon(325, 813, 245, 182),
  crit_damage: icon(614, 813, 218, 182),
  accuracy: icon(888, 813, 207, 186),
  targeting: icon(1159, 813, 190, 178),
  engine_level: extraIcon(67, 283, 322, 324),
  captain_level: extraIcon(466, 276, 338, 331),
  reflection: extraIcon(849, 284, 398, 313),
  credit_bonus: extraIcon(1267, 304, 356, 303),
};

type StatIconProps = {
  type: StatIconType;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function StatIcon({
  type,
  size = 16,
  className,
  style,
}: StatIconProps) {
  const rect = STAT_ICON_RECTS[type];

  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox={`${rect.x} ${rect.y} ${rect.width} ${rect.height}`}
      style={{
        display: "inline-block",
        flexShrink: 0,
        verticalAlign: "-0.18em",
        ...style,
      }}
    >
      <image
        href={rect.sheet}
        width={rect.sheetWidth}
        height={rect.sheetHeight}
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
  );
}
