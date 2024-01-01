import { Mos6502 } from "../6502";
import { createCPUMemory } from "../memory";
import { NESFile } from "./NESFile";
import { PPU } from "../PPU";

export class NES {
  file: NESFile;
  cpu: Mos6502;
  memory: Uint8Array;
  ppu: PPU;

  constructor(buffer: Uint8Array) {
    this.file = new NESFile(buffer);
    this.ppu = new PPU(this);
    this.memory = createCPUMemory(this);
    this.cpu = new Mos6502(this.memory);
    this.cpu.reset();
  }

  startAnimationLoop() {
    this.ppu.scanline = 0;
    while (this.ppu.scanline < 262) {
      const beforeCycle = this.cpu.cycles;
      this.cpu.startExecution(1);
      const afterCyles = this.cpu.cycles;
      const cycles = afterCyles - beforeCycle;
      // 1 cpu cycle is 3 ppu cycles
      this.ppu.runFor(cycles * 3);
    }

    requestAnimationFrame(() => this.startAnimationLoop());
  }
}
