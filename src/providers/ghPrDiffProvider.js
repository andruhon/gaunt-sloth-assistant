import {spawnCommand} from "../utils.js";

export async function get(pr) {
    // TODO makes sense to check if gh is available and authenticated
    return spawnCommand('gh', ['pr', 'diff', pr], 'Loading PR diff...', 'Loaded PR diff.');
}