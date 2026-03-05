import { getArtifactEffectValue } from "@/game/artifacts";
import { RACES, RESEARCH_TREE, WEAPON_TYPES } from "@/game/constants";
import type { GameState, WeaponTypeTotal } from "@/game/types";

const INITIAL_DAMAGE: Record<WeaponTypeTotal, number> = {
    total: 0,
    kinetic: 0,
    laser: 0,
    missile: 0,
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
 *
 * @param state - Текущее состояние игры
 * @returns Объект с уроном по типам: total, kinetic, laser, missile
 */
export function getTotalDamage(state: GameState) {
    const dmg = { ...INITIAL_DAMAGE };

    // === Базовый урон от оружия ===
    state.ship.modules.forEach((m) => {
        if (m.disabled || m.manualDisabled || m.health <= 0) return;
        if (m.type === "weaponbay" && m.weapons) {
            m.weapons.forEach((w) => {
                if (w) {
                    const weaponType = WEAPON_TYPES[w.type];
                    const weaponDamage = weaponType.damage;

                    // Laser bonus: +20% damage to shields (calculated in combat)
                    // For display, show base damage
                    dmg.total += weaponDamage;
                    dmg[w.type] += weaponDamage;
                }
            });
        }
    });

    // === Расовые боевые бонусы ===
    // Применяется максимальный бонус от расы экипажа
    let combatBonus = 0;
    state.crew.forEach((c) => {
        const race = RACES[c.race];
        if (race?.crewBonuses.combat) {
            combatBonus = Math.max(combatBonus, race.crewBonuses.combat);
        }
    });
    if (combatBonus > 0) {
        dmg.total = Math.floor(dmg.total * (1 + combatBonus));
    }

    // === Бонусы от трейтов экипажа ===
    // Например, "Меткий стрелок": +10% damage
    let traitDamageBonus = 0;
    state.crew.forEach((c) => {
        c.traits?.forEach((trait) => {
            if (trait.effect?.damageBonus) {
                traitDamageBonus = Math.max(
                    traitDamageBonus,
                    trait.effect.damageBonus,
                );
            }
        });
    });

    if (traitDamageBonus > 0) {
        dmg.total = Math.floor(dmg.total * (1 + traitDamageBonus));
    }

    // === Бонусы от артефактов ===
    // Например, plasma_injector: +30% damage
    const plasmaInjector = state.artifacts.find(
        (a) => a.effect.type === "damage_boost" && a.effect.active,
    );

    if (plasmaInjector) {
        const boostValue = getArtifactEffectValue(plasmaInjector, state);
        dmg.total = Math.floor(dmg.total * (1 + boostValue));
    }

    // === Бонусы от технологий ===
    // Применяется максимальный бонус от исследованных технологий урона оружия
    const weaponDamageTechs = state.research.researchedTechs.filter(
        (techId) => {
            const tech = RESEARCH_TREE[techId];
            return tech.bonuses.some((b) => b.type === "weapon_damage");
        },
    );
    let techDamageBonus = 0;
    weaponDamageTechs.forEach((techId) => {
        const tech = RESEARCH_TREE[techId];
        tech.bonuses.forEach((bonus) => {
            if (bonus.type === "weapon_damage") {
                techDamageBonus = Math.max(techDamageBonus, bonus.value);
            }
        });
    });
    if (techDamageBonus > 0) {
        dmg.total = Math.floor(dmg.total * (1 + techDamageBonus));
    }

    // === Расовые бонусы к артефактам ===
    // Например, crystalline resonance: +15% to artifact effects
    let artifactBonus = 0;
    state.crew.forEach((c) => {
        const race = RACES[c.race];
        if (race?.specialTraits) {
            const trait = race.specialTraits.find(
                (t) => t.id === "resonance" && t.effects.artifactBonus,
            );
            if (trait) {
                artifactBonus = Math.max(
                    artifactBonus,
                    trait.effects.artifactBonus as number,
                );
            }
        }
    });

    return dmg;
}
