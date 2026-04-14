import type { Module } from "@/game/types/modules";
import type { CrewBuildOptions } from "@/game/crew/buildCrewMember";
import type { ResearchResourceType } from "@/game/types/research";

// ─── Ship Class (placeholder for future implementation) ──────────────────────
/**
 * Ship class IDs — определяют класс корабля (пока не реализован, заглушка).
 * При добавлении классов здесь добавляются новые ID, без изменений интерфейсов.
 */
export type ShipClassId = "standard"; // в будущем: "frigate" | "corvette" | "ark"

// ─── Ship Template ────────────────────────────────────────────────────────────

export interface ShipTemplate {
  id: string;
  /** Ключ переводов: `ship_templates.{id}.name` */
  nameKey: string;
  /** Ключ переводов: `ship_templates.{id}.description` */
  descriptionKey: string;
  icon: string;
  difficulty: "easy" | "normal" | "hard";
  /** Краткий список иконок модулей для превью */
  moduleIcons: string[];
  /** Стартовые модули */
  modules: Module[];
  /** Параметры стартового экипажа */
  crew: CrewBuildOptions[];
  credits: number;
  fuel: number;
  maxFuel: number;
  /** Стартовое количество зондов для погружения в газовые планеты */
  probes: number;
  /** Стартовые ресурсы исследований */
  researchResources?: Partial<Record<ResearchResourceType, number>>;
  /** Совместимые классы (null = все) — для будущей фильтрации */
  compatibleClasses: ShipClassId[] | null;
}

// ─── Базовый ID модулей (не должен пересекаться с initialModules) ─────────────
// initialModules использует 101-106, шаблоны — разные диапазоны
const T_EXPLORER = 200;
const T_FIGHTER = 300;
const T_TRADER = 400;
const T_SCIENTIST = 500;
const T_ENGINEER = 600;

// ─── Общие базовые значения ───────────────────────────────────────────────────
const BASE_FUEL = 80;

// ─── Шаблоны ─────────────────────────────────────────────────────────────────

