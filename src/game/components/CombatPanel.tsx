"use client";

import { useState } from "react";
import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CombatShipVisual } from "./CombatShipVisual";
import { CombatShipGrid } from "./CombatShipGrid";
import { CrewMemberCard } from "./CrewMemberCard";
import type { CrewMember, CrewMemberCombatAssignment } from "../types";
import { getTotalEvasion } from "@/game/slices";
import { useTranslation } from "@/lib/useTranslation";

export function CombatPanel() {
    const { t } = useTranslation();
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
    const [zoomLevel, setZoomLevel] = useState<number>(1); // 0.5 = 50%, 1 = 100%

    const weaponBays = ship.modules.filter(
        (m) => m.type === "weaponbay" && !m.disabled && m.health > 0,
    );
    const hasWeaponBay =
        weaponBays.length > 0 &&
        weaponBays.some((wb) => wb.weapons && wb.weapons.some((w) => w));

    // Проверяем, есть ли стрелок с заданием "прицеливание"
    const gunnerWithTargeting = crew.find(
        (c) =>
            weaponBays.some((wb) => wb.id === c.moduleId) &&
            c.profession === "gunner" &&
            c.combatAssignment === "targeting",
    );

    // Есть ли просто стрелок в оружейной (без прицеливания)
    const gunnerInWeaponBay = crew.find(
        (c) =>
            weaponBays.some((wb) => wb.id === c.moduleId) &&
            (c.profession === "gunner" ||
                (c.profession === "pilot" &&
                    (c.combatAssignment === "targeting" ||
                        c.assignment === "targeting"))),
    );

    const hasGunner = !!gunnerInWeaponBay;
    const hasTargetingGunner = !!gunnerWithTargeting;
    const canAttack = hasWeaponBay;

    const pDmg = getTotalDamage();
    const actualDamage = pDmg.total;
    const isBoss = currentCombat?.enemy.isBoss || false;

    // Calculate evasion chance (in combat - includes combat assignment bonus)
    const evasionChance = getTotalEvasion(useGameStore.getState());

    const getAdjacentModules = (moduleId: number) => {
        return ship.modules.filter(
            (m) =>
                m.id !== moduleId &&
                !m.manualDisabled &&
                isModuleAdjacent(moduleId, m.id),
        );
    };

    if (!currentCombat) return null;

    // Calculate enemy stats from ALIVE modules only (health > 0)
    const eDmg = currentCombat.enemy.modules.reduce(
        (s, m) => s + (m.health > 0 ? m.damage || 0 : 0),
        0,
    );
    const eDef = currentCombat.enemy.modules.reduce(
        (s, m) => s + (m.health > 0 ? m.defense || 0 : 0),
        0,
    );
    const eHP = currentCombat.enemy.modules.reduce((s, m) => s + m.health, 0);
    const eMaxHP = currentCombat.enemy.modules.reduce(
        (s, m) => s + (m.maxHealth || 100),
        0,
    );

    // Player hull stats
    const playerMaxHP = ship.modules.reduce(
        (s, m) => s + (m.maxHealth || m.health),
        0,
    );
    const playerHP = ship.modules.reduce((s, m) => s + m.health, 0);
    const playerDefense = ship.armor; // Total defense from all modules

    return (
        <div className="flex flex-col gap-4 max-h-[82vh] overflow-y-auto pr-2">
            <div
                className={`font-['Orbitron'] font-bold text-lg ${isBoss ? "text-[#ff00ff]" : "text-[#ffb000]"}`}
            >
                {isBoss ? t("combat.boss_title") : t("combat.fight_title")}
                {currentCombat.enemy.name.toUpperCase()}
            </div>

            {!hasWeaponBay && (
                <div className="bg-[rgba(255,0,64,0.1)] border border-[#ff0040] p-2 text-sm text-[#ff0040]">
                    {t("combat.no_weapon_bay")}
                </div>
            )}
            {hasWeaponBay && !hasGunner && (
                <div className="bg-[rgba(255,170,0,0.1)] border border-[#ffaa00] p-2 text-sm text-[#ffaa00]">
                    {t("combat.no_gunner")}
                </div>
            )}

            {isBoss && currentCombat.enemy.specialAbility && (
                <BossAbilityCard
                    ability={currentCombat.enemy.specialAbility}
                    regenRate={currentCombat.enemy.regenRate}
                    t={t}
                />
            )}

            {/* Ship stats summary */}
            <div className="grid grid-cols-2 gap-4 my-3">
                <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-4">
                    <div className="text-base font-bold mb-3 text-[#00d4ff]">
                        {t("combat.your_ship")}
                    </div>
                    <div className="text-sm space-y-2">
                        <div className="text-[#00ff41]">
                            {t("ship_stats.damage")} {actualDamage}{" "}
                        </div>
                        <div>
                            {t("ship_stats.shields")} {ship.shields}/
                            {ship.maxShields}
                            <div className="h-2 rounded-full mt-1 bg-[rgba(0,0,0,0.5)] relative">
                                <div
                                    className="absolute rounded-full top-0 left-0 h-full bg-[#0080ff]"
                                    style={{
                                        width: `${(ship.shields / Math.max(1, ship.maxShields)) * 100}%`,
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            {t("combat.hull")} {playerHP}/{playerMaxHP}
                            <Progress
                                value={
                                    (playerHP / Math.max(1, playerMaxHP)) * 100
                                }
                                className="h-2 mt-1 bg-[rgba(0,0,0,0.5)] [&>div]:bg-[#00ff41]"
                            />
                        </div>
                        <div>
                            {t("combat.defense")} {playerDefense}
                        </div>
                        <div className="text-xs text-[#00ff41]">
                            {t("combat.evasion")} {evasionChance}%
                        </div>
                        {gunnerInWeaponBay && (
                            <div className="text-xs text-[#00ff41]">
                                {t("combat.gunner")} {gunnerInWeaponBay.name}
                            </div>
                        )}
                    </div>
                </div>

                <div
                    className={`${isBoss ? "bg-[rgba(255,0,255,0.05)] border-[#ff00ff]" : "bg-[rgba(255,0,64,0.05)] border-[#ff0040]"} border p-4`}
                >
                    <div
                        className={`text-base font-bold mb-3 ${isBoss ? "text-[#ff00ff]" : "text-[#ff0040]"}`}
                    >
                        {currentCombat.enemy.name}
                    </div>
                    <div className="text-sm space-y-2">
                        <div>
                            {t("ship_stats.damage")} {eDmg}
                        </div>
                        <div>
                            {t("combat.shields")}{" "}
                            {currentCombat.enemy.shields || 0}/
                            {currentCombat.enemy.maxShields || 0}
                            <div className="h-2 rounded-full mt-1 bg-[rgba(0,0,0,0.5)] relative">
                                <div
                                    className={`absolute rounded-full top-0 left-0 h-full ${isBoss ? "bg-[#ff00ff]" : "bg-[#ff0040]"}`}
                                    style={{
                                        width: `${Math.min(100, Math.max(0, ((currentCombat.enemy.shields || 0) / Math.max(1, currentCombat.enemy.maxShields || 0)) * 100))}%`,
                                    }}
                                />
                            </div>
                        </div>
                        <div>
                            {t("combat.hull")} {eHP}/{eMaxHP}
                            <Progress
                                value={(eHP / eMaxHP) * 100}
                                className={`h-2 mt-1 bg-[rgba(0,0,0,0.5)] ${isBoss ? "[&>div]:bg-[#ff00ff]" : "[&>div]:bg-[#ff0040]"}`}
                            />
                        </div>
                        <div>
                            {t("combat.defense")} {eDef}
                        </div>
                    </div>
                </div>
            </div>
            <CombatActions
                canAttack={canAttack}
                hasGunner={hasGunner}
                hasTargetingGunner={hasTargetingGunner}
                onAttack={attackEnemy}
                onRetreat={retreat}
                t={t}
            />
            {/* Ship visuals - side by side */}
            <div className="grid grid-cols-2 gap-4 my-2 items-start">
                <div className="flex flex-col items-center">
                    <div className="text-base font-bold mb-4 px-4 py-2 rounded bg-[rgba(0,255,65,0.2)] text-[#00d4ff] min-h-11 flex items-center justify-center">
                        {t("combat.your_ship")}
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <Button
                            onClick={() =>
                                setZoomLevel((z) => Math.max(0.5, z - 0.1))
                            }
                            disabled={zoomLevel <= 0.5}
                            className="cursor-pointer bg-[#0a0f1a] border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] w-8 h-8 p-0 text-lg disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Уменьшить"
                        >
                            −
                        </Button>
                        <span className="text-[#00ff41] text-xs w-12 text-center">
                            {Math.round(zoomLevel * 100)}%
                        </span>
                        <Button
                            onClick={() =>
                                setZoomLevel((z) => Math.min(1, z + 0.1))
                            }
                            disabled={zoomLevel >= 1}
                            className="cursor-pointer bg-[#0a0f1a] border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] w-8 h-8 p-0 text-lg disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Увеличить"
                        >
                            +
                        </Button>
                    </div>
                    <CombatShipGrid scale={zoomLevel} />
                </div>
                <div className="flex flex-col items-center">
                    <div className="text-base font-bold mb-4 px-4 py-2 rounded bg-[rgba(255,0,64,0.2)] text-[#ff0040] min-h-11 flex items-center justify-center">
                        {t("combat.enemy_ship")} — {currentCombat.enemy.name}
                    </div>
                    <div className="flex items-center gap-2 h-11"></div>
                    <CombatShipVisual
                        modules={currentCombat.enemy.modules}
                        crew={[]}
                        isEnemy={true}
                        isBoss={isBoss}
                        onModuleClick={
                            hasTargetingGunner
                                ? (moduleId) => {
                                      selectEnemyModule(moduleId);
                                      // Сразу атакуем после выбора цели
                                      setTimeout(() => attackEnemy(), 50);
                                  }
                                : selectEnemyModule
                        }
                        canSelectTarget={hasGunner}
                        title=""
                    />
                </div>
            </div>

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
                    {t("combat.boss_artifact_guaranteed")}
                </div>
            )}
        </div>
    );
}

