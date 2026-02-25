"use client";

import { useState } from "react";
import { useGameStore } from "../store";
import { WEAPON_TYPES } from "../constants";
import type { Module, Weapon } from "../types";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
            className={`bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-2.5 text-xs cursor-pointer transition-all hover:bg-[rgba(0,255,65,0.1)] hover:shadow-[0_0_10px_rgba(0,255,65,0.5)] ${
                module.disabled ? "opacity-50 border-[#ff0040]" : ""
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
                module.defense &&
                module.defense > 0 && <span>🛡 {module.defense}</span>}
            {/* Defense for all modules (not just shield) */}
            {module.type !== "shield" &&
                module.defense &&
                module.defense > 0 && <span>🛡 {module.defense}</span>}
            {(module.type === "lifesupport" || module.type === "habitat") &&
                module.oxygen &&
                module.oxygen > 0 && <span>💨 {module.oxygen} сущ.</span>}
            <span>❤ {module.health}%</span>
            {module.disabled && <span className="text-[#ff0040]">⚠ ВЫКЛ</span>}
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

    return (
        <Dialog open={!!module} onOpenChange={onClose}>
            <DialogContent
                className="bg-[rgba(10,20,30,0.95)] border-2 border-[#00ff41] text-[#00ff41] max-w-md"
                aria-describedby="dialog-desc"
            >
                <DialogHeader>
                    <DialogTitle className="text-[#ffb000] font-['Orbitron']">
                        {module.name}
                    </DialogTitle>
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
                        fuel={fuel}
                        maxFuel={maxFuel}
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
                                        module.disabled
                                            ? "text-[#ff0040]"
                                            : "text-[#00ff41]"
                                    }
                                >
                                    {module.disabled ? "ОТКЛЮЧЁН" : "АКТИВЕН"}
                                </span>
                            </div>

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
                                    {module.disabled ? "ВКЛЮЧИТЬ" : "ОТКЛЮЧИТЬ"}
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
    return (
        <div className="space-y-2">
            {/* Module purpose descriptions */}
            {module.type === "cockpit" && (
                <div className="text-[#888] text-xs">
                    🎯 Кабина пилота — управление кораблём и навигация
                </div>
            )}
            {module.type === "reactor" && (
                <div className="text-[#888] text-xs">
                    ⚡ Реактор — генерация энергии для всех систем корабля
                </div>
            )}
            {module.type === "engine" && (
                <div className="text-[#888] text-xs">
                    🚀 Двигатель — перемещение между секторами галактики
                </div>
            )}
            {module.type === "fueltank" && (
                <div className="text-[#888] text-xs">
                    ⛽ Топливный бак — хранение топлива для двигателей
                </div>
            )}
            {module.type === "shield" && (
                <div className="text-[#888] text-xs">
                    🛡 Щитовой генератор — защита от вражеского огня
                </div>
            )}
            {module.type === "weaponbay" && (
                <div className="text-[#888] text-xs">
                    ⚔ Оружейная палуба — размещение бортового оружия
                </div>
            )}
            {module.type === "cargo" && (
                <div className="text-[#888] text-xs">
                    📦 Грузовой отсек — хранение товаров и ресурсов
                </div>
            )}
            {module.type === "scanner" && (
                <div className="text-[#888] text-xs">
                    📡 Сканер — обнаружение объектов и аномалий
                </div>
            )}
            {module.type === "lifesupport" && (
                <div className="text-[#888] text-xs">
                    💚 Жизнеобеспечение — поддержка жизни экипажа
                </div>
            )}
            {module.type === "habitat" && (
                <div className="text-[#888] text-xs">
                    🏠 Жилой модуль — дополнительные места для экипажа
                </div>
            )}
            {module.type === "medical" && (
                <div className="text-[#888] text-xs">
                    🏥 Медотсек — лечение и восстановление экипажа
                </div>
            )}
            {module.type === "drill" && (
                <div className="text-[#888] text-xs">
                    ⛏ Бур — добыча ресурсов из астероидов
                </div>
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
            {module.type === "shield" &&
                module.defense &&
                module.defense > 0 && (
                    <div>
                        <span className="text-[#ffb000]">🛡 Защита щитов:</span>{" "}
                        {module.defense}
                    </div>
                )}
            {(module.type === "lifesupport" || module.type === "habitat") &&
                module.oxygen &&
                module.oxygen > 0 && (
                    <div>
                        <span className="text-[#ffb000]">💨 Кислород:</span>{" "}
                        {module.oxygen} существ
                    </div>
                )}
            {/* Defense/Armor for all modules */}
            {module.defense !== undefined && module.defense > 0 && (
                <div>
                    <span className="text-[#ffb000]">🛡 Защита:</span>{" "}
                    {module.defense}
                </div>
            )}
            <div>
                <span className="text-[#ffb000]">❤ Состояние:</span>{" "}
                {module.health}%
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
