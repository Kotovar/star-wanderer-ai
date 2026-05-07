import type { CSSProperties } from "react";
import type { TechnologyId } from "@/game/types";

const TECH_SPRITE_SHEET = "/assets/tech.png";
const TECH_SPRITE_WIDTH = 1586;
const TECH_SPRITE_HEIGHT = 992;

const TECH_ICON_ORDER: TechnologyId[] = [
  "reinforced_hull",
  "efficient_reactor",
  "targeting_matrix",
  "ion_cannon",
  "scanner_mk2",
  "automated_repair",
  "medbay_upgrade",
  "artifact_study",
  "xenobiology",
  "ion_drive",
  "shield_booster",
  "combat_drones",
  "plasma_weapons",
  "lab_network",
  "quantum_scanner",
  "cargo_expansion",
  "crew_training",
  "relic_chamber",
  "singularity_reactor",
  "phase_shield",
  "storm_shields",
  "quantum_torpedo",
  "antimatter_weapons",
  "neural_interface",
  "genetic_enhancement",
  "nanite_hull",
  "planetary_drill",
  "deep_scan",
  "atmospheric_analysis",
  "ancient_resonance",
  "void_resonance",
  "stellar_genetics",
  "artifact_mastery",
  "modular_arsenal",
  "ancient_power",
  "warp_drive",
  "cybernetic_augmentation",
  "expedition_kits",
  "bio_membrane_shield",
];

type TechIconRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const TECH_ICON_RECTS_IN_ORDER: TechIconRect[] = [
  { x: 36, y: 21, width: 149, height: 140 },
  { x: 270, y: 16, width: 148, height: 151 },
  { x: 473, y: 12, width: 159, height: 156 },
  { x: 687, y: 26, width: 203, height: 111 },
  { x: 899, y: 11, width: 180, height: 156 },
  { x: 1150, y: 17, width: 147, height: 147 },
  { x: 1359, y: 17, width: 155, height: 146 },
  { x: 38, y: 174, width: 146, height: 157 },
  { x: 259, y: 178, width: 148, height: 152 },
  { x: 466, y: 208, width: 197, height: 114 },
  { x: 704, y: 184, width: 159, height: 150 },
  { x: 924, y: 197, width: 171, height: 125 },
  { x: 1139, y: 179, width: 157, height: 155 },
  { x: 1342, y: 248, width: 180, height: 28 },
  { x: 36, y: 350, width: 150, height: 152 },
  { x: 256, y: 359, width: 168, height: 134 },
  { x: 479, y: 361, width: 150, height: 129 },
  { x: 688, y: 349, width: 168, height: 153 },
  { x: 918, y: 345, width: 166, height: 160 },
  { x: 1139, y: 347, width: 148, height: 150 },
  { x: 1337, y: 351, width: 183, height: 139 },
  { x: 21, y: 552, width: 171, height: 68 },
  { x: 251, y: 527, width: 177, height: 105 },
  { x: 488, y: 514, width: 137, height: 140 },
  { x: 693, y: 513, width: 162, height: 147 },
  { x: 920, y: 528, width: 161, height: 116 },
  { x: 1135, y: 508, width: 155, height: 150 },
  { x: 1345, y: 511, width: 159, height: 145 },
  { x: 33, y: 671, width: 163, height: 144 },
  { x: 241, y: 701, width: 175, height: 73 },
  { x: 479, y: 665, width: 156, height: 151 },
  { x: 695, y: 673, width: 152, height: 146 },
  { x: 920, y: 665, width: 161, height: 151 },
  { x: 1133, y: 677, width: 160, height: 137 },
  { x: 1372, y: 668, width: 111, height: 154 },
  { x: 230, y: 864, width: 208, height: 105 },
  { x: 488, y: 825, width: 141, height: 148 },
  { x: 686, y: 830, width: 175, height: 143 },
  { x: 917, y: 825, width: 162, height: 150 },
];

const TECH_ICON_RECTS = TECH_ICON_ORDER.reduce<Record<TechnologyId, TechIconRect>>(
  (acc, techId, index) => {
    acc[techId] = TECH_ICON_RECTS_IN_ORDER[index];
    return acc;
  }, {} as Record<TechnologyId, TechIconRect>);

type TechIconProps = {
  techId: TechnologyId;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function TechIcon({
  techId,
  size = 24,
  className,
  style,
}: TechIconProps) {
  const rect = TECH_ICON_RECTS[techId];

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
        overflow: "hidden",
        verticalAlign: "-0.18em",
        ...style,
      }}
    >
      <image
        href={TECH_SPRITE_SHEET}
        width={TECH_SPRITE_WIDTH}
        height={TECH_SPRITE_HEIGHT}
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
  );
}
