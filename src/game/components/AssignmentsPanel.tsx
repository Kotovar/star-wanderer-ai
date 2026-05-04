"use client";

import { useState } from "react";
import { useGameStore } from "../store";

import { Button } from "@/components/ui/button";
import { RACES } from "@/game/constants/races";
import { CREW_ACTIONS, PROFESSION_NAMES } from "@/game/constants/crew";
import { getAvailableTasksForModule } from "@/game/slices/crew/helpers";
import type {
    CrewMember,
    CrewMemberAssignment,
    Module,
    Profession,
    RaceId,
} from "@/game/types";
import { useTranslation } from "@/lib/useTranslation";
import { RaceSprite } from "./RaceSprite";

type CivilianAction = {
    value: NonNullable<CrewMemberAssignment>;
    label: string;
    effect: string | null;
};

type PendingAssignment = {
    task: CrewMemberAssignment | "none";
    effect: string | null;
};

export function AssignmentsPanel() {
    const crew = useGameStore((s) => s.crew);
    const modules = useGameStore((s) => s.ship.modules);
    const assignCrewTask = useGameStore((s) => s.assignCrewTask);
    const moveCrewMember = useGameStore((s) => s.moveCrewMember);
    const isModuleAdjacent = useGameStore((s) => s.isModuleAdjacent);
    const showGalaxyMap = useGameStore((s) => s.showGalaxyMap);
    const { t } = useTranslation();

    const [assignments, setAssignments] = useState<
        Record<number, PendingAssignment>
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

    const plannedMoveCount = Object.keys(moves).length;
    const plannedTaskCount = Object.keys(assignments).length;
    const hasPlannedChanges = plannedMoveCount + plannedTaskCount > 0;

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
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
                        ▸ ЭКИПАЖ
                    </div>
                    <div className="text-sm text-[#aaa]">
                        Планирование перемещений и задач на следующий ход.
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                    <StatusMetric label="Экипаж" value={crew.length} />
                    <StatusMetric label="Маршруты" value={plannedMoveCount} />
                    <StatusMetric label="Задачи" value={plannedTaskCount} />
                </div>
            </div>

            <div className="overflow-y-auto max-h-[62vh] bg-[rgba(0,212,255,0.04)] border border-[#00d4ff] p-3 space-y-3">
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

                    let allActions: CivilianAction[] =
                        CREW_ACTIONS[c.profession] || [
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
                    const actions: CivilianAction[] = getAvailableTasksForModule(
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

                    const currentTask = (c.assignment || "none") as
                        | CrewMemberAssignment
                        | "none";
                    const isMoving = pendingModuleId !== undefined;
                    const selectedAction = actions.find(
                        (a) =>
                            (a.value === "" ? "none" : a.value) ===
                            displayValue,
                    );

                    return (
                        <CrewAssignmentCard
                            key={c.id}
                            crewMember={c}
                            currentModule={modules.find(
                                (m) => m.id === c.moduleId,
                            )}
                            effectiveModule={effectiveModule}
                            adjacentModules={adjacentModules}
                            actions={actions}
                            currentTask={currentTask}
                            displayValue={displayValue}
                            selectedAction={selectedAction}
                            isMoving={isMoving}
                            pendingModuleId={pendingModuleId}
                            getModuleName={getModuleName}
                            onSetMove={(targetModuleId) => {
                                if (targetModuleId === null) {
                                    setMoves((prev) => {
                                        const next = { ...prev };
                                        delete next[c.id];
                                        return next;
                                    });
                                } else {
                                    setMoves((prev) => ({
                                        ...prev,
                                        [c.id]: targetModuleId,
                                    }));
                                }
                                setAssignments((prev) => {
                                    const next = { ...prev };
                                    delete next[c.id];
                                    return next;
                                });
                            }}
                            onSetTask={(value, action) => {
                                setAssignments((prev) => ({
                                    ...prev,
                                    [c.id]: {
                                        task: value,
                                        effect: action?.effect || null,
                                    },
                                }));
                            }}
                        />
                    );
                })}
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs text-[#888]">
                    {hasPlannedChanges
                        ? `Будет применено: ${plannedMoveCount} перемещ., ${plannedTaskCount} задач.`
                        : "Изменений пока нет."}
                </div>
                <div className="flex gap-2.5 flex-wrap">
                <Button
                    onClick={handleApply}
                    className="cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider"
                >
                    ПРИМЕНИТЬ
                </Button>
                <Button
                    onClick={showGalaxyMap}
                    className="cursor-pointer bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider"
                >
                    ОТМЕНА
                </Button>
                </div>
            </div>
        </div>
    );
}

