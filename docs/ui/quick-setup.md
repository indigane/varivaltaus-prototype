# Quick setup (index.html) vs. advanced setup (advanced.html)

`index.html` is the player-facing setup screen: six presets, three coarse
knobs (Players, Game length, Board), a one-line summary, and a collapsed
**Advanced settings** disclosure that contains the complete original form.

`advanced.html` is the original full-control setup screen, preserved verbatim
for research and tuning. Both pages load the same `js/main.js`.

## How it works

- The advanced form (same element IDs as before) is the single source of
  truth; `handleStart()` in `js/main.js` is unchanged.
- `js/ui/quick-setup.js` translates presets/knobs into form values
  (`applyToForm`) and reads them back (`syncFromForm`) so the knobs reflect
  edits made in the advanced panel. Any direct edit that no longer matches a
  preset shows a **Custom** badge.
- `initQuickSetup()` is a no-op on pages without `#quick-setup`.

## Mappings (from research/)

| Knob | Values |
|---|---|
| Bot skill | Easy = random, Normal = greedy, Hard = hybrid |
| Length | Quick 14×14 / 5 colors · Normal 20×20 / 6 · Long 30×30 / 8 (masked shapes use size 18 / 26 / 38) |
| Board | Classic = square · Hex = hex · Organic = voronoi-jittered · Exotic = random pick from `EXOTIC_TILINGS`, re-rolled on every start |
| Teams | 2 teams, alternating seats, merged territory |

Baked-in fairness defaults: snake turn order for 3+ players, `notAnyPlayerColor`,
starting area 3, starting buffer on, no shared start colors.
