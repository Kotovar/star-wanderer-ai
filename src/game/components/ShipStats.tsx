"use client";

import { useGameStore } from "../store";

export function ShipStats() {
    const ship = useGameStore((s) => s.ship);
    const crew = useGameStore((s) => s.crew);
    const getTotalPower = useGameStore((s) => s.getTotalPower);
    const getTotalConsumption = useGameStore((s) => s.getTotalConsumption);
    const getTotalDamage = useGameStore((s) => s.getTotalDamage);
    const getCrewCapacity = useGameStore((s) => s.getCrewCapacity);
    const captain = useGameStore((s) =>
        s.crew.find((c) => c.profession === "pilot"),
    );

    const totalPower = getTotalPower();
    const engineerBoost = crew.find((c) => c.assignment === "power") ? 5 : 0;
    const totalConsumption = getTotalConsumption();
    const available = totalPower + engineerBoost - totalConsumption;
    const damage = getTotalDamage();
    const crewCapacity = getCrewCapacity();

    return (
        <div className="bg-[rgba(0,255,65,0.05)] border border-[#00ff41] p-4 mt-2.5">
            {/* Новые параметры в верхней части */}
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-[#ffb000]">⛽ Топливо:</span>
                <span className="text-[#9933ff]">
                    {ship.fuel || 0}/{ship.maxFuel || 0}
                </span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-[#ffb000]">🔥 Двигатель:</span>
                <span className="text-[#00ff41]">Тир {ship.engineTier}</span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-[#ffb000]">👤 Капитан:</span>
                <span className="text-[#00ff41]">Ур.{captain?.level ?? 1}</span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-[#ffb000]">👥 Экипаж:</span>
                <span
                    className={
                        crew.length <= crewCapacity
                            ? "text-[#00ff41]"
                            : "text-[#ff0040]"
                    }
                >
                    {crew.length}/{crewCapacity}
                </span>
            </div>

            <div className="mt-2.5 pt-2.5 border-t border-[#00ff41]">
                <div className="flex justify-between mb-2 text-sm">
                    <span className="text-[#ffb000]">⚡ Генерация:</span>
                    <span className="text-[#00ff41]">
                        {totalPower + engineerBoost}
                        {engineerBoost > 0 ? ` (+${engineerBoost})` : ""}
                    </span>
                </div>
                <div className="flex justify-between mb-2 text-sm">
                    <span className="text-[#ffb000]">⚡ Потребление:</span>
                    <span
                        className={
                            available >= 0 ? "text-[#00ff41]" : "text-[#ff0040]"
                        }
                    >
                        {totalConsumption}
                    </span>
                </div>
                <div className="flex justify-between mb-2 text-sm font-bold">
                    <span className="text-[#ffb000]">⚡ Доступно:</span>
                    <span
                        className={
                            available >= 0 ? "text-[#00ff41]" : "text-[#ff0040]"
                        }
                    >
                        {available}
                    </span>
                </div>
            </div>
            <div className="mt-2.5 pt-2.5 border-t border-[#00ff41]">
                <div className="flex justify-between mb-2 text-sm">
                    <span className="text-[#ffb000]">⚔ Урон:</span>
                    <span className="text-[#00ff41]">{damage.total}</span>
                </div>
                {damage.kinetic > 0 && (
                    <div className="flex justify-between text-sm text-[#888]">
                        <span>├ Кинетич.:</span>
                        <span>{damage.kinetic}</span>
                    </div>
                )}
                {damage.laser > 0 && (
                    <div className="flex justify-between text-sm text-[#f00]">
                        <span>├ Лазерн.:</span>
                        <span>{damage.laser}</span>
                    </div>
                )}
                {damage.missile > 0 && (
                    <div className="flex justify-between text-sm text-[#fa0]">
                        <span>└ Ракетн.:</span>
                        <span>{damage.missile}</span>
                    </div>
                )}
            </div>
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-[#ffb000]">🛡 Щиты:</span>
                <span className="text-[#00d4ff]">
                    {ship.shields}/{ship.maxShields}
                </span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-[#ffb000]">🎯 Уклонение:</span>
                <span className="text-[#00ff41]">
                    {(captain?.level || 1) + (ship.bonusEvasion || 0)}%
                    {ship.bonusEvasion ? (
                        <span className="text-[#9933ff]">
                            {" "}
                            (+{ship.bonusEvasion}% бонус)
                        </span>
                    ) : null}
                </span>
            </div>
            <div className="flex justify-between mb-2 text-sm">
                <span className="text-[#ffb000]">🔧 Броня:</span>
                <span
                    className={
                        ship.armor > 50 ? "text-[#00ff41]" : "text-[#ff0040]"
                    }
                >
                    {ship.armor}%
                </span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-[#ffb000]">💨 Кислород:</span>
                <span
                    className={
                        crew.length <= ship.crewCapacity
                            ? "text-[#00ff41]"
                            : "text-[#ff0040]"
                    }
                >
                    {crew.length}/{ship.crewCapacity}
                </span>
            </div>
        </div>
    );
}
