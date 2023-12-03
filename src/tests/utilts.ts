import { JSON_FOLDER } from "./constants";
import { OpcodeTest } from "./types";
import fs from "fs";

export const getOpcodeTests = async (opcode: string) => {
  const rawJSON = await fs.promises.readFile(
    `${__dirname}/${JSON_FOLDER}/${opcode}.json`,
    { encoding: "utf-8" }
  );
  const jsonTests: OpcodeTest[] = JSON.parse(rawJSON);
  return jsonTests;
};
