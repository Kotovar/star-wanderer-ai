"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { RACES } from "@/game/constants/races";
import type { CrewTrait, Profession, RaceId } from "@/game/types";
import { useTranslation } from "@/lib/useTranslation";

interface CrewTabProps {
    availableCrew: Array<{
        member: {
            name: string;
            race: RaceId;
            profession: Profession;
            level?: number;
            traits: CrewTrait[];
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
    const [selectedCrew, setSelectedCrew] = useState<
        (typeof availableCrew)[0] | null
    >(null);
    const { t } = useTranslation();

    return (
        <>
            <div className="flex flex-col gap-2.5 max-h-[55vh] overflow-y-auto pr-1">
                {!hasSpace && (
                    <div className="text-[#ffb000] text-sm p-3 border border-[#ffb000] bg-[rgba(255,176,0,0.1)]">
                        {t("station.overcrowded_warning")}
                    </div>
                )}

                {availableCrew.map((crew, i) => (
                    <CrewCard
                        key={i}
                        crew={crew}
                        hasSpace={hasSpace}
                        credits={credits}
                        locationId={locationId}
                        onHire={hireCrew}
                        onViewDetails={() => setSelectedCrew(crew)}
                    />
                ))}
            </div>

            {/* Crew detail dialog */}
            <Dialog
                open={!!selectedCrew}
                onOpenChange={() => setSelectedCrew(null)}
            >
                <DialogContent className="bg-[rgba(10,20,30,0.95)] border-2 border-[#00ff41] text-[#00ff41] max-w-md max-h-[90vh] overflow-y-auto w-[calc(100%-2rem)] md:w-auto">
                    <DialogHeader>
                        <DialogTitle className="text-[#ffb000] font-['Orbitron']">
                            ▸ {selectedCrew?.member.name}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {t("crew_member.info_title")}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedCrew && (
                        <CrewDetailDialog
                            crew={selectedCrew}
                            hasSpace={hasSpace}
                            credits={credits}
                            locationId={locationId}
                            onHire={hireCrew}
                            onClose={() => setSelectedCrew(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}

interface CrewCardProps {
    crew: {
        member: {
            name: string;
            race: RaceId;
            profession: Profession;
            level?: number;
            traits: CrewTrait[];
        };
        price: number;
        quality: string;
    };
    hasSpace: boolean;
    credits: number;
    locationId?: string;
    onHire: (member: unknown, price: number, locationId?: string) => void;
    onViewDetails: () => void;
}

function CrewCard({
    crew,
    credits,
    locationId,
    onHire,
    onViewDetails,
}: CrewCardProps) {
    const race = RACES[crew.member.race];
    const { t } = useTranslation();

    return (
        <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-3">
            <div className="flex justify-between items-start">
                <div className="flex-1 cursor-pointer" onClick={onViewDetails}>
                    <CrewHeader crew={crew} race={race} />
                    <div className="text-xs mt-1">
                        <span className="text-[#ffb000]">💰 {crew.price}₢</span>
                    </div>
                    {race?.crewBonuses && (
                        <CrewBonuses bonuses={race.crewBonuses} />
                    )}
                    {crew.member.traits.length > 0 && (
                        <CrewTraits traits={crew.member.traits} />
                    )}
                </div>
                <Button
                    disabled={credits < crew.price}
                    onClick={() => onHire(crew.member, crew.price, locationId)}
                    className="cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-xs ml-2"
                >
                    {t("station.hire_button")}
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
            profession: Profession;
            level?: number;
        };
    };
    race: (typeof RACES)[keyof typeof RACES] | undefined;
}) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
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
                        {t(`races.${crew.member.race}.name`)}
                    </span>
                )}
            </div>
            <span className="text-[#00ff41] text-xs">
                {t(`professions.${crew.member.profession}`)}
            </span>
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
    const { t } = useTranslation();

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
                    ⚡ -{Math.round(Math.abs(bonuses.energy) * 100)}%{" "}
                    {t("station.energy_consumption")}
                </span>
            )}
        </div>
    );
}

