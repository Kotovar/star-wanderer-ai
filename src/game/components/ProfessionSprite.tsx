"use client";

import type { CSSProperties } from "react";
import type { Profession, RaceId } from "@/game/types";

const PROFESSION_SPRITE_WIDTH = 2172;
const PROFESSION_SPRITE_HEIGHT = 724;

const PROFESSION_INDEX: Record<Profession, number> = {
    pilot: 0,
    engineer: 1,
    medic: 2,
    scout: 3,
    scientist: 4,
    gunner: 5,
};

type SpriteRect = { x: number; y: number; width: number; height: number };

const PROFESSION_SPRITES: Record<string, SpriteRect[]> = {
    crystalline: [
        { x: 76, y: 180, width: 262, height: 325 },
        { x: 402, y: 180, width: 296, height: 325 },
        { x: 779, y: 196, width: 267, height: 316 },
        { x: 1111, y: 196, width: 276, height: 309 },
        { x: 1464, y: 181, width: 287, height: 324 },
        { x: 1817, y: 200, width: 269, height: 305 },
    ],
    human: [
        { x: 60, y: 212, width: 280, height: 303 },
        { x: 399, y: 208, width: 293, height: 308 },
        { x: 766, y: 207, width: 268, height: 309 },
        { x: 1113, y: 208, width: 277, height: 308 },
        { x: 1464, y: 208, width: 284, height: 309 },
        { x: 1822, y: 208, width: 275, height: 308 },
    ],
    krylorian: [
        { x: 87, y: 205, width: 275, height: 310 },
        { x: 397, y: 203, width: 320, height: 312 },
        { x: 724, y: 205, width: 350, height: 310 },
        { x: 1114, y: 204, width: 308, height: 311 },
        { x: 1457, y: 208, width: 330, height: 307 },
        { x: 1810, y: 214, width: 274, height: 301 },
    ],
    synthetic: [
        { x: 86, y: 212, width: 265, height: 306 },
        { x: 410, y: 213, width: 302, height: 306 },
        { x: 787, y: 212, width: 274, height: 306 },
        { x: 1131, y: 214, width: 264, height: 305 },
        { x: 1473, y: 213, width: 276, height: 306 },
        { x: 1814, y: 213, width: 274, height: 305 },
    ],
    voidborn: [
        { x: 59, y: 218, width: 274, height: 309 },
        { x: 401, y: 169, width: 292, height: 358 },
        { x: 760, y: 181, width: 289, height: 346 },
        { x: 1116, y: 209, width: 278, height: 318 },
        { x: 1480, y: 181, width: 276, height: 346 },
        { x: 1838, y: 195, width: 274, height: 332 },
    ],
    xenosymbiont: [
        { x: 62, y: 199, width: 275, height: 316 },
        { x: 372, y: 201, width: 347, height: 314 },
        { x: 789, y: 200, width: 297, height: 315 },
        { x: 1110, y: 200, width: 286, height: 315 },
        { x: 1456, y: 199, width: 354, height: 316 },
        { x: 1780, y: 199, width: 328, height: 316 },
    ],
};

interface ProfessionSpriteProps {
    race: RaceId | string;
    profession: Profession | string;
    size?: number;
    x?: number;
    y?: number;
    className?: string;
    style?: CSSProperties;
    title?: string;
}

export function ProfessionSprite({
    race,
    profession,
    size = 24,
    x,
    y,
    className,
    style,
    title,
}: ProfessionSpriteProps) {
    const index = PROFESSION_INDEX[profession as Profession] ?? 0;
    const safeRace = race || "human";
    const sprite =
        PROFESSION_SPRITES[safeRace]?.[index] ??
        PROFESSION_SPRITES.human[index] ??
        PROFESSION_SPRITES.human[0];

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
                href={`/assets/professions/${safeRace}.png`}
                x={0}
                y={0}
                width={PROFESSION_SPRITE_WIDTH}
                height={PROFESSION_SPRITE_HEIGHT}
            />
        </svg>
    );
}
