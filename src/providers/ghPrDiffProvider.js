import {spawnCommand} from "../utils.js";
import {displayWarning} from "../consoleUtils.js";

export async function get(_, pr) {
    // TODO makes sense to check if gh is available and authenticated
    if (!pr) {
        displayWarning("No PR provided, skipping PR diff fetching.");
        return "";
    }
    return spawnCommand('gh', ['pr', 'diff', pr], 'Loading PR diff...', 'Loaded PR diff.');
}
