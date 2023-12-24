export const NAME_TABLE_MASK = 0b11;
export const VRAM_INC_MASK = 0b100;

export const SPRITE_MASK = 0b100;
export const BG_SPRITE_MASK = 0b1000;
export const NMI_ENABLE_MASK = 0b1000_0000;

export const PALETTE_LOCATION = 0x3f00;
export const NAMETABLE_LOCATION = 0x2000;
export const NAMETABLE_SIZE = 0x400;

export const nameTableRendereCtn = document.getElementById("nametable-ctn")!;
export const paletteRendereCtn = document.getElementById("palette-ctn")!;

export const PPU_COLORS: Record<string, string> = {
  "00": "#626262",
  "01": "#001FB2",
  "02": "#2404C8",
  "03": "#5200B2",
  "04": "#730076",
  "05": "#800024",
  "06": "#730B00",
  "07": "#522800",
  "08": "#244400",
  "09": "#005700",
  "0A": "#005C00",
  "0B": "#005324",
  "0C": "#003C76",
  "0D": "#000000",
  "0E": "#000000",
  "0F": "#000000",
  "10": "#ABABAB",
  "11": "#0D57FF",
  "12": "#4B30FF",
  "13": "#8A13FF",
  "14": "#BC08D6",
  "15": "#D21269",
  "16": "#C72E00",
  "17": "#9D5400",
  "18": "#607B00",
  "19": "#209800",
  "1A": "#00A300",
  "1B": "#009942",
  "1C": "#007DB4",
  "1D": "#000000",
  "1E": "#000000",
  "1F": "#000000",
  "20": "#FFFFFF",
  "21": "#53AEFF",
  "22": "#9085FF",
  "23": "#D365FF",
  "24": "#FF57FF",
  "25": "#FF5DCF",
  "26": "#FF7757",
  "27": "#FA9E00",
  "28": "#BDC700",
  "29": "#7AE700",
  "2A": "#43F611",
  "2B": "#26EF7E",
  "2C": "#2CD5F6",
  "2D": "#4E4E4E",
  "2E": "#000000",
  "2F": "#000000",
  "30": "#FFFFFF",
  "31": "#B6E1FF",
  "32": "#CED1FF",
  "33": "#E9C3FF",
  "34": "#FFBCFF",
  "35": "#FFBDF4",
  "36": "#FFC6C3",
  "37": "#FFD59A",
  "38": "#E9E681",
  "39": "#CEF481",
  "3A": "#B6FB9A",
  "3B": "#A9FAC3",
  "3C": "#A9F0F4",
  "3D": "#B8B8B8",
  "3E": "#000000",
  "3F": "#000000",
};
