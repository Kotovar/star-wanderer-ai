"use client";

import { useGameStore } from "../store";

export function GameLog() {
    const log = useGameStore((s) => s.log);

    const getTypeClass = (type: string) => {
        switch (type) {
            case "warning":
                return "border-[#ffb000] bg-[rgba(255,176,0,0.03)]";
            case "error":
                return "border-[#ff0040] bg-[rgba(255,0,64,0.03)]";
            case "combat":
                return "border-[#00d4ff] bg-[rgba(0,212,255,0.03)]";
            default:
                return "border-[#00ff41] bg-[rgba(0,255,65,0.03)]";
        }
    };

    return (
        <div className="bg-[rgba(0,0,0,0.5)] border border-[#00ff41] p-4">
            {log.slice(0, 30).map((entry, i) => (
                <div
                    key={i}
                    className={`py-1.5 px-2 border-l-2 mb-1.5 text-[11px] leading-snug ${getTypeClass(entry.type)}`}
                >
                    [ХОД {entry.turn}] {entry.message}
                </div>
            ))}
        </div>
    );
}
