export function readInternalPreamble(): string;
export function readPreamble(preambleFilename: string): string;
export function getPrDiff(pr: string): Promise<string>; 