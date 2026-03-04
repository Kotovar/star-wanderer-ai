"use client";

import { useState } from "react";
import { useGameStore } from "@/game/store";
import { PLANET_SPECIALIZATIONS } from "@/game/constants/planets";
import { RACES } from "@/game/constants/races";
import { Button } from "@/components/ui/button";

interface PlanetSpecializationPanelProps {
    onClose: () => void;
}

export function PlanetSpecializationPanel({
    onClose,
}: PlanetSpecializationPanelProps) {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const credits = useGameStore((s) => s.credits);
    const crew = useGameStore((s) => s.crew);
    const artifacts = useGameStore((s) => s.artifacts);

    const trainCrew = useGameStore((s) => s.trainCrew);
    const scanSector = useGameStore((s) => s.scanSector);
    const boostArtifact = useGameStore((s) => s.boostArtifact);
    const activatePlanetEffect = useGameStore((s) => s.activatePlanetEffect);
    const planetCooldowns = useGameStore((s) => s.planetCooldowns);

    const [selectedCrewId, setSelectedCrewId] = useState<number | null>(null);
    const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(
        null,
    );

    if (!currentLocation || !currentLocation.dominantRace) return null;

    const race = RACES[currentLocation.dominantRace];
    const spec = PLANET_SPECIALIZATIONS[currentLocation.dominantRace];

    if (!spec) return null;

    const isOnCooldown = !!(
        currentLocation.id && planetCooldowns[currentLocation.id]
    );

    // Calculate actual cost for human academy based on selected crew level
    const actualCost =
        spec.id === "human_academy" && selectedCrewId
            ? (() => {
                  const member = crew.find((c) => c.id === selectedCrewId);
                  const level = member?.level || 1;
                  return level >= 3 ? 999999 : level === 2 ? 1500 : 500;
              })()
            : spec.cost;

    const canAfford = credits >= actualCost;

    // Check maxLevel requirement for human academy
    const isMaxLevelReached =
        spec.id === "human_academy" &&
        selectedCrewId &&
        spec.requirements?.maxLevel
            ? (crew.find((c) => c.id === selectedCrewId)?.level || 1) >=
              spec.requirements.maxLevel
            : false;

    const handleConfirm = () => {
        if (!canAfford || isOnCooldown || isMaxLevelReached) return;

        const planetId = currentLocation.id;
        const raceId = currentLocation.dominantRace;

        if (!raceId) return;

        // Set cooldown first using Zustand's set directly
        useGameStore.setState((s) => ({
            planetCooldowns: { ...s.planetCooldowns, [planetId]: 999 },
        }));

        // Handle special cases that need selection
        if (spec.id === "human_academy") {
            if (selectedCrewId) {
                trainCrew(selectedCrewId);
            }
        } else if (spec.id === "synthetic_archives") {
            scanSector();
        } else if (spec.id === "voidborn_ritual") {
            if (selectedArtifactId) {
                boostArtifact(selectedArtifactId);
            }
            // Add fuel efficiency and artifact_boost effects
            useGameStore.setState((s) => ({
                activeEffects: [
                    ...s.activeEffects,
                    {
                        id: `effect-${raceId}-${Date.now()}`,
                        name: spec.name,
                        description: spec.description,
                        raceId,
                        turnsRemaining: 5,
                        effects: [
                            { type: "fuel_efficiency", value: 0.1 },
                            { type: "artifact_boost", value: 0.5 },
                        ],
                        targetArtifactId: selectedArtifactId || undefined,
                    },
                ],
            }));
            // Update ship stats immediately to reflect artifact boost
            useGameStore.getState().updateShipStats();
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
            <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-3">
                <div className="text-[#ffb000] font-bold text-sm mb-2">
                    Эффекты:
                </div>
                <ul className="text-xs text-[#888] space-y-1">
                    {spec.effects.map((effect, idx) => (
                        <li key={idx} className="text-[#00ff41]">
                            ✓ {effect.description}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Cost and duration */}
            <div className="flex gap-4 text-sm">
                <div className="text-[#ffb000]">
                    💰 Стоимость:{" "}
                    <span
                        className={
                            canAfford ? "text-[#00ff41]" : "text-[#ff0040]"
                        }
                    >
                        {spec.id === "human_academy" && selectedCrewId
                            ? (() => {
                                  const selectedMember = crew.find(
                                      (c) => c.id === selectedCrewId,
                                  );
                                  const level = selectedMember?.level || 1;
                                  return level >= 3
                                      ? "Макс. ур."
                                      : level === 2
                                        ? "1500₢"
                                        : "500₢";
                              })()
                            : `${spec.cost}₢`}
                    </span>
                </div>
                <div className="text-[#ffb000]">
                    ⏱️ Длительность:{" "}
                    <span className="text-[#00ff41]">
                        {spec.duration === 0
                            ? "Постоянно"
                            : `${spec.duration} ход(а)`}
                    </span>
                </div>
            </div>

            {/* Selection for crew training */}
            {spec.id === "human_academy" && (
                <div className="mt-2">
                    <div className="text-[#ffb000] font-bold text-sm mb-2">
                        Выберите члена экипажа для обучения:
                    </div>
                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                        {crew.map((member) => (
                            <div
                                key={member.id}
                                className={`p-2 border cursor-pointer text-xs ${
                                    selectedCrewId === member.id
                                        ? "border-[#00ff41] bg-[rgba(0,255,65,0.1)]"
                                        : "border-[#444] bg-[rgba(0,0,0,0.3)]"
                                }`}
                                onClick={() => setSelectedCrewId(member.id)}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-[#00d4ff]">
                                        {member.name}
                                    </span>
                                    <span className="text-[#ffb000]">
                                        Ур.{member.level}{" "}
                                        {member.profession === "pilot"
                                            ? "👤"
                                            : member.profession === "engineer"
                                              ? "⚡"
                                              : member.profession ===
                                                  "scientist"
                                                ? "🔬"
                                                : member.profession === "scout"
                                                  ? "🗺️"
                                                  : "⚔️"}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Selection for artifact boost */}
            {spec.id === "voidborn_ritual" && (
                <div className="mt-2">
                    <div className="text-[#ffb000] font-bold text-sm mb-2">
                        Выберите артефакт для усиления:
                    </div>
                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                        {artifacts
                            .filter(
                                (a) => a.effect.active && a.canBoost !== false,
                            )
                            .map((artifact) => (
                                <div
                                    key={artifact.id}
                                    className={`p-2 border cursor-pointer text-xs ${
                                        selectedArtifactId === artifact.id
                                            ? "border-[#9933ff] bg-[rgba(153,51,255,0.1)]"
                                            : "border-[#444] bg-[rgba(0,0,0,0.3)]"
                                    }`}
                                    onClick={() =>
                                        setSelectedArtifactId(artifact.id)
                                    }
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-[#00d4ff]">
                                            {artifact.name}
                                        </span>
                                        <span className="text-[#9933ff]">
                                            ✨ Активен
                                        </span>
                                    </div>
                                </div>
                            ))}
                        {artifacts.filter(
                            (a) => a.effect.active && a.canBoost !== false,
                        ).length === 0 && (
                            <div className="text-[#ff0040] text-xs p-2">
                                Нет активных артефактов для усиления
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2.5 flex-wrap mt-4">
                <Button
                    onClick={handleConfirm}
                    disabled={
                        !canAfford ||
                        isOnCooldown ||
                        isMaxLevelReached ||
                        (spec.id === "human_academy" && !selectedCrewId) ||
                        (spec.id === "voidborn_ritual" &&
                            artifacts.filter((a) => a.effect.active).length >
                                0 &&
                            !selectedArtifactId)
                    }
                    className="cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider flex-1"
                >
                    ПОДТВЕРДИТЬ
                </Button>
                <Button
                    onClick={onClose}
                    className="cursor-pointer bg-transparent border-2 border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810] uppercase tracking-wider"
                >
                    ОТМЕНА
                </Button>
            </div>

            {!canAfford && (
                <div className="text-[#ff0040] text-xs text-center mt-2">
                    ⚠ Недостаточно кредитов
                </div>
            )}
            {isOnCooldown && (
                <div className="text-[#ff0040] text-xs text-center mt-2">
                    ⏱️ Уже использовано на этой планете
                </div>
            )}
            {isMaxLevelReached && (
                <div className="text-[#ff0040] text-xs text-center mt-2">
                    ⚠ Достигнут максимальный уровень обучения
                </div>
            )}
        </div>
    );
}
