const KEY_SCALE = 1000000;

function pointKey(p) {
  return `${Math.round(p[0] * KEY_SCALE)},${Math.round(p[1] * KEY_SCALE)}`;
}

function edgeKey(a, b) {
  const ak = pointKey(a);
  const bk = pointKey(b);
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
}

function centroid(points) {
  let x = 0;
  let y = 0;
  for (const p of points) {
    x += p[0];
    y += p[1];
  }
  return [x / points.length, y / points.length];
}

function midpoint(a, b) {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function sortAround(points, center) {
  return [...points].sort((a, b) => (
    Math.atan2(a[1] - center[1], a[0] - center[0]) -
    Math.atan2(b[1] - center[1], b[0] - center[0])
  ));
}

function addNeighbor(neighborSets, a, b) {
  if (a === b || a === undefined || b === undefined) return;
  neighborSets[a].add(b);
  neighborSets[b].add(a);
}

function finishBoard(tiles, generator, cols, rows) {
  if (tiles.length === 0) {
    return { version: 1, generator, width: 0, height: 0, tiles: [], startTileIds: [] };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const tile of tiles) {
    for (const p of tile.points) {
      minX = Math.min(minX, p[0]);
      minY = Math.min(minY, p[1]);
      maxX = Math.max(maxX, p[0]);
      maxY = Math.max(maxY, p[1]);
    }
  }

  for (const tile of tiles) {
    tile.points = tile.points.map(p => [p[0] - minX, p[1] - minY]);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const targets = [[0, 0], [width, 0], [0, height], [width, height]];
  const startTileIds = [];

  for (const target of targets) {
    let bestId = undefined;
    let bestDist = Infinity;
    for (const tile of tiles) {
      const c = centroid(tile.points);
      const dx = c[0] - target[0];
      const dy = c[1] - target[1];
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestId = tile.id;
      }
    }
    if (bestId !== undefined && !startTileIds.includes(bestId)) {
      startTileIds.push(bestId);
    }
  }

  return { version: 1, generator, width, height, cols, rows, tiles, startTileIds };
}

function boardFromPolygons(polygons, options, generator) {
  const tiles = polygons
    .filter(points => points.length >= 3)
    .map((points, id) => ({
      id,
      colorId: Math.floor(options.rng() * options.colorCount),
      ownerId: null,
      points: points.map(p => [p[0], p[1]]),
      neighbors: []
    }));

  const edgeMap = new Map();
  for (const tile of tiles) {
    for (let i = 0; i < tile.points.length; i++) {
      const a = tile.points[i];
      const b = tile.points[(i + 1) % tile.points.length];
      const key = edgeKey(a, b);
      if (!edgeMap.has(key)) edgeMap.set(key, []);
      edgeMap.get(key).push(tile.id);
    }
  }

  const neighborSets = tiles.map(() => new Set());
  for (const ids of edgeMap.values()) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        addNeighbor(neighborSets, ids[i], ids[j]);
      }
    }
  }

  tiles.forEach((tile, i) => {
    tile.neighbors = [...neighborSets[i]].sort((a, b) => a - b);
  });

  return finishBoard(tiles, generator, options.cols, options.rows);
}

