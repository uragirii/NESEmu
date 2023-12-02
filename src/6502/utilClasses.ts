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
  private _ignored = 0;
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
    throw new Error("status set not implemented");
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

  public setAccFlags(val: number) {
    if (val === 0) {
      this.zero = 1;
    } else {
      this.zero = 0;
    }
    if ((val & 0b1000_0000) === 0b1000_0000) {
      this.negative = 1;
    } else {
      this.negative = 0;
    }
  }

  public checkBranchCondition(xx: number, y: number) {
    return this[BRANCH_ORDER[xx]] === y;
  }
}
