import { DEBUG_LOC, MEMORY_SIZE } from "./constants";

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
  }

  private _x = new Uint8Array([0]);
  get x() {
    return this._x[0];
  }
  set x(val: number) {
    this._x[0] = val;
  }

  private _y = new Uint8Array([0]);
  get y() {
    return this._y[0];
  }
  set y(val: number) {
    this._y[0] = val;
  }

  // todo: better way of handling status reg
  statusReg = 0;

  // stack starts from 0x1ff and grows down
  private _stackPointer = new Uint8Array([0xff]);
  get stackPointer() {
    return 0x100 + this._stackPointer[0];
  }
  set stackPointer(val: number) {
    this._stackPointer[0] = val;
  }

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

  public startExecution = async () => {
    while (this.programCounter < this.memory.length) {
      if (this.programCounter === DEBUG_LOC) {
        debugger;
      }

      const opcode = this.fetchOpcode();
      await this.executeOpcode(opcode);
    }
  };

  public dumpRegisters = () => {
    console.log("-------DUMPING REGISTERS-------");
    console.log(`Acc : ${this.acc.toString(16)}, ${this.acc}`);
    console.log(`X : ${this.x.toString(16)}, ${this.x}`);
    console.log(`Y : ${this.y.toString(16)}, ${this.y}`);
    console.log(`SP : ${this.stackPointer.toString(16)}, ${this.stackPointer}`);
    console.log(
      `PC : ${this.programCounter.toString(16)}, ${this.programCounter}`
    );
    console.log(
      `Status : ${this.statusReg.toString(2).padStart(8, "0")}, ${
        this.statusReg
      }`
    );
  };

  private executeOpcode = async (opcode: number) => {
    throw new Error(`unknown opcode ${opcode.toString(16)}`);
  };
}
