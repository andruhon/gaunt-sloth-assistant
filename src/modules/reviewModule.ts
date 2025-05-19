import { slothContext } from '#src/config.js';
import { display, displayDebug, displayError, displaySuccess } from '#src/consoleUtils.js';
import { stdout } from '#src/systemUtils.js';
import { generateStandardFileName, ProgressIndicator } from '#src/utils.js';
import { writeFileSync } from 'node:fs';
import { invoke } from '#src/llmUtils.js';
import { getGslothFilePath } from '#src/filePathUtils.js';
import { NodeFileStore } from 'langchain/stores/file/node';
import { getCurrentDir } from '#src/systemUtils.js';

// FIXME ther's something wonky about exports of tools in langchain package
import { ReadFileTool } from '../../node_modules/langchain/dist/tools/fs.js';

export async function review(source: string, preamble: string, diff: string): Promise<void> {
  const progressIndicator = new ProgressIndicator('Reviewing.');

  // Create file access tool with the current directory as base path
  const currentDir = getCurrentDir();
  const fileStore = new NodeFileStore(currentDir);
  const readFileTool = new ReadFileTool({ store: fileStore });

  // Add instructions about the tool to the preamble
  const toolPreamble = `${preamble}

You have access to a tool to read files from the repository:
- Tool name: ${readFileTool.name}
- Description: ${readFileTool.description}
- Usage: To read a file, specify its path relative to the current directory.

If you experience # aliases in file paths they refer to the root of current dir, omit them.

Use this tool to access relevant files mentioned in the code or to understand context. 
Don't hesitate to look at related files when reviewing code.`;

  // Invoke LLM with the tool
  const outputContent = await invoke(
    slothContext.config.llm,
    slothContext.session,
    toolPreamble,
    diff,
    [readFileTool]
  );

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
