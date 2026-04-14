import { getRandomRace } from "@/game/races";
import type {
  ShopItem,
  RaceId,
  CrewMember,
  Quality,
  Profession,
  StationConfig,
} from "@/game/types";
import { CREW_BASE_PRICES } from "@/game/constants/crew";
import { generateCrewTraits, getRandomName, rollQuality } from "@/game/crew/utils";
import { buildCrewMember } from "@/game/crew/buildCrewMember";
import { RACES } from "@/game/constants/races";

// Module pools by tier level
// Tier 1: levels 1-2, Tier 2: levels 2-3, Tier 3: levels 3-4 (rare)
export const MODULES_BY_LEVEL: Record<number, ShopItem[]> = {
  1: [
    {
      id: "drill-1",
      name: "Бур",
      type: "module",
      moduleType: "drill",
      level: 1,
      maxHealth: 100,
      width: 1,
      height: 1,
      consumption: 1,
      price: 350,
      stock: 2,
      description: "Добывает ресурсы из астероидов",
    },
    {
      id: "fueltank-1",
      name: "Топливный бак",
      type: "module",
      moduleType: "fueltank",
      level: 1,
      maxHealth: 100,
      width: 1,
      height: 1,
      price: 400,
      stock: 2,
      capacity: 80,
      description: "Хранит топливо для прыжков между системами",
    },
    {
      id: "reactor-1",
      name: "Реактор",
      type: "module",
      moduleType: "reactor",
      level: 1,
      maxHealth: 100,
      width: 1,
      height: 1,
      power: 10,
      consumption: 0,
      defense: 2,
      price: 450,
      stock: 2,
      description: "Генерирует энергию для корабля",
    },
    {
      id: "cargo-1",
      name: "Грузовой отсек",
      type: "module",
      moduleType: "cargo",
      level: 1,
      maxHealth: 100,
      width: 1,
      height: 1,
      capacity: 40,
      consumption: 1,
      price: 350,
      stock: 2,
      defense: 1,
      description: "Хранит грузы и ресурсы",
    },
    {
      id: "shield-1",
      name: "Генератор щита",
      type: "module",
      moduleType: "shield",
      level: 1,
      maxHealth: 100,
      width: 1,
      height: 1,
      shields: 20,
      shieldRegen: 4,
      consumption: 6,
      defense: 2,
      price: 500,
      stock: 2,
      description: "Создаёт защитное поле вокруг корабля",
    },
    {
      id: "weaponbay-1",
      name: "Оружейная палуба",
      type: "module",
      moduleType: "weaponbay",
      level: 1,
      maxHealth: 100,
      width: 1,
      height: 1,
      consumption: 2,
      price: 500,
      stock: 2,
      description: "Размещает оружие корабля",
      defense: 1,
    },
    {
      id: "scanner-1",
      name: "Сканер",
      type: "module",
      moduleType: "scanner",
      level: 1,
      maxHealth: 100,
      width: 1,
      height: 1,
      scanRange: 3,
      consumption: 2,
      price: 350,
      stock: 1,
      defense: 1,
      description: "Обнаруживает объекты в космосе",
    },
    {
      id: "lifesupport-1",
      name: "Жизнеобеспечение",
      type: "module",
      moduleType: "lifesupport",
      level: 1,
      maxHealth: 100,
      width: 1,
      height: 1,
      oxygen: 5,
      consumption: 2,
      price: 400,
      stock: 2,
      defense: 0,
      description: "Производит кислород для экипажа",
    },
    {
      id: "medical-1",
      name: "Медотсек",
      type: "module",
      moduleType: "medical",
      level: 1,
      maxHealth: 100,
      width: 1,
      height: 1,
      consumption: 2,
      defense: 0,
      price: 450,
      stock: 1,
      healing: 5,
      description: "Лечит членов экипажа",
    },
    {
      id: "lab-1",
      name: "Научная лаборатория",
      type: "module",
      moduleType: "lab",
      level: 1,
      maxHealth: 100,
      width: 2,
      height: 2,
      consumption: 8,
      researchOutput: 5,
      defense: 0,
      price: 800,
      stock: 1,
      description: "Проводит научные исследования технологий",
    },
    {
      id: "quarters-1",
      name: "Жилой модуль",
      type: "module",
      moduleType: "quarters",
      level: 1,
      maxHealth: 100,
      width: 1,
      height: 1,
      capacity: 2,
      consumption: 1,
      price: 300,
      stock: 2,
      defense: 1,
      description: "Жилые помещения для экипажа. +2 места",
    },
    {
      id: "repair-bay-1",
      name: "Ремонтный отсек",
      type: "module",
      moduleType: "repair_bay",
      level: 1,
      maxHealth: 100,
      width: 1,
      height: 1,
      repairAmount: 3,
      repairTargets: 1,
      consumption: 8,
      price: 600,
      stock: 2,
      defense: 2,
      description: "Дроны ремонтируют 1 случайный модуль на +3 HP за ход",
    },
  ],
  2: [
    {
      id: "drill-2",
      name: "Бур",
      type: "module",
      moduleType: "drill",
      level: 2,
      maxHealth: 120,
      width: 1,
      height: 1,
      consumption: 2,
      price: 700,
      stock: 1,
      description: "Улучшенный бур для добычи ресурсов",
    },
    {
      id: "fueltank-2",
      name: "Топливный бак",
      type: "module",
      moduleType: "fueltank",
      level: 2,
      maxHealth: 120,
      width: 1,
      height: 1,
      price: 650,
      stock: 1,
      capacity: 120,
      description: "Увеличенная ёмкость для топлива",
    },
    {
      id: "reactor-2",
      name: "Реактор",
      type: "module",
      moduleType: "reactor",
      level: 2,
      maxHealth: 120,
      width: 1,
      height: 1,
      power: 15,
      consumption: 0,
      defense: 3,
      price: 800,
      stock: 1,
      description: "Усиленный реактор повышенной мощности",
    },
    {
      id: "cargo-2",
      name: "Грузовой отсек",
      type: "module",
      moduleType: "cargo",
      level: 2,
      maxHealth: 120,
      width: 1,
      height: 1,
      capacity: 60,
      consumption: 2,
      price: 600,
      stock: 1,
      description: "Расширенный грузовой отсек",
    },
    {
      id: "shield-2",
      name: "Генератор щита",
      type: "module",
      moduleType: "shield",
      level: 2,
      maxHealth: 120,
      width: 1,
      height: 1,
      shields: 35,
      shieldRegen: 7,
      consumption: 10,
      defense: 3,
      price: 900,
      stock: 1,
      description: "Усиленный генератор защитного поля",
    },
    {
      id: "weaponbay-2",
      name: "Оружейная палуба",
      type: "module",
      moduleType: "weaponbay",
      level: 2,
      maxHealth: 120,
      width: 1,
      height: 1,
      consumption: 4,
      defense: 2,
      price: 800,
      stock: 2,
      description: "Усиленная оружейная палуба. +10% к урону установленного оружия",
    },
    {
      id: "scanner-2",
      name: "Сканер",
      type: "module",
      moduleType: "scanner",
      level: 2,
      maxHealth: 120,
      width: 1,
      height: 1,
      scanRange: 5,
      consumption: 4,
      price: 600,
      stock: 1,
      description: "Дальнобойный сканер",
    },
    {
      id: "lifesupport-2",
      name: "Жизнеобеспечение",
      type: "module",
      moduleType: "lifesupport",
      level: 2,
      maxHealth: 120,
      width: 1,
      height: 1,
      oxygen: 8,
      consumption: 3,
      price: 650,
      stock: 1,
      description: "Улучшенная система жизнеобеспечения",
    },
    {
      id: "medical-2",
      name: "Медотсек",
      type: "module",
      moduleType: "medical",
      level: 2,
      maxHealth: 120,
      width: 1,
      height: 1,
      consumption: 3,
      defense: 1,
      price: 800,
      stock: 1,
      healing: 8,
      description: "Оборудованный медицинский отсек",
    },
    {
      id: "lab-2",
      name: "Научная лаборатория",
      type: "module",
      moduleType: "lab",
      level: 2,
      maxHealth: 120,
      width: 2,
      height: 2,
      consumption: 12,
      researchOutput: 8,
      defense: 1,
      price: 1600,
      stock: 1,
      description:
        "Проводит научные исследования технологий более эффективно",
    },
    {
      id: "quarters-2",
      name: "Жилой модуль",
      type: "module",
      moduleType: "quarters",
      level: 2,
      maxHealth: 120,
      width: 1,
      height: 1,
      capacity: 3,
      consumption: 2,
      price: 650,
      stock: 2,
      description: "Расширенные жилые помещения. +3 места",
    },
    {
      id: "repair-bay-2",
      name: "Ремонтный отсек",
      type: "module",
      moduleType: "repair_bay",
      level: 2,
      maxHealth: 120,
      width: 1,
      height: 1,
      repairAmount: 5,
      repairTargets: 2,
      consumption: 12,
      price: 1200,
      stock: 2,
      description: "Дроны ремонтируют 2 случайных модуля на +5 HP за ход",
    },
  ],
  3: [
    {
      id: "drill-3",
      name: "Бур",
      type: "module",
      moduleType: "drill",
      level: 3,
      maxHealth: 140,
      width: 1,
      height: 1,
      consumption: 3,
      price: 1200,
      stock: 1,
      description: "Промышленный бур высокой эффективности",
    },
    {
      id: "fueltank-3",
      name: "Топливный бак",
      type: "module",
      moduleType: "fueltank",
      level: 3,
      maxHealth: 140,
      width: 1,
      height: 1,
      price: 1000,
      stock: 1,
      capacity: 180,
      description: "Ёмкий топливный резервуар",
    },
    {
      id: "reactor-3",
      name: "Реактор",
      type: "module",
      moduleType: "reactor",
      level: 3,
      maxHealth: 140,
      width: 1,
      height: 1,
      power: 20,
      consumption: 0,
      defense: 4,
      price: 1500,
      stock: 1,
      description: "Мощный энергетический реактор",
    },
    {
      id: "cargo-3",
      name: "Грузовой отсек",
      type: "module",
      moduleType: "cargo",
      level: 3,
      maxHealth: 140,
      width: 1,
      height: 1,
      capacity: 100,
      consumption: 3,
      price: 1100,
      stock: 1,
      description: "Вместительный грузовой модуль",
    },
    {
      id: "shield-3",
      name: "Генератор щита",
      type: "module",
      moduleType: "shield",
      level: 3,
      maxHealth: 140,
      width: 1,
      height: 1,
      shields: 50,
      shieldRegen: 11,
      consumption: 14,
      defense: 4,
      price: 1400,
      stock: 1,
      description: "Усиленный щит последнего поколения",
    },
    {
      id: "scanner-3",
      name: "Сканер",
      type: "module",
      moduleType: "scanner",
      level: 3,
      maxHealth: 140,
      width: 1,
      height: 1,
      scanRange: 8,
      consumption: 6,
      price: 1000,
      stock: 1,
      description: "Сканер дальнего действия",
    },
    {
      id: "lifesupport-3",
      name: "Жизнеобеспечение",
      type: "module",
      moduleType: "lifesupport",
      level: 3,
      maxHealth: 140,
      width: 1,
      height: 1,
      oxygen: 12,
      consumption: 4,
      price: 1000,
      stock: 1,
      description: "Система жизнеобеспечения для больших экипажей",
    },
    {
      id: "medical-3",
      name: "Медотсек",
      type: "module",
      moduleType: "medical",
      level: 3,
      maxHealth: 140,
      width: 1,
      height: 1,
      consumption: 4,
      defense: 1,
      price: 1200,
      stock: 1,
      healing: 11,
      description: "Полноценный медицинский блок",
    },
    {
      id: "lab-3",
      name: "Научная лаборатория",
      type: "module",
      moduleType: "lab",
      level: 3,
      maxHealth: 140,
      width: 2,
      height: 2,
      consumption: 16,
      researchOutput: 12,
      defense: 1,
      price: 3200,
      stock: 1,
      description:
        "Проводит научные исследования технологий очень быстро",
    },
    {
      id: "quarters-3",
      name: "Жилой модуль",
      type: "module",
      moduleType: "quarters",
      level: 3,
      maxHealth: 140,
      width: 1,
      height: 2,
      capacity: 5,
      consumption: 3,
      price: 1200,
      stock: 1,
      description: "Просторные жилые апартаменты. +5 мест",
    },
    {
      id: "repair-bay-3",
      name: "Ремонтный отсек",
      type: "module",
      moduleType: "repair_bay",
      level: 3,
      maxHealth: 140,
      width: 1,
      height: 2,
      repairAmount: 7,
      repairTargets: 2,
      consumption: 16,
      price: 2000,
      stock: 1,
      description: "Улучшенные дроны ремонтируют 2 модуля на +7 HP за ход",
    },
    {
      id: "weaponbay-3",
      name: "Оружейная палуба",
      type: "module",
      moduleType: "weaponbay",
      level: 3,
      maxHealth: 140,
      width: 2,
      height: 1,
      consumption: 8,
      defense: 3,
      price: 1600,
      stock: 1,
      description: "Усиленная двойная оружейная палуба. +20% к урону установленного оружия",
    },
  ],
};

