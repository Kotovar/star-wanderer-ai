"use client";

import { useState } from "react";
import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EnemyModuleGrid, ShipStatusCard } from "./EnemyModuleGrid";
import { CrewMemberCard } from "./CrewMemberCard";
import type { CrewMember } from "../types";

export function CombatPanel() {
    const currentCombat = useGameStore((s) => s.currentCombat);
    const ship = useGameStore((s) => s.ship);
    const crew = useGameStore((s) => s.crew);
    const getTotalDamage = useGameStore((s) => s.getTotalDamage);
    const selectEnemyModule = useGameStore((s) => s.selectEnemyModule);
    const attackEnemy = useGameStore((s) => s.attackEnemy);
    const retreat = useGameStore((s) => s.retreat);
    const moveCrewMember = useGameStore((s) => s.moveCrewMember);
    const assignCombatTask = useGameStore((s) => s.assignCombatTask);
    const isModuleAdjacent = useGameStore((s) => s.isModuleAdjacent);

    const [selectedCrew, setSelectedCrew] = useState<CrewMember | null>(null);

    const weaponBays = ship.modules.filter(
        (m) => m.type === "weaponbay" && !m.disabled && m.health > 0,
    );
    const hasWeaponBay =
        weaponBays.length > 0 &&
        weaponBays.some((wb) => wb.weapons && wb.weapons.some((w) => w));
    const gunnerInWeaponBay = crew.find(
        (c) =>
            weaponBays.some((wb) => wb.id === c.moduleId) &&
            (c.profession === "gunner" ||
                (c.profession === "pilot" && c.assignment === "targeting")),
    );
    const hasGunner = !!gunnerInWeaponBay;
    const canAttack = hasWeaponBay;

    const pDmg = getTotalDamage();
    const actualDamage = hasGunner ? pDmg.total : Math.floor(pDmg.total * 0.5);
    const isBoss = currentCombat?.enemy.isBoss || false;

    const getAdjacentModules = (moduleId: number) => {
        return ship.modules.filter(
            (m) =>
                m.id !== moduleId &&
                !m.disabled &&
                m.health > 0 &&
                isModuleAdjacent(moduleId, m.id),
        );
    };

    if (!currentCombat) return null;

    const eDmg = currentCombat.enemy.modules.reduce(
        (s, m) => s + (m.damage || 0),
        0,
    );
    const eDef = currentCombat.enemy.modules.reduce(
        (s, m) => s + (m.defense || 0),
        0,
    );
    const eHP = currentCombat.enemy.modules.reduce((s, m) => s + m.health, 0);
    const eMaxHP = currentCombat.enemy.modules.reduce(
        (s, m) => s + (m.maxHealth || 100),
        0,
    );

    return (
        <div className="flex flex-col gap-4">
            <div
                className={`font-['Orbitron'] font-bold text-lg ${isBoss ? "text-[#ff00ff]" : "text-[#ffb000]"}`}
            >
                {isBoss ? "⚠️ БОСС: " : "▸ БОЙ С "}
                {currentCombat.enemy.name.toUpperCase()}
            </div>

            {!hasWeaponBay && (
                <div className="bg-[rgba(255,0,64,0.1)] border border-[#ff0040] p-2 text-sm text-[#ff0040]">
                    ⚠️ Нет оружейной палубы или оружия! Невозможно атаковать.
                </div>
            )}
            {hasWeaponBay && !hasGunner && (
                <div className="bg-[rgba(255,170,0,0.1)] border border-[#ffaa00] p-2 text-sm text-[#ffaa00]">
                    ⚠️ Нет канонира! Урон -50%, цель выбирается случайно.
                </div>
            )}

            {isBoss && currentCombat.enemy.specialAbility && (
                <BossAbilityCard ability={currentCombat.enemy.specialAbility} />
            )}

            <div className="grid grid-cols-2 gap-5 my-2">
                <ShipStatusCard
                    title="ВАШ КОРАБЛЬ"
                    shields={ship.shields}
                    maxShields={ship.maxShields}
                    armor={ship.armor}
                    damage={actualDamage}
                    hasGunner={hasGunner}
                >
                    {gunnerInWeaponBay && (
                        <div className="text-xs text-[#00ff41] mt-1">
                            🎯 Наводчик: {gunnerInWeaponBay.name}
                        </div>
                    )}
                </ShipStatusCard>

                <ShipStatusCard
                    title={currentCombat.enemy.name}
                    shields={currentCombat.enemy.shields}
                    maxShields={currentCombat.enemy.maxShields}
                    armor={eHP}
                    damage={eDmg}
                    isEnemy
                    isBoss={isBoss}
                >
                    <div className="my-2">
                        Корпус: {eHP}/{eMaxHP}
                        <Progress
                            value={(eHP / eMaxHP) * 100}
                            className={`h-2 mt-1 bg-[rgba(0,0,0,0.5)] ${isBoss ? "[&>div]:bg-[#ff00ff]" : "[&>div]:bg-[#ff0040]"}`}
                        />
                    </div>
                    <div>🛡 Защита: {eDef}</div>
                </ShipStatusCard>
            </div>

            <div
                className={`${isBoss ? "border-[#ff00ff]" : "border-[#ff0040]"} border p-2`}
            >
                <div
                    className={`text-sm font-bold mb-2 ${isBoss ? "text-[#ff00ff]" : "text-[#ff0040]"}`}
                >
                    КОРАБЛЬ ВРАГА{" "}
                    {hasGunner
                        ? "(кликните для выбора цели)"
                        : "(цель выбирается случайно)"}
                </div>
                <EnemyModuleGrid
                    currentCombat={currentCombat}
                    isBoss={isBoss}
                    onModuleClick={selectEnemyModule}
                    hasGunner={hasGunner}
                />
            </div>

            <CombatActions
                canAttack={canAttack}
                hasGunner={hasGunner}
                onAttack={attackEnemy}
                onRetreat={retreat}
            />

            <CrewManagement
                crew={crew}
                ship={ship}
                selectedCrew={selectedCrew}
                onSelectCrew={setSelectedCrew}
                onMoveCrew={moveCrewMember}
                assignCombatTask={assignCombatTask}
                getAdjacentModules={getAdjacentModules}
            />

            {isBoss && (
                <div className="mt-2 text-center text-sm text-[#ffaa00]">
                    ⚠️ Победа гарантирует артефакт!
                </div>
            )}
        </div>
    );
}

