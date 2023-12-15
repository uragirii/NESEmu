const ADC_OPCODES = ["69", "65", "6d", "7d", "79", "61", "71", "75"];
const LDX_OPCODES = ["a2", "a6", "b6", "ae", "be"];
const LDA_OPCODES = ["a9", "a5", "b5", "ad", "bd", "b9", "a1", "b1"];
const EXTRA = ["9a", "d8"];
const JUMP_OPCODES = ["4c", "6c"];
const STA_OPCODES = ["85", "95", "8d", "9d", "99", "81", "91"];
const BRANCH_OPCODES = ["90", "b0", "f0", "30", "d0", "10"];
const DEC_OPCODES = ["ca", "88"];
const LDY = ["a0", "a4", "b4", "ac", "bc"];
const CMP_OPCODES = ["c9", "c5", "d5", "cd", "dd", "d9", "c1", "d1"];
const ORA_OPCODES = ["01", "05", "09", "0d", "11", "15", "19", "1d"];
const AND_OPCODES = ["21", "25", "29", "2d", "31", "35", "39", "3d"];
const EOR_OPCODES = ["41", "45", "49", "4d", "51", "55", "59", "5d"];
const CMX_OPCODES = ["e0", "e4", "ec"];
const CMY_OPCODES = ["c0", "c4", "cc"];
const STACK_OPCODES = ["08", "28", "48", "68"];

export const TESTABLE_OPCODES: string[] = ([] as string[]).concat(
  ADC_OPCODES,
  LDX_OPCODES,
  LDA_OPCODES,
  EXTRA,
  JUMP_OPCODES,
  STA_OPCODES,
  BRANCH_OPCODES,
  DEC_OPCODES,
  LDY,
  CMP_OPCODES,
  ORA_OPCODES,
  AND_OPCODES,
  EOR_OPCODES,
  CMX_OPCODES,
  CMY_OPCODES,
  STACK_OPCODES
);

export const JSON_FOLDER = "testJsons";
