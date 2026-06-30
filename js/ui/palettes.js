export const PALETTES = [
  {
    id: 'classic',
    name: 'Classic',
    colors: ['#e63946', '#457b9d', '#2a9d8f', '#f4a261', '#9b59b6', '#f1c40f', '#1d3557', '#a8dadc', '#e76f51', '#e9c46a', '#264653', '#ef476f'],
    counts: {
      3: [0, 1, 2],
      4: [0, 1, 2, 3],
      5: [0, 1, 2, 3, 4],
      6: [0, 1, 2, 3, 4, 5],
      7: [0, 1, 2, 3, 4, 5, 6],
      8: [0, 1, 2, 3, 4, 5, 6, 7],
      9: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      10: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      11: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      12: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
    }
  },
  {
    id: 'purple-green',
    name: 'Purple–Green',
    colors: ['#7b3294', '#c2a5cf', '#e7d4e8', '#f7f7f7', '#d9f0d3', '#a6dba0', '#008837'],
    counts: {
      3: [0, 3, 6],
      4: [0, 1, 5, 6],
      5: [0, 1, 3, 5, 6],
      6: [0, 1, 2, 4, 5, 6],
      7: [0, 1, 2, 3, 4, 5, 6]
    }
  },
  {
    id: 'viridis',
    name: 'Viridis',
    colors: ['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#addc30', '#fde725'],
    counts: {
      3: [0, 5, 9],
      4: [0, 3, 6, 9],
      5: [0, 2, 4, 7, 9],
      6: [0, 2, 4, 6, 8, 9],
      7: [0, 1, 3, 4, 6, 8, 9],
      8: [0, 1, 2, 3, 5, 6, 8, 9],
      9: [0, 1, 2, 3, 4, 5, 7, 8, 9],
      10: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    }
  },
  {
    id: 'magma',
    name: 'Magma',
    colors: ['#000004', '#140e36', '#3b0f70', '#6302a1', '#8c2981', '#b73772', '#de4968', '#f16d5e', '#fe9444', '#ffbd22'],
    counts: {
      3: [0, 4, 9],
      4: [0, 3, 6, 9],
      5: [0, 2, 4, 7, 9],
      6: [0, 2, 4, 6, 8, 9],
      7: [0, 1, 3, 4, 6, 8, 9],
      8: [0, 1, 2, 4, 5, 7, 8, 9],
      9: [0, 1, 2, 3, 4, 6, 7, 8, 9],
      10: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    }
  },
  {
    id: 'greyscale',
    name: 'Greyscale',
    colors: ['#111111', '#333333', '#555555', '#777777', '#999999', '#bbbbbb', '#dddddd', '#ffffff'],
    counts: {
      3: [0, 3, 7],
      4: [0, 2, 5, 7],
      5: [0, 1, 3, 5, 7],
      6: [0, 1, 2, 4, 5, 7],
      7: [0, 1, 2, 3, 4, 5, 7],
      8: [0, 1, 2, 3, 4, 5, 6, 7]
    }
  },
  {
    id: 'colorblind',
    name: 'Colorblind-safe',
    colors: ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#000000'],
    counts: {
      3: [0, 1, 2],
      4: [0, 1, 2, 5],
      5: [0, 1, 2, 5, 6],
      6: [0, 1, 2, 3, 5, 6],
      7: [0, 1, 2, 3, 4, 5, 6],
      8: [0, 1, 2, 3, 4, 5, 6, 7]
    }
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: ['#03045e', '#0077b6', '#00b4d8', '#90e0ef', '#caf0f8', '#48cae4', '#023e8a', '#0096c7'],
    counts: {
      3: [0, 2, 4],
      4: [0, 1, 2, 4],
      5: [0, 1, 2, 3, 4],
      6: [0, 1, 2, 3, 5, 6],
      7: [0, 1, 2, 3, 4, 5, 6],
      8: [0, 1, 2, 3, 4, 5, 6, 7]
    }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: ['#582f0e', '#9b2226', '#ae2012', '#bb3e03', '#ca6702', '#ee9b00', '#e9d8a6', '#94d2bd'],
    counts: {
      3: [1, 4, 6],
      4: [1, 3, 5, 7],
      5: [0, 1, 3, 5, 7],
      6: [0, 1, 3, 4, 5, 7],
      7: [0, 1, 2, 3, 4, 5, 7],
      8: [0, 1, 2, 3, 4, 5, 6, 7]
    }
  },
  {
    id: 'earth',
    name: 'Earth',
    colors: ['#606c38', '#283618', '#dda15e', '#bc6c25', '#6b705c', '#a98467', '#cb997e', '#eddcd2'],
    counts: {
      3: [0, 2, 4],
      4: [0, 2, 3, 7],
      5: [0, 1, 2, 3, 4],
      6: [0, 1, 2, 3, 4, 5],
      7: [0, 1, 2, 3, 4, 5, 6],
      8: [0, 1, 2, 3, 4, 5, 6, 7]
    }
  },
  {
    id: 'candy',
    name: 'Candy',
    colors: ['#ff006e', '#8338ec', '#3a86ff', '#fb5607', '#ffbe0b', '#06d6a0', '#118ab2', '#ef476f'],
    counts: {
      3: [0, 2, 4],
      4: [0, 1, 2, 4],
      5: [0, 1, 2, 3, 4],
      6: [0, 1, 2, 3, 4, 5],
      7: [0, 1, 2, 3, 4, 5, 6],
      8: [0, 1, 2, 3, 4, 5, 6, 7]
    }
  },
  {
    id: 'red-blue',
    name: 'Red–Blue',
    colors: ['#b2182b', '#ef8a62', '#fddbc7', '#f7f7f7', '#d1e5f0', '#67a9cf', '#2166ac'],
    counts: {
      3: [0, 3, 6],
      4: [0, 1, 5, 6],
      5: [0, 1, 3, 5, 6],
      6: [0, 1, 2, 4, 5, 6],
      7: [0, 1, 2, 3, 4, 5, 6]
    }
  },
  {
    id: 'neon',
    name: 'Neon',
    colors: ['#ff00ff', '#00ffff', '#ffff00', '#ff3300', '#33ff00', '#3300ff', '#ff6600', '#00ff99'],
    counts: {
      3: [0, 1, 2],
      4: [0, 1, 2, 3],
      5: [0, 1, 2, 3, 4],
      6: [0, 1, 2, 3, 4, 5],
      7: [0, 1, 2, 3, 4, 5, 6],
      8: [0, 1, 2, 3, 4, 5, 6, 7]
    }
  }
];

export function getPalette(id, colorCount) {
  const palette = PALETTES.find(p => p.id === id) || PALETTES[0];
  if (colorCount && palette.counts[colorCount]) {
    return palette.counts[colorCount].map(i => palette.colors[i]);
  }
  // Fallback: take first N colors (or all if no colorCount)
  return palette.colors.slice(0, colorCount || palette.colors.length);
}

export function getColor(paletteId, colorId, colorCount) {
  const palette = getPalette(paletteId, colorCount);
  return palette[colorId % palette.length];
}

export function getPalettesForCount(colorCount) {
  return PALETTES.filter(p => p.counts[colorCount]);
}
