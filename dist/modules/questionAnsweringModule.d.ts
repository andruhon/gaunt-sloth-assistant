import type { SlothContext } from "../config.js";
import type { ProgressCallback } from "./types.js";
/**
 * Ask a question and get an answer from the LLM
 * @param source - The source of the question (used for file naming)
 * @param preamble - The preamble to send to the LLM
 * @param content - The content of the question
 */
export declare function askQuestion(source: string, preamble: string, content: string): Promise<void>;
/**
 * Inner function to ask a question and get an answer from the LLM
 * @param context - The context object
 * @param indicateProgress - Function to indicate progress
 * @param preamble - The preamble to send to the LLM
 * @param content - The content of the question
 * @returns The answer from the LLM
 */
export declare function askQuestionInner(context: SlothContext, indicateProgress: ProgressCallback, preamble: string, content: string): Promise<string>;
