interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

class Memory {
  private messages: ConversationMessage[] = [];

  async addMessage(role: 'user' | 'assistant' | 'system', content: string): Promise<void> {
    this.messages.push({
      role,
      content,
      timestamp: Date.now(),
    });
  }

  async getConversationHistory(): Promise<ConversationMessage[]> {
    return this.messages;
  }

  async clearHistory(): Promise<void> {
    this.messages = [];
  }
}

let memoryInstance: Memory | null = null;

export function getMemory(): Memory {
  if (!memoryInstance) {
    memoryInstance = new Memory();
  }
  return memoryInstance;
}
