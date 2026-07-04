/**
 * Generates a two-triangle weave board as a graph.
 *
 * The tiling is built on a unit triangular lattice.  It uses small
 * equilateral triangles with side length 1 and larger equilateral triangles
 * with side length 2.  The larger triangle sides are represented as two unit
 * edge segments so they can border either another large triangle or two small
 * triangles while preserving accurate graph neighbors.
 */
export function generateTwoTriangleWeaveBoard(options) {
  const { cols, rows, tileSize: side, colorCount, rng } = options;
  const periodI = 6;
  const periodJ = 3;
  const targetWidth = Math.max(cols, 1) * 2 * side;
  const targetHeight = Math.max(rows, 1) * Math.sqrt(3) * side;
  const pad = 5;

  const rawTiles = [];
  const coveredCells = new Set();

  function addLarge(kind, i, j) {
    const cellKeys = largeTriangleCellKeys(kind, i, j);
    if (cellKeys.some(key => coveredCells.has(key))) return;
    const vertexKeys = largeTriangleVertexKeys(kind, i, j);
    addRawTile(`large-${kind === 'U' ? 'up' : 'down'}`, vertexKeys);
    cellKeys.forEach(key => coveredCells.add(key));
  }

  const repeatMinY = -pad;
  const repeatMaxY = Math.ceil(rows * 2 / periodJ) + pad;
  const shearPad = Math.ceil(Math.max(0, repeatMaxY * periodJ) / (2 * periodI)) + 2;
  const reverseShearPad = Math.ceil(Math.max(0, -repeatMinY * periodJ) / (2 * periodI)) + 2;
  const repeatMinX = -pad - shearPad;
  const repeatMaxX = Math.ceil(cols * 2 / periodI) + pad + reverseShearPad;

  // A periodic 6-by-3 triangular-lattice motif.  Most cells are grouped
  // into side-2 triangles; the uncovered cells become isolated side-1
  // triangles, matching the two-size triangular weave.
  const motif = [
    ['U', 3, 0],
    ['D', 5, 0],
    ['D', 1, 1],
    ['U', 5, 1],
    ['U', 0, 2],
    ['D', 2, 2],
    ['U', 2, 2],
    ['D', 4, 2]
  ];

  for (let ry = repeatMinY; ry <= repeatMaxY; ry++) {
    for (let rx = repeatMinX; rx <= repeatMaxX; rx++) {
      const offsetI = rx * periodI;
      const offsetJ = ry * periodJ;
      for (const [kind, i0, j0] of motif) {
        addLarge(kind, i0 + offsetI, j0 + offsetJ);
      }
    }
  }

  const maxJ = Math.ceil(targetHeight / (Math.sqrt(3) * side / 2)) + pad;
  const maxI = Math.ceil(targetWidth / side) + pad + maxJ;
  for (let j = -pad; j <= maxJ; j++) {
    for (let i = -pad - Math.ceil(j / 2); i <= maxI; i++) {
      for (const kind of ['D', 'U']) {
        const key = unitCellKey(kind, i, j);
        if (coveredCells.has(key)) continue;
        const vertexKeys = smallTriangleVertexKeys(kind, i, j);
        const points = vertexKeys.map(k => latticePointFromKey(k, side));
        const centroid = averagePoint(points);
        if (centroid[0] < -2 * side || centroid[0] > targetWidth + 2 * side ||
            centroid[1] < -2 * side || centroid[1] > targetHeight + 2 * side) {
          continue;
        }
        addRawTile(`small-${kind === 'U' ? 'up' : 'down'}`, vertexKeys);
      }
    }
  }

  const cropped = rawTiles
    .map(tile => ({ ...tile, centroid: averagePoint(tile.points) }))
    .filter(tile => (
      tile.centroid[0] >= 0 && tile.centroid[0] <= targetWidth &&
      tile.centroid[1] >= 0 && tile.centroid[1] <= targetHeight
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
    generator: 'two-triangle-weave',
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

function smallTriangleVertexKeys(kind, i, j) {
  const vertices = kind === 'D'
    ? [[i, j], [i + 1, j], [i, j + 1]]
    : [[i + 1, j + 1], [i, j + 1], [i + 1, j]];
  return vertices.map(([vi, vj]) => latticeKey(vi, vj));
}

function largeTriangleVertexKeys(kind, i, j) {
  const corners = kind === 'D'
    ? [[i, j], [i + 2, j], [i, j + 2]]
    : [[i + 2, j + 2], [i, j + 2], [i + 2, j]];
  return subdividedTriangleKeys(corners);
}

function largeTriangleCellKeys(kind, i, j) {
  if (kind === 'D') {
    return [
      unitCellKey('D', i, j),
      unitCellKey('D', i + 1, j),
      unitCellKey('D', i, j + 1),
      unitCellKey('U', i, j)
    ];
  }
  return [
    unitCellKey('D', i + 1, j + 1),
    unitCellKey('U', i, j + 1),
    unitCellKey('U', i + 1, j),
    unitCellKey('U', i + 1, j + 1)
  ];
}

function unitCellKey(kind, i, j) {
  return `${kind}:${i},${j}`;
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
