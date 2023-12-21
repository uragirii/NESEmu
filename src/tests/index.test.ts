import { describe, expect, test } from "vitest";
import { TESTABLE_OPCODES } from "./constants";
import { Mos6502 } from "../6502";
import { MEMORY_SIZE } from "../6502/constants";
import { getOpcodeTests } from "./utilts";
import { testJson } from "./singletest";
import { ChipState } from "./types";

const toBin = (num: number) => num.toString(2).padStart(8, "0");

const testBuffer = async (
  buffer: Uint8Array,
  final: ChipState,
  initial: ChipState
) => {
  initial.ram.forEach(([loc, val]) => (buffer[loc] = val));
  const mos = new Mos6502(buffer, initial.pc);

  // initial setup
  mos.acc = initial.a;
  mos.x = initial.x;
  mos.y = initial.y;
  mos.stackPointer = initial.s;
  // fix for bit 4&5. BRK and Ignored are harcoded as 1
  // See https://github.com/TomHarte/ProcessorTests/issues/59
  mos.statusReg.status = initial.p | 0x30; // & set decimal flag to zero

  console.log("be", "M", toBin(mos.statusReg.status), "E", toBin(initial.p));

  await mos.startExecution(1);

  expect(mos.acc).eq(final.a);
  expect(mos.x).eq(final.x);
  expect(mos.y).eq(final.y);
  expect(mos.stackPointer & 0xff).eq(final.s);
  console.log("fi", "M", toBin(mos.statusReg.status), "E", toBin(final.p));

  expect(mos.statusReg.status | 0x30).eq(final.p | 0x30);
  expect(mos.programCounter).eq(final.pc);

  // ram status

  const memory = mos.memory;

  final.ram.forEach(([loc, val]) => {
    expect(memory[loc]).eq(val);
  });

  // clear the buffer
  initial.ram.forEach(([loc]) => (buffer[loc] = 0));
  final.ram.forEach(([loc]) => (buffer[loc] = 0));
};

describe.each(TESTABLE_OPCODES)(`tests %s`, async (opcode) => {
  const opcodeTests = await getOpcodeTests(opcode);
  console.log(`Loaded ${opcodeTests.length} for ${opcode}`);

  const buffer = new Uint8Array(MEMORY_SIZE);

  test.each(opcodeTests)("[%#] $name", async ({ initial, final }) => {
    initial.ram.forEach(([loc, val]) => (buffer[loc] = val));
    const mos = new Mos6502(buffer, initial.pc);

    // initial setup
    mos.acc = initial.a;
    mos.x = initial.x;
    mos.y = initial.y;
    mos.stackPointer = initial.s;
    // fix for bit 4&5. BRK and Ignored are harcoded as 1
    // See https://github.com/TomHarte/ProcessorTests/issues/59
    mos.statusReg.status = initial.p | 0x30; // & set decimal flag to zero

    await mos.startExecution(1);

    expect(mos.acc).eq(final.a);
    expect(mos.x).eq(final.x);
    expect(mos.y).eq(final.y);
    expect(mos.stackPointer & 0xff).eq(final.s);
    expect(mos.statusReg.status | 0x30).eq(final.p | 0x30);
    expect(mos.programCounter).eq(final.pc);

    // ram status

    const memory = mos.memory;

    final.ram.forEach(([loc, val]) => {
      expect(memory[loc]).eq(val);
    });

    // clear the buffer
    initial.ram.forEach(([loc]) => (buffer[loc] = 0));
    final.ram.forEach(([loc]) => (buffer[loc] = 0));
  });
});

// describe.only("run single test", () => {
//   test(testJson.name, async () => {
//     const buffer = new Uint8Array(MEMORY_SIZE);
//     await testBuffer(buffer, testJson.final, testJson.initial);
//   });
// });
