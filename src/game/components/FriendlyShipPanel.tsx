"use client";

import { useMemo, useEffect, useState } from "react";
import { useGameStore } from "@/game/store";
import { TRADE_GOODS } from "@/game/constants/goods";
import { RACES } from "@/game/constants/races";
import { Button } from "@/components/ui/button";
import { SectionPanel } from "./SectionPanel";
import { getRandomName } from "@/game/crew/utils";
import { generateCrewTraits } from "@/game/crew/utils";
import { CREW_BASE_PRICES } from "@/game/constants/crew";
import { Goods } from "@/game/types/goods";
import { Profession } from "@/game/types/crew";
import { useTranslation } from "@/lib/useTranslation";
import { getRaceReputationLevel } from "@/game/reputation/utils";
import { applyReputationPriceModifier } from "@/game/reputation/priceModifier";
import { getTierPriceMultiplier } from "@/game/slices/trade/constants";
import type { CrewMember, Quality, RaceId } from "@/game/types";
import { RaceSprite } from "./RaceSprite";
import { ContractReputationImpact } from "./ContractReputationImpact";
import { CrewTab } from "./station/CrewTab";
import { TradeGoodRow } from "./station/TradeTab";
import { GoodInfoModal } from "./GoodInfoModal";

const INITIAL_STOCK: Goods[] = ["water", "food", "medicine"];

