import { displayError, displayWarning } from "#src/consoleUtils.js";
import type { JiraConfig } from "./types.js";

// TODO JIRA rename jira to be simply jira (they renamed legacy tokens, to be unscoped tokens)

interface JiraIssueResponse {
    fields: {
        summary: string;
        description: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

/**
 * Gets Jira issue using Atlassian REST API v2
 * @param config Jira configuration
 * @param issueId Jira issue ID
 * @returns Jira issue content
 */
export async function get(config: JiraConfig | null, issueId: string | undefined): Promise<string | null> {
    if (!config) {
        displayWarning("No Jira config provided");
        return null;
    }
    if (!issueId) {
        displayWarning("No issue ID provided");
        return null;
    }
    if (!config.baseUrl) {
        displayWarning("No Jira base URL provided");
        return null;
    }
    // TODO JIRA add environment variable for username
    if (!config.username) {
        throw new Error("Missing JIRA username. The username can be defined as JIRA_USERNAME environment variable or as \"username\" in config.");
    }
    // TODO JIRA add environment variable for jira token
    if (!config.token) {
        throw new Error("Missing JIRA Legacy API token. The legacy token can be defined as JIRA_PERSONAL_API_TOKEN environment variable or as \"token\" in config.");
    }

    try {
        const issue = await getJiraIssue(config, issueId);
        if (!issue) {
            return null;
        }

        const summary = issue.fields.summary;
        const description = issue.fields.description;

        return `Jira Issue: ${issueId}\nSummary: ${summary}\n\nDescription:\n${description}`;
    } catch (error) {
        displayError(`Failed to get Jira issue: ${error instanceof Error ? error.message : String(error)}`);
        return null;
    }
}

/**
 * Helper function to get Jira issue details
 * @param config Jira configuration
 * @param issueId Jira issue ID
 * @returns Jira issue response
 */
async function getJiraIssue(config: JiraConfig, issueId: string): Promise<JiraIssueResponse> {
    const auth = Buffer.from(`${config.username}:${config.token}`).toString('base64');
    const response = await fetch(`${config.baseUrl}/rest/api/2/issue/${issueId}`, {
        headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch Jira issue: ${response.statusText}`);
    }

    return response.json();
} 
