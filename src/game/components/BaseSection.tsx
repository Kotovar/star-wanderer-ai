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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslation } from "@/lib/useTranslation";
import {
    BASE_BUILD_TURNS,
    BASE_BUNKER_CAP,
    BASE_COST,
    BASE_MAX_LEVEL,
    BASE_MODULES,
    BASE_MODULE_BUILD_TURNS,
    BASE_SLOTS_BY_LEVEL,
    BASE_SERVICE_VALUES,
    BASE_UPGRADE_COST,
    BASE_UPGRADE_TURNS,
    BASE_CAPTURED_IMAGE,
    getBaseImage,
    getBaseModuleImage,
    getModuleOutput,
} from "@/game/constants/baseModules";
import { GameImage } from "./GameImage";
import { RESEARCH_RESOURCES } from "@/game/constants";
import {
    describeHaulResource,
    getBaseBlocker,
    getBasePotential,
    getBunkerTotal,
    getCrewSlots,
    getHireBlocker,
    getModuleBlocker,
    getOutpostOutputMultiplier,
    getUpgradeBlocker,
    getWantedRoles,
    getSettlerOffer,
    getStorageFree,
    hasBaseService,
    isBunkerFull,
    isUnderConstruction,
    scheduleWork,
    turnsUntilReady,
} from "@/game/slices/outposts/helpers";
import { getOutpostCrew } from "@/game/crew/stationed";
import { describeCargoItem } from "@/game/cargo/describeCargoItem";
import { planetHasFeature, PLANET_FEATURES } from "@/game/planets";
import type { GameStore, Location } from "@/game/types";
import type {
    BaseModuleId,
    Outpost,
    OutpostResource,
} from "@/game/types/outposts";
import { OutpostGarrison } from "./OutpostGarrison";
import { ShipStatsPanel } from "./ShipStatsPanel";

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
 * Кнопка услуги базы: цена видна всегда, отказ объяснён на месте.
 *
 * Раньше кнопка выглядела рабочей и молча писала в бортжурнал, которого на
 * планетарном экране не видно: клик «ничего не делал». Причина отказа и
 * расход обязаны быть на самой кнопке.
 */
function ServiceButton({
    icon,
    label,
    color,
    cost,
    effect,
    blocker,
    nothingLabel,
    onClick,
}: {
    icon: string;
    label: string;
    color: string;
    cost: { item: string; quantity: number };
    /** Что визит сделает в числах: «починить» и «+40 прочности» — разные обещания */
    effect: string;
    blocker: "nothing" | "supplies" | null;
    nothingLabel: string;
    onClick: () => void;
}) {
    const { t } = useTranslation();
    return (
        <div className="flex min-w-0 flex-col gap-0.5">
            <Button
                onClick={onClick}
                disabled={blocker !== null}
                className="min-h-8 cursor-pointer border bg-transparent px-2 text-[10px] uppercase disabled:cursor-default disabled:opacity-40"
                style={{ borderColor: color, color }}
            >
                {icon} {label} · {cost.quantity}×{" "}
                {t(`trade.goods.${cost.item}`)} · {t("outposts.turn_cost")}
            </Button>
            <span className="text-[9px] leading-tight text-[#8a9ba3]">
                {blocker === "supplies"
                    ? t("outposts.service_no_supplies", {
                          qty: cost.quantity,
                          item: t(`trade.goods.${cost.item}`),
                      })
                    : blocker === "nothing"
                      ? nothingLabel
                      : effect}
            </span>
        </div>
    );
}

/**
 * Цена работ: кредиты, материалы и срок до готовности.
 *
 * Один блок на закладку и на расширение намеренно. Апгрейд раньше показывал
 * одни кредиты — ни материалов, ни того, что их не хватает, ни шести ходов
 * работ, — и отказ прилетал уже после нажатия, в бортжурнал.
 *
 * `turns` — сколько ходов пройдёт от нажатия до работающей постройки, вместе
 * с тем ходом, который забирает само нажатие. Два числа («+1 ход» отдельно,
 * «работы 4» отдельно) игрок складывать не обязан, а очередь работ делает их
 * ещё и неверными: модуль поверх недостроенной базы ждёт дольше номинала.
 */
