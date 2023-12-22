const START = 16;
const NES_MARKER = [0x4e, 0x45, 0x53, 0x1a];
const TRAINER_MASK = 0b100;
const TRAINER_SIZE = 512;

const FOUR_MIRROR_MASK = 0b1000;
const MIRROR_MASK = 0b1;

type Mirroring = "horizontal" | "vertical" | "four";

export class NESFile {
  programROM: Uint8Array;
  characterROM: Uint8Array;
  trainerData: Uint8Array | null = null;
  mapper = 0;
  mirroring: Mirroring;

  constructor(_buffer: ArrayBuffer) {
    const buffer = new Uint8Array(_buffer);
    this.validateNES(buffer);

    let START_POS = START;

    const flag4 = buffer[4];
    const flag5 = buffer[5];
    const flag6 = buffer[6];
    const flag7 = buffer[7];

    if (this.hasTrainer(flag6)) {
      START_POS += TRAINER_SIZE;
      this.trainerData = buffer.slice(START, START + TRAINER_SIZE);
    }

    this.mirroring = this.parseMirror(flag6);
    this.mapper = this.parseMapper(flag6, flag7);

    const prgLen = flag4 * 16384;
    const chrLen = flag5 * 8192;

    this.programROM = buffer.slice(START, START + prgLen);
    this.characterROM = buffer.slice(START + prgLen, START + prgLen + chrLen);
  }

  private validateNES = (buffer: Uint8Array) => {
    NES_MARKER.forEach((marker, index) => {
      if (buffer[index] !== marker) {
        throw "NES_MARKER_NOT_PRESENT";
      }
    });

    const flag7 = buffer[7];
    const nes2Marker = (flag7 & 0b1100) >> 2;
    if (nes2Marker === 2) {
      throw "NES_2.0_NOT_SUPPORTED";
    }
  };

  private hasTrainer = (flag: number) => {
    return (flag & TRAINER_MASK) === TRAINER_MASK;
  };

  private parseMirror = (flag6: number): Mirroring => {
    if ((flag6 & FOUR_MIRROR_MASK) === FOUR_MIRROR_MASK) {
      return "four";
    } else {
      return flag6 & MIRROR_MASK ? "vertical" : "horizontal";
    }
  };

  private parseMapper = (flag6: number, flag7: number) => {
    const ln = flag6 >> 4;
    const hn = flag7 & 0b1111_0000;
    return hn + ln;
  };
}
