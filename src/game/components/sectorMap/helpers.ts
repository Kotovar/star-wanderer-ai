import { getLocationName } from "@/lib/translationHelpers";
import { ANCIENT_BOSSES } from "@/game/constants/bosses";
import { RACES } from "@/game/constants/races";
import {
  ENEMY_TYPE_MODIFIERS,
  MODULE_DAMAGE_PER_THREAT,
  MODULE_HEALTH_BASE,
  REACTOR_HP_MULTIPLIER,
  SHIELD_CONTRIBUTION_PER_THREAT,
} from "@/game/slices/combat/helpers/combatSetup";
import { SHIP_LOCATION_TYPES } from "@/game/types/locations/locations";
import type { Location, LocationType, RaceId, StarType, StormType } from "@/game/types";

/**
 * Возвращает цвет фона для сектора на основе типа звезды
 */
export function getStarBackgroundColor(starType: StarType | undefined): string {
  switch (starType) {
    case "red_dwarf":
      return "#0a0810"; // Тёмный с красноватым оттенком
    case "yellow_dwarf":
      return "#0a0a08"; // Тёмный с желтоватым оттенком
    case "white_dwarf":
      return "#080a10"; // Тёмный с голубоватым оттенком
    case "blue_giant":
      return "#050818"; // Тёмный с синим оттенком
    case "red_supergiant":
      return "#0c0608"; // Тёмный с красно-оранжевым оттенком
    case "neutron_star":
      return "#080814"; // Тёмный с фиолетовым оттенком
    case "gas_giant":
      return "#050a08"; // Тёмный с зеленоватым оттенком
    case "double":
      return "#0a0908"; // Тёмный с оранжевым оттенком
    case "triple":
      return "#0c0808"; // Тёмный с красно-оранжевым оттенком
    case "blackhole":
      return "#06040a"; // Тёмный с фиолетово-чёрным оттенком
    case "variable_star":
      return "#0a0806"; // Тёмный с тёплым оттенком
    case "stellar_remnant":
      return "#080808"; // Почти чёрный, слабый свет
    default:
      return "#050810"; // Стандартный тёмный фон
  }
}

/**
 * Возвращает цвет свечения для звезды
 */
export function getStarGlowColor(starType: StarType | undefined): string {
  switch (starType) {
    case "red_dwarf":
      return "rgba(255, 80, 40, 0.07)";
    case "yellow_dwarf":
      return "rgba(255, 220, 60, 0.09)";
    case "white_dwarf":
      return "rgba(180, 210, 255, 0.08)";
    case "blue_giant":
      return "rgba(80, 140, 255, 0.1)";
    case "red_supergiant":
      return "rgba(255, 60, 30, 0.09)";
    case "neutron_star":
      return "rgba(140, 140, 255, 0.09)";
    case "gas_giant":
      return "rgba(0, 255, 100, 0.07)";
    case "double":
      return "rgba(255, 200, 80, 0.08)";
    case "triple":
      return "rgba(255, 180, 60, 0.08)";
    case "blackhole":
      return "rgba(180, 60, 255, 0.05)";
    case "variable_star":
      return "rgba(255, 200, 120, 0.09)";
    case "stellar_remnant":
      return "rgba(180, 180, 180, 0.04)";
    default:
      return "rgba(255, 220, 80, 0.07)";
  }
}

function getPlanetTypeTranslation(
  planetType: string,
  t: (key: string) => string,
): string {
  const map: Record<string, string> = {
    Пустынная: t("planet_types.desert"),
    Ледяная: t("planet_types.ice"),
    Лесная: t("planet_types.forest"),
    Вулканическая: t("planet_types.volcanic"),
    Океаническая: t("planet_types.ocean"),
    Кристаллическая: t("planet_types.crystalline"),
    Радиоактивная: t("planet_types.radioactive"),
    Тропическая: t("planet_types.tropical"),
    Арктическая: t("planet_types.arctic"),
    "Разрушенная войной": t("planet_types.war_torn"),
    "Планета-кольцо": t("planet_types.ring"),
    Приливная: t("planet_types.tidal"),
  };
  return map[planetType] || planetType;
}

