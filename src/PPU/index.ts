import {
  NAMETABLE_LOCATION,
  PPU_COLORS,
  BG_SPRITE_MASK,
  NAMETABLE_SIZE,
  NAME_TABLE_MASK,
  NMI_ENABLE_MASK,
  BG_PALETTE_LOCATION,
  SPRITE_MASK,
  VRAM_INC_MASK,
  nameTableRendereCtn,
  paletteRendereCtn,
  PALETTE_BLOCK_WIDTH,
  PALETTE_BLOCK_HEIGHT,
  NAMETABLE_ROWS,
  NAMETABLE_COLUMS,
  ATTRIBUTE_TABLE_SIZE,
  screenRenderedCtn,
  FG_PALETTE_LOCATION,
  SPRITE_SIZE_MASK,
  PPU_REG,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  PPU_MAX_ADDR,
  NAMETABLE_COUNT,
  TOTAL_PALETTE_SIZE,
} from "./constants";
import { Renderer, TILE_SIZE, createRenderer } from "../renderer";
import { Palette } from "../types";
import type { NES } from "../NES";

export class PPU {
  private nmiEnable = false;

  private spriteSize = 8;

  private inVBlank = false;

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

  private screen: Renderer;

  scanline = 0;
  private cycles = 0;

  private selectedNametable = new Uint8Array(
    NAMETABLE_SIZE - ATTRIBUTE_TABLE_SIZE
  );
  private attributeTable = new Uint8Array(ATTRIBUTE_TABLE_SIZE);
  private frameBgPalette: Palette[] = [];
  private oam = new Uint8Array(256);

  private nes: NES;

  constructor(nes: NES) {
    this.nes = nes;
    const chrRom = nes.file.characterROM;
    if (chrRom.byteLength > 0x2000) {
      throw "ppu can have 2000 bytes of chr rom";
    }
    this.memory.set(chrRom);
    this.sprites = this.parseSprites(chrRom);
    this.nametableRenderers = new Array(NAMETABLE_COUNT)
      .fill(0)
      .map((_, index) => {
        const renderer = createRenderer(`nametable-renderer-${index}`, {
          height: NAMETABLE_ROWS * TILE_SIZE,
          width: NAMETABLE_COLUMS * TILE_SIZE,
        });

        // renderer.appendTo(nameTableRendereCtn);
        return renderer;
      });
    this.paletteRenderers = new Array(8).fill(0).map((_, index) => {
      const renderer = createRenderer(`palette-renderer-${index}`, {
        height: PALETTE_BLOCK_HEIGHT,
        width: PALETTE_BLOCK_WIDTH * 4, // just for symmetry purpose
      });

      // renderer.appendTo(paletteRendereCtn);

      // renderer.onClick = () => {
      //   this.drawNameTableWithPalette(index);
      // };
      return renderer;
    });
    this.screen = createRenderer("screen", {
      height: SCREEN_HEIGHT,
      width: SCREEN_WIDTH,
      pixelMultiplier: 3,
    });

    this.screen.appendTo(screenRenderedCtn);

    // this.screen.onClick = (ev) => {};
    this.screen.onclick = ({ spriteX, spriteY }) => {
      const { paletteIdx } = this.getTileAndPalette(spriteX, spriteY);
      console.log(
        spriteX,
        spriteY,
        paletteIdx,
        this.debugGetPaletteRaw(paletteIdx).join(",")
      );
    };
  }

  /**
   * |Address range|	Size|	Description|
   * |----|--|--|
   * |$0000-$0FFF|	$1000|	Pattern table 0|
   * |$1000-$1FFF|	$1000|	Pattern table 1|
   * |$2000-$23FF|	$0400|	Nametable 0|
   * |$2400-$27FF|	$0400|	Nametable 1|
   * |$2800-$2BFF|	$0400|	Nametable 2|
   * |$2C00-$2FFF|	$0400|	Nametable 3|
   * |$3000-$3EFF|	$0F00|	Mirrors of $2000-$2EFF|
   * |$3F00-$3F1F|	$0020|	Palette RAM indexes|
   * |$3F20-$3FFF|	$00E0|	Mirrors of $3F00-$3F1F|
   *
   * @param _address
   * @returns
   */
  private normalizeAddress = (_address: number) => {
    let address = _address % PPU_MAX_ADDR;
    if (
      address >= NAMETABLE_LOCATION + NAMETABLE_SIZE * NAMETABLE_COUNT &&
      address < BG_PALETTE_LOCATION
    ) {
      // address is mirrored
      address -= NAMETABLE_SIZE * NAMETABLE_COUNT;
    }
    if (address >= BG_PALETTE_LOCATION + TOTAL_PALETTE_SIZE) {
      address -= TOTAL_PALETTE_SIZE;
    }
    return address;
  };

