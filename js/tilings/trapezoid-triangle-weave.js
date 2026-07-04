/**
 * Generates a trapezoid-triangle weave board as a graph.
 *
 * The tiling is built on a unit triangular lattice.  Each triangular unit has
 * a side-3 equilateral triangle surrounded by three isosceles trapezoids.
 * The trapezoid edge touching the triangle is length 4, with one endpoint
 * aligned to the triangle side and one extra unit segment extending past the
 * other endpoint.  The opposite trapezoid edge is length 5, and the two short
 * legs are length 1.  Mirrored up/down units share those length-5 outer edges
 * to create the woven pattern.  Longer edges are subdivided into unit segments
 * so graph neighbors can be matched across partial edges.
 */
export function generateTrapezoidTriangleWeaveBoard(options) {
  const { cols, rows, tileSize: side, colorCount, rng } = options;
  const periodI = 6;
  const periodJ = 6;
  const targetWidth = Math.max(cols, 1) * 3.0 * side;
  const targetHeight = Math.max(rows, 1) * Math.sqrt(3) * side;
  const pad = 4;
  const cropMarginX = periodI * side / 2;
  const cropMarginY = periodJ * Math.sqrt(3) * side / 4;

  const upUnit = [
    { type: 'triangle-up', corners: [[0, 0], [3, 0], [0, 3]] },
    { type: 'trapezoid', corners: [[0, 0], [4, 0], [5, -1], [0, -1]] },
    { type: 'trapezoid', corners: [[3, 0], [-1, 4], [-1, 5], [4, 0]] },
    { type: 'trapezoid', corners: [[0, 3], [0, -1], [-1, -1], [-1, 4]] }
  ];

  const downUnit = upUnit.map(tile => ({
    type: tile.type === 'triangle-up' ? 'triangle-down' : tile.type,
    corners: tile.corners.map(([i, j]) => reflectAcrossHorizontalLatticeLine(i, j, -1))
  }));
  const unitTemplates = [upUnit, downUnit];

  const unitGroups = [];
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
      for (const unit of unitTemplates) {
        const orientation = unit[0].type === 'triangle-up' ? 'up' : 'down';
        const shiftedCorners = unit.map(tile => tile.corners.map(([i, j]) => [i + offsetI, j + offsetJ]));
        const unitTiles = unit.map((tile, index) => makeRawTile(tile.type, subdividedPolygonKeys(shiftedCorners[index])));
        const triangle = unitTiles.find(tile => tile.type.startsWith('triangle'));
        const anchor = averagePoint(triangle.points);
        if (anchor[0] >= -cropMarginX && anchor[0] <= targetWidth + cropMarginX &&
            anchor[1] >= -cropMarginY && anchor[1] <= targetHeight + cropMarginY) {
          const allCorners = shiftedCorners.flat();
          unitGroups.push({
            orientation,
            minJ: Math.min(...allCorners.map(([, j]) => j)),
            maxJ: Math.max(...allCorners.map(([, j]) => j)),
            tiles: unitTiles
          });
        }
      }
    }
  }

  // Keep whole triangle+three-trapezoid units, but choose horizontal lattice
  // lines where the top row of up units and bottom row of down units have
  // flat outer trapezoid edges.  This avoids the single-vertex "spikes" that
  // appear when the crop starts on a down-unit apex or ends on an up-unit apex.
  const topFlatJ = Math.min(...unitGroups.filter(group => group.orientation === 'up').map(group => group.minJ));
  const bottomFlatJ = Math.max(...unitGroups.filter(group => group.orientation === 'down').map(group => group.maxJ));
  const rawTiles = unitGroups
    .filter(group => group.minJ >= topFlatJ && group.maxJ <= bottomFlatJ)
    .flatMap(group => group.tiles);

  const cropped = rawTiles
    .map(tile => ({ ...tile, centroid: averagePoint(tile.points) }))
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
    generator: 'trapezoid-triangle-weave',
    width: bbox.maxX,
    height: bbox.maxY,
    cols,
    rows,
    tiles,
    startTileIds
  };

  function makeRawTile(type, vertexKeys) {
    return {
      type,
      vertexKeys,
      points: vertexKeys.map(key => latticePointFromKey(key, side))
    };
  }
}

function reflectAcrossHorizontalLatticeLine(i, j, lineJ) {
  return [i + j - lineJ, 2 * lineJ - j];
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
