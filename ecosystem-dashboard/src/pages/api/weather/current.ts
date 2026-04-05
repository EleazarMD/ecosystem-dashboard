/**
 * Weather API - Apple WeatherKit Integration
 * 
 * Uses Apple WeatherKit REST API for weather data
 * Requires: APPLE_TEAM_ID, APPLE_SERVICE_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
const APPLE_SERVICE_ID = process.env.APPLE_WEATHERKIT_SERVICE_ID || process.env.APPLE_SERVICE_ID;
const APPLE_KEY_ID = process.env.APPLE_WEATHERKIT_KEY_ID || process.env.APPLE_KEY_ID;
const APPLE_PRIVATE_KEY = process.env.APPLE_WEATHERKIT_PRIVATE_KEY || process.env.APPLE_PRIVATE_KEY;

// Default to Houston coordinates
const DEFAULT_LAT = 29.7604;
const DEFAULT_LON = -95.3698;

interface WeatherData {
  temperature: number;
  temperatureApparent: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  conditionCode: string;
  uvIndex: number;
  visibility: number;
  precipitationChance: number;
  sunrise: string;
  sunset: string;
}

interface HourlyForecast {
  time: string;
  temperature: number;
  conditionCode: string;
  precipitationChance: number;
}

interface DailyForecast {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  conditionCode: string;
  precipitationChance: number;
  sunrise: string;
  sunset: string;
}

function generateWeatherKitToken(): string {
  if (!APPLE_TEAM_ID || !APPLE_SERVICE_ID || !APPLE_KEY_ID || !APPLE_PRIVATE_KEY) {
    throw new Error('Apple WeatherKit credentials not configured');
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: APPLE_TEAM_ID,
    iat: now,
    exp: now + 3600, // 1 hour
    sub: APPLE_SERVICE_ID,
  };

  // Handle escaped newlines in private key
  const privateKey = APPLE_PRIVATE_KEY.replace(/\\n/g, '\n');

  return jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: APPLE_KEY_ID,
      id: `${APPLE_TEAM_ID}.${APPLE_SERVICE_ID}`,
    },
  });
}

function mapConditionCode(code: string): { icon: string; description: string } {
  const conditions: Record<string, { icon: string; description: string }> = {
    Clear: { icon: '☀️', description: 'Clear' },
    Cloudy: { icon: '☁️', description: 'Cloudy' },
    MostlyClear: { icon: '🌤️', description: 'Mostly Clear' },
    MostlyCloudy: { icon: '⛅', description: 'Mostly Cloudy' },
    PartlyCloudy: { icon: '⛅', description: 'Partly Cloudy' },
    Rain: { icon: '🌧️', description: 'Rain' },
    Drizzle: { icon: '🌦️', description: 'Drizzle' },
    HeavyRain: { icon: '🌧️', description: 'Heavy Rain' },
    Thunderstorms: { icon: '⛈️', description: 'Thunderstorms' },
    Snow: { icon: '❄️', description: 'Snow' },
    Sleet: { icon: '🌨️', description: 'Sleet' },
    Hail: { icon: '🌨️', description: 'Hail' },
    Fog: { icon: '🌫️', description: 'Fog' },
    Haze: { icon: '🌫️', description: 'Haze' },
    Windy: { icon: '💨', description: 'Windy' },
    Hot: { icon: '🔥', description: 'Hot' },
    Cold: { icon: '🥶', description: 'Cold' },
  };
  return conditions[code] || { icon: '🌡️', description: code };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const lat = parseFloat(req.query.lat as string) || DEFAULT_LAT;
  const lon = parseFloat(req.query.lon as string) || DEFAULT_LON;

  try {
    const token = generateWeatherKitToken();

    // Fetch current weather + hourly + daily forecast
    const url = `https://weatherkit.apple.com/api/v1/weather/en-US/${lat}/${lon}?dataSets=currentWeather,forecastHourly,forecastDaily&hourlyStart=${new Date().toISOString()}&hourlyEnd=${new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()}&dailyStart=${new Date().toISOString().split('T')[0]}&dailyEnd=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Weather] WeatherKit error:', response.status, error);
      return res.status(response.status).json({ error: 'Failed to fetch weather data' });
    }

    const data = await response.json();
    const current = data.currentWeather;
    const hourly = data.forecastHourly?.hours || [];
    const daily = data.forecastDaily?.days || [];

    // Map to our format
    const weather: WeatherData = {
      temperature: Math.round(current.temperature),
      temperatureApparent: Math.round(current.temperatureApparent),
      humidity: Math.round(current.humidity * 100),
      windSpeed: Math.round(current.windSpeed),
      windDirection: current.windDirection,
      conditionCode: current.conditionCode,
      uvIndex: current.uvIndex,
      visibility: Math.round(current.visibility / 1000), // km
      precipitationChance: Math.round((current.precipitationChance || 0) * 100),
      sunrise: daily[0]?.sunrise || '',
      sunset: daily[0]?.sunset || '',
    };

    const hourlyForecast: HourlyForecast[] = hourly.slice(0, 12).map((h: any) => ({
      time: h.forecastStart,
      temperature: Math.round(h.temperature),
      conditionCode: h.conditionCode,
      precipitationChance: Math.round((h.precipitationChance || 0) * 100),
    }));

    const dailyForecast: DailyForecast[] = daily.slice(0, 7).map((d: any) => ({
      date: d.forecastStart,
      temperatureMax: Math.round(d.temperatureMax),
      temperatureMin: Math.round(d.temperatureMin),
      conditionCode: d.conditionCode,
      precipitationChance: Math.round((d.precipitationChance || 0) * 100),
      sunrise: d.sunrise,
      sunset: d.sunset,
    }));

    const condition = mapConditionCode(weather.conditionCode);

    return res.status(200).json({
      current: {
        ...weather,
        icon: condition.icon,
        description: condition.description,
      },
      hourly: hourlyForecast.map(h => ({
        ...h,
        ...mapConditionCode(h.conditionCode),
      })),
      daily: dailyForecast.map(d => ({
        ...d,
        ...mapConditionCode(d.conditionCode),
      })),
      location: { lat, lon },
      source: 'apple_weatherkit',
    });
  } catch (error: any) {
    console.error('[Weather] Error:', error);
    
    // Fallback to mock data if WeatherKit fails
    if (error.message?.includes('credentials not configured')) {
      return res.status(200).json({
        current: {
          temperature: 75,
          temperatureApparent: 78,
          humidity: 65,
          windSpeed: 8,
          conditionCode: 'PartlyCloudy',
          icon: '⛅',
          description: 'Partly Cloudy',
          uvIndex: 6,
          precipitationChance: 20,
        },
        hourly: [],
        daily: [],
        location: { lat, lon },
        source: 'mock',
        error: 'WeatherKit not configured - showing mock data',
      });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}
