export const palettes = {
  "default-6": [
    "#e63946", // red
    "#457b9d", // blue
    "#2a9d8f", // green
    "#f4a261", // orange
    "#9b59b6", // purple
    "#f1c40f"  // yellow
  ],
  "colorblind-8": [
    "#000000", "#E69F00", "#56B4E9", "#009E73",
    "#F0E442", "#0072B2", "#D55E00", "#CC79A7"
  ],
  "default-10": [
    "#e63946", "#457b9d", "#2a9d8f", "#f4a261", "#9b59b6",
    "#f1c40f", "#1d3557", "#a8dadc", "#457b9d", "#e9c46a"
  ]
};

export function getPalette(id) {
  return palettes[id] || palettes["default-6"];
}

export function getColor(paletteId, colorId) {
  const palette = getPalette(paletteId);
  return palette[colorId % palette.length];
}
