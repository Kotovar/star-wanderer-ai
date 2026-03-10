"use client";

import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { PROFESSION_NAMES } from "@/game/constants/crew";
import type {
    CrewMember,
    CrewMemberCombatAssignment,
    Module,
    ModuleType,
    Profession,
} from "@/game/types";
import { COMBAT_ACTIONS } from "@/game/constants/crew";
import { useTranslation } from "@/lib/useTranslation";

interface CrewMemberCardProps {
    crewMember: CrewMember;
    module: Module | undefined;
    adjacentModules: Module[];
    isSelected: boolean;
    onSelect: (crewMember: CrewMember | null) => void;
    onMove: (_crewMemberId: number, _moduleId: number) => void;
    onAssignTask: (
        _crewMemberId: number,
        task: CrewMemberCombatAssignment,
        _effect: string | null,
    ) => void;
    isCombat?: boolean;
}

export function CrewMemberCard({
    crewMember,
    module,
    adjacentModules,
    isSelected,
    onSelect,
    onMove,
    onAssignTask,
    isCombat = false,
}: CrewMemberCardProps) {
    const { t } = useTranslation();
    // Use combat actions during battle, civilian actions otherwise
    const actions = COMBAT_ACTIONS[crewMember.profession] || [
        { value: "", label: t("crew_member.waiting"), effect: null },
    ];

    // Get current assignment based on combat state
    const currentAssignment = isCombat
        ? crewMember.combatAssignment
        : crewMember.assignment;

    return (
        <div
            className={`bg-[rgba(0,255,65,0.05)] border p-2 text-[10px] ${
                isSelected
                    ? "border-[#ffb000] bg-[rgba(255,176,0,0.08)]"
                    : "border-[#00ff41]"
            }`}
            onClick={() => onSelect(isSelected ? null : crewMember)}
        >
            <div className="flex items-center gap-2 cursor-pointer">
                <span className="text-[#00d4ff] font-bold min-w-20">
                    {crewMember.name}
                </span>
                <span className="text-[#ffb000] ">
                    {PROFESSION_NAMES[crewMember.profession]}
                </span>
                <span className="text-[#888] flex-1">
                    📍 {module?.name || "???"}
                </span>
                {crewMember.movedThisTurn && (
                    <span className="text-[#ff0040] px-1 border border-[#ff0040] text-[9px]">
                        {t("crew_member.moved")}
                    </span>
                )}
            </div>

            {isSelected && (
                <div className="mt-2 ml-1">
                    <MovementRow
                        crewMember={crewMember}
                        adjacentModules={adjacentModules}
                        onMove={onMove}
                        onSelect={onSelect}
                    />
                    <TaskRow
                        crewMember={crewMember}
                        module={module}
                        actions={actions}
                        onAssignTask={onAssignTask}
                        currentAssignment={currentAssignment}
                        isCombat={isCombat}
                        t={t}
                    />
                </div>
            )}
        </div>
    );
}

interface MovementRowProps {
    crewMember: CrewMember;
    adjacentModules: Module[];
    onMove: (_crewMemberId: number, _moduleId: number) => void;
    onSelect: (crewMember: CrewMember | null) => void;
}

function MovementRow({
    crewMember,
    adjacentModules,
    onMove,
    onSelect,
}: MovementRowProps) {
    const { t } = useTranslation();

    // Group modules by type and assign numbers for easier identification
    const modulesWithTypeIndex = adjacentModules.map((mod, index) => {
        // Count how many modules of the same type came before this one
        const sameTypeBefore = adjacentModules
            .slice(0, index)
            .filter((m) => m.type === mod.type).length;
        return {
            module: mod,
            typeIndex: sameTypeBefore + 1,
        };
    });

    return (
        <div className="flex items-start gap-2 mb-1.5">
            <span className="text-[#00ff41] min-w-27.5 pt-0.5">
                {t("crew_member.move_to")}
            </span>
            <div className="flex flex-wrap gap-1">
                {!crewMember.movedThisTurn && adjacentModules.length > 0 ? (
                    modulesWithTypeIndex.map(({ module, typeIndex }) => (
                        <Button
                            key={module.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onMove(crewMember.id, module.id);
                                onSelect(null);
                            }}
                            className="cursor-pointer bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] text-[9px] px-2 h-6 rounded-none"
                        >
                            {module.name} #{typeIndex} ({module.x},{module.y})
                        </Button>
                    ))
                ) : (
                    <span className="text-[#888] text-[9px] pt-0.5">
                        {crewMember.movedThisTurn
                            ? t("crew_member.moved_already")
                            : t("crew_member.no_modules")}
                    </span>
                )}
            </div>
        </div>
    );
}

