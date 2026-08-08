"use client";

import { useGameStore } from "@/game/store";
import { useState } from "react";
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { GameDialogContent } from "./GameDialog";
import { CraftingTab } from "./station/CraftingTab";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/useTranslation";
import {
    BASE_BUNKER_CAP,
    BASE_COST,
    BASE_MAX_LEVEL,
    BASE_MODULES,
    BASE_SLOTS_BY_LEVEL,
    BASE_SERVICE_VALUES,
    BASE_UPGRADE_COST,
} from "@/game/constants/baseModules";
import { RESEARCH_RESOURCES } from "@/game/constants";
import {
    describeHaulResource,
    getBaseBlocker,
    getBasePotential,
    getModuleBlocker,
    getOutpostOutputMultiplier,
    getStorageFree,
    hasBaseService,
} from "@/game/slices/outposts/helpers";
import { describeCargoItem } from "@/game/cargo/describeCargoItem";
import { planetHasFeature, PLANET_FEATURES } from "@/game/planets";
import type { Location } from "@/game/types";
import type { BaseModuleId, OutpostResource } from "@/game/types/outposts";
import { OutpostGarrison } from "./OutpostGarrison";

/** Кого можно вырастить на базе: профессии, которых станции дают неохотно */
const HIREABLE_PROFESSIONS = [
    "engineer",
    "scientist",
    "medic",
    "gunner",
    "scout",
] as const;

interface Props {
    location: Location;
}

/**
 * Главная база на пустой планете: закладка, уровни, слоты под модули.
 *
 * Слотов меньше, чем модулей, намеренно — на третьем уровне их шесть при
 * десяти модулях в планах, поэтому «что поставить» остаётся выбором, а не
 * чек-листом. Ради этого вся система и затевалась.
 */
