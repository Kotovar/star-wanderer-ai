"use client";

import { useState } from "react";
import { useGameStore } from "../../store";
import { Button } from "@/components/ui/button";

interface ModuleInstallTabProps {
    onClose: () => void;
}

export function ModuleInstallTab({ onClose }: ModuleInstallTabProps) {
    const cargo = useGameStore((s) => s.ship.cargo);
    const modules = useGameStore((s) => s.ship.modules);
    const gridSize = useGameStore((s) => s.ship.gridSize);
    const installModuleFromCargo = useGameStore(
        (s) => s.installModuleFromCargo,
    );

    const [selectedCargoIndex, setSelectedCargoIndex] = useState<number | null>(
        null,
    );
    const [placementPreview, setPlacementPreview] = useState<{
        x: number;
        y: number;
    } | null>(null);

    const moduleCargo = cargo.filter((c) => c.isModule && c.module);

    const handleCellClick = (x: number, y: number) => {
        if (selectedCargoIndex === null) return;

        // Check if position is occupied
        const isOccupied = modules.some(
            (m) =>
                !m.disabled &&
                !m.manualDisabled &&
                m.health > 0 &&
                Math.abs(m.x - x) < (m.width || 2) &&
                Math.abs(m.y - y) < (m.height || 2),
        );

        if (isOccupied) {
            return;
        }

        setPlacementPreview({ x, y });
    };

    const handleInstall = () => {
        if (selectedCargoIndex === null || !placementPreview) return;

        installModuleFromCargo(
            selectedCargoIndex,
            placementPreview.x,
            placementPreview.y,
        );
        setSelectedCargoIndex(null);
        setPlacementPreview(null);
    };

    const isPositionOccupied = (x: number, y: number) => {
        return modules.some(
            (m) =>
                !m.disabled &&
                !m.manualDisabled &&
                m.health > 0 &&
                Math.abs(m.x - x) < (m.width || 2) &&
                Math.abs(m.y - y) < (m.height || 2),
        );
    };

    return (
        <div className="space-y-4">
            <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
                ▸ УСТАНОВКА МОДУЛЕЙ
            </div>

            <div className="text-sm text-[#888]">
                Выберите модуль из трюма и разместите его на сетке корабля
            </div>

            {/* Module cargo list */}
            {moduleCargo.length > 0 ? (
                <div className="space-y-2">
                    <div className="text-sm text-[#00ff41]">
                        📦 Модули в трюме:
                    </div>
                    <div className="grid gap-2 max-h-40 overflow-y-auto">
                        {moduleCargo.map((item, idx) => (
                            <div
                                key={idx}
                                className={`border p-2 cursor-pointer ${
                                    selectedCargoIndex === idx
                                        ? "border-[#ff00ff] bg-[rgba(255,0,255,0.1)]"
                                        : "border-[#888] hover:border-[#00ff41]"
                                }`}
                                onClick={() => {
                                    setSelectedCargoIndex(idx);
                                    setPlacementPreview(null);
                                }}
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-[#00ff41]">
                                        {item.item}
                                    </span>
                                    <span className="text-xs text-[#888]">
                                        Ур.{item.moduleLevel || 4} | 2x2
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-sm text-[#888] italic">
                    В трюме нет модулей для установки
                </div>
            )}

            {/* Ship grid */}
            <div className="mt-4">
                <div className="text-sm text-[#00ff41] mb-2">
                    🔧 Сетка корабля (кликните для размещения):
                </div>
                <div
                    className="grid gap-1"
                    style={{
                        gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                        width: "fit-content",
                    }}
                >
                    {Array.from({ length: gridSize * gridSize }).map(
                        (_, idx) => {
                            const x = idx % gridSize;
                            const y = Math.floor(idx / gridSize);
                            const occupied = isPositionOccupied(x, y);
                            const isPreview =
                                placementPreview &&
                                placementPreview.x === x &&
                                placementPreview.y === y;

                            return (
                                <div
                                    key={idx}
                                    className={`w-8 h-8 border flex items-center justify-center text-xs cursor-pointer ${
                                        occupied
                                            ? "bg-[#555] border-[#888]"
                                            : isPreview
                                              ? "bg-[rgba(255,0,255,0.3)] border-[#ff00ff]"
                                              : "bg-[rgba(0,255,65,0.05)] border-[#00ff41] hover:bg-[rgba(0,255,65,0.2)]"
                                    }`}
                                    onClick={() => handleCellClick(x, y)}
                                >
                                    {occupied ? "■" : `${x},${y}`}
                                </div>
                            );
                        },
                    )}
                </div>
            </div>

            {/* Install button */}
            {selectedCargoIndex !== null && placementPreview && (
                <div className="flex gap-2 mt-4">
                    <Button
                        onClick={handleInstall}
                        className="flex-1 bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810]"
                    >
                        ✅ Установить модуль
                    </Button>
                    <Button
                        onClick={() => {
                            setSelectedCargoIndex(null);
                            setPlacementPreview(null);
                        }}
                        className="flex-1 bg-transparent border-2 border-[#888] text-[#888] hover:bg-[#888] hover:text-[#050810]"
                    >
                        Отмена
                    </Button>
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-[#888]">
                <Button
                    onClick={onClose}
                    className="w-full bg-transparent border-2 border-[#ffb000] text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810]"
                >
                    ЗАКРЫТЬ
                </Button>
            </div>
        </div>
    );
}
