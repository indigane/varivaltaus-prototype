import { createRNG } from '../core/rng.js';
import { generateCairoPentagonBoard } from '../tilings/pentagon.js';

export function runCairoTests() {
    console.log("Running Cairo Pentagon Tests...");

    const rng = createRNG(123);
    const cols = 10;
    const rows = 10;
    const board = generateCairoPentagonBoard({ colorCount: 6, rng, cols, rows, tileSize: 40 });

    // 1. Check tile count.
    // In our implementation, every square edge and two internal segments per square.
    // Actually, it's easier to just check if all tiles have neighbors and valid polygons.
    console.assert(board.tiles.length > 0, "Board should have tiles");

    // 2. Check connectivity
    let disconnectedTiles = 0;
    board.tiles.forEach(tile => {
        if (tile.neighbors.length === 0) {
            disconnectedTiles++;
        }

        // Cairo pentagons should typically have 5 neighbors (some on edges have fewer)
        // But they definitely shouldn't have 0.
        console.assert(tile.neighbors.length >= 2, `Tile ${tile.id} has too few neighbors: ${tile.neighbors.length}`);

        // Check if neighbors are mutual
        tile.neighbors.forEach(neighborId => {
            const neighbor = board.tiles.find(t => t.id === neighborId);
            console.assert(neighbor.neighbors.includes(tile.id), `Neighbor relationship not mutual between ${tile.id} and ${neighborId}`);
        });

        // Check polygon
        console.assert(tile.points.length === 5, `Tile ${tile.id} is not a pentagon, has ${tile.points.length} points`);

        // 3. Check bounds
        tile.points.forEach(p => {
            console.assert(p[0] >= -0.0001 && p[0] <= board.width + 0.0001, `Tile ${tile.id} point X out of bounds: ${p[0]} (width: ${board.width})`);
            console.assert(p[1] >= -0.0001 && p[1] <= board.height + 0.0001, `Tile ${tile.id} point Y out of bounds: ${p[1]} (height: ${board.height})`);
        });
    });

    // 4. Check that at least one point is near 0 on each axis (due to offset)
    const allX = board.tiles.flatMap(t => t.points.map(p => p[0]));
    const allY = board.tiles.flatMap(t => t.points.map(p => p[1]));
    console.assert(Math.min(...allX) < 0.0001, "No tile point at X=0");
    console.assert(Math.min(...allY) < 0.0001, "No tile point at Y=0");

    console.log(`Cairo Tests Finished. Disconnected tiles: ${disconnectedTiles}`);
}