// Upgrades - всегда доступны, но ограничены по тиру
// Улучшения должны соответствовать разнице между модулями разных тиров
export const UPGRADES_BY_TIER: Record<number, ShopItem[]> = {
  1: [
    {
      id: "reactor-upgrade-1",
      name: "Улучшение реактора",
      type: "upgrade",
      targetType: "reactor",
      price: 1000,
      effect: { power: 5 },
      stock: 2,
      moduleType: "reactor",
      description: "Увеличивает мощность реактора на 5 единиц",
    },
    {
      id: "cargo-upgrade-1",
      name: "Расширение грузого отсека",
      type: "upgrade",
      targetType: "cargo",
      price: 800,
      effect: { capacity: 20 },
      stock: 2,
      moduleType: "cargo",
      description: "Увеличивает вместимость груза на 20 единиц",
    },
    {
      id: "fueltank-upgrade-1",
      name: "Улучшение бака",
      type: "upgrade",
      targetType: "fueltank",
      price: 850,
      effect: { capacity: 40 },
      stock: 2,
      moduleType: "fueltank",
      description: "Увеличивает ёмкость топливного бака на 40 единиц",
    },
    {
      id: "shield-upgrade-1",
      name: "Улучшение щита",
      type: "upgrade",
      targetType: "shield",
      price: 1100,
      effect: { shields: 15 },
      stock: 2,
      moduleType: "shield",
      description: "Увеличивает защиту щита на 15 единиц",
    },
    {
      id: "scanner-upgrade-1",
      name: "Улучшение сканера",
      type: "upgrade",
      targetType: "scanner",
      price: 800,
      effect: { scanRange: 2 },
      stock: 2,
      moduleType: "scanner",
      description: "Увеличивает радиус сканирования на 2 единицы",
    },
    {
      id: "lifesupport-upgrade-1",
      name: "Улучшение жизнеобеспечения",
      type: "upgrade",
      targetType: "lifesupport",
      price: 850,
      effect: { oxygen: 3 },
      stock: 2,
      moduleType: "lifesupport",
      description: "Увеличивает производство кислорода на 3 единицы",
    },
    {
      id: "engine-upgrade-1",
      name: "Настройка двигателя",
      type: "upgrade",
      targetType: "engine",
      price: 3000,
      effect: { fuelEfficiency: -2 },
      stock: 2,
      moduleType: "engine",
      description: "Снижает расход топлива на 2 единицы за прыжок",
    },
    {
      id: "drill-upgrade-1",
      name: "Улучшение бура",
      type: "upgrade",
      targetType: "drill",
      price: 900,
      effect: { level: 1 },
      stock: 2,
      moduleType: "drill",
      description:
        "Повышает уровень бура для добычи более ценных ресурсов",
    },
    {
      id: "medical-upgrade-1",
      name: "Улучшение медотсека",
      type: "upgrade",
      targetType: "medical",
      price: 1000,
      effect: { healing: 3 },
      stock: 2,
      moduleType: "medical",
      description: "Увеличивает скорость лечения экипажа на 4 единицы",
    },
    {
      id: "weaponbay-upgrade-1",
      name: "Улучшение оружейной палубы",
      type: "upgrade",
      targetType: "weaponbay",
      price: 1500,
      effect: { level: 1 },
      stock: 2,
      moduleType: "weaponbay",
      description: "Повышает уровень палубы. +10% к урону установленного оружия",
    },
    {
      id: "lab-upgrade-1",
      name: "Улучшение лаборатории",
      type: "upgrade",
      targetType: "lab",
      price: 1200,
      effect: { researchOutput: 3 },
      stock: 2,
      moduleType: "lab",
      description: "Увеличивает научную производительность на 3 единицы",
    },
    {
      id: "quarters-upgrade-1",
      name: "Улучшение жилого модуля",
      type: "upgrade",
      targetType: "quarters",
      price: 700,
      effect: { capacity: 1 },
      stock: 2,
      moduleType: "quarters",
      description: "Расширяет жилые помещения. +1 место для экипажа",
    },
    {
      id: "repair-bay-upgrade-1",
      name: "Улучшение ремонтного отсека",
      type: "upgrade",
      targetType: "repair_bay",
      price: 900,
      effect: { repairAmount: 2 },
      stock: 2,
      moduleType: "repair_bay",
      description: "Улучшает дроны. +2 HP к восстановлению за ход",
    },
  ],
  2: [
    {
      id: "reactor-upgrade-2",
      name: "Улучшение реактора",
      type: "upgrade",
      targetType: "reactor",
      price: 1800,
      effect: { power: 5 },
      stock: 1,
      moduleType: "reactor",
      description: "Увеличивает мощность реактора на 5 единиц",
    },
    {
      id: "cargo-upgrade-2",
      name: "Расширение грузого отсека",
      type: "upgrade",
      targetType: "cargo",
      price: 1400,
      effect: { capacity: 40 },
      stock: 1,
      moduleType: "cargo",
      description: "Увеличивает вместимость груза на 40 единиц",
    },
    {
      id: "fueltank-upgrade-2",
      name: "Улучшение бака",
      type: "upgrade",
      targetType: "fueltank",
      price: 1300,
      effect: { capacity: 60 },
      stock: 1,
      moduleType: "fueltank",
      description: "Увеличивает ёмкость топливного бака на 60 единиц",
    },
    {
      id: "shield-upgrade-2",
      name: "Улучшение щита",
      type: "upgrade",
      targetType: "shield",
      price: 1700,
      effect: { shields: 25 },
      stock: 1,
      moduleType: "shield",
      description: "Увеличивает защиту щита на 25 единиц",
    },
    {
      id: "scanner-upgrade-2",
      name: "Улучшение сканера",
      type: "upgrade",
      targetType: "scanner",
      price: 1300,
      effect: { scanRange: 3 },
      stock: 1,
      moduleType: "scanner",
      description: "Увеличивает радиус сканирования на 3 единицы",
    },
    {
      id: "lifesupport-upgrade-2",
      name: "Улучшение жизнеобеспечения",
      type: "upgrade",
      targetType: "lifesupport",
      price: 1300,
      effect: { oxygen: 4 },
      stock: 1,
      moduleType: "lifesupport",
      description: "Увеличивает производство кислорода на 4 единицы",
    },
    {
      id: "engine-upgrade-2",
      name: "Настройка двигателя",
      type: "upgrade",
      targetType: "engine",
      price: 6000,
      effect: { fuelEfficiency: -3 },
      stock: 1,
      moduleType: "engine",
      description: "Снижает расход топлива на 3 единицы за прыжок",
    },
    {
      id: "drill-upgrade-2",
      name: "Улучшение бура",
      type: "upgrade",
      targetType: "drill",
      price: 1500,
      effect: { level: 1 },
      stock: 1,
      moduleType: "drill",
      description:
        "Повышает уровень бура для добычи более ценных ресурсов",
    },
    {
      id: "medical-upgrade-2",
      name: "Улучшение медотсека",
      type: "upgrade",
      targetType: "medical",
      price: 1500,
      effect: { healing: 3 },
      stock: 1,
      moduleType: "medical",
      description: "Увеличивает скорость лечения экипажа на 6 единиц",
    },
    {
      id: "weaponbay-upgrade-2",
      name: "Улучшение оружейной палубы",
      type: "upgrade",
      targetType: "weaponbay",
      price: 2500,
      effect: { level: 1 },
      stock: 1,
      moduleType: "weaponbay",
      description: "Расширяет и усиливает палубу до 2×1. +10% к урону (итого +20%)",
    },
    {
      id: "lab-upgrade-2",
      name: "Улучшение лаборатории",
      type: "upgrade",
      targetType: "lab",
      price: 1200,
      effect: { researchOutput: 3 },
      stock: 2,
      moduleType: "lab",
      description: "Увеличивает научную производительность на 3 единицы",
    },
    {
      id: "quarters-upgrade-2",
      name: "Улучшение жилого модуля",
      type: "upgrade",
      targetType: "quarters",
      price: 1200,
      effect: { capacity: 1 },
      stock: 2,
      moduleType: "quarters",
      description: "Расширяет жилые помещения. +1 место для экипажа",
    },
    {
      id: "repair-bay-upgrade-2",
      name: "Улучшение ремонтного отсека",
      type: "upgrade",
      targetType: "repair_bay",
      price: 1500,
      effect: { repairAmount: 2 },
      stock: 2,
      moduleType: "repair_bay",
      description: "Улучшает дроны. +2 HP к восстановлению за ход",
    },
  ],
};


