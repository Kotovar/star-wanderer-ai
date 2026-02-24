"use client";

import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { CREW_ACTIONS, PROFESSION_NAMES } from "../constants";
import type { CrewMember, Module } from "../types";

interface CrewMemberCardProps {
    crewMember: CrewMember;
    module: Module | undefined;
    adjacentModules: Module[];
    isSelected: boolean;
    onSelect: (crewMember: CrewMember | null) => void;
    onMove: (_crewMemberId: number, _moduleId: number) => void;
    onAssignTask: (
        _crewMemberId: number,
        _task: string,
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
    let actions = CREW_ACTIONS[crewMember.profession] || [
        { value: "", label: "ОЖИДАНИЕ", effect: null },
    ];

    // Filter out combat-irrelevant tasks during battle
    if (isCombat) {
        const combatRelevantActions: Record<string, string[]> = {
            pilot: ["", "evasion", "targeting"], // Navigation doesn't affect combat
            engineer: ["", "repair", "overclock"], // Power doesn't affect combat directly
            medic: ["", "heal", "firstaid"], // Morale is less relevant in combat
            scout: ["", "patrol"],
            scientist: ["", "research"],
            gunner: ["", "targeting", "rapidfire"],
        };
        const relevantActions = combatRelevantActions[
            crewMember.profession
        ] || [""];
        actions = actions.filter((a) => relevantActions.includes(a.value));
    }

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
            <div className="flex items-center gap-2">
                <span className="text-[#00d4ff] font-bold min-w-20">
                    {crewMember.name}
                </span>
                <span className="text-[#ffb000]">
                    {PROFESSION_NAMES[crewMember.profession]}
                </span>
                <span className="text-[#888] flex-1">
                    📍 {module?.name || "???"}
                </span>
                {crewMember.movedThisTurn && (
                    <span className="text-[#ff0040] px-1 border border-[#ff0040] text-[9px]">
                        ПЕРЕМЕЩЁН
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
                        actions={actions}
                        onAssignTask={onAssignTask}
                        currentAssignment={currentAssignment}
                        isCombat={isCombat}
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
    return (
        <div className="flex items-start gap-2 mb-1.5">
            <span className="text-[#00ff41] min-w-27.5 pt-0.5">
                Переместиться в:
            </span>
            <div className="flex flex-wrap gap-1">
                {!crewMember.movedThisTurn && adjacentModules.length > 0 ? (
                    adjacentModules.map((mod) => (
                        <Button
                            key={mod.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onMove(crewMember.id, mod.id);
                                onSelect(null);
                            }}
                            className="bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] text-[9px] px-2 h-6 rounded-none"
                        >
                            {mod.name}
                        </Button>
                    ))
                ) : (
                    <span className="text-[#888] text-[9px] pt-0.5">
                        {crewMember.movedThisTurn
                            ? "Уже перемещался"
                            : "Нет доступных модулей"}
                    </span>
                )}
            </div>
        </div>
    );
}

interface TaskRowProps {
    crewMember: CrewMember;
    actions: Array<{ value: string; label: string; effect: unknown }>;
    onAssignTask: (
        _crewMemberId: number,
        _task: string,
        _effect: string | null,
    ) => void;
    currentAssignment: string | null;
    isCombat?: boolean;
}

function TaskRow({
    crewMember,
    actions,
    onAssignTask,
    currentAssignment,
    isCombat = false,
}: TaskRowProps) {
    return (
        <div className="flex items-start gap-2">
            <span className="text-[#ffb000] min-w-27.5 pt-0.5">
                {isCombat ? "Боевая задача:" : "Задача:"}
            </span>
            <div className="flex flex-wrap gap-1">
                {actions.map((a) => {
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
                                                    ? ""
                                                    : itemValue;
                                            onAssignTask(
                                                crewMember.id,
                                                actualValue,
                                                null,
                                            );
                                        }}
                                        className={`bg-transparent border text-[9px] px-2 h-6 rounded-none ${
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
                                    {getActionDescription(
                                        crewMember.profession,
                                        a.value,
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

function getActionDescription(profession: string, actionValue: string): string {
    const descriptions: Record<string, Record<string, string>> = {
        pilot: {
            "": "Ожидание - бездействие",
            evasion: "Уклонение - +15 к щитам, -1 топливо",
            navigation: "Навигация - снижает расход топлива",
            targeting: "Прицеливание - выбор цели, +15% урона",
        },
        engineer: {
            "": "Ожидание - бездействие",
            power: "Энергия - +5 к генерации",
            repair: "Ремонт - +15% здоровья модулю",
            overclock: "Перегрузка - +25% урон, -10% брони",
        },
        medic: {
            "": "Ожидание - бездействие",
            heal: "Лечение - +20 здоровья экипажу",
            morale: "Мораль - +15 настроения",
            firstaid: "Первая помощь - стабилизация",
        },
        scout: {
            "": "Ожидание - бездействие",
            patrol: "Патруль - информация о секторе",
        },
        scientist: {
            "": "Ожидание - бездействие",
            research: "Исследование аномалий",
        },
        gunner: {
            "": "Ожидание - бездействие",
            targeting: "Прицеливание - выбор цели, +15% урона",
            rapidfire: "Шквал - +25% урон, -5% точность",
        },
    };
    return descriptions[profession]?.[actionValue] || "Нет описания";
}
