import { describe, expect, it } from "vitest";
import { getSignedInt } from "../6502/utilts";

describe("getSignedInt", () => {
  it("should return the correct decimal value for positive numbers", () => {
    expect(getSignedInt(0b0000_0000)).toBe(0);
    expect(getSignedInt(0b0100_0000)).toBe(64);
    expect(getSignedInt(0b0010_0000)).toBe(32);
    expect(getSignedInt(0b0111_1111)).toBe(127);
  });
  it("should return the correct decimal value for negative numbers using two's complement", () => {
    expect(getSignedInt(0b1111_1111)).toBe(-1); // all ones is max negative
    expect(getSignedInt(0b1000_0000)).toBe(-128); // most significant bit set
    expect(getSignedInt(0b1101_0000)).toBe(-48); // inverted plus one
  });
  it("should work with JS values", () => {
    expect(getSignedInt(-1)).toBe(-1);
    expect(getSignedInt(-128)).toBe(-128);
    expect(getSignedInt(48)).toBe(48);
  });
});
