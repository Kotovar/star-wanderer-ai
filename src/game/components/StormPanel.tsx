"use client";

import { useGameStore } from "../store";
import { Button } from "@/components/ui/button";
import type { StormType } from "../types";

// StormType
type StormDetails = {
    icon: string;
    color: string;
    name: string;
    desc: string;
    damage: string;
    loot: string;
};
type StormInfo = Record<StormType, StormDetails>;

const STORM_INFO: StormInfo = {
    radiation: {
        icon: "☢️",
        color: "#00ff00",
        name: "Радиационное облако",
        desc: "Радиационное облако с высоким уровнем ионизирующего излучения.",
        damage: "Наносит урон экипажу и модулям",
        loot: "x2 к добыче",
    },
    ionic: {
        icon: "⚡",
        color: "#00d4ff",
        name: "Ионный шторм",
        desc: "Ионный шторм с мощными электромагнитными возмущениями.",
        damage: "Сжигает щиты, повреждает электронику",
        loot: "x2.5 к добыче",
    },
    plasma: {
        icon: "🔥",
        color: "#ff4400",
        name: "Плазменный шторм",
        desc: "Плазменный шторм - крайне опасное явление с высокой температурой.",
        damage: "Урон щитам, модулям и экипажу",
        loot: "x3 к добыче, шанс редких находок",
    },
};

