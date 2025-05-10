import type { ProviderConfig } from "./types.js";
/**
 * Reads the text file from current dir
 * @param _ config (unused in this provider)
 * @param fileName
 * @returns file contents
 */
export declare function get(_: ProviderConfig | null, fileName: string | undefined): Promise<string | null>;
