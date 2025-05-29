import { display, displayError, displayWarning } from '#src/consoleUtils.js';
import { env } from '#src/systemUtils.js';
import type { JiraConfig } from './types.js';

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
 *
 * TODO we need to figure out how would this work with public jira.
 *
 * @param config Jira configuration
 * @param issueId Jira issue ID
 * @returns Jira issue content
 */
export async function get(
  config: Partial<JiraConfig> | null,
  issueId: string | undefined
): Promise<string | null> {
  if (!config) {
    displayWarning('No Jira config provided');
    return null;
  }
  if (!issueId) {
    displayWarning('No issue ID provided');
    return null;
  }

  // Get username from environment variable or config
  const username = env.JIRA_USERNAME || config.username;
  if (!username) {
    throw new Error(
      'Missing JIRA username. The username can be defined as JIRA_USERNAME environment variable or as "username" in config.'
    );
  }

  // Get token from environment variable or config
  const token = env.JIRA_API_PAT_TOKEN || config.token;
  if (!token) {
    throw new Error(
      'Missing JIRA PAT token. The token can be defined as JIRA_API_PAT_TOKEN environment variable or as "token" in config.'
    );
  }

  // Get cloud ID from environment variable or config
  const cloudId = env.JIRA_CLOUD_ID || config.cloudId;
  if (!cloudId) {
    throw new Error(
      'Missing JIRA Cloud ID. The Cloud ID can be defined as JIRA_CLOUD_ID environment variable or as "cloudId" in config.'
    );
  }

  try {
    const issue = await getJiraIssue(
      {
        ...config,
        username,
        token,
        cloudId,
      },
      issueId
    );
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
 * Helper function to get Jira issue details using Atlassian REST API v2.
 *
 * The feature was initially developed to use Atlassian REST API v3, which by
 * default returns the ADF JSON format for description, which is not very useful for us.
 *
 * @param config Jira configuration
 * @param jiraKey Jira issue ID
 * @returns Jira issue response
 */
async function getJiraIssue(config: JiraConfig, jiraKey: string): Promise<JiraIssueResponse> {
  // Jira Cloud ID can be found by authenticated user at https://company.atlassian.net/_edge/tenant_info

  // According to doc https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/#api-rest-api-3-issue-issueidorkey-get permissions to read this resource:
  // https://developer.atlassian.com/cloud/jira/platform/rest/v2/api-group-issues/#api-rest-api-2-issue-issueidorkey-get
  // either Classic (RECOMMENDED) read:jira-work
  // or Granular read:issue-meta:jira, read:issue-security-level:jira, read:issue.vote:jira, read:issue.changelog:jira, read:avatar:jira, read:issue:jira, read:status:jira, read:user:jira, read:field-configuration:jira
  const apiUrl = `https://api.atlassian.com/ex/jira/${config.cloudId}/rest/api/2/issue/${jiraKey}`;
  if (config.displayUrl) {
    display(`Loading Jira issue ${config.displayUrl}${jiraKey}`);
  }
  display(`Retrieving jira from api ${apiUrl.replace(/^https?:\/\//, '')}`);

  // This filter will be necessary for V3: `&expand=renderedFields` to convert ADF to HTML
  const filters = '?fields=summary,description'; // Limit JSON to summary and description

  // Encode credentials for Basic Authentication header
  const credentials = `${config.username}:${config.token}`;
  const encodedCredentials = Buffer.from(credentials).toString('base64');
  const authHeader = `Basic ${encodedCredentials}`;

  // Define request headers
  const headers = {
    Authorization: authHeader,
    Accept: 'application/json; charset=utf-8',
    'Accept-Language': 'en-US,en;q=0.9', // Prevents errors in other languages
  };

  const response = await fetch(apiUrl + filters, {
    method: 'GET',
    headers: headers,
  });

  if (!response?.ok) {
    try {
      const errorData = await response.json();
      throw new Error(
        `Failed to fetch Jira issue: ${response.statusText} - ${JSON.stringify(errorData)}`
      );
    } catch (_e) {
      throw new Error(`Failed to fetch Jira issue: ${response?.statusText}`);
    }
  }

  return response.json();
}
