import "./style.css";

const RECORD = {
  "00": "A",
  "01": "B",
  "10": "C",
  "11": "D",
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
  return sprites;
};
