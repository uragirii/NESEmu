import { NESFile } from "./NESFile";
import "./style.css";
import { readFileAsBinary } from "./utils";

const loadRomInput = document.getElementById("loadRom")!;
const canvas = document.getElementById("namespace")! as HTMLCanvasElement;
const ctx = canvas.getContext("2d");
if (!ctx) {
  throw "no ctx";
}
// const colors = {
//   00: 255,
//   01: 192,
//   10: 64,
//   11: 0,
// };

const RECORD = {
  "00": "A",
  "01": "B",
  "10": "C",
  "11": "D",
};

const CHAR_TO_COLOR = {
  A: "white",
  B: "#ee1c25",
  C: "#0065b3",
  D: "#fed1b0",
};

const MAX_SPRITE = 16;

const PIXEL_MULTIPLIER = 4;

// const height = 240 * PIXEL_MULTIPLIER;
// const width = 256 * PIXEL_MULTIPLIER;
// canvas.height = height;
// canvas.width = width;
// canvas.style.height = `${height}px`;
// canvas.style.width = `${width}px`;

export const renderTile = (
  tile: string[],
  offsetX: number,
  offsetY: number
) => {
  // const offsetY = _y * 8;
  // const offsetX = _x * 8;
  tile.forEach((row, y) => {
    const pixels = row.split("");
    pixels.forEach((pixel, x) => {
      ctx.fillStyle = CHAR_TO_COLOR[pixel as "A" | "B" | "C" | "D"] ?? "black";
      ctx.fillRect(
        (offsetX * 8 + x) * PIXEL_MULTIPLIER,
        (offsetY * 8 + y) * PIXEL_MULTIPLIER,
        PIXEL_MULTIPLIER * PIXEL_MULTIPLIER,
        PIXEL_MULTIPLIER * PIXEL_MULTIPLIER
      );
    });
  });
};

const getSprite = (high: Uint8Array, low: Uint8Array) => {
  const highStr = Array.from(high).map((val) =>
    val.toString(2).padStart(8, "0")
  );
  const lowStr = Array.from(low).map((val) => val.toString(2).padStart(8, "0"));
  const sprite: string[] = [];
  for (let y = 0; y < 8; y++) {
    const line: string[] = [];
    for (let x = 0; x < 8; x++) {
      const hb = highStr[y][x];
      const lb = lowStr[y][x];
      const bit = hb + lb;
      line.push(RECORD[bit as "00"]);
    }
    sprite.push(line.join(""));
  }

  return sprite;
};

export const parseSprites = (rom: Uint8Array) => {
  const sprites = [];

  for (let tileIdx = 0; tileIdx < 512; tileIdx++) {
    const tileH = rom.slice(tileIdx * 16, tileIdx * 16 + 8);
    const tileL = rom.slice(tileIdx * 16 + 8, tileIdx * 16 + 16);

    sprites.push(getSprite(tileH, tileL));
  }
  // sprites.forEach((sprite, pos) => renderTile(sprite, pos));
  return sprites;
};

// loadRomInput.onchange = async (e) => {
//   const file: File | undefined = (e.target as HTMLInputElement)?.files?.[0];
//   if (!file) {
//     return;
//   }

//   const buffer = new Uint8Array(await readFileAsBinary(file));
//   const nes = new NESFile(buffer);

//   const start = performance.now();
//   renderChrRom(nes.characterROM);
//   const end = performance.now();
//   console.log("Time", end - start);
// };
