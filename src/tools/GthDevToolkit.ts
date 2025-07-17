import { BaseToolkit, StructuredToolInterface, tool } from '@langchain/core/tools';
import { z } from 'zod';
import { spawn } from 'child_process';
import { displayInfo, displayError } from '#src/consoleUtils.js';
import { GthDevToolsConfig } from '#src/config.js';

// Helper function to create a tool with dev type
function createGthTool<T extends z.ZodSchema>(
  fn: (args: z.infer<T>) => Promise<string>,
  config: {
    name: string;
    description: string;
    schema: T;
  },
  gthDevType: 'execute'
): StructuredToolInterface {
  const toolInstance = tool(fn, config);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (toolInstance as any).gthDevType = gthDevType;
  return toolInstance;
}

// Schema definitions
const RunTestsArgsSchema = z.object({});
const RunLintArgsSchema = z.object({});
const RunBuildArgsSchema = z.object({});

export default class GthDevToolkit extends BaseToolkit {
  tools: StructuredToolInterface[];
  private commands: GthDevToolsConfig;

  constructor(commands: GthDevToolsConfig = {}) {
    super();
    this.commands = commands;
    this.tools = this.createTools();
  }

  /**
   * Get tools filtered by operation type
   */
  getFilteredTools(allowedOperations: 'execute'[]): StructuredToolInterface[] {
    return this.tools.filter((tool) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolType = (tool as any).gthDevType;
      return allowedOperations.includes(toolType);
    });
  }

  private async executeCommand(command: string, toolName: string): Promise<string> {
    displayInfo(`\n🔧 Executing ${toolName}: ${command}`);

    return new Promise((resolve, reject) => {
      const child = spawn(command, {
        shell: true,
        stdio: 'inherit', // Show output in real-time
      });

      let output = '';

      // Capture output if available (when stdio is not 'inherit')
      if (child.stdout) {
        child.stdout.on('data', (data) => {
          output += data.toString();
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          output += data.toString();
        });
      }

      child.on('close', (code) => {
        if (code === 0) {
          resolve(output || `Command '${command}' completed successfully`);
        } else {
          const errorMsg = `Command '${command}' exited with code ${code}`;
          displayError(errorMsg);
          reject(new Error(errorMsg + (output ? `\nOutput: ${output}` : '')));
        }
      });

      child.on('error', (error) => {
        const errorMsg = `Failed to execute command '${command}': ${error.message}`;
        displayError(errorMsg);
        reject(new Error(errorMsg));
      });
    });
  }

  private createTools(): StructuredToolInterface[] {
    const tools: StructuredToolInterface[] = [];

    if (this.commands.run_tests) {
      tools.push(
        createGthTool(
          async (_args: z.infer<typeof RunTestsArgsSchema>): Promise<string> => {
            return await this.executeCommand(this.commands.run_tests!, 'run_tests');
          },
          {
            name: 'run_tests',
            description:
              'Execute the test suite for this project. Runs the configured test command and returns the output.' +
              `\nThe configured command is [${this.commands.run_tests!}].`,
            schema: RunTestsArgsSchema,
          },
          'execute'
        )
      );
    }

    if (this.commands.run_lint) {
      tools.push(
        createGthTool(
          async (_args: z.infer<typeof RunLintArgsSchema>): Promise<string> => {
            return await this.executeCommand(this.commands.run_lint!, 'run_lint');
          },
          {
            name: 'run_lint',
            description:
              'Run the linter on the project code. Executes the configured lint command and returns any linting errors or warnings.' +
              `\nThe configured command is [${this.commands.run_lint!}].`,
            schema: RunLintArgsSchema,
          },
          'execute'
        )
      );
    }

    if (this.commands.run_build) {
      tools.push(
        createGthTool(
          async (_args: z.infer<typeof RunBuildArgsSchema>): Promise<string> => {
            return await this.executeCommand(this.commands.run_build!, 'run_build');
          },
          {
            name: 'run_build',
            description:
              'Build the project. Executes the configured build command and returns the build output.' +
              `\nThe configured command is [${this.commands.run_build!}].`,
            schema: RunBuildArgsSchema,
          },
          'execute'
        )
      );
    }

    return tools;
  }
}
