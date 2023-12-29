import { Palette } from "./types";

const RENDER_MAPS = new Map<string, Renderer>();

export const TILE_SIZE = 8;

const CHAR_TO_COLOR: Palette = [
  [255, 255, 255, 255],
  [238, 28, 37, 255],
  [0, 101, 179, 255],
  [254, 209, 176, 255],
];

type RendererOptions = {
  height: number;
  width: number;
  pixelMultiplier?: number;
};

/**
 * Renderer class to render sprites, memory etc on screen using canvas
 */

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private imageData: ImageData;
  private height: number;
  private width: number;

  constructor(
    name: string,
    { height, width, pixelMultiplier = 1 }: RendererOptions
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.id = name;

    this.ctx = this.canvas.getContext("2d")!;

    this.height = height;
    this.width = width;

    this.canvas.height = this.height;
    this.canvas.width = this.width;
    this.canvas.style.height = `${this.height * pixelMultiplier}px`;
    this.canvas.style.width = `${this.width * pixelMultiplier}px`;

    this.imageData = this.ctx.getImageData(0, 0, this.width, this.height);
  }

  set onClick(eventFn: () => void) {
    this.canvas.onclick = eventFn;
  }

  public appendTo = (domElement: HTMLElement) => {
    domElement.appendChild(this.canvas);
  };

  public drawTileAt = (
    tile: string[],
    offsetX: number,
    offsetY: number,
    palette?: Palette
  ) => {
    tile.forEach((row, y) => {
      const pixels = row.split("");
      pixels.forEach((pixel, x) => {
        const pixelColor = (palette ?? CHAR_TO_COLOR)[parseInt(pixel)];
        this.ctx.fillStyle = `rgba(${pixelColor.join(",")})`;
        this.ctx.fillRect(
          offsetX * TILE_SIZE + x,
          offsetY * TILE_SIZE + y,
          1,
          1
        );
      });
    });
  };

  private drawPixel(offsetX: number, offsetY: number, color: number[]) {
    const startIdx = (offsetY * this.width + offsetX) * 4;
    this.imageData.data.set(color, startIdx);
  }

  public drawTileAtNext = (
    tile: string[],
    offsetX: number,
    offsetY: number,
    palette: Palette
  ) => {
    tile.forEach((row, y) => {
      const pixels = row.split("");
      pixels.forEach((pixel, x) => {
        this.drawPixel(
          offsetX * TILE_SIZE + x,
          offsetY * TILE_SIZE + y,
          palette[parseInt(pixel)]
        );
      });
    });
  };

  public render() {
    this.ctx.putImageData(this.imageData, 0, 0);
  }

  public drawRect = (
    offsetX: number,
    offsetY: number,
    height: number,
    width: number,
    color: number[]
  ) => {
    this.ctx.fillStyle = `rgba(${color.join(",")})`;
    this.ctx.fillRect(offsetX, offsetY, width, height);
  };
}

export const createRenderer = (name: string, options: RendererOptions) => {
  if (RENDER_MAPS.has(name)) {
    throw "renderer name must be unique";
  }

  const renderer = new Renderer(name, options);

  RENDER_MAPS.set(name, renderer);

  return renderer;
};
