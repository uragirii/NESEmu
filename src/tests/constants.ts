const ADC_OPCODES = ["69", "65", "6d", "7d", "79", "61", "71", "75"];
const LDX_OPCODES = ["a2", "a6", "b6", "ae", "be"];
const LDA_OPCODES = ["a9", "a5", "b5", "ad", "bd", "b9", "a1", "b1"];
const EXTRA = ["9a", "d8"];
const JUMP_OPCODES = ["4c", "6c"];
const STA_OPCODES = ["85", "95", "8d", "9d", "99", "81", "91"];
const BRANCH_OPCODES = ["90", "b0", "f0", "30", "d0", "10"];
const DEC_OPCODES = ["ca", "88"];
const LDY = ["a0", "a4", "b4", "ac", "bc"];

export const TESTABLE_OPCODES: string[] = ([] as string[]).concat(
  ADC_OPCODES,
  LDX_OPCODES,
  LDA_OPCODES,
  EXTRA,
  JUMP_OPCODES,
  STA_OPCODES,
  BRANCH_OPCODES,
  DEC_OPCODES,
  LDY
);

export const JSON_FOLDER = "testJsons";
