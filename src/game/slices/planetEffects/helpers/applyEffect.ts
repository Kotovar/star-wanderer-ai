import type {
    GameStore,
    SetState,
    RaceId,
    ActiveEffect,
    PlanetSpecialization,
} from "@/game/types";
import { PLANET_SPECIALIZATIONS } from "@/game/constants/planets";
import { scanSector } from "./scanSector";

/**
 * Применяет эффект планеты к состоянию игры
 *
 * @param raceId - ID расы, чей эффект активируется
 * @param planetId - Опциональный ID планеты (для установки кулдауна)
 * @param set - Функция обновления состояния
 * @param get - Функция получения текущего состояния
 * @returns true если эффект успешно применён, false иначе
 */
export const applyPlanetEffect = (
    raceId: RaceId,
    planetId: string | undefined,
    set: SetState,
    get: () => GameStore,
): boolean => {
    const spec = PLANET_SPECIALIZATIONS[raceId];
    if (!spec) {
        get().addLog(`Эффект для расы ${raceId} не найден!`, "error");
        return false;
    }

    const state = get();

    // Проверка достаточности кредитов
    if (state.credits < spec.cost) {
        get().addLog(
            `Недостаточно кредитов для ${spec.name}! Нужно ${spec.cost}₢`,
            "error",
        );
        return false;
    }

    // Создаём объект активного эффекта на основе данных из констант
    const activeEffect: ActiveEffect = {
        id: `effect-${raceId}-${Date.now()}`,
        name: spec.name,
        description: spec.description,
        raceId,
        turnsRemaining: spec.duration,
        effects: spec.effects.map((e) => ({
            type: e.type as ActiveEffect["effects"][number]["type"],
            value: e.value,
        })),
    };

    // Применяем эффекты в зависимости от типа
    switch (raceId) {
        case "human":
            applyHumanEffect(set, get);
            break;

        case "synthetic":
            applySyntheticEffect(set, get);

            set((s) => ({
                credits: s.credits - spec.cost,
                planetCooldowns: planetId
                    ? { ...s.planetCooldowns, [planetId]: spec.cooldown ?? 999 }
                    : s.planetCooldowns,
            }));
            get().addLog(
                `${spec.icon} ${spec.name}: ${spec.effects.map((e) => e.description).join(", ")}`,
                "info",
            );
            return true;

        case "xenosymbiont":
            applyXenosymbiontEffect(spec, set, get);
            break;

        case "krylorian":
            applyKrylorianEffect(spec, set);
            break;

        case "crystalline":
            applyCrystallineEffect(spec, set);
            break;

        case "voidborn":
            break;

        default:
            // Для рас без специфических эффектов
            break;
    }

    // Добавляем активный эффект и списываем кредиты
    set((s) => ({
        credits: s.credits - spec.cost,
        activeEffects: [...s.activeEffects, activeEffect],
        planetCooldowns: planetId
            ? { ...s.planetCooldowns, [planetId]: spec.cooldown ?? 999 }
            : s.planetCooldowns,
    }));

    // Формируем сообщение лога на основе эффектов
    const effectDescriptions = spec.effects
        .map((e) => e.description)
        .join(", ");
    get().addLog(`${spec.icon} ${spec.name}: ${effectDescriptions}`, "info");

    return true;
};

/**
 * Применяет эффект ксеноморфов-симбионтов
 * +5 к максимальному здоровью всему экипажу (постоянно)
 * +15 к регенерации здоровья за ход (на 15 ходов через activeEffects)
 */
const applyXenosymbiontEffect = (
    spec: PlanetSpecialization,
    set: SetState,
    get: () => GameStore,
) => {
    const healthEffect = spec.effects.find((e) => e.type === "health_boost");
    const regenEffect = spec.effects.find((e) => e.type === "health_regen");

    const healthValue =
        typeof healthEffect?.value === "number" ? healthEffect.value : 5;
    const regenValue =
        typeof regenEffect?.value === "number" ? regenEffect.value : 15;

    // Применяем постоянное увеличение здоровья
    set((s) => ({
        crew: s.crew.map((c) => ({
            ...c,
            maxHealth: c.maxHealth + healthValue,
            health: c.health + healthValue,
        })),
    }));

    // Лог о регенерации (будет применяться через систему активных эффектов)
    get().addLog(
        `🧬 Биоулучшение: +${regenValue} к регенерации здоровья за ход на ${spec.duration} ходов`,
        "info",
    );
};

/**
 * Применяет эффект крилориан
 * +15% к урону (bonusDamage), +10% к уклонению
 */
const applyKrylorianEffect = (spec: PlanetSpecialization, set: SetState) => {
    const evasionEffect = spec.effects.find((e) => e.type === "evasion_bonus");
    const combatEffect = spec.effects.find((e) => e.type === "combat_bonus");

    const evasionBonus =
        typeof evasionEffect?.value === "number" ? evasionEffect.value : 0.1;
    const damageBonus =
        typeof combatEffect?.value === "number" ? combatEffect.value : 0.15;

    set((s) => ({
        ship: {
            ...s.ship,
            bonusEvasion: (s.ship.bonusEvasion ?? 0) + evasionBonus * 100,
            bonusDamage: (s.ship.bonusDamage ?? 0) + damageBonus,
        },
    }));
};

/**
 * Применяет эффект кристаллических существ
 * +10 к энергии, +25 к щитам
 */
const CRYSTALLINE_BASE_SHIELD_REGEN = 3; // per turn, active even without shield modules

const applyCrystallineEffect = (spec: PlanetSpecialization, set: SetState) => {
    const powerEffect = spec.effects.find((e) => e.type === "power_boost");
    const shieldEffect = spec.effects.find((e) => e.type === "shield_boost");

    const powerValue =
        typeof powerEffect?.value === "number" ? powerEffect.value : 10;
    const shieldValue =
        typeof shieldEffect?.value === "number" ? shieldEffect.value : 25;

    set((s) => ({
        ship: {
            ...s.ship,
            maxShields: s.ship.maxShields + shieldValue,
            shields: s.ship.shields + shieldValue,
            bonusPower: (s.ship.bonusPower || 0) + powerValue,
            bonusShields: (s.ship.bonusShields || 0) + shieldValue,
            bonusShieldRegen:
                (s.ship.bonusShieldRegen || 0) + CRYSTALLINE_BASE_SHIELD_REGEN,
        },
    }));
};

/**
 * Применяет эффект людей (Космическая Академия)
 * Для людей эффект требует выбора члена экипажа - обучение происходит через trainCrew()
 */
const applyHumanEffect = (set: SetState, get: () => GameStore) => {
    // Эффект людей требует выбора члена экипажа для обучения
    // Вызывается через trainCrew из UI после выбора
    get().addLog(
        `🎓 Космическая Академия: выберите члена экипажа для обучения`,
        "info",
    );
};

/**
 * Применяет эффект синтетиков (Архивы Данных)
 * Сканирует сектор и находит подсказки об артефактах
 */
const applySyntheticEffect = (set: SetState, get: () => GameStore) => {
    scanSector(set, get);
};
