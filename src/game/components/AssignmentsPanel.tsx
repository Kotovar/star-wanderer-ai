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
import { getAvailableTasksForModule } from "@/game/slices/crew/helpers";
import { CrewMemberAssignment } from "@/game/types";
import { useTranslation } from "@/lib/useTranslation";

export function AssignmentsPanel() {
    const crew = useGameStore((s) => s.crew);
    const modules = useGameStore((s) => s.ship.modules);
    const assignCrewTask = useGameStore((s) => s.assignCrewTask);
    const moveCrewMember = useGameStore((s) => s.moveCrewMember);
    const isModuleAdjacent = useGameStore((s) => s.isModuleAdjacent);
    const showGalaxyMap = useGameStore((s) => s.showGalaxyMap);
    const { t } = useTranslation();

    const [assignments, setAssignments] = useState<
        Record<
            number,
            { task: CrewMemberAssignment | "none"; effect: string | null }
        >
    >({});
    // crewId → targetModuleId (undefined = stay)
    const [moves, setMoves] = useState<Record<number, number>>({});

    const getModuleName = (moduleId: number) => {
        const mod = modules.find((m) => m.id === moduleId);
        if (!mod) return "?";
        const translated = t(`module_names.${mod.type}`);
        return translated !== `module_names.${mod.type}`
            ? translated
            : mod.name;
    };

    const handleApply = () => {
        // 1. Move first — moving clears the assignment in store
        Object.entries(moves).forEach(([crewId, targetModuleId]) => {
            moveCrewMember(Number(crewId), targetModuleId);
        });
        // 2. Then assign tasks
        Object.entries(assignments).forEach(([crewId, { task, effect }]) => {
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
                Назначьте задачи и перемещения. Эффект в следующем ходу.
            </div>

            <div className="bg-[rgba(0,212,255,0.05)] border border-[#00d4ff] p-4 mt-2.5">
                {crew.map((c) => {
                    const pendingModuleId = moves[c.id];
                    const effectiveModuleId = pendingModuleId ?? c.moduleId;
                    const effectiveModule = modules.find(
                        (m) => m.id === effectiveModuleId,
                    );

                    // Adjacent modules available to move into
                    const adjacentModules = modules.filter(
                        (m) =>
                            m.id !== c.moduleId &&
                            !m.disabled &&
                            !m.manualDisabled &&
                            isModuleAdjacent(c.moduleId, m.id),
                    );

                    // Получаем все задачи для профессии
                    let allActions = CREW_ACTIONS[c.profession] || [
                        { value: "", label: "ОЖИДАНИЕ", effect: null },
                    ];

                    // Добавляем "Сращивание" для ксеноморфов
                    if (c.race === "xenosymbiont") {
                        allActions = [
                            ...allActions,
                            {
                                value: "merge",
                                label: "🧬 Сращивание",
                                effect: "Бонус модулю",
                            },
                        ];
                    }

                    // Фильтруем задачи по целевому модулю (с учётом запланированного перемещения)
                    const actions = getAvailableTasksForModule(
                        effectiveModule,
                        allActions,
                    );

                    // При смене модуля сбрасываем задачу если она недоступна
                    const currentAssignment = assignments[c.id]?.task;
                    const taskStillValid =
                        !currentAssignment ||
                        currentAssignment === "none" ||
                        actions.some(
                            (a) =>
                                (a.value === "" ? "none" : a.value) ===
                                currentAssignment,
                        );

                    const displayValue = taskStillValid
                        ? (currentAssignment ?? c.assignment ?? "none") ||
                          "none"
                        : "none";

                    const profName =
                        PROFESSION_NAMES[c.profession] || c.profession;
                    const isMoving = pendingModuleId !== undefined;

                    return (
                        <div key={c.id} className="mb-5 last:mb-0">
                            {/* Name + current location */}
                            <div className="flex items-baseline justify-between gap-2 mb-1.5">
                                <div className="text-[#00d4ff] font-bold">
                                    {c.name}{" "}
                                    <span className="font-normal text-[#888] text-xs">
                                        ({profName} LV{c.level || 1})
                                    </span>
                                </div>
                                <div className="text-[10px] text-[#555] shrink-0">
                                    📍 {getModuleName(c.moduleId)}
                                    {isMoving && (
                                        <span className="text-[#ffb000]">
                                            {" "}
                                            → {getModuleName(pendingModuleId)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Module move select */}
                            {adjacentModules.length > 0 && (
                                <Select
                                    value={
                                        pendingModuleId !== undefined
                                            ? String(pendingModuleId)
                                            : "stay"
                                    }
                                    onValueChange={(value) => {
                                        if (value === "stay") {
                                            setMoves((prev) => {
                                                const next = { ...prev };
                                                delete next[c.id];
                                                return next;
                                            });
                                        } else {
                                            setMoves((prev) => ({
                                                ...prev,
                                                [c.id]: Number(value),
                                            }));
                                        }
                                        // Reset task on module change
                                        setAssignments((prev) => {
                                            const next = { ...prev };
                                            delete next[c.id];
                                            return next;
                                        });
                                    }}
                                >
                                    <SelectTrigger
                                        className={`bg-[#050810] border text-xs mb-1.5 ${
                                            isMoving
                                                ? "border-[#ffb000] text-[#ffb000]"
                                                : "border-[#333] text-[#555]"
                                        }`}
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#050810] border border-[#ffb000] text-[#ffb000]">
                                        <SelectItem
                                            value="stay"
                                            className="hover:bg-[rgba(255,176,0,0.1)]"
                                        >
                                            ↩ Остаться (
                                            {getModuleName(c.moduleId)})
                                        </SelectItem>
                                        {adjacentModules.map((mod) => (
                                            <SelectItem
                                                key={mod.id}
                                                value={String(mod.id)}
                                                className="hover:bg-[rgba(255,176,0,0.1)]"
                                            >
                                                → {getModuleName(mod.id)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {/* Task select */}
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