// Weapons - available at all stations
export const WEAPONS: ShopItem[] = [
  {
    id: "weapon-kinetic",
    name: "Кинетическое оружие",
    type: "weapon",
    weaponType: "kinetic",
    price: 200,
    stock: 3,
    requiresWeaponBay: true,
    moduleType: "weaponShed",
    description: "Стреляет снарядами на высокой скорости",
  },
  {
    id: "weapon-laser",
    name: "Лазерное оружие",
    type: "weapon",
    weaponType: "laser",
    price: 300,
    stock: 2,
    requiresWeaponBay: true,
    moduleType: "weaponShed",
    description: "Точный луч энергии, эффективен против щитов",
  },
  {
    id: "weapon-missile",
    name: "Ракетное оружие",
    type: "weapon",
    weaponType: "missile",
    price: 400,
    stock: 1,
    requiresWeaponBay: true,
    moduleType: "weaponShed",
    description: "Самонаводящиеся ракеты с высокой мощностью",
  },
];

// Engine upgrade prices
export const ENGINE_PRICES = {
  2: 1500,
  3: 3000,
};

// Generate station-specific items based on stationId hash
export function generateStationItems(
  stationId: string,
  sectorTier: number,
  stationConfig?: StationConfig,
): ShopItem[] {
  let hash = 0;
  for (let i = 0; i < stationId.length; i++) {
    hash = (hash << 5) - hash + stationId.charCodeAt(i);
    hash = hash & hash;
  }

  const items: ShopItem[] = [];

  // Available module levels by station tier:
  // - Tier 1: levels 1-2
  // - Tier 2: levels 1-3
  // - Tier 3: levels 1-3 (level 4 is BOSS REWARD ONLY)
  // - Tier 4 (secret): levels 3-4 (level 4 is BOSS REWARD ONLY)
  let availableLevels: number[];
  if (sectorTier === 1) {
    availableLevels = [1, 2];
  } else if (sectorTier === 2) {
    availableLevels = [1, 2, 3];
  } else if (sectorTier === 4) {
    // Secret tier 4: only high-tier modules (no level 4 - boss rewards only)
    availableLevels = [3];
  } else {
    // Tier 3 stations: levels 1-3 (level 4 is boss reward only)
    availableLevels = [1, 2, 3];
  }

  // Get upgrades for this tier and lower tiers
  // - Tier 1: tier 1 upgrades only (1→2)
  // - Tier 2+: tier 1 and tier 2 upgrades (1→2, 2→3)
  // Level 4 modules are boss rewards only — no tier 3 upgrades exist
  const upgradesToAdd: ShopItem[] = [];
  if (sectorTier >= 1) {
    upgradesToAdd.push(...(UPGRADES_BY_TIER[1] || []));
  }
  if (sectorTier >= 2) {
    upgradesToAdd.push(...(UPGRADES_BY_TIER[2] || []));
  }

  upgradesToAdd.forEach((upgrade) => {
    items.push({ ...upgrade, id: `${upgrade.id}-${stationId}` });
  });

  // Add guaranteed modules directly to items
  const guaranteedModules = stationConfig?.guaranteedModules || [];
  const guaranteedModuleIds = new Set<string>();
  guaranteedModules.forEach((moduleType) => {
    // Find modules of this type in available levels
    for (const level of availableLevels) {
      const levelModules = MODULES_BY_LEVEL[level] || [];
      const moduleItem = levelModules.find(
        (m) => m.moduleType === moduleType,
      );
      if (moduleItem) {
        const itemId = `${moduleItem.id}-${stationId}`;
        if (!guaranteedModuleIds.has(itemId)) {
          items.push({
            ...moduleItem,
            id: itemId,
          });
          guaranteedModuleIds.add(itemId);
        }
        break; // Only add one module per type
      }
    }
  });

  const numModules = 4 + (Math.abs(hash) % 5);
  let modulePool: ShopItem[] = [];
  availableLevels.forEach((level) => {
    modulePool = modulePool.concat(MODULES_BY_LEVEL[level] || []);
  });

  // Remove guaranteed modules from the random pool to avoid duplicates
  modulePool = modulePool.filter(
    (m) => !guaranteedModules.includes(m.moduleType),
  );

  const shuffled = [...modulePool].sort(() => {
    hash = (hash * 1103515245 + 12345) & 0x7fffffff;
    return (hash % 3) - 1;
  });

  for (let i = 0; i < Math.min(numModules, shuffled.length); i++) {
    const baseItem = shuffled[i];
    const itemId = `${baseItem.id}-${stationId}`;
    // Skip if already added as guaranteed module
    if (!guaranteedModuleIds.has(itemId)) {
      items.push({ ...baseItem, id: itemId });
    }
  }


  // Weapons - use guaranteedWeapons from station config
  const guaranteedWeapons = stationConfig?.guaranteedWeapons || [];

  if (guaranteedWeapons.length > 0) {
    // Add guaranteed weapons
    guaranteedWeapons.forEach((weaponType) => {
      const weapon = WEAPONS.find((w) => w.weaponType === weaponType);
      if (weapon) {
        items.push({ ...weapon, id: `${weapon.id}-${stationId}` });
      }
    });
  } else {
    // Random weapons for stations without guaranteed weapons
    const numWeapons = 1 + (Math.abs(hash >> 4) % 2);
    const shuffledWeapons = [...WEAPONS].sort(() => {
      hash = (hash * 1103515245 + 12345) & 0x7fffffff;
      return (hash % 3) - 1;
    });
    for (let i = 0; i < numWeapons; i++) {
      const weapon = shuffledWeapons[i];
      items.push({ ...weapon, id: `${weapon.id}-${stationId}` });
    }
  }

  return items;
}

