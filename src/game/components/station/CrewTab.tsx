"use client";

import { Button } from "@/components/ui/button";
import { RACES } from "../../constants/races";
import type { RaceId } from "../../types";

interface CrewTabProps {
    availableCrew: Array<{
        member: {
            name: string;
            race: RaceId;
            profession: string;
            level?: number;
            traits: Array<{ name: string; desc: string; type: string }>;
        };
        price: number;
        quality: string;
    }>;
    hasSpace: boolean;
    credits: number;
    locationId?: string;
    hireCrew: (member: unknown, price: number, locationId?: string) => void;
}

export function CrewTab({
    availableCrew,
    hasSpace,
    credits,
    locationId,
    hireCrew,
}: CrewTabProps) {
    return (
        <div className="flex flex-col gap-2.5 max-h-[55vh] overflow-y-auto pr-1">
            {!hasSpace && (
                <div className="text-[#ff0040] text-sm p-3 border border-[#ff0040] bg-[rgba(255,0,64,0.1)]">
                    ⚠ Нет места для экипажа. Постройте жилой модуль.
                </div>
            )}

            <div className="text-xs text-[#888] mb-2">
                Доступно экипажа: {availableCrew.length}
            </div>

            {availableCrew.map((crew, i) => (
                <CrewCard
                    key={i}
                    crew={crew}
                    hasSpace={hasSpace}
                    credits={credits}
                    locationId={locationId}
                    onHire={hireCrew}
                />
            ))}
        </div>
    );
}

interface CrewCardProps {
    crew: {
        member: {
            name: string;
            race: RaceId;
            profession: string;
            level?: number;
            traits: Array<{ name: string; desc: string; type: string }>;
        };
        price: number;
        quality: string;
    };
    hasSpace: boolean;
    credits: number;
    locationId?: string;
    onHire: (member: unknown, price: number, locationId?: string) => void;
}

function CrewCard({
    crew,
    hasSpace,
    credits,
    locationId,
    onHire,
}: CrewCardProps) {
    const race = RACES[crew.member.race];

    return (
        <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-3">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <CrewHeader crew={crew} race={race} />
                    <CrewQuality quality={crew.quality} price={crew.price} />
                    {race?.crewBonuses && (
                        <CrewBonuses bonuses={race.crewBonuses} />
                    )}
                    {crew.member.traits.length > 0 && (
                        <CrewTraits traits={crew.member.traits} />
                    )}
                </div>
                <Button
                    disabled={!hasSpace || credits < crew.price}
                    onClick={() => onHire(crew.member, crew.price, locationId)}
                    className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-xs ml-2"
                >
                    НАНЯТЬ
                </Button>
            </div>
        </div>
    );
}

function CrewHeader({
    crew,
    race,
}: {
    crew: {
        member: {
            name: string;
            race: RaceId;
            profession: string;
            level?: number;
        };
    };
    race: (typeof RACES)[keyof typeof RACES] | undefined;
}) {
    return (
        <div className="flex items-center gap-2">
            {race && <span style={{ color: race.color }}>{race.icon}</span>}
            <span className="text-[#00d4ff] font-bold">
                {crew.member.name}
                {crew.member.level ? ` LV${crew.member.level}` : ""}
            </span>
            {race && (
                <span
                    className="text-[10px] px-1.5 py-0.5 rounded border"
                    style={{
                        borderColor: race.color,
                        color: race.color,
                    }}
                >
                    {race.name}
                </span>
            )}
        </div>
    );
}

function CrewQuality({ quality, price }: { quality: string; price: number }) {
    const getQualityColor = (q: string) => {
        switch (q) {
            case "poor":
                return "#888";
            case "average":
                return "#00ff41";
            case "good":
                return "#00d4ff";
            case "excellent":
                return "#ffb000";
            default:
                return "#00ff41";
        }
    };

    const getQualityLabel = (q: string) => {
        switch (q) {
            case "poor":
                return "Низкое";
            case "average":
                return "Обычное";
            case "good":
                return "Хорошее";
            case "excellent":
                return "Отличное";
            default:
                return "";
        }
    };

    return (
        <div className="text-xs mt-1">
            <span style={{ color: getQualityColor(quality) }}>
                ★ {getQualityLabel(quality)}
            </span>
            <span className="text-[#ffb000] ml-3">💰 {price}₢</span>
        </div>
    );
}

function CrewBonuses({
    bonuses,
}: {
    bonuses: {
        combat?: number;
        repair?: number;
        science?: number;
        energy?: number;
    };
}) {
    return (
        <div className="flex flex-wrap gap-1 mt-1">
            {bonuses.combat && (
                <span className="text-[10px] bg-[#ff004020] text-[#ff0040] px-1 rounded">
                    ⚔️ +{Math.round(bonuses.combat * 100)}%
                </span>
            )}
            {bonuses.repair && (
                <span className="text-[10px] bg-[#ffb00020] text-[#ffb000] px-1 rounded">
                    🔧 +{Math.round(bonuses.repair * 100)}%
                </span>
            )}
            {bonuses.science && (
                <span className="text-[10px] bg-[#00d4ff20] text-[#00d4ff] px-1 rounded">
                    🔬 +{Math.round(bonuses.science * 100)}%
                </span>
            )}
            {bonuses.energy && (
                <span className="text-[10px] bg-[#9933ff20] text-[#9933ff] px-1 rounded">
                    ⚡ -{Math.round(Math.abs(bonuses.energy) * 100)}% расход
                </span>
            )}
        </div>
    );
}

function CrewTraits({
    traits,
}: {
    traits: Array<{ name: string; desc: string; type: string }>;
}) {
    return (
        <div className="text-[10px] mt-2 space-y-1">
            {traits.map((t, ti) => (
                <div
                    key={ti}
                    style={{
                        color:
                            t.type === "positive"
                                ? "#00ff41"
                                : t.type === "negative"
                                  ? "#ff4444"
                                  : "#ffb000",
                    }}
                >
                    {t.type === "positive"
                        ? "✓"
                        : t.type === "negative"
                          ? "✗"
                          : "⚡"}{" "}
                    {t.name}: {t.desc}
                </div>
            ))}
        </div>
    );
}
