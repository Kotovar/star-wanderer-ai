"use client";

import { useGameStore } from "@/game/store";
import { Button } from "@/components/ui/button";

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

// Простой SVG-превью поля обломков
function WreckFieldVisual({ tier, exhausted }: { tier: 1 | 2 | 3; exhausted: boolean }) {
  const color = TIER_COLORS[tier];
  const opacity = exhausted ? 0.35 : 1;

  // Детерминированные позиции фрагментов для 3 тиров
  const fragments: { x: number; y: number; w: number; h: number; rot: number }[][] = [
    // tier 1 — 5 мелких фрагментов
    [
      { x: 70, y: 85, w: 28, h: 8, rot: -22 },
      { x: 115, y: 70, w: 18, h: 6, rot: 40 },
      { x: 95, y: 115, w: 22, h: 7, rot: 15 },
      { x: 130, y: 100, w: 14, h: 5, rot: -55 },
      { x: 60, y: 110, w: 16, h: 5, rot: 30 },
    ],
    // tier 2 — 8 фрагментов крупнее
    [
      { x: 65, y: 80, w: 36, h: 10, rot: -18 },
      { x: 115, y: 65, w: 24, h: 8, rot: 45 },
      { x: 90, y: 115, w: 30, h: 9, rot: 12 },
      { x: 135, y: 95, w: 20, h: 7, rot: -60 },
      { x: 58, y: 108, w: 22, h: 6, rot: 28 },
      { x: 108, y: 130, w: 18, h: 6, rot: -35 },
      { x: 78, y: 58, w: 16, h: 5, rot: 55 },
      { x: 140, y: 118, w: 14, h: 5, rot: 20 },
    ],
    // tier 3 — 11 фрагментов, крупные остовы
    [
      { x: 60, y: 78, w: 44, h: 12, rot: -15 },
      { x: 118, y: 62, w: 32, h: 10, rot: 42 },
      { x: 88, y: 118, w: 38, h: 11, rot: 10 },
      { x: 138, y: 92, w: 26, h: 9, rot: -58 },
      { x: 55, y: 110, w: 28, h: 8, rot: 25 },
      { x: 105, y: 132, w: 24, h: 7, rot: -32 },
      { x: 75, y: 55, w: 20, h: 6, rot: 52 },
      { x: 142, y: 115, w: 18, h: 6, rot: 18 },
      { x: 85, y: 90, w: 14, h: 4, rot: -70 },
      { x: 125, y: 108, w: 16, h: 5, rot: 35 },
      { x: 68, y: 130, w: 12, h: 4, rot: -10 },
    ],
  ];

  const frags = fragments[tier - 1];

  return (
    <div className="flex justify-center py-2 shrink-0">
      <svg width="200" height="200" viewBox="0 0 200 200" style={{ opacity }}>
        <defs>
          <radialGradient id="wf-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color} stopOpacity="0.12" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="wf-rad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff4400" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#ff4400" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Фоновое свечение поля */}
        <circle cx="100" cy="100" r="95" fill="url(#wf-glow)" />
        {/* Радиационный ореол (красноватый) */}
        <circle cx="100" cy="100" r="75" fill="url(#wf-rad)" />

        {/* Фрагменты */}
        {frags.map((f, i) => (
          <rect
            key={i}
            x={f.x - f.w / 2}
            y={f.y - f.h / 2}
            width={f.w}
            height={f.h}
            rx="1"
            fill={color}
            opacity={0.7 - i * 0.02}
            transform={`rotate(${f.rot} ${f.x} ${f.y})`}
          />
        ))}

        {/* Мерцающие частицы пыли */}
        {[
          { x: 82, y: 95, r: 1.5 },
          { x: 118, y: 88, r: 1 },
          { x: 100, y: 120, r: 1.5 },
          { x: 72, y: 102, r: 1 },
          { x: 130, y: 105, r: 1 },
        ].map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={color} opacity={0.5}>
            <animate attributeName="opacity" values="0.5;0.15;0.5"
              dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
          </circle>
        ))}

        {/* Радиационные кольца (tier 3) */}
        {tier === 3 && (
          <>
            <circle cx="100" cy="100" r="55" fill="none"
              stroke="#ff6600" strokeWidth="0.5" opacity="0.25"
              strokeDasharray="4,8">
              <animate attributeName="opacity" values="0.25;0.08;0.25"
                dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="100" cy="100" r="35" fill="none"
              stroke="#ff4400" strokeWidth="0.5" opacity="0.2"
              strokeDasharray="3,6">
              <animate attributeName="opacity" values="0.2;0.06;0.2"
                dur="2s" repeatCount="indefinite" />
            </circle>
          </>
        )}
      </svg>
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
          💀 {currentLocation.name}
        </div>
        <button
          onClick={showSectorMap}
          className="text-[#ff0040] hover:text-white text-lg font-bold cursor-pointer px-1"
        >
          ✕
        </button>
      </div>

      {/* Визуал */}
      <WreckFieldVisual tier={tier} exhausted={exhausted} />

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
            {lastLoot.spares && <span>🔩 Запчасти ×{lastLoot.spares}</span>}
            {lastLoot.electronics && <span>💡 Электроника ×{lastLoot.electronics}</span>}
            {lastLoot.rare_minerals && <span>💎 Редкие минералы ×{lastLoot.rare_minerals}</span>}
            {lastLoot.tech_salvage && <span className="text-[#00d4ff]">⚙️ Техн. металлолом ×{lastLoot.tech_salvage}</span>}
            {lastLoot.ancient_data && <span className="text-[#cc44ff]">📡 Древние данные ×{lastLoot.ancient_data}</span>}
            {lastLoot.shieldDamage && (
              <span className="text-[#ff6644]">
                🔴 Щиты -{lastLoot.shieldDamage}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Предупреждение о радиации */}
      {!exhausted && (
        <div className="text-[10px] text-[#ff6644] border border-[#ff664422] p-2 bg-[rgba(255,68,0,0.04)] shrink-0">
          ☢ Радиационный фон — каждый проход наносит <strong>{shieldWarning}</strong> урона щитам.
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
            🔧 Обыскать обломки ({done}/{total})
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
