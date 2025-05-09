import { SlothContext } from './commands';

export function review(source: string, preamble: string, diff: string): Promise<void>;
export function reviewInner(context: SlothContext, indicateProgress: (message: string) => void, preamble: string, diff: string): Promise<void>;
export function askQuestion(source: string, preamble: string, content: string): Promise<void>; 