function CostRow({
    credits,
    resources,
    heldCredits,
    heldResources,
    turns,
}: {
    credits: number;
    resources: Partial<Record<string, number>>;
    heldCredits: number;
    heldResources: Partial<Record<string, number>>;
    turns: number;
}) {
    const { t } = useTranslation();
    return (
        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] sm:text-xs">
            <span
                className={
                    heldCredits >= credits ? "text-[#b9c6cc]" : "text-[#ff667f]"
                }
            >
                {credits}₢
            </span>
            {Object.entries(resources).map(([resource, amount = 0]) => (
                <span
                    key={resource}
                    className={
                        (heldResources[resource] ?? 0) >= amount
                            ? "text-[#b9c6cc]"
                            : "text-[#ff667f]"
                    }
                >
                    {RESEARCH_RESOURCES[
                        resource as keyof typeof RESEARCH_RESOURCES
                    ]?.icon ?? ""}{" "}
                    {amount}
                </span>
            ))}
            {/* Срок — часть цены, и знать его надо до оплаты */}
            <span className="text-[#8a9ba3]">
                🏗 {t("outposts.cost_turns", { turns })}
            </span>
        </div>
    );
}

/**
 * Строка передачи предмета между трюмом и складом.
 *
 * Ползунок, а не кнопка «всё сразу»: перекладывать имеет смысл ровно столько,
 * сколько освобождает трюм под добычу, — остальное на базе только займёт
 * место склада. Нативный `input[type=range]` вместо своего компонента.
 */
