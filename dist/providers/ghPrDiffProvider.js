import { displayWarning } from "#src/consoleUtils.js";
import { execAsync } from "#src/utils.js";
/**
 * Gets PR diff using gh command line tool
 * @param _ config (unused in this provider)
 * @param pr PR number
 * @returns PR diff
 */
export async function get(_, pr) {
    if (!pr) {
        displayWarning("No PR provided");
        return null;
    }
    return execAsync(`gh pr diff ${pr}`);
}
//# sourceMappingURL=ghPrDiffProvider.js.map