function StatusMetric({ label, value }: { label: string; value: number }) {
    return (
        <div className="min-w-18 border border-[#00d4ff55] bg-[rgba(0,212,255,0.06)] px-2 py-1">
            <div className="text-[#00d4ff] font-bold text-sm tabular-nums">
                {value}
            </div>
            <div className="text-[#777] uppercase tracking-wide">{label}</div>
        </div>
    );
}

function CrewAssignmentCard({
    crewMember,
    currentModule,
    effectiveModule,
    adjacentModules,
    actions,
    currentTask,
    displayValue,
    selectedAction,
    isMoving,
    pendingModuleId,
    getModuleName,
    onSetMove,
    onSetTask,
}: {
    crewMember: CrewMember;
    currentModule: Module | undefined;
    effectiveModule: Module | undefined;
    adjacentModules: Module[];
    actions: CivilianAction[];
    currentTask: CrewMemberAssignment | "none";
    displayValue: CrewMemberAssignment | "none";
    selectedAction: CivilianAction | undefined;
    isMoving: boolean;
    pendingModuleId: number | undefined;
    getModuleName: (moduleId: number) => string;
    onSetMove: (targetModuleId: number | null) => void;
    onSetTask: (
        value: CrewMemberAssignment | "none",
        action: CivilianAction | undefined,
    ) => void;
}) {
    const race = RACES[crewMember.race as RaceId];
    const hpPct = getPercent(crewMember.health, crewMember.maxHealth || 100);
    const moralePct = getPercent(
        crewMember.happiness,
        crewMember.maxHappiness || 100,
    );
    const currentActionLabel =
        actions.find((a) => (a.value === "" ? "none" : a.value) === currentTask)
            ?.label ?? "ОЖИДАНИЕ";

    return (
        <div
            className={`border p-3 ${
                isMoving || displayValue !== currentTask
                    ? "border-[#ffb000] bg-[rgba(255,176,0,0.06)]"
                    : "border-[#00d4ff55] bg-[rgba(5,8,16,0.7)]"
            }`}
        >
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <RaceSprite
                        race={crewMember.race}
                        size={42}
                        title={race?.name}
                    />
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[#00d4ff] font-bold">
                                {crewMember.name}
                            </span>
                            <span className="text-[10px] text-[#ffb000] border border-[#ffb00055] px-1.5 py-0.5 rounded">
                                {PROFESSION_NAMES[
                                    crewMember.profession as Profession
                                ] || crewMember.profession}{" "}
                                LV{crewMember.level || 1}
                            </span>
                            {crewMember.isMerged && (
                                <span className="text-[10px] text-[#9933ff] border border-[#9933ff55] px-1.5 py-0.5 rounded">
                                    Сращён
                                </span>
                            )}
                            {crewMember.movedThisTurn && (
                                <span className="text-[10px] text-[#ff0040] border border-[#ff004055] px-1.5 py-0.5 rounded">
                                    Ход потрачен
                                </span>
                            )}
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-2 text-[10px]">
                            <CrewBar
                                label="Здоровье"
                                value={crewMember.health}
                                max={crewMember.maxHealth || 100}
                                pct={hpPct}
                                color={
                                    hpPct < 35
                                        ? "#ff0040"
                                        : hpPct < 65
                                          ? "#ffb000"
                                          : "#00ff41"
                                }
                            />
                            {race?.hasHappiness === false ? (
                                <div className="text-[#777] pt-1">
                                    Мораль: иммунитет
                                </div>
                            ) : (
                                <CrewBar
                                    label="Мораль"
                                    value={crewMember.happiness}
                                    max={crewMember.maxHappiness || 100}
                                    pct={moralePct}
                                    color={
                                        moralePct < 35
                                            ? "#ff0040"
                                            : moralePct < 65
                                              ? "#ffb000"
                                              : "#00ff41"
                                    }
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="text-[10px] text-right min-w-42">
                    <div className="text-[#888]">Текущая задача</div>
                    <div className="text-[#00ff41] font-bold">
                        {currentActionLabel}
                    </div>
                    <div className="text-[#888] mt-1">Выбрано</div>
                    <div className="text-[#ffb000] font-bold">
                        {selectedAction?.label ?? "ОЖИДАНИЕ"}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-3">
                <div className="space-y-2">
                    <SectionLabel label="Маршрут" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <ModuleRouteButton
                            label="Остаться"
                            module={currentModule}
                            moduleName={
                                currentModule
                                    ? getModuleName(currentModule.id)
                                    : "?"
                            }
                            active={!isMoving}
                            disabled={false}
                            onClick={() => onSetMove(null)}
                        />
                        {adjacentModules.map((mod) => (
                            <ModuleRouteButton
                                key={mod.id}
                                label="Перейти"
                                module={mod}
                                moduleName={getModuleName(mod.id)}
                                active={pendingModuleId === mod.id}
                                disabled={crewMember.movedThisTurn}
                                onClick={() => onSetMove(mod.id)}
                            />
                        ))}
                    </div>
                    {adjacentModules.length === 0 && (
                        <div className="text-[10px] text-[#777]">
                            Нет доступных соседних модулей для перемещения.
                        </div>
                    )}
                    {effectiveModule && (
                        <div className="text-[10px] text-[#888]">
                            Задачи ниже рассчитаны для модуля:{" "}
                            <span className="text-[#00d4ff]">
                                {getModuleName(effectiveModule.id)}
                            </span>
                            .
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <SectionLabel label="Задача" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {actions.map((action) => {
                            const itemValue =
                                action.value === "" ? "none" : action.value;
                            const isActive = displayValue === itemValue;
                            return (
                                <button
                                    key={itemValue}
                                    type="button"
                                    onClick={() =>
                                        onSetTask(
                                            itemValue as
                                                | CrewMemberAssignment
                                                | "none",
                                            action,
                                        )
                                    }
                                    className={`cursor-pointer text-left border p-2 transition-colors ${
                                        isActive
                                            ? "border-[#00ff41] bg-[rgba(0,255,65,0.12)]"
                                            : "border-[#333] bg-[rgba(0,0,0,0.2)] hover:border-[#00ff41aa]"
                                    }`}
                                >
                                    <div
                                        className={`text-xs font-bold ${
                                            isActive
                                                ? "text-[#00ff41]"
                                                : "text-[#aaa]"
                                        }`}
                                    >
                                        {action.label}
                                    </div>
                                    <div className="text-[10px] text-[#777] mt-0.5">
                                        {action.effect ?? "Без активного эффекта"}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    {actions.length === 0 && (
                        <div className="text-[10px] text-[#777]">
                            На выбранном модуле нет доступных задач.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SectionLabel({ label }: { label: string }) {
    return (
        <div className="text-[10px] text-[#ffb000] uppercase tracking-wider">
            {label}
        </div>
    );
}

function CrewBar({
    label,
    value,
    max,
    pct,
    color,
}: {
    label: string;
    value: number;
    max: number;
    pct: number;
    color: string;
}) {
    return (
        <div>
            <div className="flex justify-between text-[#777]">
                <span>{label}</span>
                <span className="tabular-nums">
                    {value}/{max}
                </span>
            </div>
            <div className="h-1.5 bg-[rgba(0,0,0,0.6)] rounded overflow-hidden">
                <div
                    className="h-full"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
}

function ModuleRouteButton({
    label,
    module,
    moduleName,
    active,
    disabled,
    onClick,
}: {
    label: string;
    module: Module | undefined;
    moduleName: string;
    active: boolean;
    disabled: boolean;
    onClick: () => void;
}) {
    const hpPct = module ? getPercent(module.health, module.maxHealth || 100) : 0;
    const status = getModuleStatus(module);

    return (
        <button
            type="button"
            disabled={disabled}
            onClick={onClick}
            className={`cursor-pointer text-left border p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                active
                    ? "border-[#ffb000] bg-[rgba(255,176,0,0.12)]"
                    : "border-[#333] bg-[rgba(0,0,0,0.2)] hover:border-[#ffb000aa]"
            }`}
        >
            <div className="flex items-center justify-between gap-2">
                <span
                    className={`text-[10px] uppercase tracking-wide ${
                        active ? "text-[#ffb000]" : "text-[#777]"
                    }`}
                >
                    {label}
                </span>
                {module && (
                    <span className="text-[10px] text-[#555]">
                        {module.x},{module.y}
                    </span>
                )}
            </div>
            <div className="text-xs text-[#00d4ff] font-bold truncate">
                {moduleName}
            </div>
            <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 bg-[rgba(0,0,0,0.6)] rounded overflow-hidden">
                    <div
                        className="h-full"
                        style={{
                            width: `${hpPct}%`,
                            backgroundColor:
                                hpPct < 35
                                    ? "#ff0040"
                                    : hpPct < 65
                                      ? "#ffb000"
                                      : "#00ff41",
                        }}
                    />
                </div>
                <span className={`text-[10px] ${status.color}`}>
                    {status.label}
                </span>
            </div>
        </button>
    );
}

function getPercent(value: number, max: number) {
    if (max <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function getModuleStatus(module: Module | undefined) {
    if (!module) return { label: "нет", color: "text-[#777]" };
    if (module.disabled || module.manualDisabled) {
        return { label: "откл.", color: "text-[#ff0040]" };
    }
    const pct = getPercent(module.health, module.maxHealth || 100);
    if (pct < 35) return { label: "повр.", color: "text-[#ff0040]" };
    if (pct < 75) return { label: "износ", color: "text-[#ffb000]" };
    return { label: "норма", color: "text-[#00ff41]" };
}