function TransferRow({
    label,
    max,
    accent,
    arrow,
    onTransfer,
}: {
    label: string;
    max: number;
    accent: string;
    arrow: string;
    onTransfer: (amount: number) => void;
}) {
    const [amount, setAmount] = useState(max);
    // Стак мог уменьшиться после прошлой передачи — держим ползунок в границах
    const value = Math.max(1, Math.min(amount, max));

    return (
        <div className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-[10px] text-[#b9c6cc]">
                {label}
            </span>
            {max > 1 && (
                <input
                    type="range"
                    min={1}
                    max={max}
                    value={value}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    aria-label={label}
                    className="h-1 w-16 cursor-pointer sm:w-24"
                    style={{ accentColor: accent }}
                />
            )}
            <span
                className="w-7 shrink-0 text-right text-[10px] tabular-nums"
                style={{ color: accent }}
            >
                {value}
            </span>
            <Button
                onClick={() => onTransfer(value)}
                className="min-h-7 shrink-0 cursor-pointer border bg-transparent px-2 text-[10px]"
                style={{ borderColor: `${accent}55`, color: accent }}
            >
                {arrow}
            </Button>
        </div>
    );
}

/**
 * Каталог модулей: открывается кликом по свободному слоту.
 *
 * Раньше десять кнопок с картинкой и описанием висели прямо под слотами всё
 * время, пока оставалось место, — панель базы состояла в основном из того,
 * чего на ней ещё нет. Порядок тоже смысловой: сперва те, что планета
 * удвоит, потом просто доступные, недоступные — в конце.
 */
function ModuleCatalog({
    base,
    credits,
    research,
    readyIn,
    onInstall,
}: {
    base: Outpost;
    credits: number;
    research: GameStore["research"];
    readyIn: number;
    onInstall: (moduleId: BaseModuleId) => void;
}) {
    const { t } = useTranslation();
    const installed = base.modules ?? [];

    const options = (Object.keys(BASE_MODULES) as BaseModuleId[])
        .filter((moduleId) => !installed.includes(moduleId))
        .map((moduleId) => {
            const def = BASE_MODULES[moduleId];
            const blocker = getModuleBlocker({ credits, research }, base, moduleId);
            const boostFeature =
                def.boostedBy && planetHasFeature(base.locationId, def.boostedBy)
                    ? def.boostedBy
                    : null;
            // Чего именно не хватает — надо показать, а не прятать в подсказку:
            // заблокированная кнопка без причины читается как поломка
            const missing =
                blocker === "not_enough_resources"
                    ? Object.entries(def.cost.resources)
                          .filter(
                              ([resource, amount]) =>
                                  (research.resources[
                                      resource as keyof typeof research.resources
                                  ] ?? 0) < amount,
                          )
                          .map(
                              ([resource]) =>
                                  RESEARCH_RESOURCES[
                                      resource as keyof typeof RESEARCH_RESOURCES
                                  ]?.name ?? resource,
                          )
                    : [];
            return { moduleId, def, blocker, boostFeature, missing };
        })
        .sort(
            (a, b) =>
                (a.blocker ? 2 : a.boostFeature ? 0 : 1) -
                (b.blocker ? 2 : b.boostFeature ? 0 : 1),
        );

    return (
        <div className="space-y-1">
            {options.map(({ moduleId, def, blocker, boostFeature, missing }) => (
                <Button
                    key={moduleId}
                    onClick={() => onInstall(moduleId)}
                    disabled={blocker !== null}
                    className="h-auto w-full cursor-pointer items-start justify-start gap-1.5 whitespace-normal border border-[#555] bg-transparent px-2 py-1 text-left text-[10px] text-[#b9c6cc] hover:border-[#ffb000] hover:text-[#ffb000] disabled:cursor-default disabled:opacity-40"
                >
                    <GameImage
                        src={getBaseModuleImage(moduleId)}
                        alt=""
                        className="h-6 w-6 shrink-0 object-contain"
                    />
                    <span className="min-w-0 flex-1">
                        <span className="block">
                            {t(`base_modules.${moduleId}.name`)} ·{" "}
                            {def.cost.credits}₢ ·{" "}
                            <span className="text-[#8a9ba3]">
                                🏗 {t("outposts.cost_turns", { turns: readyIn })}
                            </span>
                            {boostFeature && (
                                <span className="ml-1 text-[#00ff41]">
                                    {PLANET_FEATURES[boostFeature].icon} ×2
                                </span>
                            )}
                            {blocker && (
                                <span className="ml-1 text-[#ff667f]">
                                    {missing.length > 0
                                        ? `— ${missing.join(", ")}`
                                        : `— ${t(`outposts.module_${blocker}`)}`}
                                </span>
                            )}
                        </span>
                        <span className="block text-[9px] leading-tight text-[#8a9ba3]">
                            {t(`base_modules.${moduleId}.desc`)}
                        </span>
                    </span>
                </Button>
            ))}
        </div>
    );
}

/** Вкладка панели базы: тот же янтарный язык, что и у станции */
const TAB_CLASS =
    "cursor-pointer shrink-0 whitespace-nowrap px-3 py-1.5 text-[10px] uppercase text-[#ffb000] data-[state=active]:bg-[#ffb000] data-[state=active]:text-[#050810] sm:text-xs";

/**
 * Главная база на пустой планете: закладка, уровни, слоты под модули.
 *
 * Слотов меньше, чем модулей, намеренно — на третьем уровне их шесть при
 * десяти модулях в планах, поэтому «что поставить» остаётся выбором, а не
 * чек-листом. Ради этого вся система и затевалась.
 */
export function BaseSection({ location }: Props) {
    const [craftOpen, setCraftOpen] = useState(false);
    const [catalogOpen, setCatalogOpen] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState<BaseModuleId | null>(null);
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
    const withdrawFromBase = useGameStore((s) => s.withdrawFromBase);
    const storeCargoAtBase = useGameStore((s) => s.storeCargoAtBase);
    const withdrawCargoFromBase = useGameStore((s) => s.withdrawCargoFromBase);
    const hireAtBase = useGameStore((s) => s.hireAtBase);
    const assaultOutpost = useGameStore((s) => s.assaultOutpost);
    const ship = useGameStore((s) => s.ship);
    const gases = useGameStore((s) => s.gases);
    const turn = useGameStore((s) => s.turn);
    const galaxy = useGameStore((s) => s.galaxy);
    const sectors = galaxy.sectors;

    const base = outposts.find((o) => o.locationId === location.id);

    // ── Базы ещё нет: показываем закладку или причину отказа ───────────────
    if (!base) {
        const blocker = getBaseBlocker({ credits, outposts, research }, location);
        // На чужой планете и без технологии блок вообще не показываем: он бы
        // висел на каждой пустой планете весь забег
        if (blocker === "wrong_location" || blocker === "tech_missing") return null;

        const potential = getBasePotential(location.id);
        // Прогноз буровой: ×2 от богатых залежей уже внутри, гарнизона ещё нет
        const drillBoost = planetHasFeature(location.id, "rich_deposits") ? 2 : 1;
        const drillYield = (
            Object.entries(
                getModuleOutput("drill_shaft", location.planetType),
            ) as [OutpostResource, number][]
        ).map(
            ([resource, amount]) =>
                `${describeHaulResource(resource, t)} ${(amount * drillBoost).toFixed(2)}`,
        );

        return (
            <div className="mt-2 border border-[#3c4b52] bg-[rgba(255,255,255,0.02)] p-2 sm:p-3">
                <div className="text-[11px] uppercase tracking-wider text-[#b9c6cc] sm:text-xs">
                    🏗 {t("outposts.build_base")}
                </div>
                <div className="mt-1 text-[10px] leading-snug text-[#8a9ba3] sm:text-xs">
                    {t("outposts.base_hint")}
                </div>

                <div className="mt-1.5">
                    <CostRow
                        credits={BASE_COST.credits}
                        resources={BASE_COST.resources}
                        heldCredits={credits}
                        heldResources={research.resources}
                        // Ход уходит на саму закладку, работы идут после него
                        turns={BASE_BUILD_TURNS + 1}
                    />
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
                    {/* Черты говорят, что здесь возможно, но не что из этого
                        выйдет: буровая следует за типом планеты и на ледяной
                        качает воду, а на разрушенной войной — одни древние
                        данные. Узнавать это после 6000₢ поздно */}
                    <div className="text-[#8a9ba3]">
                        {t("outposts.potential_drill", {
                            list: drillYield.join(", "),
                        })}
                    </div>
                </div>

                {blocker && (
                    <div className="mt-1.5 text-[10px] text-[#ffb000] sm:text-xs">
                        {/* Причины отказа общие для базы и сборщика, но лимит
                            у них разный по смыслу: одна база против трёх
                            сборщиков. Общий текст говорил про сборщики даже
                            здесь и звучал как сбой */}
                        {blocker === "limit_reached"
                            ? t("outposts.blocked_base_exists")
                            : t(`outposts.blocked_${blocker}`)}
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
        // Рейдеры держат добычу, а не проедают её: бункер и модули вернутся
        const capturedStake = [
            ...(Object.entries(base.bunker) as [OutpostResource, number][])
                .filter(([, amount]) => amount > 0)
                .map(
                    ([resource, amount]) =>
                        `${describeHaulResource(resource, t)} ${amount}`,
                ),
            ...((base.modules ?? []).length > 0
                ? [
                      t("outposts.captured_modules", {
                          count: (base.modules ?? []).length,
                      }),
                  ]
                : []),
        ];
        return (
            <div className="mt-2 border border-[#ff004455] bg-[rgba(255,0,64,0.06)] p-2 sm:p-3">
                {/* Та же база, но под рейдерами: конструкции целы — её
                    отбивают, а не теряют, и это должно быть видно */}
                <GameImage
                    src={BASE_CAPTURED_IMAGE}
                    alt={t("outposts.captured")}
                    className="mb-2 w-full object-contain"
                />
                <div className="text-[11px] uppercase tracking-wider text-[#ff667f] sm:text-xs">
                    ⚠ {t("outposts.captured")}
                </div>
                <div className="mt-1 text-[10px] leading-snug text-[#b9c6cc] sm:text-xs">
                    {t("outposts.captured_hint", {
                        threat: base.raiderThreat ?? 1,
                    })}
                </div>

                {/* Что именно вернёт победа и с чем вы в неё идёте. Раньше здесь
                    была одна кнопка «отбить» и число угрозы: решение принималось
                    вслепую, при том что бой обычный и корабль виден везде */}
                {capturedStake.length > 0 && (
                    <div className="mt-1 text-[10px] leading-snug text-[#b9c6cc] sm:text-xs">
                        {t("outposts.captured_stake", {
                            list: capturedStake.join(", "),
                        })}
                    </div>
                )}
                <div className="mt-2">
                    <ShipStatsPanel title={t("outposts.captured_your_ship")} />
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
    // Работы больше не подменяют собой всю панель. Раньше заказ модуля на
    // четыре хода прятал бункер, гарнизон и склад — вместе с оставленным на
    // нём грузом задания, который забрать было уже нечем, хотя сами
    // `collectOutpost` и `withdrawFromBase` этого никогда не запрещали
    const underWork = isUnderConstruction(base);
    const workTurns = turnsUntilReady(base, turn);
    const level = base.level ?? 1;
    const slots = BASE_SLOTS_BY_LEVEL[level] ?? 0;
    const installed = base.modules ?? [];
    const multiplier = getOutpostOutputMultiplier(base, crew);
    const haul = Object.entries(base.bunker).filter(([, amount]) => amount > 0);
    const upgrade = BASE_UPGRADE_COST[level];
    const upgradeBlocker = getUpgradeBlocker({ credits, research }, base);
    // Через сколько ходов заработает заказанное сейчас. Не номинал из
    // констант: ход забирает само нажатие, а работы встают в общую очередь —
    // модуль поверх недостроенной базы ждёт дольше своих четырёх ходов
    const readyIn = (turns: number) =>
        scheduleWork(base, turn + 1, turns) - turn;
    const moduleReadyIn = readyIn(BASE_MODULE_BUILD_TURNS);
    const upgradeReadyIn = readyIn(BASE_UPGRADE_TURNS);
    const bunkerTotal = getBunkerTotal(base);
    const stationed = getOutpostCrew(crew, base.id);
    const crewSlots = getCrewSlots(base);
    const wantedRoles = getWantedRoles(base);
    const canRepair = hasBaseService(base, "repair");
    const canHeal = hasBaseService(base, "heal");
    const canStore = hasBaseService(base, "storage");
    const canCraft = hasBaseService(base, "craft");
    const canHire = hasBaseService(base, "garrison");
    const hasServices = canRepair || canHeal || canCraft || canHire;
    const storageFree = getStorageFree(base);
    // Те же условия, что и в самих услугах: иначе кнопка обещает одно, а
    // helper отказывает по другому поводу
    const held = (item: string) =>
        ship.tradeGoods.find((g) => g.item === item)?.quantity ?? 0;
    const serviceBlocker = (
        needed: boolean,
        cost: { item: string; quantity: number },
    ): "nothing" | "supplies" | null =>
        !needed ? "nothing" : held(cost.item) < cost.quantity ? "supplies" : null;
    const repairBlocker = serviceBlocker(
        ship.modules.some((m) => m.health < m.maxHealth),
        BASE_SERVICE_VALUES.repairCost,
    );
    const healBlocker = serviceBlocker(
        crew.some(
            (c) => c.health < c.maxHealth || (c.assignmentFatigue ?? 0) > 0,
        ),
        BASE_SERVICE_VALUES.healCost,
    );
    const settlerOffer = canHire ? getSettlerOffer(base, sectors) : null;
    const hireBlocker = canHire
        ? getHireBlocker(base, { credits, crew, galaxy }, settlerOffer)
        : null;
    // На склад кладём только то, что реально занимает трюм
    const storable: [OutpostResource, number][] = canStore
        ? [
              ...ship.tradeGoods.map(
                  (g) => [g.item as OutpostResource, g.quantity] as [OutpostResource, number],
              ),
              ...(Object.entries(gases) as [OutpostResource, number][]),
          ].filter(([, amount]) => amount > 0)
        : [];
    // Сложенное на хранение: бункер вывозят кнопкой, склад — по одному
    const stored = (
        Object.entries(base.storedGoods ?? {}) as [OutpostResource, number][]
    ).filter(([, amount]) => amount > 0);
    const hasStored = stored.length > 0 || (base.storedCargo ?? []).length > 0;

    return (
        <div className="mt-2 border border-[#ffb00033] bg-[rgba(255,176,0,0.04)] p-2 sm:p-3">
            {/* Расширение базы — единственное место в системе, где вложение
                видно глазами, поэтому картинка меняется с уровнем */}
            <GameImage
                src={getBaseImage(level)}
                alt={t("outposts.base")}
                className={`mb-2 w-full object-contain${underWork ? " opacity-50" : ""}`}
            />

            {/* Сводка в шапке: вкладки прячут содержимое, и то, ради чего сюда
                прилетели — полный бункер, пустой слот, пустой гарнизон, —
                обязано читаться, не открывая ни одной из них */}
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                <span className="text-[11px] uppercase tracking-wider text-[#ffb000] sm:text-xs">
                    🏗 {t("outposts.base")} · {t("outposts.base_level", { level })}
                </span>
                <span className="text-[10px] text-[#8a9ba3]">
                    {t("outposts.summary_slots", {
                        filled: installed.length,
                        total: slots,
                    })}{" "}
                    ·{" "}
                    {t("outposts.summary_output", {
                        value: multiplier.toFixed(2),
                    })}{" "}
                    ·{" "}
                    {t("outposts.summary_bunker", { amount: bunkerTotal })} ·{" "}
                    {t("outposts.summary_garrison", {
                        filled: stationed.length,
                        total: crewSlots,
                    })}
                </span>
            </div>

            {/* Работы: полосой поверх живой панели, а не вместо неё */}
            {underWork && (
                <div className="mt-1.5 border border-[#ffb00055] bg-[rgba(255,176,0,0.08)] px-2 py-1 text-[10px] leading-snug text-[#ffb000] sm:text-xs">
                    🏗 {t("outposts.work_banner", { turns: workTurns })}
                </div>
            )}

            <Tabs defaultValue="overview" className="mt-2">
                <TabsList className="flex h-auto w-full justify-start overflow-x-auto rounded-none border border-[#ffb00055] bg-[rgba(5,8,16,0.9)] p-0">
                    <TabsTrigger value="overview" className={TAB_CLASS}>
                        🏗 {t("outposts.tab_overview")}
                    </TabsTrigger>
                    {hasServices && (
                        <TabsTrigger value="services" className={TAB_CLASS}>
                            🔧 {t("outposts.tab_services")}
                        </TabsTrigger>
                    )}
                    {(canStore || hasStored) && (
                        <TabsTrigger value="storage" className={TAB_CLASS}>
                            📦 {t("outposts.tab_storage")}
                        </TabsTrigger>
                    )}
                    <TabsTrigger value="garrison" className={TAB_CLASS}>
                        👥 {t("outposts.tab_garrison")}
                    </TabsTrigger>
                </TabsList>

                {/* Высота вкладок фиксирована со своей прокруткой: у них разное
                    содержимое, и без этого переключение двигало по вертикали всю
                    планетарную панель под базой — кнопка, на которую игрок целился,
                    уезжала из-под курсора. ponytail: 20rem подобраны под обзор
                    базы второго уровня; если слотов станет больше, поднять здесь */}
                <div className="h-[20rem] overflow-y-auto sm:h-[22rem]">
                    <TabsContent value="overview">
                        {/* Слоты */}
                        <div className="mt-2 space-y-1">
                            {installed.map((moduleId) => {
                                const def = BASE_MODULES[moduleId];
                                const boostFeature =
                                    def.boostedBy &&
                                    planetHasFeature(base.locationId, def.boostedBy)
                                        ? def.boostedBy
                                        : null;
                                // Выработка дробная (0.5/ход), и без неё «когда
                                // прилетать за добычей» посчитать нечем. Считаем
                                // ровно как accrueBase: черта планеты и гарнизон
                                const output = Object.entries(
                                    getModuleOutput(moduleId, location.planetType),
                                ) as [OutpostResource, number][];
                                const rates = output.map(
                                    ([resource, amount]) =>
                                        `${describeHaulResource(resource, t)} ${(
                                            amount *
                                            (boostFeature ? 2 : 1) *
                                            multiplier
                                        ).toFixed(2)}`,
                                );
                                const refund = Math.floor(def.cost.credits / 2);
                                return (
                                    <div
                                        key={moduleId}
                                        className="flex items-center justify-between gap-2 border border-[#ffb00033] px-2 py-1"
                                    >
                                        {/* Описание прямо в строке: раньше оно жило только
                                            в title-подсказке кнопки установки — то есть у
                                            поставленного модуля не было нигде, а на тач-
                                            экране не было вовсе */}
                                        <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-white sm:text-xs">
                                            <GameImage
                                                src={getBaseModuleImage(moduleId)}
                                                alt=""
                                                className="h-6 w-6 shrink-0 object-contain"
                                            />
                                            <span className="min-w-0">
                                                <span className="block truncate">
                                                    {t(`base_modules.${moduleId}.name`)}
                                                    {boostFeature && (
                                                        <span className="ml-1 text-[#00ff41]">
                                                            {PLANET_FEATURES[boostFeature].icon} ×2
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="block text-[9px] leading-tight text-[#8a9ba3]">
                                                    {rates.length > 0
                                                        ? t("outposts.module_output", {
                                                              list: rates.join(", "),
                                                          })
                                                        : t(`base_modules.${moduleId}.desc`)}
                                                </span>
                                            </span>
                                        </span>
                                        {/* Снос в два нажатия: кнопка стоит вплотную
                                            к модулю, а промах по ней стоит половины
                                            цены и всех материалов */}
                                        <Button
                                            onClick={() =>
                                                confirmRemove === moduleId
                                                    ? (removeBaseModule(base.id, moduleId),
                                                      setConfirmRemove(null))
                                                    : setConfirmRemove(moduleId)
                                            }
                                            className={
                                                confirmRemove === moduleId
                                                    ? "min-h-7 shrink-0 cursor-pointer whitespace-normal border border-[#ff0040] bg-transparent px-2 text-left text-[10px] text-[#ff667f]"
                                                    : "min-h-7 shrink-0 cursor-pointer border border-[#552028] bg-transparent px-2 text-[10px] uppercase text-[#8a6a70] hover:border-[#ff0040] hover:text-[#ff667f]"
                                            }
                                        >
                                            {confirmRemove === moduleId
                                                ? t("outposts.dismantle_confirm", { refund })
                                                : t("outposts.dismantle")}
                                        </Button>
                                    </div>
                                );
                            })}

                            {/* Свободный слот — строка, а не пустота: слотов меньше, чем
                                модулей, и видеть, сколько их осталось, важнее каталога */}
                            {Array.from({ length: Math.max(0, slots - installed.length) }).map(
                                (_, index) => (
                                    <Button
                                        key={`slot-${index}`}
                                        onClick={() => setCatalogOpen(true)}
                                        className="min-h-9 w-full cursor-pointer justify-start border border-dashed border-[#ffb00055] bg-transparent px-2 text-left text-[10px] text-[#8a9ba3] hover:border-[#ffb000] hover:text-[#ffb000] sm:text-xs"
                                    >
                                        + {t("outposts.slot_empty")}
                                    </Button>
                                ),
                            )}
                        </div>

                        {/* Бункер */}
                        <div className="mt-2 border-t border-[#ffb00022] pt-2 text-[10px] sm:text-xs">
                            <div className="text-[#8a9ba3]">{t("outposts.bunker")}</div>
                            {haul.length === 0 ? (
                                <div className="text-[#666]">{t("outposts.bunker_empty")}</div>
                            ) : (
                                // Потолок у каждого ресурса свой, и упёршийся больше не
                                // копится: без «34/60» база выглядит работающей, когда
                                // половина её модулей уже стоит впустую
                                <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                                    {haul.map(([resource, amount]) => (
                                        <span
                                            key={resource}
                                            className={
                                                amount >= BASE_BUNKER_CAP
                                                    ? "text-[#ffb000]"
                                                    : "text-[#b9c6cc]"
                                            }
                                        >
                                            {describeHaulResource(resource as never, t)}{" "}
                                            {amount}/{BASE_BUNKER_CAP}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {isBunkerFull(base) && (
                                <div className="mt-0.5 text-[#ffb000]">
                                    ⚠ {t("outposts.bunker_full_base")}
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

                        {/* Расширение базы: цена целиком и отказ до нажатия, как у модулей */}
                        {level < BASE_MAX_LEVEL && upgrade && (
                            <div className="mt-2 border-t border-[#ffb00022] pt-2 text-[10px] sm:text-xs">
                                <CostRow
                                    credits={upgrade.credits}
                                    resources={upgrade.resources}
                                    heldCredits={credits}
                                    heldResources={research.resources}
                                    turns={upgradeReadyIn}
                                />
                                <Button
                                    onClick={() => upgradeBase(base.id)}
                                    disabled={upgradeBlocker !== null}
                                    className="mt-1.5 min-h-8 w-full cursor-pointer border border-[#ffb000] bg-transparent px-2 text-[10px] uppercase tracking-wider text-[#ffb000] hover:bg-[rgba(255,176,0,0.12)] disabled:cursor-default disabled:opacity-40"
                                >
                                    ⬆ {t("outposts.upgrade", {
                                        level: level + 1,
                                        slots: BASE_SLOTS_BY_LEVEL[level + 1],
                                        credits: upgrade.credits,
                                    })}
                                </Button>
                                {upgradeBlocker && (
                                    <div className="mt-0.5 text-[#ff667f]">
                                        {t(`outposts.module_${upgradeBlocker}`)}
                                    </div>
                                )}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="services">
                        {/* Услуги базы: то, ради чего её строят в глубоком космосе */}
                        {hasServices && (
                            <div className="mt-2">
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {canRepair && (
                                        <ServiceButton
                                            icon="🔧"
                                            label={t("outposts.service_repair")}
                                            color="#00d4ff"
                                            cost={BASE_SERVICE_VALUES.repairCost}
                                            effect={t(
                                                "outposts.service_repair_effect",
                                                {
                                                    amount: BASE_SERVICE_VALUES.repairAmount,
                                                },
                                            )}
                                            blocker={repairBlocker}
                                            nothingLabel={t("outposts.service_repair_nothing")}
                                            onClick={() => repairAtBase(base.id)}
                                        />
                                    )}
                                    {canHeal && (
                                        <ServiceButton
                                            icon="⚕️"
                                            label={t("outposts.service_heal")}
                                            color="#00ff41"
                                            cost={BASE_SERVICE_VALUES.healCost}
                                            effect={t(
                                                "outposts.service_heal_effect",
                                                {
                                                    amount: BASE_SERVICE_VALUES.healAmount,
                                                },
                                            )}
                                            blocker={healBlocker}
                                            nothingLabel={t("outposts.service_heal_nothing")}
                                            onClick={() => healAtBase(base.id)}
                                        />
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
                                {/* Казарма вербует на ближайшей населённой планете:
                                    профессию выбирает игрок, а цену и срок — то, насколько
                                    глухое место выбрано под базу */}
                                {canHire && (
                                    <div className="mt-1.5">
                                        {base.pendingSettler ? (
                                            <div className="text-[10px] text-[#00d4ff]">
                                                🚶{" "}
                                                {t("outposts.settler_in_transit", {
                                                    profession: t(
                                                        `professions.${base.pendingSettler.profession}`,
                                                    ),
                                                    turns: Math.max(
                                                        0,
                                                        base.pendingSettler.arrivesAtTurn - turn,
                                                    ),
                                                })}
                                            </div>
                                        ) : settlerOffer ? (
                                            <>
                                                <div className="text-[10px] text-[#8a9ba3]">
                                                    {t("outposts.service_hire_from", {
                                                        planet: t(settlerOffer.planetName),
                                                        cost: settlerOffer.cost,
                                                        turns: settlerOffer.turns,
                                                    })}
                                                </div>
                                                {/* Кого именно везти — не безразлично:
                                                    множитель добычи даёт только тот, чья
                                                    профессия нужна стоящим модулям */}
                                                {wantedRoles.size > 0 && (
                                                    <div className="mt-0.5 text-[9px] text-[#00ff41]">
                                                        {t("outposts.hire_wanted", {
                                                            roles: [...wantedRoles]
                                                                .map((role) =>
                                                                    t(`professions.${role}`),
                                                                )
                                                                .join(", "),
                                                        })}
                                                    </div>
                                                )}
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {HIREABLE_PROFESSIONS.map((profession) => (
                                                        <Button
                                                            key={profession}
                                                            onClick={() =>
                                                                hireAtBase(base.id, profession)
                                                            }
                                                            disabled={hireBlocker !== null}
                                                            className={`min-h-7 cursor-pointer border bg-transparent px-2 text-[10px] hover:border-[#ffb000] hover:text-[#ffb000] disabled:cursor-default disabled:opacity-40 ${
                                                                wantedRoles.has(profession)
                                                                    ? "border-[#00ff41] text-[#00ff41]"
                                                                    : "border-[#555] text-[#b9c6cc]"
                                                            }`}
                                                        >
                                                            {t(`professions.${profession}`)}
                                                        </Button>
                                                    ))}
                                                </div>
                                                {hireBlocker && (
                                                    <div className="mt-0.5 text-[9px] text-[#8a9ba3]">
                                                        {t(`outposts.hire_${hireBlocker}`)}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-[10px] text-[#8a9ba3]">
                                                {t("outposts.hire_no_source")}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="storage">
                        {canStore && (
                            <div className="mt-2">
                                <div className="text-[10px] text-[#8a9ba3]">
                                    {t("outposts.service_store")} · {storageFree}{" "}
                                    {t("outposts.storage_free")}
                                </div>

                                {(storable.length > 0 || ship.cargo.length > 0) && (
                                    <div className="mt-1 space-y-1">
                                        {storable.map(([resource, amount]) => (
                                            <TransferRow
                                                key={resource}
                                                label={describeHaulResource(resource, t)}
                                                max={amount}
                                                accent="#ffb000"
                                                arrow="↓"
                                                onTransfer={(qty) =>
                                                    storeAtBase(base.id, resource, qty)
                                                }
                                            />
                                        ))}
                                        {/* Ради этого склад и нужен: груз задания и
                                            запасной модуль продать нельзя, а трюм
                                            они занимают */}
                                        {ship.cargo.map((item, index) => (
                                            <TransferRow
                                                key={`${item.item}-${index}`}
                                                label={describeCargoItem(item, t)}
                                                max={item.quantity}
                                                accent="#ffb000"
                                                arrow="↓"
                                                onTransfer={(qty) =>
                                                    storeCargoAtBase(base.id, index, qty)
                                                }
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Забрать своё со склада можно всегда: и пока идут работы,
                            и если склад снесли. Лежащее здесь не «услуга», а вещи
                            игрока — `withdrawFromBase` их и не запрещал, прятала
                            только панель */}
                        {hasStored && (
                            <div className="mt-2 space-y-1 border-t border-[#00d4ff22] pt-2">
                                <div className="text-[10px] text-[#8a9ba3]">
                                    {t("outposts.stored_here")}
                                </div>
                                {stored.map(([resource, amount]) => (
                                    <TransferRow
                                        key={`stored-${resource}`}
                                        label={describeHaulResource(resource, t)}
                                        max={amount}
                                        accent="#00d4ff"
                                        arrow="↑"
                                        onTransfer={(qty) =>
                                            withdrawFromBase(base.id, resource, qty)
                                        }
                                    />
                                ))}
                                {(base.storedCargo ?? []).map((item, index) => (
                                    <TransferRow
                                        key={`stored-${item.item}-${index}`}
                                        label={describeCargoItem(item, t)}
                                        max={item.quantity}
                                        accent="#00d4ff"
                                        arrow="↑"
                                        onTransfer={(qty) =>
                                            withdrawCargoFromBase(base.id, index, qty)
                                        }
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="garrison">
                        <OutpostGarrison outpost={base} accent="#ffb000" />
                    </TabsContent>
                </div>
            </Tabs>

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

            {/* Каталог по клику на свободный слот, а не простынёй под ним */}
            {catalogOpen && (
                <Dialog open onOpenChange={() => setCatalogOpen(false)}>
                    <GameDialogContent variant="warning" className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="font-['Orbitron'] text-[#ffb000]">
                                🏗 {t("outposts.module_catalog")}
                            </DialogTitle>
                            <DialogDescription className="text-[10px] text-[#8a9ba3]">
                                {t("outposts.summary_slots", {
                                    filled: installed.length,
                                    total: slots,
                                })}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[60vh] overflow-y-auto">
                            <ModuleCatalog
                                base={base}
                                credits={credits}
                                research={research}
                                readyIn={moduleReadyIn}
                                onInstall={(moduleId) => {
                                    installBaseModule(base.id, moduleId);
                                    setCatalogOpen(false);
                                }}
                            />
                        </div>
                    </GameDialogContent>
                </Dialog>
            )}
        </div>
    );
}
