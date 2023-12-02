// import { I8080 } from "./8080";
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
  console.log(buffer);
  // const i8080 = new I8080(buffer, true);
  // i8080.printRegistors();
};
