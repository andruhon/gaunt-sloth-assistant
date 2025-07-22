import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import { GthConfig } from '#src/config.js';

const toolDefinition = {
    name: 'gth_web_fetch',
    description: 'Fetch content from a web URL. Provide a valid HTTP/HTTPS URL and get the content as text.',
    schema: z.string().describe('URL to make HTTP request'),
};

const defaultHttpHeaders = {
        'Accept': 'text/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br'
};

/**
 * Fetches content from a given URL and returns it as a string
 * @param url - The URL to fetch content from
 * @returns Promise<string> - The fetched content as a string
 */
async function gthWebFetchImpl(url: string): Promise<string> {
  try {
    // Validate that the input is a valid URL
    if (!url || typeof url !== 'string' || !url.trim()) {
      throw new Error('Invalid URL provided');
    }

    // Basic URL validation - check if it starts with http/https
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('URL must start with http:// or https://');
    }

    const response = await fetch(url, {
      headers: {
        ...defaultHttpHeaders
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data from ${url} with status: ${response.status} - ${response.statusText}`);
    }
        
    return response.text();
    
  } catch (error) {
    // graceful error handling and returning
    let message = "";
    if (error instanceof Error) {
      message = `Error occurred while fetching fetching content from ${url}: ${error.message}`;
    } else {
      message =  `Unknown error occurred while fetching content from ${url}: ${error}`;
    }
    return message;
  }
}

const toolImpl = async ( url: string )  => {
    return await gthWebFetchImpl(url);
};

export function get(_: GthConfig) {
  return tool(toolImpl, toolDefinition);
}