import { Mos6502 } from "./6502";
import "./style.css";

// first lets make a disambelly
const loadRomInput = document.getElementById("loadRom")!;

const readFileAsBinary = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();

    fileReader.onload = (e) => {
      const result = e.target?.result as ArrayBuffer;
      resolve(result);
    };

    fileReader.onerror = (e) => {
      console.log("error while reading file", e);
      reject(e.target?.error);
    };

    fileReader.readAsArrayBuffer(file);
  });
};

loadRomInput.onchange = async (e) => {
  const file: File | undefined = (e.target as HTMLInputElement)?.files?.[0];
  if (!file) {
    return;
  }
  const buffer = await readFileAsBinary(file);
  const mos6502 = new Mos6502(buffer, 0x400);
  try {
    await mos6502.startExecution();
  } catch (error) {
    console.error(error);
    mos6502.dumpRegisters();
  }
};
