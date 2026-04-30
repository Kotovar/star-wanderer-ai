"use client";

import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import {
    ANOMALY_BASE_REWARD_PER_LEVEL,
    ANOMALY_RANDOM_REWARD_MAX,
    ANOMALY_BASE_DAMAGE_PER_LEVEL,
    ANOMALY_RANDOM_DAMAGE_MAX,
} from "@/game/slices/locations/constants";
import { RiskRewardPreview } from "./RiskRewardPreview";
import { Microscope, Telescope } from "lucide-react";

// Цвет по тиру (совпадает с ANOMALY_COLORS в config.ts)
const TIER_COLOR: Record<number, string> = {
    1: "#00ff41",
    2: "#ffaa00",
    3: "#ff0040",
    4: "#ff00ff",
};

// Флейворный текст по тиру × типу
const FLAVOR: Record<string, Record<number, string>> = {
    good: {
        1: "Стабильное энергетическое поле. Безопасный источник ресурсов.",
        2: "Реликтовый феномен. Значительная энергетическая отдача.",
        3: "Редкое явление. Крупное научное и финансовое вознаграждение.",
        4: "Уникальная аномалия класса Ω. Колоссальный выход энергии.",
    },
    bad: {
        1: "Нестабильные возмущения. Минимальный риск для оборудования.",
        2: "Корпускулярный шторм. Возможны повреждения систем.",
        3: "Искажение пространства-времени. Опасно для экипажа и модулей.",
        4: "Сингулярность класса Ω. Экстремальные пространственные напряжения.",
    },
    unknown: {
        1: "Природа объекта не идентифицирована. Сканирование не завершено.",
        2: "Аномальный сигнал неизвестного происхождения.",
        3: "Неклассифицированный феномен. Рекомендуется осторожность.",
        4: "Источник не поддаётся классификации. Опасность неизвестна.",
    },
};

// ─── SVG-визуал аномалии ──────────────────────────────────────────────────────

function AnomalyVisual({
    tier,
    anomalyType,
}: {
    tier: number;
    anomalyType?: string;
}) {
    const tierColor = TIER_COLOR[tier] ?? TIER_COLOR[1];
    const coreColor =
        anomalyType === "good"
            ? "#00ff88"
            : anomalyType === "bad"
              ? "#ff4422"
              : tierColor;
    const ringColor =
        anomalyType === "good"
            ? "#00d4ff"
            : anomalyType === "bad"
              ? "#ffaa00"
              : tierColor;

    // Кол-во вращающихся колец = тир + 1 (макс 4)
    const ringDefs = [
        { rx: 62, ry: 22, dur: 8,  dir:  1 },
        { rx: 48, ry: 16, dur: 6,  dir: -1 },
        { rx: 36, ry: 12, dur: 10, dir:  1 },
        { rx: 24, ry:  8, dur: 5,  dir: -1 },
    ].slice(0, Math.min(tier + 1, 4));

    return (
        <div className="relative flex justify-center items-center py-2 shrink-0">
            <svg
                width="200"
                height="200"
                viewBox="0 0 200 200"
                style={{ overflow: "visible" }}
            >
                <defs>
                    <radialGradient id="an-glow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%"   stopColor={coreColor} stopOpacity="0.28" />
                        <stop offset="100%" stopColor={coreColor} stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="an-core" cx="40%" cy="38%" r="60%">
                        <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.9" />
                        <stop offset="35%"  stopColor={coreColor} stopOpacity="1" />
                        <stop offset="100%" stopColor={coreColor} stopOpacity="0.15" />
                    </radialGradient>
                </defs>

                {/* Фоновое свечение */}
                <circle cx="100" cy="100" r="88" fill="url(#an-glow)" />

                {/* Вращающиеся энергетические кольца */}
                {ringDefs.map((r, i) => (
                    <g key={i}>
                        <ellipse
                            cx="100" cy="100" rx={r.rx} ry={r.ry}
                            fill="none" stroke={ringColor} strokeWidth="1.5"
                            opacity={0.55 - i * 0.07}
                        >
                            <animateTransform
                                attributeName="transform" type="rotate"
                                from={`${i * 45} 100 100`}
                                to={`${i * 45 + r.dir * 360} 100 100`}
                                dur={`${r.dur}s`} repeatCount="indefinite"
                            />
                        </ellipse>
                        {/* Дублирующий след для глубины */}
                        <ellipse
                            cx="100" cy="100" rx={r.rx - 3} ry={r.ry - 1}
                            fill="none" stroke={coreColor} strokeWidth="0.5"
                            opacity={0.25 - i * 0.04}
                        >
                            <animateTransform
                                attributeName="transform" type="rotate"
                                from={`${i * 45 + 18} 100 100`}
                                to={`${i * 45 + 18 + r.dir * 360} 100 100`}
                                dur={`${r.dur * 1.15}s`} repeatCount="indefinite"
                            />
                        </ellipse>
                    </g>
                ))}

                {/* Ядро */}
                <circle cx="100" cy="100" r="16" fill="url(#an-core)">
                    <animate attributeName="r"       values="13;19;13" dur="2.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0.65;1" dur="2.2s" repeatCount="indefinite" />
                </circle>

                {/* Пульсирующее кольцо ядра */}
                <circle cx="100" cy="100" r="24" fill="none"
                    stroke={coreColor} strokeWidth="1.2" opacity="0.5"
                >
                    <animate attributeName="r"       values="20;34;20"   dur="2.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0;0.5"  dur="2.2s" repeatCount="indefinite" />
                </circle>

                {/* Частицы-искры вокруг (только tier ≥ 3) */}
                {tier >= 3 && (
                    <>
                        {[0, 72, 144, 216, 288].map((angle) => {
                            const rad = (angle * Math.PI) / 180;
                            const x = 100 + 70 * Math.cos(rad);
                            const y = 100 + 70 * Math.sin(rad);
                            return (
                                <circle key={angle} cx={x} cy={y} r="2"
                                    fill={ringColor} opacity="0.6"
                                >
                                    <animate attributeName="opacity"
                                        values="0.6;0.1;0.6"
                                        dur={`${1.5 + (angle / 288) * 1.5}s`}
                                        repeatCount="indefinite"
                                    />
                                </circle>
                            );
                        })}
                    </>
                )}
            </svg>
        </div>
    );
}

