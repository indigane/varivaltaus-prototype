import { getPalette } from './palettes.js';

export class CanvasRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    render(state) {
        const { board, paletteId } = state;
        const palette = getPalette(paletteId);

        this.clear();
        this.updateScaling(board);

        for (const tile of board.tiles) {
            this.drawTile(tile, palette[tile.colorId % palette.length], tile.ownerId !== null);
        }

        this.drawBorders(board);
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    updateScaling(board) {
        const padding = 20;
        const availableWidth = this.canvas.parentElement.clientWidth - padding * 2;
        const availableHeight = 400; // Fixed height for prototype

        this.scale = Math.min(
            availableWidth / board.width,
            availableHeight / board.height
        );

        this.canvas.width = board.width * this.scale;
        this.canvas.height = board.height * this.scale;

        this.offsetX = 0;
        this.offsetY = 0;
    }

    drawTile(tile, color, isOwned) {
        const { ctx, scale, offsetX, offsetY } = this;
        const points = tile.points;

        ctx.beginPath();
        ctx.moveTo(points[0][0] * scale + offsetX, points[0][1] * scale + offsetY);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0] * scale + offsetX, points[i][1] * scale + offsetY);
        }
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.fill();

        // Optional: highlight owned tiles
        if (isOwned) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    drawBorders(board) {
        // Draw board outer border
        const { ctx, scale, offsetX, offsetY } = this;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(offsetX, offsetY, board.width * scale, board.height * scale);
    }
}
