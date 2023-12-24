const MEMORY_SIZE = 2 ** 16;

const MAX_ROM_SIZE = 0x4000;

const TEMP_RECORD = {
  2000: "PPUCTRL",
  2001: "PPUMARK",
  2002: "PPUSCROLL",
  2003: "OAMADDR",
  2004: "OAMDATA",
  2005: "PPUSCRILL",
  2006: "PPUADDR",
  2007: "PPUDATA",
};

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
export const createCPUMemory = (
  prgRom: Uint8Array,
  ppuRegRead: (address: number) => number,
  ppuRegWrite: (address: number, value: number) => void
) => {
  const memory = new Uint8Array(MEMORY_SIZE);

  if (prgRom.byteLength > MAX_ROM_SIZE) {
    throw "only 4kb rom supported";
  }

  memory.set(prgRom, 0x8000);
  memory.set(prgRom, 0xc000);

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
        throw `address is NaN ${prop}`;
      }

      const parsedAddress = getParsedAddress(address);

      if (parsedAddress >= 0x2000 && parsedAddress < 0x2008) {
        // this is PPU space
        const ppuReg = ppuRegRead(parsedAddress);
        console.log(
          `R 0x${TEMP_RECORD[parsedAddress.toString(16)]} 0x${ppuReg.toString(
            16
          )}`
        );
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

      if (parsedAddress >= 0x2000 && parsedAddress < 0x2008) {
        console.log(
          `W 0x${TEMP_RECORD[parsedAddress.toString(16)]} 0x${newValue.toString(
            16
          )} ${prop}`
        );
        ppuRegWrite(parsedAddress, newValue);
        return true;
      }

      target[parsedAddress] = newValue;
      return true;
    },
  });
};