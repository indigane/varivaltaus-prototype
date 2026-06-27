# Palettes

Separate logical colors from visual colors.

## Logical color

A tile stores:

```js
tile.colorId = 3;
```

## Visual palette

The renderer maps `colorId` to CSS color:

```js
const palette = ["#e63946", "#457b9d", "#2a9d8f"];
```

## Requirements

- Support any number of logical colors.
- Support switching palettes without changing game state.
- Include a colorblind-friendly palette.
- Include a high-contrast palette for mobile/tablet playtests.
- Include a debug palette with many distinct colors.

## Suggested palettes

```js
const palettes = {
  "default-6": [...],
  "colorblind-8": [...],
  "pastel-10": [...],
  "high-contrast-12": [...],
  "debug-20": [...]
};
```

## UI behavior

If a selected palette has fewer visual colors than `colorCount`, either:

- prevent choosing that palette, or
- generate fallback HSL colors.

Simpler prototype rule: only list compatible palettes.
