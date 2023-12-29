const RENDER_MAPS = new Map<string, Renderer>();

export const TILE_SIZE = 8;

const CHAR_TO_COLOR = ["#FFFFFF", "#ee1c25", "#0065b3", "#fed1b0"];

type RendererOptions = {
  height: number;
  width: number;
  pixelMultiplier?: number;
};

const COLOR_MAP: Record<string, number[]> = {};

/**
 * Renderer class to render sprites, memory etc on screen using canvas
 */

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private pixelMultiplier: number;

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

    this.pixelMultiplier = pixelMultiplier;

    this.height = height * pixelMultiplier;
    this.width = width * pixelMultiplier;

    this.canvas.height = this.height;
    this.canvas.width = this.width;
    this.canvas.style.height = `${this.height}px`;
    this.canvas.style.width = `${this.width}px`;

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

  private getRGBFromString(color: string) {
    if (COLOR_MAP[color]) {
      return COLOR_MAP[color];
    }
    const red = parseInt(color.substring(1, 3), 16);
    const green = parseInt(color.substring(3, 5), 16);
    const blue = parseInt(color.substring(5, 7), 16);
    COLOR_MAP[color] = [red, green, blue, 255];
    return COLOR_MAP[color];
  }

  private drawPixel(offsetX: number, offsetY: number, color: string) {
    const startIdx =
      (offsetY * this.width * this.pixelMultiplier +
        offsetX * this.pixelMultiplier) *
      4;
    for (let i = 0; i < this.pixelMultiplier; ++i) {
      for (let j = 0; j < this.pixelMultiplier; ++j) {
        this.imageData.data.set(
          this.getRGBFromString(color),
          startIdx + j + i * this.width * 4
        );
      }
    }
  }

  public drawTileAtNext = (
    tile: string[],
    offsetX: number,
    offsetY: number,
    palette?: string[]
  ) => {
    tile.forEach((row, y) => {
      const pixels = row.split("");
      pixels.forEach((pixel, x) => {
        this.drawPixel(
          offsetX * TILE_SIZE + x,
          offsetY * TILE_SIZE + y,
          (palette ?? CHAR_TO_COLOR)[parseInt(pixel)]
        );
      });
    });
  };

  public render() {
    this.ctx.putImageData(this.imageData, 0, 0);
    debugger;
  }

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
