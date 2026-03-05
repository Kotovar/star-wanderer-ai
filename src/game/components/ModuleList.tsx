"use client";

import { useState } from "react";
import { useGameStore } from "../store";
import { WEAPON_TYPES } from "../constants";
import type { Module, Weapon } from "../types";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MODULES_BY_LEVEL } from "./station/station-data";

const SEARCH_INFO = "иссл./ход";

// Получение описания модуля по типу и уровню из MODULES_BY_LEVEL
function getModuleDescription(module: Module): string | undefined {
    const moduleType = module.type;
    const level = module.level || 1;

    // Определяем уровень для сканера по scanRange
    if (moduleType === "scanner") {
        const scanRange = module.scanRange || 0;
        if (scanRange >= 15) return findModuleDescription("scanner", 4);
        if (scanRange >= 8) return findModuleDescription("scanner", 3);
        if (scanRange >= 5) return findModuleDescription("scanner", 2);
        return findModuleDescription("scanner", 1);
    }

    // Для особых модулей (уровень 4)
    if (level >= 4 || moduleType === "ai_core") {
        // Проверяем по имени для особых модулей
        const name = module.name || "";
        if (name.includes("Древний") || name.includes("★")) {
            return findModuleDescription(moduleType, 4);
        }
    }

    return findModuleDescription(moduleType, Math.min(level, 3));
}

function findModuleDescription(
    moduleType: string,
    level: number,
): string | undefined {
    const modules = MODULES_BY_LEVEL[level] || [];
    const found = modules.find((m) => m.moduleType === moduleType);
    return found?.description;
}

export function ModuleList() {
    const modules = useGameStore((s) => s.ship.modules);
    const [selectedModule, setSelectedModule] = useState<Module | null>(null);

    return (
        <>
            <div className="flex flex-col gap-2">
                {modules.map((module) => (
                    <ModuleCard
                        key={module.id}
                        module={module}
                        onClick={() => setSelectedModule(module)}
                    />
                ))}
            </div>

            <ModuleDetailDialog
                module={selectedModule}
                onClose={() => setSelectedModule(null)}
            />
        </>
    );
}

interface ModuleCardProps {
    module: Module;
    onClick: () => void;
}

function ModuleCard({ module, onClick }: ModuleCardProps) {
    // Get module tier name (МК-1, МК-2, etc.)
    const getModuleTier = () => {
        // Special handling for scanner - determine level by scanRange
        if (module.type === "scanner") {
            const scanRange = module.scanRange || 0;
            if (scanRange >= 15) return " (Квантовый)";
            if (scanRange >= 8) return " (МК-3)";
            if (scanRange >= 5) return " (МК-2)";
            if (scanRange >= 3) return " (МК-1)";
            return "";
        }

        if (!module.level) return "";
        // Cap display at level 4 (ancient)
        const displayLevel = Math.min(module.level, 4);
        if (displayLevel >= 4) return " (Древний)";
        return ` (МК-${displayLevel})`;
    };

    return (
        <div
            className={`bg-[rgba(0,255,65,0.05)] border p-2.5 text-xs cursor-pointer transition-all hover:bg-[rgba(0,255,65,0.1)] hover:shadow-[0_0_10px_rgba(0,255,65,0.5)] ${
                module.disabled || module.manualDisabled
                    ? "opacity-50 border-[#ff0040]"
                    : module.health <= 0
                      ? "border-[#ff0040] border-2"
                      : "border-[#00ff41]"
            }`}
            onClick={onClick}
        >
            <div className="text-[#00d4ff] font-bold">
                {module.name}
                {getModuleTier()}{" "}
                {module.width > 1 || module.height > 1
                    ? `[${module.width}x${module.height}]`
                    : ""}
            </div>

            <div className="text-[#00ff41] mt-1 flex gap-4 flex-wrap">
                <ModuleStats module={module} />
            </div>

            {module.type === "weaponbay" && module.weapons && (
                <WeaponsList weapons={module.weapons} />
            )}
        </div>
    );
}

interface ModuleStatsProps {
    module: Module;
}

