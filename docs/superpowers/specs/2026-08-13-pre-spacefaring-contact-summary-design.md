# Pre-Spacefaring Contact Summary Design

## Goal

Make the local-contact choices understandable: show the immediate cost and reward before a player confirms an action, then preserve and display a truthful summary after the third action.

## Scope

- Add an optional `actionHistory?: string[]` to `PreSpacefaringContact`.
- Give newly discovered contacts an empty history, then append the validated catalog action ID after each successful contact action.
- In `PreSpacefaringContactCard`, show each available action's cargo cost (when present), research reward, and one-turn cost.
- After completion, show the selected action labels, per-action effects, aggregate cargo spent, aggregate research received, and turns spent.
- State explicitly that the outcome is a local story outcome, not an ongoing economic or faction bonus; the discovered settlement still prevents a base on that planet.
- For pre-existing contacts with no history, show the outcome plus an honest notice that earlier decisions and exact totals were not recorded.

## Data and Compatibility

Action IDs are validated against the static civilization catalog before mutation, so persisting their strings adds no new source of truth. Newly discovered contacts start with `actionHistory: []`; only those contacts append IDs. The field is optional: no save migration or state-version change is needed, and older saves remain readable. Older in-progress and completed contacts keep an absent field rather than accumulating a partial history, because their earlier decisions cannot be recovered reliably.

## UI

The existing local-contact card remains the only surface. It receives compact cost/reward metadata below active buttons, and a completed-contact block with a chronological decision list and a summed balance. Resource and cargo names reuse existing translation families; new Russian and English keys cover only summary labels and the legacy-history explanation.

## Verification

The focused civilization script will prove that discovery initializes a new history, three successful actions persist IDs in order, and invalid or legacy actions do not append history. It will also ensure the card source includes the summary and legacy-history paths. Type-check and lint remain required.
