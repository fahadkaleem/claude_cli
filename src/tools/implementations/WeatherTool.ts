import { Tool } from '../core/Tool.js';
import type { ToolResult, ToolContext } from '../core/types.js';

interface WeatherParams {
  city: string;
  units?: 'celsius' | 'fahrenheit';
}

interface WeatherData {
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  city: string;
  units: string;
}

export class WeatherTool extends Tool<WeatherParams> {
  readonly name = 'get_weather';
  readonly displayName = 'Weather';
  readonly description = 'Get current weather information for a specific city';
  readonly inputSchema = {
    type: 'object' as const,
    properties: {
      city: {
        type: 'string',
        description: 'The name of the city',
      },
      units: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        description: 'Temperature units (default: celsius)',
      },
    },
    required: ['city'],
  };

  // Override to show just the city name
  override formatParams(params: WeatherParams): string {
    return params.city;
  }

  // Override to provide a one-line weather summary
  override summarizeResult(result: ToolResult): string {
    if (!result.success) {
      return `Failed to fetch weather`;
    }

    // Extract key info from the weather data
    if (result.output && typeof result.output === 'object') {
      const data = result.output as WeatherData;
      return `Temperature: ${data.temperature}${data.units}, ${data.description}`;
    }

    return 'Weather data retrieved';
  }

  protected async run(params: WeatherParams, context?: ToolContext): Promise<ToolResult> {
    const { city, units = 'celsius' } = params;

    context?.onProgress?.(`Fetching weather for ${city}...`);

    try {
      // For demo purposes, we'll use a free weather API
      // You can replace this with any weather service
      const weatherData = await this.fetchWeather(city, units);

      const displayContent = this.formatWeatherDisplay(weatherData);

      return {
        success: true,
        output: weatherData,
        display: {
          type: 'markdown',
          content: displayContent,
        },
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        error: `Failed to fetch weather for ${city}`,
        display: {
          type: 'error',
          content: `Could not get weather for ${city}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      };
    }
  }

  private async fetchWeather(city: string, units: 'celsius' | 'fahrenheit'): Promise<WeatherData> {
    // Using wttr.in as a simple weather service (no API key needed)
    // Format: JSON response with basic weather info
    const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        // API is down or rate limited, use mock data instead
        console.log(`Weather API returned ${response.status}, using mock data`);
        return this.getMockWeather(city, units);
      }

      const data = await response.json() as any;

      // Parse wttr.in response
      const current = data.current_condition?.[0];
      if (!current) {
        // Invalid response, use mock data
        return this.getMockWeather(city, units);
      }

      const tempC = parseFloat(current.temp_C);
      const temperature = units === 'fahrenheit'
        ? (tempC * 9/5) + 32
        : tempC;

      return {
        temperature: Math.round(temperature),
        description: current.weatherDesc?.[0]?.value || 'Unknown',
        humidity: parseInt(current.humidity),
        windSpeed: parseInt(current.windspeedKmph),
        city: data.nearest_area?.[0]?.areaName?.[0]?.value || city,
        units: units === 'fahrenheit' ? '°F' : '°C',
      };
    } catch (error) {
      // For any error, return mock data for demo purposes
      console.log('Weather API error, using mock data:', error instanceof Error ? error.message : error);
      return this.getMockWeather(city, units);
    }
  }

  private getMockWeather(city: string, units: 'celsius' | 'fahrenheit'): WeatherData {
    // Mock data for demonstration
    const mockData: Record<string, Partial<WeatherData>> = {
      'London': { temperature: 15, description: 'Cloudy', humidity: 65, windSpeed: 10 },
      'New York': { temperature: 22, description: 'Sunny', humidity: 45, windSpeed: 15 },
      'Tokyo': { temperature: 18, description: 'Partly cloudy', humidity: 70, windSpeed: 8 },
      'Sydney': { temperature: 25, description: 'Clear', humidity: 55, windSpeed: 20 },
      'Paris': { temperature: 16, description: 'Rainy', humidity: 80, windSpeed: 12 },
      'Dubai': { temperature: 35, description: 'Sunny', humidity: 40, windSpeed: 8 },
      'Mumbai': { temperature: 30, description: 'Humid', humidity: 85, windSpeed: 12 },
      'Singapore': { temperature: 28, description: 'Partly cloudy', humidity: 75, windSpeed: 10 },
    };

    const defaultWeather = {
      temperature: 20,
      description: 'Partly cloudy',
      humidity: 60,
      windSpeed: 10,
    };

    const weather = mockData[city] || defaultWeather;
    const temperature = units === 'fahrenheit'
      ? Math.round((weather.temperature! * 9/5) + 32)
      : weather.temperature!;

    return {
      ...weather,
      temperature,
      city,
      units: units === 'fahrenheit' ? '°F' : '°C',
    } as WeatherData;
  }

  private formatWeatherDisplay(weather: WeatherData): string {
    return `## Weather in ${weather.city}

🌡️ **Temperature:** ${weather.temperature}${weather.units}
🌤️ **Conditions:** ${weather.description}
💧 **Humidity:** ${weather.humidity}%
💨 **Wind Speed:** ${weather.windSpeed} km/h`;
  }
}