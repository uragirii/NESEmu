import { Palette } from "./types";

const RENDER_MAPS = new Map<string, Renderer>();

export const TILE_SIZE = 8;

type RendererOptions = {
  height: number;
  width: number;
  pixelMultiplier?: number;
};

type OnClickHandler = (ev: {
  actualX: number;
  actualY: number;
  spriteX: number;
  spriteY: number;
}) => void;

/**
 * Renderer class to render sprites, memory etc on screen using canvas
 */

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private imageData: ImageData;
  private height: number;
  private width: number;
  /**
   * Note that this is just multiplier for CSS and not the canvas size but DOM size
   */
  private pixelMultiplier = 1;

  private _onClick: OnClickHandler | null = null;

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

    this.pixelMultiplier = pixelMultiplier;

    this.imageData = this.ctx.getImageData(0, 0, this.width, this.height);
    this.canvas.onclick = (ev) => {
      this.onClickHandler(ev);
    };
  }

  public appendTo = (domElement: HTMLElement) => {
    domElement.appendChild(this.canvas);
  };

  private drawPixel(offsetX: number, offsetY: number, color: number[]) {
    const startIdx = (offsetY * this.width + offsetX) * 4;
    this.imageData.data.set(color, startIdx);
  }

  public drawTileAt = (
    tile: string[],
    offsetX: number,
    offsetY: number,
    palette: Palette,
    isFine = false
  ) => {
    tile.forEach((row, y) => {
      const pixels = row.split("");
      pixels.forEach((pixel, x) => {
        if (pixel === "0") {
          return;
        }
        this.drawPixel(
          (isFine ? offsetX : offsetX * TILE_SIZE) + x,
          (isFine ? offsetY : offsetY * TILE_SIZE) + y,
          palette[parseInt(pixel)]
        );
      });
    });
  };

  public render() {
    this.ctx.putImageData(this.imageData, 0, 0);
    this.imageData.data.fill(0);
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

  private onClickHandler = (ev: MouseEvent) => {
    const { x, y } = this.canvas.getBoundingClientRect();
    const { clientX, clientY } = ev;
    const actualX = Math.floor((clientX - x) / this.pixelMultiplier);
    const actualY = Math.floor((clientY - y) / this.pixelMultiplier);
    const spriteX = Math.floor(actualX / 8);
    const spriteY = Math.floor(actualY / 8);

    this._onClick?.({
      actualX,
      actualY,
      spriteX,
      spriteY,
    });
  };

  set onclick(handler: OnClickHandler) {
    this._onClick = handler;
  }
}

export const createRenderer = (name: string, options: RendererOptions) => {
  if (RENDER_MAPS.has(name)) {
    throw "renderer name must be unique";
  }

  const renderer = new Renderer(name, options);

  RENDER_MAPS.set(name, renderer);

  return renderer;
};
