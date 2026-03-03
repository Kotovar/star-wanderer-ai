import type { PlanetType } from "@/game/types";

interface PlanetVisualProps {
    planetType: PlanetType | undefined;
}

export function PlanetVisual({ planetType }: PlanetVisualProps) {
    if (!planetType) return null;

    // Color configurations for each planet type
    const planetColors: Record<PlanetType, { primary: string; secondary: string; accent?: string }> = {
        "Пустынная": { primary: "#c97f3f", secondary: "#8b5a2b", accent: "#e6a85c" },
        "Ледяная": { primary: "#5a9fd4", secondary: "#2d5a87", accent: "#a8d4f0" },
        "Лесная": { primary: "#3d8b3d", secondary: "#1a4a2a", accent: "#5cb85c" },
        "Вулканическая": { primary: "#8b3a3a", secondary: "#4a1a1a", accent: "#ff6b35" },
        "Океаническая": { primary: "#2d6a87", secondary: "#1a3a5a", accent: "#4a9fd4" },
        "Газовый гигант": { primary: "#6a4a8a", secondary: "#3a2a5a", accent: "#9a7aba" },
        "Радиоактивная": { primary: "#4a8a3a", secondary: "#2a4a1a", accent: "#7fff00" },
        "Тропическая": { primary: "#2d8a5a", secondary: "#1a5a3a", accent: "#5cd48a" },
        "Арктическая": { primary: "#4a7a9a", secondary: "#2a4a5a", accent: "#8ab8d4" },
        "Разрушенная войной": { primary: "#4a3a3a", secondary: "#2a1a1a", accent: "#ff4444" },
        "Планета-кольцо": { primary: "#3a4a7a", secondary: "#1a2a4a", accent: "#8a9aba" },
        "Приливная": { primary: "#2d5a8a", secondary: "#1a3a5a", accent: "#5a9fd4" },
    };

    const colors = planetColors[planetType];

    return (
        <div className="absolute -right-20 -top-20 w-64 h-64 opacity-20 pointer-events-none">
            <svg
                viewBox="0 0 200 200"
                className="w-full h-full animate-float"
                style={{
                    filter: "drop-shadow(0 0 20px rgba(255, 255, 255, 0.3))",
                }}
            >
                {/* Planet glow */}
                <defs>
                    <radialGradient id={`planet-glow-${planetType}`} cx="30%" cy="30%" r="70%">
                        <stop offset="0%" stopColor={colors.primary} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={colors.secondary} stopOpacity="0.1" />
                    </radialGradient>
                    <linearGradient id={`planet-surface-${planetType}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={colors.primary} />
                        <stop offset="50%" stopColor={colors.secondary} />
                        <stop offset="100%" stopColor={colors.primary} />
                    </linearGradient>
                </defs>

                {/* Glow effect */}
                <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill={`url(#planet-glow-${planetType})`}
                />

                {/* Main planet body */}
                <circle
                    cx="100"
                    cy="100"
                    r="70"
                    fill={`url(#planet-surface-${planetType})`}
                />

                {/* Surface details based on planet type */}
                {planetType === "Пустынная" && (
                    <>
                        <ellipse cx="70" cy="80" rx="25" ry="15" fill={colors.accent} opacity="0.3" />
                        <ellipse cx="130" cy="120" rx="30" ry="18" fill={colors.accent} opacity="0.25" />
                        <ellipse cx="100" cy="100" rx="40" ry="20" fill={colors.accent} opacity="0.2" />
                    </>
                )}

                {planetType === "Ледяная" && (
                    <>
                        <circle cx="60" cy="70" r="12" fill={colors.accent} opacity="0.4" />
                        <circle cx="140" cy="130" r="15" fill={colors.accent} opacity="0.35" />
                        <circle cx="100" cy="90" r="18" fill={colors.accent} opacity="0.3" />
                        <circle cx="80" cy="120" r="10" fill={colors.accent} opacity="0.25" />
                    </>
                )}

                {planetType === "Лесная" && (
                    <>
                        <ellipse cx="70" cy="90" rx="20" ry="30" fill={colors.accent} opacity="0.3" />
                        <ellipse cx="130" cy="100" rx="25" ry="35" fill={colors.accent} opacity="0.25" />
                        <ellipse cx="100" cy="130" rx="30" ry="25" fill={colors.accent} opacity="0.2" />
                    </>
                )}

                {planetType === "Вулканическая" && (
                    <>
                        <circle cx="65" cy="85" r="8" fill={colors.accent} opacity="0.6" />
                        <circle cx="135" cy="115" r="10" fill={colors.accent} opacity="0.5" />
                        <circle cx="95" cy="125" r="12" fill={colors.accent} opacity="0.4" />
                        <ellipse cx="110" cy="75" rx="15" ry="8" fill={colors.accent} opacity="0.35" />
                    </>
                )}

                {planetType === "Океаническая" && (
                    <>
                        <ellipse cx="80" cy="80" rx="35" ry="15" fill={colors.accent} opacity="0.3" />
                        <ellipse cx="120" cy="120" rx="40" ry="18" fill={colors.accent} opacity="0.25" />
                        <ellipse cx="100" cy="100" rx="45" ry="12" fill={colors.accent} opacity="0.2" />
                    </>
                )}

                {planetType === "Газовый гигант" && (
                    <>
                        <rect x="40" y="70" width="120" height="8" fill={colors.accent} opacity="0.3" rx="4" />
                        <rect x="35" y="90" width="130" height="10" fill={colors.accent} opacity="0.25" rx="5" />
                        <rect x="45" y="110" width="110" height="7" fill={colors.accent} opacity="0.2" rx="3" />
                        <rect x="50" y="130" width="100" height="6" fill={colors.accent} opacity="0.15" rx="3" />
                    </>
                )}

                {planetType === "Радиоактивная" && (
                    <>
                        <circle cx="70" cy="90" r="15" fill={colors.accent} opacity="0.4" />
                        <circle cx="130" cy="100" r="18" fill={colors.accent} opacity="0.35" />
                        <circle cx="100" cy="120" r="12" fill={colors.accent} opacity="0.3" />
                        <circle cx="90" cy="75" r="10" fill={colors.accent} opacity="0.25" />
                    </>
                )}

                {planetType === "Тропическая" && (
                    <>
                        <ellipse cx="75" cy="85" rx="22" ry="28" fill={colors.accent} opacity="0.3" />
                        <ellipse cx="125" cy="110" rx="28" ry="32" fill={colors.accent} opacity="0.25" />
                        <ellipse cx="95" cy="115" rx="20" ry="25" fill={colors.accent} opacity="0.2" />
                    </>
                )}

                {planetType === "Арктическая" && (
                    <>
                        <circle cx="65" cy="80" r="14" fill={colors.accent} opacity="0.5" />
                        <circle cx="135" cy="120" r="16" fill={colors.accent} opacity="0.4" />
                        <circle cx="100" cy="100" r="20" fill={colors.accent} opacity="0.35" />
                        <circle cx="85" cy="130" r="12" fill={colors.accent} opacity="0.3" />
                    </>
                )}

                {planetType === "Разрушенная войной" && (
                    <>
                        <circle cx="70" cy="85" r="10" fill={colors.accent} opacity="0.5" />
                        <circle cx="130" cy="110" r="14" fill="#ff4444" opacity="0.4" />
                        <ellipse cx="95" cy="120" rx="20" ry="12" fill="#3a2a2a" opacity="0.6" />
                        <circle cx="110" cy="75" r="8" fill="#ff4444" opacity="0.35" />
                    </>
                )}

                {planetType === "Планета-кольцо" && (
                    <>
                        {/* Rings */}
                        <ellipse
                            cx="100"
                            cy="100"
                            rx="95"
                            ry="25"
                            fill="none"
                            stroke={colors.accent}
                            strokeWidth="3"
                            opacity="0.5"
                            transform="rotate(-20 100 100)"
                        />
                        <ellipse
                            cx="100"
                            cy="100"
                            rx="85"
                            ry="20"
                            fill="none"
                            stroke={colors.accent}
                            strokeWidth="2"
                            opacity="0.4"
                            transform="rotate(-20 100 100)"
                        />
                        {/* Planet body */}
                        <circle cx="100" cy="100" r="50" fill={`url(#planet-surface-${planetType})`} />
                    </>
                )}

                {planetType === "Приливная" && (
                    <>
                        <ellipse cx="75" cy="80" rx="30" ry="18" fill={colors.accent} opacity="0.35" />
                        <ellipse cx="125" cy="115" rx="35" ry="20" fill={colors.accent} opacity="0.3" />
                        <ellipse cx="100" cy="95" rx="38" ry="15" fill={colors.accent} opacity="0.25" />
                    </>
                )}

                {/* Atmosphere glow */}
                <circle
                    cx="100"
                    cy="100"
                    r="72"
                    fill="none"
                    stroke={colors.primary}
                    strokeWidth="2"
                    opacity="0.3"
                />
            </svg>
        </div>
    );
}
