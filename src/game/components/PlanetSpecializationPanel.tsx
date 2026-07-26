"use client";

import { useState } from "react";
import { useGameStore } from "@/game/store";
import { PLANET_SPECIALIZATIONS } from "@/game/constants/planets";
import { RACES } from "@/game/constants/races";
import { Button } from "@/components/ui/button";
import { SectionPanel } from "./SectionPanel";
import { createVoidbornBoostEffect } from "@/game/slices/artifacts/helpers";
import {
    ACADEMY_RETRAIN_COST,
    getAcademyRetrainingCooldownKey,
} from "@/game/slices/planetEffects/helpers/retrainCrew";
import type { Profession } from "@/game/types";
import { useTranslation } from "@/lib/useTranslation";

interface PlanetSpecializationPanelProps {
    onClose: () => void;
}

const ACADEMY_PROFESSIONS: Profession[] = [
    "pilot",
    "engineer",
    "medic",
    "scout",
    "scientist",
    "gunner",
];

export function PlanetSpecializationPanel({
    onClose,
}: PlanetSpecializationPanelProps) {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const credits = useGameStore((s) => s.credits);
    const crew = useGameStore((s) => s.crew);
    const artifacts = useGameStore((s) => s.artifacts);
    const researchedTechs = useGameStore((s) => s.research.researchedTechs);

    const trainCrew = useGameStore((s) => s.trainCrew);
    const retrainCrew = useGameStore((s) => s.retrainCrew);
    const scanSector = useGameStore((s) => s.scanSector);
    const boostArtifact = useGameStore((s) => s.boostArtifact);
    const activatePlanetEffect = useGameStore((s) => s.activatePlanetEffect);
    const planetCooldowns = useGameStore((s) => s.planetCooldowns);

    const [selectedCrewId, setSelectedCrewId] = useState<number | null>(null);
    const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
        null,
    );
    const [academyAction, setAcademyAction] = useState<"train" | "retrain">(
        "train",
    );
    const [selectedProfession, setSelectedProfession] =
        useState<Profession | null>(null);
    const { t } = useTranslation();
    if (!currentLocation || !currentLocation.dominantRace) return null;

    const race = RACES[currentLocation.dominantRace];
    const spec = PLANET_SPECIALIZATIONS[currentLocation.dominantRace];

    if (!spec) return null;

    const isRetraining =
        spec.id === "human_academy" && academyAction === "retrain";
    const academyRetrainingUsed = Boolean(
        currentLocation.id &&
            planetCooldowns[
                getAcademyRetrainingCooldownKey(currentLocation.id)
            ],
    );
    const isOnCooldown =
        spec.id === "human_academy"
            ? isRetraining && academyRetrainingUsed
            : !!(currentLocation.id && planetCooldowns[currentLocation.id]);
    const selectedCrew = crew.find((member) => member.id === selectedCrewId);

    // Calculate actual cost for human academy based on selected crew level
    const actualCost =
        isRetraining
            ? ACADEMY_RETRAIN_COST
            : spec.id === "human_academy" && selectedCrewId !== null
            ? (() => {
                  const level = selectedCrew?.level || 1;
                  return level >= 3 ? 999999 : level === 2 ? 1500 : 500;
              })()
            : spec.cost;

    const canAfford = credits >= actualCost;
    const needsCrewSelection =
        spec.id === "human_academy" && selectedCrewId === null;
    const needsProfessionSelection = isRetraining && selectedProfession === null;

    const isMaxLevelReached = !isRetraining && spec.requirements?.maxLevel
        ? (selectedCrew?.level || 1) >= spec.requirements.maxLevel
        : false;

    const handleConfirm = () => {
        if (
            !canAfford ||
            isOnCooldown ||
            isMaxLevelReached ||
            needsCrewSelection ||
            needsProfessionSelection
        )
            return;

        const planetId = currentLocation.id;
        const raceId = currentLocation.dominantRace;

        if (!raceId) return;

        // Set cooldown (skip for human_academy — unlimited uses)
        if (spec.id !== "human_academy") {
            useGameStore.setState((s) => ({
                planetCooldowns: { ...s.planetCooldowns, [planetId]: 999 },
            }));
        }

        // Handle special cases that need selection
        if (spec.id === "human_academy") {
            if (isRetraining && selectedCrewId !== null && selectedProfession) {
                retrainCrew(selectedCrewId, selectedProfession);
            } else if (selectedCrewId !== null) {
                trainCrew(selectedCrewId);
            }
        } else if (spec.id === "synthetic_archives") {
            scanSector();
        } else if (spec.id === "voidborn_ritual") {
            // Deduct credits
            useGameStore.setState((s) => ({
                credits: s.credits - spec.cost,
            }));

            // Always create fuel efficiency effect
            createVoidbornBoostEffect(
                selectedArtifactId ?? undefined,
                raceId,
                spec,
                useGameStore.setState,
                useGameStore.getState,
            );
            // If artifact selected, also boost it
            if (selectedArtifactId) {
                boostArtifact(selectedArtifactId);
            }
        } else {
            // For other specializations, use activatePlanetEffect
            activatePlanetEffect(raceId, planetId);
        }

        onClose();
    };

    return (
        <div className="flex flex-col gap-4">
            <div
                className="flex items-center gap-3 p-3 rounded border"
                style={{
                    borderColor: race.color,
                    backgroundColor: `${race.color}15`,
                }}
            >
                <span className="text-3xl">{spec.icon}</span>
                <div>
                    <div
                        className="font-['Orbitron'] font-bold text-lg"
                        style={{ color: race.color }}
                    >
                        {spec.name}
                    </div>
                    <div className="text-xs text-[#888]">
                        {race.pluralName} • {currentLocation.name}
                    </div>
                </div>
            </div>

            <div className="text-sm text-[#888] leading-relaxed">
                {spec.description}
            </div>

            {/* Effects */}
            <SectionPanel padding="sm">
                <div className="text-accent font-bold text-sm mb-2">
                    Эффекты:
                </div>
                <ul className="text-xs text-[#888] space-y-1">
                    {spec.effects.map((effect, idx) => (
                        <li key={idx} className="text-[#00ff41]">
                            ✓ {effect.description}
                        </li>
                    ))}
                </ul>
            </SectionPanel>

            {/* Cost and duration */}
            <div className="flex gap-4 text-sm">
                <div className="text-accent">
                    💰 Стоимость:{" "}
                    <span
                        className={
                            canAfford ? "text-[#00ff41]" : "text-destructive"
                        }
                    >
                        {spec.id === "human_academy" &&
                        (selectedCrewId !== null || isRetraining)
                            ? actualCost
                            : spec.cost}
                    </span>{" "}
                    ₢
                </div>
                {spec.duration > 0 && (
                    <div className="text-[#00ff41]">
                        ⏱️ Длительность: {spec.duration} ходов
                    </div>
                )}
            </div>

            {/* Selection UI for specializations that need it */}
            {spec.id === "human_academy" && (
                <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                        <Button
                            onClick={() => {
                                setAcademyAction("train");
                                setSelectedProfession(null);
                            }}
                            variant="outline"
                            className={`cursor-pointer flex-1 text-xs ${
                                !isRetraining
                                    ? "border-[#00ff41] text-[#00ff41]"
                                    : "border-[#444] text-[#888]"
                            }`}
                        >
                            {t("planet_specializations.human_academy.training_mode")}
                        </Button>
                        <Button
                            onClick={() => {
                                setAcademyAction("retrain");
                                setSelectedProfession(null);
                            }}
                            disabled={!researchedTechs.includes("crew_training")}
                            variant="outline"
                            className={`cursor-pointer flex-1 text-xs ${
                                isRetraining
                                    ? "border-[#00d4ff] text-[#00d4ff]"
                                    : "border-[#444] text-[#888]"
                            }`}
                        >
                            {t("planet_specializations.human_academy.retraining_mode")}
                        </Button>
                    </div>
                    {!researchedTechs.includes("crew_training") && (
                        <div className="text-xs text-[#888]">
                            {t("planet_specializations.human_academy.retraining_locked")}
                        </div>
                    )}
                    <div className="text-xs text-[#888]">
                        {t(
                            isRetraining
                                ? "planet_specializations.human_academy.retraining_select_crew"
                                : "planet_specializations.human_academy.training_select_crew",
                        )}
                    </div>
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                        {crew.map((member) => {
                            const memberRace = RACES[member.race];
                            const isMaxLevel = !isRetraining &&
                                (member.level || 1) >=
                                (spec.requirements?.maxLevel ?? 999);
                            return (
                                <button
                                    key={member.id}
                                    onClick={() => setSelectedCrewId(member.id)}
                                    className={`cursor-pointer flex items-center gap-2 p-2 rounded border text-left transition-colors ${
                                        selectedCrewId === member.id
                                            ? "border-[#00ff41] bg-[rgba(0,255,65,0.1)]"
                                            : "border-[#444] hover:border-[#666]"
                                    } ${isMaxLevel ? "opacity-50" : ""}`}
                                    style={{
                                        borderColor: isMaxLevel
                                            ? "#ff0040"
                                            : undefined,
                                    }}
                                    disabled={isMaxLevel}
                                >
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{
                                            backgroundColor: memberRace?.color,
                                        }}
                                    />
                                    <div className="flex-1 text-xs">
                                        <div className="text-[#00ff41]">
                                            {member.name}
                                        </div>
                                        <div className="text-[#888]">
                                            {t(
                                                `professions.${member.profession}`,
                                            )}{" "}
                                            • ур. {member.level || 1}
                                        </div>
                                    </div>
                                    {isMaxLevel && (
                                        <div className="text-[10px] text-destructive">
                                            МАКС.
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                    {isRetraining && selectedCrew && (
                        <>
                            <div className="text-xs text-[#888]">
                                {t(
                                    "planet_specializations.human_academy.retraining_select_profession",
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-1">
                                {ACADEMY_PROFESSIONS.filter(
                                    (profession) =>
                                        profession !== selectedCrew.profession,
                                ).map((profession) => (
                                    <Button
                                        key={profession}
                                        onClick={() =>
                                            setSelectedProfession(profession)
                                        }
                                        variant="outline"
                                        className={`cursor-pointer text-xs ${
                                            selectedProfession === profession
                                                ? "border-[#00d4ff] bg-[rgba(0,212,255,0.1)] text-[#00d4ff]"
                                                : "border-[#444] text-[#888]"
                                        }`}
                                    >
                                        {t(`professions.${profession}`)}
                                    </Button>
                                ))}
                            </div>
                        </>
                    )}
                    {isRetraining && academyRetrainingUsed && (
                        <div className="text-xs text-[#ffb000]">
                            {t("planet_specializations.human_academy.retraining_used")}
                        </div>
                    )}
                </div>
            )}

            {spec.id === "voidborn_ritual" && artifacts.length > 0 && (
                <div className="flex flex-col gap-2">
                    <div className="text-xs text-[#888]">
                        {t(
                            "planet_specializations.voidborn_ritual.voidborn_artifact_selection",
                        )}
                    </div>
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                        <button
                            onClick={() => setSelectedArtifactId(null)}
                            className={`flex items-center gap-2 p-2 rounded border text-left transition-colors ${
                                selectedArtifactId === null
                                    ? "border-[#00ff41] bg-[rgba(0,255,65,0.1)]"
                                    : "border-[#444] hover:border-[#666]"
                            }`}
                        >
                            <div className="cursor-pointer flex-1 text-xs text-[#888]">
                                Без артефакта (только топливо)
                            </div>
                        </button>
                        {artifacts
                            .filter((a) => a.discovered && a.effect.active && a.canBoost !== false)
                            .map((artifact) => (
                                <button
                                    key={artifact.id}
                                    onClick={() =>
                                        setSelectedArtifactId(artifact.id)
                                    }
                                    className={`cursor-pointer flex items-center gap-2 p-2 rounded border text-left transition-colors ${
                                        selectedArtifactId === artifact.id
                                            ? "border-[#00ff41] bg-[rgba(0,255,65,0.1)]"
                                            : "border-[#444] hover:border-[#666]"
                                    }`}
                                >
                                    <div className="text-xl">
                                        {artifact.cursed ? "☠️" : "✨"}
                                    </div>
                                    <div className="flex-1 text-xs">
                                        <div className="text-[#00ff41]">
                                            {artifact.name}
                                        </div>
                                        <div className="text-[#888]">
                                            {artifact.description}
                                        </div>
                                    </div>
                                </button>
                            ))}
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
                <Button
                    onClick={handleConfirm}
                    disabled={
                        !canAfford ||
                        isOnCooldown ||
                        isMaxLevelReached ||
                        needsCrewSelection ||
                        needsProfessionSelection
                    }
                    className="cursor-pointer flex-1 bg-[#00ff41] text-black hover:bg-[#00cc33]"
                >
                    {isOnCooldown
                        ? "ИСПОЛЬЗОВАНО"
                        : isMaxLevelReached
                          ? "МАКС. УРОВЕНЬ"
                          : !canAfford
                            ? "НЕДОСТАТОЧНО СРЕДСТВ"
                            : isRetraining
                              ? t("planet_specializations.human_academy.retraining_button")
                              : "Подтвердить"}
                </Button>
                <Button
                    onClick={onClose}
                    variant="outline"
                    className="border-[#444] text-[#888] hover:border-[#666] cursor-pointer"
                >
                    Отмена
                </Button>
            </div>
        </div>
    );
}
