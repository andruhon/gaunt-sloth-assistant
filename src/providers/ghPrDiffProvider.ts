import { displayWarning } from "#src/consoleUtils.js";
import { execAsync } from "#src/utils.js";
import type { ProviderConfig } from "./types.js";

/**
 * Gets PR diff using gh command line tool
 * @param _ config (unused in this provider)
 * @param pr PR number
 * @returns PR diff
 */
export async function get(_: ProviderConfig | null, pr: string | undefined): Promise<string | null> {
    if (!pr) {
        displayWarning("No PR provided");
        return null;
    }
    return execAsync(`gh pr diff ${pr}`);
} 