import { getArtifactEffectValue } from "@/game/artifacts";
import {
    CREW_ASSIGNMENT_BONUSES,
    RACES,
    RESEARCH_TREE,
    WEAPON_TYPES,
} from "@/game/constants";
import { getMergeEffectsBonus } from "@/game/slices/crew/helpers";
import type { GameState, TechnologyId, WeaponTypeTotal } from "@/game/types";

const INITIAL_DAMAGE: Record<WeaponTypeTotal, number> = {
    total: 0,
    kinetic: 0,
    laser: 0,
    missile: 0,
    plasma: 0,
    drones: 0,
    antimatter: 0,
    quantum_torpedo: 0,
};

/**
 * Вычисляет базовый урон от оружия
 */
function getBaseWeaponDamage(modules: GameState["ship"]["modules"]) {
    const damage = { ...INITIAL_DAMAGE };

    modules
        .filter(
            (m) =>
                m.type === "weaponbay" &&
                m.weapons &&
                !m.disabled &&
                !m.manualDisabled &&
                m.health > 0,
        )
        .forEach((m) => {
            // +10% damage bonus per level above 1 (lv1=0%, lv2=+10%, lv3=+20%, lv4=+30%)
            const bayLevelBonus = 1 + ((m.level ?? 1) - 1) * 0.1;
            m.weapons?.forEach((w) => {
                if (w && WEAPON_TYPES[w.type]) {
                    const weaponDamage = Math.floor(WEAPON_TYPES[w.type].damage * bayLevelBonus);
                    damage.total += weaponDamage;
                    damage[w.type] += weaponDamage;
                }
            });
        });

    return damage;
}

/**
 * Вычисляет максимальный бонус от расы экипажа
 */
const getMaxRaceCombatBonus = (crew: GameState["crew"]) =>
    crew.reduce((maxBonus, c) => {
        const raceBonus = RACES[c.race]?.crewBonuses.combat ?? 0;
        return Math.max(maxBonus, raceBonus);
    }, 0);

/**
 * Вычисляет бонус от артефактов на урон
 */
const getArtifactDamageBonus = (
    artifacts: GameState["artifacts"],
    state: GameState,
) => {
    const artifact = artifacts.find(
        (a) => a.effect.type === "damage_boost" && a.effect.active,
    );

    if (!artifact) return 0;
    return getArtifactEffectValue(artifact, state);
};

/**
 * Вычисляет бонус от технологий на урон
 */
const getTechDamageBonus = (research: GameState["research"]) =>
    research.researchedTechs.reduce((maxBonus, techId) => {
        const tech = RESEARCH_TREE[techId as TechnologyId];
        const techBonus =
            tech.bonuses
                .filter((b: { type: string }) => b.type === "weapon_damage")
                .reduce(
                    (bonusMax: number, b: { value: number }) =>
                        Math.max(bonusMax, b.value),
                    0,
                ) || 0;
        return Math.max(maxBonus, techBonus);
    }, 0);

/**
 * Применяет процентный бонус к урону
 */
const applyDamageBonus = (damage: number, bonus: number) => {
    if (bonus <= 0) return damage;
    return Math.floor(damage * (1 + bonus));
};

/**
 * Вычисляет общий урон корабля по типам оружия
 *
 * Учитывает:
 * - Базовый урон от оружия в weapon bay модулях
 * - Расовые боевые бонусы экипажа (например, krylorian: +35% combat)
 * - Бонусы от трейтов экипажа (например, "Меткий стрелок": +10% damage)
 * - Бонусы от артефактов (например, plasma_injector: +30% damage)
 * - Бонусы от технологий урона оружия
 * - Расовые бонусы к артефактам (например, crystalline resonance)
 * - Бонусы от боевых заданий (overclock, rapidfire, analysis)
 *
 * @param state - Текущее состояние игры
 * @returns Объект с уроном по типам: total, kinetic, laser, missile
 */
export function getTotalDamage(state: GameState) {
    const { crew, artifacts, research, ship } = state;

    // === Базовый урон от оружия ===
    const damage = getBaseWeaponDamage(ship.modules);

    // === Расовые боевые бонусы ===
    const combatBonus = getMaxRaceCombatBonus(crew);
    damage.total = applyDamageBonus(damage.total, combatBonus);

    // === Временный бонус от планетарных эффектов (Крилориане) ===
    if (ship.bonusDamage && ship.bonusDamage > 0) {
        damage.total = applyDamageBonus(damage.total, ship.bonusDamage);
    }

    // === Бонусы от артефактов ===
    const artifactBonus = getArtifactDamageBonus(artifacts, state);
    damage.total = applyDamageBonus(damage.total, artifactBonus);

    // === Бонусы от технологий ===
    const techBonus = getTechDamageBonus(research);
    damage.total = applyDamageBonus(damage.total, techBonus);

    // === Бонусы от боевых заданий (только в бою) ===
    const combatBonuses = {
        overclock: crew.some((c) => c.combatAssignment === "overclock"),
        rapidfire: crew.some((c) => c.combatAssignment === "rapidfire"),
        analysis:
            crew.some((c) => c.combatAssignment === "analysis") &&
            crew.some((c) => c.profession === "gunner") &&
            crew.some((c) => c.combatAssignment === "targeting"),
    };

    if (combatBonuses.overclock) {
        const engineerLevel =
            crew.find((c) => c.combatAssignment === "overclock")?.level ?? 1;
        damage.total = applyDamageBonus(
            damage.total,
            CREW_ASSIGNMENT_BONUSES.OVERCLOCK_DAMAGE + engineerLevel * 0.01,
        );
    }
    if (combatBonuses.rapidfire) {
        const gunnerLevel =
            crew.find((c) => c.combatAssignment === "rapidfire")?.level ?? 1;
        damage.total = applyDamageBonus(
            damage.total,
            CREW_ASSIGNMENT_BONUSES.RAPIDFIRE_DAMAGE + gunnerLevel * 0.01,
        );
    }
    if (combatBonuses.analysis) {
        const scientistLevel =
            crew.find((c) => c.combatAssignment === "analysis")?.level ?? 1;
        damage.total = applyDamageBonus(
            damage.total,
            CREW_ASSIGNMENT_BONUSES.ANALYSIS_DAMAGE + scientistLevel * 0.01,
        );
    }

    // === Бонус от сращивания ксеноморфов с weaponbay ===
    const mergeBonus = getMergeEffectsBonus(crew, ship.modules);
    if (mergeBonus.weaponDamage) {
        damage.total = applyDamageBonus(
            damage.total,
            mergeBonus.weaponDamage / 100,
        );
    }

    return damage;
}
