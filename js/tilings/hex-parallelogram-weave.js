/**
 * Generates a hex-parallelogram weave board as a graph.
 *
 * The tiling is built on a unit triangular lattice.  It combines side-1
 * equilateral triangles, side-2 regular hexagons, and skinny parallelograms
 * whose long sides are 4 unit segments and short sides are 1 unit segment.
 * The longer edges are subdivided at unit intervals so graph neighbors can be
 * matched across partial edges.
 */
export function generateHexParallelogramWeaveBoard(options) {
  const { cols, rows, tileSize: side, colorCount, rng } = options;
  const periodI = 10;
  const periodJ = 5;
  const targetWidth = Math.max(cols, 1) * 3.2 * side;
  const targetHeight = Math.max(rows, 1) * Math.sqrt(3) * side;
  const pad = 4;
  const cropMarginX = periodI * side / 2;
  const cropMarginY = periodJ * Math.sqrt(3) * side / 4;

  const motif = [
    { kind: 'hex', i: 0, j: 2 },
    { kind: 'parallelogram', i: 3, j: 0, longDir: [1, 0], shortDir: [-1, 1] },
    { kind: 'parallelogram', i: 4, j: 1, longDir: [0, 1], shortDir: [1, 0] },
    { kind: 'triangle-up', i: 3, j: 4 },
    { kind: 'parallelogram', i: 0, j: 1, longDir: [1, 0], shortDir: [0, 1] },
    { kind: 'parallelogram', i: 1, j: 2, longDir: [-1, 1], shortDir: [1, 0] },
    { kind: 'triangle-down', i: 0, j: 2 },
    { kind: 'parallelogram', i: 9, j: 0, longDir: [0, 1], shortDir: [1, -1] },
    { kind: 'parallelogram', i: 9, j: 3, longDir: [-1, 1], shortDir: [0, 1] },
    { kind: 'triangle-up', i: 8, j: 0 },
    { kind: 'triangle-down', i: 5, j: 1 },
    { kind: 'hex', i: 5, j: 1 }
  ];

  const rawTiles = [];
  const repeatMinY = -pad;
  const repeatMaxY = Math.ceil(targetHeight / (periodJ * Math.sqrt(3) * side / 2)) + pad;
  const shearPad = Math.ceil(Math.max(0, repeatMaxY * periodJ) / (2 * periodI)) + 2;
  const reverseShearPad = Math.ceil(Math.max(0, -repeatMinY * periodJ) / (2 * periodI)) + 2;
  const repeatMinX = -pad - shearPad;
  const repeatMaxX = Math.ceil(targetWidth / (periodI * side)) + pad + reverseShearPad;

  for (let ry = repeatMinY; ry <= repeatMaxY; ry++) {
    for (let rx = repeatMinX; rx <= repeatMaxX; rx++) {
      const offsetI = rx * periodI;
      const offsetJ = ry * periodJ;
      for (const tile of motif) {
        const i = tile.i + offsetI;
        const j = tile.j + offsetJ;
        if (tile.kind === 'hex') {
          addRawTile('hex', hexVertexKeys(i, j));
        } else if (tile.kind === 'parallelogram') {
          addRawTile('parallelogram', parallelogramVertexKeys(i, j, tile.longDir, tile.shortDir));
        } else if (tile.kind === 'triangle-up') {
          addRawTile('triangle-up', smallTriangleVertexKeys('U', i, j));
        } else {
          addRawTile('triangle-down', smallTriangleVertexKeys('D', i, j));
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
    generator: 'hex-parallelogram-weave',
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
  return subdividedPolygonKeys([
    [i + 2, j],
    [i + 4, j],
    [i + 4, j + 2],
    [i + 2, j + 4],
    [i, j + 4],
    [i, j + 2]
  ]);
}

function parallelogramVertexKeys(i, j, longDir, shortDir) {
  const longI = longDir[0] * 4;
  const longJ = longDir[1] * 4;
  const shortI = shortDir[0];
  const shortJ = shortDir[1];
  return subdividedPolygonKeys([
    [i, j],
    [i + longI, j + longJ],
    [i + longI + shortI, j + longJ + shortJ],
    [i + shortI, j + shortJ]
  ]);
}

function smallTriangleVertexKeys(kind, i, j) {
  const vertices = kind === 'D'
    ? [[i, j], [i + 1, j], [i, j + 1]]
    : [[i + 1, j + 1], [i, j + 1], [i + 1, j]];
  return vertices.map(([vi, vj]) => latticeKey(vi, vj));
}

function subdividedPolygonKeys(corners) {
  const keys = [];
  for (let sideIdx = 0; sideIdx < corners.length; sideIdx++) {
    const [ai, aj] = corners[sideIdx];
    const [bi, bj] = corners[(sideIdx + 1) % corners.length];
    const steps = Math.max(Math.abs(bi - ai), Math.abs(bj - aj));
    const stepI = (bi - ai) / steps;
    const stepJ = (bj - aj) / steps;
    for (let step = 0; step < steps; step++) {
      keys.push(latticeKey(ai + step * stepI, aj + step * stepJ));
    }
  }
  return keys;
}

function latticeKey(i, j) {
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
