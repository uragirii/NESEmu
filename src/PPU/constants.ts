import { TILE_SIZE } from "../renderer";

export const NAME_TABLE_MASK = 0b11;
export const VRAM_INC_MASK = 0b100;

export const SPRITE_MASK = 0b100;
export const BG_SPRITE_MASK = 0b1000;
export const NMI_ENABLE_MASK = 0b1000_0000;

export const PALETTE_LOCATION = 0x3f00;
export const NAMETABLE_LOCATION = 0x2000;
/**
 * This size includes the attribute table also. Actual size is NOT 0x400 but 0x3c0
 */
export const NAMETABLE_SIZE = 0x400;

export const PALETTE_BLOCK_WIDTH = 4 * TILE_SIZE;
export const PALETTE_BLOCK_HEIGHT = 3 * TILE_SIZE;

export const NAMETABLE_ROWS = 30;
export const NAMETABLE_COLUMS = 32;
export const ATTRIBUTE_TABLE_SIZE =
  NAMETABLE_SIZE - NAMETABLE_ROWS * NAMETABLE_COLUMS;

export const nameTableRendereCtn = document.getElementById("nametable-ctn")!;
export const paletteRendereCtn = document.getElementById("palette-ctn")!;
export const screenRenderedCtn = document.getElementById("screen-ctn")!;

export const PPU_COLORS = [
  "#626262",
  "#001FB2",
  "#2404C8",
  "#5200B2",
  "#730076",
  "#800024",
  "#730B00",
  "#522800",
  "#244400",
  "#005700",
  "#005C00",
  "#005324",
  "#003C76",
  "#000000",
  "#000000",
  "#000000",
  "#ABABAB",
  "#0D57FF",
  "#4B30FF",
  "#8A13FF",
  "#BC08D6",
  "#D21269",
  "#C72E00",
  "#9D5400",
  "#607B00",
  "#209800",
  "#00A300",
  "#009942",
  "#007DB4",
  "#000000",
  "#000000",
  "#000000",
  "#FFFFFF",
  "#53AEFF",
  "#9085FF",
  "#D365FF",
  "#FF57FF",
  "#FF5DCF",
  "#FF7757",
  "#FA9E00",
  "#BDC700",
  "#7AE700",
  "#43F611",
  "#26EF7E",
  "#2CD5F6",
  "#4E4E4E",
  "#000000",
  "#000000",
  "#FFFFFF",
  "#B6E1FF",
  "#CED1FF",
  "#E9C3FF",
  "#FFBCFF",
  "#FFBDF4",
  "#FFC6C3",
  "#FFD59A",
  "#E9E681",
  "#CEF481",
  "#B6FB9A",
  "#A9FAC3",
  "#A9F0F4",
  "#B8B8B8",
  "#000000",
  "#000000",
];
