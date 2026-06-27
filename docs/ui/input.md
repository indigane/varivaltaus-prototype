# Input

The first prototype can use simple buttons for colors.

## Color move input

Color buttons call:

```js
onChooseColor(colorId)
```

Controller flow:

```text
1. User clicks color button.
2. Check current player is human.
3. Check move is legal.
4. Apply move.
5. Render.
6. If next player is bot, schedule bot move.
```

## Canvas input

Canvas input is useful for:

- showing tile info,
- selecting starting positions later,
- map editor later.

Do not require clicking tiles for normal color-choice gameplay.

## Hot-seat

For local hot-seat:

- show current player,
- show current team,
- hide no information for prototype unless desired,
- allow bots to auto-play.

## Bot autoplay

Use a small delay between bot moves so humans can see what happened.

Do not use infinite tight loops for bot-vs-bot.
