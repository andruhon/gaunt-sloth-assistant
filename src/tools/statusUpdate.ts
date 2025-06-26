import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import chalk from 'chalk';
import { display } from '#src/consoleUtils.js';

export const statusUpdate = tool(
  (s: string): void => {
    display(chalk.grey(s));
  },
  {
    name: 'status_update',
    description: `Status Update Tool. Use this tool to update status in the console. Example: status_update "Working on something important", be brief, feel free to use emojis. Update after using tools.`,
    schema: z.string(),
  }
);
