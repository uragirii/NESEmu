import { getSignedInt } from "./utilts";

const ORDER = [
  "negative",
  "overflow",
  "ignored",
  "break",
  "decimal",
  "interrupt",
  "zero",
  "carry",
] as const;

const BRANCH_ORDER = ["negative", "overflow", "carry", "zero"] as const;

export class StatusReg {
  private _negative = 0;
  private _overflow = 0;
  private _ignored = 1;
  private _break = 0;
  private _decimal = 0;
  private _interrupt = 0;
  private _zero = 0;
  private _carry = 0;

  constructor() {}

  get status() {
    return ORDER.reduce((prev, curr) => {
      return this[`_${curr}`] + (prev << 1);
    }, 0);
  }

  set status(val: number) {
    // Convert the status value to a binary array
    const binaryStatus = val.toString(2).padStart(ORDER.length, "0").split("");

    // Set individual flags based on the binary array
    for (let i = 0; i < ORDER.length; i++) {
      if (ORDER[i] === "ignored") {
        continue;
      }
      this[`_${ORDER[i]}`] = parseInt(binaryStatus[i]);
    }
  }

  public get negative(): number {
    return this._negative;
  }
  public set negative(val: number | boolean) {
    this._negative = val ? 1 : 0;
  }
  public get overflow(): number {
    return this._overflow;
  }
  public set overflow(val: number | boolean) {
    this._overflow = val ? 1 : 0;
  }
  public get break(): number {
    return this._break;
  }
  public set break(val: number | boolean) {
    this._break = val ? 1 : 0;
  }
  public get decimal(): number {
    return this._decimal;
  }
  public set decimal(val: number | boolean) {
    this._decimal = val ? 1 : 0;
  }
  public get interrupt(): number {
    return this._interrupt;
  }
  public set interrupt(val: number | boolean) {
    this._interrupt = val ? 1 : 0;
  }
  public get zero(): number {
    return this._zero;
  }
  public set zero(val: number | boolean) {
    this._zero = val ? 1 : 0;
  }
  public get carry(): number {
    return this._carry;
  }
  public set carry(val: number | boolean) {
    this._carry = val ? 1 : 0;
  }

  public setAccFlags(_val: number) {
    const val = _val & 0xff;
    this.zero = val === 0;
    this.negative = getSignedInt(val) < 0;
  }

  public checkBranchCondition(xx: number, y: number) {
    return this[BRANCH_ORDER[xx]] === y;
  }
}
