import { CommandLineConfigOverrides, initConfig } from '#src/config.js';
import {
  defaultStatusCallbacks,
  display,
  displayInfo,
  formatInputPrompt,
} from '#src/consoleUtils.js';
import { MemorySaver } from '@langchain/langgraph';
import { type BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
  createInterface,
  error,
  exit,
  stdin as input,
  stdout as output,
} from '#src/systemUtils.js';
import { getGslothFilePath } from '#src/filePathUtils.js';
import { appendToFile, generateStandardFileName } from '#src/utils.js';
import { readBackstory, readGuidelines, readSystemPrompt } from '#src/prompt.js';
import { GthAgentRunner } from '#src/core/GthAgentRunner.js';

export interface SessionConfig {
  mode: 'chat' | 'code';
  readModePrompt: () => string | null;
  description: string;
  readyMessage: string;
  exitMessage: string;
}

export async function createInteractiveSession(
  sessionConfig: SessionConfig,
  commandLineConfigOverrides: CommandLineConfigOverrides,
  message?: string
) {
  const config = { ...(await initConfig(commandLineConfigOverrides)) };
  const checkpointSaver = new MemorySaver();
  // Initialize Runner
  const runner = new GthAgentRunner(defaultStatusCallbacks);

  let restoreOriginalHandlers = () => {};

  try {
    await runner.init(sessionConfig.mode, config, checkpointSaver);
    const rl = createInterface({ input, output });
    let isFirstMessage = true;
    let shouldExit = false;
    let currentAbortController: AbortController | null = null;
    const logFileName = getGslothFilePath(
      generateStandardFileName(sessionConfig.mode.toUpperCase())
    );

    displayInfo(`${sessionConfig.mode} session will be logged to ${logFileName}\n`);
    displayInfo('💡 Press Ctrl+C during inference to interrupt (without exiting the session)\n');

    // Set up interrupt handler
    const setupInterruptHandler = () => {
      const originalSigintHandlers = process.listeners('SIGINT');

      const interruptHandler = () => {
        if (currentAbortController && !currentAbortController.signal.aborted) {
          display('\n🛑 Interrupting current inference...\n');
          currentAbortController.abort();
        } else {
          // If no active inference, exit the program
          display('\n👋 Exiting session...\n');
          shouldExit = true;
          rl.close();
          process.exit(0);
        }
      };

      // Remove existing SIGINT handlers and add our custom one
      process.removeAllListeners('SIGINT');
      process.on('SIGINT', interruptHandler);

      return () => {
        process.removeAllListeners('SIGINT');
        // Restore original handlers
        originalSigintHandlers.forEach((handler) => {
          process.on('SIGINT', handler as (...args: any[]) => void);
        });
      };
    };

    restoreOriginalHandlers = setupInterruptHandler();

    const processMessage = async (userInput: string): Promise<boolean> => {
      const messages: BaseMessage[] = [];
      if (isFirstMessage) {
        const systemPromptParts = [readBackstory(), readGuidelines(config.projectGuidelines)];
        const modePrompt = sessionConfig.readModePrompt();
        if (modePrompt) {
          systemPromptParts.push(modePrompt);
        }
        const systemPrompt = readSystemPrompt();
        if (systemPrompt) {
          systemPromptParts.push(systemPrompt);
        }
        messages.push(new SystemMessage(systemPromptParts.join('\n')));
      }
      messages.push(new HumanMessage(userInput));

      // Create new abort controller for this inference
      currentAbortController = new AbortController();

      try {
        const aiResponse = await runner.processMessages(messages, currentAbortController.signal);

        // Only log if not aborted
        if (!currentAbortController.signal.aborted) {
          const logEntry = `## User\n\n${userInput}\n\n## Assistant\n\n${aiResponse}\n\n`;
          appendToFile(logFileName, logEntry);
        }

        isFirstMessage = false;
        return true; // Success
      } catch (err) {
        if (err instanceof Error && err.message.includes('interrupted')) {
          display('⚠️  Inference was interrupted. You can continue with a new question.\n');
          isFirstMessage = false; // Don't resend system prompt
          return false; // Interrupted, but not an error
        }
        throw err; // Re-throw other errors
      } finally {
        currentAbortController = null;
      }
    };

    const askQuestion = async () => {
      while (!shouldExit) {
        const userInput = await rl.question(formatInputPrompt('  > '));
        if (!userInput.trim()) {
          continue; // Skip inference if no input
        }

        const lowerInput = userInput.toLowerCase();
        if (lowerInput === 'exit' || lowerInput === '/exit') {
          shouldExit = true;
          await runner.cleanup();
          rl.close();
          restoreOriginalHandlers();
          return;
        }

        // Handle help command
        if (lowerInput === '/help' || lowerInput === '?') {
          display(`
Available commands:
  exit, /exit     - Exit the session
  /help, ?        - Show this help
  Ctrl+C          - Interrupt current inference (without exiting)

Just type your question or code-related query to get started.
`);
          continue;
        }

        let shouldRetry = false;

        do {
          try {
            const success = await processMessage(userInput);
            shouldRetry = false;

            if (!success) {
              // Interrupted - don't show retry prompt
              break;
            }
          } catch (err) {
            display(
              `\n❌ Error processing message: ${err instanceof Error ? err.message : String(err)}\n`
            );
            const retryResponse = await rl.question(
              'Do you want to try again with the same prompt? (y/n): '
            );
            shouldRetry = retryResponse.toLowerCase().trim().startsWith('y');
            isFirstMessage = false; // To make sure we don't resend system prompt if the first message failed

            if (!shouldRetry) {
              display('\nSkipping to next prompt...');
            }
          }
        } while (shouldRetry && !shouldExit);

        if (!shouldExit) {
          display('\n\n');
          displayInfo(sessionConfig.exitMessage);
        }
      }
      rl.close();
      restoreOriginalHandlers();
    };

    if (message) {
      await processMessage(message);
    } else {
      display(sessionConfig.readyMessage);
      displayInfo(sessionConfig.exitMessage);
    }
    if (!shouldExit) await askQuestion();
  } catch (err) {
    await runner.cleanup();
    restoreOriginalHandlers();
    error(`Error in ${sessionConfig.mode} command: ${err}`);
    exit(1);
  }
}
