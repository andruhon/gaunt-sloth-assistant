import type { SlothContext } from "../config.js";
import type { ProgressCallback } from "./types.js";
export declare function review(source: string, preamble: string, diff: string): Promise<void>;
export declare function reviewInner(context: SlothContext, indicateProgress: ProgressCallback, preamble: string, diff: string): Promise<string>;
