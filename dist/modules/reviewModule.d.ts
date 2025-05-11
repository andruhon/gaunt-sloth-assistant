import type { SlothContext } from "#src/config.js";
import type { ProgressCallback } from "#src/modules/types.js";
export declare function review(source: string, preamble: string, diff: string): Promise<void>;
export declare function reviewInner(context: SlothContext, indicateProgress: ProgressCallback, preamble: string, diff: string): Promise<string>;