function ModuleStats({ module }: ModuleStatsProps) {
    const artifactArmor = useGameStore((s) => {
        const artifact = s.artifacts.find(
            (a) => a.effect.type === "module_armor" && a.effect.active,
        );
        if (!artifact) return 0;
        return artifact.effect.value || 0;
    });

    return (
        <>
            {module.type === "reactor" && module.power && module.power > 0 && (
                <span>⚡ +{module.power}</span>
            )}
            {module.type !== "reactor" &&
                module.type !== "fueltank" &&
                module.consumption &&
                module.consumption > 0 && <span>⚡ -{module.consumption}</span>}
            {module.type === "fueltank" && <FuelStats />}
            {module.type === "cargo" &&
                module.capacity &&
                module.capacity > 0 && <span>📦 {module.capacity}т</span>}
            {module.type === "engine" && module.fuelEfficiency && (
                <span>⛽эф. {module.fuelEfficiency}</span>
            )}
            {module.type === "drill" && <span>⛏ Ур.{module.level || 1}</span>}
            {module.type === "scanner" &&
                module.scanRange &&
                module.scanRange > 0 && <span>📡 {module.scanRange}</span>}
            {module.type === "shield" &&
                module.shields &&
                module.shields > 0 && <span>🛡 Щиты: {module.shields}</span>}
            {/* Defense for all modules (not just shield) - for shields use level */}
            {module.defense !== undefined && module.defense > 0 && (
                <span>
                    🛡 Броня:{" "}
                    {module.type === "shield" ? module.level : module.defense}
                    {artifactArmor > 0 && ` (+${artifactArmor})`}
                </span>
            )}
            {module.type === "lifesupport" &&
                module.oxygen &&
                module.oxygen > 0 && <span>💨 {module.oxygen} сущ.</span>}
            {module.type === "lab" &&
                module.researchOutput &&
                module.researchOutput > 0 && (
                    <span>
                        🔬 {module.researchOutput} {SEARCH_INFO}
                    </span>
                )}
            <span>
                ❤{" "}
                {Math.min(
                    100,
                    Math.round(
                        (module.health / (module.maxHealth || 100)) * 100,
                    ),
                )}
                %
            </span>
            {(module.disabled || module.manualDisabled) && (
                <span className="text-[#ff0040]">⚠ ВЫКЛ</span>
            )}
        </>
    );
}

function FuelStats() {
    const fuel = useGameStore((s) => s.ship.fuel);
    const maxFuel = useGameStore((s) => s.ship.maxFuel);

    return (
        <span>
            ⛽ {fuel}/{maxFuel}
        </span>
    );
}

interface WeaponsListProps {
    weapons: (Weapon | null)[];
}

function WeaponsList({ weapons }: WeaponsListProps) {
    return (
        <div className="mt-2 pt-2 border-t border-[#00ff41]">
            {weapons.map((weapon, i) =>
                weapon ? (
                    <div
                        key={i}
                        className="bg-[rgba(0,0,0,0.3)] border p-1.5 mt-1.5 text-[11px]"
                        style={{
                            borderColor: WEAPON_TYPES[weapon.type].color,
                        }}
                    >
                        {WEAPON_TYPES[weapon.type].icon}{" "}
                        {WEAPON_TYPES[weapon.type].name} (
                        {WEAPON_TYPES[weapon.type].damage})
                    </div>
                ) : (
                    <div
                        key={i}
                        className="bg-[rgba(0,0,0,0.3)] border border-[#666] p-1.5 mt-1.5 text-[11px] text-[#888]"
                    >
                        Слот {i + 1}: пусто
                    </div>
                ),
            )}
        </div>
    );
}

interface ModuleDetailDialogProps {
    module: Module | null;
    onClose: () => void;
    isStationItem?: boolean; // True if viewing a module in shop (not owned yet)
}

