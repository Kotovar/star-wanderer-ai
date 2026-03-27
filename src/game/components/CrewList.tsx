"use client";

import { useState } from "react";
import { useGameStore } from "@/game/store";
import { RACES } from "@/game/constants/races";
import { AUGMENTATIONS } from "@/game/constants/augmentations";
import type { CrewMember } from "@/game/types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import {
    useTraitTranslation,
    TraitRow,
    getModuleName,
    getRegen,
    getAdjacentModules,
    CrewDamageReductionRow,
    CrewExpBonusRow,
} from "./CrewListHelpers";

export function CrewList() {
    const { t } = useTranslation();
    const translateTrait = useTraitTranslation(t);
    const crew = useGameStore((s) => s.crew);
    const modules = useGameStore((s) => s.ship.modules);
    const activeEffects = useGameStore((s) => s.activeEffects);
    const moveCrewMember = useGameStore((s) => s.moveCrewMember);
    const isModuleAdjacent = useGameStore((s) => s.isModuleAdjacent);
    const fireCrewMember = useGameStore((s) => s.fireCrewMember);
    const currentCombat = useGameStore((s) => s.currentCombat);
    const researchedTechs = useGameStore((s) => s.research.researchedTechs);
    const [selectedCrew, setSelectedCrew] = useState<CrewMember | null>(null);

    const getModuleNameById = (moduleId: number) =>
        getModuleName(modules, t, moduleId);
    const getCrewRegen = (member: CrewMember) =>
        getRegen(member, activeEffects, crew, modules);
    const getAdjacentToModule = (moduleId: number) =>
        getAdjacentModules(modules, isModuleAdjacent, moduleId);

    // Check if we're in combat
    const isCombat = !!currentCombat;

    return (
        <>
            <div className="grid grid-cols-2 gap-1.5">
                {crew.map((member) => {
                    const expNeeded = (member.level || 1) * 100;
                    const expPercent = Math.min(
                        100,
                        ((member.exp || 0) / expNeeded) * 100,
                    );
                    const healthPct =
                        (member.health / (member.maxHealth || 100)) * 100;
                    const currentAssignment = isCombat
                        ? member.combatAssignment
                        : member.assignment;
                    const race = RACES[member.race];
                    const hpColor =
                        member.health < 30
                            ? "bg-[#ff0040]"
                            : member.health < 60
                              ? "bg-[#ffb000]"
                              : "bg-[#00ff41]";

                    return (
                        <div
                            key={member.id}
                            className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-1.5 text-xs cursor-pointer transition-all hover:bg-[rgba(0,255,65,0.1)] hover:shadow-[0_0_8px_rgba(0,255,65,0.4)] flex flex-col gap-1"
                            onClick={() => setSelectedCrew(member)}
                        >
                            {/* Name row */}
                            <div className="flex items-center gap-1 min-w-0">
                                {race && (
                                    <span
                                        className="`shrink-0"
                                        style={{ color: race.color }}
                                    >
                                        {race.icon}
                                    </span>
                                )}
                                <span className="text-[#00d4ff] font-bold truncate leading-tight">
                                    {member.name}
                                </span>
                                {member.movedThisTurn && (
                                    <span className="text-[#ff0040] `shrink-0 text-[9px]">
                                        ●
                                    </span>
                                )}
                                {member.augmentation && (
                                    <span
                                        className="`shrink-0 text-[9px]"
                                        title={
                                            AUGMENTATIONS[member.augmentation]
                                                ?.name
                                        }
                                    >
                                        {AUGMENTATIONS[member.augmentation]
                                            ?.icon ?? "🔧"}
                                    </span>
                                )}
                            </div>

                            {/* Profession + level + assignment */}
                            <div className="text-[#ffb000] text-[10px] truncate leading-tight">
                                {t(`professions.${member.profession}`)}
                                {member.level ? ` LV${member.level}` : ""}
                                {currentAssignment && (
                                    <span className="text-[#555]">
                                        {" "}
                                        · {currentAssignment}
                                    </span>
                                )}
                            </div>

                            {/* HP bar */}
                            <div className="flex items-center gap-1">
                                <div className="flex-1 h-1 bg-[rgba(0,0,0,0.6)] rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${hpColor}`}
                                        style={{ width: `${healthPct}%` }}
                                    />
                                </div>
                                <span className="text-[#555] text-[9px] shrink-0 tabular-nums">
                                    ♥{member.health}
                                </span>
                            </div>

                            {/* Morale bar */}
                            {race?.hasHappiness !== false && (
                                <div className="flex items-center gap-1">
                                    <div className="flex-1 h-1 bg-[rgba(0,0,0,0.6)] rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${
                                                member.happiness < 30
                                                    ? "bg-[#ff0040]"
                                                    : member.happiness < 60
                                                      ? "bg-[#ffb000]"
                                                      : "bg-[#00ff41]"
                                            }`}
                                            style={{
                                                width: `${(member.happiness / (member.maxHappiness || 100)) * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-[#555] text-[9px] shrink-0 tabular-nums">
                                        ☺{member.happiness}
                                    </span>
                                </div>
                            )}

                            {/* EXP bar */}
                            <div className="flex items-center gap-1">
                                <div className="flex-1 h-0.5 bg-[rgba(0,0,0,0.6)] rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-[#00d4ff]"
                                        style={{ width: `${expPercent}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <Dialog
                open={!!selectedCrew}
                onOpenChange={() => setSelectedCrew(null)}
            >
                <DialogContent className="bg-[rgba(10,20,30,0.95)] border-2 border-[#00ff41] text-[#00ff41] max-w-md max-h-[90vh] overflow-y-auto w-[calc(100%-2rem)] md:w-auto">
                    <DialogHeader>
                        <DialogTitle className="text-[#ffb000] font-['Orbitron']">
                            ▸ {selectedCrew?.name}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {t("crew_member.info_title")}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedCrew &&
                        (() => {
                            const race = RACES[selectedCrew.race];
                            const currentModule = modules.find(
                                (m) => m.id === selectedCrew.moduleId,
                            );
                            const adjacentModules = getAdjacentToModule(
                                selectedCrew.moduleId,
                            );

                            return (
                                <div className="space-y-4 text-sm leading-relaxed">
                                    {race && (
                                        <div
                                            className="flex items-center gap-2 p-2 rounded border"
                                            style={{
                                                borderColor: race.color,
                                                backgroundColor: `${race.color}10`,
                                            }}
                                        >
                                            <span className="text-2xl">
                                                {race.icon}
                                            </span>
                                            <div>
                                                <div
                                                    className="font-bold"
                                                    style={{
                                                        color: race.color,
                                                    }}
                                                >
                                                    {t(
                                                        `races.${selectedCrew.race}.name`,
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {t(
                                                        `races.${selectedCrew.race}.description`,
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-[#ffb000]">
                                            {t(
                                                "crew_member.current_module",
                                            )}{" "}
                                        </span>
                                        <span className="text-[#00d4ff]">
                                            {currentModule
                                                ? getModuleNameById(
                                                      currentModule.id,
                                                  )
                                                : t("crew_member.unknown")}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[#ffb000]">
                                            {t("crew_member.profession")}{" "}
                                        </span>
                                        {t(
                                            `professions.${selectedCrew.profession}`,
                                        )}
                                        {selectedCrew.level
                                            ? ` [${t("crew_member.level_short")}${selectedCrew.level}]`
                                            : ""}
                                    </div>
                                    <div>
                                        <span className="text-[#ffb000]">
                                            {t("crew_member.experience")}{" "}
                                        </span>
                                        {selectedCrew.exp}/
                                        {(selectedCrew.level || 1) * 100}
                                        <Progress
                                            value={Math.min(
                                                100,
                                                ((selectedCrew.exp || 0) /
                                                    ((selectedCrew.level || 1) *
                                                        100)) *
                                                    100,
                                            )}
                                            className="h-2 mt-1 bg-[rgba(0,0,0,0.5)] [&>div]:bg-[#00d4ff]"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[#ffb000]">
                                            {t("crew_member.health")}{" "}
                                        </span>
                                        {selectedCrew.health}/
                                        {selectedCrew.maxHealth || 100}
                                        <Progress
                                            value={
                                                (selectedCrew.health /
                                                    (selectedCrew.maxHealth ||
                                                        100)) *
                                                100
                                            }
                                            className={`h-2 mt-1 bg-[rgba(0,0,0,0.5)] ${selectedCrew.health < 30 ? "[&>div]:bg-[#ff0040]" : selectedCrew.health < 60 ? "[&>div]:bg-[#ffb000]" : "[&>div]:bg-[#00ff41]"}`}
                                        />
                                    </div>
                                    <div className="text-[10px] text-[#00ff41]">
                                        {t("crew_member.regen_short")}
                                        {getCrewRegen(selectedCrew)}/
                                        {t("crew.turn")}
                                    </div>
                                    <CrewDamageReductionRow
                                        member={selectedCrew}
                                        researchedTechs={researchedTechs}
                                        t={t}
                                    />
                                    <CrewExpBonusRow
                                        member={selectedCrew}
                                        researchedTechs={researchedTechs}
                                        t={t}
                                    />
                                    {race?.hasHappiness ? (
                                        <div>
                                            <span className="text-[#ffb000]">
                                                {t("crew_member.mood")}{" "}
                                            </span>
                                            {selectedCrew.happiness}/
                                            {selectedCrew.maxHappiness || 100}
                                            <Progress
                                                value={
                                                    (selectedCrew.happiness /
                                                        (selectedCrew.maxHappiness ||
                                                            100)) *
                                                    100
                                                }
                                                className={`h-2 mt-1 bg-[rgba(0,0,0,0.5)] ${selectedCrew.happiness < 30 ? "[&>div]:bg-[#ff0040]" : selectedCrew.happiness < 60 ? "[&>div]:bg-[#ffb000]" : "[&>div]:bg-[#00ff41]"}`}
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-[#00d4ff] text-xs">
                                            {t("crew_member.immune_morale")}
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-[#ffb000]">
                                            {t("crew_member.assignment")}{" "}
                                        </span>
                                        {isCombat
                                            ? selectedCrew.combatAssignment
                                                ? `[${selectedCrew.combatAssignment.toUpperCase()}]`
                                                : t("crew_member.waiting_short")
                                            : selectedCrew.assignment
                                              ? `[${selectedCrew.assignment.toUpperCase()}]`
                                              : t("crew_member.waiting_short")}
                                    </div>

                                    {/* Module movement section */}
                                    <div className="border-t border-[#00ff41] pt-4">
                                        <div className="text-[#ffb000] mb-2">
                                            {t("crew_member.movement")}
                                        </div>
                                        {selectedCrew.movedThisTurn ? (
                                            <div className="text-[#ff0040] text-xs">
                                                {t("crew_member.moved_already")}
                                            </div>
                                        ) : adjacentModules.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {/* Number modules by type for easier identification */}
                                                {(() => {
                                                    const modulesWithTypeIndex =
                                                        adjacentModules.map(
                                                            (mod, index) => {
                                                                const sameTypeBefore =
                                                                    adjacentModules
                                                                        .slice(
                                                                            0,
                                                                            index,
                                                                        )
                                                                        .filter(
                                                                            (
                                                                                m,
                                                                            ) =>
                                                                                m.type ===
                                                                                mod.type,
                                                                        ).length;
                                                                return {
                                                                    module: mod,
                                                                    typeIndex:
                                                                        sameTypeBefore +
                                                                        1,
                                                                };
                                                            },
                                                        );
                                                    return modulesWithTypeIndex.map(
                                                        ({
                                                            module,
                                                            typeIndex,
                                                        }) => (
                                                            <Button
                                                                key={module.id}
                                                                onClick={() => {
                                                                    moveCrewMember(
                                                                        selectedCrew.id,
                                                                        module.id,
                                                                    );
                                                                    setSelectedCrew(
                                                                        null,
                                                                    );
                                                                }}
                                                                className="cursor-pointer bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] text-xs py-1 px-2 h-auto"
                                                            >
                                                                →{" "}
                                                                {getModuleNameById(
                                                                    module.id,
                                                                )}{" "}
                                                                #{typeIndex} (
                                                                {module.x},
                                                                {module.y})
                                                            </Button>
                                                        ),
                                                    );
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="text-[#888] text-xs">
                                                {t("crew_member.no_adjacent")}
                                            </div>
                                        )}
                                    </div>

                                    {race && (
                                        <div>
                                            <span className="text-[#ffb000]">
                                                {t(
                                                    "crew_member.racial_bonuses",
                                                )}
                                            </span>
                                            {/* crewBonuses */}
                                            {race.crewBonuses &&
                                                Object.keys(race.crewBonuses)
                                                    .length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {race.crewBonuses
                                                            .happiness && (
                                                            <span className="text-xs bg-[#00ff4120] text-[#00ff41] px-1 rounded">
                                                                😊 +
                                                                {
                                                                    race
                                                                        .crewBonuses
                                                                        .happiness
                                                                }
                                                                {t(
                                                                    "crew_member.bonus_mood",
                                                                )}
                                                            </span>
                                                        )}
                                                        {race.crewBonuses
                                                            .repair && (
                                                            <span className="text-xs bg-[#ffb00020] text-[#ffb000] px-1 rounded">
                                                                🔧 +
                                                                {Math.round(
                                                                    race
                                                                        .crewBonuses
                                                                        .repair *
                                                                        100,
                                                                )}
                                                                {t(
                                                                    "crew_member.bonus_repair",
                                                                )}
                                                            </span>
                                                        )}
                                                        {race.crewBonuses
                                                            .science && (
                                                            <span className="text-xs bg-[#00d4ff20] text-[#00d4ff] px-1 rounded">
                                                                🔬 +
                                                                {Math.round(
                                                                    race
                                                                        .crewBonuses
                                                                        .science *
                                                                        100,
                                                                )}
                                                                {t(
                                                                    "crew_member.bonus_science",
                                                                )}
                                                            </span>
                                                        )}
                                                        {race.crewBonuses
                                                            .combat && (
                                                            <span className="text-xs bg-[#ff004020] text-[#ff0040] px-1 rounded">
                                                                ⚔️ +
                                                                {Math.round(
                                                                    race
                                                                        .crewBonuses
                                                                        .combat *
                                                                        100,
                                                                )}
                                                                {t(
                                                                    "crew_member.bonus_combat",
                                                                )}
                                                            </span>
                                                        )}
                                                        {race.crewBonuses
                                                            .health && (
                                                            <span className="text-xs bg-[#00ff4120] text-[#00ff41] px-1 rounded">
                                                                ❤️ +
                                                                {
                                                                    race
                                                                        .crewBonuses
                                                                        .health
                                                                }
                                                                {t(
                                                                    "crew_member.bonus_hp_turn",
                                                                )}
                                                            </span>
                                                        )}
                                                        {race.crewBonuses
                                                            .energy && (
                                                            <span className="text-xs bg-[#9933ff20] text-[#9933ff] px-1 rounded">
                                                                ⚡ -
                                                                {Math.round(
                                                                    Math.abs(
                                                                        race
                                                                            .crewBonuses
                                                                            .energy,
                                                                    ) * 100,
                                                                )}
                                                                {t(
                                                                    "crew_member.bonus_energy",
                                                                )}
                                                            </span>
                                                        )}
                                                        {race.crewBonuses
                                                            .adaptation && (
                                                            <span className="text-xs bg-[#00ff4120] text-[#00ff41] px-1 rounded">
                                                                🌍 +
                                                                {Math.round(
                                                                    race
                                                                        .crewBonuses
                                                                        .adaptation *
                                                                        100,
                                                                )}
                                                                {t(
                                                                    "crew_member.bonus_adaptation",
                                                                )}
                                                            </span>
                                                        )}
                                                        {race.crewBonuses
                                                            .fuelEfficiency && (
                                                            <span className="text-xs bg-[#9933ff20] text-[#9933ff] px-1 rounded">
                                                                ⛽ -
                                                                {Math.round(
                                                                    race
                                                                        .crewBonuses
                                                                        .fuelEfficiency *
                                                                        100,
                                                                )}
                                                                {t(
                                                                    "crew_member.bonus_fuel",
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            {/* specialTraits */}
                                            {race.specialTraits &&
                                                race.specialTraits.length >
                                                    0 && (
                                                    <div className="mt-1.5 space-y-1">
                                                        {race.specialTraits.map(
                                                            (trait) => {
                                                                const {
                                                                    name,
                                                                    desc,
                                                                } =
                                                                    translateTrait(
                                                                        trait.id,
                                                                        trait.name,
                                                                        trait.description,
                                                                    );
                                                                return (
                                                                    <TraitRow
                                                                        key={
                                                                            trait.id
                                                                        }
                                                                        itemKey={
                                                                            trait.id
                                                                        }
                                                                        name={
                                                                            name
                                                                        }
                                                                        desc={
                                                                            desc
                                                                        }
                                                                        type={
                                                                            trait.type
                                                                        }
                                                                        bold
                                                                    />
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                )}
                                        </div>
                                    )}
                                    {selectedCrew.traits &&
                                        selectedCrew.traits.length > 0 && (
                                            <div>
                                                <span className="text-[#ffb000]">
                                                    {t("crew_member.traits")}
                                                </span>
                                                <br />
                                                {selectedCrew.traits.map(
                                                    (trait, idx) => {
                                                        const { name, desc } =
                                                            translateTrait(
                                                                trait.id ?? "",
                                                                trait.name,
                                                                trait.desc,
                                                            );
                                                        return (
                                                            <TraitRow
                                                                key={`${selectedCrew.id}-trait-${idx}-${trait.type}`}
                                                                itemKey={`${selectedCrew.id}-trait-${idx}`}
                                                                name={name}
                                                                desc={desc}
                                                                type={
                                                                    trait.type
                                                                }
                                                            />
                                                        );
                                                    },
                                                )}
                                            </div>
                                        )}

                                    {selectedCrew.augmentation &&
                                        (() => {
                                            const aug =
                                                AUGMENTATIONS[
                                                    selectedCrew.augmentation
                                                ];
                                            return aug ? (
                                                <div className="p-2 border border-[#9933ff55] bg-[rgba(153,51,255,0.05)] rounded">
                                                    <div className="text-[#ffb000] text-xs mb-1">
                                                        {t(
                                                            "crew_member.augmentation",
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">
                                                            {aug.icon}
                                                        </span>
                                                        <div>
                                                            <div className="font-bold text-[#9933ff] text-xs">
                                                                {aug.name}
                                                            </div>
                                                            <div className="text-[#888] text-[10px]">
                                                                {
                                                                    aug.description
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null;
                                        })()}

                                    <div>
                                        <span className="text-[#ffb000]">
                                            {t("crew_member.features")}
                                        </span>
                                        <br />
                                        {t(
                                            `profession_descriptions.${selectedCrew.profession}`,
                                        )}
                                    </div>

                                    {/* Fire crew button */}
                                    <div className="border-t border-[#ff0040] pt-4 mt-4">
                                        <Button
                                            onClick={() => {
                                                fireCrewMember(selectedCrew.id);
                                                setSelectedCrew(null);
                                            }}
                                            disabled={crew.length <= 1}
                                            className="cursor-pointer bg-transparent border-2 border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810] uppercase tracking-wider w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {t("crew_member.fire")}
                                        </Button>
                                        {crew.length <= 1 && (
                                            <div className="text-xs text-[#888] text-center mt-1">
                                                {t("crew_member.fire_warning")}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                </DialogContent>
            </Dialog>
        </>
    );
}
