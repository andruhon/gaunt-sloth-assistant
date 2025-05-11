import { displayError, displayWarning } from "#src/consoleUtils.js";
/**
 * Gets Jira issue using Atlassian REST API v2
 * @param config Jira configuration
 * @param issueId Jira issue ID
 * @returns Jira issue content
 */
export async function get(config, issueId) {
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
    if (!config.baseUrl) {
        displayWarning("No Jira base URL provided");
        return null;
    }
    if (!config.token) {
        displayWarning("No Jira token provided");
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
    }
    catch (error) {
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
async function getJiraIssue(config, issueId) {
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
//# sourceMappingURL=jiraIssueLegacyAccessTokenProvider.js.map