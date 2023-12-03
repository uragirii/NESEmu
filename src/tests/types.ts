export type ChipState = {
  pc: number;
  /**
   * Stack Pointer
   */
  s: number;
  a: number;
  x: number;
  y: number;
  /**
   * Status Pointer
   */
  p: number;
  ram: [number, number][];
};

export type OpcodeTest = {
  name: string;
  initial: ChipState;
  final: ChipState;
  cycles: [number, number, "read" | "write"][];
};
