import { BaseToolkit, StructuredToolInterface, tool } from '@langchain/core/tools';
import { z } from 'zod';
import { execSync } from 'child_process';
import { displayInfo } from '#src/consoleUtils.js';

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

interface DevToolsConfig {
  run_tests?: string;
  run_lint?: string;
  run_build?: string;
}

export default class GthDevToolkit extends BaseToolkit {
  tools: StructuredToolInterface[];
  private commands: DevToolsConfig;

  constructor(commands: DevToolsConfig = {}) {
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

  private executeCommand(command: string, toolName: string): string {
    try {
      displayInfo(`\n🔧 Executing ${toolName}: ${command}`);
      const result = execSync(command, {
        encoding: 'utf-8',
        stdio: 'pipe', // Capture output instead of inheriting
      });
      return result.toString();
    } catch (error) {
      // Simply stringify the error and return it
      return String(error);
    }
  }

  private createTools(): StructuredToolInterface[] {
    const tools: StructuredToolInterface[] = [];

    if (this.commands.run_tests) {
      tools.push(
        createGthTool(
          async (_args: z.infer<typeof RunTestsArgsSchema>): Promise<string> => {
            return this.executeCommand(this.commands.run_tests!, 'run_tests');
          },
          {
            name: 'run_tests',
            description:
              'Execute the test suite for this project. Runs the configured test command and returns the output.',
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
            return this.executeCommand(this.commands.run_lint!, 'run_lint');
          },
          {
            name: 'run_lint',
            description:
              'Run the linter on the project code. Executes the configured lint command and returns any linting errors or warnings.',
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
            return this.executeCommand(this.commands.run_build!, 'run_build');
          },
          {
            name: 'run_build',
            description:
              'Build the project. Executes the configured build command and returns the build output.',
            schema: RunBuildArgsSchema,
          },
          'execute'
        )
      );
    }

    return tools;
  }
}