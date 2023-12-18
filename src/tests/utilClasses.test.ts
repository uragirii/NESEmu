import { describe, expect, it } from "vitest";
import { StatusReg } from "../6502/utilClasses";

describe("StatusReg class", () => {
  it("StatusReg should have all flags set to 0 by default", () => {
    const statusReg = new StatusReg();
    expect(statusReg.negative).toBe(0);
    expect(statusReg.overflow).toBe(0);
    expect(statusReg.break).toBe(0);
    expect(statusReg.decimal).toBe(0);
    expect(statusReg.interrupt).toBe(0);
    expect(statusReg.zero).toBe(0);
    expect(statusReg.carry).toBe(0);
  });

  it("get status should return the correct binary value", () => {
    const statusReg = new StatusReg();
    statusReg.negative = 1;
    statusReg.overflow = 1;

    expect(statusReg.status).toBe(0b1110_0000); // 011 in binary

    statusReg.zero = 1;
    expect(statusReg.status).toBe(0b1110_0010); // 111 in binary
  });

  it("set status should set individual flags based on binary value", () => {
    const statusReg = new StatusReg();

    statusReg.status = 0b1100_0010; // 111 in binary
    expect(statusReg.negative).toBe(1);
    expect(statusReg.overflow).toBe(1);
    expect(statusReg.zero).toBe(1);

    statusReg.status = 0b0101_0001; // 010 in binary
    expect(statusReg.negative).toBe(0);
    expect(statusReg.carry).toBe(1);
    expect(statusReg.zero).toBe(0);
    expect(statusReg.break).toBe(1);
  });

  it("individual flag setters should set the corresponding flag", () => {
    const statusReg = new StatusReg();

    statusReg.negative = true;
    expect(statusReg.negative).toBe(1);

    statusReg.overflow = false;
    expect(statusReg.overflow).toBe(0);

    statusReg.break = 1;
    expect(statusReg.break).toBe(1);
    statusReg.carry = 1;
    expect(statusReg.break).toBe(1);
  });

  it("setAccFlags should set zero and negative flags correctly", () => {
    const statusReg = new StatusReg();

    statusReg.setAccFlags(0);
    expect(statusReg.zero).toBe(1);
    expect(statusReg.negative).toBe(0);

    statusReg.setAccFlags(-128);
    expect(statusReg.zero).toBe(0);
    expect(statusReg.negative).toBe(1);
  });

  it("checkBranchCondition should return true based on flag and condition", () => {
    const statusReg = new StatusReg();
    statusReg.overflow = 1;

    expect(statusReg.checkBranchCondition(1, 1)).toBe(true); // Check overflow flag (1) with value 1
    expect(statusReg.checkBranchCondition(2, 0)).toBe(true); // Check carry flag (2) with value 0
  });
});
