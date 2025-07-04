import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { SlothConfig } from '#src/config.js';
import { exit } from '#src/systemUtils.js';
import { displayWarning } from '#src/consoleUtils.js';

const toolDefinition = {
  name: 'gth_request_changes',
  description: `Gaunt Sloth Rejection Tool. Use this tool to request changes or reject a request, attracting submitters attention to your comments. Call it as final step of review, to conclude the review session.`,
  schema: z.void(),
};
const toolImpl = (): void => {
  displayWarning('Gaunt Sloth requested changes');
  exit(1);
};

export function get(_: SlothConfig) {
  return tool(toolImpl, toolDefinition);
}