// ─── Индикатор тира (точки) ───────────────────────────────────────────────────

function TierDots({ tier }: { tier: number }) {
    const color = TIER_COLOR[tier] ?? TIER_COLOR[1];
    return (
        <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((t) => (
                <div
                    key={t}
                    className="w-2.5 h-2.5 rounded-full transition-all"
                    style={{
                        backgroundColor: t <= tier ? color : "#1a1a2e",
                        boxShadow: t === tier ? `0 0 6px ${color}` : "none",
                        border: `1px solid ${t <= tier ? color : "#333"}`,
                    }}
                />
            ))}
        </div>
    );
}

const rangeText = (min: number, max: number, suffix = "") =>
    min === max ? `${min}${suffix}` : `${min}-${max}${suffix}`;

function buildAnomalyPreview({
    anomalyType,
    rewardMin,
    rewardMax,
    badRewardMin,
    badRewardMax,
    dmgMin,
    dmgMax,
}: {
    anomalyType?: string;
    rewardMin: number;
    rewardMax: number;
    badRewardMin: number;
    badRewardMax: number;
    dmgMin: number;
    dmgMax: number;
}) {
    if (anomalyType === "good") {
        return {
            risks: [
                {
                    label: "Прямой урон",
                    value: "не ожидается",
                    tone: "good" as const,
                },
            ],
            rewards: [
                {
                    label: "Кредиты",
                    value: `+${rangeText(rewardMin, rewardMax, "₢")}`,
                    tone: "good" as const,
                },
                {
                    label: "Исследовательские данные",
                    value: "возможно",
                    tone: "warning" as const,
                },
            ],
            notes: [
                "Стабильные аномалии в основном дают ресурсы и не должны повреждать корабль.",
            ],
        };
    }

    if (anomalyType === "bad") {
        return {
            risks: [
                {
                    label: "Повреждение модуля",
                    value: `-${rangeText(dmgMin, dmgMax, " HP")}`,
                    tone: "danger" as const,
                },
            ],
            rewards: [
                {
                    label: "Кредиты",
                    value: `60% / +${rangeText(badRewardMin, badRewardMax, "₢")}`,
                    tone: "good" as const,
                },
                {
                    label: "Редкие ресурсы",
                    value: "30%",
                    tone: "warning" as const,
                },
                {
                    label: "Артефакт",
                    value: "10%",
                    tone: "warning" as const,
                },
            ],
            notes: [
                "Опасные аномалии дают лучший шанс на редкую награду, но могут повредить случайный модуль.",
            ],
        };
    }

    return {
        risks: [
            {
                label: "Тип аномалии",
                value: "неизвестен",
                tone: "warning" as const,
            },
        ],
        rewards: [
            {
                label: "Результат",
                value: "непредсказуем",
                tone: "neutral" as const,
            },
        ],
        notes: [
            "Сканирование не определило профиль аномалии. Риск и награда скрыты.",
        ],
    };
}

