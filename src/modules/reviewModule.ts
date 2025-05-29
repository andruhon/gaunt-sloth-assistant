import { slothContext } from '#src/config.js';
import { display, displayDebug, displayError, displaySuccess } from '#src/consoleUtils.js';
import { generateStandardFileName, ProgressIndicator } from '#src/utils.js';
import { writeFileSync } from 'node:fs';
import { invoke } from '#src/llmUtils.js';
import { getGslothFilePath } from '#src/filePathUtils.js';

export async function review(source: string, preamble: string, diff: string): Promise<void> {
  const progressIndicator = slothContext.config.streamOutput
    ? undefined
    : new ProgressIndicator('Reviewing.');
  const outputContent = await invoke(slothContext.config.llm, preamble, diff, slothContext.config);
  progressIndicator?.stop();
  const filename = generateStandardFileName(source);
  const filePath = getGslothFilePath(filename);
  if (!slothContext.config.streamOutput) {
    display('\n' + outputContent);
  }
  try {
    writeFileSync(filePath, outputContent);
    displaySuccess(`This report can be found in ${filePath}`);
  } catch (error) {
    displayDebug(error instanceof Error ? error : String(error));
    displayError(`Failed to write review to file: ${filePath}`);
    // Consider if you want to exit or just log the error
    // exit(1);
  }
}