  writePPUReg(address: number, value: number) {
    switch (address) {
      // PPUCTRL
      case PPU_REG.PPU_CTRL: {
        return this.setPPUCntrl(value);
      }
      // PPUMASK
      case PPU_REG.PPU_MASK: {
        // todo: implement maskng
        return;
      }
      // PPUSTATUS
      case PPU_REG.PPU_STATUS: {
        // only read allowed
        return;
      }
      // OAMADDR and OAMDATA
      case PPU_REG.OAM_ADDR:
      case PPU_REG.OAM_DATA: {
        // TODO:
        return;
      }

      // PPUSCROLL
      case PPU_REG.PPU_SCROLL: {
        //todo:
        return;
      }

      // PPUADDR
      case PPU_REG.PPU_ADDR: {
        // address
        if (this.addressLatch === 0x00) {
          // hb of address
          this.dataAddress = value << 8;
          this.addressLatch = 1;
        } else {
          this.dataAddress = this.normalizeAddress(this.dataAddress + value);
          this.addressLatch = 0;
        }
        return;
      }

      // PPUDATA
      case PPU_REG.PPU_DATA: {
        // data
        this.memory[this.dataAddress] = value;
        if (
          this.dataAddress >= BG_PALETTE_LOCATION &&
          this.dataAddress <= BG_PALETTE_LOCATION + TOTAL_PALETTE_SIZE
        ) {
          // The 4th color is same as the universal bg color
          if (this.dataAddress % 4 === 0) {
            this.memory[BG_PALETTE_LOCATION] = value;
          }
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
      case PPU_REG.PPU_CTRL: {
        // only write allowed
        return 0x00;
      }
      case PPU_REG.PPU_MASK: {
        // only write allowed
        return 0x00;
      }

      case PPU_REG.PPU_STATUS: {
        this.addressLatch = 0x00;
        if (this.inVBlank) {
          return 0x80;
        } else {
          return 0x00;
        }
      }
      case PPU_REG.OAM_ADDR:
      case PPU_REG.OAM_DATA:
      case PPU_REG.PPU_SCROLL:
      case PPU_REG.PPU_ADDR: {
        return 0x00;
      }
      // PPUDATA
      case PPU_REG.PPU_DATA: {
        const tempBuffer = this.dataBuffer;
        this.dataBuffer = this.memory[this.dataAddress];
        if (this.dataAddress >= BG_PALETTE_LOCATION) {
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

  runFor(cycles: number) {
    // This is not a cycle accurate PPU, accessing memory again n again is troublesome
    // I will draw the scanline as soon as possible and do no op for rest of the cycles
    // Each scanline is 341 cycles.
    this.cycles += cycles;
    this.scanline %= 262;
    if (this.cycles > 341) {
      if (this.scanline === 0) {
        // Fetch nametable and attirbute tables
        this.selectedNametable.set(
          this.memory.slice(
            this.baseNametable,
            this.baseNametable + NAMETABLE_SIZE - ATTRIBUTE_TABLE_SIZE
          )
        );
        this.attributeTable.set(
          this.memory.slice(
            this.baseNametable + NAMETABLE_SIZE - ATTRIBUTE_TABLE_SIZE,
            this.baseNametable + NAMETABLE_SIZE
          )
        );
        this.frameBgPalette = new Array(4)
          .fill(0)
          .map((_, idx) => this.getPalette(idx));
      }
      this.scanline++;
      this.cycles %= 341;
      this.drawScanline();
      if (this.scanline === 241 && this.nmiEnable) {
        this.nes.cpu.nmi();
      }
    }
  }

  private getTileAndPalette = (colX: number, rowY: number) => {
    const attrY = 8 * Math.floor(rowY / 4);
    const nametableY = NAMETABLE_COLUMS * rowY;
    const attributeIdx = Math.floor(colX / 4) + attrY;
    const attribute = this.attributeTable[attributeIdx];

    // Okay i need to explain the thing im doing next
    // One attribute is shared among 2x2 tiles and quad(rant)
    // is based on where that tile lies in 4x4 grid.
    // we modulo by 4 and then get high and low bit and combine to make quad(rant)
    // top -left -> 0 (0,0) top right -> 1 (0,1), bottom right -> 3 (1,1), bottom left (1,0) => 2

    const lbAtr = colX % 4 >> 1;
    const hbAttr = rowY % 4 >> 1;
    const quad = (hbAttr << 1) + lbAtr;

    const paletteIdx = (attribute >> (quad * 2)) & 0b11;
    const palette = this.frameBgPalette[paletteIdx];
    const tile = this.getTile(this.selectedNametable[colX + nametableY]);

    return {
      tile,
      palette,
      paletteIdx,
    };
  };

  private drawFrame() {
    for (let rowY = 0; rowY < NAMETABLE_ROWS; ++rowY) {
      for (let colX = 0; colX < NAMETABLE_COLUMS; ++colX) {
        const { tile, palette } = this.getTileAndPalette(colX, rowY);
        this.screen.drawTileAt(tile, colX, rowY, palette);
      }
    }
  }

  private drawScanline() {
    if (this.scanline === 1) {
      this.drawFrame();
    }
    if (this.scanline === 2) {
      // this.drawForeground();
    }
    // post render
    if (this.scanline === 241) {
      this.screen.render();
      this.inVBlank = true;
    } else if (this.scanline === 261) {
      this.inVBlank = false;
    }
  }

  private drawForeground() {
    for (let idx = 0; idx < this.oam.length; idx += 4) {
      const y = this.oam[idx];
      const spriteIdx = this.oam[idx + 1];
      const attributes = this.oam[idx + 2];
      const paletteIdx = attributes & 0b11;
      const x = this.oam[idx + 3];

      if (y >= 0xef) {
        continue;
      }
      let sprite = this.getTile(spriteIdx, true);

      if ((attributes & 0b1000_0000) === 0b1000_0000) {
        sprite = sprite.slice().reverse();
      }
      if ((attributes & 0b0100_0000) === 0b0100_0000) {
        sprite = sprite.map((line) => line.split("").reverse().join(""));
      }

      this.screen.drawTileAt(
        sprite,
        x,
        y,
        this.getPalette(paletteIdx, true),
        true
      );
    }
    // this.screen.drawTileAt(this.getTile());
  }

  private getPalette(idx: number, isForeground = false): Palette {
    const location = isForeground ? FG_PALETTE_LOCATION : BG_PALETTE_LOCATION;
    const startLocation = location + idx * 4;
    return new Array(4)
      .fill(0)
      .map((_, colorIdx) =>
        colorIdx === 0
          ? PPU_COLORS[this.memory[BG_PALETTE_LOCATION]]
          : PPU_COLORS[this.memory[startLocation + colorIdx]]
      );
  }

  private debugGetPaletteRaw(idx: number) {
    const startLocation = BG_PALETTE_LOCATION + idx * 4;
    return new Array(4)
      .fill(0)
      .map((_, colorIdx) =>
        colorIdx === 0
          ? this.memory[BG_PALETTE_LOCATION].toString(16).padStart(2, "0")
          : this.memory[startLocation + colorIdx].toString(16).padStart(2, "0")
      );
  }

  private getTile = (idx: number, isForeground = false) =>
    this.sprites[(isForeground ? this.spriteAddr : this.bgSpriteAddr) + idx];

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
    if (y > NAMETABLE_ROWS) {
      // This is attribute table for nametable
      return;
    }
    this.nametableRenderers[nametableIdx].drawTileAt(
      this.getTile(spriteIdx),
      x,
      y,
      this.getPalette(paletteIdx ?? 0)
    );
  }

  private debugPalette(address: number) {
    const paletteIdx = Math.floor((address - BG_PALETTE_LOCATION) / 4);
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
        const bit = lb + hb;
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
    this.baseNametable = NAMETABLE_LOCATION + nameTable * NAMETABLE_SIZE;

    this.vramInc = (value & VRAM_INC_MASK) === VRAM_INC_MASK ? 32 : 1;
    this.spriteAddr = (value & SPRITE_MASK) === SPRITE_MASK ? 256 : 0;
    this.bgSpriteAddr = (value & BG_SPRITE_MASK) === BG_SPRITE_MASK ? 256 : 0;
    this.spriteSize = (value & SPRITE_SIZE_MASK) === SPRITE_SIZE_MASK ? 16 : 8;
    this.nmiEnable = (value & NMI_ENABLE_MASK) === NMI_ENABLE_MASK;
  }

  directMemoryAccess(data: Uint8Array) {
    this.oam.set(data);
  }
}
