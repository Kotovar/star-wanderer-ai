/* eslint-disable @next/next/no-img-element */
"use client";

interface GameImageProps {
    src: string;
    alt: string;
    className?: string;
}

/** Статичный game-ассет: пробует avif, при ошибке — webp. */
export function GameImage({ src, alt, className }: GameImageProps) {
    return (
        <img
            src={src.replace(".webp", ".avif")}
            onError={(e) => {
                e.currentTarget.src = src;
            }}
            alt={alt}
            className={className}
        />
    );
}
