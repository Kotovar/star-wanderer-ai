"use client";

import { useState } from "react";
import { useGameStore } from "../store";
import { PROFESSION_NAMES, PROFESSION_DESCRIPTIONS, RACES } from "../constants";
import type { CrewMember } from "../types";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export function CrewList() {
    const crew = useGameStore((s) => s.crew);
    const modules = useGameStore((s) => s.ship.modules);
    const moveCrewMember = useGameStore((s) => s.moveCrewMember);
    const isModuleAdjacent = useGameStore((s) => s.isModuleAdjacent);
    const fireCrewMember = useGameStore((s) => s.fireCrewMember);
    const currentCombat = useGameStore((s) => s.currentCombat);
    const [selectedCrew, setSelectedCrew] = useState<CrewMember | null>(null);

    const getModuleName = (moduleId: number) => {
        const mod = modules.find((m) => m.id === moduleId);
        return mod ? mod.name : "Неизвестно";
    };

    const getAdjacentModules = (moduleId: number) => {
        return modules.filter(
            (m) =>
                m.id !== moduleId &&
                !m.disabled &&
                isModuleAdjacent(moduleId, m.id),
        );
    };

    // Check if we're in combat
    const isCombat = !!currentCombat;

    return (
        <>
            <div className="flex flex-col gap-2">
                {crew.map((member) => {
                    const expNeeded = (member.level || 1) * 100;
                    const expPercent = Math.min(
                        100,
                        ((member.exp || 0) / expNeeded) * 100,
                    );
                    const profName =
                        PROFESSION_NAMES[member.profession] ||
                        member.profession;
                    // Use combat assignment during combat, civilian assignment otherwise
                    const currentAssignment = isCombat
                        ? member.combatAssignment
                        : member.assignment;
                    const assignText = currentAssignment
                        ? `[${currentAssignment.toUpperCase()}]`
                        : "[ОЖИДАНИЕ]";
                    const race = RACES[member.race];
                    const moduleName = getModuleName(member.moduleId);

                    return (
                        <div
                            key={member.id}
                            className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-2.5 text-xs cursor-pointer transition-all hover:bg-[rgba(0,255,65,0.1)] hover:shadow-[0_0_10px_rgba(0,255,65,0.5)]"
                            onClick={() => setSelectedCrew(member)}
                        >
                            <div className="flex items-center gap-2">
                                {race && (
                                    <span style={{ color: race.color }}>
                                        {race.icon}
                                    </span>
                                )}
                                <span className="text-[#00d4ff] font-bold">
                                    {member.name}
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
                                {member.movedThisTurn && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#ff0040] text-[#ff0040]">
                                        ПЕРЕМЕЩЁН
                                    </span>
                                )}
                            </div>
                            <div className="text-[#ffb000] text-[11px] mt-1">
                                {profName}
                                {member.level ? ` LV${member.level}` : ""}{" "}
                                <span className="text-[#00d4ff]">
                                    {assignText}
                                </span>
                            </div>
                            <div className="text-[#888] text-[10px] mt-1">
                                📍 {moduleName}
                            </div>
                            <div className="grid grid-cols-1 gap-1 mt-1">
                                <div>
                                    Опыт: {member.exp}/{expNeeded}
                                    <Progress
                                        value={expPercent}
                                        className="h-2 mt-1 bg-[rgba(0,0,0,0.5)] [&>div]:bg-[#00d4ff]"
                                    />
                                </div>
                                <div>
                                    Здоровье: {member.health}/
                                    {member.maxHealth || 100}
                                    <Progress
                                        value={
                                            (member.health /
                                                (member.maxHealth || 100)) *
                                            100
                                        }
                                        className={`h-2 mt-1 bg-[rgba(0,0,0,0.5)] ${member.health < 30 ? "[&>div]:bg-[#ff0040]" : member.health < 60 ? "[&>div]:bg-[#ffb000]" : "[&>div]:bg-[#00ff41]"}`}
                                    />
                                </div>
                                <div className="text-[10px] text-[#00ff41]">
                                    ❤ Регенерация: +
                                    {5 +
                                        (member.race === "xenosymbiont"
                                            ? 5
                                            : 0) +
                                        (useGameStore
                                            .getState()
                                            .activeEffects.some((e) =>
                                                e.effects.some(
                                                    (ef) =>
                                                        ef.type ===
                                                        "health_regen",
                                                ),
                                            )
                                            ? 5
                                            : 0)}
                                    /ход
                                </div>
                                {race?.hasHappiness && (
                                    <div>
                                        Настроение:
                                        <Progress
                                            value={member.happiness}
                                            className={`h-2 mt-1 bg-[rgba(0,0,0,0.5)] ${member.happiness < 30 ? "[&>div]:bg-[#ff0040]" : member.happiness < 60 ? "[&>div]:bg-[#ffb000]" : "[&>div]:bg-[#00ff41]"}`}
                                        />
                                    </div>
                                )}
                                {!race?.hasHappiness && (
                                    <div className="text-gray-500 text-[10px]">
                                        Не имеет счастья
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Dialog
                open={!!selectedCrew}
                onOpenChange={() => setSelectedCrew(null)}
            >
                <DialogContent
                    className="bg-[rgba(10,20,30,0.95)] border-2 border-[#00ff41] text-[#00ff41] max-w-md"
                    aria-describedby="crew-dialog-description"
                >
                    <DialogHeader>
                        <DialogTitle className="text-[#ffb000] font-['Orbitron']">
                            ▸ {selectedCrew?.name}
                        </DialogTitle>
                        <div id="crew-dialog-description" className="sr-only">
                            Информация о члене экипажа
                        </div>
                    </DialogHeader>
                    {selectedCrew &&
                        (() => {
                            const race = RACES[selectedCrew.race];
                            const currentModule = modules.find(
                                (m) => m.id === selectedCrew.moduleId,
                            );
                            const adjacentModules = getAdjacentModules(
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
                                                    {race.name}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {race.description}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-[#ffb000]">
                                            📍 Текущий модуль:{" "}
                                        </span>
                                        <span className="text-[#00d4ff]">
                                            {currentModule?.name ||
                                                "Неизвестно"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[#ffb000]">
                                            Профессия:{" "}
                                        </span>
                                        {PROFESSION_NAMES[
                                            selectedCrew.profession
                                        ] || selectedCrew.profession}
                                        {selectedCrew.level
                                            ? ` [LV${selectedCrew.level}]`
                                            : ""}
                                    </div>
                                    <div>
                                        <span className="text-[#ffb000]">
                                            Опыт:{" "}
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
                                            Здоровье:{" "}
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
                                        ❤ Регенерация: +
                                        {5 +
                                            (selectedCrew.race ===
                                            "xenosymbiont"
                                                ? 5
                                                : 0)}
                                        /ход
                                    </div>
                                    {race?.hasHappiness ? (
                                        <div>
                                            <span className="text-[#ffb000]">
                                                Настроение:{" "}
                                            </span>
                                            {selectedCrew.happiness}/100
                                            <Progress
                                                value={selectedCrew.happiness}
                                                className={`h-2 mt-1 bg-[rgba(0,0,0,0.5)] ${selectedCrew.happiness < 30 ? "[&>div]:bg-[#ff0040]" : selectedCrew.happiness < 60 ? "[&>div]:bg-[#ffb000]" : "[&>div]:bg-[#00ff41]"}`}
                                            />
                                        </div>
                                    ) : (
                                        <div className="text-[#00d4ff] text-xs">
                                            🤖 Не имеет счастья - иммунитет к
                                            моральным эффектам
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-[#ffb000]">
                                            Задание:{" "}
                                        </span>
                                        {isCombat
                                            ? selectedCrew.combatAssignment
                                                ? `[${selectedCrew.combatAssignment.toUpperCase()}]`
                                                : "[ОЖИДАНИЕ]"
                                            : selectedCrew.assignment
                                              ? `[${selectedCrew.assignment.toUpperCase()}]`
                                              : "[ОЖИДАНИЕ]"}
                                    </div>

                                    {/* Module movement section */}
                                    <div className="border-t border-[#00ff41] pt-4">
                                        <div className="text-[#ffb000] mb-2">
                                            🚶 Перемещение:
                                        </div>
                                        {selectedCrew.movedThisTurn ? (
                                            <div className="text-[#ff0040] text-xs">
                                                Уже перемещался в этот ход
                                            </div>
                                        ) : adjacentModules.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {adjacentModules.map((mod) => (
                                                    <Button
                                                        key={mod.id}
                                                        onClick={() => {
                                                            moveCrewMember(
                                                                selectedCrew.id,
                                                                mod.id,
                                                            );
                                                            setSelectedCrew(
                                                                null,
                                                            );
                                                        }}
                                                        className="bg-transparent border border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] text-xs py-1 px-2 h-auto"
                                                    >
                                                        → {mod.name}
                                                    </Button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-[#888] text-xs">
                                                Нет соседних модулей
                                            </div>
                                        )}
                                    </div>

                                    {race?.crewBonuses &&
                                        Object.keys(race.crewBonuses).length >
                                            0 && (
                                            <div>
                                                <span className="text-[#ffb000]">
                                                    Расовые бонусы:
                                                </span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {race.crewBonuses
                                                        .happiness && (
                                                        <span className="text-xs bg-[#00ff4120] text-[#00ff41] px-1 rounded">
                                                            😊 +
                                                            {
                                                                race.crewBonuses
                                                                    .happiness
                                                            }
                                                            %
                                                        </span>
                                                    )}
                                                    {race.crewBonuses
                                                        .repair && (
                                                        <span className="text-xs bg-[#ffb00020] text-[#ffb000] px-1 rounded">
                                                            🔧 +
                                                            {Math.round(
                                                                race.crewBonuses
                                                                    .repair *
                                                                    100,
                                                            )}
                                                            % ремонт
                                                        </span>
                                                    )}
                                                    {race.crewBonuses
                                                        .science && (
                                                        <span className="text-xs bg-[#00d4ff20] text-[#00d4ff] px-1 rounded">
                                                            🔬 +
                                                            {Math.round(
                                                                race.crewBonuses
                                                                    .science *
                                                                    100,
                                                            )}
                                                            % наука
                                                        </span>
                                                    )}
                                                    {race.crewBonuses
                                                        .combat && (
                                                        <span className="text-xs bg-[#ff004020] text-[#ff0040] px-1 rounded">
                                                            ⚔️ +
                                                            {Math.round(
                                                                race.crewBonuses
                                                                    .combat *
                                                                    100,
                                                            )}
                                                            % бой
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
                                                            % расход энергии
                                                        </span>
                                                    )}
                                                    {race.crewBonuses
                                                        .adaptation && (
                                                        <span className="text-xs bg-[#00ff4120] text-[#00ff41] px-1 rounded">
                                                            🌍 +
                                                            {Math.round(
                                                                race.crewBonuses
                                                                    .adaptation *
                                                                    100,
                                                            )}
                                                            % адаптация
                                                        </span>
                                                    )}
                                                    {race.crewBonuses
                                                        .fuelEfficiency && (
                                                        <span className="text-xs bg-[#9933ff20] text-[#9933ff] px-1 rounded">
                                                            ⛽ -
                                                            {Math.round(
                                                                race.crewBonuses
                                                                    .fuelEfficiency *
                                                                    100,
                                                            )}
                                                            % расход топлива
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    {selectedCrew.traits &&
                                        selectedCrew.traits.length > 0 && (
                                            <div>
                                                <span className="text-[#ffb000]">
                                                    Черты:
                                                </span>
                                                <br />
                                                {selectedCrew.traits.map(
                                                    (t) => (
                                                        <div
                                                            key={t.name}
                                                            className={
                                                                t.type ===
                                                                "negative"
                                                                    ? "text-[#ff0040]"
                                                                    : t.type ===
                                                                        "neutral"
                                                                      ? "text-[#888]"
                                                                      : "text-[#00ff41]"
                                                            }
                                                        >
                                                            {t.name}: {t.desc}
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        )}
                                    <div>
                                        <span className="text-[#ffb000]">
                                            Особенности:
                                        </span>
                                        <br />
                                        {PROFESSION_DESCRIPTIONS[
                                            selectedCrew.profession
                                        ] || "Специалист"}
                                    </div>

                                    {/* Fire crew button */}
                                    <div className="border-t border-[#ff0040] pt-4 mt-4">
                                        <Button
                                            onClick={() => {
                                                fireCrewMember(selectedCrew.id);
                                                setSelectedCrew(null);
                                            }}
                                            disabled={crew.length <= 1}
                                            className="bg-transparent border-2 border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810] uppercase tracking-wider w-full disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            🚪 ВЫГНАТЬ
                                        </Button>
                                        {crew.length <= 1 && (
                                            <div className="text-xs text-[#888] text-center mt-1">
                                                Нельзя уволить последнего члена
                                                экипажа
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
