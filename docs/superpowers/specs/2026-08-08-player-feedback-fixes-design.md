# Player Feedback Fixes Design

## Scope

Fix six related live-play issues without changing crisis balance, mining rewards,
contract rewards, or expedition generation:

1. Recurring crisis effects must not open an error toast every turn.
2. Asteroid-mining research rewards must show one resource icon.
3. Asteroid-mining cargo warnings must show one warning icon.
4. The Russian crisis stage `Эскалация` must be renamed to `Обострение`.
5. Delivery cargo names on friendly ships must use the locale catalog.
6. Aborting an expedition must leave the planet available for another attempt.

## Confirmed Causes

- `addLog(..., "error")` also calls `toast.error`. Routine raider, solar-flare,
  and epidemic turn effects currently use this severity.
- Mining reward labels and cargo-warning strings already contain their own icon,
  while `AsteroidBeltPanel` and `game_logs.mineAsteroid_7` prepend another one.
- The stage label comes from `crisis_panel.stage.stages.escalation.name`.
- `FriendlyShipPanel` renders `c.cargo` directly instead of resolving
  `delivery_goods.<cargo-id>`.
- The abort confirmation calls `endExpedition()`. That action grants rewards and
  experience and always writes `expeditionCompleted: true`.

## Design

### Crisis feedback

Routine per-turn consequence messages remain in the journal but use `warning`,
so they no longer create an error toast. One-off events remain `error`: crisis
start/stage transitions and a newly infected crew member are still prominent.
No toast-deduplication state is added.

The Russian display name for the second stage becomes `Обострение`. Stage IDs,
thresholds, multipliers, and English copy remain unchanged.

### Mining feedback

Research reward labels continue to own the resource-specific icon, such as `💠`
for quantum crystals. Generic `💎` prefixes are removed from the mined-results
row and its journal template.

Cargo-warning strings continue to own `⚠️`; the result panel stops adding a
second warning glyph. Reward amounts and cargo allocation are unchanged.

### Delivery cargo localization

`FriendlyShipPanel` resolves a delivery cargo ID through the existing
`delivery_goods.<cargo-id>` entries in both locale catalogs. The persisted
contract value remains the stable cargo ID.

### Expedition abort lifecycle

The location slice exposes an explicit `abortExpedition` action. Both public
actions delegate to one outcome-aware expedition finalizer:

- `endExpedition` applies rewards and experience, applies the existing fatigue
  and morale consequences, spends one turn, and marks the planet completed.
- `abortExpedition` discards pending rewards and experience, applies the same
  existing fatigue and morale consequences, spends one turn, clears the active
  expedition, and does not set `expeditionCompleted`.

The abort path receives its own localized journal message. After crew fatigue
expires, or with another eligible crew, the same planet can start a new
expedition. No save migration is needed because no persisted field is added or
reinterpreted.

## Verification

Add failing regression coverage before production changes:

- crisis checks verify routine turn messages do not use error severity and the
  Russian stage label is `Обострение`;
- player-feedback checks verify mining and friendly-ship rendering use exactly
  one icon and a localized delivery-good key;
- an expedition behavior check verifies abort clears the active expedition,
  does not grant rewards or mark the planet completed, and still applies the
  existing crew consequences.

Run the targeted checks, `npm run type-check`, `npm run lint`, and
`git diff --check` after implementation.
