import { WEAPON_ART } from "@/game/constants/weapons";
import type { Weapon } from "@/game/types/modules";

interface WeaponSlotsRendererProps {
  weapons: (Weapon | null)[];
  x: number;
  y: number;
  w: number;
  h: number;
}

export function WeaponSlotsRenderer({
  weapons,
  x,
  y,
  w,
  h,
}: WeaponSlotsRendererProps) {
  if (weapons.length === 0) return null;

  const columns = Math.max(
    1,
    Math.ceil(Math.sqrt((weapons.length * w) / h)),
  );
  const rows = Math.ceil(weapons.length / columns);
  const topInset = Math.min(26, h * 0.26);
  const bottomInset = Math.min(24, h * 0.24);
  const top = y + topInset;
  const height = h - topInset - bottomInset;
  const slotWidth = w / columns;
  const slotHeight = height / rows;
  const imageWidth = slotWidth * 0.86;
  const imageHeight = slotHeight * 0.86;
  const placeholderSize = Math.min(imageWidth, imageHeight);

  return (
    <g aria-hidden="true">
      {weapons.map((weapon, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const centerX = x + slotWidth * (column + 0.5);
        const centerY = top + slotHeight * (row + 0.5);

        if (!weapon) {
          return (
            <text
              key={index}
              x={centerX}
              y={centerY + placeholderSize * 0.13}
              fill="#444444"
              fontSize={Math.max(10, Math.min(16, placeholderSize * 0.35))}
              fontFamily="Share Tech Mono"
              textAnchor="middle"
              fontWeight="bold"
              pointerEvents="none"
            >
              ○
            </text>
          );
        }

        const fallback = WEAPON_ART[weapon.type];

        return (
          <image
            key={index}
            href={fallback.replace(".webp", ".avif")}
            onError={(event) => {
              const image = event.currentTarget;
              if (image.getAttribute("href")?.endsWith(".avif")) {
                image.setAttribute("href", fallback);
              }
            }}
            x={centerX - imageWidth / 2}
            y={centerY - imageHeight / 2}
            width={imageWidth}
            height={imageHeight}
            preserveAspectRatio="xMidYMid meet"
            pointerEvents="none"
          />
        );
      })}
    </g>
  );
}
