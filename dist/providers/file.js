import { resolve } from "node:path";
import { slothContext } from "../config.js";
import { display } from "../consoleUtils.js";
import { readFileSyncWithMessages } from "../utils.js";
/**
 * Reads the text file from current dir
 * @param _ config (unused in this provider)
 * @param fileName
 * @returns file contents
 */
export async function get(_, fileName) {
    if (!fileName) {
        return null;
    }
    if (!slothContext.currentDir) {
        throw new Error('Current directory not set');
    }
    const filePath = resolve(slothContext.currentDir, fileName);
    display(`Reading file ${fileName}...`);
    return readFileSyncWithMessages(filePath);
}
//# sourceMappingURL=file.js.map