import type { SlothConfig } from '#src/config.js';
import { display, displayError, displaySuccess } from '#src/consoleUtils.js';
import { getGslothFilePath } from '#src/filePathUtils.js';
import { generateStandardFileName, ProgressIndicator } from '#src/utils.js';
import { writeFileSync } from 'node:fs';
import { invoke } from '#src/llmUtils.js';
import type { CommandType } from '#src/types/command.js';

/**
 * Process a request and get a response from the LLM
 * @param source - The source of the request (used for file naming)
 * @param preamble - The preamble to send to the LLM
 * @param content - The content of the request
 * @param config - The application configuration
 * @param commandType - The type of command ('ask' or 'code')
 */
export async function processRequest(
  source: string,
  preamble: string,
  content: string,
  config: SlothConfig,
  commandType: CommandType = 'ask'
): Promise<void> {
  const progressIndicator = config.streamOutput ? undefined : new ProgressIndicator('Thinking.');
  const outputContent = await invoke(config.llm, preamble, content, config, commandType);
  progressIndicator?.stop();
  const filename = generateStandardFileName(source);
  const filePath = getGslothFilePath(filename);
  if (!config.streamOutput) {
    display('\n' + outputContent);
  }
  try {
    writeFileSync(filePath, outputContent);
    displaySuccess(`\nThis report can be found in ${filePath}`);
  } catch (error) {
    displayError(`Failed to write response to file: ${filePath}`);
    displayError(error instanceof Error ? error.message : String(error));
    // TODO Consider if we want to exit or just log the error
    // exit(1);
  }
}
