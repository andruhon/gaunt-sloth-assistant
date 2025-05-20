import { v4 as uuidv4 } from 'uuid';
import { BaseLanguageModelCallOptions } from '@langchain/core/language_models/base';

/**
 * Session interface defining the session structure
 */
export interface Session {
  configurable: {
    thread_id: string;
  };
}

/**
 * SessionManager handles managing session state
 * It provides a singleton instance for the application to use
 */
export class SessionManager {
  private static instance: SessionManager;
  private _session: Session;

  private constructor() {
    this._session = {
      configurable: {
        thread_id: uuidv4(),
      },
    };
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Get the current session
   */
  public get session(): Session {
    return this._session;
  }

  /**
   * Get session as LLM options
   * This provides compatibility with the existing invoke function
   */
  public getAsLLMOptions(): Partial<BaseLanguageModelCallOptions> {
    return this._session;
  }

  /**
   * Generate a new thread ID
   */
  public generateNewThreadId(): void {
    this._session.configurable.thread_id = uuidv4();
  }

  /**
   * Reset the session (for testing purposes)
   */
  public reset(): void {
    this._session = {
      configurable: {
        thread_id: uuidv4(),
      },
    };
  }
}