export function BaseSection({ location }: Props) {
    const [craftOpen, setCraftOpen] = useState(false);
    const { t } = useTranslation();
    const outposts = useGameStore((s) => s.outposts);
    const credits = useGameStore((s) => s.credits);
    const research = useGameStore((s) => s.research);
    const crew = useGameStore((s) => s.crew);
    const buildBase = useGameStore((s) => s.buildBase);
    const upgradeBase = useGameStore((s) => s.upgradeBase);
    const installBaseModule = useGameStore((s) => s.installBaseModule);
    const removeBaseModule = useGameStore((s) => s.removeBaseModule);
    const collectOutpost = useGameStore((s) => s.collectOutpost);
    const repairAtBase = useGameStore((s) => s.repairAtBase);
    const healAtBase = useGameStore((s) => s.healAtBase);
    const storeAtBase = useGameStore((s) => s.storeAtBase);
    const storeCargoAtBase = useGameStore((s) => s.storeCargoAtBase);
    const withdrawCargoFromBase = useGameStore((s) => s.withdrawCargoFromBase);
    const hireAtBase = useGameStore((s) => s.hireAtBase);
    const assaultOutpost = useGameStore((s) => s.assaultOutpost);
    const ship = useGameStore((s) => s.ship);
    const gases = useGameStore((s) => s.gases);

    const base = outposts.find((o) => o.locationId === location.id);

    // ── Базы ещё нет: показываем закладку или причину отказа ───────────────
    if (!base) {
        const blocker = getBaseBlocker({ credits, outposts, research }, location);
        // На чужой планете и без технологии блок вообще не показываем: он бы
        // висел на каждой пустой планете весь забег
        if (blocker === "wrong_location" || blocker === "tech_missing") return null;

        const potential = getBasePotential(location.id);

        return (
            <div className="mt-2 border border-[#3c4b52] bg-[rgba(255,255,255,0.02)] p-2 sm:p-3">
                <div className="text-[11px] uppercase tracking-wider text-[#b9c6cc] sm:text-xs">
                    🏗 {t("outposts.build_base")}
                </div>
                <div className="mt-1 text-[10px] leading-snug text-[#8a9ba3] sm:text-xs">
                    {t("outposts.base_hint")}
                </div>

                <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] sm:text-xs">
                    <span
                        className={
                            credits >= BASE_COST.credits
                                ? "text-[#b9c6cc]"
                                : "text-[#ff667f]"
                        }
                    >
                        {BASE_COST.credits}₢
                    </span>
                    {Object.entries(BASE_COST.resources).map(([resource, amount]) => {
                        const held =
                            research.resources[
                                resource as keyof typeof research.resources
                            ] ?? 0;
                        return (
                            <span
                                key={resource}
                                className={
                                    held >= amount
                                        ? "text-[#b9c6cc]"
                                        : "text-[#ff667f]"
                                }
                            >
                                {RESEARCH_RESOURCES[
                                    resource as keyof typeof RESEARCH_RESOURCES
                                ]?.icon ?? ""}{" "}
                                {amount}
                            </span>
                        );
                    })}
                </div>

                {/* Что даст эта планета: 6000₢ слишком дорого, чтобы
                    узнавать про непригодность уже после закладки */}
                <div className="mt-1.5 text-[10px] leading-snug sm:text-xs">
                    <div className="text-[#8a9ba3]">
                        {t("outposts.potential_available", {
                            list: potential.available
                                .map((id) => t(`base_modules.${id}.name`))
                                .join(", "),
                        })}
                    </div>
                    <div
                        className={
                            potential.boosted.length > 0
                                ? "text-[#00ff41]"
                                : "text-[#666]"
                        }
                    >
                        {potential.boosted.length > 0
                            ? t("outposts.potential_boosted", {
                                  list: potential.boosted
                                      .map((id) => t(`base_modules.${id}.name`))
                                      .join(", "),
                              })
                            : t("outposts.potential_plain")}
                    </div>
                </div>

                {blocker && (
                    <div className="mt-1.5 text-[10px] text-[#ffb000] sm:text-xs">
                        {t(`outposts.blocked_${blocker}`)}
                    </div>
                )}

                <Button
                    onClick={() => buildBase(location.id)}
                    disabled={blocker !== null}
                    className="mt-2 min-h-9 w-full cursor-pointer border-2 border-[#ffb000] bg-transparent px-2 text-[10px] uppercase tracking-wider text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] disabled:cursor-default disabled:opacity-40 sm:text-xs"
                >
                    🏗 {t("outposts.build")}
                </Button>
            </div>
        );
    }

    // ── База захвачена: ничего, кроме штурма ───────────────────────────────
    if (base.capturedAtTurn !== undefined) {
        return (
            <div className="mt-2 border border-[#ff004455] bg-[rgba(255,0,64,0.06)] p-2 sm:p-3">
                <div className="text-[11px] uppercase tracking-wider text-[#ff667f] sm:text-xs">
                    ⚠ {t("outposts.captured")}
                </div>
                <div className="mt-1 text-[10px] leading-snug text-[#b9c6cc] sm:text-xs">
                    {t("outposts.captured_hint", {
                        threat: base.raiderThreat ?? 1,
                    })}
                </div>
                <Button
                    onClick={() => assaultOutpost(base.id)}
                    className="mt-2 min-h-9 w-full cursor-pointer border-2 border-[#ff0040] bg-transparent px-2 text-[10px] uppercase tracking-wider text-[#ff667f] hover:bg-[rgba(255,0,64,0.15)] sm:text-xs"
                >
                    ⚔ {t("outposts.assault")}
                </Button>
            </div>
        );
    }

    // ── База стоит: слоты, бункер, гарнизон ────────────────────────────────
    const level = base.level ?? 1;
    const slots = BASE_SLOTS_BY_LEVEL[level] ?? 0;
    const installed = base.modules ?? [];
    const multiplier = getOutpostOutputMultiplier(base, crew);
    const haul = Object.entries(base.bunker).filter(([, amount]) => amount > 0);
    const upgrade = BASE_UPGRADE_COST[level];
    const canRepair = hasBaseService(base, "repair");
    const canHeal = hasBaseService(base, "heal");
    const canStore = hasBaseService(base, "storage");
    const canCraft = hasBaseService(base, "craft");
    const canHire = hasBaseService(base, "garrison");
    const storageFree = getStorageFree(base);
    // На склад кладём только то, что реально занимает трюм
    const storable: [OutpostResource, number][] = canStore
        ? [
              ...ship.tradeGoods.map(
                  (g) => [g.item as OutpostResource, g.quantity] as [OutpostResource, number],
              ),
              ...(Object.entries(gases) as [OutpostResource, number][]),
          ].filter(([, amount]) => amount > 0)
        : [];

    return (
        <div className="mt-2 border border-[#ffb00033] bg-[rgba(255,176,0,0.04)] p-2 sm:p-3">
            <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-[#ffb000] sm:text-xs">
                    🏗 {t("outposts.base")} · {t("outposts.base_level", { level })}
                </span>
                <span className="text-[10px] text-[#8a9ba3]">
                    {installed.length}/{slots} · ×{multiplier.toFixed(2)}
                </span>
            </div>

            {/* Слоты */}
            <div className="mt-2 space-y-1">
                {installed.map((moduleId) => {
                    const def = BASE_MODULES[moduleId];
                    const boostFeature =
                        def.boostedBy &&
                        planetHasFeature(base.locationId, def.boostedBy)
                            ? def.boostedBy
                            : null;
                    return (
                        <div
                            key={moduleId}
                            className="flex items-center justify-between gap-2 border border-[#ffb00033] px-2 py-1"
                        >
                            <span className="truncate text-[11px] text-white sm:text-xs">
                                {def.icon} {t(`base_modules.${moduleId}.name`)}
                                {boostFeature && (
                                    <span className="ml-1 text-[#00ff41]">
                                        {PLANET_FEATURES[boostFeature].icon} ×2
                                    </span>
                                )}
                            </span>
                            <Button
                                onClick={() => removeBaseModule(base.id, moduleId)}
                                className="min-h-7 cursor-pointer border border-[#552028] bg-transparent px-2 text-[10px] uppercase text-[#8a6a70] hover:border-[#ff0040] hover:text-[#ff667f]"
                            >
                                {t("outposts.dismantle")}
                            </Button>
                        </div>
                    );
                })}

                {installed.length < slots && (
                    <div className="flex flex-wrap gap-1">
                        {(Object.keys(BASE_MODULES) as BaseModuleId[])
                            .filter((moduleId) => !installed.includes(moduleId))
                            .map((moduleId) => {
                                const def = BASE_MODULES[moduleId];
                                const blocker = getModuleBlocker(
                                    { credits, research },
                                    base,
                                    moduleId,
                                );
                                return (
                                    <Button
                                        key={moduleId}
                                        onClick={() =>
                                            installBaseModule(base.id, moduleId)
                                        }
                                        disabled={blocker !== null}
                                        title={
                                            blocker
                                                ? t(`outposts.module_${blocker}`)
                                                : t(
                                                      `base_modules.${moduleId}.desc`,
                                                  )
                                        }
                                        className="min-h-7 cursor-pointer border border-[#555] bg-transparent px-2 text-[10px] text-[#b9c6cc] hover:border-[#ffb000] hover:text-[#ffb000] disabled:cursor-default disabled:opacity-40"
                                    >
                                        {def.icon}{" "}
                                        {t(`base_modules.${moduleId}.name`)} ·{" "}
                                        {def.cost.credits}₢
                                    </Button>
                                );
                            })}
                    </div>
                )}
            </div>

            {/* Бункер */}
            <div className="mt-2 border-t border-[#ffb00022] pt-2 text-[10px] sm:text-xs">
                <div className="text-[#8a9ba3]">
                    {t("outposts.bunker")} ({BASE_BUNKER_CAP})
                </div>
                {haul.length === 0 ? (
                    <div className="text-[#666]">{t("outposts.bunker_empty")}</div>
                ) : (
                    <div className="text-[#b9c6cc]">
                        {haul
                            .map(
                                ([resource, amount]) =>
                                    `${describeHaulResource(resource as never, t)} ×${amount}`,
                            )
                            .join(", ")}
                    </div>
                )}
                <Button
                    onClick={() => collectOutpost(base.id)}
                    disabled={haul.length === 0}
                    className="mt-1.5 min-h-9 w-full cursor-pointer border-2 border-[#ffb000] bg-transparent px-2 text-[10px] uppercase tracking-wider text-[#ffb000] hover:bg-[#ffb000] hover:text-[#050810] disabled:cursor-default disabled:opacity-40 sm:text-xs"
                >
                    📦 {t("outposts.collect")}
                </Button>
            </div>

            {/* Услуги базы: то, ради чего её строят в глубоком космосе */}
            {(canRepair || canHeal || canStore) && (
                <div className="mt-2 border-t border-[#ffb00022] pt-2">
                    <div className="text-[10px] text-[#8a9ba3] sm:text-xs">
                        {t("outposts.services")}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                        {canRepair && (
                            <Button
                                onClick={() => repairAtBase(base.id)}
                                className="min-h-8 cursor-pointer border border-[#00d4ff] bg-transparent px-2 text-[10px] uppercase text-[#00d4ff] hover:bg-[rgba(0,212,255,0.12)]"
                            >
                                🔧 {t("outposts.service_repair")}
                            </Button>
                        )}
                        {canHeal && (
                            <Button
                                onClick={() => healAtBase(base.id)}
                                className="min-h-8 cursor-pointer border border-[#00ff41] bg-transparent px-2 text-[10px] uppercase text-[#00ff41] hover:bg-[rgba(0,255,65,0.12)]"
                            >
                                ⚕️ {t("outposts.service_heal")}
                            </Button>
                        )}
                        {canCraft && (
                            <Button
                                onClick={() => setCraftOpen(true)}
                                className="min-h-8 cursor-pointer border border-[#ffb000] bg-transparent px-2 text-[10px] uppercase text-[#ffb000] hover:bg-[rgba(255,176,0,0.12)]"
                            >
                                🛠 {t("outposts.service_craft")}
                            </Button>
                        )}
                    </div>
                    {/* Казарма растит своих: профессию выбирает игрок, а не
                        случай, и этим наём на базе отличается от станции */}
                    {canHire && (
                        <div className="mt-1.5">
                            <div className="text-[10px] text-[#8a9ba3]">
                                {t("outposts.service_hire", {
                                    cost: BASE_SERVICE_VALUES.settlerCost,
                                })}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                                {HIREABLE_PROFESSIONS.map((profession) => (
                                    <Button
                                        key={profession}
                                        onClick={() =>
                                            hireAtBase(base.id, profession)
                                        }
                                        disabled={
                                            credits <
                                            BASE_SERVICE_VALUES.settlerCost
                                        }
                                        className="min-h-7 cursor-pointer border border-[#555] bg-transparent px-2 text-[10px] text-[#b9c6cc] hover:border-[#ffb000] hover:text-[#ffb000] disabled:cursor-default disabled:opacity-40"
                                    >
                                        {t(`professions.${profession}`)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {canStore && (
                        <div className="mt-1.5">
                            <div className="text-[10px] text-[#8a9ba3]">
                                {t("outposts.service_store")} · {storageFree}{" "}
                                {t("outposts.storage_free")}
                            </div>

                            {(storable.length > 0 || ship.cargo.length > 0) && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {storable.map(([resource, amount]) => (
                                        <Button
                                            key={resource}
                                            onClick={() =>
                                                storeAtBase(base.id, resource, amount)
                                            }
                                            className="min-h-7 cursor-pointer border border-[#555] bg-transparent px-2 text-[10px] text-[#b9c6cc] hover:border-[#ffb000] hover:text-[#ffb000]"
                                        >
                                            ↓ {describeHaulResource(resource, t)} ×
                                            {amount}
                                        </Button>
                                    ))}
                                    {/* Ради этого склад и нужен: груз задания и
                                        запасной модуль продать нельзя, а трюм
                                        они занимают */}
                                    {ship.cargo.map((item, index) => (
                                        <Button
                                            key={`${item.item}-${index}`}
                                            onClick={() =>
                                                storeCargoAtBase(
                                                    base.id,
                                                    index,
                                                    item.quantity,
                                                )
                                            }
                                            className="min-h-7 cursor-pointer border border-[#555] bg-transparent px-2 text-[10px] text-[#b9c6cc] hover:border-[#ffb000] hover:text-[#ffb000]"
                                        >
                                            ↓ {describeCargoItem(item, t)} ×
                                            {item.quantity}
                                        </Button>
                                    ))}
                                </div>
                            )}

                            {(base.storedCargo ?? []).length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {(base.storedCargo ?? []).map((item, index) => (
                                        <Button
                                            key={`stored-${item.item}-${index}`}
                                            onClick={() =>
                                                withdrawCargoFromBase(
                                                    base.id,
                                                    index,
                                                    item.quantity,
                                                )
                                            }
                                            className="min-h-7 cursor-pointer border border-[#00d4ff55] bg-transparent px-2 text-[10px] text-[#00d4ff] hover:border-[#00d4ff]"
                                        >
                                            ↑ {describeCargoItem(item, t)} ×
                                            {item.quantity}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Верстак переиспользует вкладку станции, а не заводит второй
                интерфейс крафта — экраны обязаны совпадать */}
            {craftOpen && (
                <Dialog open onOpenChange={() => setCraftOpen(false)}>
                    <GameDialogContent variant="warning" className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="font-['Orbitron'] text-[#ffb000]">
                                🛠 {t("outposts.service_craft")}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                {t("outposts.service_craft")}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[60vh] overflow-y-auto">
                            <CraftingTab />
                        </div>
                    </GameDialogContent>
                </Dialog>
            )}

            <OutpostGarrison outpost={base} accent="#ffb000" />

            {/* Расширение базы */}
            <div className="mt-2 border-t border-[#ffb00022] pt-2 text-[10px] sm:text-xs">
                {level < BASE_MAX_LEVEL && upgrade && (
                    <Button
                        onClick={() => upgradeBase(base.id)}
                        className="mt-1.5 min-h-8 w-full cursor-pointer border border-[#ffb000] bg-transparent px-2 text-[10px] uppercase tracking-wider text-[#ffb000] hover:bg-[rgba(255,176,0,0.12)]"
                    >
                        ⬆ {t("outposts.upgrade", {
                            level: level + 1,
                            slots: BASE_SLOTS_BY_LEVEL[level + 1],
                            credits: upgrade.credits,
                        })}
                    </Button>
                )}
            </div>
        </div>
    );
}
