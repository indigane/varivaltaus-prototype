/**
 * Generates a triangular-weave board as a graph.
 *
 * This is a periodic tiling made from small regular hexagons and larger
 * equilateral triangles.  The triangle edge is split into three unit segments,
 * so the visible triangle side is 3x the hexagon side.  Hexagons sit in the
 * woven gaps, with six large triangles surrounding each interior hexagon.
 */
export function generateTriangularWeaveBoard(options) {
  const { cols, rows, tileSize: side, colorCount, rng } = options;
  const ratio = 3;
  const period = 6;
  const targetWidth = Math.max(cols, 1) * ratio * side;
  const targetHeight = Math.max(rows, 1) * ratio * Math.sqrt(3) * side / 2;
  const pad = 4;
  const cropMarginX = period * side / 2;
  const cropMarginY = period * Math.sqrt(3) * side / 4;

  // One 6x6 axial-lattice repeat.  Coordinates are on a unit triangular grid;
  // H is a regular hexagon of side 1, Tup/Tdn are equilateral triangles of
  // side 3 whose boundary is subdivided into unit segments.
  const motif = [
    ['Tdn', 2, 2], ['Tup', 1, 5], ['H', 0, 2],
    ['Tdn', 4, 4], ['Tup', 5, 3], ['Tdn', 0, 0],
    ['H', 2, 4], ['H', 4, 0], ['Tup', 3, 1]
  ];

  const rawTiles = [];
  const repeatMinY = -pad;
  const repeatMaxY = Math.ceil(rows / 2) + pad;
  const shearPad = Math.ceil(Math.max(0, repeatMaxY * period) / (2 * period)) + 2;
  const reverseShearPad = Math.ceil(Math.max(0, -repeatMinY * period) / (2 * period)) + 2;
  const repeatMinX = -pad - shearPad;
  const repeatMaxX = Math.ceil(cols / 2) + pad + reverseShearPad;

  for (let ry = repeatMinY; ry <= repeatMaxY; ry++) {
    for (let rx = repeatMinX; rx <= repeatMaxX; rx++) {
      const offsetI = rx * period;
      const offsetJ = ry * period;
      for (const [kind, i0, j0] of motif) {
        const i = i0 + offsetI;
        const j = j0 + offsetJ;
        if (kind === 'H') {
          addRawTile('hex', hexVertexKeys(i, j));
        } else if (kind === 'Tup') {
          addRawTile('triangle-up', subdividedTriangleKeys([
            [i, j], [i + ratio, j], [i, j + ratio]
          ]));
        } else {
          addRawTile('triangle-down', subdividedTriangleKeys([
            [i + ratio, j + ratio], [i, j + ratio], [i + ratio, j]
          ]));
        }
      }
    }
  }

  const cropped = rawTiles
    .map(tile => ({ ...tile, centroid: averagePoint(tile.points) }))
    .filter(tile => (
      tile.centroid[0] >= -cropMarginX && tile.centroid[0] <= targetWidth + cropMarginX &&
      tile.centroid[1] >= -cropMarginY && tile.centroid[1] <= targetHeight + cropMarginY
    ))
    .sort((a, b) => {
      if (Math.abs(a.centroid[1] - b.centroid[1]) > 1e-6) return a.centroid[1] - b.centroid[1];
      return a.centroid[0] - b.centroid[0];
    });

  const tiles = cropped.map((tile, id) => ({
    id,
    type: tile.type,
    colorId: Math.floor(rng() * colorCount),
    ownerId: null,
    points: tile.points.map(point => [...point]),
    neighbors: []
  }));

  const neighborSets = tiles.map(() => new Set());
  const edgeToTiles = new Map();
  cropped.forEach((tile, tileId) => {
    for (let i = 0; i < tile.vertexKeys.length; i++) {
      const a = tile.vertexKeys[i];
      const b = tile.vertexKeys[(i + 1) % tile.vertexKeys.length];
      const key = canonicalPairKey(a, b);
      if (!edgeToTiles.has(key)) edgeToTiles.set(key, []);
      edgeToTiles.get(key).push(tileId);
    }
  });

  for (const tileIds of edgeToTiles.values()) {
    if (tileIds.length < 2) continue;
    for (let i = 0; i < tileIds.length; i++) {
      for (let j = i + 1; j < tileIds.length; j++) {
        const a = tileIds[i];
        const b = tileIds[j];
        if (a !== b) {
          neighborSets[a].add(b);
          neighborSets[b].add(a);
        }
      }
    }
  }

  tiles.forEach((tile, id) => {
    tile.neighbors = [...neighborSets[id]].sort((a, b) => a - b);
  });

  let bbox = computeBoundingBox(tiles);
  for (const tile of tiles) {
    tile.points = tile.points.map(([x, y]) => [x - bbox.minX, y - bbox.minY]);
  }
  bbox = computeBoundingBox(tiles);

  const startTileIds = uniqueIds([
    closestTileId(tiles, 0, 0),
    closestTileId(tiles, bbox.maxX, bbox.maxY),
    closestTileId(tiles, bbox.maxX, 0),
    closestTileId(tiles, 0, bbox.maxY)
  ]);

  return {
    version: 1,
    generator: 'triangular-weave',
    width: bbox.maxX,
    height: bbox.maxY,
    cols,
    rows,
    tiles,
    startTileIds
  };

  function addRawTile(type, vertexKeys) {
    rawTiles.push({
      type,
      vertexKeys,
      points: vertexKeys.map(key => latticePointFromKey(key, side))
    });
  }
}

function hexVertexKeys(i, j) {
  return [
    [i + 1, j],
    [i, j + 1],
    [i - 1, j + 1],
    [i - 1, j],
    [i, j - 1],
    [i + 1, j - 1]
  ].map(latticeKey);
}

function subdividedTriangleKeys(corners) {
  const keys = [];
  for (let sideIdx = 0; sideIdx < corners.length; sideIdx++) {
    const [ai, aj] = corners[sideIdx];
    const [bi, bj] = corners[(sideIdx + 1) % corners.length];
    const stepI = Math.sign(bi - ai);
    const stepJ = Math.sign(bj - aj);
    const steps = Math.max(Math.abs(bi - ai), Math.abs(bj - aj));
    for (let step = 0; step < steps; step++) {
      keys.push(latticeKey([ai + step * stepI, aj + step * stepJ]));
    }
  }
  return keys;
}

function latticeKey([i, j]) {
  return `${i},${j}`;
}

function latticePointFromKey(key, side) {
  const [i, j] = key.split(',').map(Number);
  return [side * (i + j / 2), side * Math.sqrt(3) * j / 2];
}

function canonicalPairKey(a, b) {
  return a < b ? `${a}~${b}` : `${b}~${a}`;
}

function averagePoint(points) {
  const sum = points.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}

function computeBoundingBox(tiles) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const tile of tiles) {
    for (const [x, y] of tile.points) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return { minX, minY, maxX, maxY };
}

function closestTileId(tiles, tx, ty) {
  let bestId = tiles[0]?.id ?? 0;
  let bestDist = Infinity;
  for (const tile of tiles) {
    const [cx, cy] = averagePoint(tile.points);
    const dist = (cx - tx) ** 2 + (cy - ty) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestId = tile.id;
    }
  }
  return bestId;
}

function uniqueIds(ids) {
  return [...new Set(ids.filter(id => Number.isInteger(id)))];
}
