"use client";

import { useMemo, useState } from "react";
import { useGameStore } from "../store";
import { useTranslation } from "@/lib/useTranslation";
import type { LogEntry } from "@/game/types";

type TFunction = (
    key: string,
    params?: Record<string, string | number>,
) => string;

type JournalFilter =
    | "all"
    | "combat"
    | "crew"
    | "research"
    | "contracts"
    | "exploration"
    | "reputation"
    | "system";

const JOURNAL_FILTERS: JournalFilter[] = [
    "all",
    "combat",
    "crew",
    "research",
    "contracts",
    "exploration",
    "reputation",
    "system",
];

const CATEGORY_COLORS: Record<
    Exclude<JournalFilter, "all">,
    { text: string; border: string; bg: string }
> = {
    combat: {
        text: "#ff4d7a",
        border: "#ff0040",
        bg: "rgba(255,0,64,0.07)",
    },
    crew: {
        text: "#00ffaa",
        border: "#00ffaa",
        bg: "rgba(0,255,170,0.06)",
    },
    research: {
        text: "#00d4ff",
        border: "#00d4ff",
        bg: "rgba(0,212,255,0.06)",
    },
    contracts: {
        text: "#ffb000",
        border: "#ffb000",
        bg: "rgba(255,176,0,0.07)",
    },
    exploration: {
        text: "#b66dff",
        border: "#9933ff",
        bg: "rgba(153,51,255,0.07)",
    },
    reputation: {
        text: "#66ff66",
        border: "#00ff41",
        bg: "rgba(0,255,65,0.06)",
    },
    system: {
        text: "#c0c0c0",
        border: "#c0c0c0",
        bg: "rgba(192,192,192,0.05)",
    },
};

const TYPE_LABELS: Record<LogEntry["type"], string> = {
    info: "INFO",
    warning: "WARN",
    error: "ALERT",
    combat: "COMBAT",
};

