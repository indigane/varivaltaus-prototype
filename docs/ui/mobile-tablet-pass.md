# Mobile and tablet playtest pass

Not required for first iteration, but useful for second iteration.

## Goals

- Playable on tablet browser.
- Playable on mobile browser.
- Large enough buttons for color selection.
- Canvas scales to screen.
- No hover-only controls.

## Layout recommendations

Desktop:

```text
setup/sidebar | canvas | scores
```

Mobile:

```text
canvas
current player + scores
large color buttons
setup collapsed below or hidden during game
```

## Input

Use pointer events if possible.

Avoid needing keyboard shortcuts.

## Performance

For mobile playtests:

- use smaller default boards,
- avoid expensive animations,
- redraw only after moves if possible,
- keep bot delay visible but not slow.
