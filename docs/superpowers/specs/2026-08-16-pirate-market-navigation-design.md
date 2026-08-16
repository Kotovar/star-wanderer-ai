# Pirate Market Navigation and Board Cadence — Design

## Goal

Make pirate-station jobs truthful, make the black market discoverable through the existing navigator, and stop pirate boards from becoming a fast contract reroll.

## Scope

### Heist wording

A heist always succeeds when the player spends a probe at its target station. It does not contain an escape roll or a hidden failure path.

- Replace the promise to “get away unnoticed” with the real action and consequence: breach the target with a probe and gain `+15` wanted heat.
- Keep the existing objective-complete and return-to-issuer states unchanged.
- Localize the revised description in Russian and English.

### Black-market search

Extend the existing `Trade` navigator category instead of adding a parallel category.

- Add a `blackMarketOnly` trade filter labelled `Только чёрный рынок` / `Black markets only`.
- Return only known pirate stations. A scanned, identified station can be listed, but its prices remain unknown until the player has visited it and the normal station-price data is available.
- Mark matching results as `Чёрный рынок` / `Black market`.
- For a selected good, show the station prices used by the market: crisis-adjusted normal prices for ordinary goods and the black-market contraband buy/sell calculation for contraband. Pirate stations do not apply race-reputation price modifiers; personal crew sell modifiers remain local transaction effects.
- Preserve all existing filters, cargo sorting, map marking, and the rule that navigator filters never perform a trade.

Ordinary goods remain available at pirate stations. Their `0.75` base price multiplier makes them a useful low-price source, but station price variation means a pirate market is not guaranteed to be the cheapest point in the galaxy.

### Black-market trade controls

Give each pirate-market row the same batch controls as a normal trade row:

- Buy `+1`, `+5`, and `+15`; sell `−15`, `−5`, and `−1`.
- Disable `+15` when space, credits, or stock are below the full 15-ton requirement, and disable `−15` when the hold has fewer than 15 tons.
- Reuse the existing buy/sell actions and price calculations; no special transaction path is introduced.

### Pirate-board cadence

Set the shared pirate-contract refresh interval to **50 turns**.

- A board is regenerated only when the player next opens its pirate station at least 50 turns after its last refresh.
- There is no manual reroll control.
- Accepted pirate jobs remain active and continue to be shown at their issuer after the offer board refreshes.
- Deadlines, rewards, heat changes, and the number of simultaneously active pirate jobs do not change in this slice.

## Non-goals

- No random chance to fail a heist or leave it unnoticed.
- No revelation of unscanned station types, prices, stock, or black-market locations.
- No new navigator section, map icon, economy multiplier, task-reward rebalance, or active-job cap.

## Implementation boundaries

- `src/game/contracts/formatContractDescription.ts` and both locale catalogs own the heist copy.
- `src/game/types/navigator.ts`, `src/game/navigator/search.ts`, and `NavigatorPanel.tsx` own the filter, search projection, black-market result marker, and price display.
- `PirateTab.tsx` owns the extra batch controls; the existing trade helpers remain the transaction authority.
- `src/game/slices/pirate/contracts.ts` owns the named 50-turn refresh interval, with `createPirateSlice.ts` continuing to call it on station entry.
- `docs/PIRATE_STATIONS.md` records the new cadence and the truthful heist consequence.

## Verification

- Extend the navigator assertion script with a known pirate station: the black-market filter excludes ordinary stations, preserves unknown-price behavior, and uses the contraband black-market price pair without reputation modifiers.
- Extend pirate gameplay assertions: refresh at turn 49 is rejected, refresh at turn 50 succeeds, and accepted jobs remain turn-in-able after a board refresh.
- Extend contract-label assertions for the revised heist copy and localized black-market filter/marker.
- Run the focused checks, `npm run type-check`, `npm run lint`, `npm run build`, and `git diff --check`.
