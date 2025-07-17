import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { displayInfo } from '#src/consoleUtils.js';
import { GthConfig } from '#src/config.js';
import chalk from 'chalk';

/**
 * Sequential thinking tool
 * Inspired by https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking
 */

const gthSequentialThinkingSchema = z.object({
  thought: z.string().describe('Your current thinking step'),
  nextThoughtNeeded: z.boolean().describe('Whether another thought step is needed'),
  thoughtNumber: z.number().int().min(1).describe('Current thought number'),
  totalThoughts: z.number().int().min(1).describe('Estimated total thoughts needed'),
  isRevision: z.boolean().optional().describe('Whether this revises previous thinking'),
  revisesThought: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe('Which thought is being reconsidered'),
  branchFromThought: z.number().int().min(1).optional().describe('Branching point thought number'),
  branchId: z.string().optional().describe('Branch identifier'),
  needsMoreThoughts: z.boolean().optional().describe('If more thoughts are needed'),
});

interface ThoughtData {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
  nextThoughtNeeded: boolean;
}

class SequentialThinkingProcessor {
  private thoughtHistory: ThoughtData[] = [];
  private branches: Record<string, ThoughtData[]> = {};
  private disableThoughtLogging: boolean;

  constructor() {
    this.disableThoughtLogging =
      (process.env.DISABLE_THOUGHT_LOGGING || '').toLowerCase() === 'true';
  }

  private formatThought(thoughtData: ThoughtData): string {
    const {
      thoughtNumber,
      totalThoughts,
      thought,
      isRevision,
      revisesThought,
      branchFromThought,
      branchId,
    } = thoughtData;

    let prefix = '';
    let context = '';

    if (isRevision) {
      prefix = chalk.yellow('🔄 Revision');
      context = ` (revising thought ${revisesThought})`;
    } else if (branchFromThought) {
      prefix = chalk.green('🌿 Branch');
      context = ` (from thought ${branchFromThought}, ID: ${branchId})`;
    } else {
      prefix = chalk.blue('💭 Thought');
      context = '';
    }

    const header = `${prefix} ${thoughtNumber}/${totalThoughts}${context}`;

    return `
=== ${header} ===
${thought}
`;
  }

  public processThought(input: z.infer<typeof gthSequentialThinkingSchema>): string {
    const validatedInput: ThoughtData = {
      ...input,
      nextThoughtNeeded: input.nextThoughtNeeded,
    };

    if (validatedInput.thoughtNumber > validatedInput.totalThoughts) {
      validatedInput.totalThoughts = validatedInput.thoughtNumber;
    }

    this.thoughtHistory.push(validatedInput);

    if (validatedInput.branchFromThought && validatedInput.branchId) {
      if (!this.branches[validatedInput.branchId]) {
        this.branches[validatedInput.branchId] = [];
      }
      this.branches[validatedInput.branchId].push(validatedInput);
    }

    if (!this.disableThoughtLogging) {
      const formattedThought = this.formatThought(validatedInput);
      displayInfo(formattedThought);
    }

    return JSON.stringify(
      {
        thoughtNumber: validatedInput.thoughtNumber,
        totalThoughts: validatedInput.totalThoughts,
        nextThoughtNeeded: validatedInput.nextThoughtNeeded,
        branches: Object.keys(this.branches),
        thoughtHistoryLength: this.thoughtHistory.length,
      },
      null,
      2
    );
  }
}

const toolDefinition = {
  name: 'gth_sequential_thinking',
  description: `Gaunt Sloth Sequential Thinking Tool. A detailed tool for dynamic and reflective problem-solving through thoughts.
This tool helps analyze problems through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

When to use this tool:
- Breaking down complex problems into steps
- Planning and design with room for revision
- Analysis that might need course correction
- Problems where the full scope might not be clear initially
- Problems that require a multi-step solution
- Tasks that need to maintain context over multiple steps
- Situations where irrelevant information needs to be filtered out

Key features:
- You can adjust total_thoughts up or down as you progress
- You can question or revise previous thoughts
- You can add more thoughts even after reaching what seemed like the end
- You can express uncertainty and explore alternative approaches
- Not every thought needs to build linearly - you can branch or backtrack
- Generates a solution hypothesis
- Verifies the hypothesis based on the Chain of Thought steps
- Repeats the process until satisfied
- Provides a correct answer

Parameters explained:
- thought: Your current thinking step, which can include regular analytical steps, revisions, questions, realizations, changes in approach, hypothesis generation, or verification
- nextThoughtNeeded: True if you need more thinking, even if at what seemed like the end
- thoughtNumber: Current number in sequence (can go beyond initial total if needed)
- totalThoughts: Current estimate of thoughts needed (can be adjusted up/down)
- isRevision: A boolean indicating if this thought revises previous thinking
- revisesThought: If isRevision is true, which thought number is being reconsidered
- branchFromThought: If branching, which thought number is the branching point
- branchId: Identifier for the current branch (if any)
- needsMoreThoughts: If reaching end but realizing more thoughts needed

Example: gth_sequential_thinking({ thought: "Let me analyze this problem step by step", nextThoughtNeeded: true, thoughtNumber: 1, totalThoughts: 7 })`,
  schema: gthSequentialThinkingSchema,
};

export function get(_: GthConfig) {
  const processor = new SequentialThinkingProcessor();

  const toolImpl = (input: z.infer<typeof gthSequentialThinkingSchema>): string => {
    return processor.processThought(input);
  };

  return tool(toolImpl, toolDefinition);
}
