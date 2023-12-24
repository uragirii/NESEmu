const RENDER_MAPS = new Map<string, Renderer>();

export const TILE_SIZE = 8;

const CHAR_TO_COLOR = ["white", "#ee1c25", "#0065b3", "#fed1b0"];

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

  private pixelMultiplier: number;

  constructor(
    name: string,
    { height, width, pixelMultiplier = 1 }: RendererOptions
  ) {
    this.canvas = document.createElement("canvas");
    this.canvas.id = name;

    this.ctx = this.canvas.getContext("2d")!;

    this.pixelMultiplier = pixelMultiplier;

    const canvasHeight = height * pixelMultiplier;
    const canvasWidth = width * pixelMultiplier;

    this.canvas.height = canvasHeight;
    this.canvas.width = canvasWidth;
    this.canvas.style.height = `${canvasHeight}px`;
    this.canvas.style.width = `${canvasWidth}px`;
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
    palette?: string[]
  ) => {
    tile.forEach((row, y) => {
      const pixels = row.split("");
      pixels.forEach((pixel, x) => {
        this.ctx.fillStyle =
          (palette ?? CHAR_TO_COLOR)[parseInt(pixel)] ?? "black";
        this.ctx.fillRect(
          (offsetX * TILE_SIZE + x) * this.pixelMultiplier,
          (offsetY * TILE_SIZE + y) * this.pixelMultiplier,
          this.pixelMultiplier * this.pixelMultiplier,
          this.pixelMultiplier * this.pixelMultiplier
        );
      });
    });
  };

  public drawRect = (
    offsetX: number,
    offsetY: number,
    height: number,
    width: number,
    color: string
  ) => {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(
      offsetX * this.pixelMultiplier,
      offsetY * this.pixelMultiplier,
      width * this.pixelMultiplier,
      height * this.pixelMultiplier
    );
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
