# Pre-Spacefaring Contact Summary Design

## Goal

Make the local-contact choices understandable: show the immediate cost and reward before a player confirms an action, then preserve and display a truthful summary after the third action.

## Scope

- Add an optional `actionHistory?: string[]` to `PreSpacefaringContact`.
- Append the validated catalog action ID only after each successful contact action.
- In `PreSpacefaringContactCard`, show each available action's cargo cost (when present), research reward, and one-turn cost.
- After completion, show the selected action labels, per-action effects, aggregate cargo spent, aggregate research received, and turns spent.
- State explicitly that the outcome is a local story outcome, not an ongoing economic or faction bonus; the discovered settlement still prevents a base on that planet.
- For pre-existing contacts with no history, show the outcome plus an honest notice that earlier decisions and exact totals were not recorded.

## Data and Compatibility

Action IDs are validated against the static civilization catalog before mutation, so persisting their strings adds no new source of truth. The field is optional: no save migration or state-version change is needed, and old saves remain readable. No history is inferred for older contacts because their middle contact decision cannot be recovered reliably.

## UI

The existing local-contact card remains the only surface. It receives compact cost/reward metadata below active buttons, and a completed-contact block with a chronological decision list and a summed balance. Resource and cargo names reuse existing translation families; new Russian and English keys cover only summary labels and the legacy-history explanation.

## Verification

The focused civilization script will prove that three successful actions persist their IDs in order and that invalid actions do not append history. It will also ensure the card source includes the summary and legacy-history paths. Type-check and lint remain required.
