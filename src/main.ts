import { Mos6502 } from "./6502";
import { NES } from "./NES";
import "./style.css";
import { readFileAsBinary } from "./utils";

const fileUploader = document.createElement("input");
fileUploader.type = "file";

// first lets make a disambelly
const loadRomInput = document.getElementById("loadRom")!;
const nmi = document.getElementById("nmi")! as HTMLButtonElement;
const halt = document.getElementById("halt")! as HTMLButtonElement;
const drawBtn = document.getElementById("draw")! as HTMLButtonElement;

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

loadRomInput.onclick = () => fileUploader.click();

fileUploader.onchange = async (e) => {
  const file: File | undefined = (e.target as HTMLInputElement)?.files?.[0];
  if (!file) {
    return;
  }
  const buffer = new Uint8Array(await readFileAsBinary(file));
  loadRomInput.innerText = `Loaded: ${file.name}`;

  const nes = new NES(buffer);

  nmi.onclick = () => {
    console.log("Triggering NMI");
    nes.cpu.nmi();
  };

  let halted = false;

  halt.onclick = () => {
    halted = !halted;
    nes.cpu.toggleHalt();
    halt.innerText = halted ? "Play" : "Pause";
  };

  drawBtn.onclick = () => {
    nes.ppu.updateScreen();
    nes.cpu.nmi();
  };

  try {
    // nes.cpu.programCounter = 0xc000;
    await nes.startLoop();
  } catch (error) {
    halt.innerText = "Err";
    console.error(error);
    nes.cpu.dumpRegisters();
    nes.ppu.dumpRegisters();
  }
};
