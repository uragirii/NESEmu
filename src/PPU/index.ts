import {
  NAMETABLE_LOCATION,
  PPU_COLORS,
  BG_SPRITE_MASK,
  NAMETABLE_SIZE,
  NAME_TABLE_MASK,
  NMI_ENABLE_MASK,
  PALETTE_LOCATION,
  SPRITE_MASK,
  VRAM_INC_MASK,
  nameTableRendereCtn,
  paletteRendereCtn,
} from "./constants";
import { parseSprites } from "../ppu-investigation";
import { Renderer, TILE_SIZE, createRenderer } from "../renderer";

export class PPU {
  private nmiEnable = false;
  private masterSlave = true;

  private spriteLoc = 0;
  private bgAddr = 0;
  private spriteSize = 0;

  private inVBlank = true;

  private addressLatch = 0x00;
  private dataAddress = 0x0000;
  private dataBuffer = 0x00;

  private memory = new Uint8Array(0x4000);
  private sprites: string[][];

  // these are set using ppucntrl
  private baseNametable = NAMETABLE_LOCATION;
  private vramInc = 1;
  private bgSpriteAddr = 0x0000;
  private spriteAddr = 0x0000;

  private nametableRenderers: Renderer[] = [];
  private paletteRenderers: Renderer[] = [];

  constructor(chrRom: Uint8Array) {
    if (chrRom.byteLength > 0x2000) {
      throw "ppu can have 2000 bytes of chr rom";
    }
    this.memory.set(chrRom);
    this.sprites = parseSprites(chrRom);
    this.nametableRenderers = new Array(4).fill(0).map((_, index) => {
      const renderer = createRenderer(`nametable-renderer-${index}`, {
        height: 30 * TILE_SIZE,
        width: 32 * TILE_SIZE,
      });

      renderer.appendTo(nameTableRendereCtn);
      return renderer;
    });
    this.paletteRenderers = new Array(8).fill(0).map((_, index) => {
      const renderer = createRenderer(`palette-renderer-${index}`, {
        height: 3 * TILE_SIZE,
        width: (32 * TILE_SIZE) / 2, // just for symmetry purpose
      });

      renderer.appendTo(paletteRendereCtn);
      return renderer;
    });
  }

  writePPUReg(address: number, value: number) {
    switch (address) {
      // PPUCTRL
      case 0x2000: {
        return this.setPPUCntrl(value);
      }
      // PPUMASK
      case 0x2001: {
        // todo: implement maskng
        return;
      }
      // PPUSTATUS
      case 0x2002: {
        // only read allowed
        return;
      }
      case 0x2003:
      case 0x2004:
      case 0x2005: {
        //todo:
        return;
      }

      // PPUADDR
      case 0x2006: {
        // address
        if (this.addressLatch === 0x00) {
          // hb of address
          this.dataAddress = value << 8;
          this.addressLatch = 1;
        } else {
          this.dataAddress = (this.dataAddress + value) % 0x4000;
        }
        return;
      }

      // PPUDATA
      case 0x2007: {
        // data
        this.memory[this.dataAddress] = value;
        if (
          this.dataAddress >= NAMETABLE_LOCATION &&
          this.dataAddress < PALETTE_LOCATION
        ) {
          this.debugNametable(this.dataAddress, value);
        } else if (this.dataAddress >= PALETTE_LOCATION) {
          this.debugPalette(this.dataAddress);
        }

        this.dataAddress = (this.dataAddress + this.vramInc) % 0x4000;

        return;
      }

      default: {
        throw `illegal PPU address write 0x${address.toString(16)}`;
      }
    }
  }

  readPPUReg(address: number): number {
    switch (address) {
      case 0x2000: {
        // only write allowed
        return 0x00;
      }
      case 0x2001: {
        // only write allowed
        return 0x00;
      }

      case 0x2002: {
        this.addressLatch = 0x00;
        if (this.inVBlank) {
          // this.inVBlank = false;
          return 0xe0;
        } else {
          return 0x00;
        }
      }
      case 0x2003:
      case 0x2004:
      case 0x2005:
      case 0x2006: {
        return 0x00;
      }
      // PPUDATA
      case 0x2007: {
        const tempBuffer = this.dataBuffer;
        this.dataBuffer = this.memory[this.dataAddress];
        // this.dataAddress = (this.dataAddress + this.vramInc) % 0x4000;

        // this.dataAddress++;
        if (this.dataAddress >= PALETTE_LOCATION) {
          // palalette memory read happens in same cycle
          return this.dataBuffer;
        }
        return tempBuffer;
      }

      default: {
        throw `illegal PPU address read 0x${address.toString(16)}`;
      }
    }
  }

  dumpRegisters() {
    console.log(`Data Addr : ${this.dataAddress.toString(16)}`);
    console.log(`Data bufer : ${this.dataBuffer.toString(16)}`);
  }

  private getPalette(idx: number) {
    const startLocation = PALETTE_LOCATION + idx * 4;
    return new Array(4)
      .fill(0)
      .map((_, colorIdx) =>
        colorIdx === 0
          ? this.memory[PALETTE_LOCATION]
          : this.memory[startLocation + colorIdx]
      );
  }

  private getTile = (idx: number) => this.sprites[this.bgSpriteAddr + idx];

  private debugNametable(address: number, spriteIdx: number) {
    const nametableIdx = Math.floor(
      (address - NAMETABLE_LOCATION) / NAMETABLE_SIZE
    );
    const i = address - (NAMETABLE_LOCATION + NAMETABLE_SIZE * nametableIdx);
    const x = i % 32;
    const y = Math.floor(i / 32);
    this.nametableRenderers[nametableIdx].drawTileAt(
      this.getTile(spriteIdx),
      x,
      y
    );
  }

  private debugPalette(address: number) {
    const paletteIdx = Math.floor((address - PALETTE_LOCATION) / 4);
    const palette = this.getPalette(paletteIdx);

    palette.forEach((color, idx) => {
      this.paletteRenderers[paletteIdx].drawRect(
        idx * 4 * TILE_SIZE,
        0,
        3 * TILE_SIZE,
        4 * TILE_SIZE,
        PPU_COLORS[color.toString(16).padStart(2, "0").toUpperCase()]
      );
    });
  }

  private setPPUCntrl(value: number) {
    const nameTable = value & NAME_TABLE_MASK;
    this.baseNametable = NAMETABLE_LOCATION + (nameTable - 1) * NAMETABLE_SIZE;

    this.vramInc = (value & VRAM_INC_MASK) === VRAM_INC_MASK ? 32 : 1;
    this.spriteAddr = (value & SPRITE_MASK) === SPRITE_MASK ? 0x1000 : 0x0000;
    this.bgSpriteAddr = (value & BG_SPRITE_MASK) === BG_SPRITE_MASK ? 0 : 256;

    // todo:read sprite pattern
    this.nmiEnable = (value & NMI_ENABLE_MASK) === NMI_ENABLE_MASK;
  }
}
