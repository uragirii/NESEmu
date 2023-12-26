import {
  ADDRESSING_C_01,
  ADDRESSING_C_10,
  CYCLES_PER_SECOND,
  DEBUG_LOC,
} from "./constants";
import { throwUnknown } from "./errors";
import { AddressingMode } from "./types";
import { StatusReg } from "./utilClasses";
import { delayHalt, getSignedInt } from "./utilts";

export class Mos6502 {
  memory: Uint8Array;

  private _programCounter = new Uint16Array([0]);
  get programCounter() {
    return this._programCounter[0];
  }
  set programCounter(val: number) {
    this._programCounter[0] = val;
  }

  // Registers
  private _accumulator = new Uint8Array([0]);
  get acc() {
    return this._accumulator[0];
  }
  set acc(val: number) {
    this._accumulator[0] = val;
    this.statusReg.setAccFlags(this._accumulator[0]);
  }

  private _x = new Uint8Array([0]);
  get x() {
    return this._x[0];
  }
  set x(val: number) {
    this._x[0] = val;
    this.statusReg.setAccFlags(this._x[0]);
  }

  private _y = new Uint8Array([0]);
  get y() {
    return this._y[0];
  }
  set y(val: number) {
    this._y[0] = val;
    this.statusReg.setAccFlags(this._y[0]);
  }

  // todo: better way of handling status reg
  statusReg = new StatusReg();

  // stack starts from 0x1ff and grows down
  private _stackPointer = new Uint8Array([0xff]);
  get stackPointer() {
    return 0x100 + this._stackPointer[0];
  }
  set stackPointer(val: number) {
    this._stackPointer[0] = val;
  }

  private isHalted = false;

  private _cycles = 0;

  // Only available for cpu testing
  // constructor(buffer: ArrayBuffer, startPos?: number, loadPos?: number) {
  //   if (buffer.byteLength > MEMORY_SIZE) {
  //     throw new Error(
  //       `INSUFFICIENT_MEMORY: Received ROM with bytelength ${buffer.byteLength}. Max supported size ${MEMORY_SIZE}`
  //     );
  //   }
  //   // console.log("PC", startPos?.toString(16), "Offset", loadPos?.toString(16));
  //   this.memory.set(new Uint8Array(buffer), loadPos);

  //   this.programCounter = startPos ?? 0;
  // }

  // Actual constructor for NES Files
  constructor(memory: Uint8Array) {
    // // This assums NES style and loads 4KB of PGM-ROM
    // if (buffer.length > 0x4000) {
    //   throw "NES supported 4KB PGM-ROM";
    // }
    this.memory = memory;
  }

  private fetchOpcode = () => {
    return this.memory[this.programCounter++];
  };

  public startExecution = async (
    instructions?: number,
    beforeExec?: (opcode: number) => void,
    afterExec?: (opcode: number) => void
  ) => {
    let remainingIns = instructions ?? Infinity;
    while (this.programCounter < this.memory.length && remainingIns > 0) {
      if (this.programCounter === DEBUG_LOC) {
        debugger;
      }
      if (this.isHalted) {
        // Delay for 500ms and make the thread beathe
        await delayHalt(500);
        continue;
      }

      const opcode = this.fetchOpcode();
      beforeExec?.(opcode);
      await this.executeOpcode(opcode);
      afterExec?.(opcode);
      remainingIns--;
    }
  };

  public dumpRegisters = () => {
    console.log("-------DUMPING REGISTERS-------");
    console.log(`Acc : 0x${this.acc.toString(16)}, ${this.acc}`);
    console.log(`X : 0x${this.x.toString(16)}, ${this.x}`);
    console.log(`Y : 0x${this.y.toString(16)}, ${this.y}`);
    console.log(
      `SP : 0x${this.stackPointer.toString(16)}, ${this.stackPointer}`
    );
    console.log(
      `PC : 0x${this.programCounter.toString(16)}, ${this.programCounter}`
    );
    console.log(
      `Status : 0b${this.statusReg.status.toString(2).padStart(8, "0")}, ${
        this.statusReg
      }`
    );
  };

