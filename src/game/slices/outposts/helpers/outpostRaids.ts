import { store as i18nStore } from "@/lib/useTranslation";
import {
    RAID_BASE_CHANCE,
    RAID_CRISIS_ID,
    RAID_CRISIS_MULTIPLIER,
    RAID_GRACE_TURNS,
    RAID_GUARD_PROTECTION,
    RAID_THREAT_BY_TIER,
    RAID_TIER_MULTIPLIER,
    RAID_WANTED_MULTIPLIER,
} from "@/game/constants/outpostRaids";
import { BASE_SERVICE_VALUES } from "@/game/constants/baseModules";
import { getRunModifierValue } from "@/game/constants/launchModifiers";
import { getOutpostCrew } from "@/game/crew/stationed";
import type { CrewMember, GameStore, SetState, Sector } from "@/game/types";
import type { Outpost } from "@/game/types/outposts";
import { hasBaseService } from "./baseServices";

interface RaidContext {
    sectors: readonly Sector[];
    crew: readonly CrewMember[];
    turn: number;
    activeCrisisId?: string;
    startModifierIds?: string[];
}

/**
 * Шанс, что постройку захватят в этот ход.
 *
 * Чистая функция: её же зовёт панель, чтобы честно показать риск. Игрок
 * должен видеть, что глубокий сектор и «В розыске» стоят ему безопасности,
 * а турели с охранником — возвращают её.
 */
export function getRaidChance(outpost: Outpost, ctx: RaidContext): number {
    if (outpost.capturedAtTurn !== undefined) return 0;
    // Льготный период: постройка не должна разваливаться сразу после закладки
    if (ctx.turn - outpost.builtAtTurn < RAID_GRACE_TURNS) return 0;

    const sector = ctx.sectors.find((s) => s.id === outpost.sectorId);
    const tier = sector?.tier ?? 1;

    let chance = RAID_BASE_CHANCE * (RAID_TIER_MULTIPLIER[tier] ?? 1);

    if (ctx.activeCrisisId === RAID_CRISIS_ID) chance *= RAID_CRISIS_MULTIPLIER;
    // «В розыске»: те, кто ищет вас, находят и ваши постройки. Опираемся на
    // сам эффект модификатора, а не на его id — так связь переживёт
    // переименование и не сломается молча
    if (getRunModifierValue(ctx.startModifierIds ?? [], "combatLootBonus") > 0) {
        chance *= RAID_WANTED_MULTIPLIER;
    }
    if (hasBaseService(outpost, "defense")) {
        chance *= BASE_SERVICE_VALUES.turretProtection;
    }
    if (
        getOutpostCrew(ctx.crew, outpost.id).some(
            (member) => member.profession === "gunner",
        )
    ) {
        chance *= RAID_GUARD_PROTECTION;
    }

    return Math.max(0, Math.min(1, chance));
}

/** Сила рейдеров, захвативших постройку в этом секторе */
export function getRaidThreat(
    outpost: Outpost,
    sectors: readonly Sector[],
): number {
    const tier = sectors.find((s) => s.id === outpost.sectorId)?.tier ?? 1;
    return RAID_THREAT_BY_TIER[tier] ?? 1;
}

/**
 * Ход рейдов. Захваченная постройка не уничтожается: добыча стоит, бункер
 * остаётся у рейдеров, и всё это возвращается вместе с победой в бою.
 */
export function processOutpostRaids(set: SetState, get: () => GameStore): void {
    const state = get();
    const outposts = state.outposts ?? [];
    if (outposts.length === 0) return;

    const ctx: RaidContext = {
        sectors: state.galaxy.sectors,
        crew: state.crew,
        turn: state.turn,
        activeCrisisId: state.activeCrisis?.id,
        startModifierIds: state.startModifierIds,
    };

    const captured: Outpost[] = [];
    for (const outpost of outposts) {
        if (Math.random() < getRaidChance(outpost, ctx)) captured.push(outpost);
    }
    if (captured.length === 0) return;

    const capturedIds = new Set(captured.map((o) => o.id));
    set((s) => ({
        outposts: s.outposts.map((o) =>
            capturedIds.has(o.id)
                ? {
                      ...o,
                      capturedAtTurn: s.turn,
                      raiderThreat: getRaidThreat(o, s.galaxy.sectors),
                  }
                : o,
        ),
    }));

    for (const outpost of captured) {
        get().addLog(
            i18nStore.t(
                outpost.kind === "base"
                    ? "game_logs.outpost_captured_base"
                    : "game_logs.outpost_captured",
            ),
            "error",
        );
    }
}
