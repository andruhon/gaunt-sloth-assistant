export interface ProviderConfig {
  username?: string;
  token?: string;
  baseUrl?: string;
  [key: string]: unknown;
}

export interface JiraConfig extends ProviderConfig {
  username: string;
  baseUrl: string;
  token?: string;
}

export interface Provider {
  get: (config: ProviderConfig | null, id: string | undefined) => Promise<string | null>;
}
