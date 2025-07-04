import GthFileSystemToolkit from '#src/tools/GthFileSystemToolkit.js';
import { StructuredToolInterface } from '@langchain/core/tools';
import { SlothConfig } from '#src/config.js';
import { displayWarning } from '#src/consoleUtils.js';
import { getCurrentDir } from '#src/systemUtils.js';

const AVAILABLE_BUILT_IN_TOOLS = {
  gth_status_update: '#src/tools/gthStatusUpdateTool.js',
  gth_jira_log_work: '#src/tools/gthJiraLogWorkTool.js',
  gth_request_changes: '#src/tools/gthRequestChanges.js',
};

/**
 * Get default tools based on filesystem and built-in tools configuration
 */
export async function getDefaultTools(config: SlothConfig): Promise<StructuredToolInterface[]> {
  const filesystemTools = filterFilesystemTools(
    new GthFileSystemToolkit([getCurrentDir()]),
    config.filesystem
  );
  const builtInTools = await getBuiltInTools(config);

  return [...filesystemTools, ...builtInTools];
}

/**
 * Filter filesystem tools based on configuration
 */
function filterFilesystemTools(
  toolkit: GthFileSystemToolkit,
  filesystemConfig: string[] | 'all' | 'read' | 'none'
): StructuredToolInterface[] {
  if (filesystemConfig === 'all') {
    return toolkit.getTools();
  }

  if (filesystemConfig === 'none') {
    return [];
  }

  if (filesystemConfig === 'read') {
    // Read-only: only allow read operations
    return toolkit.getFilteredTools(['read']);
  }

  if (!Array.isArray(filesystemConfig)) {
    return toolkit.getTools();
  }

  if (filesystemConfig.includes('all')) {
    return toolkit.getTools();
  }

  // Handle an array of specific tool names or 'read'/'all'
  const allowedTools: StructuredToolInterface[] = filesystemConfig.includes('read')
    ? toolkit.getFilteredTools(['read'])
    : [];

  // Also allow specific tool names
  const allowedToolNames = new Set(
    filesystemConfig.filter((name) => name !== 'read' && name !== 'all')
  );
  const specificNamedTools = toolkit.getTools().filter((tool) => {
    return tool.name && allowedToolNames.has(tool.name);
  });

  // Combine and deduplicate
  const allAllowedTools = [...allowedTools, ...specificNamedTools];
  return allAllowedTools.filter(
    (tool, index, arr) => arr.findIndex((t) => t.name === tool.name) === index
  );
}

/**
 * Get built-in tools based on configuration
 */
async function getBuiltInTools(config: SlothConfig): Promise<StructuredToolInterface[]> {
  const tools: StructuredToolInterface[] = [];

  if (!config.builtInTools) {
    return tools;
  }

  for (const toolName of config.builtInTools) {
    if (toolName in AVAILABLE_BUILT_IN_TOOLS) {
      try {
        const tool = await import(
          AVAILABLE_BUILT_IN_TOOLS[toolName as keyof typeof AVAILABLE_BUILT_IN_TOOLS]
        );
        tools.push(tool.get(config));
      } catch (error) {
        displayWarning(`Failed to load built-in tool '${toolName}': ${error}`);
      }
    } else {
      displayWarning(`Unknown built-in tool: ${toolName}`);
    }
  }

  return tools;
}
