import type { JiraConfig } from "./types.js";
/**
 * Gets Jira issue using Atlassian REST API v2
 * @param config Jira configuration
 * @param issueId Jira issue ID
 * @returns Jira issue content
 */
export declare function get(config: JiraConfig | null, issueId: string | undefined): Promise<string | null>;
