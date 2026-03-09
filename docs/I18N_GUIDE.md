# I18n Translation Guide for Star Wanderer AI

## Overview
This project now supports Russian and English languages with a language switcher button in the header.

## What's Already Done

### Core Infrastructure
- ✅ i18next library installed and configured
- ✅ Translation files created (`src/lib/locales/ru.json` and `src/lib/locales/en.json`)
- ✅ Custom `useTranslation` hook created (`src/lib/useTranslation.ts`)
- ✅ Language switcher button added to the header
- ✅ Main page (`src/app/page.tsx`) updated with translations
- ✅ Header component (`src/game/components/header/Header.tsx`) updated with translations
- ✅ ShipGrid component (`src/game/components/ShipGrid.tsx`) updated with translations

### Translation Files Structure
The translation files are organized by feature:
- `game` - General game UI (title, turn, sector, etc.)
- `ship` - Ship-related UI (accordion titles, module movement, etc.)
- `crew` - Crew-related text (stats, assignments, etc.)
- `modules` - Module descriptions and stats
- `ship_stats` - Ship statistics labels
- `header` - Header button tooltips
- `professions` - Profession names
- `races` - Race information
- `combat_actions` - Combat action labels
- `crew_actions` - Crew action labels
- `battle` - Battle results
- `storm` - Storm event text
- `language` - Language switcher labels

## How to Add Translations to New Components

### Step 1: Import the Hook
```typescript
import { useTranslation } from "@/lib/useTranslation";
```

### Step 2: Initialize in Component
```typescript
export function MyComponent() {
    const { t } = useTranslation();
    
    // Use t() for translations
    return <div>{t('game.title')}</div>;
}
```

### Step 3: Add Translation Keys
Add your translation keys to both `src/lib/locales/ru.json` and `src/lib/locales/en.json`:

```json
{
    "my_component": {
        "title": "Заголовок",
        "description": "Описание"
    }
}
```

### Step 4: Use in JSX
```typescript
<div>
    <h1>{t('my_component.title')}</h1>
    <p>{t('my_component.description')}</p>
</div>
```

## Components That Need Translation Updates

### High Priority (Main UI)
1. **src/game/components/CrewList.tsx** - Crew member cards and details
2. **src/game/components/ModuleList.tsx** - Module list and details
3. **src/game/components/ShipStats.tsx** - Ship statistics panel
4. **src/game/components/GameLog.tsx** - Game log entries

### Medium Priority (Game Features)
5. **src/game/components/station/StationPanel.tsx** - Station interface
6. **src/game/components/SectorMap.tsx** - Sector map labels
7. **src/game/components/GalaxyMap.tsx** - Galaxy map UI
8. **src/game/components/ContractsList.tsx** - Contract information
9. **src/game/components/CargoDisplay.tsx** - Cargo display

### Event Panels
10. **src/game/components/EventPanels.tsx** - Event display
11. **src/game/components/BattleResultsPanel.tsx** - Battle results
12. **src/game/components/StormPanel.tsx** - Storm events
13. **src/game/components/TradePanel.tsx** - Trading interface
14. **src/game/components/CombatPanel.tsx** - Combat interface

### Station Tabs
15. **src/game/components/station/ShopTab.tsx** - Shop interface
16. **src/game/components/station/TradeTab.tsx** - Trade interface
17. **src/game/components/station/CrewTab.tsx** - Crew management
18. **src/game/components/station/ServicesTab.tsx** - Services

## Pattern for Constants Files

For constants that contain translatable text, create helper functions:

```typescript
// src/lib/translationHelpers.ts
import i18n from './i18n';

export function getProfessionName(profession: string): string {
    const translations: Record<string, string> = {
        pilot: i18n.t('professions.pilot'),
        engineer: i18n.t('professions.engineer'),
        // ...
    };
    return translations[profession] || profession;
}
```

## Language Switcher

The language switcher is already implemented in the header. It:
- Shows current language (RU/EN)
- Toggles between Russian and English
- Saves preference to localStorage
- Persists across page reloads

## Testing

1. Start the dev server: `npm run dev`
2. Click the language switcher button (🌐) in the header
3. Verify translations appear correctly
4. Reload page to confirm language persists

## Tips

1. **Use descriptive keys**: `ship.modules.title` is better than `s.m.t`
2. **Keep both files in sync**: When adding a new key, add it to both ru.json and en.json
3. **Use interpolation for variables**: `"greeting": "Hello, {{name}}!"`
4. **Test both languages**: Always check that both Russian and English work
5. **Context matters**: Group translations by feature/component

## Common Patterns

### Conditional Text
```typescript
<span>{moduleMovedThisTurn && t('ship.locked')}</span>
```

### Dynamic Values
```typescript
<div>{t('game.turn')}: {turn}</div>
```

### Tooltips
```typescript
<button title={t('header.tooltip_restart')}>
```

### Dialog Content
```typescript
<DialogTitle>{t('ship.confirm_restart_title')}</DialogTitle>
<DialogDescription>{t('ship.confirm_restart_desc')}</DialogDescription>
```

## Need Help?

If you need to add new translation keys or update existing ones:
1. Add the key to both `ru.json` and `en.json`
2. Use the `t()` function in your component
3. Test in both languages

## Example: Translating a New Component

Here's a complete example of adding translations to a new component:

**Before:**
```typescript
export function CargoDisplay() {
    const cargo = useGameStore((s) => s.cargo);
    
    return (
        <div>
            <h2>Грузовой отсек</h2>
            <div>Вес: {cargo.weight}т</div>
        </div>
    );
}
```

**After:**
```typescript
import { useTranslation } from "@/lib/useTranslation";

export function CargoDisplay() {
    const { t } = useTranslation();
    const cargo = useGameStore((s) => s.cargo);
    
    return (
        <div>
            <h2>{t('ship.cargo')}</h2>
            <div>{t('cargo.weight')}: {cargo.weight}т</div>
        </div>
    );
}
```

**Add to ru.json:**
```json
{
    "cargo": {
        "weight": "Вес"
    }
}
```

**Add to en.json:**
```json
{
    "cargo": {
        "weight": "Weight"
    }
}
```
