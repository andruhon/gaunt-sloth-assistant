export function readInternalPreamble(): string | undefined;
export function readPreamble(preambleFilename: any): string | undefined;
/**
 * This function expects https://cli.github.com/ to be installed and authenticated.
 * It does something like `gh pr diff 42`
 */
export function getPrDiff(pr: any): Promise<any>;
