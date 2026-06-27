# Game logic tests

Use a simple browser-based test runner. No npm.

## Recommended structure

```text
js/tests/test-runner.js
js/tests/game-tests.js
js/tests/tiling-tests.js
```

`test-runner.js` can expose:

```js
export function test(name, fn) {}
export function assert(condition, message) {}
export function assertEqual(actual, expected, message) {}
```

## Test cases

### Move legality

- current player can make legal move,
- non-current player cannot move,
- illegal color is rejected,
- game-over move is rejected.

### Capture

- owned territory recolors,
- adjacent neutral matching color is captured,
- non-matching neutral is not captured,
- enemy capture obeys `captureMode`.

### Turn order

- turn advances to next alive player,
- bots do not skip turn order,
- fixed-turn counter increments.

### Teams

- team score equals sum of member scores,
- players on same team can be displayed together,
- team win condition works if implemented.

### Win conditions

- fixed turn game ends at max turns,
- most tiles winner is correct,
- ties are allowed.