interface BossAbilityCardProps {
    ability: { name: string; description: string };
    regenRate?: number;
}

function BossAbilityCard({ ability, regenRate }: BossAbilityCardProps) {
    return (
        <div className="bg-[rgba(255,0,255,0.1)] border border-[#ff00ff] p-3 text-sm">
            <div className="text-[#ff00ff] font-bold mb-1">
                ★ {ability.name}
            </div>
            <div className="text-[#cccccc]">{ability.description}</div>
            {regenRate && (
                <div className="text-[#ffaa00] mt-1">
                    ⚙️ Регенерация: +{regenRate}% за ход
                </div>
            )}
        </div>
    );
}

interface CombatActionsProps {
    canAttack: boolean;
    hasGunner: boolean;
    onAttack: () => void;
    onRetreat: () => void;
}

function CombatActions({
    canAttack,
    hasGunner,
    onAttack,
    onRetreat,
}: CombatActionsProps) {
    return (
        <div className="flex gap-2.5">
            <Button
                disabled={!canAttack}
                onClick={onAttack}
                className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {hasGunner ? "АТАКОВАТЬ" : "АТАКОВАТЬ (случайная цель)"}
            </Button>
            <Button
                onClick={() => useGameStore.getState().skipTurn()}
                className="bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider"
            >
                ПРОПУСТИТЬ ХОД
            </Button>
            <Button
                variant="destructive"
                onClick={onRetreat}
                className="bg-transparent border-2 border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810] uppercase tracking-wider"
            >
                ОТСТУПИТЬ
            </Button>
        </div>
    );
}

interface CrewManagementProps {
    crew: CrewMember[]; // eslint-disable-line no-unused-vars
    ship: ReturnType<typeof useGameStore.getState>["ship"];
    selectedCrew: CrewMember | null;
    onSelectCrew: () => void;
    onMoveCrew: (_crewId: number, _moduleId: number) => void; // eslint-disable-line no-unused-vars
    assignCombatTask: (
        _crewId: number, // eslint-disable-line no-unused-vars
        _task: string, // eslint-disable-line no-unused-vars
        _effect: string | null, // eslint-disable-line no-unused-vars
    ) => void;
    getAdjacentModules: (
        _moduleId: number, // eslint-disable-line no-unused-vars
    ) => ReturnType<typeof useGameStore.getState>["ship"]["modules"];
}

function CrewManagement({
    crew,
    ship,
    selectedCrew,
    onSelectCrew,
    onMoveCrew,
    assignCombatTask,
    getAdjacentModules,
}: CrewManagementProps) {
    return (
        <div className="border-t border-[#00ff41] pt-3 mt-2">
            <div className="text-[#ffb000] font-bold mb-2 text-sm">
                ▸ УПРАВЛЕНИЕ ЭКИПАЖЕМ
            </div>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {crew.map((c) => {
                    const currentModule = ship.modules.find(
                        (m) => m.id === c.moduleId,
                    );
                    const adjacentModules = getAdjacentModules(c.moduleId);
                    const isSelected = selectedCrew?.id === c.id;

                    return (
                        <CrewMemberCard
                            key={c.id}
                            crewMember={c}
                            module={currentModule}
                            adjacentModules={adjacentModules}
                            isSelected={isSelected}
                            onSelect={() => onSelectCrew()}
                            onMove={onMoveCrew}
                            onAssignTask={(id, task) =>
                                assignCombatTask(id, task, null)
                            }
                            isCombat={true}
                        />
                    );
                })}
            </div>
        </div>
    );
}
