import { slothContext } from '#src/config.js';
import { display, displayDebug, displayError, displaySuccess } from '#src/consoleUtils.js';
import { stdout } from '#src/systemUtils.js';
import { generateStandardFileName, ProgressIndicator } from '#src/utils.js';
import { writeFileSync } from 'node:fs';
import { invoke } from '#src/llmUtils.js';
import { getGslothFilePath } from '#src/filePathUtils.js';

export async function review(source: string, preamble: string, diff: string): Promise<void> {
  const progressIndicator = new ProgressIndicator('Reviewing.');
  const outputContent = await invoke(slothContext.config.llm, slothContext.session, preamble, diff);
  progressIndicator.stop();
  const filename = generateStandardFileName(source);
  const filePath = getGslothFilePath(filename);
  stdout.write('\n');
  display(`writing ${filePath}`);
  stdout.write('\n');
  // TODO highlight LLM output with something like Prism.JS (maybe system emoj are enough ✅⚠️❌)
  display(outputContent);
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