function getStationTypeTranslation(
  stationType: string,
  t: (key: string) => string,
): string {
  const map: Record<string, string> = {
    trade: t("locations.station_types.trade"),
    military: t("locations.station_types.military"),
    research: t("locations.station_types.research"),
    mining: t("locations.station_types.mining"),
    shipyard: t("locations.station_types.shipyard"),
    medical: t("locations.station_types.medical"),
    industrial: t("locations.station_types.industrial"),
    diplomatic: t("locations.station_types.diplomatic"),
  };
  return map[stationType] || stationType;
}

export function getScannerInfo(
  loc: Location,
  scanRange: number,
  isRevealed: boolean = false,
  t: (key: string) => string,
): string[] {
  const info: string[] = [];
  const completed = loc.mined || loc.bossDefeated || loc.signalResolved;

  // Race name translations
  const raceNames: Record<RaceId, string> = {
    human: t("races.human.name"),
    synthetic: t("races.synthetic.name"),
    xenosymbiont: t("races.xenosymbiont.name"),
    krylorian: t("races.krylorian.name"),
    voidborn: t("races.voidborn.name"),
    crystalline: t("races.crystalline.name"),
  };

  // If location was revealed (e.g., approached without scanner), show full info
  if (isRevealed) {
    info.push(`📍 ${getLocationName(loc.name, t)}`);

    // Show type-specific info
    if (loc.type === "enemy") {
      info.push(`⚔️ ${t("locations.enemy_ship")}`);
      info.push(`${t("locations.threat")}: ${loc.threat ?? 1}`);
    } else if (loc.type === "space_monster") {
      info.push(`🪼 ${t("location_types.space_monster")}`);
      info.push(`${t("locations.threat")}: ${loc.threat ?? 1}`);
    } else if (loc.type === "friendly_ship") {
      info.push(`🤝 ${t("locations.friendly_ship")}`);
      if (loc.shipRace) {
        info.push(`🧬 ${raceNames[loc.shipRace] || loc.shipRace}`);
      }
    } else if (loc.type === "boss") {
      info.push(`⚠️ ${t("locations.ancient_ship")}`);
    } else if (loc.type === "storm") {
      info.push(`🌪️ ${t("locations.cosmic_storm")}`);
    } else if (loc.type === "anomaly") {
      if (scanRange >= 8) {
        const type =
          loc.anomalyType === "good"
            ? t("locations.anomaly_beneficial")
            : t("locations.anomaly_dangerous");
        info.push(`🔮 ${type}`);
      } else {
        info.push(`🔮 ${t("locations.anomaly_unknown")}`);
      }
    } else if (loc.type === "planet") {
      info.push(`🪐 ${t("locations.planet")}`);
      info.push(
        `🏷️ ${loc.planetType ? getPlanetTypeTranslation(loc.planetType, t) : t("locations.unknown")}`,
      );
      if (loc.isEmpty) {
        info.push(`🏜️ ${t("locations.deserted")}`);
      } else if (loc.dominantRace) {
        const raceName =
          raceNames[loc.dominantRace as RaceId] || loc.dominantRace;
        info.push(`🧬 ${raceName}`);
      }
    } else if (loc.type === "station") {
      if (loc.stationType) {
        info.push(
          `🏷️ ${getStationTypeTranslation(loc.stationType, t)}`,
        );
      }
    } else if (loc.type === "asteroid_belt") {
      info.push(`⛏️ ${t("locations.asteroid_belt")}`);
      info.push(`🏷️ ${t("locations.tier")}: ${loc.asteroidTier || 1}`);
    } else if (loc.type === "gas_giant") {
      info.push(`🪸 ${t("locations.gas_giant")}`);
    } else if (loc.type === "wreck_field") {
      const tier = loc.wreckTier ?? 1;
      info.push(`💀 Поле обломков (тир ${tier})`);
      info.push(`☢ Радиационный фон`);
    }

    return info;
  }

  // Stations, planets, asteroid belts, and distress signals are always visible
  if (loc.type === "station") {
    info.push(`📍 ${getLocationName(loc.name, t)}`);
    // Тип станции виден всегда: станции не скрываются сканером
    if (loc.stationType) {
      info.push(`🏷️ ${getStationTypeTranslation(loc.stationType, t)}`);
    }
    return info;
  }

  // For other objects, check if scanner can detect them
  const locTier = loc.threat || loc.anomalyTier || 1;
  const canDetect = canDetectObject(loc.type, scanRange, locTier);

  if (!canDetect) {
    // No scanner detection - show as unknown
    // Ships (enemy, friendly, boss, derelict) show as "Unknown ship" because they use ship icon
    if (SHIP_LOCATION_TYPES.includes(loc.type)) {
      info.push(`❓ ${t("locations.unknown_ship")}`);
    } else if (loc.type === "planet") {
      info.push(`🌏 ${t("locations.planet")}`);
    } else if (loc.type === "asteroid_belt") {
      info.push(`🪨 ${t("locations.asteroid_belt")}`);
    } else if (loc.type === "gas_giant") {
      info.push(`🪸 ${t("locations.gas_giant")}`);
    } else if (loc.type === "wreck_field") {
      info.push(`💀 Поле обломков`);
    } else {
      info.push(`❓ ${t("locations.unknown_object")}`);
    }
    return info;
  }

  if (loc.type === "planet") {
    info.push(`📍 ${getLocationName(loc.name, t)}`);
    // Planet type requires scanRange >= 3 to detect
    if (scanRange >= 3 && loc.planetType) {
      info.push(`🏷️ ${getPlanetTypeTranslation(loc.planetType, t)}`);
    }
    // Planet details (empty or colonized) requires scanRange >= 5
    if (scanRange >= 5) {
      if (loc.isEmpty) {
        info.push(`🏜️ ${t("locations.deserted")}`);
      } else if (loc.dominantRace) {
        const raceName =
          raceNames[loc.dominantRace] || loc.dominantRace;
        info.push(`🧬 ${raceName}`);
        // Population amount requires scanRange >= 8
        if (scanRange >= 8 && loc.population) {
          info.push(
            `👥 ${t("locations.population")}: ${loc.population}k`,
          );
        }
      }
    }
    return info;
  }
  if (loc.type === "asteroid_belt") {
    info.push(`📍 ${getLocationName(loc.name, t)}`);
    // Always show asteroid tier with any scanner detection
    info.push(`🏷️ ${t("locations.tier")}: ${loc.asteroidTier || 1}`);
    if (scanRange >= 15 && loc.resources && !completed) {
      info.push(
        `📦 ${t("locations.minerals")}: ~${loc.resources.minerals}`,
      );
      if (loc.resources.rare > 0)
        info.push(`💎 ${t("locations.rare")}: ~${loc.resources.rare}`);
      info.push(`₢ ~${loc.resources.credits}₢`);
    }
    // Hidden rewards for ancient asteroid belts
    if (scanRange >= 8 && loc.asteroidTier === 4 && !completed) {
      const detectionChance = Math.min(100, 50 + (scanRange - 8) * 5);
      if (Math.random() * 100 < detectionChance) {
        info.push(`★ Древние артефакты!`);
      }
    }
    return info;
  }
  if (loc.type === "derelict_ship") {
    info.push(`🛸 ${t("locations.derelict_ship")}`);
    if (loc.derelictExplored) {
      info.push(`✓ Исследовано`);
    } else {
      info.push(`📐 Возможен чертёж модуля`);
    }
    return info;
  }
  if (loc.type === "space_monster") {
    info.push(`🪼 ${t("location_types.space_monster")}`);
    info.push(`⚠️ ${t("locations.threat")}: ${loc.threat ?? 1}`);
    return info;
  }
  if (loc.type === "gas_giant") {
    info.push(`🪸 ${getLocationName(loc.name, t)}`);
    if (loc.gasGiantLastDiveAt !== undefined) {
      info.push(`✓ ${t("locations.gas_giant")}`);
    } else {
      info.push(`🔬 ${t("gas_giant.start_dive")}`);
    }
    return info;
  }
  if (loc.type === "wreck_field") {
    info.push(`💀 ${getLocationName(loc.name, t)}`);
    const tier = loc.wreckTier ?? 1;
    info.push(`🏷️ Тир: ${tier}`);
    if (loc.wreckExhausted) {
      info.push(`✓ Обыскано`);
    } else {
      const done = loc.wreckPassesDone ?? 0;
      const total = loc.wreckPassesTotal ?? 2;
      info.push(`🔩 Проходов: ${done}/${total}`);
      info.push(`☢ Радиационный фон`);
    }
    return info;
  }
  if (loc.type === "distress_signal") {
    info.push(`🆘 ${t("locations.distress_signal")}`);
    // Show specific type if revealed by scanner or after interaction
    if (loc.signalType && loc.signalRevealed) {
      if (loc.signalType === "pirate_ambush") {
        info.push(`⚔️ ${t("locations.pirate_ambush")}`);
      } else if (loc.signalType === "survivors") {
        info.push(`👥 ${t("locations.survivors")}`);
      } else if (loc.signalType === "abandoned_cargo") {
        info.push(`📦 ${t("locations.abandoned_cargo")}`);
      }
    } else if (scanRange >= 15 && !loc.signalResolved) {
      // Quantum scanner shows probabilities if type not yet revealed
      info.push(
        `⚡ ${t("locations.ambush_prob")} (35%) / ${t("locations.survivors_prob")} (30%) / ${t("locations.cargo_prob")} (35%)`,
      );
    }
    return info;
  }

  // Show name for scanned objects (except storms; friendly ships handle their own name below)
  if (loc.type !== "storm" && loc.type !== "friendly_ship") {
    info.push(`📍 ${getLocationName(loc.name, t)}`);
  }

  // Friendly ship progressive scanner info
  if (loc.type === "friendly_ship") {
    // Strip race adjective from the name (e.g. "Человеческий Торговец" → "Торговец")
    let displayName = loc.name;
    if (loc.shipRace) {
      const raceInfo = RACES[loc.shipRace];
      const prefix = raceInfo?.adjective || raceInfo?.name;
      if (prefix && displayName.startsWith(prefix + " ")) {
        displayName = displayName.slice(prefix.length + 1);
      }
    }
    info.push(`📍 ${displayName}`);
    if (loc.shipRace) {
      info.push(`🧬 ${raceNames[loc.shipRace] || loc.shipRace}`);
    }
    if (scanRange >= 5) {
      const services: string[] = [];
      if (loc.hasTrader) services.push(t("locations.scan_ship_trader"));
      if (loc.hasCrew) services.push(t("locations.scan_ship_crew"));
      if (loc.hasQuest) services.push(t("locations.scan_ship_quest"));
      if (services.length > 0) {
        info.push(`🛎 ${services.join(" · ")}`);
      }
    }
    if (scanRange >= 8 && loc.hasDistress) {
      info.push(`⚠️ ${t("locations.scan_ship_distress")}`);
    }
    if (scanRange >= 15 && loc.greeting) {
      const snippet = loc.greeting.length > 60
        ? loc.greeting.slice(0, 57) + "..."
        : loc.greeting;
      info.push(`📡 "${snippet}"`);
    }
    return info;
  }

  // Storm info
  if (loc.type === "storm") {
    if (scanRange < 5) {
      info.push(`🌪️ ${t("locations.cosmic_storm")}`);
    } else {
      // scanRange >= 5: detailed storm info
      const stormNames: Record<StormType, string> = {
        radiation: t("locations.radiation_cloud"),
        ionic: t("locations.ionic_storm"),
        plasma: t("locations.plasma_storm"),
        gravitational: t("locations.gravitational_storm"),
        temporal: t("locations.temporal_storm"),
        nanite: t("locations.nanite_storm"),
      };
      const intensity = loc.stormIntensity || 1;
      info.push(
        `🌪️ ${loc.stormType ? stormNames[loc.stormType] : t("locations.cosmic_storm")}`,
      );
      info.push(`⚡ ${t("locations.intensity")}: ${intensity}`);

      // Show possible effects based on storm type
      switch (loc.stormType) {
        case "radiation":
          info.push(
            `☢️ ${t("locations.crew_damage")}: ~${25 * intensity}% HP`,
          );
          break;
        case "ionic":
          info.push(`⚡ ${t("locations.shield_strip")}: 100%`);
          break;
        case "plasma":
          info.push(
            `🔥 ${t("locations.shield_module_damage")}: ~${25 * intensity}%`,
          );
          break;
        case "gravitational":
          info.push(
            `🕳️ ${t("locations.module_damage")}: ~${20 * intensity}%`,
          );
          break;
        case "temporal":
          info.push(
            `⏳ ${t("locations.crew_damage")}: ~${15 * intensity}% + EXP reset`,
          );
          break;
        case "nanite":
          info.push(`🦠 ${t("locations.modules_disabled")} + damage`);
          break;
        default:
          info.push(
            `⚠️ ${t("locations.complex_damage")}: ~${20 * intensity}%`,
          );
      }

      // Show loot multiplier
      const lootMult =
        loc.stormType === "radiation"
          ? 2
          : loc.stormType === "ionic" ||
            loc.stormType === "gravitational" ||
            loc.stormType === "temporal"
            ? 2.5
            : loc.stormType === "plasma"
              ? 3
              : 2;
      info.push(`💰 ${t("locations.loot")}: x${lootMult}`);
    }
    // Hidden rewards for storms
    if (scanRange >= 8 && !completed) {
      const detectionChance = Math.min(100, 50 + (scanRange - 8) * 5);
      if (Math.random() * 100 < detectionChance) {
        info.push(t("locations.rare_resources"));
      }
    }
  }

  // Enemy info
  if (loc.type === "enemy") {
    const threat = loc.threat || 1;
    info.push(`⚔️ ${t("locations.threat")}: ${threat}`);

    const mods = loc.enemyType ? ENEMY_TYPE_MODIFIERS[loc.enemyType] : null;

    if (scanRange >= 5) {
      // Module count: reactor + first weapon + threat + weaponCountMod random
      const modCount = 2 + threat + (mods?.weaponCountMod ?? 0);
      info.push(`🔩 ${t("locations.scan_modules")}: ~${modCount}`);
    }

    if (scanRange >= 8) {
      const healthMod = mods?.healthMod ?? 1;
      const damageMod = mods?.damageMod ?? 1;
      const modCount = 2 + threat + (mods?.weaponCountMod ?? 0);
      // Total HP estimate: reactor (base*2) + rest (base each)
      const totalHp = Math.round(
        (MODULE_HEALTH_BASE * REACTOR_HP_MULTIPLIER + (modCount - 1) * MODULE_HEALTH_BASE) * healthMod / 50,
      ) * 50;
      // Damage per turn: each weapon module fires once
      const weaponsEstimate = 1 + Math.ceil(threat / 2);
      const dmgPerTurn = Math.round(threat * MODULE_DAMAGE_PER_THREAT * damageMod) * weaponsEstimate;
      info.push(`💀 ${t("locations.scan_total_hp")}${totalHp}`);
      info.push(`⚔️ ${t("locations.scan_dmg_per_turn")}${dmgPerTurn}`);
      const shieldMod = mods?.shieldMod ?? 0;
      if (shieldMod > 0) {
        const shieldEst = Math.round(threat * SHIELD_CONTRIBUTION_PER_THREAT * shieldMod);
        info.push(`🛡 ${t("locations.scan_has_shields")} ~${shieldEst}`);
      }
    }

    if (scanRange >= 15) {
      const lootBase = 300;
      const lootMod = mods?.lootMod ?? 1;
      const lootEst = Math.round(lootBase * threat * lootMod / 100) * 100;
      info.push(`₢ ${t("locations.scan_loot_est")}${lootEst}₢`);
    }
  }

  // Anomaly info
  if (loc.type === "anomaly") {
    if (scanRange >= 8) {
      const type =
        loc.anomalyType === "good"
          ? t("locations.anomaly_beneficial")
          : t("locations.anomaly_dangerous");
      info.push(`🔮 ${type}`);
    } else {
      info.push(`🔮 ${t("locations.anomaly_unknown")}`);
    }
    info.push(
      `${t("locations.scientist_required")}: LV${loc.requiresScientistLevel || 1}`,
    );
  }

  // Boss detailed info
  if (loc.type === "boss" && !loc.bossDefeated) {
    const boss = loc.bossId ? ANCIENT_BOSSES.find((b) => b.id === loc.bossId) : null;

    if (scanRange >= 5 && boss) {
      info.push(`🛸 ${boss.name}`);
      info.push(`🔩 ${t("locations.scan_modules")}: ${boss.modules.length}`);
      info.push(`🛡 ${t("locations.scan_has_shields")} ${boss.shields}`);
    }

    if (scanRange >= 8 && boss) {
      const totalHp = boss.modules.reduce((sum, m) => sum + m.health, 0);
      const totalDmg = boss.modules.reduce((sum, m) => sum + (m.damage ?? 0), 0);
      info.push(`💀 ${t("locations.scan_total_hp")}${totalHp}`);
      if (totalDmg > 0) info.push(`⚔️ ${t("locations.scan_dmg_per_turn")}${totalDmg}`);
      if (boss.regenRate > 0) {
        info.push(`💚 ${t("locations.scan_regen")}: +${boss.regenRate}${t("locations.scan_per_turn")}`);
      }
      const moduleNames = boss.modules.map((m) => m.name).join(", ");
      info.push(`📋 ${moduleNames}`);
    }

    if (scanRange >= 8 && !loc.bossDefeated) {
      const detectionChance = Math.min(100, 50 + (scanRange - 8) * 5);
      if (Math.random() * 100 < detectionChance) {
        info.push(`★ Древний артефакт!`);
      }
    }

    if (scanRange >= 15 && boss) {
      info.push(`${t("locations.scan_ability")}: ${boss.specialAbility.name}`);
      info.push(`  → ${boss.specialAbility.description}`);
    }
  }

  return info;
}

/**
 * Проверяет, может ли сканер обнаружить объект на основе scanRange
 * Пороги scanRange для обнаружения:
 * - friendly_ship: scanRange >= 3
 * - enemy/anomaly tier 1: scanRange >= 3
 * - enemy/anomaly tier 2: scanRange >= 5
 * - enemy/anomaly tier 3, boss: scanRange >= 8
 * - anomaly tier 4: scanRange >= 15
 * - storm: scanRange >= 5
 */
function canDetectObject(
  type: LocationType,
  scanRange: number,
  tier: number = 1,
): boolean {
  if (scanRange >= 15) return true; // Quantum scanner detects everything

  if (type === "friendly_ship") return scanRange >= 3;
  if (type === "storm") return scanRange >= 5;

  // enemy, monster, anomaly, boss, derelict
  if (
    type === "enemy" ||
    type === "space_monster" ||
    type === "anomaly" ||
    type === "boss" ||
    type === "derelict_ship"
  ) {
    if (tier <= 1) return scanRange >= 3;
    if (tier === 2) return scanRange >= 5;
    if (tier === 3) return scanRange >= 8;
    if (tier >= 4) return scanRange >= 15;
  }

  return false;
}