export function GameLog() {
    const { t } = useTranslation();
    const log = useGameStore((s) => s.log);
    const turn = useGameStore((s) => s.turn);
    const [activeFilter, setActiveFilter] = useState<JournalFilter>("all");

    const entries = useMemo(
        () =>
            log.map((entry) => ({
                entry,
                category: getJournalCategory(entry),
            })),
        [log],
    );

    const counts = useMemo(() => {
        const next = Object.fromEntries(
            JOURNAL_FILTERS.map((filter) => [filter, 0]),
        ) as Record<JournalFilter, number>;

        next.all = entries.length;
        entries.forEach(({ category }) => {
            next[category] += 1;
        });
        return next;
    }, [entries]);

    const filteredEntries =
        activeFilter === "all"
            ? entries
            : entries.filter(({ category }) => category === activeFilter);

    const warningCount = log.filter((entry) => entry.type === "warning").length;
    const alertCount = log.filter((entry) => entry.type === "error").length;
    const combatCount = log.filter((entry) => entry.type === "combat").length;

    return (
        <div className="min-h-full border border-[#00ff41] bg-[rgba(0,0,0,0.45)] p-3">
            <div className="mb-3 border-b border-[#00ff4133] pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <div className="font-['Orbitron'] text-base font-bold text-[#ffb000]">
                            {t("journal.title")}
                        </div>
                        <div className="mt-1 text-xs leading-snug text-[#889988]">
                            {t("journal.subtitle")}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                        <JournalMetric
                            label={t("journal.current_turn")}
                            value={turn}
                        />
                        <JournalMetric
                            label={t("journal.records")}
                            value={log.length}
                        />
                        <JournalMetric
                            label={t("journal.warnings")}
                            value={warningCount}
                        />
                        <JournalMetric
                            label={t("journal.alerts")}
                            value={alertCount}
                            danger
                        />
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1 sm:grid-cols-4">
                    {JOURNAL_FILTERS.map((filter) => {
                        const isActive = activeFilter === filter;
                        const color =
                            filter === "all"
                                ? {
                                      text: "#00ff41",
                                      border: "#00ff41",
                                      bg: "rgba(0,255,65,0.07)",
                                  }
                                : CATEGORY_COLORS[filter];

                        return (
                            <button
                                key={filter}
                                type="button"
                                onClick={() => setActiveFilter(filter)}
                                className="min-w-0 border px-2 py-1 text-left text-[10px] font-bold uppercase tracking-wide transition-colors"
                                style={{
                                    borderColor: isActive
                                        ? color.border
                                        : "#1a3320",
                                    color: isActive ? color.text : "#667766",
                                    backgroundColor: isActive
                                        ? color.bg
                                        : "rgba(0,255,65,0.025)",
                                }}
                            >
                                <span className="block truncate">
                                    {t(`journal.filters.${filter}`)}
                                </span>
                                <span className="text-[9px] opacity-70">
                                    {counts[filter]}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mb-2 grid grid-cols-3 gap-1 text-center text-[10px]">
                <JournalMetric
                    label={t("journal.combat")}
                    value={combatCount}
                />
                <JournalMetric
                    label={t("journal.filtered")}
                    value={filteredEntries.length}
                />
                <JournalMetric
                    label={t("journal.stored")}
                    value={log.length}
                />
            </div>

            <div className="space-y-2">
                {filteredEntries.length > 0 ? (
                    filteredEntries.map(({ entry, category }, index) => (
                        <JournalEntryCard
                            key={`${entry.turn}-${index}-${entry.message}`}
                            entry={entry}
                            category={category}
                        />
                    ))
                ) : (
                    <div className="border border-[#1a3320] bg-[rgba(0,255,65,0.025)] p-4 text-center text-xs text-[#889988]">
                        {t("journal.empty")}
                    </div>
                )}
            </div>
        </div>
    );
}

function JournalMetric({
    label,
    value,
    danger = false,
}: {
    label: string;
    value: number;
    danger?: boolean;
}) {
    return (
        <div
            className={`min-w-0 border px-2 py-1 ${
                danger
                    ? "border-[#ff004055] bg-[rgba(255,0,64,0.055)]"
                    : "border-[#00d4ff44] bg-[rgba(0,212,255,0.05)]"
            }`}
        >
            <div
                className={`font-bold tabular-nums ${
                    danger ? "text-[#ff0040]" : "text-[#00d4ff]"
                }`}
            >
                {value}
            </div>
            <div className="truncate uppercase tracking-wide text-[#667]">
                {label}
            </div>
        </div>
    );
}

function JournalEntryCard({
    entry,
    category,
}: {
    entry: LogEntry;
    category: Exclude<JournalFilter, "all">;
}) {
    const { t } = useTranslation();
    const color = CATEGORY_COLORS[category];
    const typeClass = getTypeClass(entry.type);
    const message = formatJournalMessage(entry.message, t);

    return (
        <div
            className={`relative overflow-hidden border bg-[rgba(0,255,65,0.028)] p-2.5 text-xs leading-snug ${typeClass}`}
            style={{
                borderLeftColor: color.border,
                borderLeftWidth: 3,
            }}
        >
            <div
                className="absolute inset-y-0 left-0 w-0.5"
                style={{ backgroundColor: color.border }}
            />
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <span className="border border-[#00ff4144] px-1.5 py-0.5 text-[10px] text-[#00ff41]">
                    {t("game_log.turn_label")} {entry.turn}
                </span>
                <span
                    className="border px-1.5 py-0.5 text-[10px] font-bold"
                    style={{
                        color: color.text,
                        borderColor: `${color.border}77`,
                        backgroundColor: color.bg,
                    }}
                >
                    {t(`journal.filters.${category}`)}
                </span>
                <span className="text-[10px] text-[#667]">
                    {TYPE_LABELS[entry.type]}
                </span>
            </div>
            <div className="text-[#d6ffe0]">{message}</div>
        </div>
    );
}

function getTypeClass(type: LogEntry["type"]): string {
    switch (type) {
        case "warning":
            return "border-[#ffb00055]";
        case "error":
            return "border-[#ff004077]";
        case "combat":
            return "border-[#00d4ff55]";
        default:
            return "border-[#00ff4133]";
    }
}

function getJournalCategory(
    entry: LogEntry,
): Exclude<JournalFilter, "all"> {
    const message = entry.message.toLowerCase();

    if (entry.type === "combat" || hasAny(message, COMBAT_MARKERS)) {
        return "combat";
    }
    if (hasAny(message, CONTRACT_MARKERS)) {
        return "contracts";
    }
    if (hasAny(message, CREW_MARKERS)) {
        return "crew";
    }
    if (hasAny(message, RESEARCH_MARKERS)) {
        return "research";
    }
    if (hasAny(message, REPUTATION_MARKERS)) {
        return "reputation";
    }
    if (hasAny(message, EXPLORATION_MARKERS)) {
        return "exploration";
    }
    return "system";
}

function hasAny(message: string, markers: string[]): boolean {
    return markers.some((marker) => message.includes(marker));
}

function formatJournalMessage(message: string, t: TFunction): string {
    return message.replace(/contracts\.[a-z0-9_]+/g, (key) =>
        resolveTranslationKeyForLog(key, t),
    );
}

function resolveTranslationKeyForLog(key: string, t: TFunction): string {
    const translated = t(key);
    if (translated === key) return key;

    return translated
        .replace(/\s*\([^)]*\{\{[^)]*\}[^)]*\)/g, "")
        .replace(/["«]?{{[^}]+}}["»]?/g, "")
        .replace(/\s*[:—-]\s*$/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}

const COMBAT_MARKERS = [
    "бой",
    "ата",
    "урон",
    "щит",
    "выстрел",
    "промах",
    "крит",
    "враг",
    "побед",
    "босс",
    "combat",
    "damage",
    "shield",
    "miss",
    "enemy",
    "victory",
];

const CREW_MARKERS = [
    "экипаж",
    "член экипажа",
    "здоров",
    "счаст",
    "опыт",
    "уров",
    "тренировка",
    "сращ",
    "симбиоз",
    "покинул",
    "crew",
    "health",
    "morale",
    "experience",
    "level",
    "training",
    "symbiosis",
];

const RESEARCH_MARKERS = [
    "исслед",
    "технолог",
    "наука",
    "чертеж",
    "рецепт",
    "артефакт",
    "research",
    "technology",
    "science",
    "blueprint",
    "artifact",
];

const CONTRACT_MARKERS = [
    "contracts.",
    "задач",
    "задани",
    "контракт",
    "охота",
    "доставка",
    "поставка",
    "contract",
    "task",
    "quest",
    "delivery",
    "bounty",
];

const EXPLORATION_MARKERS = [
    "перел",
    "сектор",
    "аномал",
    "экспедиц",
    "развед",
    "планет",
    "шторм",
    "пояс",
    "облом",
    "погруж",
    "бур",
    "travel",
    "sector",
    "anomaly",
    "expedition",
    "planet",
    "storm",
    "wreck",
    "dive",
    "drill",
];

const REPUTATION_MARKERS = [
    "репутац",
    "отношен",
    "блокировк",
    "раса",
    "reputation",
    "relation",
    "blockade",
    "race",
];
