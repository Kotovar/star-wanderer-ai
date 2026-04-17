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
                            <path d="M38 118 C56 102, 78 104, 96 112 S136 126, 162 114 L162 145 L38 145 Z" fill={colors.secondary} opacity="0.45" />
                            <path d="M48 86 C68 78, 92 80, 116 88 S146 100, 160 94" fill="none" stroke={colors.accent} strokeWidth="4" opacity="0.28" />
                            <path d="M42 97 C62 89, 82 90, 102 98 S142 111, 158 106" fill="none" stroke={colors.secondary} strokeWidth="3" opacity="0.24" />
                            <path d="M72 70 L88 60 L98 68 L110 62 L124 74" fill="none" stroke={colors.secondary} strokeWidth="4" opacity="0.35" />
                        </>
                    )}

                    {planetType === "Ледяная" && (
                        <>
                            <path d="M42 70 C66 58, 98 58, 128 68 S154 88, 160 80" fill="none" stroke={colors.accent} strokeWidth="9" opacity="0.35" />
                            <path d="M50 128 C68 118, 98 120, 122 128 S148 138, 156 134" fill="none" stroke={colors.accent} strokeWidth="8" opacity="0.28" />
                            <path d="M66 78 L82 96 L74 112 M98 72 L110 90 L100 106 M128 86 L138 102 L126 122" fill="none" stroke="#ffffff" strokeWidth="2.5" opacity="0.34" />
                            <path d="M58 98 C74 92, 88 94, 100 104 S128 118, 146 112" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.22" />
                        </>
                    )}

                    {planetType === "Лесная" && (
                        <>
                            <path d="M40 122 C52 96, 72 82, 90 86 S120 108, 138 114 S154 110, 160 96 L160 150 L40 150 Z" fill={colors.secondary} opacity="0.42" />
                            <path d="M50 118 C62 100, 76 90, 90 94 S112 112, 132 120" fill="none" stroke={colors.accent} strokeWidth="6" opacity="0.24" />
                            <path d="M62 82 L72 66 L84 82 M88 86 L98 68 L110 86 M116 92 L128 72 L140 92" fill="none" stroke="#173620" strokeWidth="4" opacity="0.38" />
                            <path d="M72 108 C86 100, 100 102, 112 112 S138 126, 150 120" fill="none" stroke={colors.accent} strokeWidth="3" opacity="0.2" />
                        </>
                    )}

                    {planetType === "Вулканическая" && (
                        <>
                            <path d="M38 128 L56 102 L74 116 L90 86 L110 104 L126 78 L150 110 L162 128 L162 150 L38 150 Z" fill={colors.secondary} opacity="0.5" />
                            <path d="M89 86 L96 103 L90 122 M126 78 L130 94 L124 112" fill="none" stroke={colors.accent} strokeWidth="4" opacity="0.72" />
                            <path d="M54 122 C72 112, 88 112, 106 122 S138 136, 154 130" fill="none" stroke={colors.accent} strokeWidth="3" opacity="0.34" />
                            <circle cx="114" cy="86" r="7" fill={colors.accent} opacity="0.55" />
                        </>
                    )}

                    {planetType === "Океаническая" && (
                        <>
                            <path d="M34 96 C52 80, 74 76, 92 82 S126 102, 166 96" fill="none" stroke={colors.accent} strokeWidth="6" opacity="0.28" />
                            <path d="M40 122 C58 112, 74 112, 92 118 S132 132, 158 126" fill="none" stroke={colors.accent} strokeWidth="5" opacity="0.22" />
                            <path d="M68 74 C82 68, 94 74, 98 86 S94 110, 78 118 S54 122, 50 108 S54 80, 68 74 Z" fill={colors.secondary} opacity="0.62" />
                            <path d="M118 76 C130 72, 140 78, 142 90 S136 108, 124 112 S106 108, 104 96 S108 80, 118 76 Z" fill={colors.secondary} opacity="0.55" />
                            <path d="M74 84 C82 90, 84 98, 78 106" fill="none" stroke={colors.accent} strokeWidth="2.5" opacity="0.32" />
                        </>
                    )}

                    {planetType === "Кристаллическая" && (
                        <>
                            <path d="M54 128 L70 84 L82 126 Z" fill={colors.accent} opacity="0.52" />
                            <path d="M92 138 L110 64 L126 138 Z" fill={colors.accent} opacity="0.46" />
                            <path d="M124 134 L142 88 L154 132 Z" fill={colors.secondary} opacity="0.42" />
                            <path d="M54 126 H154" stroke={colors.accent} strokeWidth="3" opacity="0.2" />
                            <path d="M110 64 L116 96 L104 122" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0.25" />
                        </>
                    )}

                    {planetType === "Радиоактивная" && (
                        <>
                            <path d="M42 128 C58 104, 76 96, 96 102 S128 128, 158 120 L158 150 L42 150 Z" fill={colors.secondary} opacity="0.38" />
                            <path d="M64 78 C80 70, 96 76, 98 90 S82 110, 66 102 S52 84, 64 78 Z" fill={colors.accent} opacity="0.42" />
                            <path d="M118 92 C136 86, 148 98, 144 114 S124 130, 110 120 S104 98, 118 92 Z" fill={colors.accent} opacity="0.34" />
                            <path d="M78 92 L88 104 L78 116 M128 100 L136 112 L124 124" fill="none" stroke="#c8ff7a" strokeWidth="2.5" opacity="0.4" />
                            <circle cx="98" cy="124" r="8" fill={colors.accent} opacity="0.3" />
                        </>
                    )}

                    {planetType === "Тропическая" && (
                        <>
                            <path d="M40 128 C48 104, 66 82, 86 82 S118 100, 136 110 S154 118, 160 102 L160 150 L40 150 Z" fill={colors.secondary} opacity="0.44" />
                            <path d="M48 118 C64 100, 76 88, 90 90 S114 110, 132 122" fill="none" stroke={colors.accent} strokeWidth="6" opacity="0.22" />
                            <path d="M84 74 C88 88, 84 98, 74 108 M100 70 C106 84, 104 98, 94 116 M120 84 C126 98, 124 110, 114 126" fill="none" stroke="#144e33" strokeWidth="4" opacity="0.34" />
                            <path d="M90 94 C98 102, 98 112, 92 124" fill="none" stroke={colors.accent} strokeWidth="2.5" opacity="0.24" />
                        </>
                    )}

                    {planetType === "Арктическая" && (
                        <>
                            <path d="M40 74 C62 60, 96 58, 130 68 S154 86, 160 80" fill="none" stroke={colors.accent} strokeWidth="10" opacity="0.42" />
                            <path d="M48 126 C72 114, 100 116, 126 126 S150 138, 158 132" fill="none" stroke={colors.accent} strokeWidth="9" opacity="0.34" />
                            <path d="M62 90 L90 112 L82 132 M102 86 L114 102 L108 126 M130 98 L142 116 L132 136" fill="none" stroke="#e9fbff" strokeWidth="2.5" opacity="0.36" />
                        </>
                    )}

                    {planetType === "Разрушенная войной" && (
                        <>
                            <path d="M42 132 L58 104 L80 110 L98 90 L116 108 L142 98 L158 126 L158 150 L42 150 Z" fill={colors.secondary} opacity="0.44" />
                            <path d="M58 90 C66 82, 78 82, 82 92 S76 110, 66 108 S50 98, 58 90 Z" fill="#000" opacity="0.32" />
                            <path d="M118 100 C130 90, 144 96, 144 110 S130 130, 118 122 S108 108, 118 100 Z" fill="#000" opacity="0.28" />
                            <path d="M74 118 L102 94 M88 130 L116 108 M116 88 L140 116" fill="none" stroke="#ff5a5a" strokeWidth="2.2" opacity="0.34" />
                        </>
                    )}

                    {planetType === "Планета-кольцо" && (
                        <>
                            <path d="M48 124 C62 100, 84 88, 108 90 S142 102, 158 120 L158 150 L48 150 Z" fill={colors.secondary} opacity="0.36" />
                            <path d="M58 98 C82 84, 108 84, 136 96" fill="none" stroke={colors.accent} strokeWidth="4" opacity="0.24" />
                            <path d="M74 80 L90 66 L102 78 L118 70 L134 86" fill="none" stroke={colors.secondary} strokeWidth="4" opacity="0.24" />
                        </>
                    )}

                    {planetType === "Приливная" && (
                        <>
                            <path d="M38 118 C58 92, 84 88, 108 100 S144 128, 162 114 L162 148 L38 148 Z" fill={colors.secondary} opacity="0.42" />
                            <path d="M42 94 C60 86, 78 86, 96 96 S130 114, 160 104" fill="none" stroke={colors.accent} strokeWidth="5" opacity="0.26" />
                            <path d="M76 86 C88 100, 88 112, 78 126 M112 78 C124 94, 124 110, 114 128 M138 96 C146 108, 146 120, 138 132" fill="none" stroke="#ffd08a" strokeWidth="3" opacity="0.28" />
                            <path d="M90 108 C102 104, 112 110, 116 122" fill="none" stroke={colors.accent} strokeWidth="2.5" opacity="0.22" />
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