function CrewTraits({ traits }: { traits: CrewTrait[] }) {
    const { t } = useTranslation();

    // Map Russian trait names to translation keys
    const traitNameToKey: Record<string, string> = {
        Мастер: "master",
        Бунтарь: "rebel",
        "Меткий стрелок": "sharpshooter",
        Выносливый: "tough",
        Трус: "coward",
        Легенда: "legend",
        "Быстрый ученик": "quick_learner",
        "Отсутствие эмоций": "no_happiness",
        "Сбой ИИ": "ai_glitch",
        "Техно-симбиоз": "symbiosis",
        "Беспокоящее присутствие": "disturbing_presence",
        Устрашение: "intimidation",
        "Пустотная защита": "void_shield",
        Беспокойство: "unnerving",
        "Эфирное тело": "low_health",
        "Кристаллическая броня": "crystal_armor",
        "Кристаллический резонанс": "resonance",
        Хрупкость: "brittle_crystal",
        Удачливый: "lucky",
        Трудолюбивый: "hardworking",
        Болезненный: "sickly",
        Ветеран: "veteran",
        Лидер: "leader",
        Опытный: "experienced",
        Специалист: "skilled",
        Элита: "elite",
        Гений: "genius",
        Вундеркинд: "prodigy",
        Талант: "natural",
        Адаптированный: "adapted",
        Сильный: "strong",
        Слабый: "weak",
        Быстрый: "fast",
        Медленный: "slow",
        Храбрый: "brave",
        Боязливый: "fearful",
        Оптимист: "optimist",
        Пессимист: "pessimist",
        Дружелюбный: "friendly",
        Агрессивный: "aggressive",
        Спокойный: "calm",
        Нервный: "nervous",
        Сосредоточенный: "focused",
        Рассеянный: "distracted",
        Эффективный: "efficient",
        Расточительный: "wasteful",
        "Рождённый под счастливой звездой": "lucky_star",
        Проклятый: "cursed",
    };

    return (
        <div className="text-[10px] mt-2 space-y-1">
            {traits.map((trait, ti) => {
                // Try to get translated trait name and description using mapping
                const traitKey =
                    traitNameToKey[trait.name] ||
                    trait.name.toLowerCase().replace(/\s+/g, "_");
                const translatedName =
                    t(`racial_traits.${traitKey}.name`) !==
                    `racial_traits.${traitKey}.name`
                        ? t(`racial_traits.${traitKey}.name`)
                        : trait.name;
                const translatedDesc =
                    t(`racial_traits.${traitKey}.description`) !==
                    `racial_traits.${traitKey}.description`
                        ? t(`racial_traits.${traitKey}.description`)
                        : trait.desc;

                return (
                    <div
                        key={ti}
                        style={{
                            color:
                                trait.type === "positive"
                                    ? "#00ff41"
                                    : trait.type === "negative"
                                      ? "#ff4444"
                                      : "#ffb000",
                        }}
                    >
                        {trait.type === "positive"
                            ? "✓"
                            : trait.type === "negative"
                              ? "✗"
                              : "⚡"}{" "}
                        {translatedName}: {translatedDesc}
                    </div>
                );
            })}
        </div>
    );
}

// Crew detail dialog component for station hiring
interface CrewDetailDialogProps {
    crew: {
        member: {
            name: string;
            race: RaceId;
            profession: Profession;
            level?: number;
            traits: CrewTrait[];
        };
        price: number;
        quality: string;
    };
    hasSpace: boolean;
    credits: number;
    locationId?: string;
    onHire: (member: unknown, price: number, locationId?: string) => void;
    onClose: () => void;
}

