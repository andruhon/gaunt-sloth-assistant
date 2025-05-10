import type { ProviderConfig } from "./types.js";
/**
 * Gets PR diff using gh command line tool
 * @param _ config (unused in this provider)
 * @param pr PR number
 * @returns PR diff
 */
export declare function get(_: ProviderConfig | null, pr: string | undefined): Promise<string | null>;
