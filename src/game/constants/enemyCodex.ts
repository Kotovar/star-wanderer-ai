import type { EnemyShip, Location } from "@/game/types";

type ShipEnemyCodexId = Exclude<EnemyShip, "space_monster">;
type BossEnemyCodexId = `boss:${string}`;

export type EnemyCodexId =
  | ShipEnemyCodexId
  | `space_monster:${NonNullable<Location["spaceMonsterType"]>}`
  | BossEnemyCodexId
  | "ancient_boss";

export type EnemyCodexShipEntry = {
  id: ShipEnemyCodexId;
  icon: string;
  nameKey: string;
  descriptionKey: string;
};

export const ENEMY_CODEX_SHIP_ENTRIES = [
  {
    id: "pirate",
    icon: "☠️",
    nameKey: "enemy_codex.ships.pirate.name",
    descriptionKey: "enemy_codex.ships.pirate.description",
  },
  {
    id: "raider",
    icon: "⚔️",
    nameKey: "enemy_codex.ships.raider.name",
    descriptionKey: "enemy_codex.ships.raider.description",
  },
  {
    id: "mercenary",
    icon: "🎯",
    nameKey: "enemy_codex.ships.mercenary.name",
    descriptionKey: "enemy_codex.ships.mercenary.description",
  },
  {
    id: "marauder",
    icon: "🛠️",
    nameKey: "enemy_codex.ships.marauder.name",
    descriptionKey: "enemy_codex.ships.marauder.description",
  },
  {
    id: "human_guard",
    icon: "🛡️",
    nameKey: "enemy_codex.ships.human_guard.name",
    descriptionKey: "enemy_codex.ships.human_guard.description",
  },
  {
    id: "synthetic_guard",
    icon: "🤖",
    nameKey: "enemy_codex.ships.synthetic_guard.name",
    descriptionKey: "enemy_codex.ships.synthetic_guard.description",
  },
  {
    id: "xenosymbiont_guard",
    icon: "🧬",
    nameKey: "enemy_codex.ships.xenosymbiont_guard.name",
    descriptionKey: "enemy_codex.ships.xenosymbiont_guard.description",
  },
  {
    id: "krylorian_guard",
    icon: "🦗",
    nameKey: "enemy_codex.ships.krylorian_guard.name",
    descriptionKey: "enemy_codex.ships.krylorian_guard.description",
  },
  {
    id: "voidborn_guard",
    icon: "🌌",
    nameKey: "enemy_codex.ships.voidborn_guard.name",
    descriptionKey: "enemy_codex.ships.voidborn_guard.description",
  },
  {
    id: "crystalline_guard",
    icon: "💠",
    nameKey: "enemy_codex.ships.crystalline_guard.name",
    descriptionKey: "enemy_codex.ships.crystalline_guard.description",
  },
] as const satisfies readonly EnemyCodexShipEntry[];

export const ANCIENT_BOSS_CODEX_ENTRY = {
  id: "ancient_boss",
  icon: "⚙️",
  nameKey: "enemy_codex.ancient_boss.name",
  descriptionKey: "enemy_codex.ancient_boss.description",
} as const;

export function getEnemyCodexId(
  enemy: Pick<Location, "enemyType" | "spaceMonsterType">,
): EnemyCodexId | null {
  if (!enemy.enemyType) return null;
  if (enemy.enemyType === "space_monster") {
    return enemy.spaceMonsterType
      ? `space_monster:${enemy.spaceMonsterType}`
      : null;
  }
  return enemy.enemyType;
}

export const getBossCodexId = (bossId: string): BossEnemyCodexId =>
  `boss:${bossId}`;

// Retained only for saves made before boss discoveries were tracked separately.
export const getAncientBossCodexId = (): "ancient_boss" => "ancient_boss";

export function addEnemyCodexEntry(
  discoveredIds: string[],
  entryId: EnemyCodexId | null,
): string[] {
  return entryId && !discoveredIds.includes(entryId)
    ? [...discoveredIds, entryId]
    : discoveredIds;
}
