import type { Module } from "@/game/types";

/**
 * Полоска здоровья модуля. Размеры отличаются между обычным видом корабля
 * (крупнее) и боевым (компактнее) — задаются вызывающей стороной.
 */
export function HealthBar({
  module,
  x,
  y,
  w,
  h,
  sidePadding,
  bottomOffset,
  barHeight,
}: {
  module: Module;
  x: number;
  y: number;
  w: number;
  h: number;
  sidePadding: number;
  bottomOffset: number;
  barHeight: number;
}) {
  const healthBarWidth = w - sidePadding * 2;
  const healthWidth =
    (module.health / (module.maxHealth || 100)) * healthBarWidth;

  return (
    <>
      <rect
        x={x + sidePadding}
        y={y + h - bottomOffset}
        width={healthBarWidth}
        height={barHeight}
        fill="#ff0040"
      />
      <rect
        x={x + sidePadding}
        y={y + h - bottomOffset}
        width={healthWidth}
        height={barHeight}
        fill={module.health > 50 ? "#00ff41" : "#ffb000"}
      />
    </>
  );
}

/**
 * Оверлей «отключён» поверх модуля. Размер шрифта варьируется по контексту.
 */
export function DisabledOverlay({
  x,
  y,
  w,
  h,
  fontSize,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
}) {
  return (
    <>
      <rect
        x={x + 2}
        y={y + 2}
        width={w - 4}
        height={h - 4}
        fill="rgba(255,0,64,0.3)"
      />
      <text
        x={x + w / 2}
        y={y + h / 2}
        fill="#ff0040"
        fontSize={fontSize}
        fontFamily="Share Tech Mono"
        textAnchor="middle"
        fontWeight="bold"
      >
        ⚠
      </text>
    </>
  );
}

/**
 * Значок уровня члена экипажа в углу иконки — показывается только при level > 1.
 */
export function LevelBadge({
  x,
  y,
  size,
  badgeR,
  raceColor,
  level,
}: {
  x: number;
  y: number;
  size: number;
  badgeR: number;
  raceColor: string;
  level: number;
}) {
  if (level <= 1) return null;

  return (
    <g className="select-none">
      <circle
        cx={x + size - badgeR}
        cy={y + badgeR}
        r={badgeR}
        fill="#050810"
      />
      <circle
        cx={x + size - badgeR}
        cy={y + badgeR}
        r={badgeR}
        fill="none"
        stroke={raceColor}
        strokeWidth={0.7}
      />
      <text
        x={x + size - badgeR}
        y={y + badgeR}
        fill={raceColor}
        fontSize={size * 0.25}
        fontFamily="Share Tech Mono"
        textAnchor="middle"
        dominantBaseline="middle"
        fontWeight="bold"
        className="select-none"
        style={{ userSelect: "none", WebkitUserSelect: "none" }}
      >
        {level}
      </text>
    </g>
  );
}
