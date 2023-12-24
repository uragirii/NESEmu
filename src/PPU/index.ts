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
  PALETTE_BLOCK_WIDTH,
  PALETTE_BLOCK_HEIGHT,
  NAMETABLE_ROWS,
  NAMETABLE_COLUMS,
} from "./constants";
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
    this.sprites = this.parseSprites(chrRom);
    this.nametableRenderers = new Array(4).fill(0).map((_, index) => {
      const renderer = createRenderer(`nametable-renderer-${index}`, {
        height: NAMETABLE_ROWS * TILE_SIZE,
        width: NAMETABLE_COLUMS * TILE_SIZE,
      });

      renderer.appendTo(nameTableRendereCtn);
      return renderer;
    });
    this.paletteRenderers = new Array(8).fill(0).map((_, index) => {
      const renderer = createRenderer(`palette-renderer-${index}`, {
        height: PALETTE_BLOCK_HEIGHT,
        width: PALETTE_BLOCK_WIDTH * 4, // just for symmetry purpose
      });

      renderer.appendTo(paletteRendereCtn);

      renderer.onClick = () => {
        this.drawNameTableWithPalette(index);
      };
      return renderer;
    });
  }

  private normalizeAddress = (_address: number) => {
    let address = _address % 0x4000;
    if (address >= 0x3000 && address < PALETTE_LOCATION) {
      // address is mirrored
      address -= 0x1000;
    }
    if (address > 0x3f1f) {
      address -= 0x20;
    }
    return address;
  };

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
          this.dataAddress = this.normalizeAddress(this.dataAddress + value);
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

        this.dataAddress = this.normalizeAddress(
          this.dataAddress + this.vramInc
        );

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

  private getPalette(idx: number): string[] {
    const startLocation = PALETTE_LOCATION + idx * 4;
    return new Array(4)
      .fill(0)
      .map((_, colorIdx) =>
        colorIdx === 0
          ? PPU_COLORS[this.memory[PALETTE_LOCATION]]
          : PPU_COLORS[this.memory[startLocation + colorIdx]]
      );
  }

  private getTile = (idx: number) => this.sprites[this.bgSpriteAddr + idx];

  private debugNametable(
    address: number,
    spriteIdx: number,
    paletteIdx?: number
  ) {
    const nametableIdx = Math.floor(
      (address - NAMETABLE_LOCATION) / NAMETABLE_SIZE
    );
    const i = address - (NAMETABLE_LOCATION + NAMETABLE_SIZE * nametableIdx);
    const x = i % NAMETABLE_COLUMS;
    const y = Math.floor(i / NAMETABLE_COLUMS);
    this.nametableRenderers[nametableIdx].drawTileAt(
      this.getTile(spriteIdx),
      x,
      y,
      paletteIdx !== undefined ? this.getPalette(paletteIdx) : undefined
    );
  }

  private debugPalette(address: number) {
    const paletteIdx = Math.floor((address - PALETTE_LOCATION) / 4);
    const palette = this.getPalette(paletteIdx);

    palette.forEach((color, idx) => {
      this.paletteRenderers[paletteIdx].drawRect(
        idx * PALETTE_BLOCK_WIDTH,
        0,
        PALETTE_BLOCK_HEIGHT,
        PALETTE_BLOCK_WIDTH,
        color
      );
    });
  }

  private drawNameTableWithPalette(idx: number) {
    for (let index = 0; index < NAMETABLE_SIZE * 4; index++) {
      this.debugNametable(
        NAMETABLE_LOCATION + index,
        this.memory[NAMETABLE_LOCATION + index],
        idx
      );
    }
  }

  private getSprite = (high: Uint8Array, low: Uint8Array) => {
    const highStr = Array.from(high).map((val) =>
      val.toString(2).padStart(8, "0")
    );
    const lowStr = Array.from(low).map((val) =>
      val.toString(2).padStart(8, "0")
    );
    const sprite: string[] = [];
    for (let y = 0; y < 8; y++) {
      const line: number[] = [];
      for (let x = 0; x < 8; x++) {
        const hb = highStr[y][x];
        const lb = lowStr[y][x];
        const bit = hb + lb;
        line.push(parseInt(bit, 2));
      }
      sprite.push(line.join(""));
    }

    return sprite;
  };

  private parseSprites = (rom: Uint8Array) => {
    const sprites = [];

    for (let tileIdx = 0; tileIdx < 512; tileIdx++) {
      const tileH = rom.slice(tileIdx * 16, tileIdx * 16 + 8);
      const tileL = rom.slice(tileIdx * 16 + 8, tileIdx * 16 + 16);

      sprites.push(this.getSprite(tileH, tileL));
    }
    return sprites;
  };

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
