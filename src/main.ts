import { NES } from "./NES";
import "./style.css";
import { readFileAsBinary } from "./utils";

const fileUploader = document.createElement("input");
fileUploader.type = "file";

// first lets make a disambelly
const loadRomInput = document.getElementById("loadRom")!;
const halt = document.getElementById("halt")! as HTMLButtonElement;
const fpsCounter = document.getElementById("fps") as HTMLButtonElement;

loadRomInput.onclick = () => fileUploader.click();

fileUploader.onchange = async (e) => {
  const file: File | undefined = (e.target as HTMLInputElement)?.files?.[0];
  if (!file) {
    return;
  }
  const buffer = new Uint8Array(await readFileAsBinary(file));
  loadRomInput.innerText = `Loaded: ${file.name}`;

  const nes = new NES(buffer);

  let halted = false;
  let startTime = performance.now();
  let frames = 0;

  halt.onclick = () => {
    halted = !halted;
    nes.toggleHalt();
    fpsCounter.disabled = !halted;
    halt.innerText = halted ? "Play" : "Pause";
  };

  try {
    // nes.cpu.programCounter = 0xc000;
    nes.onFrame = () => {
      frames++;
      const currTime = performance.now();
      const diff = currTime - startTime;
      if (diff >= 1000) {
        const fps = ((frames * 1000) / diff).toFixed(2);
        fpsCounter.innerText = `FPS : ${fps}`;
        startTime = performance.now();
        frames = 0;
      }
    };
    nes.startAnimationLoop();
  } catch (error) {
    halt.innerText = "Err";
    console.error(error);
    nes.dumpRegisters();
  }
};
