import { Tool } from '../../core/Tool.js';
import { ToolErrorType, ToolKind, type ToolResult, type ToolContext } from '../../core/types.js';
import { DisplayType } from '../../../constants/ui.js';

interface TimezoneParams extends Record<string, unknown> {
  timezone: string;
}

export class TimezoneTool extends Tool<TimezoneParams> {
  readonly name = 'get_time';
  readonly displayName = 'Timezone';
  readonly description = 'Get current time in a specific timezone';
  readonly kind = ToolKind.Fetch;
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      timezone: {
        type: 'string',
        description: 'Timezone name (e.g., America/New_York, Europe/London, Asia/Tokyo)',
      },
    },
    required: ['timezone'],
  };

  formatParams(params: TimezoneParams): string {
    return params.timezone;
  }

  summarizeResult(result: ToolResult): string {
    if (!result.success) {
      return `Failed to get time`;
    }
    return result.display?.content || 'Time retrieved';
  }

  protected async run(params: TimezoneParams, context?: ToolContext): Promise<ToolResult> {
    const { timezone } = params;

    context?.onProgress?.(`Getting time for ${timezone}...`);

    try {
      const date = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'long'
      };

      const formattedTime = date.toLocaleString('en-US', options);

      return {
        success: true,
        output: {
          timezone,
          time: formattedTime,
          timestamp: date.toISOString()
        },
        display: {
          type: DisplayType.Markdown,
          content: `## Time in ${timezone}

🕐 **${formattedTime}**

📅 ISO: ${date.toISOString()}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: {
          message: `Invalid timezone: ${timezone}`,
          type: ToolErrorType.INVALID_PARAMS,
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        display: {
          type: DisplayType.Error,
          content: `Invalid timezone: ${timezone}. Please use a valid timezone like 'America/New_York', 'Europe/London', or 'Asia/Tokyo'.`,
        },
      };
    }
  }
}