export function ModuleDetailDialog({
    module,
    onClose,
    isStationItem = false,
}: ModuleDetailDialogProps) {
    const fuel = useGameStore((s) => s.ship.fuel);
    const maxFuel = useGameStore((s) => s.ship.maxFuel);
    const toggleModule = useGameStore((s) => s.toggleModule);

    if (!module) return null;

    // Check if level is valid (not NaN)
    const isValidLevel = module.level && !isNaN(module.level);

    // For station items (fueltank), use capacity instead of ship fuel
    const displayFuel =
        isStationItem && module.type === "fueltank"
            ? module.capacity || 0
            : fuel;
    const displayMaxFuel =
        isStationItem && module.type === "fueltank"
            ? module.capacity || 0
            : maxFuel;

    return (
        <Dialog open={!!module} onOpenChange={onClose}>
            <DialogContent className="bg-[rgba(10,20,30,0.95)] border-2 border-[#00ff41] text-[#00ff41] max-w-md w-[calc(100%-2rem)] md:w-auto">
                <DialogHeader>
                    <DialogTitle className="text-[#ffb000] font-['Orbitron']">
                        {module.name}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Информация о модуле корабля
                    </DialogDescription>
                    {/* Module level and size */}
                    <div className="flex gap-4 text-xs mt-2">
                        {isValidLevel && (
                            <span className="text-[#ffb000]">
                                ★ Уровень: {module.level}
                            </span>
                        )}
                        {(module.width || 0) > 1 || (module.height || 0) > 1 ? (
                            <span className="text-[#888]">
                                📐 Размер: {module.width}x{module.height}
                            </span>
                        ) : (
                            <span className="text-[#888]">📐 Размер: 1x1</span>
                        )}
                    </div>
                </DialogHeader>

                <div className="space-y-4">
                    <ModuleDetailedStats
                        module={module}
                        fuel={displayFuel}
                        maxFuel={displayMaxFuel}
                    />

                    {module.type === "scanner" && (
                        <ScannerDescription scanRange={module.scanRange} />
                    )}

                    {module.type === "weaponbay" && module.weapons && (
                        <WeaponsDetail weapons={module.weapons} />
                    )}

                    {/* Only show status and controls for owned modules */}
                    {!isStationItem && (
                        <>
                            <div>
                                <span className="text-[#ffb000]">Статус: </span>
                                <span
                                    className={
                                        module.disabled || module.manualDisabled
                                            ? "text-[#ff0040]"
                                            : module.health <= 0
                                              ? "text-[#ff0040]"
                                              : "text-[#00ff41]"
                                    }
                                >
                                    {module.disabled || module.manualDisabled
                                        ? "ОТКЛЮЧЁН"
                                        : module.health <= 0
                                          ? "ПОВРЕЖДЁН"
                                          : "АКТИВЕН"}
                                </span>
                            </div>

                            {module.health <= 0 && (
                                <div className="text-[11px] text-[#ff0040]">
                                    ⚠️ Модуль повреждён и не работает!
                                </div>
                            )}

                            <div className="text-[11px] text-[#888]">
                                ⚠ Отключение модуля сэкономит энергию, но
                                отключит его функции
                            </div>

                            <div className="flex gap-2 justify-center">
                                <Button
                                    onClick={() => {
                                        toggleModule(module.id);
                                        onClose();
                                    }}
                                    className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
                                >
                                    {module.disabled || module.manualDisabled
                                        ? "ВКЛЮЧИТЬ"
                                        : "ОТКЛЮЧИТЬ"}
                                </Button>
                            </div>
                        </>
                    )}
                    {isStationItem && (
                        <div className="text-[11px] text-[#888] text-center">
                            💰 Нажмите КУПИТЬ для приобретения
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface ModuleDetailedStatsProps {
    module: Module;
    fuel: number;
    maxFuel: number;
}

function ModuleDetailedStats({
    module,
    fuel,
    maxFuel,
}: ModuleDetailedStatsProps) {
    const description = getModuleDescription(module);
    const artifactArmor = useGameStore((s) => {
        const artifact = s.artifacts.find(
            (a) => a.effect.type === "module_armor" && a.effect.active,
        );
        if (!artifact) return 0;
        return artifact.effect.value || 0;
    });

    return (
        <div className="space-y-2">
            {/* Module purpose description from shop data */}
            {description && (
                <div className="text-[#888] text-xs">{description}</div>
            )}

            {module.type === "reactor" && module.power && module.power > 0 && (
                <div>
                    <span className="text-[#ffb000]">⚡ Генерация:</span> +
                    {module.power}
                </div>
            )}
            {module.type !== "reactor" &&
                module.type !== "fueltank" &&
                module.consumption &&
                module.consumption > 0 && (
                    <div>
                        <span className="text-[#ffb000]">⚡ Потребление:</span>{" "}
                        -{module.consumption}
                    </div>
                )}
            {module.type === "fueltank" && (
                <div>
                    <span className="text-[#ffb000]">⛽ Топливо:</span> {fuel}/
                    {maxFuel}
                </div>
            )}
            {module.type === "cargo" &&
                module.capacity &&
                module.capacity > 0 && (
                    <div>
                        <span className="text-[#ffb000]">📦 Вместимость:</span>{" "}
                        {module.capacity}т
                    </div>
                )}
            {module.type === "engine" && module.fuelEfficiency && (
                <div>
                    <span className="text-[#ffb000]">⛽ Эффективность:</span>{" "}
                    {module.fuelEfficiency} (чем меньше, тем лучше)
                </div>
            )}
            {module.type === "drill" && (
                <div>
                    <span className="text-[#ffb000]">⛏ Уровень бура:</span>{" "}
                    {module.level || 1} (для астероидов тир {module.level || 1})
                </div>
            )}
            {module.type === "scanner" &&
                module.scanRange &&
                module.scanRange > 0 && (
                    <>
                        <div>
                            <span className="text-[#ffb000]">★ Уровень:</span>{" "}
                            {module.scanRange >= 15
                                ? "Квантовый"
                                : module.scanRange >= 8
                                  ? "МК-3"
                                  : module.scanRange >= 5
                                    ? "МК-2"
                                    : "МК-1"}
                        </div>
                        <div>
                            <span className="text-[#ffb000]">
                                📡 Дальность сканирования:
                            </span>{" "}
                            {module.scanRange}
                        </div>
                    </>
                )}
            {module.type === "lab" && (
                <div>
                    <span className="text-[#ffb000]">🔬 Исследования:</span>{" "}
                    {module.researchOutput || 5} {SEARCH_INFO}
                </div>
            )}
            {module.type === "shield" &&
                module.shields &&
                module.shields > 0 && (
                    <div>
                        <span className="text-[#ffb000]">🛡 Щиты:</span>{" "}
                        {module.shields}
                    </div>
                )}
            {module.type === "lifesupport" &&
                module.oxygen &&
                module.oxygen > 0 && (
                    <div>
                        <span className="text-[#ffb000]">💨 Кислород:</span>{" "}
                        {module.oxygen} существ
                    </div>
                )}
            {/* Defense/Armor for all modules - for shields use level */}
            {module.defense !== undefined && module.defense > 0 && (
                <div>
                    <span className="text-[#ffb000]">🛡 Броня:</span>{" "}
                    {module.type === "shield" ? module.level : module.defense}
                    {artifactArmor > 0 && (
                        <span className="text-[#00d4ff]">
                            {" "}
                            (+{artifactArmor})
                        </span>
                    )}
                </div>
            )}
            <div>
                <span className="text-[#ffb000]">❤ Состояние:</span>{" "}
                {Math.min(
                    100,
                    Math.round(
                        (module.health / (module.maxHealth || 100)) * 100,
                    ),
                )}
                %
            </div>
        </div>
    );
}

function ScannerDescription({ scanRange }: { scanRange?: number }) {
    // Determine scanner level based on scanRange
    const getScannerLevel = () => {
        const range = scanRange || 0;
        if (range >= 15) return "Квантовый сканер";
        if (range >= 8) return "Сканер МК-3";
        if (range >= 5) return "Сканер МК-2";
        if (range >= 3) return "Сканер МК-1";
        return "Сканер";
    };

    return (
        <div className="mt-2 p-2 bg-[rgba(0,255,65,0.05)] border border-[#00ff41] text-xs">
            <div className="text-[#00d4ff] mb-1 font-bold">
                {getScannerLevel()}
            </div>
            <div className="text-[#00d4ff] mb-1">Функции сканера:</div>
            <ul className="text-[#888] space-y-1">
                <li>• Показывает информацию о локациях при наведении</li>
                <li>• Раскрывает истинную природу сигналов бедствия</li>
                {(scanRange || 0) >= 3 && <li>• Название и тип объекта</li>}
                {(scanRange || 0) >= 5 && <li>• Ресурсы и содержимое</li>}
                {(scanRange || 0) >= 8 && <li>• Скрытые награды ★</li>}
                {(scanRange || 0) >= 15 && (
                    <li>• Полная информация о всех объектах</li>
                )}
            </ul>
        </div>
    );
}

function WeaponsDetail({ weapons }: { weapons: (Weapon | null)[] }) {
    return (
        <div className="pt-4 border-t border-[#00ff41]">
            <div className="text-[#ffb000] mb-2">Слоты оружия:</div>
            {weapons.map((weapon, i) =>
                weapon ? (
                    <div
                        key={i}
                        className="p-2 my-2 bg-[rgba(0,255,65,0.05)] border"
                        style={{
                            borderColor: WEAPON_TYPES[weapon.type].color,
                        }}
                    >
                        {WEAPON_TYPES[weapon.type].icon}{" "}
                        {WEAPON_TYPES[weapon.type].name}{" "}
                        <span className="text-[#ff0040]">
                            ({WEAPON_TYPES[weapon.type].damage} урон)
                        </span>
                    </div>
                ) : (
                    <div
                        key={i}
                        className="p-2 my-2 bg-[rgba(100,100,100,0.05)] border border-[#444] text-[#888]"
                    >
                        Слот {i + 1}: Пусто
                    </div>
                ),
            )}
        </div>
    );
}
