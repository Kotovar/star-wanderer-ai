"use client";

import Image from "next/image";
import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";
import { Database, Radio, ShieldAlert, Wrench, Zap } from "lucide-react";

const TIER_COLORS: Record<1 | 2 | 3, string> = {
  1: "#8b7355",
  2: "#a0785a",
  3: "#c8832a",
};

const TIER_LABELS: Record<1 | 2 | 3, string> = {
  1: "Обломки малого боя",
  2: "Место крупного сражения",
  3: "Древнее поле битвы",
};

const TIER_DESCRIPTIONS: Record<1 | 2 | 3, string> = {
  1: "Рассеянные обломки небольшой стычки. Немного запчастей, слабое радиационное поле.",
  2: "Место жестокого столкновения флотов. Можно найти интересные предметы, но радиация ощутима.",
  3: "Огромное кладбище кораблей, окутанное аномальными излучениями. Исследование опасно, но может принести редкие предметы.",
};

const WRECK_FIELD_BACKGROUNDS: Record<string, string> = {
  "Поле обломков": "/assets/wreck-fields/debris-field.webp",
  "Братская могила флота": "/assets/wreck-fields/fleet-grave.webp",
  "Эхо сражения": "/assets/wreck-fields/battle-echo.webp",
  "Место гибели армады": "/assets/wreck-fields/armada-fall.webp",
  "Кладбище кораблей": "/assets/wreck-fields/ship-graveyard.webp",
  "Обломки неизвестной битвы": "/assets/wreck-fields/unknown-battle.webp",
};

function WreckFieldVisual({
  name,
  tier,
  exhausted,
}: {
  name: string;
  tier: 1 | 2 | 3;
  exhausted: boolean;
}) {
  const color = TIER_COLORS[tier];
  const background =
    WRECK_FIELD_BACKGROUNDS[name] ?? WRECK_FIELD_BACKGROUNDS["Поле обломков"];

  return (
    <div
      className="relative h-40 shrink-0 overflow-hidden rounded border sm:h-48"
      style={{ borderColor: `${color}66`, opacity: exhausted ? 0.35 : 1 }}
    >
      <Image
        src={background}
        alt=""
        fill
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#04070e]/80 via-transparent to-[#04070e]/50" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#04070e]/80 to-transparent" />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ boxShadow: `inset 0 0 46px ${color}33` }}
      />
    </div>
  );
}

export function WreckFieldPanel() {
  const currentLocation = useGameStore((s) => s.currentLocation);
  const salvageWreckField = useGameStore((s) => s.salvageWreckField);
  const showSectorMap = useGameStore((s) => s.showSectorMap);

  if (!currentLocation || currentLocation.type !== "wreck_field") return null;

  const tier = (currentLocation.wreckTier ?? 1) as 1 | 2 | 3;
  const total = currentLocation.wreckPassesTotal ?? 2;
  const done = currentLocation.wreckPassesDone ?? 0;
  const exhausted = currentLocation.wreckExhausted ?? false;
  const lastLoot = currentLocation.wreckLastPassLoot;

  const tierColor = TIER_COLORS[tier];

  const shieldWarning = tier === 3 ? "20–35" : tier === 2 ? "10–25" : "5–15";

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto">
      {/* Заголовок */}
      <div className="flex items-center justify-between shrink-0">
        <div
          className="font-['Orbitron'] font-bold uppercase tracking-wider text-sm"
          style={{ color: tierColor }}
        >
          {currentLocation.name}
        </div>
        <button
          onClick={showSectorMap}
          className="text-[#ff0040] hover:text-white text-lg font-bold cursor-pointer px-1"
        >
          ✕
        </button>
      </div>

      {/* Визуал */}
      <WreckFieldVisual name={currentLocation.name} tier={tier} exhausted={exhausted} />

      {/* Тир и описание */}
      <div
        className="border p-2 text-xs shrink-0"
        style={{ borderColor: tierColor + "55", background: tierColor + "0a" }}
      >
        <div className="font-bold mb-1" style={{ color: tierColor }}>
          {TIER_LABELS[tier]}
        </div>
        <div className="text-[#888] leading-relaxed">
          {TIER_DESCRIPTIONS[tier]}
        </div>
      </div>

      {/* Прогресс проходов */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-[#555] uppercase tracking-wider">
          Изучено
        </span>
        <div className="flex gap-1 flex-1">
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full"
              style={{
                backgroundColor: i < done ? tierColor : "#1a1a2e",
                boxShadow: i < done ? `0 0 6px ${tierColor}` : "none",
              }}
            />
          ))}
        </div>
        <span className="text-[10px] text-[#555]">{done}/{total}</span>
      </div>

      {/* Результат последнего прохода */}
      {lastLoot && done > 0 && (
        <div className="border border-[#1a1a2e] p-2 bg-[rgba(0,0,0,0.3)] text-xs shrink-0">
          <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1.5">
            Последний проход
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[#aaa]">
            {lastLoot.spares && <span className="flex items-center gap-1"><Wrench size={12} /> Запчасти ×{lastLoot.spares}</span>}
            {lastLoot.electronics && <span className="flex items-center gap-1"><Zap size={12} /> Электроника ×{lastLoot.electronics}</span>}
            {lastLoot.rare_minerals && <span className="flex items-center gap-1"><Database size={12} /> Редкие минералы ×{lastLoot.rare_minerals}</span>}
            {lastLoot.tech_salvage && <span className="flex items-center gap-1 text-[#00d4ff]"><Wrench size={12} /> Техн. металлолом ×{lastLoot.tech_salvage}</span>}
            {lastLoot.ancient_data && <span className="flex items-center gap-1 text-[#cc44ff]"><Radio size={12} /> Древние данные ×{lastLoot.ancient_data}</span>}
            {lastLoot.shieldDamage && (
              <span className="flex items-center gap-1 text-[#ff6644]">
                <ShieldAlert size={12} /> Щиты -{lastLoot.shieldDamage}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Предупреждение о радиации */}
      {!exhausted && (
        <div className="text-[10px] text-[#ff6644] border border-[#ff664422] p-2 bg-[rgba(255,68,0,0.04)] shrink-0">
          Радиационный фон — каждый проход наносит <strong>{shieldWarning}</strong> урона щитам.
        </div>
      )}

      {/* Кнопки */}
      <div className="flex flex-col gap-2 shrink-0">
        {!exhausted ? (
          <Button
            onClick={salvageWreckField}
            className="w-full bg-transparent border-2 uppercase tracking-wider text-xs cursor-pointer transition-colors"
            style={{
              borderColor: tierColor,
              color: tierColor,
            }}
          >
            <Wrench size={14} /> Обыскать обломки ({done}/{total})
          </Button>
        ) : (
          <div className="text-xs text-center text-[#444] border border-[#1a1a2e] p-2">
            Поле обломков полностью обыскано
          </div>
        )}
        <Button
          onClick={showSectorMap}
          className="w-full bg-transparent border border-[#333] text-[#888] hover:bg-[#1a1a2e] text-xs cursor-pointer"
        >
          Покинуть поле обломков
        </Button>
      </div>
    </div>
  );
}
