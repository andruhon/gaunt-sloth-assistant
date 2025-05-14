import { displayError, displayWarning } from "#src/consoleUtils.js";
import type { JiraConfig } from "./types.js";

interface JiraIssueResponse {
  fields: {
    summary: string;
    description: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Gets Jira issue using Atlassian REST API v3 with Personal Access Token
 * @param config Jira configuration
 * @param issueId Jira issue ID
 * @returns Jira issue content
 */
export async function get(
  config: JiraConfig | null,
  issueId: string | undefined
): Promise<string | null> {
  if (!config) {
    displayWarning("No Jira config provided");
    return null;
  }
  if (!issueId) {
    displayWarning("No issue ID provided");
    return null;
  }
  if (!config.username) {
    displayWarning("No Jira username provided");
    return null;
  }
  if (!config.token) {
    displayWarning("No Jira token provided");
    return null;
  }
  if (!config.cloudId) {
    displayWarning("No Jira Cloud ID provided");
    return null;
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
    displayError(
      `Failed to get Jira issue: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

/**
 * Helper function to get Jira issue details using Atlassian REST API v3
 * @param config Jira configuration
 * @param jiraKey Jira issue ID
 * @returns Jira issue response
 */
async function getJiraIssue(config: JiraConfig, jiraKey: string): Promise<JiraIssueResponse> {
  console.log('Fetching issue with Scoped PAT (Personal Access Token)');
  // Jira Cloud ID can be found by authenticated user at https://company.atlassian.net/_edge/tenant_info
  
  // According to doc https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-get permissions to read this resource:
  // either Classic (RECOMMENDED) read:jira-work
  // or Granular read:issue-meta:jira, read:issue-security-level:jira, read:issue.vote:jira, read:issue.changelog:jira, read:avatar:jira, read:issue:jira, read:status:jira, read:user:jira, read:field-configuration:jira
  const apiUrl = `https://api.atlassian.com/ex/jira/${config.cloudId}/rest/api/3/issue/${jiraKey}`;

  // Encode credentials for Basic Authentication header
  const credentials = `${config.username}:${config.token}`;
  const encodedCredentials = Buffer.from(credentials).toString('base64');
  const authHeader = `Basic ${encodedCredentials}`;

  // Define request headers
  const headers = {
    'Authorization': authHeader,
    'Accept': 'application/json; charset=utf-8',
    'Accept-Language': 'en-US,en;q=0.9' // Prevents errors in other languages
  };

  console.log(`Loading Jira issue: ${jiraKey} from ${apiUrl}`);

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: headers,
  });

  if (!response.ok) {
    try {
      const errorData = await response.json();
      throw new Error(`Failed to fetch Jira issue: ${response.statusText} - ${JSON.stringify(errorData)}`);
    } catch (e) {
      throw new Error(`Failed to fetch Jira issue: ${response.statusText}`);
    }
  }

  return response.json();
}