export function StormPanel() {
    const currentLocation = useGameStore((s) => s.currentLocation);
    const ship = useGameStore((s) => s.ship);
    const crew = useGameStore((s) => s.crew);
    const completedLocations = useGameStore((s) => s.completedLocations);
    const log = useGameStore((s) => s.log);
    const enterStorm = useGameStore((s) => s.enterStorm);
    const showSectorMap = useGameStore((s) => s.showSectorMap);
    const getScanLevel = useGameStore((s) => s.getScanLevel);

    if (!currentLocation || currentLocation.type !== "storm") return null;

    const stormType = currentLocation.stormType || "radiation";
    const intensity = currentLocation.stormIntensity || 1;
    const info = STORM_INFO[stormType];
    const scanLevel = getScanLevel();
    const hasScanner = scanLevel > 0;

    const intensityLabels = ["", "Слабый", "Средний", "Сильный"];

    // Check if storm was already entered
    const stormCompleted = completedLocations.includes(currentLocation.id);

    // Get recent storm-related log entries
    const recentStormLogs = log
        .slice(0, 10)
        .filter(
            (entry) =>
                entry.message.includes("Шторм") ||
                entry.message.includes("Щиты:") ||
                entry.message.includes("Модули повреждены") ||
                entry.message.includes("Экипаж:") ||
                entry.message.includes("Добыча:") ||
                entry.message.includes("РЕДКАЯ НАХОДКА") ||
                entry.message.includes("ВХОД В"),
        );

    if (stormCompleted) {
        // Show results after completing the storm
        return (
            <div
                className="bg-[rgba(50,0,50,0.3)] border-2 p-4"
                style={{ borderColor: info.color }}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2
                        className="text-xl font-bold font-['Orbitron']"
                        style={{ color: info.color }}
                    >
                        {info.icon} {info.name}
                    </h2>
                    <span className="text-sm text-[#00ff41]">
                        ✓ Исследовано
                    </span>
                </div>

                <div
                    className="bg-[rgba(0,0,0,0.4)] p-3 mb-4 border"
                    style={{ borderColor: info.color }}
                >
                    <p className="text-[#ffb000] mb-3 font-bold">Результаты:</p>
                    <div className="space-y-1.5 text-sm">
                        {recentStormLogs.map((entry, i) => (
                            <div
                                key={i}
                                className={`
                ${entry.type === "error" ? "text-[#ff4444]" : ""}
                ${entry.type === "warning" ? "text-[#ffb000]" : ""}
                ${entry.type === "info" && entry.message.includes("+") ? "text-[#00ff41]" : ""}
                ${entry.type === "info" && !entry.message.includes("+") ? "text-[#888]" : ""}
              `}
                            >
                                {entry.message}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-[rgba(0,0,0,0.3)] p-3 mb-4 border border-[#00ff41]">
                    <p className="text-[#ffb000] mb-2">Текущие показатели:</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                            <span className="text-[#00d4ff]">🛡 Щиты:</span>
                            <span
                                className={`${ship.shields > 0 ? "text-[#00ff41]" : "text-[#ff4444]"} ml-1`}
                            >
                                {Math.floor(ship.shields)}/{ship.maxShields}
                            </span>
                        </div>
                        <div>
                            <span className="text-[#ffb000]">🔧 Броня:</span>
                            <span className="text-[#00ff41] ml-1">
                                {ship.armor} ед.
                            </span>
                        </div>
                        <div>
                            <span className="text-[#ff4444]">❤ Экипаж:</span>
                            <span
                                className={`${crew.filter((c) => c.health > 50).length === crew.length ? "text-[#00ff41]" : "text-[#ffb000]"} ml-1`}
                            >
                                {crew.filter((c) => c.health > 50).length}/
                                {crew.length}
                            </span>
                        </div>
                    </div>
                </div>

                <Button
                    onClick={showSectorMap}
                    className="w-full bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] font-bold cursor-pointer"
                >
                    ПОКИНУТЬ ШТОРМ
                </Button>
            </div>
        );
    }

    // Show storm info before entering
    // Without scanner, show generic "Unknown object" info
    if (!hasScanner) {
        return (
            <div className="bg-[rgba(50,50,50,0.3)] border-2 border-[#666] p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold font-['Orbitron'] text-[#888]">
                        ❓ Неизвестный объект
                    </h2>
                </div>

                <div className="bg-[rgba(0,0,0,0.4)] p-3 mb-4 border border-[#666]">
                    <p className="text-[#888] mb-2">
                        Датчики не могут определить тип этого объекта.
                    </p>
                    <p className="text-[#ffb000]">
                        Требуется сканер для получения информации.
                    </p>
                </div>

                <div className="bg-[rgba(0,0,0,0.3)] p-3 mb-4 border border-[#ffb000]">
                    <p className="text-[#ffb000] font-bold mb-2">
                        ⚠ ПРЕДУПРЕЖДЕНИЕ
                    </p>
                    <p className="text-[#888] text-sm">
                        Вход в неизвестный объект может быть опасен!
                    </p>
                </div>

                <div className="bg-[rgba(0,0,0,0.3)] p-3 mb-4 border border-[#00ff41]">
                    <p className="text-[#ffb000] mb-2">Ваши показатели:</p>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                            <span className="text-[#00d4ff]">🛡 Щиты:</span>
                            <span className="text-[#00ff41] ml-1">
                                {ship.shields}/{ship.maxShields}
                            </span>
                        </div>
                        <div>
                            <span className="text-[#ffb000]">🔧 Броня:</span>
                            <span className="text-[#00ff41] ml-1">
                                {ship.armor} ед.
                            </span>
                        </div>
                        <div>
                            <span className="text-[#ff4444]">❤ Экипаж:</span>
                            <span className="text-[#00ff41] ml-1">
                                {crew.filter((c) => c.health > 50).length}/
                                {crew.length}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <Button
                        onClick={enterStorm}
                        className="flex-1 bg-[#ff4444] hover:bg-[#ff6666] text-white font-bold cursor-pointer"
                    >
                        ❓ ИССЛЕДОВАТЬ
                    </Button>
                    <Button
                        onClick={showSectorMap}
                        className="bg-transparent border-2 border-[#666] text-[#888] hover:bg-[rgba(100,100,100,0.2)] cursor-pointer"
                    >
                        ОТСТУПИТЬ
                    </Button>
                </div>
            </div>
        );
    }

    // With scanner, show full storm info
    return (
        <div
            className="bg-[rgba(50,0,50,0.3)] border-2 p-4"
            style={{ borderColor: info.color }}
        >
            <div className="flex justify-between items-center mb-4">
                <h2
                    className="text-xl font-bold font-['Orbitron']"
                    style={{ color: info.color }}
                >
                    {info.icon} {currentLocation.name}
                </h2>
                <span className="text-sm text-[#ffb000]">
                    Интенсивность: {intensity} ({intensityLabels[intensity]})
                </span>
            </div>

            <div
                className="bg-[rgba(0,0,0,0.4)] p-3 mb-4 border"
                style={{ borderColor: info.color }}
            >
                <p className="text-[#ffb000] mb-2">{info.desc}</p>
                <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                    <div>
                        <span className="text-[#ff4444]">⚠ Опасность:</span>
                        <p className="text-[#888] ml-2">{info.damage}</p>
                    </div>
                    <div>
                        <span className="text-[#00ff41]">★ Добыча:</span>
                        <p className="text-[#888] ml-2">{info.loot}</p>
                    </div>
                </div>
            </div>

            <div className="bg-[rgba(0,0,0,0.3)] p-3 mb-4 border border-[#ff4444]">
                <p className="text-[#ff4444] font-bold mb-2">
                    ⚠ ПРЕДУПРЕЖДЕНИЕ
                </p>
                <p className="text-[#888] text-sm">
                    Вход в шторм нанесёт повреждения кораблю и экипажу!
                </p>
            </div>

            <div className="bg-[rgba(0,0,0,0.3)] p-3 mb-4 border border-[#00ff41]">
                <p className="text-[#ffb000] mb-2">Ваши показатели:</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                        <span className="text-[#00d4ff]">🛡 Щиты:</span>
                        <span className="text-[#00ff41] ml-1">
                            {ship.shields}/{ship.maxShields}
                        </span>
                    </div>
                    <div>
                        <span className="text-[#ffb000]">🔧 Броня:</span>
                        <span className="text-[#00ff41] ml-1">
                            {ship.armor} ед.
                        </span>
                    </div>
                    <div>
                        <span className="text-[#ff4444]">❤ Экипаж:</span>
                        <span className="text-[#00ff41] ml-1">
                            {crew.filter((c) => c.health > 50).length}/
                            {crew.length}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex gap-4">
                <Button
                    onClick={enterStorm}
                    className="flex-1 bg-[#ff4444] hover:bg-[#ff6666] text-white font-bold cursor-pointer"
                >
                    {info.icon} ВОЙТИ В ШТОРМ
                </Button>
                <Button
                    onClick={showSectorMap}
                    className="bg-transparent border-2 border-[#666] text-[#888] hover:bg-[rgba(100,100,100,0.2)] cursor-pointer"
                >
                    ОТСТУПИТЬ
                </Button>
            </div>
        </div>
    );
}
