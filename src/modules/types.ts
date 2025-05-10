import type { SlothContext } from '../config.js';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';

export type Message = BaseMessage;

export interface State {
    messages: Message[];
}

export interface ModelResponse {
    messages: Message[];
}

export interface ProgressCallback {
    (): void;
}

export interface ReviewOptions {
    source: string;
    preamble: string;
    diff: string;
}

export interface QuestionOptions {
    source: string;
    preamble: string;
    content: string;
}

export function createSystemMessage(content: string): SystemMessage {
    return new SystemMessage(content);
}

export function createHumanMessage(content: string): HumanMessage {
    return new HumanMessage(content);
} 