function dualFromPrimalPolygons(primalPolygons, expectedSides, options, generator, vertexFilter = null) {
  const primalTiles = primalPolygons
    .filter(points => points.length >= 3)
    .map((points, id) => ({ id, points, center: centroid(points) }));

  const vertexMap = new Map();
  const vertexOrder = [];
  const primalEdgeMap = new Map();

  for (const tile of primalTiles) {
    for (const p of tile.points) {
      const key = pointKey(p);
      if (!vertexMap.has(key)) {
        vertexMap.set(key, { point: p, tileIds: new Set() });
        vertexOrder.push(key);
      }
      vertexMap.get(key).tileIds.add(tile.id);
    }

    for (let i = 0; i < tile.points.length; i++) {
      const a = tile.points[i];
      const b = tile.points[(i + 1) % tile.points.length];
      const key = edgeKey(a, b);
      if (!primalEdgeMap.has(key)) {
        primalEdgeMap.set(key, {
          aKey: pointKey(a),
          bKey: pointKey(b),
          tileIds: new Set()
        });
      }
      primalEdgeMap.get(key).tileIds.add(tile.id);
    }
  }

  const tiles = [];
  const vertexToDualId = new Map();

  for (const key of vertexOrder) {
    if (vertexFilter && !vertexFilter.has(key)) continue;

    const entry = vertexMap.get(key);
    const tileIds = [...entry.tileIds];
    if (tileIds.length !== expectedSides) continue;

    tileIds.sort((a, b) => {
      const ca = primalTiles[a].center;
      const cb = primalTiles[b].center;
      return Math.atan2(ca[1] - entry.point[1], ca[0] - entry.point[0]) -
             Math.atan2(cb[1] - entry.point[1], cb[0] - entry.point[0]);
    });

    const id = tiles.length;
    vertexToDualId.set(key, id);
    tiles.push({
      id,
      colorId: Math.floor(options.rng() * options.colorCount),
      ownerId: null,
      points: tileIds.map(tileId => [...primalTiles[tileId].center]),
      neighbors: []
    });
  }

  const neighborSets = tiles.map(() => new Set());
  for (const edge of primalEdgeMap.values()) {
    if (edge.tileIds.size < 2) continue;
    const a = vertexToDualId.get(edge.aKey);
    const b = vertexToDualId.get(edge.bKey);
    addNeighbor(neighborSets, a, b);
  }

  tiles.forEach((tile, i) => {
    tile.neighbors = [...neighborSets[i]].sort((a, b) => a - b);
  });

  return finishBoard(tiles, generator, options.cols, options.rows);
}

function triangularCells(cols, rows, a) {
  const h = a * Math.sqrt(3) / 2;
  const cells = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rowOffset = (r % 2) * a / 2;
      const nextRowOffset = ((r + 1) % 2) * a / 2;
      const p00 = [c * a + rowOffset, r * h];
      const p10 = [(c + 1) * a + rowOffset, r * h];
      const p01 = [c * a + nextRowOffset, (r + 1) * h];
      const p11 = [(c + 1) * a + nextRowOffset, (r + 1) * h];

      if (nextRowOffset > rowOffset) {
        cells.push([p00, p10, p01]);
        cells.push([p10, p11, p01]);
      } else {
        cells.push([p00, p10, p11]);
        cells.push([p00, p11, p01]);
      }
    }
  }

  return cells;
}

function regularHexCells(cols, rows, a) {
  const cells = [];

  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < cols; q++) {
      const center = [a * Math.sqrt(3) * (q + (r % 2) / 2), a * 1.5 * r];
      const vertices = [];
      for (let i = 0; i < 6; i++) {
        const angle = (30 + 60 * i) * Math.PI / 180;
        vertices.push([center[0] + a * Math.cos(angle), center[1] + a * Math.sin(angle)]);
      }
      cells.push({ center, vertices });
    }
  }

  return cells;
}

function elongatedTriangularPrimalPolygons(cols, rows, a) {
  const h = a * Math.sqrt(3) / 2;
  const polygons = [];

  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 0 ? 0 : a / 2;
    const y = row * (a + h);
    for (let c = 0; c < cols; c++) {
      const x = c * a + offset;
      polygons.push([[x, y], [x + a, y], [x + a, y + a], [x, y + a]]);
    }
  }

  for (let row = 0; row < rows - 1; row++) {
    const y = row * (a + h) + a;
    const lowerOffset = row % 2 === 0 ? 0 : a / 2;
    const upperOffset = (row + 1) % 2 === 0 ? 0 : a / 2;

    for (let c = -1; c <= cols; c++) {
      const xLower = c * a + lowerOffset;
      const xUpper = c * a + upperOffset;
      const upApexX = lowerOffset < upperOffset ? xUpper : xUpper + a;
      const downApexX = lowerOffset < upperOffset ? xLower + a : xLower;

      polygons.push([[xLower, y], [xLower + a, y], [upApexX, y + h]]);
      polygons.push([[xUpper, y + h], [xUpper + a, y + h], [downApexX, y]]);
    }
  }

  return polygons;
}

