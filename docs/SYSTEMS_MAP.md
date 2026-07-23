# 🗺️ Карта взаимосвязей игровых систем

Назначение: понять, какие элементы игры затрагиваются при добавлении/изменении сущности (раса, модуль, профессия, технология и т.д.).

---

## Общая схема

```mermaid
graph TD
    subgraph Экипаж
        RACE[Раса<br/>constants/races.ts]
        PROF[Профессия<br/>types/crew.ts]
        CREW[Член экипажа<br/>уровень, опыт, черты, усталость]
        TRAIT[Черты/мутации<br/>constants/traits.ts]
        AUG[Аугментации<br/>constants/augmentations.ts]
        ASSIGN[Назначения<br/>мирные + боевые]
    end

    subgraph Корабль
        MOD[Модули<br/>constants/modules.ts]
        WPN[Оружие<br/>constants/weapons.ts]
        SHIPSTAT[Атрибуты корабля<br/>энергия, щиты, топливо, груз, кислород]
    end

    subgraph Прогресс
        RES[Исследования<br/>constants/research/]
        CRAFT[Крафт<br/>constants/crafting.ts]
        EXP[Опыт/уровни<br/>constants/experience.ts]
        VICT[Пути победы<br/>victoryObjectives.ts]
    end

    subgraph Мир
        PLANET[Планеты<br/>constants/planets.ts]
        GAL[Галактика/сектора<br/>galaxy/generate.ts]
        STAR[Звёзды/опасности<br/>starHazards.ts]
        STATION[Станции]
        EXPED[Экспедиции]
        EVENT[Случайные события<br/>randomEvents.ts]
        CRISIS[Глобальные кризисы<br/>globalCrises.ts + crisisResponses.ts]
        BOSS[Боссы/монстры]
        ART[Артефакты<br/>constants/artifacts.ts]
    end

    subgraph Экономика
        REP[Репутация<br/>slices/reputation]
        CONTR[Контракты<br/>contracts.ts]
        TRADE[Торговля/цены]
        CRED[Кредиты]
    end

    %% Экипаж
    RACE -->|crewBonuses: наука, ремонт, бой, лечение| CREW
    RACE -->|environmentPreference → счастье| PLANET
    RACE -->|relations: союзники/соперники| REP
    RACE -->|расовые аугментации| AUG
    RACE -->|xenosymbiont: merge| MOD
    RACE -->|synthetic: ai_core, без усталости| ASSIGN
    PROF -->|определяет доступные| ASSIGN
    PROF -->|проф. аугментации| AUG
    CREW -->|уровень → эффективность назначений| ASSIGN
    TRAIT --> CREW
    AUG --> CREW
    EXP -->|опыт за контракты и назначения| CREW

    %% Экипаж ↔ Корабль
    ASSIGN -->|требуют конкретный модуль<br/>gunner→weaponbay, scientist→lab| MOD
    ASSIGN -->|бафы: урон, точность, энергия, щиты| SHIPSTAT
    MOD -->|power/consumption/oxygen/capacity| SHIPSTAT
    MOD -->|weaponbay/weaponShed| WPN
    MOD -->|quarters → слоты экипажа| CREW
    MOD -->|medical → лечение, lab → наука| CREW

    %% Исследования
    MOD -->|lab: researchOutput| RES
    CREW -->|scientist + уровень| RES
    RES -->|бонусы: HP модулей, урон, щиты, груз| SHIPSTAT
    RES -->|new_module, new_weapon| MOD
    RES -->|crew_exp, crew_health| CREW
    RES -->|unlockedRecipes| CRAFT
    RES -->|scientific_ascension| VICT
    CRAFT -->|оружие, гибридные модули| MOD

    %% Экономика
    CONTR -->|награда: кредиты + репутация| REP
    CONTR --> CRED
    CONTR -->|baseExp| EXP
    REP -->|каскад на союзников/соперников| REP
    REP -->|модификатор цен: товары, ремонт, лечение| TRADE
    REP -->|hostile блокирует найм| STATION
    STATION -->|найм даёт +1..3 репутации расе| REP
    REP -->|galactic_coalition| VICT
    TRADE --> CRED

    %% Мир
    PLANET -->|requiredRace, эффекты планет| CREW
    PLANET -->|специализации → контракты, товары| CONTR
    GAL -->|расселение рас по секторам| RACE
    STATION -->|найм экипажа, ресурсы исследований| CREW
    EXPED -->|усталость, опыт, ресурсы| CREW
    EXPED -->|tileWeights зависят от расы| RACE
    EVENT -->|урон, находки| CREW
    BOSS -->|defeat_* цели| VICT
    WPN -->|бой| BOSS

    %% Мутации и счастье
    EVENT -->|аномалии: шанс мутации| TRAIT
    BOSS -->|шанс мутации за тир| TRAIT
    ART -->|проклятые: мутации, дезертирство,<br/>дрейн счастья/HP| CREW
    ART -->|эффекты: энергия, криты,<br/>уклонение, щиты| SHIPSTAT
    RACE -->|crystalline: artifactBonus| ART
    BOSS -.->|подсказки об артефактах| ART
    PLANET -->|environmentPreference| HAPPY[Счастье экипажа]
    HAPPY -->|happiness ≤ 0 → дезертирство<br/>processDesertion.ts| CREW

    %% Кризисы и опасности
    CRISIS -->|болезни: race.canGetSick| CREW
    CRISIS -->|урон модулям, дефицит товаров| MOD
    MOD -->|наличие модулей → варианты ответа<br/>crisisResponses.ts| CRISIS
    STAR -->|уровень опасности звезды| SHIPSTAT
```