function CrewDetailDialog({
    crew,
    credits,
    locationId,
    onHire,
    onClose,
}: CrewDetailDialogProps) {
    const race = RACES[crew.member.race];
    const canHire = credits >= crew.price;
    const { t } = useTranslation();

    return (
        <div className="space-y-4 text-sm">
            {/* Race info */}
            {race && (
                <div
                    className="flex items-center gap-2 p-2 rounded border"
                    style={{
                        borderColor: race.color,
                        backgroundColor: `${race.color}10`,
                    }}
                >
                    <span className="text-2xl">{race.icon}</span>
                    <div>
                        <div
                            className="font-bold"
                            style={{ color: race.color }}
                        >
                            {t(`races.${crew.member.race}.name`)}
                        </div>
                        <div className="text-xs text-gray-400">
                            {t(`races.${crew.member.race}.description`)}
                        </div>
                    </div>
                </div>
            )}

            {/* Profession and level */}
            <div>
                <span className="text-[#ffb000]">
                    {t("station.crew_profession")}{" "}
                </span>
                <span className="text-[#00d4ff]">
                    {t(`professions.${crew.member.profession}`)}
                    {crew.member.level ? ` [LV${crew.member.level}]` : ""}
                </span>
            </div>

            {/* Price */}
            <div className="text-[#ffb000]">
                {t("station.crew_price", { price: crew.price })}
            </div>

            {/* Race bonuses - only show if there are actual bonuses */}
            {race?.crewBonuses &&
                (race.crewBonuses.combat ||
                    race.crewBonuses.repair ||
                    race.crewBonuses.science ||
                    race.crewBonuses.energy) && (
                    <div>
                        <span className="text-[#ffb000]">
                            {t("station.race_bonuses")}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {race.crewBonuses.combat && (
                                <span className="text-[10px] bg-[#ff004020] text-[#ff0040] px-1 rounded">
                                    ⚔️ +
                                    {Math.round(race.crewBonuses.combat * 100)}%
                                </span>
                            )}
                            {race.crewBonuses.repair && (
                                <span className="text-[10px] bg-[#ffb00020] text-[#ffb000] px-1 rounded">
                                    🔧 +
                                    {Math.round(race.crewBonuses.repair * 100)}%
                                </span>
                            )}
                            {race.crewBonuses.science && (
                                <span className="text-[10px] bg-[#00d4ff20] text-[#00d4ff] px-1 rounded">
                                    🔬 +
                                    {Math.round(race.crewBonuses.science * 100)}
                                    %
                                </span>
                            )}
                            {race.crewBonuses.energy && (
                                <span className="text-[10px] bg-[#9933ff20] text-[#9933ff] px-1 rounded">
                                    ⚡ -
                                    {Math.round(
                                        Math.abs(race.crewBonuses.energy) * 100,
                                    )}
                                    %
                                </span>
                            )}
                        </div>
                    </div>
                )}

            {/* Traits */}
            {crew.member.traits && crew.member.traits.length > 0 && (
                <div>
                    <span className="text-[#ffb000]">
                        {t("station.features")}
                    </span>
                    <div className="space-y-1 mt-1">
                        {crew.member.traits.map((trait, idx) => {
                            // Map Russian trait names to translation keys
                            const traitNameToKey: Record<string, string> = {
                                Мастер: "master",
                                Бунтарь: "rebel",
                                "Меткий стрелок": "sharpshooter",
                                Выносливый: "tough",
                                Трус: "coward",
                                Легенда: "legend",
                                "Быстрый ученик": "quick_learner",
                                "Отсутствие эмоций": "no_happiness",
                                "Сбой ИИ": "ai_glitch",
                                "Техно-симбиоз": "symbiosis",
                                "Беспокоящее присутствие":
                                    "disturbing_presence",
                                Устрашение: "intimidation",
                                "Пустотная защита": "void_shield",
                                Беспокойство: "unnerving",
                                "Эфирное тело": "low_health",
                                "Кристаллическая броня": "crystal_armor",
                                "Кристаллический резонанс": "resonance",
                                Хрупкость: "brittle_crystal",
                                Удачливый: "lucky",
                                Трудолюбивый: "hardworking",
                                Болезненный: "sickly",
                                Ветеран: "veteran",
                                Лидер: "leader",
                                Опытный: "experienced",
                                Специалист: "skilled",
                                Элита: "elite",
                                Гений: "genius",
                                Вундеркинд: "prodigy",
                                Талант: "natural",
                                Адаптированный: "adapted",
                                Сильный: "strong",
                                Слабый: "weak",
                                Быстрый: "fast",
                                Медленный: "slow",
                                Храбрый: "brave",
                                Боязливый: "fearful",
                                Оптимист: "optimist",
                                Пессимист: "pessimist",
                                Дружелюбный: "friendly",
                                Агрессивный: "aggressive",
                                Спокойный: "calm",
                                Нервный: "nervous",
                                Сосредоточенный: "focused",
                                Рассеянный: "distracted",
                                Эффективный: "efficient",
                                Расточительный: "wasteful",
                                "Рождённый под счастливой звездой":
                                    "lucky_star",
                                Проклятый: "cursed",
                            };
                            // Try to get translated trait name and description using mapping
                            const traitKey =
                                traitNameToKey[trait.name] ||
                                trait.name.toLowerCase().replace(/\s+/g, "_");
                            const translatedName =
                                t(`racial_traits.${traitKey}.name`) !==
                                `racial_traits.${traitKey}.name`
                                    ? t(`racial_traits.${traitKey}.name`)
                                    : trait.name;
                            const translatedDesc =
                                t(`racial_traits.${traitKey}.description`) !==
                                `racial_traits.${traitKey}.description`
                                    ? t(`racial_traits.${traitKey}.description`)
                                    : trait.desc;

                            return (
                                <div
                                    key={idx}
                                    className="text-xs"
                                    style={{
                                        color:
                                            trait.type === "positive"
                                                ? "#00ff41"
                                                : trait.type === "negative"
                                                  ? "#ff4444"
                                                  : "#ffb000",
                                    }}
                                >
                                    {trait.type === "positive"
                                        ? "✓"
                                        : trait.type === "negative"
                                          ? "✗"
                                          : "⚡"}{" "}
                                    {translatedName}: {translatedDesc}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-[#00ff41]">
                <Button
                    disabled={!canHire}
                    onClick={() => {
                        onHire(crew.member, crew.price, locationId);
                        onClose();
                    }}
                    className={`cursor-pointer bg-transparent border-2 uppercase text-xs flex-1 ${
                        canHire
                            ? "border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
                            : "border-[#444] text-[#444] cursor-not-allowed"
                    }`}
                >
                    {t("station.hire_button")}
                </Button>
                <Button
                    onClick={onClose}
                    className="cursor-pointer bg-transparent border-2 border-[#888] text-[#888] hover:bg-[#888] hover:text-[#050810] text-xs"
                >
                    {t("station.close")}
                </Button>
            </div>
        </div>
    );
}
