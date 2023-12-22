import { Mos6502 } from "./6502";
import "./style.css";
import { readFileAsBinary } from "./utils";

// first lets make a disambelly
const loadRomInput = document.getElementById("loadRom")!;

const mainReg = document.getElementById("main-reg")!;
const otherReg = document.getElementById("other-reg")!;
const memoryBox = document.getElementById("memory")!;
const opcodeBox = document.getElementById("opcode")!;

const toHex = (num: number) => num.toString(16).padStart(2, "0");

const updateUI = (opcode: number, mos: Mos6502) => {
  const pc = mos.programCounter - 1;
  mainReg.innerHTML = `
  <code>A: ${mos.acc}/0x${mos.acc.toString(16).padStart(2, "0")}</code>
  <code>X: ${mos.x}/0x${mos.x.toString(16).padStart(2, "0")}</code>
  <code>Y: ${mos.y}/0x${mos.y.toString(16).padStart(2, "0")}</code>
  `;
  otherReg.innerHTML = `
  <code>PC: ${pc}/0x${pc.toString(16).padStart(4, "0")}</code>
  <code>SP: ${mos.stackPointer}/0x${mos.acc
    .toString(16)
    .padStart(4, "0")}</code>
  <code>Status: 0b${mos.statusReg.status.toString(2).padStart(8, "0")}</code>
  `;

  // memory stuff
  const memory = mos.memory;

  memoryBox.innerText = `0x${pc.toString(16).padStart(4, "0")}: ${toHex(
    memory[pc]
  )} ${toHex(memory[pc + 1])} ${toHex(memory[pc + 2])} ${toHex(
    memory[pc + 3]
  )} ${toHex(memory[pc + 4])} ${toHex(memory[pc + 5])}`;

  opcodeBox.innerText = `Opcode : 0x${opcode.toString(16).padStart(2, "0")}`;
};

loadRomInput.onchange = async (e) => {
  const file: File | undefined = (e.target as HTMLInputElement)?.files?.[0];
  if (!file) {
    return;
  }
  const isNesFile = file.name.endsWith(".nes");
  let buffer = await readFileAsBinary(file);
  if (isNesFile) {
    buffer = buffer.slice(0x10, 0x4010);
  }
  const mos6502 = new Mos6502(
    buffer,
    isNesFile ? 0xc000 : 0x400,
    isNesFile ? 0x8000 : undefined
  );
  try {
    await mos6502.startExecution(
      Infinity,
      (opcode) => updateUI(opcode, mos6502),
      (opcode) => updateUI(opcode, mos6502)
    );
  } catch (error) {
    console.error(error);
    mos6502.dumpRegisters();
  }
};
