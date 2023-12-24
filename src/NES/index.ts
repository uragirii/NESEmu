import { Mos6502 } from "../6502";
import { createCPUMemory } from "../memory";
import { NESFile } from "../NESFile";
import { PPU } from "../PPU";

export class NES {
  file: NESFile;
  cpu: Mos6502;
  memory: Uint8Array;
  ppu: PPU;

  constructor(buffer: Uint8Array) {
    this.file = new NESFile(buffer);
    this.ppu = new PPU(this.file.characterROM);
    this.memory = createCPUMemory(
      this.file.programROM,
      (address) => this.ppu.readPPUReg(address),
      (address, val) => {
        this.ppu.writePPUReg(address, val);
      }
    );
    this.cpu = new Mos6502(this.memory);
    this.cpu.reset();
  }
}
