import { store as i18nStore } from "@/lib/useTranslation";
import { getArtifactEffectValue } from "@/game/artifacts";
import type { GameState, GameStore, SetState } from "@/game/types";

/**
 * Обработка положительных эффектов артефактов
 *
 * Обрабатывает артефакты с постоянными эффектами каждый ход:
 * - free_power (Вечное Ядро) - бесплатная энергия
 * - nanite_repair (Нанитовая Обшивка) - авторемонт модулей
 * - auto_repair (Паразитические Наниты) - авторемонт модулей
 * - abyss_power (Реактор Бездны) - бонус к энергии
 * - shield_regen_boost (Регенератор Щитов) - бонус к регенерации щитов
 * - dark_shield (Тёмный Щит) - бонус к щитам
 *
 * @param state - Текущее состояние игры
 * @param set - Функция обновления состояния
 * @param get - Функция получения состояния
 */
export const processArtifactEffects = (
    state: GameState,
    set: SetState,
    get: () => GameStore,
): void => {
    const activeArtifacts = state.artifacts.filter((a) => a.effect.active);

    activeArtifacts.forEach((artifact) => {
        const effectType = artifact.effect.type;

        switch (effectType) {
            // === ЭНЕРГИЯ ===
            case "free_power": {
                // Вечное Ядро - бесплатная энергия (обрабатывается в getTotalPower)
                const powerBonus = getArtifactEffectValue(artifact, state);
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_1", { powerBonus }),
                    "info",
                );
                break;
            }

            case "abyss_power": {
                // Реактор Бездны - бонус к энергии (обрабатывается в getTotalPower)
                const powerBonus = getArtifactEffectValue(artifact, state);
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_2", { powerBonus }), "info");
                break;
            }

            // === АВТО-РЕМОНТ ===
            case "nanite_repair": {
                // Нанитовая Обшивка - ремонт модулей
                const repairAmount = getArtifactEffectValue(artifact, state);
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) => ({
                            ...m,
                            health: Math.min(m.maxHealth ?? 100, m.health + repairAmount),
                        })),
                    },
                }));
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_3", { repairAmount }),
                    "info",
                );
                break;
            }

            case "auto_repair": {
                // Паразитические Наниты - ремонт модулей
                const repairAmount = getArtifactEffectValue(artifact, state);
                set((s) => ({
                    ship: {
                        ...s.ship,
                        modules: s.ship.modules.map((m) => ({
                            ...m,
                            health: Math.min(m.maxHealth ?? 100, m.health + repairAmount),
                        })),
                    },
                }));
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_4", { repairAmount }),
                    "info",
                );
                break;
            }

            // === ЩИТЫ ===
            case "dark_shield": {
                // Тёмный Щит - бонус к максимальным щитам (обрабатывается в updateShipStats)
                const shieldBonus = getArtifactEffectValue(artifact, state);
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_5", { shieldBonus }), "info");
                break;
            }

            case "shield_regen_boost": {
                // Регенератор Щитов - бонус к регенерации (обрабатывается в regenerateShields)
                const regenBoost = Math.round(
                    getArtifactEffectValue(artifact, state) * 100,
                );
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_6", { regenBoost }),
                    "info",
                );
                break;
            }

            // === ОРУЖИЕ И БОЙ ===
            case "damage_boost": {
                // Усиление урона (обрабатывается в getTotalDamage)
                const damageBoost = Math.round(
                    getArtifactEffectValue(artifact, state) * 100,
                );
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_7", { damageBoost }), "info");
                break;
            }

            case "accuracy_boost": {
                // Бонус к точности (обрабатывается в attackEnemy)
                const accuracyBoost = Math.round(
                    getArtifactEffectValue(artifact, state) * 100,
                );
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_8", { accuracyBoost }), "info");
                break;
            }

            case "crit_chance": {
                // Шанс крита (обрабатывается в attackEnemy)
                const critChance = Math.round(
                    getArtifactEffectValue(artifact, state) * 100,
                );
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_9", { critChance }), "info");
                break;
            }

            // === СКАНИРОВАНИЕ ===
            case "quantum_scan": {
                // Квантовый сканер (обрабатывается в getEffectiveScanRange)
                const scanBonus = getArtifactEffectValue(artifact, state);
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_10", { scanBonus }),
                    "info",
                );
                break;
            }

            case "all_seeing": {
                // Око Сингулярности - все враги видны (обрабатывается в selectLocation)
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_11"), "info");
                break;
            }

            // === ПЕРЕДВИЖЕНИЕ ===
            case "void_engine": {
                // Вакуумный Двигатель - бесплатные перелёты (обрабатывается в selectSector)
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_12"),
                    "info",
                );
                break;
            }

            case "fuel_free": {
                // Варп-Катушка - мгновенные перемещения (обрабатывается в selectSector)
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_13"), "info");
                break;
            }

            // === ЭКИПАЖ ===
            case "crew_immortal": {
                // Кристалл Жизни - бессмертие (обрабатывается в checkOxygen/moduleDamage)
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_14"), "info");
                break;
            }

            case "undying_crew": {
                // Биосфера Древних - бессмертие с мутациями
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_15"), "info");
                break;
            }

            case "ai_control": {
                // ИИ Нейросеть - управление без экипажа
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_16"),
                    "info",
                );
                break;
            }

            // === НАХОДКИ ===
            case "artifact_finder": {
                // Компас Древних - шанс находок (обрабатывается в tryFindArtifact)
                const findBonus = getArtifactEffectValue(artifact, state);
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_17", { findBonus }),
                    "info",
                );
                break;
            }

            case "credit_booster": {
                // Чёрный Ящик - бонус к кредитам (обрабатывается при получении наград)
                const creditBoost = Math.round(
                    getArtifactEffectValue(artifact, state) * 100,
                );
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_18", { creditBoost }),
                    "info",
                );
                break;
            }

            // === УРОН ===
            case "crit_damage_boost": {
                // Матрица Перегрузки - критический урон (обрабатывается в бою)
                const critDamage = Math.round(
                    getArtifactEffectValue(artifact, state) * 100,
                );
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_19", { critDamage }),
                    "info",
                );
                break;
            }

            // === Уклонение ===
            case "evasion_boost": {
                // Матрица Уклонения - бонус к уклонению (обрабатывается в getTotalEvasion)
                const evasionBoost = Math.round(
                    getArtifactEffectValue(artifact, state) * 100,
                );
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_20", { evasionBoost }), "info");
                break;
            }

            // === МОДУЛЬНАЯ БРОНЯ ===
            case "module_armor": {
                // Кристаллическая Броня - бонус к защите (обрабатывается в calculateAverageDefense)
                const armorBonus = getArtifactEffectValue(artifact, state);
                get().addLog( i18nStore.t("game_logs.processArtifactEffects_21", { armorBonus }),
                    "info",
                );
                break;
            }
        }
    });
};