interface TaskRowProps {
    crewMember: CrewMember;
    module: Module | undefined;
    actions: Array<{
        value: NonNullable<CrewMemberCombatAssignment>;
        label: string;
        effect: string | null;
        moduleType?: ModuleType;
    }>;
    onAssignTask: (
        crewMemberId: number,
        task: CrewMemberCombatAssignment,
        effect: string | null,
    ) => void;
    currentAssignment: string | null;
    isCombat?: boolean;
    t: (key: string) => string;
}

function TaskRow({
    crewMember,
    module,
    actions,
    onAssignTask,
    currentAssignment,
    isCombat = false,
    t,
}: TaskRowProps) {
    const filteredActions = actions.filter((action) => {
        if (action.moduleType && module?.type !== action.moduleType) {
            return false;
        }
        return true;
    });

    return (
        <div className="flex items-start gap-2">
            <span className="text-[#ffb000] min-w-27.5 pt-0.5">
                {isCombat
                    ? t("crew_member.task_combat")
                    : t("crew_member.task")}
            </span>
            <div className="flex flex-wrap gap-1">
                {filteredActions.map((a) => {
                    const itemValue = a.value === "" ? "none" : a.value;
                    const currentTask = currentAssignment || "none";
                    const isActive = currentTask === itemValue;

                    return (
                        <TooltipProvider key={itemValue}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const actualValue =
                                                itemValue === "none"
                                                    ? null
                                                    : itemValue;
                                            onAssignTask(
                                                crewMember.id,
                                                actualValue,
                                                null,
                                            );
                                        }}
                                        className={`cursor-pointer bg-transparent border text-[9px] px-2 h-6 rounded-none ${
                                            isActive
                                                ? "bg-[#ffb000] text-[#050810] border-[#ffb000]"
                                                : "border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810]"
                                        }`}
                                    >
                                        {a.label}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="top"
                                    className="border border-[#ffb000] bg-[#050810] text-[#ffb000] text-[9px] max-w-45"
                                >
                                    {t(
                                        getActionDescription(
                                            crewMember.profession,
                                            a.value,
                                        ),
                                    )}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                })}
            </div>
        </div>
    );
}

function getActionDescription(
    profession: Profession,
    actionValue: NonNullable<CrewMemberCombatAssignment>,
): string {
    const descriptions: Record<Profession, Record<string, string>> = {
        pilot: {
            "": "profession_actions.pilot.waiting",
            evasion: "profession_actions.pilot.evasion",
            navigation: "profession_actions.pilot.navigation",
            targeting: "profession_actions.pilot.targeting",
        },
        engineer: {
            "": "profession_actions.engineer.waiting",
            power: "profession_actions.engineer.power",
            repair: "profession_actions.engineer.repair",
            overclock: "profession_actions.engineer.overclock",
            calibration: "profession_actions.engineer.calibration",
        },
        medic: {
            "": "profession_actions.medic.waiting",
            heal: "profession_actions.medic.heal",
            morale: "profession_actions.medic.morale",
            firstaid: "profession_actions.medic.firstaid",
        },
        scout: {
            "": "profession_actions.scout.waiting",
            patrol: "profession_actions.scout.patrol",
        },
        scientist: {
            "": "profession_actions.scientist.waiting",
            research: "profession_actions.scientist.research",
        },
        gunner: {
            "": "profession_actions.gunner.waiting",
            targeting: "profession_actions.gunner.targeting",
            rapidfire: "profession_actions.gunner.rapidfire",
        },
    };
    return (
        descriptions[profession]?.[actionValue] ?? "crew_member.no_description"
    );
}
