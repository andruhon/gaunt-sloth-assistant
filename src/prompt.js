import {resolve} from "node:path";
import {SLOTH_INTERNAL_PREAMBLE, slothContext} from "./config.js";
import {readFileSyncWithMessages, spawnCommand} from "./utils.js";

export function readInternalPreamble() {
    const filePath = resolve(slothContext.installDir, SLOTH_INTERNAL_PREAMBLE);
    return readFileSyncWithMessages(filePath, "Error reading internal preamble file at:")
}

export function readPreamble(preambleFilename) {
    const filePath = resolve(slothContext.currentDir, preambleFilename);
    return readFileSyncWithMessages(
        filePath,
        "Error reading preamble file at:",
        "Consider running `gsloth init` to set up your project. Check `gsloth init --help` to see options."
    )
}

/**
 * This function expects https://cli.github.com/ to be installed and authenticated.
 */
export async function getPrDiff(pr) {
    // TODO makes sense to check if gh is available and authenticated
    return spawnCommand('gh', ['pr', 'diff', pr], 'Loading PR diff...', 'Loaded PR diff.');
}
