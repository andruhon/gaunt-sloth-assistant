import { resolve } from "node:path";
import { slothContext } from "#src/config.js";
import { display } from "#src/consoleUtils.js";
import { readFileSyncWithMessages } from "#src/utils.js";
import type { ProviderConfig } from "./types.js";

/**
 * Reads the text file from current dir
 * @param _ config (unused in this provider)
 * @param fileName
 * @returns file contents
 */
export async function get(
  _: ProviderConfig | null,
  fileName: string | undefined
): Promise<string | null> {
  if (!fileName) {
    return null;
  }
  if (!slothContext.currentDir) {
    throw new Error("Current directory not set");
  }
  const filePath = resolve(slothContext.currentDir, fileName);
  display(`Reading file ${fileName}...`);
  return readFileSyncWithMessages(filePath);
}