// ─── Строка в экране результатов ─────────────────────────────────────────────

function ResultRow({ message, type }: { message: string; type: string }) {
    let color = "#888";
    if (type === "warning") color = "#ff5555";
    else if (
        message.includes("₢") ||
        message.includes("🔬") ||
        message.includes("✨") ||
        message.includes("+")
    )
        color = "#00ff88";
    if (message.includes("☣️") || message.includes("мутация"))
        color = "#ff6600";

    return (
        <div className="flex items-start gap-2 text-xs leading-relaxed" style={{ color }}>
            <span className="shrink-0 mt-0.5 opacity-60">›</span>
            <span>{message}</span>
        </div>
    );
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export function AnomalyPanel() {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const crew           = useGameStore((s) => s.crew);
    const completedLocations = useGameStore((s) => s.completedLocations);
    const log            = useGameStore((s) => s.log);
    const handleAnomaly  = useGameStore((s) => s.handleAnomaly);
    const showSectorMap  = useGameStore((s) => s.showSectorMap);
    const { t }          = useTranslation();

    if (!currentLocation) return null;

    const tier      = currentLocation.anomalyTier ?? currentLocation.requiresScientistLevel ?? 1;
    const reqLevel  = currentLocation.requiresScientistLevel ?? 1;
    const aType     = currentLocation.anomalyType; // "good" | "bad" | undefined
    const tierColor = TIER_COLOR[tier] ?? TIER_COLOR[1];

    const scientists       = crew.filter((c) => c.profession === "scientist");
    const maxScientistLevel =
        scientists.length > 0 ? Math.max(...scientists.map((s) => s.level || 1)) : 0;
    const canResearch = maxScientistLevel >= reqLevel;

    const anomalyCompleted = completedLocations.includes(currentLocation.id);

    // Фильтрация лога для экрана результатов
    const allAnomalyLogs = log
        .slice(0, 15)
        .filter(
            (e) =>
                e.message.includes("Аномалия:") ||
                e.message.includes("аномали") ||
                e.message.includes("Anomaly:") ||
                e.message.includes("anomal") ||
                e.message.includes("Найдены исследовательские ресурсы") ||
                e.message.includes("Редкая находка") ||
                e.message.includes("Редкие образцы") ||
                e.message.includes("артефакт") ||
                e.message.includes("мутация") ||
                e.message.includes("Углублённый анализ"),
        );
    const secondAnomalyIdx = allAnomalyLogs.findIndex(
        (e, i) => i > 0 && e.message.startsWith("Аномалия:"),
    );
    const recentLogs =
        secondAnomalyIdx > 0
            ? allAnomalyLogs.slice(0, secondAnomalyIdx)
            : allAnomalyLogs;

    // Диапазоны наград/урона для превью
    const rewardMin = ANOMALY_BASE_REWARD_PER_LEVEL * tier;
    const rewardMax = rewardMin + ANOMALY_RANDOM_REWARD_MAX;
    const dmgMin    = ANOMALY_BASE_DAMAGE_PER_LEVEL * tier;
    const dmgMax    = dmgMin + ANOMALY_RANDOM_DAMAGE_MAX;
    const badRewardMin = Math.floor(rewardMin * 1.5);
    const badRewardMax = badRewardMin + ANOMALY_RANDOM_REWARD_MAX;

    const flavorKey = aType ?? "unknown";
    const flavor = FLAVOR[flavorKey]?.[tier] ?? "";
    const preview = buildAnomalyPreview({
        anomalyType: aType,
        rewardMin,
        rewardMax,
        badRewardMin,
        badRewardMax,
        dmgMin,
        dmgMax,
    });

    // ── Экран результатов ────────────────────────────────────────────────────
    if (anomalyCompleted) {
        return (
            <div className="flex flex-col gap-3 h-full overflow-y-auto">
                {/* Заголовок */}
                <div className="flex items-center justify-between shrink-0">
                    <div
                        className="font-['Orbitron'] font-bold text-sm uppercase tracking-wider"
                        style={{ color: tierColor }}
                    >
                        ✓ ИССЛЕДОВАНИЕ ЗАВЕРШЕНО
                    </div>
                    <button
                        onClick={showSectorMap}
                        className="text-[#ff0040] hover:text-white text-lg font-bold cursor-pointer px-1"
                    >
                        ✕
                    </button>
                </div>

                <AnomalyVisual tier={tier} anomalyType={aType} />

                {/* Результаты */}
                <div
                    className="border p-3 flex flex-col gap-2"
                    style={{ borderColor: tierColor + "55", background: "rgba(0,0,0,0.4)" }}
                >
                    <div
                        className="text-[10px] uppercase tracking-widest font-['Orbitron'] mb-1"
                        style={{ color: tierColor }}
                    >
                        Результаты исследования
                    </div>
                    {recentLogs.length > 0 ? (
                        recentLogs.map((e, i) => (
                            <ResultRow key={i} message={e.message} type={e.type} />
                        ))
                    ) : (
                        <span className="text-xs text-[#555]">Нет данных</span>
                    )}
                </div>

                <Button
                    onClick={showSectorMap}
                    className="w-full bg-transparent border-2 uppercase tracking-wider cursor-pointer"
                    style={{
                        borderColor: tierColor,
                        color: tierColor,
                    }}
                >
                    {t("anomaly.leave")}
                </Button>
            </div>
        );
    }

    // ── Не хватает уровня учёных ─────────────────────────────────────────────
    if (!canResearch) {
        return (
            <div className="flex flex-col gap-3 h-full overflow-y-auto">
                {/* Заголовок */}
                <div className="flex items-center justify-between shrink-0">
                    <div
                        className="font-['Orbitron'] font-bold text-sm uppercase tracking-wider"
                        style={{ color: tierColor }}
                    >
                        {t("anomaly.title_level").replace("{{level}}", String(reqLevel))}
                    </div>
                    <button
                        onClick={showSectorMap}
                        className="text-[#ff0040] hover:text-white text-lg font-bold cursor-pointer px-1"
                    >
                        ✕
                    </button>
                </div>

                <AnomalyVisual tier={tier} anomalyType={aType} />

                {/* Предупреждение */}
                <div
                    className="border border-[#ff0040] bg-[rgba(255,0,64,0.06)] p-3 flex flex-col gap-2"
                >
                    <div className="text-xs text-[#ff5555] font-bold">
                        {t("anomaly.too_complex")}
                    </div>
                    <div className="text-xs text-[#888]">
                        {t("anomaly.requires_scientist").replace("{{level}}", String(reqLevel))}
                    </div>
                </div>

                {/* Тир + состояние учёных */}
                <div
                    className="border p-3 flex flex-col gap-2"
                    style={{ borderColor: tierColor + "44", background: "rgba(0,0,0,0.3)" }}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-[#888] uppercase tracking-wider">Уровень угрозы</span>
                        <TierDots tier={tier} />
                    </div>
                    <div className="border-t border-[#1a1a2e] pt-2 flex flex-col gap-1">
                        <div className="text-[10px] text-[#888] uppercase tracking-wider mb-1">
                            {t("anomaly.your_scientists")}
                        </div>
                        {scientists.length === 0 ? (
                            <span className="text-xs text-[#555]">{t("anomaly.none")}</span>
                        ) : (
                            scientists.map((s) => (
                                <div key={s.id} className="flex items-center justify-between text-xs">
                                    <span className="text-[#888]">{s.name}</span>
                                    <span
                                        className="font-bold"
                                        style={{ color: (s.level ?? 1) >= reqLevel ? "#00ff88" : "#ff5555" }}
                                    >
                                        LV{s.level ?? 1}
                                        {(s.level ?? 1) < reqLevel && (
                                            <span className="text-[10px] text-[#ff5555] ml-1">
                                                (нужен LV{reqLevel})
                                            </span>
                                        )}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <Button
                    onClick={showSectorMap}
                    className="w-full bg-transparent border-2 border-[#ffaa00] text-[#ffaa00] hover:bg-[#ffaa00] hover:text-[#050810] uppercase tracking-wider cursor-pointer"
                >
                    {t("anomaly.retreat")}
                </Button>
            </div>
        );
    }

    // ── Основной экран: можно исследовать ────────────────────────────────────
    return (
        <div className="flex flex-col gap-3 h-full overflow-y-auto">
            {/* Заголовок */}
            <div className="flex items-center justify-between shrink-0">
                <div
                    className="font-['Orbitron'] font-bold text-sm uppercase tracking-wider"
                    style={{ color: tierColor }}
                >
                    {t("anomaly.title").replace("{{level}}", String(reqLevel))}
                </div>
                <button
                    onClick={showSectorMap}
                    className="text-[#ff0040] hover:text-white text-lg font-bold cursor-pointer px-1"
                >
                    ✕
                </button>
            </div>

            <AnomalyVisual tier={tier} anomalyType={aType} />

            {/* Тип + тир */}
            <div
                className="border p-3 flex flex-col gap-2 shrink-0"
                style={{ borderColor: tierColor + "55", background: "rgba(0,0,0,0.35)" }}
            >
                <div className="flex items-center justify-between">
                    {/* Тип */}
                    <div className="flex items-center gap-2">
                        {aType === "good" && (
                            <span
                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border"
                                style={{ color: "#00ff88", borderColor: "#00ff88", background: "rgba(0,255,136,0.08)" }}
                            >
                                ✓ {t("anomaly.good")}
                            </span>
                        )}
                        {aType === "bad" && (
                            <span
                                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border"
                                style={{ color: "#ff5555", borderColor: "#ff5555", background: "rgba(255,85,85,0.08)" }}
                            >
                                ⚠ {t("anomaly.dangerous")}
                            </span>
                        )}
                        {!aType && (
                            <span className="text-[10px] text-[#888] uppercase tracking-wider">
                                ? Неизвестный тип
                            </span>
                        )}
                    </div>
                    {/* Тир */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#888] uppercase tracking-wider">Угроза</span>
                        <TierDots tier={tier} />
                    </div>
                </div>

                {/* Флейворный текст */}
                {flavor && (
                    <div className="text-[11px] text-[#888] leading-relaxed border-t border-[#1a1a2e] pt-2">
                        {flavor}
                    </div>
                )}
            </div>

            <RiskRewardPreview
                title="Прогноз исследования"
                risks={preview.risks}
                rewards={preview.rewards}
                notes={preview.notes}
            />

            {/* Учёные */}
            <div
                className="border p-3 flex flex-col gap-1.5 shrink-0"
                style={{ borderColor: "#1a1a2e", background: "rgba(0,0,0,0.2)" }}
            >
                <div className="text-[10px] text-[#888] uppercase tracking-wider mb-0.5">
                    {t("anomaly.your_scientists")}
                </div>
                {scientists.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                        <span className="text-[#ccc]">{s.name}</span>
                        <div className="flex items-center gap-2">
                            {s.assignment === "analyzing" && (
                                <span className="flex items-center gap-1 text-[10px] text-[#00d4ff]">
                                    <Microscope size={11} /> анализ
                                </span>
                            )}
                            <span className="font-bold text-[#00ff88]">
                                LV{s.level ?? 1} ✓
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Кнопки */}
            <div className="flex gap-2 shrink-0">
                <Button
                    onClick={() => handleAnomaly(currentLocation)}
                    className="flex-1 bg-transparent border-2 uppercase tracking-wider cursor-pointer text-xs"
                    style={{
                        borderColor: tierColor,
                        color: tierColor,
                    }}
                >
                    <Telescope size={14} /> {t("anomaly.investigate")}
                </Button>
                <Button
                    onClick={showSectorMap}
                    className="bg-transparent border border-[#333] text-[#666] hover:bg-[#1a1a2e] hover:text-[#999] uppercase tracking-wider cursor-pointer text-xs"
                >
                    {t("anomaly.retreat")}
                </Button>
            </div>
        </div>
    );
}
