import type { NES } from "./NES";
import { Controller } from "./controller";

const CPUMEMORY_SIZE = 2 ** 16;

const MAX_ROM_SIZE = 0x4000;

const TEMP_RECORD = {
  2000: "PPUCTRL",
  2001: "PPUMARK",
  2002: "PPUSTATUS",
  2003: "OAMADDR",
  2004: "OAMDATA",
  2005: "PPUSCRILL",
  2006: "PPUADDR",
  2007: "PPUDATA",
};

const controller1 = new Controller();

/**
 *| Address | Size | Description|
 * | :-----|:-----| :----|
 * | $0000–$07FF	|$0800	|2 KB internal RAM|
 * |$0800–$0FFF	|$0800|	Mirrors of $0000–$07FF|
 * |$1000–$17FF	|$0800 | |
 * |$1800–$1FFF	|$0800| |
 *| $2000–$2007 |	$0008 |	NES PPU registers|
 * |$2008–$3FFF |	$1FF8	|Mirrors of $2000–$2007 (repeats every 8 bytes)|
 * |$4000–$4017	|$0018	|NES APU and I/O registers|
 * |$4018–$401F|	$0008	|APU and I/O functionality that is normally disabled. See CPU Test Mode.|
 * |$4020–$FFFF|	$BFE0|	Cartridge space: PRG ROM, PRG RAM, and mapper registers|
 *
 * @see https://www.nesdev.org/wiki/CPU_memory_map
 */
export const createCPUMemory = (nes: NES) => {
  const prgRom = nes.file.programROM;
  const memory = new Uint8Array(CPUMEMORY_SIZE);

  if (prgRom.byteLength > 2 * MAX_ROM_SIZE) {
    throw "only 16kb rom supported";
  }

  if (prgRom.byteLength <= MAX_ROM_SIZE) {
    memory.set(prgRom, 0x8000);
    memory.set(prgRom, 0xc000);
  } else {
    memory.set(prgRom, 0x8000);
  }

  const getParsedAddress = (address: number) => {
    /**
     * 0x0000 -> 0x2000 is repeated for every 0x800
     */
    if (address < 0x2000) {
      return address % 0x800;
    }

    /**
     * 0x2000 -> 0x2008 repeat for 0x8
     */
    if (address < 0x4000) {
      return ((address - 0x2000) % 0x8) + 0x2000;
    }

    /**
     * 0x8000 -> 0xFFFF repeat for 0x4000
     */
    if (address >= 0x8000) {
      return ((address - 0x8000) % 0x4000) + 0x8000;
    }
    return address;
  };

  return new Proxy(memory, {
    get(target, prop) {
      if (typeof prop === "symbol") {
        throw "address cannot be symbol";
      }

      if (prop === "length") {
        return target.length;
      }

      const address = parseInt(prop, 10);
      if (isNaN(address)) {
        return Reflect.get(target, prop);
      }

      const parsedAddress = getParsedAddress(address);

      if (parsedAddress === 0x4016) {
        const msb = controller1.buffer >> 7;

        controller1.buffer = (controller1.buffer << 1) & 0xff;
        // mimic open bus behaviour
        return msb | 0x40;
      }

      if (parsedAddress >= 0x2000 && parsedAddress < 0x2008) {
        // this is PPU space
        const ppuReg = nes.ppu.readPPUReg(parsedAddress);
        // console.log(
        //   `R 0x${
        //     TEMP_RECORD[parsedAddress.toString(16) as "2000"]
        //   } 0x${ppuReg.toString(16)}`
        // );
        return ppuReg;
      }

      return target[parsedAddress];
    },

    set(target, prop, newValue: number) {
      if (typeof prop === "symbol") {
        throw "address cannot be symbol";
      }

      const address = parseInt(prop, 10);
      if (isNaN(address)) {
        throw `address is NaN ${prop}`;
      }

      const parsedAddress = getParsedAddress(address);

      if (parsedAddress === 0x4014) {
        // This is OAM DMA -> Fast method to copy sprites
        // 0xXX00 -> 0xXXFF is copied to PPU

        nes.ppu.directMemoryAccess(
          memory.slice(newValue << 8, (newValue << 8) + 256)
        );
      }

      if (parsedAddress === 0x4016) {
        // controllerBuffer = DOWN;
        // console.log(
        //   `W CONTROLLER 0x${newValue.toString(16)} 0b${newValue.toString(2)}`,
        //   controllerMode,
        //   controllerBuffer
        // );
        if (newValue & 0b1) {
          controller1.startListening();
        } else {
          controller1.stopListening();
        }

        return true;
      }

      if (parsedAddress >= 0x2000 && parsedAddress < 0x2008) {
        // console.log(
        //   `W 0x${
        //     TEMP_RECORD[parsedAddress.toString(16) as "2000"]
        //   } 0x${newValue.toString(16)} ${prop}`
        // );

        nes.ppu.writePPUReg(parsedAddress, newValue);
        return true;
      }

      target[parsedAddress] = newValue;
      return true;
    },
  });
};