// Get station-specific crew availability
export function getStationCrewCount(stationId: string): number {
  let hash = 0;
  for (let i = 0; i < stationId.length; i++) {
    hash = (hash << 5) - hash + stationId.charCodeAt(i);
    hash = hash & hash;
  }
  return 1 + (Math.abs(hash) % 5);
}

// Generate crew for a specific station
export function generateStationCrew(
  stationId: string,
  stationRace?: RaceId,
  stationConfig?: StationConfig,
): Array<{
  member: Omit<CrewMember, "id">;
  price: number;
  quality: Quality;
}> {
  const count = getStationCrewCount(stationId);
  const crewList: Array<{
    member: Omit<CrewMember, "id">;
    price: number;
    quality: Quality;
  }> = [];

  let seed = 0;
  for (let i = 0; i < stationId.length; i++) {
    seed = (seed << 5) - seed + stationId.charCodeAt(i);
    seed = seed & seed;
  }

  const professions: Profession[] = [
    "pilot",
    "engineer",
    "medic",
    "scout",
    "scientist",
    "gunner",
  ];

  // Get guaranteed professions from station config
  const guaranteedProfessions = stationConfig?.guaranteedProfessions || [];

  for (let i = 0; i < count; i++) {
    const rand1 = Math.abs(Math.sin(seed + i * 1000) * 10000) % 1;
    const rand2 = Math.abs(Math.sin(seed + i * 2000) * 10000) % 1;
    const rand3 = Math.abs(Math.sin(seed + i * 3000) * 10000) % 1;
    const rand4 = Math.abs(Math.sin(seed + i * 4000) * 10000) % 1;

    // Use guaranteed profession if available and we haven't used all guaranteed professions yet
    let profession: Profession;
    if (i < guaranteedProfessions.length) {
      profession = guaranteedProfessions[i];
    } else {
      profession = professions[Math.floor(rand1 * professions.length)];
    }

    let raceId: RaceId;
    // 70% chance for dominant race, 30% for other races
    if (stationRace && rand4 < 0.7) {
      raceId = stationRace;
    } else {
      // Use seeded random for race selection
      raceId = getRandomRace([], seed + i * 3000);
    }

    const quality = rollQuality(rand2);

    // Use seeded random for traits generation
    const traitSeed = seed + i * 5000;
    const hasHappiness = RACES[raceId]?.hasHappiness ?? true;
    const { traits, priceModifier } = generateCrewTraits(
      quality,
      traitSeed,
      hasHappiness,
    );

    const basePrice = CREW_BASE_PRICES[profession];
    // Generate level 1-3 for all crew based on quality and random
    const level = 1 + Math.floor(rand3 * 3); // Level 1-3
    const levelMod = level > 1 ? 1 + (level - 1) * 0.2 : 1;

    const name = getRandomName(profession, raceId, seed + i);

    // Calculate final price with safeguards against NaN
    const finalPrice = Math.round(
      basePrice * (priceModifier || 1) * levelMod,
    );

    const { ...member } = buildCrewMember({
      name,
      race: raceId,
      profession,
      level,
      traits,
    });

    crewList.push({ member, price: finalPrice, quality });
  }

  return crewList;
}