export function FriendlyShipPanel() {
  const currentLocation = useGameStore((s) => s.currentLocation);
  const sectorTier = useGameStore((s) => s.currentSector?.tier ?? 1);
  const credits = useGameStore((s) => s.credits);
  const ship = useGameStore((s) => s.ship);
  const crew = useGameStore((s) => s.crew);
  const knownRaces = useGameStore((s) => s.knownRaces);
  const discoverRace = useGameStore((s) => s.discoverRace);

  // Ensure credits are always displayed as integers
  const displayCredits = Math.floor(credits);

  const { t } = useTranslation();

  const hireCrew = useGameStore((s) => s.hireCrew);
  const getCrewCapacity = useGameStore((s) => s.getCrewCapacity);
  const acceptContract = useGameStore((s) => s.acceptContract);
  const completeDeliveryContract = useGameStore(
    (s) => s.completeDeliveryContract,
  );
  const activeContracts = useGameStore((s) => s.activeContracts);

  const showSectorMap = useGameStore((s) => s.showSectorMap);
  const attackFriendlyShip = useGameStore((s) => s.attackFriendlyShip);
  const raceReputation = useGameStore((s) => s.raceReputation);
  const shipQuestsTaken = useGameStore((s) => s.shipQuestsTaken);
  const hiredCrewFromShips = useGameStore((s) => s.hiredCrewFromShips);
  const friendlyShipStock = useGameStore((s) => s.friendlyShipStock);
  const distressRespondedShips = useGameStore(
    (s) => s.distressRespondedShips,
  );
  const addLog = useGameStore((s) => s.addLog);

  const [infoGood, setInfoGood] = useState<Goods | null>(null);

  const dominantRace = currentLocation?.dominantRace;
  const race = dominantRace ? RACES[dominantRace] : null;

  // Strip race adjective from ship name (e.g. "Человеческий Торговец" → "Торговец")
  const shipDisplayName = (() => {
    const name = currentLocation?.name ?? "";
    if (!race) return name;
    const prefix = race.adjective || race.name;
    return name.startsWith(prefix + " ") ? name.slice(prefix.length + 1) : name;
  })();

  // Discover race when encountering a friendly ship
  useEffect(() => {
    if (dominantRace && race && !knownRaces.includes(dominantRace)) {
      discoverRace(dominantRace);
    }
  }, [dominantRace, race, knownRaces, discoverRace]);

  const seedRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const shipId = currentLocation?.id ?? "";

  let seed = 0;
  for (let i = 0; i < shipId.length; i++) {
    seed = (seed << 5) - seed + shipId.charCodeAt(i);
    seed = seed & seed;
  }

  useEffect(() => {
    if (!shipId || friendlyShipStock[shipId]) return;

    const initialStock: Record<string, number> = {};
    INITIAL_STOCK.forEach((gid, idx) => {
      initialStock[gid] =
        5 + Math.floor(seedRandom(seed + idx + 10) * 10);
    });

    useGameStore.setState((s) => ({
      friendlyShipStock: {
        ...s.friendlyShipStock,
        [shipId]: initialStock,
      },
    }));
  }, [friendlyShipStock, seed, shipId]);

  // Initialize or get stock for this friendly ship
  const getShipStock = (goodId: string): number => {
    if (!shipId) return 0;
    const stock = friendlyShipStock[shipId];
    if (!stock) return 0;
    return stock[goodId] || 0;
  };

  // Calculate available cargo space
  const cargoModules = ship.modules.filter(
    (m) =>
      m.type === "cargo" &&
      !m.disabled &&
      !m.manualDisabled &&
      m.health > 0,
  );
  const totalCargoCapacity = cargoModules.reduce(
    (sum, m) => sum + (m.capacity || 0),
    0,
  );
  const probes = useGameStore((s) => s.probes);
  const currentCargo =
    ship.cargo.reduce((s, c) => s + c.quantity, 0) +
    ship.tradeGoods.reduce((s, g) => s + g.quantity, 0) +
    probes;
  const availSpace = totalCargoCapacity - currentCargo;

  // Memoize crew data to prevent regeneration on every render
  const crewData = useMemo(() => {
    const professions: Profession[] = [
      "pilot",
      "engineer",
      "medic",
      "scout",
      "scientist",
      "gunner",
    ];
    const availableProfession =
      professions[
      Math.floor(seedRandom(seed + 100) * professions.length)
      ];
    const availableLevel =
      availableProfession === "scientist"
        ? 1 + Math.floor(seedRandom(seed + 101) * 3)
        : undefined;

    const raceOptions: RaceId[] = [
      "human",
      "synthetic",
      "xenosymbiont",
      "krylorian",
      "voidborn",
      "crystalline",
    ];
    const crewRaceId: RaceId =
      raceOptions[
      Math.floor(seedRandom(seed + 103) * raceOptions.length)
      ];
    const crewRace = RACES[crewRaceId];
    const crewName = getRandomName(
      availableProfession,
      crewRaceId,
      seed + 104,
    );

    const qualityRoll = seedRandom(seed + 102);
    let quality: Quality;
    if (qualityRoll < 0.25) quality = "poor";
    else if (qualityRoll < 0.6) quality = "average";
    else if (qualityRoll < 0.85) quality = "good";
    else quality = "excellent";

    const { traits, priceModifier } = generateCrewTraits(
      quality,
      0,
      crewRace.hasHappiness,
      availableProfession,
      crewRaceId,
    );
    const basePrice = CREW_BASE_PRICES[availableProfession];
    const levelMod = availableLevel ? 1 + (availableLevel - 1) * 0.2 : 1;
    const crewPrice = Math.round(basePrice * priceModifier * levelMod);

    return {
      crewRaceId,
      crewRace,
      crewName,
      availableProfession,
      availableLevel,
      quality,
      traits,
      crewPrice,
    };
  }, [seed]);

  if (!currentLocation) return null;

  const shipQuest = currentLocation.pregeneratedQuest ?? null;

  const {
    crewRaceId,
    crewName,
    availableProfession,
    availableLevel,
    quality,
    traits,
    crewPrice,
  } = crewData;

  // Check if quest already taken from this ship
  const questAlreadyTaken = shipQuestsTaken.includes(currentLocation.id);

  // Check if crew already hired from this ship
  const crewAlreadyHired = hiredCrewFromShips.includes(currentLocation.id);

  // Check for delivery contracts that can be turned in at this ship
  const completableContracts = activeContracts.filter(
    (c) =>
      c.type === "delivery" &&
      c.targetLocationId === currentLocation.id &&
      ship.cargo.some((cargo) => cargo.contractId === c.id),
  );

  // Цены торговца привязаны к тиру сектора, как и у станций (анти-арбитраж)
  const tradeGoods = INITIAL_STOCK.map((gid, idx) => ({
    id: gid,
    ...TRADE_GOODS[gid],
    price: Math.floor(
      TRADE_GOODS[gid].basePrice *
        getTierPriceMultiplier(sectorTier) *
        (0.9 + seedRandom(seed + idx) * 0.4),
    ),
    stock: getShipStock(gid),
  }));

  // Handle accepting quest from ship
  const handleAcceptQuest = () => {
    if (!shipQuest) return;
    if (!acceptContract(shipQuest)) return;

    useGameStore.setState((s) => ({
      shipQuestsTaken: [...s.shipQuestsTaken, currentLocation.id],
    }));
  };

  const raceAccent = race?.color ?? "#ffb000";
  const raceBg = race ? `${race.color}12` : "rgba(0,0,0,0)";
  const raceBorder = race ? `${race.color}55` : "#333";

  const availableCrew = [
    {
      member: {
        name: crewName,
        race: crewRaceId,
        profession: availableProfession,
        level: availableLevel,
        traits,
      },
      price: crewPrice,
      quality,
    },
  ];

  const handleHireCrew = (
    member: unknown,
    price: number,
    locationId?: string,
  ) => {
    hireCrew(
      { ...(member as Partial<CrewMember>), price } as Partial<CrewMember> & {
        price: number;
      },
      locationId ?? currentLocation.id,
    );
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-2">
      {/* Header */}
      <div>
        <div className="font-['Orbitron'] font-bold text-lg" style={{ color: raceAccent }}>
          ▸ {shipDisplayName}
        </div>
        {race && (
          <div
            className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded border text-xs"
            style={{ borderColor: race.color, backgroundColor: `${race.color}15`, color: race.color }}
          >
            <RaceSprite
              race={dominantRace ?? "human"}
              size={20}
              title={t(`races.${dominantRace}.plural`)}
            />
            <span className="font-bold">{t(`races.${dominantRace}.plural`)}</span>
          </div>
        )}
        {!currentLocation.hasDistress && (
          <div className="text-sm text-[#aaa] mt-2">
            {currentLocation.greeting || t("friendly_ship.default_greeting")}
          </div>
        )}
      </div>

      {/* Trader */}
      {currentLocation.hasTrader && (
        <div className="border-t border-[#333] pt-3">
          <div className="font-['Orbitron'] font-bold text-sm text-[#00ff41] mb-2 uppercase tracking-wider">
            {t("friendly_ship.trade")}
          </div>
          <div className="flex flex-col gap-2.5">
            {tradeGoods.map((g) => {
              const playerGood = ship.tradeGoods.find(
                (tg) => tg.item === g.id,
              );
              const baseBuyPrice = g.price;
              const baseSellPrice = Math.floor(g.price * 0.6);
              const buyPriceFor5 = dominantRace
                ? applyReputationPriceModifier(raceReputation, dominantRace, baseBuyPrice, "buy", baseSellPrice, 5)
                : baseBuyPrice;
              const sellPriceFor5 = dominantRace
                ? applyReputationPriceModifier(raceReputation, dominantRace, baseSellPrice, "sell", baseBuyPrice, 5)
                : baseSellPrice;
              const buyPricePerUnit = Math.floor(buyPriceFor5 / 5);
              const sellPricePerUnit = Math.floor(sellPriceFor5 / 5);

              const makeBuy = (qty: number, cost: number) => () => {
                useGameStore.setState((s) => ({
                  friendlyShipStock: { ...s.friendlyShipStock, [shipId]: { ...s.friendlyShipStock[shipId], [g.id]: (s.friendlyShipStock[shipId]?.[g.id] || 0) - qty } },
                  credits: s.credits - cost,
                  ship: { ...s.ship, tradeGoods: s.ship.tradeGoods.some((tg) => tg.item === g.id) ? s.ship.tradeGoods.map((tg) => tg.item === g.id ? { ...tg, quantity: tg.quantity + qty } : tg) : [...s.ship.tradeGoods, { item: g.id, quantity: qty, buyPrice: g.price }] },
                }));
              };
              const makeSell = (qty: number, revenue: number) => () => {
                useGameStore.setState((s) => ({
                  friendlyShipStock: { ...s.friendlyShipStock, [shipId]: { ...s.friendlyShipStock[shipId], [g.id]: (s.friendlyShipStock[shipId]?.[g.id] || 0) + qty } },
                  credits: s.credits + revenue,
                  ship: { ...s.ship, tradeGoods: s.ship.tradeGoods.map((tg) => tg.item === g.id ? { ...tg, quantity: tg.quantity - qty } : tg).filter((tg) => tg.quantity > 0) },
                }));
              };

              return (
                <TradeGoodRow
                  key={g.id}
                  good={{ id: g.id, name: g.name }}
                  prices={{ buy: baseBuyPrice, sell: baseSellPrice }}
                  pricesWithRep={{ buy: buyPriceFor5, sell: sellPriceFor5 }}
                  stock={g.stock}
                  playerGood={playerGood}
                  credits={displayCredits}
                  availSpace={availSpace}
                  onBuy={(_goodId, qty) => makeBuy(qty, buyPricePerUnit * qty)()}
                  onSell={(_goodId, qty) => makeSell(qty, sellPricePerUnit * qty)()}
                  crisisMultiplier={1}
                  onShowInfo={() => setInfoGood(g.id)}
                />
              );
            })}
          </div>
          {infoGood && (
            <GoodInfoModal goodId={infoGood} onClose={() => setInfoGood(null)} />
          )}
        </div>
      )}

      {/* Crew */}
      {currentLocation.hasCrew && !crewAlreadyHired && (
        <div className="border-t border-[#333] pt-3">
          <div className="font-['Orbitron'] font-bold text-sm text-[#ffb000] mb-2 uppercase tracking-wider">
            {t("friendly_ship.crew_section")}
          </div>
          <CrewTab
            availableCrew={availableCrew}
            hasSpace={crew.length < getCrewCapacity()}
            credits={displayCredits}
            locationId={currentLocation.id}
            hireCrew={handleHireCrew}
          />
        </div>
      )}

      {/* Complete delivery contracts at this ship */}
      {completableContracts.length > 0 && (
        <div className="border-t border-[#333] pt-3">
          <div className="font-['Orbitron'] font-bold text-sm text-[#00ff41] mb-1 uppercase tracking-wider">
            {t("friendly_ship.deliver_cargo")}
          </div>
          <div className="text-xs text-[#555] mb-2">
            {t("friendly_ship.arrived_destination")}
          </div>
          <div className="flex flex-col gap-2">
            {completableContracts.map((c) => (
              <SectionPanel
                key={c.id}
                padding="sm"
                className="flex justify-between items-center"
              >
                <div className="flex-1">
                  <div className="text-[#00d4ff] font-bold text-sm">
                    {c.desc}
                  </div>
                  <div className="text-[11px] mt-1 text-[#00ff41]">
                    📦 {t("friendly_ship.cargo_label")}: {c.cargo} ({c.quantity ?? 10}т)
                  </div>
                  <div className="text-[#ffb000] text-xs mt-1">
                    💰 {c.reward}₢
                  </div>
                </div>
                <Button
                  onClick={() => completeDeliveryContract(c.id)}
                  className="cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-xs ml-3"
                >
                  {t("friendly_ship.deliver")}
                </Button>
              </SectionPanel>
            ))}
          </div>
        </div>
      )}

      {/* Quest */}
      {currentLocation.hasQuest && !questAlreadyTaken && (
        <div className="border-t border-[#333] pt-3">
          <div className="font-['Orbitron'] font-bold text-sm text-[#ffb000] mb-2 uppercase tracking-wider">
            {t("friendly_ship.contract")}
          </div>
          {shipQuest ? (
            <div
              className="border p-3"
              style={{ background: raceBg, borderColor: raceBorder }}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-ring font-bold flex items-center gap-2 flex-wrap">
                    {shipQuest.desc}
                    {dominantRace && (
                      <span
                        className="inline-flex items-center gap-1 text-xs px-1 py-0.5 rounded"
                        style={{
                          backgroundColor: `${raceAccent}20`,
                          color: raceAccent,
                        }}
                      >
                        <RaceSprite
                          race={dominantRace}
                          size={18}
                          title={t(`races.${dominantRace}.plural`)}
                        />
                        {t(`races.${dominantRace}.plural`)}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleAcceptQuest}
                  className="cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase text-xs ml-2"
                >
                  {t("contracts.accept")}
                </Button>
              </div>

              {shipQuest.type === "delivery" && (
                <div className="text-[11px] text-[#888] mt-1.5">
                  {t("contracts.quest_delivery_cargo")}
                </div>
              )}
              <div className="text-[#ffb000] text-xs mt-2">
                {t("contracts.reward_label")}{" "}
                {shipQuest.reward}₢
              </div>
              <ContractReputationImpact contract={shipQuest} />
            </div>
          ) : (
            <div className="text-[#888] text-xs p-2.5">
              {t("contracts.no_quests")}
            </div>
          )}
        </div>
      )}

      {/* Quest already taken message */}
      {currentLocation.hasQuest && questAlreadyTaken && (
        <div className="text-xs text-[#555] border-t border-[#222] pt-3">
          {t("friendly_ship.quest_taken")}
        </div>
      )}

      {/* Distress Signal */}
      {currentLocation.hasDistress &&
        (() => {
          const distressNeedTypes = ["fuel", "medicine"] as const;
          type DistressNeed = (typeof distressNeedTypes)[number];
          const needType: DistressNeed =
            distressNeedTypes[
            Math.floor(
              seedRandom(seed + 200) *
              distressNeedTypes.length,
            )
            ];
          const fuelAmount =
            10 + Math.floor(seedRandom(seed + 201) * 16); // 10-25
          const medicineAmount =
            2 + Math.floor(seedRandom(seed + 202) * 5); // 2-6
          const amount =
            needType === "fuel" ? fuelAmount : medicineAmount;
          const creditReward =
            needType === "fuel"
              ? fuelAmount * 8
              : medicineAmount * 40;
          const researchRewardRoll = seedRandom(seed + 203);
          const hasResearchReward = researchRewardRoll < 0.45;
          const researchRewardType =
            researchRewardRoll < 0.25
              ? ("tech_salvage" as const)
              : ("alien_biology" as const);
          const researchRewardAmount =
            1 + Math.floor(seedRandom(seed + 204) * 2); // 1-2

          const distressAlreadyHelped =
            distressRespondedShips.includes(currentLocation.id);

          const playerFuel = ship.fuel;
          const playerMedicine =
            needType === "medicine"
              ? (ship.cargo.find((c) => c.item === "medicine")?.quantity ?? 0) +
                (ship.tradeGoods.find((tg) => tg.item === "medicine")?.quantity ?? 0)
              : 0;

          const canHelp =
            !distressAlreadyHelped &&
            (needType === "fuel"
              ? playerFuel >= amount
              : playerMedicine >= amount);

          const handleHelp = () => {
            useGameStore.setState((s) => {
              const newResources = {
                ...s.research.resources,
              };
              if (hasResearchReward) {
                newResources[researchRewardType] =
                  (newResources[researchRewardType] ?? 0) +
                  researchRewardAmount;
              }

              let newCargo = s.ship.cargo;
              let newTradeGoods = s.ship.tradeGoods;
              let newFuel = s.ship.fuel;
              if (needType === "fuel") {
                newFuel = s.ship.fuel - amount;
              } else {
                // Deduct from cargo first, then tradeGoods for the remainder
                const fromCargo = Math.min(
                  amount,
                  s.ship.cargo.find((c) => c.item === "medicine")?.quantity ?? 0,
                );
                const fromTrade = amount - fromCargo;
                if (fromCargo > 0) {
                  newCargo = s.ship.cargo
                    .map((c) =>
                      c.item === "medicine"
                        ? { ...c, quantity: c.quantity - fromCargo }
                        : c,
                    )
                    .filter((c) => c.quantity > 0);
                }
                if (fromTrade > 0) {
                  newTradeGoods = s.ship.tradeGoods
                    .map((tg) =>
                      tg.item === "medicine"
                        ? { ...tg, quantity: tg.quantity - fromTrade }
                        : tg,
                    )
                    .filter((tg) => tg.quantity > 0);
                }
              }

              return {
                distressRespondedShips: [
                  ...s.distressRespondedShips,
                  currentLocation.id,
                ],
                credits: s.credits + creditReward,
                ship: {
                  ...s.ship,
                  fuel: newFuel,
                  cargo: newCargo,
                  tradeGoods: newTradeGoods,
                },
                research: {
                  ...s.research,
                  resources: newResources,
                },
              };
            });
            addLog(
              `🆘 Помогли кораблю в бедствии. Получено: ${creditReward}₢${hasResearchReward ? ` + ${researchRewardAmount}× исследовательский ресурс` : ""}`,
              "info",
            );
          };

          const needIcon = needType === "fuel" ? "⛽" : "💊";
          const needName = needType === "fuel" ? t("ship_stats.fuel") : t("trade.goods.medicine");
          const playerHas = needType === "fuel" ? playerFuel : playerMedicine;

          return (
            <div className="border-t border-[#ff660044] pt-3">
              <div className="font-['Orbitron'] font-bold text-sm text-[#ff6600] mb-2 uppercase tracking-wider">
                {t("friendly_ship.distress_title")}
              </div>
              {distressAlreadyHelped ? (
                <div className="text-xs text-[#555]">
                  {t("friendly_ship.distress_helped")}
                </div>
              ) : (
                <>
                  <div className="text-sm text-[#aaa] mb-3">
                    {t("friendly_ship.distress_request")}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="bg-[rgba(255,102,0,0.08)] border border-[#ff660033] p-2">
                      <div className="text-[#888] mb-0.5">{t("friendly_ship.distress_required")}</div>
                      <div className="text-[#ffb000] font-bold">{needIcon} {needName}: {amount}</div>
                    </div>
                    <div className="bg-[rgba(255,102,0,0.08)] border border-[#ff660033] p-2">
                      <div className="text-[#888] mb-0.5">{t("friendly_ship.distress_aboard")}</div>
                      <div className={`font-bold ${canHelp ? "text-[#00ff41]" : "text-[#ff4444]"}`}>{needIcon} {playerHas}</div>
                    </div>
                  </div>
                  <div className="text-[#00d4ff] text-xs mb-3">
                    {t("friendly_ship.distress_reward")}: <span className="font-bold">{creditReward}₢</span>
                    {hasResearchReward && (
                      <span className="ml-2 text-[#888]">
                        + {researchRewardAmount}×{" "}
                        {researchRewardType === "tech_salvage"
                          ? t("friendly_ship.tech_salvage")
                          : t("friendly_ship.alien_biology")}
                      </span>
                    )}
                  </div>
                  <Button
                    disabled={!canHelp}
                    onClick={handleHelp}
                    className="cursor-pointer bg-transparent border-2 border-[#ff6600] text-[#ff6600] hover:bg-[#ff6600] hover:text-[#050810] uppercase text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("friendly_ship.help")}
                  </Button>
                </>
              )}
            </div>
          );
        })()}

      {/* Footer actions */}
      <div className="flex gap-2 flex-wrap border-t border-[#222] pt-4 mt-2">
        <Button
          onClick={showSectorMap}
          className="cursor-pointer bg-transparent border-2 border-[#00ff41] text-[#00ff41] hover:bg-[#00ff41] hover:text-[#050810] uppercase tracking-wider"
        >
          {t("friendly_ship.leave")}
        </Button>
        {currentLocation.dominantRace &&
          getRaceReputationLevel(raceReputation, currentLocation.dominantRace) !== "hostile" && (
            <Button
              onClick={attackFriendlyShip}
              className="cursor-pointer bg-transparent border border-[#ff004066] text-[#ff004088] hover:border-[#ff0040] hover:text-[#ff0040] uppercase tracking-wider text-xs"
            >
              {t("friendly_ship.attack")}
            </Button>
          )}
      </div>
    </div>
  );
}
