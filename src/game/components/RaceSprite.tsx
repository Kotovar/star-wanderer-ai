"use client";

import type { CSSProperties } from "react";

const RACE_SPRITE_SHEET = "/assets/races.png";
const RACE_SPRITE_SHEET_WIDTH = 2172;
const RACE_SPRITE_SHEET_HEIGHT = 722;

const RACE_SPRITES: Record<
    string,
    { x: number; y: number; width: number; height: number }
> = {
    human: { x: 52, y: 185, width: 335, height: 345 },
    synthetic: { x: 398, y: 185, width: 312, height: 345 },
    xenosymbiont: { x: 742, y: 158, width: 335, height: 385 },
    krylorian: { x: 1088, y: 185, width: 340, height: 350 },
    voidborn: { x: 1458, y: 150, width: 320, height: 385 },
    crystalline: { x: 1808, y: 135, width: 305, height: 400 },
};

interface RaceSpriteProps {
    race: string;
    size?: number;
    x?: number;
    y?: number;
    className?: string;
    style?: CSSProperties;
    title?: string;
}

export function RaceSprite({
    race,
    size = 24,
    x,
    y,
    className,
    style,
    title,
}: RaceSpriteProps) {
    const sprite = RACE_SPRITES[race] ?? RACE_SPRITES.human;

    return (
        <svg
            x={x}
            y={y}
            width={size}
            height={size}
            viewBox={`${sprite.x} ${sprite.y} ${sprite.width} ${sprite.height}`}
            preserveAspectRatio="xMidYMid meet"
            className={className}
            role={title ? "img" : undefined}
            aria-hidden={title ? undefined : true}
            style={{ overflow: "hidden", flexShrink: 0, ...style }}
        >
            {title && <title>{title}</title>}
            <image
                href={RACE_SPRITE_SHEET}
                x={0}
                y={0}
                width={RACE_SPRITE_SHEET_WIDTH}
                height={RACE_SPRITE_SHEET_HEIGHT}
            />
        </svg>
    );
}