---

## Ключевые цепочки

- **Уровень экипажа → эффективность**: уровень входит в формулы назначений (например, наука учёного = `(5 + уровень) × 2` при назначении `research`). Опыт капает из контрактов (`constants/experience.ts`), назначений и экспедиций.
- **Модуль → атрибуты корабля**: каждый модуль даёт/потребляет энергию, кислород, ёмкости (`slices/ship`). Отключение модуля (дефицит энергии, урон) каскадно бьёт по всем зависимым системам.
- **Модуль → назначения**: многие задачи требуют нахождения в конкретном модуле (см. `docs/CREW_ASSIGNMENTS.md`).
- **Ксеноморф → модуль**: сращивание даёт бонус в зависимости от типа модуля (см. `docs/XENOSYMBIONT_MERGE.md`). Новый тип модуля = нужен эффект сращивания.
- **Репутация → каскад**: изменение репутации с расой пересчитывается на её `relations` (см. `docs/REPUTATION_TRADEOFFS.md`), влияет на цены, контракты, враждебность в секторах.
- **Исследования → всё**: `ResearchBonusType` покрывает модули, оружие, экипаж, груз, щиты, экспедиции, артефакты; технологии открывают рецепты крафта и новые модули.
- **Счастье → дезертирство**: при `happiness ≤ 0` член экипажа дезертирует (`processDesertion.ts`). Источники счастья: среда планет (`environmentPreference` расы), назначение `morale`, проклятые артефакты (дрейн), черты.
- **Мутации** приходят из трёх источников (`constants/mutationChances.ts`): аномалии, боссы, проклятые артефакты — и становятся чертами экипажа (`MutationTraitId`).
- **Глобальные кризисы** (с ~100 хода): болезни экипажа фильтруются по `race.canGetSick`, варианты ответа (`crisisResponses.ts`) зависят от наличия живых включённых модулей.
- **Найм ↔ репутация двусторонний**: `hostile`-уровень блокирует найм расы на станции (`StationPanel.tsx`), а успешный найм даёт +1..3 репутации расе нанятого (`hireCrew.ts`).

---

## Чек-листы влияния

### ➕ Новая раса

