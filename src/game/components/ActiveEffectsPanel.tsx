"use client";

import { useGameStore } from "../store";
import { RACES } from "../constants/races";
import { Button } from "@/components/ui/button";

interface ActiveEffectsPanelProps {
    onClose: () => void;
}

export function ActiveEffectsPanel({ onClose }: ActiveEffectsPanelProps) {
    const activeEffects = useGameStore((s) => s.activeEffects);

    if (activeEffects.length === 0) {
        return (
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
                        ▸ Активные эффекты
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[#ff0040] hover:text-white text-2xl font-bold cursor-pointer px-2"
                    >
                        ✕
                    </button>
                </div>
                <div className="text-sm text-[#888] text-center py-8">
                    Нет активных эффектов
                </div>
                <Button
                    onClick={onClose}
                    className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider"
                >
                    ЗАКРЫТЬ
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div className="font-['Orbitron'] font-bold text-lg text-[#ffb000]">
                    ▸ Активные эффекты
                </div>
                <button
                    onClick={onClose}
                    className="text-[#ff0040] hover:text-white text-2xl font-bold cursor-pointer px-2"
                >
                    ✕
                </button>
            </div>
            <div className="text-xs text-[#888] mb-2">
                Эффекты длятся 5 ходов и автоматически истекают
            </div>

            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto">
                {activeEffects.map((effect) => {
                    const race = RACES[effect.raceId];
                    return (
                        <div
                            key={effect.id}
                            className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-3"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">
                                        {race?.icon}
                                    </span>
                                    <div>
                                        <div
                                            className="font-bold text-sm"
                                            style={{ color: race?.color }}
                                        >
                                            {effect.name}
                                        </div>
                                        <div className="text-[10px] text-[#888]">
                                            {race?.pluralName}
                                        </div>
                                    </div>
                                </div>
                                <div
                                    className={`text-xs px-2 py-1 rounded ${
                                        effect.turnsRemaining <= 2
                                            ? "bg-[rgba(255,0,64,0.2)] text-[#ff0040]"
                                            : "bg-[rgba(0,255,65,0.2)] text-[#00ff41]"
                                    }`}
                                >
                                    ⏱️ {effect.turnsRemaining} ход(а)
                                </div>
                            </div>

                            <div className="text-xs text-[#888] mb-2">
                                {effect.description}
                            </div>

                            <div className="space-y-1">
                                {effect.effects.map((ef, idx) => (
                                    <div
                                        key={idx}
                                        className="text-[11px] text-[#00ff41]"
                                    >
                                        ✓ {getEffectDescription(ef)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Button
                onClick={onClose}
                className="bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider"
            >
                ЗАКРЫТЬ
            </Button>
        </div>
    );
}

function getEffectDescription(effect: {
    type: string;
    value: number | string;
}): string {
    switch (effect.type) {
        case "health_regen":
            return `+${effect.value} к регенерации здоровья за ход`;
        case "combat_bonus":
            return `+${Math.round((effect.value as number) * 100)}% к урону в бою`;
        case "evasion_bonus":
            return `+${Math.round((effect.value as number) * 100)}% к уклонению`;
        case "power_boost":
            return `+${effect.value} к энергии реактора`;
        case "shield_boost":
            return `+${effect.value} к максимальным щитам`;
        case "fuel_efficiency":
            return `+${Math.round((effect.value as number) * 100)}% к эффективности топлива`;
        default:
            return `${effect.type}: ${effect.value}`;
    }
}