export const SHIP_TEMPLATES: ShipTemplate[] = [
  // ── 1. Исследователь (easy) ─────────────────────────────────────────────
  {
    id: "explorer",
    nameKey: "ship_templates.explorer.name",
    descriptionKey: "ship_templates.explorer.description",
    icon: "🚀",
    difficulty: "easy",
    moduleIcons: ["⚛️", "🎮", "🌬️", "📦", "🔧", "⛽"],
    modules: [
      { id: T_EXPLORER + 1, type: "reactor", name: "Реактор", x: 1, y: 1, width: 1, height: 1, power: 10, health: 100, maxHealth: 100, level: 1, defense: 2 },
      { id: T_EXPLORER + 2, type: "cockpit", name: "Кабина", x: 2, y: 1, width: 1, height: 1, consumption: 1, health: 100, maxHealth: 100, level: 1, defense: 2 },
      { id: T_EXPLORER + 3, type: "engine", name: "Двигатель", x: 3, y: 1, width: 1, height: 1, consumption: 1, health: 100, maxHealth: 100, level: 1, fuelEfficiency: 10, defense: 1 },
      { id: T_EXPLORER + 4, type: "lifesupport", name: "Жизнеобеспечение", x: 1, y: 2, width: 1, height: 1, consumption: 2, health: 100, maxHealth: 100, level: 1, oxygen: 5, defense: 1 },
      { id: T_EXPLORER + 5, type: "cargo", name: "Грузовой отсек", x: 2, y: 2, width: 1, height: 1, consumption: 1, health: 100, maxHealth: 100, level: 1, capacity: 40, defense: 1 },
      { id: T_EXPLORER + 6, type: "fueltank", name: "Топливный бак", x: 3, y: 2, width: 1, height: 1, health: 100, maxHealth: 100, level: 1, capacity: BASE_FUEL, defense: 1 },
    ],
    crew: [
      { id: 1, name: "Арктурий Зорин", profession: "pilot", moduleId: T_EXPLORER + 2, level: 1 },
      { id: 2, name: "Элиара Вентрис", profession: "engineer", moduleId: T_EXPLORER + 4, level: 1, traits: [] },
      { id: 3, name: "Каро Медина", profession: "scout", moduleId: T_EXPLORER + 4, level: 1 },
    ],
    credits: 1000,
    fuel: BASE_FUEL,
    maxFuel: BASE_FUEL,
    probes: 3,
    compatibleClasses: null,
  },

  // ── 2. Торговец (easy) ─────────────────────────────────────────────
  {
    id: "trader",
    nameKey: "ship_templates.trader.name",
    descriptionKey: "ship_templates.trader.description",
    icon: "💰",
    difficulty: "easy",
    moduleIcons: ["⚛️", "🎮", "🌬️", "📦", "📦", "⛽"],
    modules: [
      { id: T_TRADER + 1, type: "reactor", name: "Реактор", x: 1, y: 1, width: 1, height: 1, power: 10, health: 100, maxHealth: 100, level: 1, defense: 2 },
      { id: T_TRADER + 2, type: "cockpit", name: "Кабина", x: 2, y: 1, width: 1, height: 1, consumption: 1, health: 100, maxHealth: 100, level: 1, defense: 2 },
      { id: T_TRADER + 3, type: "engine", name: "Двигатель", x: 3, y: 1, width: 1, height: 1, consumption: 1, health: 100, maxHealth: 100, level: 1, fuelEfficiency: 10, defense: 1 },
      { id: T_TRADER + 4, type: "lifesupport", name: "Жизнеобеспечение", x: 1, y: 2, width: 1, height: 1, consumption: 2, health: 100, maxHealth: 100, level: 1, oxygen: 5, defense: 1 },
      { id: T_TRADER + 5, type: "cargo", name: "Грузовой отсек Мк.2", x: 2, y: 2, width: 1, height: 1, consumption: 1, health: 100, maxHealth: 100, level: 1, capacity: 40, defense: 1 },
      { id: T_TRADER + 6, type: "fueltank", name: "Топливный бак", x: 3, y: 2, width: 1, height: 1, health: 100, maxHealth: 100, level: 1, capacity: BASE_FUEL, defense: 1 },
      { id: T_TRADER + 7, type: "cargo", name: "Грузовой отсек", x: 2, y: 3, width: 1, height: 1, consumption: 1, health: 100, maxHealth: 100, level: 1, capacity: 40, defense: 1 },
    ],
    crew: [
      { id: 1, name: "Луиза Дюпон", profession: "pilot", moduleId: T_TRADER + 2, level: 1 },
      { id: 2, name: "Антон Лефевр", profession: "medic", moduleId: T_TRADER + 4, level: 1 },
      { id: 3, name: "Виктор Морозов", profession: "scout", moduleId: T_TRADER + 4, level: 1 },
    ],
    credits: 1500,
    fuel: BASE_FUEL,
    maxFuel: BASE_FUEL,
    probes: 1,
    compatibleClasses: null,
  },

  // ── 3. Учёный (normal) ─────────────────────────────────────────────
  {
    id: "scientist",
    nameKey: "ship_templates.scientist.name",
    descriptionKey: "ship_templates.scientist.description",
    icon: "🔬",
    difficulty: "normal",
    moduleIcons: ["⚛️", "🎮", "🌬️", "🧪", "📡", "⛽"],
    modules: [
      { id: T_SCIENTIST + 1, type: "reactor", name: "Реактор", x: 1, y: 1, width: 1, height: 1, power: 15, health: 120, maxHealth: 120, level: 2, defense: 3 },
      { id: T_SCIENTIST + 2, type: "cockpit", name: "Кабина", x: 2, y: 1, width: 1, height: 1, consumption: 1, health: 100, maxHealth: 100, level: 1, defense: 2 },
      { id: T_SCIENTIST + 3, type: "engine", name: "Двигатель", x: 3, y: 1, width: 1, height: 1, consumption: 1, health: 100, maxHealth: 100, level: 1, fuelEfficiency: 10, defense: 1 },
      { id: T_SCIENTIST + 4, type: "lifesupport", name: "Жизнеобеспечение", x: 1, y: 2, width: 1, height: 1, consumption: 2, health: 100, maxHealth: 100, level: 1, oxygen: 5, defense: 1 },
      // Лаборатория 2×2 — занимает (2,2),(3,2),(2,3),(3,3)
      { id: T_SCIENTIST + 5, type: "lab", name: "Лаборатория", x: 2, y: 2, width: 2, height: 2, consumption: 8, health: 100, maxHealth: 100, level: 1, defense: 0, researchOutput: 5 },
      { id: T_SCIENTIST + 6, type: "fueltank", name: "Топливный бак", x: 1, y: 3, width: 1, height: 1, health: 100, maxHealth: 100, level: 1, capacity: BASE_FUEL, defense: 1 },
      { id: T_SCIENTIST + 7, type: "scanner", name: "Сканер", x: 1, y: 4, width: 1, height: 1, consumption: 2, health: 100, maxHealth: 100, level: 1, defense: 1, scanRange: 3 },
    ],
    crew: [
      { id: 1, name: "Кварц-Секундус", profession: "pilot", moduleId: T_SCIENTIST + 2, level: 1, race: "crystalline" },
      { id: 2, name: "Доктор Айгерим", profession: "scientist", moduleId: T_SCIENTIST + 4, level: 1 },
      { id: 3, name: "Нейрон-5", profession: "scientist", moduleId: T_SCIENTIST + 5, level: 1, race: "synthetic" },
    ],
    credits: 700,
    fuel: BASE_FUEL,
    maxFuel: BASE_FUEL,
    researchResources: {
      ancient_data: 3,
      tech_salvage: 5,
    },
    probes: 1,
    compatibleClasses: null,
  },

  // ── 4. Инженер (normal) ─────────────────────────────────────────────
  {
    id: "engineer",
    nameKey: "ship_templates.engineer.name",
    descriptionKey: "ship_templates.engineer.description",
    icon: "🔧",
    difficulty: "normal",
    moduleIcons: ["⚛️", "🎮", "🌬️", "🛠️", "🔧", "⛽"],
    modules: [
      { id: T_ENGINEER + 1, type: "reactor", name: "Реактор Мк.2", x: 1, y: 1, width: 1, height: 1, power: 15, health: 120, maxHealth: 120, level: 2, defense: 3 },
      { id: T_ENGINEER + 2, type: "cockpit", name: "Кабина", x: 2, y: 1, width: 1, height: 1, consumption: 1, health: 100, maxHealth: 100, level: 1, defense: 2 },
      { id: T_ENGINEER + 3, type: "engine", name: "Двигатель", x: 3, y: 1, width: 1, height: 1, consumption: 1, health: 100, maxHealth: 100, level: 1, fuelEfficiency: 10, defense: 1 },
      { id: T_ENGINEER + 4, type: "lifesupport", name: "Жизнеобеспечение", x: 1, y: 2, width: 1, height: 1, consumption: 2, health: 100, maxHealth: 100, level: 1, oxygen: 5, defense: 1 },
      { id: T_ENGINEER + 5, type: "repair_bay", name: "Ремонтный отсек", x: 2, y: 2, width: 1, height: 1, consumption: 8, health: 100, maxHealth: 100, level: 1, defense: 2, repairAmount: 3, repairTargets: 1 },
      { id: T_ENGINEER + 6, type: "fueltank", name: "Топливный бак", x: 3, y: 2, width: 1, height: 1, health: 100, maxHealth: 100, level: 1, capacity: BASE_FUEL, defense: 1 },
    ],
    crew: [
      { id: 1, name: "Иван Смирнов", profession: "pilot", moduleId: T_ENGINEER + 2, level: 1 },
      { id: 2, name: "АЛЬФА-7", profession: "engineer", moduleId: T_ENGINEER + 4, level: 1, race: "synthetic" },
    ],
    credits: 900,
    fuel: BASE_FUEL,
    maxFuel: BASE_FUEL,
    probes: 0,
    compatibleClasses: null,
  },

  // ── 5. Боец (hard) ─────────────────────────────────────────────
  {
    id: "fighter",
    nameKey: "ship_templates.fighter.name",
    descriptionKey: "ship_templates.fighter.description",
    icon: "⚔️",
    difficulty: "hard",
    moduleIcons: ["⚛️", "🎮", "🌬️", "🔫", "🔧", "⛽"],
    modules: [
      { id: T_FIGHTER + 1, type: "reactor", name: "Реактор Мк.2", x: 1, y: 1, width: 1, height: 1, power: 15, health: 120, maxHealth: 120, level: 2, defense: 3 },
      { id: T_FIGHTER + 2, type: "cockpit", name: "Кабина", x: 2, y: 1, width: 1, height: 1, consumption: 1, health: 100, maxHealth: 100, level: 1, defense: 2 },
      { id: T_FIGHTER + 3, type: "engine", name: "Двигатель", x: 3, y: 1, width: 1, height: 1, consumption: 1, health: 100, maxHealth: 100, level: 1, fuelEfficiency: 10, defense: 1 },
      { id: T_FIGHTER + 4, type: "lifesupport", name: "Жизнеобеспечение", x: 1, y: 2, width: 1, height: 1, consumption: 2, health: 100, maxHealth: 100, level: 1, oxygen: 5, defense: 1 },
      { id: T_FIGHTER + 5, type: "weaponbay", name: "Боевая палуба", x: 2, y: 2, width: 1, height: 1, consumption: 2, health: 100, maxHealth: 100, level: 1, defense: 2, weapons: [{ type: "laser" }] },
      { id: T_FIGHTER + 6, type: "fueltank", name: "Топливный бак", x: 3, y: 2, width: 1, height: 1, health: 100, maxHealth: 100, level: 1, capacity: BASE_FUEL, defense: 1 },
    ],
    crew: [
      { id: 1, name: "Торкас Кр'асс", profession: "pilot", moduleId: T_FIGHTER + 2, level: 1, race: "krylorian" },
      { id: 2, name: "Варга З'орк", profession: "gunner", moduleId: T_FIGHTER + 5, level: 1, race: "krylorian" },
    ],
    credits: 800,
    fuel: BASE_FUEL,
    maxFuel: BASE_FUEL,
    probes: 0,
    compatibleClasses: null,
  },
];

/** Шаблон по умолчанию (Исследователь) */
export const DEFAULT_TEMPLATE_ID = "explorer";