  private emuCycle = async (cycles: number) => {
    if (process.env.NODE_ENV === "test") {
      return;
    }
    this._cycles += cycles;

    const time = (this._cycles / CYCLES_PER_SECOND) * 1000;

    if (time > Math.random() * 50) {
      return new Promise((resolve) =>
        setTimeout(() => {
          this._cycles = 0;
          resolve(undefined);
        }, time)
      );
    }
    return Promise.resolve(undefined);
  };

  public nmi = async () => {
    // #FFFa-b
    const vectorAddress = this.make16Bytes(
      this.memory[0xfffa],
      this.memory[0xfffb]
    );
    await this.executeInteruppt(vectorAddress);
  };

  public irq = async () => {
    // #FFFE
    if (this.statusReg.interrupt) {
      return;
    }

    const vectorAddress = this.make16Bytes(
      this.memory[0xfffe],
      this.memory[0xffff]
    );
    await this.executeInteruppt(vectorAddress);
  };

  public reset = async () => {
    const vectorAddress = this.make16Bytes(
      this.memory[0xfffc],
      this.memory[0xfffd]
    );
    this.stackPointer = 0x1fd;
    this.acc = 0;
    this.x = 0;
    this.y = 0;
    this._cycles = 7;
    this.statusReg.status = 0;
    this.statusReg.interrupt = 1;
    this.jumpTo(vectorAddress);
  };

  public toggleHalt = () => {
    this.isHalted = !this.isHalted;
  };

  private executeInteruppt = async (
    vectorAddress: number,
    setBreak = false
  ) => {
    const lb = this.programCounter & 0xff;
    const hb = this.programCounter >> 8;
    this.pushOnStack(hb);
    this.pushOnStack(lb);
    if (setBreak) {
      this.statusReg.break = true;
    }
    this.pushOnStack(this.statusReg.status);
    this.statusReg.interrupt = true;
    this.jumpTo(vectorAddress);
    await this.emuCycle(7);
  };

  private fetch2Bytes = () => {
    const lb = this.fetchOpcode();
    const hb = this.fetchOpcode();
    return this.make16Bytes(lb, hb);
  };

  private make16Bytes = (lb: number, hb: number) => {
    const _lb = lb & 0xff;
    return ((hb << 8) | _lb) & 0xffff;
  };

  private read2Bytes = (lb: number, hb: number) => {
    const _lb = this.memory[this.make16Bytes(lb, hb)];
    const _hb = this.memory[this.make16Bytes(lb + 1, hb)];
    return this.make16Bytes(_lb, _hb);
  };

  private compare = (acc: number, value: number) => {
    const diff = acc - value;
    this.statusReg.carry = diff >= 0;
    this.statusReg.setAccFlags(diff);
  };

  private getAddressing = async (
    mode: AddressingMode
  ): Promise<{ address: null | number; value: null | number }> => {
    switch (mode) {
      case "immediate": {
        return { value: this.fetchOpcode(), address: null };
      }
      case "zpg": {
        const address = this.fetchOpcode();
        return {
          address,
          value: this.memory[address],
        };
      }
      case "accumulator": {
        return {
          value: this.acc,
          address: null,
        };
      }
      case "absolute": {
        const address = this.fetch2Bytes();
        return { value: this.memory[address], address };
      }
      case "zpg-x": {
        const lb = this.fetchOpcode();

        const address = (this.x + lb) & 0xff;
        return {
          address,
          value: this.memory[address],
        };
      }
      case "zpg-y": {
        const lb = this.fetchOpcode();

        const address = (this.y + lb) & 0xff;
        return {
          address,
          value: this.memory[address],
        };
      }
      case "abs-x": {
        const address = (this.fetch2Bytes() + this.x) & 0xffff;
        return {
          address,
          value: this.memory[address],
        };
      }
      case "abs-y": {
        const address = (this.fetch2Bytes() + this.y) & 0xffff;
        return {
          address,
          value: this.memory[address],
        };
      }
      case "x-indirect": {
        const ll = (this.fetchOpcode() + this.x) & 0xff;
        const lb = this.memory[ll];
        const hb = this.memory[(ll + 1) & 0xff];
        const address = this.make16Bytes(lb, hb);

        return {
          address,
          value: this.memory[address],
        };
      }
      case "indirect-y": {
        const ll = this.fetchOpcode();
        const lb = this.memory[ll];
        const hb = this.memory[(ll + 1) & 0xff];
        const address = (this.make16Bytes(lb, hb) + this.y) & 0xffff;

        return {
          address,
          value: this.memory[address],
        };
      }
      default: {
        throw new Error(`Addressing mode ${mode} not implemented`);
      }
    }
  };

