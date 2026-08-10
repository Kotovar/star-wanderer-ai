import { getSectorRule } from "@/game/galaxy/sectorRules";
import { getArtifactHint } from "@/game/artifacts/utils";
import { store as i18nStore } from "@/lib/useTranslation";
import type { ActiveEffect, GameStore, Sector, SetState } from "@/game/types";

type SectorShipBonuses = {
    damage: number;
    evasion: number;
    shields: number;
};

const getSectorShipBonuses = (
    effects: ActiveEffect[],
): SectorShipBonuses => {
    const bonuses: SectorShipBonuses = { damage: 0, evasion: 0, shields: 0 };

    for (const effect of effects) {
        if (effect.source !== "sector") continue;

        // Щит откатываем ровно тем, что реально сняли: у корабля без щитовых
        // модулей штраф упирается в 0, и вернуть весь номинал нельзя.
        bonuses.shields += effect.appliedShieldDelta ?? 0;

        for (const item of effect.effects) {
            if (typeof item.value !== "number") continue;

            switch (item.type) {
                case "combat_bonus":
                    bonuses.damage += item.value;
                    break;
                case "evasion_bonus":
                    bonuses.evasion += Math.round(item.value * 100);
                    break;
            }
        }
    }

    return bonuses;
};

/** Replaces the current-sector effect after the destination has been installed. */
export const applySectorRuleEffect = (
    sector: Sector | null,
    set: SetState,
    get: () => GameStore,
): void => {
    const rule = getSectorRule(sector?.ruleId);
    const gameState = get();
    const previousBonuses = getSectorShipBonuses(gameState.activeEffects);
    const artifactHint =
        !sector?.visited &&
        rule?.effects.some(
            (effect) => effect.type === "artifact_hints" && Number(effect.value) > 0,
        )
            ? getArtifactHint(gameState)
            : null;
    // Щитовой резерв без вклада прошлого правила: от него считаем новый штраф,
    // чтобы упор в 0 не превратился при вылете в бесплатные щиты.
    const baseMaxShields = gameState.ship.maxShields - previousBonuses.shields;
    const nominalShields = (rule?.effects ?? []).reduce(
        (sum, effect) =>
            effect.type === "shield_boost" && typeof effect.value === "number"
                ? sum + effect.value
                : sum,
        0,
    );
    const appliedShieldDelta =
        Math.max(0, baseMaxShields + nominalShields) - baseMaxShields;
    const nextEffects: ActiveEffect[] = rule
        ? [
              {
                  id: `sector-rule-${rule.id}`,
                  definitionId: `sector-rule-${rule.id}`,
                  name: i18nStore.t(rule.nameKey),
                  description: i18nStore.t(rule.descKey),
                  nameKey: rule.nameKey,
                  descriptionKey: rule.descKey,
                  source: "sector",
                  polarity: rule.polarity,
                  icon: rule.icon,
                  color: rule.color,
                  acquiredTurn: get().turn,
                  turnsRemaining: 0,
                  permanent: true,
                  effects: [...rule.effects],
                  appliedShieldDelta,
              },
          ]
        : [];
    const nextBonuses = getSectorShipBonuses(nextEffects);

    set((state) => {
        const maxShields =
            state.ship.maxShields - previousBonuses.shields + nextBonuses.shields;

        return {
            activeEffects: [
                ...state.activeEffects.filter((effect) => effect.source !== "sector"),
                ...nextEffects,
            ],
            artifacts: artifactHint
                ? state.artifacts.map((artifact) =>
                      artifact.id === artifactHint.artifactId
                          ? {
                                ...artifact,
                                hinted: true,
                                hintSource: "sector",
                                hintedAt: artifactHint.hintedAt,
                            }
                          : artifact,
                  )
                : state.artifacts,
            ship: {
                ...state.ship,
                // Штрафы правил обязаны уходить в минус: упор в 0 при входе
                // превратился бы при вылете в подарок. Потолок и пол — в
                // getTotalDamage/getTotalEvasion, где бонусы читают.
                bonusDamage:
                    (state.ship.bonusDamage ?? 0) -
                    previousBonuses.damage +
                    nextBonuses.damage,
                bonusEvasion:
                    (state.ship.bonusEvasion ?? 0) -
                    previousBonuses.evasion +
                    nextBonuses.evasion,
                bonusShields:
                    (state.ship.bonusShields ?? 0) -
                    previousBonuses.shields +
                    nextBonuses.shields,
                maxShields,
                shields: Math.max(
                    0,
                    Math.min(
                        maxShields,
                        state.ship.shields -
                            previousBonuses.shields +
                            nextBonuses.shields,
                    ),
                ),
            },
        };
    });

    if (artifactHint) {
        get().addLog(i18nStore.t("sector_rules.logs.artifact_hint"), "info");
    }
};
