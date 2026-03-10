"use client";

import { useState } from "react";
import { useGameStore } from "../store";

import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CREW_ACTIONS, PROFESSION_NAMES } from "@/game/constants/crew";
import { CrewMemberAssignment } from "@/game/types";

export function AssignmentsPanel() {
    const crew = useGameStore((s) => s.crew);
    const ship = useGameStore((s) => s.ship);
    const assignCrewTask = useGameStore((s) => s.assignCrewTask);
    const showGalaxyMap = useGameStore((s) => s.showGalaxyMap);
    const [assignments, setAssignments] = useState<
        Record<
            number,
            { task: CrewMemberAssignment | "none"; effect: string | null }
        >
    >({});

    const handleApply = () => {
        Object.entries(assignments).forEach(([crewId, { task, effect }]) => {
            // Convert 'none' back to empty string for the store
            const actualTask = task === "none" ? "" : task;
            assignCrewTask(Number(crewId), actualTask, effect);
        });
        showGalaxyMap();
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
                ▸ ЭКИПАЖ
            </div>
            <div className="text-sm">
                Назначьте задачи. Эффект в следующем ходу.
            </div>

            <div className="bg-[rgba(0,212,255,0.05)] border border-[#00d4ff] p-4 mt-2.5">
                {crew.map((c) => {
                    let actions = CREW_ACTIONS[c.profession] || [
                        { value: "", label: "ОЖИДАНИЕ", effect: null },
                    ];

                    // Get current module for this crew member
                    const currentModule = ship.modules.find(
                        (m) => m.id === c.moduleId,
                    );

                    // Фильтр задач для инженеров - "Разгон реактора" только в реакторе
                    if (c.profession === "engineer") {
                        const isInReactor = currentModule?.type === "reactor";

                        // Показываем "Разгон реактора" только если инженер в реакторе
                        actions = actions.filter(
                            (a) =>
                                a.value !== "reactor_overload" || isInReactor,
                        );
                    }

                    // Добавляем "Сращивание" для ксеноморфов
                    if (c.race === "xenosymbiont") {
                        actions = [
                            ...actions,
                            {
                                value: "merge",
                                label: "🧬 Сращивание",
                                effect: "Бонус модулю",
                            },
                        ];
                    }

                    // Convert empty string to 'none' for Select value
                    const currentValue: string =
                        assignments[c.id]?.task || c.assignment || "none";
                    const displayValue =
                        currentValue === "" || currentValue === null
                            ? "none"
                            : currentValue;

                    const profName =
                        PROFESSION_NAMES[c.profession] || c.profession;

                    return (
                        <div key={c.id} className="mb-5 last:mb-0">
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <div className="text-[#00d4ff] font-bold mb-1.5">
                                        {c.name} ({profName} LV{c.level || 1})
                                    </div>
                                    {currentModule && (
                                        <div className="text-[9px] text-[#888] mb-1.5">
                                            📍 {currentModule.name} (
                                            {currentModule.x},{currentModule.y})
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Select
                                value={displayValue}
                                onValueChange={(value) => {
                                    const action = actions.find(
                                        (a) =>
                                            (a.value === ""
                                                ? "none"
                                                : a.value) === value,
                                    );
                                    setAssignments((prev) => ({
                                        ...prev,
                                        [c.id]: {
                                            task: value as
                                                | CrewMemberAssignment
                                                | "none",
                                            effect: action?.effect || null,
                                        },
                                    }));
                                }}
                            >
                                <SelectTrigger className="bg-[#050810] border border-[#00ff41] text-[#00ff41]">
                                    <SelectValue placeholder="Выберите задачу" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#050810] border border-[#00ff41] text-[#00ff41]">
                                    {actions.map((a) => {
                                        const itemValue =
                                            a.value === "" ? "none" : a.value;
                                        return (
                                            <SelectItem
                                                key={itemValue}
                                                value={itemValue}
                                                className="hover:bg-[rgba(0,255,65,0.1)]"
                                            >
                                                {a.label}{" "}
                                                {a.effect
                                                    ? `[${a.effect}]`
                                                    : ""}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>
                    );
                })}
            </div>

            <div className="flex gap-2.5 flex-wrap mt-5">
                <Button
                    onClick={handleApply}
                    className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider"
                >
                    ПРИМЕНИТЬ
                </Button>
                <Button
                    onClick={showGalaxyMap}
                    className="bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider"
                >
                    ОТМЕНА
                </Button>
            </div>
        </div>
    );
}