function snubTrihexagonalPrimalPolygons(cols, rows, a, padding = 0) {
  const d = a * Math.sqrt(7);
  const alpha = Math.atan(Math.sqrt(3) / 5);
  const polygons = [];
  const vertices = [];
  const vertexIds = new Map();

  const addVertex = (p) => {
    const key = pointKey(p);
    if (vertexIds.has(key)) return vertexIds.get(key);
    const id = vertices.length;
    vertices.push(p);
    vertexIds.set(key, id);
    return id;
  };

  for (let r = -padding; r < rows + padding; r++) {
    const rOffset = (r % 2 === 0) ? 0 : 0.5;
    for (let q = -padding; q < cols + padding; q++) {
      const center = [d * (q + rOffset), d * (Math.sqrt(3) / 2) * r];
      const hex = [];
      for (let i = 0; i < 6; i++) {
        const angle = alpha + 60 * i * Math.PI / 180;
        const p = [center[0] + a * Math.cos(angle), center[1] + a * Math.sin(angle)];
        hex.push(p);
        addVertex(p);
      }
      polygons.push(hex);
    }
  }

  const cellSize = a;
  const grid = new Map();
  const cellKey = (p) => `${Math.floor(p[0] / cellSize)},${Math.floor(p[1] / cellSize)}`;
  vertices.forEach((p, id) => {
    const key = cellKey(p);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(id);
  });

  const triangleKeys = new Set();
  const targetSq = a * a;
  const tolerance = targetSq * 0.0001;
  const sqrt3Over2 = Math.sqrt(3) / 2;

  for (let i = 0; i < vertices.length; i++) {
    const p = vertices[i];
    const cx = Math.floor(p[0] / cellSize);
    const cy = Math.floor(p[1] / cellSize);

    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const ids = grid.get(`${cx + dx},${cy + dy}`);
        if (!ids) continue;

        for (const j of ids) {
          if (j <= i) continue;
          const q = vertices[j];
          const vx = q[0] - p[0];
          const vy = q[1] - p[1];
          const distSq = vx * vx + vy * vy;
          if (Math.abs(distSq - targetSq) > tolerance) continue;

          const candidates = [
            [(p[0] + q[0]) / 2 - sqrt3Over2 * vy, (p[1] + q[1]) / 2 + sqrt3Over2 * vx],
            [(p[0] + q[0]) / 2 + sqrt3Over2 * vy, (p[1] + q[1]) / 2 - sqrt3Over2 * vx]
          ];

          for (const candidate of candidates) {
            const k = vertexIds.get(pointKey(candidate));
            if (k === undefined || k === i || k === j) continue;
            const triIds = [i, j, k].sort((aId, bId) => aId - bId);
            triangleKeys.add(triIds.join(','));
          }
        }
      }
    }
  }

  for (const key of triangleKeys) {
    const points = key.split(',').map(id => vertices[Number(id)]);
    polygons.push(sortAround(points, centroid(points)));
  }

  return polygons;
}

export function generateTetrakisSquareBoard(options) {
  const { cols, rows, tileSize: a } = options;
  const polygons = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * a;
      const y = r * a;
      const center = [x + a / 2, y + a / 2];
      const corners = [[x, y], [x + a, y], [x + a, y + a], [x, y + a]];
      for (let i = 0; i < 4; i++) {
        polygons.push([corners[i], corners[(i + 1) % 4], center]);
      }
    }
  }

  return boardFromPolygons(polygons, options, 'tetrakis-square');
}