  private jumpTo(address: number) {
    // check for infinte loop

    this.programCounter = address;
  }

  private isOverflowInADC(first: number, second: number, result: number) {
    // overflow happpens when first and second as same sign but result is different sign
    const MASK = 0b1000_0000;
    const firstSign = (first & MASK) === MASK;
    const secondSign = (second & MASK) === MASK;
    const resultSign = (result & MASK) === MASK;

    return firstSign === secondSign && resultSign !== firstSign;
  }

  private pushOnStack = (val: number) => {
    this.memory[this.stackPointer] = val;
    this.stackPointer--;
  };

  private pullFromStack = () => {
    this.stackPointer++;
    const val = this.memory[this.stackPointer];
    return val;
  };

  private adc(value: number) {
    const total = this.acc + value + this.statusReg.carry;

    this.statusReg.carry = total > 0xff;

    this.statusReg.overflow = this.isOverflowInADC(this.acc, value, total);

    this.acc = total;
  }

  private executeOpcode = async (opcode: number) => {
    switch (opcode) {
      case 0x00: {
        // brk
        // #FFFE
        const vectorAddress = this.make16Bytes(
          this.memory[0xfffe],
          this.memory[0xffff]
        );
        // dummy fetch nothing happens
        const _signature = this.fetchOpcode();

        await this.executeInteruppt(vectorAddress, true);
        break;
      }
      case 0x08: {
        // php
        // while pushing BRK flag is set
        this.pushOnStack(this.statusReg.status | 0b110000);
        await this.emuCycle(3);
        break;
      }
      case 0x18: {
        // clc
        this.statusReg.carry = 0;
        await this.emuCycle(2);
        break;
      }
      case 0x28: {
        // plp
        const prevBrk = this.statusReg.break;
        this.statusReg.status = this.pullFromStack();
        this.statusReg.break = prevBrk;
        await this.emuCycle(4);
        break;
      }
      case 0x38: {
        //sec
        this.statusReg.carry = 1;
        await this.emuCycle(2);
        break;
      }
      case 0x48: {
        // pha
        this.pushOnStack(this.acc);
        await this.emuCycle(3);
        break;
      }
      case 0x58: {
        //sec
        this.statusReg.interrupt = 0;
        await this.emuCycle(2);
        break;
      }
      case 0x68: {
        // pla
        this.acc = this.pullFromStack();
        await this.emuCycle(4);
        break;
      }
      case 0x78: {
        //sec
        this.statusReg.interrupt = 1;
        await this.emuCycle(2);
        break;
      }
      case 0x88: {
        // dey
        // imposter
        this.y--;
        await this.emuCycle(2);
        break;
      }
      case 0x98: {
        // tya
        // Y -> A
        this.acc = this.y;
        await this.emuCycle(2);
        break;
      }
      case 0xa8: {
        // tay
        // a -> x
        this.y = this.acc;
        await this.emuCycle(2);
        break;
      }
      case 0xb8: {
        //sec
        this.statusReg.overflow = 0;
        await this.emuCycle(2);
        break;
      }
      case 0xc8: {
        //iny
        this.y++;
        await this.emuCycle(2);
        break;
      }
      case 0xd8: {
        // cld
        // Clear Decimal Mode
        this.statusReg.decimal = 0;
        await this.emuCycle(2);
        break;
      }
      case 0xe8: {
        //inx
        this.x++;
        await this.emuCycle(2);
        break;
      }
      case 0xf8: {
        // sed
        // set Decimal Mode
        this.statusReg.decimal = 1;
        await this.emuCycle(2);
        break;
      }
      case 0x8a: {
        // txa
        // x -> a
        this.acc = this.x;
        await this.emuCycle(2);
        break;
      }
      case 0x9a: {
        // txs
        // X -> SP
        this.stackPointer = this.x;
        await this.emuCycle(2);
        break;
      }
      case 0xaa: {
        // tax
        // a -> x
        this.x = this.acc;
        await this.emuCycle(2);
        break;
      }
      case 0xba: {
        // tsx
        // sp -> x
        this.x = this.stackPointer;
        await this.emuCycle(2);
        break;
      }
      case 0xca: {
        // dex;
        this.x--;
        await this.emuCycle(2);
        break;
      }
      case 0xea: {
        // nop
        await this.emuCycle(2);
        break;
      }
      case 0x4c: {
        // jmp
        // abs
        const address = this.fetch2Bytes();
        this.jumpTo(address);
        await this.emuCycle(3);
        break;
      }
      case 0x6c: {
        // jmp
        // indirect
        const address = this.read2Bytes(this.fetchOpcode(), this.fetchOpcode());
        this.jumpTo(address);
        await this.emuCycle(5);
        break;
      }
      case 0x20: {
        //jsr
        const lb = (this.programCounter + 1) & 0xff;
        const hb = (this.programCounter + 1) >> 8;
        this.pushOnStack(hb);
        this.pushOnStack(lb);
        const jumpAddress = this.fetch2Bytes();
        this.jumpTo(jumpAddress);
        await this.emuCycle(3);
        break;
      }
      case 0x60: {
        // rts
        const lb = this.pullFromStack();
        const hb = this.pullFromStack();
        this.jumpTo(this.make16Bytes(lb, hb) + 1);
        await this.emuCycle(6);
        break;
      }
      case 0x40: {
        // rti
        const status = this.pullFromStack();
        const prevBreak = this.statusReg.break;
        this.statusReg.status = status;
        this.statusReg.break = prevBreak;

        const lb = this.pullFromStack();
        const hb = this.pullFromStack();

        this.jumpTo(this.make16Bytes(lb, hb));
        await this.emuCycle(6);
        break;
      }
      default: {
        // opcode is aaabbbcc
        const cc = opcode & 0b11;
        const bbb = (opcode & 0b11100) >> 2;
        const aaa = opcode >> 5;

        switch (cc) {
          case 0b00: {
            if (bbb === 0b100) {
              // branch ins
              // xxy10000
              const y = (opcode & 0b10_0000) >> 5;
              const xx = opcode >> 6;

              const offset = getSignedInt(this.fetchOpcode());
              if (this.statusReg.checkBranchCondition(xx, y)) {
                this.jumpTo(this.programCounter + offset);
                await this.emuCycle(3);
              } else {
                await this.emuCycle(2);
              }
            } else {
              const mode = ADDRESSING_C_10[bbb];
              if (mode === "accumulator") {
                throw new Error(
                  `invalid mode accumulator, cc 00 doesn't have that. Opcode: ${opcode.toString(
                    16
                  )}`
                );
              }
              switch (aaa) {
                case 0b001: {
                  // bit
                  if (opcode !== 0x24 && opcode !== 0x2c) {
                    throwUnknown(opcode);
                  }
                  const { value } = await this.getAddressing(mode);
                  if (value === null) {
                    throw new Error(
                      `bit incorrect no value, ${opcode.toString(
                        16
                      )} mode:${mode}`
                    );
                  }
                  const bit7 = (value & 0b1000_0000) >> 7;
                  const bit6 = (value & 0b0100_0000) >> 6;

                  this.statusReg.zero = (this.acc & value) === 0;
                  this.statusReg.negative = bit7;
                  this.statusReg.overflow = bit6;
                  await this.emuCycle(4);
                  break;
                }
                case 0b101: {
                  //ldy
                  const { value } = await this.getAddressing(mode);
                  if (value === null) {
                    throw new Error(
                      `ldy incorrect no value, ${opcode.toString(
                        16
                      )} mode:${mode}`
                    );
                  }
                  this.y = value;
                  await this.emuCycle(4);
                  break;
                }
                case 0b110: {
                  //cpy
                  const { value } = await this.getAddressing(mode);
                  if (value === null) {
                    throw new Error(
                      `cpy incorrect no value, ${opcode.toString(
                        16
                      )} mode:${mode}`
                    );
                  }
                  this.compare(this.y, value);
                  await this.emuCycle(3);
                  break;
                }
                case 0b111: {
                  //cpx
                  const { value } = await this.getAddressing(mode);
                  if (value === null) {
                    throw new Error(
                      `cpx incorrect no value, ${opcode.toString(
                        16
                      )} mode:${mode}`
                    );
                  }
                  this.compare(this.x, value);
                  await this.emuCycle(3);
                  break;
                }
                case 0b100: {
                  // sty
                  const { address } = await this.getAddressing(mode);
                  if (address === null) {
                    throw new Error(
                      `sty incorrect no address, ${opcode.toString(
                        16
                      )} mode:${mode}`
                    );
                  }
                  this.memory[address] = this.y;
                  await this.emuCycle(4);
                  break;
                }
                default: {
                  throwUnknown(opcode);
                }
              }
            }

            break;
          }
          case 0b01: {
            // group 1
            const mode = ADDRESSING_C_01[bbb];
            switch (aaa) {
              case 0b000: {
                // ora
                const { value } = await this.getAddressing(mode);
                if (value === null) {
                  throw new Error(
                    `ora incorrect no address, ${opcode.toString(
                      16
                    )} mode:${mode}`
                  );
                }
                this.acc = this.acc | value;
                await this.emuCycle(4);
                break;
              }
              case 0b001: {
                // and
                const { value } = await this.getAddressing(mode);
                if (value === null) {
                  throw new Error(
                    `ora incorrect no address, ${opcode.toString(
                      16
                    )} mode:${mode}`
                  );
                }
                this.acc = this.acc & value;
                await this.emuCycle(4);
                break;
              }
              case 0b010: {
                // eor
                const { value } = await this.getAddressing(mode);
                if (value === null) {
                  throw new Error(
                    `ora incorrect no address, ${opcode.toString(
                      16
                    )} mode:${mode}`
                  );
                }
                this.acc = this.acc ^ value;
                await this.emuCycle(4);
                break;
              }
              case 0b011: {
                //adc
                // a+m+c -> val;
                const { value } = await this.getAddressing(mode);
                if (value === null) {
                  throw new Error(
                    `adc incorrect no value, ${opcode.toString(
                      16
                    )} mode:${mode}`
                  );
                }
                this.adc(value);
                await this.emuCycle(4);

                break;
              }
              case 0b100: {
                // sta
                // A -> M;
                const { address } = await this.getAddressing(mode);
                if (address === null) {
                  throw new Error(
                    `sta incorrect no address, ${opcode.toString(
                      16
                    )} mode:${mode}`
                  );
                }
                this.memory[address] = this.acc;
                await this.emuCycle(5);
                break;
              }
              case 0b101: {
                // lda
                const { value } = await this.getAddressing(mode);
                if (value === null) {
                  throw new Error(
                    `lda incorrect no value, ${opcode.toString(
                      16
                    )} mode:${mode}`
                  );
                }
                this.acc = value;
                await this.emuCycle(4);
                break;
              }
              case 0b110: {
                // cmp
                const { value } = await this.getAddressing(mode);
                if (value === null) {
                  throw new Error(
                    `cmp incorrect no value, ${opcode.toString(
                      16
                    )} mode:${mode}`
                  );
                }
                this.compare(this.acc, value);
                await this.emuCycle(4);
                break;
              }
              case 0b111: {
                //sbc
                // As per https://stackoverflow.com/a/29224684
                const { value } = await this.getAddressing(mode);
                if (value === null) {
                  throw new Error(
                    `sbc incorrect no value, ${opcode.toString(
                      16
                    )} mode:${mode}`
                  );
                }
                this.adc(~value & 0xff);
                await this.emuCycle(4);

                break;
              }
              default: {
                throwUnknown(opcode);
              }
            }
            break;
          }
          case 0b10: {
            // group 2
            const mode = ADDRESSING_C_10[bbb];
            switch (aaa) {
              case 0b000: {
                //asl
                const { value, address } = await this.getAddressing(mode);
                if (value === null) {
                  throw new Error(
                    `asl incorrect no value, ${opcode.toString(16)}`
                  );
                }
                const bit7 = (value & 0b1000_0000) >> 7;
                this.statusReg.carry = bit7;
                const shiftedValue = value << 1;
                if (opcode === 0x0a) {
                  // save in acc;
                  this.acc = shiftedValue;
                } else {
                  if (address === null) {
                    throw new Error(
                      `asl incorrect no address, ${opcode.toString(16)}`
                    );
                  }

                  this.memory[address] = shiftedValue;
                  this.statusReg.setAccFlags(shiftedValue);
                }
                await this.emuCycle(2);
                break;
              }
              case 0b001: {
                // rol
                const { value, address } = await this.getAddressing(mode);
                if (value === null) {
                  throw new Error(
                    `rol incorrect no value, ${opcode.toString(16)}`
                  );
                }
                const bit1 = this.statusReg.carry;
                const bit7 = (value & 0b1000_0000) >> 7;
                const shiftedValue = (value << 1) | bit1;
                this.statusReg.carry = bit7;
                if (opcode === 0x2a) {
                  // save in acc;
                  this.acc = shiftedValue;
                } else {
                  if (address === null) {
                    throw new Error(
                      `rol incorrect no address, ${opcode.toString(16)}`
                    );
                  }
                  this.statusReg.setAccFlags(shiftedValue);
                  this.memory[address] = shiftedValue;
                }
                await this.emuCycle(6);
                break;
              }
              case 0b010: {
                //lsr
                const { value, address } = await this.getAddressing(mode);
                if (value === null) {
                  throw new Error(
                    `lsr incorrect no value, ${opcode.toString(16)}`
                  );
                }
                const bit1 = value & 0b1;
                this.statusReg.carry = bit1;
                const shiftedValue = value >> 1;
                if (opcode === 0x4a) {
                  // save in acc;
                  this.acc = shiftedValue;
                } else {
                  if (address === null) {
                    throw new Error(
                      `lsr incorrect no address, ${opcode.toString(16)}`
                    );
                  }
                  this.statusReg.setAccFlags(shiftedValue);

                  this.memory[address] = shiftedValue;
                }
                await this.emuCycle(2);
                break;
              }
              case 0b011: {
                // ror
                const { value, address } = await this.getAddressing(mode);
                if (value === null) {
                  throw new Error(
                    `ror incorrect no value, ${opcode.toString(16)}`
                  );
                }
                const bit7 = this.statusReg.carry;
                const bit1 = value & 0b1;

                const shiftedValue = (value >> 1) | (bit7 << 7);
                this.statusReg.carry = bit1;
                if (opcode === 0x6a) {
                  // save in acc;
                  this.acc = shiftedValue;
                } else {
                  if (address === null) {
                    throw new Error(
                      `ror incorrect no address, ${opcode.toString(16)}`
                    );
                  }
                  this.statusReg.setAccFlags(shiftedValue);
                  this.memory[address] = shiftedValue;
                }
                await this.emuCycle(6);
                break;
              }
              case 0b101: {
                //ldx

                const { value } = await this.getAddressing(
                  mode.replace("x", "y") as AddressingMode
                );
                if (value === null) {
                  throw new Error(
                    `ldx incorrect no value, ${opcode.toString(16)}`
                  );
                }
                this.x = value;
                await this.emuCycle(4);
                break;
              }
              case 0b100: {
                // stx
                const { address } = await this.getAddressing(
                  mode.replace("x", "y") as AddressingMode
                );
                if (address === null) {
                  throw new Error(
                    `stx incorrect no address, ${opcode.toString(16)}`
                  );
                }
                this.memory[address] = this.x;
                await this.emuCycle(4);
                break;
              }
              case 0b110: {
                //dec
                const { address } = await this.getAddressing(mode);
                if (address === null) {
                  throw new Error(
                    `dec incorrect no address, ${opcode.toString(16)}`
                  );
                }
                this.memory[address]--;
                this.statusReg.setAccFlags(this.memory[address]);
                await this.emuCycle(3);
                break;
              }
              case 0b111: {
                //inc
                const { address } = await this.getAddressing(mode);
                if (address === null) {
                  throw new Error(
                    `dec incorrect no address, ${opcode.toString(16)}`
                  );
                }
                this.memory[address]++;
                this.statusReg.setAccFlags(this.memory[address]);
                await this.emuCycle(3);
                break;
              }
              default: {
                throwUnknown(opcode);
              }
            }
            break;
          }
          default: {
            throwUnknown(opcode);
          }
        }
      }
    }
  };
}
