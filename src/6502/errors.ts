export const throwUnknown = (opcode: number) => {
  throw new Error(`unknown opcode ${opcode.toString(16)}`);
};
