/**
 * Ask a question and get an answer from the LLM
 * @param {string} source - The source of the question (used for file naming)
 * @param {string} preamble - The preamble to send to the LLM
 * @param {string} content - The content of the question
 */
export function askQuestion(source: string, preamble: string, content: string): Promise<void>;
/**
 * Inner function to ask a question and get an answer from the LLM
 * @param {Object} context - The context object
 * @param {Function} indicateProgress - Function to indicate progress
 * @param {string} preamble - The preamble to send to the LLM
 * @param {string} content - The content of the question
 * @returns {string} The answer from the LLM
 */
export function askQuestionInner(context: Object, indicateProgress: Function, preamble: string, content: string): string;
