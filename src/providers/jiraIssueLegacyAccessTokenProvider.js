import {display, displayWarning} from "../consoleUtils.js";
import { env } from "../systemUtils.js";

export async function get(config, prId) {
    const issueData = await getJiraIssue(config, prId);
    return `## ${prId} Requirements - ${issueData.fields?.summary}\n\n${issueData.fields?.description}`;
}

/**
 * Fetches a Jira issue using the Atlassian REST API v2.
 *
 * @async
 * @param {object} config - Configuration object.
 * @param {string} config.username - Your Jira email address or username used for authentication.
 * @param {string} config.token - Your Jira API token (legacy access token).
 * @param {string} config.baseUrl - The base URL of your Jira instance API (e.g., 'https://your-domain.atlassian.net/rest/api/2/issue/').
 * @param {string} jiraKey - The Jira issue key (e.g., 'UI-1005').
 * @returns {Promise<object>} A promise that resolves with the Jira issue data as a JSON object.
 * @throws {Error} Throws an error if the fetch fails, authentication is wrong, the issue is not found, or the response status is not OK.
 */
async function getJiraIssue(config, jiraKey) {
    const {username, baseUrl} = config;
    if (!jiraKey) {
        displayWarning("No jiraKey provided, skipping Jira issue fetching.");
        return "";
    }
    const token = env.JIRA_LEGACY_API_TOKEN ?? config?.token;

    if (!token) {
        throw new Error(
            'Missing JIRA Legacy API token. ' +
            'The legacy token can be defined as JIRA_LEGACY_API_TOKEN environment variable or as "token" in config.'
        );
    }

    // Validate essential inputs
    if (!username || !baseUrl) {
        throw new Error('Missing required parameters in config: username or baseUrl');
    }

    // Ensure baseUrl doesn't end with a slash to avoid double slashes in the URL
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    // Construct the full API URL
    const apiUrl = `${cleanBaseUrl}/${jiraKey}`;

    // Encode credentials for Basic Authentication header
    const credentials = `${username}:${token}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');
    const authHeader = `Basic ${encodedCredentials}`;

    // Define request headers
    const headers = {
        'Authorization': authHeader,
        'Accept': 'application/json', // Tell the server we expect JSON back
        // 'Content-Type': 'application/json' // Usually not needed for GET requests
    };

    display(`Fetching Jira issue: ${apiUrl}`);

    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: headers,
    });

    // Check if the response status code indicates success (e.g., 200 OK)
    if (!response.ok) {
        let errorBody = 'Could not read error body.';
        try {
            // Attempt to get more details from the response body for non-OK statuses
            errorBody = await response.text();
            // eslint-disable-next-line no-unused-vars
        } catch (e) {
            // Silent fail - we already have a generic error message
        }
        // Throw a detailed error including status, status text, URL, and body if available
        throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}. URL: ${apiUrl}. Response Body: ${errorBody}`);
    }

    // Parse the JSON response body if the request was successful
    const issueData = await response.json();
    return issueData;

}
