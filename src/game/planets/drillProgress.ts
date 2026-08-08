/**
 * Сколько проходов бурения уже сделано на планете.
 *
 * Живёт отдельным листовым модулем намеренно: функцию читают и `planetaryDrill`,
 * и подсветка клеток экспедиции. Пока она лежала в `planetaryDrill`, любой её
 * потребитель значением утаскивал за собой `@/game/slices/ship/helpers` и дальше
 * по цепочке станционные компоненты — из-за чего `check:contract-targets`
 * спотыкался о JSX в графе, которого там быть не должно.
 */
export const getDrillsDone = (planet: {
    drillsDone?: number;
    planetaryDrilled?: boolean;
}): number => planet.drillsDone ?? (planet.planetaryDrilled ? 1 : 0);
