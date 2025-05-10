import { HumanMessage, SystemMessage } from '@langchain/core/messages';
export function createSystemMessage(content) {
    return new SystemMessage(content);
}
export function createHumanMessage(content) {
    return new HumanMessage(content);
}
//# sourceMappingURL=types.js.map