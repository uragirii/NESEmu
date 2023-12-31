import { beforeAll } from "vitest";
import fs from "fs";
import { JSON_FOLDER, TESTABLE_OPCODES } from "./constants";

const GITHUB_LINK =
  "https://raw.githubusercontent.com/TomHarte/ProcessorTests/main/nes6502/v1/";

const downloadTest = async (opcode: string) => {
  console.log(`Downloading tests for 0x${opcode}`);
  const res = await fetch(`${GITHUB_LINK}${opcode.toLowerCase()}.json`);
  const json = await res.text();
  return fs.promises.writeFile(
    `${__dirname}/${JSON_FOLDER}/${opcode}.json`,
    json
  );
};

beforeAll(async () => {
  if (!fs.existsSync(`${__dirname}/${JSON_FOLDER}`)) {
    fs.mkdirSync(`${__dirname}/${JSON_FOLDER}`);
  }
  await Promise.all(
    TESTABLE_OPCODES.map(async (opcode) => {
      if (!fs.existsSync(`${__dirname}/${JSON_FOLDER}/${opcode}.json`)) {
        await downloadTest(opcode);
        console.log(`Download complete for 0x${opcode}`);
      }
    })
  );
  console.log(
    fs.readdirSync(`${__dirname}/${JSON_FOLDER}`),
    `${__dirname}/${JSON_FOLDER}`
  );
});
