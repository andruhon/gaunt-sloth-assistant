export declare function readInternalPreamble(): string;
export declare function readPreamble(preambleFilename: string): string;
/**
 * This function expects https://cli.github.com/ to be installed and authenticated.
 * It does something like `gh pr diff 42`
 */
export declare function getPrDiff(pr: string): Promise<string>;
