/**
 * Generates a hex tiling board as a graph.
 * Uses axial coordinates (q, r) internally.
 */
export function generateHexBoard(options) {
  const { cols, rows, tileSize: radius, colorCount, rng, shape = "rectangular" } = options;
  const tiles = [];
  const tileMap = new Map(); // key: "q,r", value: id

  const width = Math.sqrt(3) * radius;
  const height = 2 * radius;

  if (shape === "rectangular") {
    let idCounter = 0;
    for (let r = 0; r < rows; r++) {
      const r_offset = Math.floor(r / 2);
      for (let q = -r_offset; q < cols - r_offset; q++) {
        const id = idCounter++;
        tileMap.set(`${q},${r}`, id);
      }
    }

    for (const [key, id] of tileMap.entries()) {
      const [q, r] = key.split(',').map(Number);

      const x = radius * Math.sqrt(3) * (q + r / 2);
      const y = radius * 3/2 * r;

      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i - 30;
        const angle_rad = Math.PI / 180 * angle_deg;
        points.push([
          x + radius * Math.cos(angle_rad),
          y + radius * Math.sin(angle_rad)
        ]);
      }

      const neighbors = [];
      const directions = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
      for (const [dq, dr] of directions) {
        const neighborId = tileMap.get(`${q + dq},${r + dr}`);
        if (neighborId !== undefined) neighbors.push(neighborId);
      }

      tiles.push({
        id,
        colorId: Math.floor(rng() * colorCount),
        ownerId: null,
        points,
        neighbors
      });
    }

    const startTileIds = [
      tileMap.get(`0,0`),
      tileMap.get(`${cols - 1 - Math.floor((rows - 1) / 2)},${rows - 1}`),
      tileMap.get(`${cols - 1},0`),
      tileMap.get(`${-Math.floor((rows - 1) / 2)},${rows - 1}`)
    ].filter(id => id !== undefined);

    return {
      version: 1,
      generator: "hex",
      width: cols * width,
      height: rows * height * 0.75 + height * 0.25,
      tiles,
      startTileIds
    };
  } else if (shape === "hexagonal") {
    // Large hexagon shape with side length 'rows'
    const N = rows - 1;
    let idCounter = 0;
    for (let q = -N; q <= N; q++) {
      const r1 = Math.max(-N, -q - N);
      const r2 = Math.min(N, -q + N);
      for (let r = r1; r <= r2; r++) {
        const id = idCounter++;
        tileMap.set(`${q},${r}`, id);
      }
    }

    // Centering offset
    const centerX = 0;
    const centerY = 0;
    // We'll translate everything so the top-left-most point is near (0,0) later if needed,
    // but for now let's just use radius * N to offset.
    const offsetX = radius * Math.sqrt(3) * N;
    const offsetY = radius * 1.5 * N;

    for (const [key, id] of tileMap.entries()) {
      const [q, r] = key.split(',').map(Number);

      const x = offsetX + radius * Math.sqrt(3) * (q + r / 2);
      const y = offsetY + radius * 3/2 * r;

      const points = [];
      for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i - 30;
        const angle_rad = Math.PI / 180 * angle_deg;
        points.push([
          x + radius * Math.cos(angle_rad),
          y + radius * Math.sin(angle_rad)
        ]);
      }

      const neighbors = [];
      const directions = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
      for (const [dq, dr] of directions) {
        const neighborId = tileMap.get(`${q + dq},${r + dr}`);
        if (neighborId !== undefined) neighbors.push(neighborId);
      }

      tiles.push({
        id,
        colorId: Math.floor(rng() * colorCount),
        ownerId: null,
        points,
        neighbors
      });
    }

    const startTileIds = [
      tileMap.get(`0,${-N}`),
      tileMap.get(`0,${N}`),
      tileMap.get(`${N},0`),
      tileMap.get(`${-N},0`),
      tileMap.get(`${N},${-N}`),
      tileMap.get(`${-N},${N}`)
    ].filter(id => id !== undefined);

    return {
      version: 1,
      generator: "hex",
      width: (2 * N + 1) * width,
      height: (2 * N + 1) * height * 0.75 + height * 0.25,
      tiles,
      startTileIds
    };
  }
}
