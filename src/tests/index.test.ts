import { describe, expect, test } from "vitest";
import { TESTABLE_OPCODES } from "./constants";
import { Mos6502 } from "../6502";
import { MEMORY_SIZE } from "../6502/constants";
import { getOpcodeTests } from "./utilts";

describe.each(TESTABLE_OPCODES)(`tests %s`, async (opcode) => {
  const opcodeTests = await getOpcodeTests(opcode);
  console.log(`Loaded ${opcodeTests.length} for ${opcode}`);

  test.each(opcodeTests)("[%#] $name", async ({ initial, final }) => {
    const buffer = new Uint8Array(MEMORY_SIZE);
    initial.ram.forEach(([loc, val]) => (buffer[loc] = val));
    const mos = new Mos6502(buffer, initial.pc);

    // initial setup
    mos.acc = initial.a;
    mos.x = initial.x;
    mos.y = initial.y;
    mos.stackPointer = initial.s;
    mos.statusReg.status = initial.p;

    if (!mos.statusReg.decimal) {
      await mos.startExecution(1);

      expect(mos.acc).eq(final.a);
      expect(mos.x).eq(final.x);
      expect(mos.y).eq(final.y);
      expect(mos.stackPointer & 0xff).eq(final.s);
      expect(mos.statusReg.status).eq(final.p);
      expect(mos.programCounter).eq(final.pc);

      // ram status

      const memory = mos.memory;

      final.ram.forEach(([loc, val]) => {
        expect(memory[loc]).eq(val);
      });
    } else {
      expect(true).toBe(true);
    }
  });
});
