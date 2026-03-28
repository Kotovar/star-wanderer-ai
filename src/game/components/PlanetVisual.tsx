import type { PlanetType } from "@/game/types";
import { PLANET_COLORS } from "../constants";

interface PlanetVisualProps {
    planetType: PlanetType | undefined;
}

export function PlanetVisual({ planetType }: PlanetVisualProps) {
    if (!planetType) return null;

    const colors = PLANET_COLORS[planetType];

    return (
        <div className="absolute right-2 top-2 w-40 h-40 opacity-35 pointer-events-none">
            <svg
                viewBox="0 0 200 200"
                className="w-full h-full"
                style={{
                    filter: `drop-shadow(0 0 16px ${colors.primary}88) drop-shadow(0 0 32px ${colors.primary}33)`,
                    animation: "float 7s ease-in-out infinite",
                }}
            >
                <defs>
                    {/* Outer glow */}
                    <radialGradient
                        id={`pg-outer-${planetType}`}
                        cx="50%"
                        cy="50%"
                        r="50%"
                    >
                        <stop
                            offset="60%"
                            stopColor={colors.primary}
                            stopOpacity="0"
                        />
                        <stop
                            offset="100%"
                            stopColor={colors.primary}
                            stopOpacity="0.2"
                        />
                    </radialGradient>

                    {/* Planet surface gradient — lit from top-left */}
                    <radialGradient
                        id={`pg-surface-${planetType}`}
                        cx="35%"
                        cy="30%"
                        r="70%"
                    >
                        <stop
                            offset="0%"
                            stopColor={colors.accent || colors.primary}
                            stopOpacity="1"
                        />
                        <stop
                            offset="45%"
                            stopColor={colors.primary}
                            stopOpacity="1"
                        />
                        <stop
                            offset="100%"
                            stopColor={colors.secondary}
                            stopOpacity="1"
                        />
                    </radialGradient>

                    {/* Night-side shadow */}
                    <radialGradient
                        id={`pg-shadow-${planetType}`}
                        cx="70%"
                        cy="65%"
                        r="60%"
                    >
                        <stop offset="0%" stopColor="#000" stopOpacity="0" />
                        <stop
                            offset="100%"
                            stopColor="#000"
                            stopOpacity="0.55"
                        />
                    </radialGradient>

                    {/* Atmosphere rim */}
                    <radialGradient
                        id={`pg-atmo-${planetType}`}
                        cx="50%"
                        cy="50%"
                        r="50%"
                    >
                        <stop
                            offset="78%"
                            stopColor={colors.primary}
                            stopOpacity="0"
                        />
                        <stop
                            offset="90%"
                            stopColor={colors.primary}
                            stopOpacity="0.5"
                        />
                        <stop
                            offset="100%"
                            stopColor={colors.primary}
                            stopOpacity="0"
                        />
                    </radialGradient>

                    <clipPath id={`clip-planet-${planetType}`}>
                        <circle cx="100" cy="100" r="70" />
                    </clipPath>
                </defs>

                {/* Outer glow halo */}
                <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill={`url(#pg-outer-${planetType})`}
                />

                {/* Planet base */}
                <circle
                    cx="100"
                    cy="100"
                    r="70"
                    fill={`url(#pg-surface-${planetType})`}
                />

                {/* Surface details clipped to planet */}
                <g clipPath={`url(#clip-planet-${planetType})`}>
                    {planetType === "Пустынная" && (
                        <>
                            <ellipse cx="65" cy="78" rx="28" ry="12" fill={colors.secondary} opacity="0.5" />
                            <ellipse cx="130" cy="110" rx="35" ry="14" fill={colors.secondary} opacity="0.4" />
                            <ellipse cx="95" cy="130" rx="22" ry="9" fill={colors.accent} opacity="0.3" />
                            <ellipse cx="80" cy="100" rx="40" ry="16" fill={colors.secondary} opacity="0.25" />
                        </>
                    )}

                    {planetType === "Ледяная" && (
                        <>
                            <ellipse cx="70" cy="65" rx="45" ry="18" fill={colors.accent} opacity="0.4" />
                            <circle cx="55" cy="90" r="14" fill={colors.accent} opacity="0.35" />
                            <circle cx="140" cy="120" r="18" fill={colors.accent} opacity="0.3" />
                            <ellipse cx="100" cy="140" rx="50" ry="14" fill={colors.accent} opacity="0.25" />
                            <circle cx="115" cy="80" r="10" fill={colors.accent} opacity="0.4" />
                        </>
                    )}

                    {planetType === "Лесная" && (
                        <>
                            <ellipse cx="70" cy="85" rx="22" ry="35" fill={colors.secondary} opacity="0.45" />
                            <ellipse cx="125" cy="95" rx="28" ry="40" fill={colors.secondary} opacity="0.4" />
                            <ellipse cx="95" cy="125" rx="32" ry="22" fill={colors.accent} opacity="0.3" />
                            <ellipse cx="140" cy="75" rx="18" ry="28" fill={colors.secondary} opacity="0.35" />
                        </>
                    )}

                    {planetType === "Вулканическая" && (
                        <>
                            <ellipse cx="80" cy="100" rx="50" ry="20" fill={colors.secondary} opacity="0.5" />
                            <circle cx="65" cy="80" r="9" fill={colors.accent} opacity="0.75" />
                            <circle cx="130" cy="110" r="11" fill={colors.accent} opacity="0.65" />
                            <circle cx="95" cy="125" r="13" fill={colors.accent} opacity="0.55" />
                            <circle cx="115" cy="70" r="7" fill={colors.accent} opacity="0.7" />
                            <ellipse cx="100" cy="140" rx="40" ry="10" fill={colors.accent} opacity="0.3" />
                        </>
                    )}

                    {planetType === "Океаническая" && (
                        <>
                            <ellipse cx="75" cy="75" rx="38" ry="14" fill={colors.accent} opacity="0.4" />
                            <ellipse cx="120" cy="115" rx="44" ry="16" fill={colors.accent} opacity="0.35" />
                            <ellipse cx="95" cy="100" rx="48" ry="12" fill={colors.accent} opacity="0.3" />
                            {/* Landmass */}
                            <ellipse cx="85" cy="95" rx="16" ry="22" fill={colors.secondary} opacity="0.7" />
                            <ellipse cx="130" cy="80" rx="12" ry="18" fill={colors.secondary} opacity="0.6" />
                        </>
                    )}

                    {planetType === "Радиоактивная" && (
                        <>
                            <circle cx="70" cy="88" r="16" fill={colors.accent} opacity="0.45" />
                            <circle cx="128" cy="105" r="20" fill={colors.accent} opacity="0.4" />
                            <circle cx="100" cy="125" r="13" fill={colors.accent} opacity="0.5" />
                            <circle cx="88" cy="72" r="11" fill={colors.accent} opacity="0.55" />
                            <ellipse cx="110" cy="140" rx="30" ry="9" fill={colors.accent} opacity="0.3" />
                        </>
                    )}

                    {planetType === "Тропическая" && (
                        <>
                            <ellipse cx="75" cy="82" rx="24" ry="32" fill={colors.secondary} opacity="0.45" />
                            <ellipse cx="125" cy="105" rx="30" ry="36" fill={colors.secondary} opacity="0.4" />
                            <ellipse cx="95" cy="118" rx="22" ry="28" fill={colors.accent} opacity="0.35" />
                            <ellipse cx="110" cy="75" rx="18" ry="24" fill={colors.secondary} opacity="0.3" />
                        </>
                    )}

                    {planetType === "Арктическая" && (
                        <>
                            <ellipse cx="100" cy="70" rx="55" ry="20" fill={colors.accent} opacity="0.55" />
                            <circle cx="65" cy="78" r="15" fill={colors.accent} opacity="0.5" />
                            <circle cx="135" cy="118" r="18" fill={colors.accent} opacity="0.45" />
                            <ellipse cx="100" cy="140" rx="48" ry="12" fill={colors.accent} opacity="0.4" />
                        </>
                    )}

                    {planetType === "Разрушенная войной" && (
                        <>
                            {/* Craters */}
                            <circle cx="70" cy="82" r="12" fill={colors.secondary} opacity="0.7" />
                            <circle cx="70" cy="82" r="10" fill="#000" opacity="0.4" />
                            <circle cx="130" cy="108" r="15" fill={colors.secondary} opacity="0.65" />
                            <circle cx="130" cy="108" r="12" fill="#000" opacity="0.35" />
                            <circle cx="95" cy="125" r="9" fill={colors.secondary} opacity="0.6" />
                            <circle cx="95" cy="125" r="7" fill="#000" opacity="0.3" />
                            <ellipse cx="110" cy="72" rx="20" ry="10" fill="#ff4444" opacity="0.3" />
                        </>
                    )}

                    {planetType === "Планета-кольцо" && (
                        <>
                            <ellipse cx="80" cy="90" rx="20" ry="30" fill={colors.secondary} opacity="0.4" />
                            <ellipse cx="120" cy="105" rx="25" ry="35" fill={colors.secondary} opacity="0.35" />
                        </>
                    )}

                    {planetType === "Приливная" && (
                        <>
                            <ellipse cx="75" cy="78" rx="32" ry="16" fill={colors.accent} opacity="0.4" />
                            <ellipse cx="125" cy="112" rx="38" ry="18" fill={colors.accent} opacity="0.35" />
                            <ellipse cx="98" cy="96" rx="42" ry="14" fill={colors.accent} opacity="0.3" />
                        </>
                    )}

                    {/* Night-side shadow overlay */}
                    <circle
                        cx="100"
                        cy="100"
                        r="70"
                        fill={`url(#pg-shadow-${planetType})`}
                    />
                </g>

                {/* Atmosphere rim glow */}
                <circle
                    cx="100"
                    cy="100"
                    r="70"
                    fill="none"
                    stroke={`url(#pg-atmo-${planetType})`}
                    strokeWidth="12"
                    opacity="0.9"
                />

                {/* Ring system for Планета-кольцо */}
                {planetType === "Планета-кольцо" && (
                    <>
                        <ellipse
                            cx="100"
                            cy="100"
                            rx="94"
                            ry="22"
                            fill="none"
                            stroke={colors.accent || colors.primary}
                            strokeWidth="3"
                            opacity="0.55"
                            transform="rotate(-18 100 100)"
                        />
                        <ellipse
                            cx="100"
                            cy="100"
                            rx="82"
                            ry="18"
                            fill="none"
                            stroke={colors.accent || colors.primary}
                            strokeWidth="2"
                            opacity="0.4"
                            transform="rotate(-18 100 100)"
                        />
                    </>
                )}
            </svg>
        </div>
    );
}
