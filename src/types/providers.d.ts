export interface ProviderConfig {
    [key: string]: any;
}

export function get(config: ProviderConfig | null, id: string): Promise<string> | string; 