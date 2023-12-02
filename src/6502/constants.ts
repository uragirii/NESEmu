import { AddressingMode } from "./types";

export const MEMORY_SIZE = 2 ** 16;
// 1.79Mhz
export const CYCLES_PER_SECOND = 1790000;

export const DEBUG_LOC: null | number = null;

// 000	#immediate
// 001	zero page
// 010	accumulator
// 011	absolute
// 101	zero page,X
// 111	absolute,X

export const ADDRESSING_C_10: Record<number, AddressingMode> = {
  0b000: "immediate",
  0b001: "zpg",
  0b010: "accumulator",
  0b011: "absolute",
  0b101: "zpg-x",
  0b111: "abs-x",
};

// 000	(zero page,X)
// 001	zero page
// 010	#immediate
// 011	absolute
// 100	(zero page),Y
// 101	zero page,X
// 110	absolute,Y
// 111	absolute,X

export const ADDRESSING_C_01: Record<number, AddressingMode> = {
  0b000: "x-indirect",
  0b001: "zpg",
  0b010: "immediate",
  0b011: "absolute",
  0b100: "indirect-y",
  0b101: "zpg-x",
  0b110: "abs-y",
  0b111: "abs-x",
};