| Что править | Где |
|---|---|
| `RaceId`, `RaceTraitId`, эффекты | `types/races.ts` |
| Определение расы: бонусы, relations, среда | `constants/races.ts` |
| **Relations у ВСЕХ существующих рас** (двусторонние) | `constants/races.ts` |
| Спрайт | `public/assets/races.webp` + `components/RaceSprite.tsx` |
| Переводы | `lib/locales/ru.json`, `en.json` |
| Генерация галактики (сектора расы) | `galaxy/generate.ts` |
| Планеты: environmentPreference, `requiredRace` | `constants/planets.ts`, `types/planets.ts` |
| Репутация: стартовые значения | `slices/reputation`, `initial/initialState.ts` |
| Найм экипажа | `slices/crewManagement/utils/hireCrew.ts`, `crew/buildCrewMember.ts` |
| Расовая аугментация | `types/augmentations.ts`, `constants/augmentations.ts` |
| Спец-механика расы (если есть, как merge у ксеноморфов) | `slices/crew`, `types/crew.ts` |
| Вражеские корабли расы | `constants/shipTemplates.ts` |
| Экспедиции: веса тайлов | `slices/locations/helpers/expedition/tileWeights.ts` |
| Контракты (расовые), станции | `contracts/generatePlanetContracts.ts`, `components/station/station-data.ts` |
| Стартовые модификаторы (если завязаны на расу) | `constants/launchModifiers.ts` |
| `canGetSick` — участвует ли раса в кризисах-эпидемиях | `constants/races.ts`, проверяется в `globalCrises.ts` |
| Открытие расы игроком (`knownRaces`) | `components/RaceDiscoveryModal.tsx` |
| Документация | `docs/` (при наличии спец-механики) |

### ➕ Новый тип модуля

| Что править | Где |
|---|---|
| `ModuleType` | `types/modules.ts` |
| Данные по уровням: энергия, HP, защита | `constants/modules.ts` |
| Эффект сращивания ксеноморфа | доки `XENOSYMBIONT_MERGE.md` + хелперы merge |
| Назначения экипажа, привязанные к модулю | `types/crew.ts`, обработчики в `slices/gameLoop/processors/crewAssignments` |
| Пересчёт атрибутов корабля | `slices/ship` |
| Технология-разблокировка (`new_module`) | `constants/research/` |
| Крафт (если гибридный) | `constants/crafting.ts`, `types/crafting.ts` |
| UI схемы корабля, спрайты | `game/components`, `public/assets` |
| Переводы | локали |

### ➕ Новая профессия

- `Profession` в `types/crew.ts`, назначения (мирные/боевые) + их обработчики в `gameLoop/processors/crewAssignments`
- Проф. аугментация (`augmentations.ts`), спрайт `public/assets/professions/`
- Найм/генерация экипажа, шаблоны кораблей, локали, `docs/CREW_ASSIGNMENTS.md`

### ➕ Новая технология

- `TechnologyId` + дерево (`constants/research/tierN.ts`): prerequisites, ресурсы, бонусы
- Если бонус нового типа — `ResearchBonusType` + применение в соответствующем слайсе
- Если открывает модуль/оружие/рецепт — соотв. константы + крафт
- Локали, `docs/RESEARCH_SYSTEM.md`, `TECHNOLOGY_STATUS.md`

### ➕ Новый тип контракта

- `ContractType` (`types/contracts.ts`), генерация (`contracts/`), обработка выполнения (`slices/contracts`)
- Награды: кредиты, репутация (+ каскад по relations), опыт (`constants/experience.ts` — `CONTRACT_REWARDS`)
- Цели победы, если завязаны на контракты; локали

### ✏️ Изменение баланса назначения экипажа

- Формула в обработчике (`gameLoop/processors/crewAssignments/`), описание в `docs/CREW_ASSIGNMENTS.md`
- Проверить: бонусы рас (`crewBonuses`), черты, аугментации и сращивание — все мультипликаторы одного эффекта складываются

### ✏️ Изменение репутации/отношений

- `relations` в `constants/races.ts` двусторонние — менять у обеих рас
- Каскад считается в `slices/reputation`; влияет на цены (`reputation/priceModifier.ts`), контракты, `galactic_coalition`

---

## Правило общего порядка правок

Из `AGENTS.md`: docs → types → constants → slices/helpers → UI → locales → docs → `type-check` + `lint`.