interface BossAbilityCardProps {
    ability: { name: string; description: string };
    regenRate?: number;
    t?: (key: string) => string;
}

function BossAbilityCard({ ability, regenRate, t }: BossAbilityCardProps) {
    return (
        <div className="bg-[rgba(255,0,255,0.1)] border border-[#ff00ff] p-3 text-sm">
            <div className="text-[#ff00ff] font-bold mb-1">
                ★ {ability.name}
            </div>
            <div className="text-[#cccccc]">{ability.description}</div>
            {regenRate && t && (
                <div className="text-[#ffaa00] mt-1">
                    {t("combat.regen").replace("{{rate}}", String(regenRate))}
                </div>
            )}
        </div>
    );
}

interface CombatActionsProps {
    canAttack: boolean;
    hasGunner: boolean;
    hasTargetingGunner: boolean;
    onAttack: () => void;
    onRetreat: () => void;
    t: (key: string) => string;
}

function CombatActions({
    canAttack,
    hasGunner,
    hasTargetingGunner,
    onAttack,
    onRetreat,
    t,
}: CombatActionsProps) {
    // Если есть стрелок с прицеливанием - кнопка не нужна (автоматическая атака)
    if (hasTargetingGunner) {
        return (
            <div className="flex gap-2.5 flex-col sm:flex-row">
                <div className="bg-[rgba(0,255,65,0.1)] border border-[#00ff41] p-3 text-sm text-[#00ff41] w-full text-center">
                    {t("combat.auto_attack_active")}
                </div>
                <Button
                    onClick={() => useGameStore.getState().skipTurn()}
                    className="cursor-pointer bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider w-full sm:w-auto"
                >
                    {t("combat.skip_turn")}
                </Button>
                <Button
                    variant="destructive"
                    onClick={onRetreat}
                    className="cursor-pointer bg-transparent border-2 border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810] uppercase tracking-wider w-full sm:w-auto"
                >
                    {t("combat.retreat")}
                </Button>
            </div>
        );
    }

    return (
        <div className="flex gap-2.5 flex-col sm:flex-row">
            <Button
                disabled={!canAttack}
                onClick={onAttack}
                className="cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
                {hasGunner ? t("combat.attack") : t("combat.attack_random")}
            </Button>
            <Button
                onClick={() => useGameStore.getState().skipTurn()}
                className="cursor-pointer bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] uppercase tracking-wider w-full sm:w-auto"
            >
                {t("combat.skip_turn")}
            </Button>
            <Button
                variant="destructive"
                onClick={onRetreat}
                className="cursor-pointer bg-transparent border-2 border-[#ff0040] text-[#ff0040] hover:bg-[#ff0040] hover:text-[#050810] uppercase tracking-wider w-full sm:w-auto"
            >
                {t("combat.retreat")}
            </Button>
        </div>
    );
}

interface CrewManagementProps {
    crew: CrewMember[];
    ship: ReturnType<typeof useGameStore.getState>["ship"];
    selectedCrew: CrewMember | null;
    onSelectCrew: (crew: CrewMember | null) => void;
    onMoveCrew: (_crewId: number, _moduleId: number) => void;
    assignCombatTask: (
        crewId: number,
        task: CrewMemberCombatAssignment,
        effect: string,
    ) => void;
    getAdjacentModules: (
        _moduleId: number,
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
    const { t } = useTranslation();
    return (
        <div className="border-t border-[#00ff41] pt-3 mt-2">
            <div className="text-[#ffb000] font-bold mb-2 text-sm">
                {t("combat.crew_control")}
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
                            onSelect={() => onSelectCrew(isSelected ? null : c)}
                            onMove={onMoveCrew}
                            onAssignTask={(id, task) =>
                                assignCombatTask(id, task, "")
                            }
                            isCombat={true}
                        />
                    );
                })}
            </div>
        </div>
    );
}
