import {
  ADDRESSING_C_01,
  ADDRESSING_C_10,
  CYCLES_PER_SECOND,
  DEBUG_LOC,
  MEMORY_SIZE,
} from "./constants";
import { throwUnknown } from "./errors";
import { AddressingMode } from "./types";
import { StatusReg } from "./utilClasses";
import { getSignedInt } from "./utilts";

export class Mos6502 {
  memory = new Uint8Array(MEMORY_SIZE);

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

  private _cycles = 0;

  constructor(buffer: ArrayBuffer, startPos?: number) {
    if (buffer.byteLength > MEMORY_SIZE) {
      throw new Error(
        `INSUFFICIENT_MEMORY: Received ROM with bytelength ${buffer.byteLength}. Max supported size ${MEMORY_SIZE}`
      );
    }
    this.memory.set(new Uint8Array(buffer));

    this.programCounter = startPos ?? 0;
  }

  private fetchOpcode = () => {
    return this.memory[this.programCounter++];
  };

  public startExecution = async (instructions?: number) => {
    let remainingIns = instructions ?? Infinity;
    while (this.programCounter < this.memory.length && remainingIns > 0) {
      if (this.programCounter === DEBUG_LOC) {
        debugger;
      }

      const opcode = this.fetchOpcode();
      await this.executeOpcode(opcode);
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

  private executeOpcode = async (opcode: number) => {
    switch (opcode) {
      case 0x18: {
        // clc
        this.statusReg.carry = 0;
        await this.emuCycle(2);
        break;
      }
      case 0x38: {
        //sec
        this.statusReg.carry = 1;
        await this.emuCycle(2);
        break;
      }
      case 0x58: {
        //sec
        this.statusReg.interrupt = 0;
        await this.emuCycle(2);
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
      case 0xb8: {
        //sec
        this.statusReg.overflow = 0;
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
      case 0x98: {
        // tya
        // Y -> A
        this.acc = this.y;
        await this.emuCycle(2);
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
                  "invalid mode accumulator, cc 00 doesn't have that"
                );
              }
              switch (aaa) {
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
                const total = this.acc + value + this.statusReg.carry;

                this.statusReg.carry = total > 0xff;

                this.statusReg.overflow = this.isOverflowInADC(
                  this.acc,
                  value,
                  total
                );

                this.acc = total;
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
              default: {
                throwUnknown(opcode);
              }
            }
            break;
          }
          case 0b10: {
            // group 2

            switch (aaa) {
              case 0b101: {
                //ldx
                const mode = ADDRESSING_C_10[bbb];
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
