import { NES } from "./NES";
import "./style.css";
import { readFileAsBinary } from "./utils";
import { deleteROM, getPastROMs, saveROM } from "./storage";

const fileUploader = document.createElement("input");
fileUploader.type = "file";

const loadRomInput = document.getElementById("loadRom")!;
const halt = document.getElementById("halt")! as HTMLButtonElement;
const fpsCounter = document.getElementById("fps") as HTMLButtonElement;
const pastROMsContainer = document.getElementById("past-roms-ctn")!;
const screenContainer = document.getElementById("screen-ctn")!;

const loadFileInNES = async (file: File) => {
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

const showPastROMs = async () => {
  const roms = await getPastROMs();
  if (roms.length === 0) {
    pastROMsContainer.innerText =
      "No ROMs found. Select a ROM and it will appear here";
    return;
  }

  pastROMsContainer.innerHTML = "";

  roms.forEach(({ file, key }) => {
    const li = document.createElement("li");

    const bullet = document.createElement("div");
    bullet.style.height = "5px";
    bullet.style.width = "5px";
    bullet.style.backgroundColor = "white";
    bullet.style.borderRadius = "5px";
    li.appendChild(bullet);

    li.innerHTML += file.name;
    li.style.display = "flex";
    li.style.alignItems = "center";
    li.style.gap = "0.5em";

    const loadAnchor = document.createElement("a");
    const deleteAnchor = document.createElement("a");

    loadAnchor.innerText = "Load";
    deleteAnchor.innerText = "Delete";

    loadAnchor.href = "#";
    deleteAnchor.href = "#";

    loadAnchor.onclick = () => {
      screenContainer.innerHTML = "";

      loadFileInNES(file);
    };

    deleteAnchor.onclick = () => {
      deleteROM(key).then(() => {
        showPastROMs();
      });
    };

    li.appendChild(loadAnchor);
    li.appendChild(deleteAnchor);

    pastROMsContainer.appendChild(li);
  });
};

showPastROMs();

loadRomInput.onclick = () => fileUploader.click();

fileUploader.onchange = async (e) => {
  const file: File | undefined = (e.target as HTMLInputElement)?.files?.[0];
  if (!file) {
    return;
  }

  screenContainer.innerHTML = "";

  await saveROM(file);
  return loadFileInNES(file);
};