export function generateTriakisTriangularBoard(options) {
  const polygons = [];

  for (const triangle of triangularCells(options.cols, options.rows, options.tileSize)) {
    const center = centroid(triangle);
    for (let i = 0; i < 3; i++) {
      polygons.push([triangle[i], triangle[(i + 1) % 3], center]);
    }
  }

  return boardFromPolygons(polygons, options, 'triakis-triangular');
}

export function generateKisrhombilleBoard(options) {
  const polygons = [];

  for (const triangle of triangularCells(options.cols, options.rows, options.tileSize)) {
    const [a, b, c] = triangle;
    const center = centroid(triangle);
    const ab = midpoint(a, b);
    const bc = midpoint(b, c);
    const ca = midpoint(c, a);

    polygons.push([a, ab, center]);
    polygons.push([b, center, ab]);
    polygons.push([b, bc, center]);
    polygons.push([c, center, bc]);
    polygons.push([c, ca, center]);
    polygons.push([a, center, ca]);
  }

  return boardFromPolygons(polygons, options, 'kisrhombille');
}

export function generateDeltoidalTrihexagonalBoard(options) {
  const polygons = [];

  for (const hex of regularHexCells(options.cols, options.rows, options.tileSize)) {
    for (let i = 0; i < 6; i++) {
      const vertex = hex.vertices[i];
      const prevMid = midpoint(hex.vertices[(i + 5) % 6], vertex);
      const nextMid = midpoint(vertex, hex.vertices[(i + 1) % 6]);
      polygons.push([hex.center, nextMid, vertex, prevMid]);
    }
  }

  return boardFromPolygons(polygons, options, 'deltoidal-trihexagonal');
}

export function generateRhombilleBoard(options) {
  const edgeMap = new Map();

  for (const hex of regularHexCells(options.cols, options.rows, options.tileSize)) {
    for (let i = 0; i < 6; i++) {
      const a = hex.vertices[i];
      const b = hex.vertices[(i + 1) % 6];
      const key = edgeKey(a, b);
      if (!edgeMap.has(key)) edgeMap.set(key, { a, b, centers: [] });
      edgeMap.get(key).centers.push(hex.center);
    }
  }

  const polygons = [];
  for (const edge of edgeMap.values()) {
    if (edge.centers.length !== 2) continue;
    const points = [edge.a, edge.centers[0], edge.b, edge.centers[1]];
    polygons.push(sortAround(points, centroid(points)));
  }

  return boardFromPolygons(polygons, options, 'rhombille');
}

export function generatePrismaticPentagonalBoard(options) {
  return dualFromPrimalPolygons(
    elongatedTriangularPrimalPolygons(options.cols, options.rows, options.tileSize),
    5,
    options,
    'pentagon-prismatic'
  );
}

export function generateFloretPentagonalBoard(options) {
  const { cols, rows, tileSize: a } = options;
  const padding = 1;
  const primalPolygons = snubTrihexagonalPrimalPolygons(cols, rows, a, padding);

  const coreVertexKeys = new Set();
  const d = a * Math.sqrt(7);
  const alpha = Math.atan(Math.sqrt(3) / 5);

  for (let r = 0; r < rows; r++) {
    const rOffset = (r % 2 === 0) ? 0 : 0.5;
    for (let q = 0; q < cols; q++) {
      const cx = d * (q + rOffset);
      const cy = d * (Math.sqrt(3) / 2) * r;
      for (let i = 0; i < 6; i++) {
        const angle = alpha + (i * 60) * Math.PI / 180;
        const p = [cx + a * Math.cos(angle), cy + a * Math.sin(angle)];
        coreVertexKeys.add(pointKey(p));
      }
    }
  }

  return dualFromPrimalPolygons(
    primalPolygons,
    5,
    options,
    'pentagon-floret',
    coreVertexKeys
  );
}
