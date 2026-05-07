import type { CSSProperties } from "react";

const CREW_ICON_SPRITE_SHEET = "/assets/icons-crew.png";
const CREW_ICON_SPRITE_WIDTH = 2804;
const CREW_ICON_SPRITE_HEIGHT = 561;
const CREW_ICON_COUNT = 5;
const CREW_ICON_WIDTH = CREW_ICON_SPRITE_WIDTH / CREW_ICON_COUNT;

export type CrewStatusIconType =
    | "regen"
    | "experience"
    | "movement"
    | "damage_reduction"
    | "no_happiness";

const CREW_STATUS_ICON_INDEX: Record<CrewStatusIconType, number> = {
    regen: 0,
    experience: 1,
    movement: 2,
    damage_reduction: 3,
    no_happiness: 4,
};

type CrewStatusIconProps = {
    type: CrewStatusIconType;
    size?: number;
    className?: string;
    style?: CSSProperties;
};

export function CrewStatusIcon({
    type,
    size = 18,
    className,
    style,
}: CrewStatusIconProps) {
    const x = CREW_STATUS_ICON_INDEX[type] * CREW_ICON_WIDTH;

    return (
        <svg
            aria-hidden="true"
            className={className}
            width={size}
            height={size}
            viewBox={`${x} 0 ${CREW_ICON_WIDTH} ${CREW_ICON_SPRITE_HEIGHT}`}
            style={{
                display: "inline-block",
                flexShrink: 0,
                verticalAlign: "-0.22em",
                ...style,
            }}
        >
            <image
                href={CREW_ICON_SPRITE_SHEET}
                width={CREW_ICON_SPRITE_WIDTH}
                height={CREW_ICON_SPRITE_HEIGHT}
                preserveAspectRatio="xMidYMid meet"
            />
        </svg>
    );
}
