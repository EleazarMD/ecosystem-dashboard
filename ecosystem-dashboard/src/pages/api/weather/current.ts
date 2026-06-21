/**
 * Weather API — primary source: wttr.in (matches Nova's get_weather skill).
 * Optional: Apple WeatherKit if all four APPLE_* env vars are configured.
 *
 * GET /api/weather/current?lat=...&lon=...&location=...&prefer=wttr|apple
 *
 * Response shape mirrors the structured weather card Nova emits so the
 * iOS-style component can render the same hero/forecastStrip/metricGrid.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
const APPLE_SERVICE_ID = process.env.APPLE_WEATHERKIT_SERVICE_ID || process.env.APPLE_SERVICE_ID;
const APPLE_KEY_ID = process.env.APPLE_WEATHERKIT_KEY_ID || process.env.APPLE_KEY_ID;
const APPLE_PRIVATE_KEY = process.env.APPLE_WEATHERKIT_PRIVATE_KEY || process.env.APPLE_PRIVATE_KEY;

const DEFAULT_LAT = 29.7604;
const DEFAULT_LON = -95.3698;
const DEFAULT_LOCATION = 'Humble, TX';

const APPLE_AVAILABLE = Boolean(
  APPLE_TEAM_ID && APPLE_SERVICE_ID && APPLE_KEY_ID && APPLE_PRIVATE_KEY,
);

// ---------------------------------------------------------------------------
// Condition helpers (text-based, matches wttr.in descriptions)
// ---------------------------------------------------------------------------
function conditionFromText(text: string): { icon: string; description: string; code: string } {
  const t = (text || '').toLowerCase();
  if (/(thunder|storm)/.test(t)) return { icon: '⛈️', description: text, code: 'rain' };
  if (/(rain|shower|drizzle)/.test(t)) return { icon: '🌧️', description: text, code: 'rain' };
  if (/(snow|sleet|hail|blizzard)/.test(t)) return { icon: '❄️', description: text, code: 'snow' };
  if (/(fog|haze|mist)/.test(t)) return { icon: '🌫️', description: text, code: 'fog' };
  if (/(cloud|overcast)/.test(t)) return { icon: '☁️', description: text, code: 'clouds' };
  if (/(sun|clear|hot|warm|fair)/.test(t)) return { icon: '☀️', description: text, code: 'sun' };
  return { icon: '🌡️', description: text, code: 'clouds' };
}

// Apple WeatherKit condition codes (used only when prefer=apple and creds present)
function mapAppleCode(code: string): { icon: string; description: string } {
  const m: Record<string, { icon: string; description: string }> = {
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
  return m[code] || { icon: '🌡️', description: code };
}

// ---------------------------------------------------------------------------
// wttr.in path (primary)
// ---------------------------------------------------------------------------
async function fetchWttrIn(location: string): Promise<any> {
  const url = `https://wttr.in/${encodeURIComponent(location)}?format=j1`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`wttr.in HTTP ${r.status}`);
  return r.json();
}

function transformWttr(raw: any, location: string, lat: number, lon: number) {
  const cur = (raw.current_condition || [])[0] || {};
  const desc = (cur.weatherDesc?.[0]?.value as string) || '';
  const cond = conditionFromText(desc);

  const current = {
    temperature: Number(cur.temp_F || 0),
    temperatureApparent: Number(cur.FeelsLikeF || cur.temp_F || 0),
    humidity: Number(cur.humidity || 0),
    windSpeed: Number(cur.windspeedMiles || 0),
    windDirection: cur.winddir16Point || '',
    conditionCode: cond.code,
    icon: cond.icon,
    description: cond.description || desc,
    uvIndex: Number(cur.uvIndex || 0),
    visibility: Number(cur.visibility || 0),
    precipitationChance: Number(raw.weather?.[0]?.hourly?.[0]?.chanceofrain ?? 0),
    sunrise: raw.weather?.[0]?.astronomy?.[0]?.sunrise || '',
    sunset: raw.weather?.[0]?.astronomy?.[0]?.sunset || '',
  };

  const hourly: any[] = [];
  const today = (raw.weather || [])[0];
  if (today?.hourly) {
    for (const h of today.hourly.slice(0, 12)) {
      const hd = (h.weatherDesc?.[0]?.value as string) || '';
      const hc = conditionFromText(hd);
      hourly.push({
        time: h.time,
        temperature: Number(h.tempF || 0),
        precipitationChance: Number(h.chanceofrain || 0),
        icon: hc.icon,
        description: hc.description,
        conditionCode: hc.code,
      });
    }
  }

  const daily = (raw.weather || []).slice(0, 7).map((d: any) => {
    const dd = (d.hourly?.[4]?.weatherDesc?.[0]?.value as string) || '';
    const dc = conditionFromText(dd);
    return {
      date: d.date,
      temperatureMax: Number(d.maxtempF || 0),
      temperatureMin: Number(d.mintempF || 0),
      precipitationChance: Number(d.hourly?.[4]?.chanceofrain || 0),
      sunrise: d.astronomy?.[0]?.sunrise || '',
      sunset: d.astronomy?.[0]?.sunset || '',
      icon: dc.icon,
      description: dc.description,
      conditionCode: dc.code,
    };
  });

  return { current, hourly, daily, location: { label: location, lat, lon }, source: 'wttr.in' };
}

// ---------------------------------------------------------------------------
// Apple WeatherKit path (optional — only when all 4 env vars are set)
// ---------------------------------------------------------------------------
function generateWeatherKitToken(): string {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = (APPLE_PRIVATE_KEY as string).replace(/\\n/g, '\n');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(
    { iss: APPLE_TEAM_ID, iat: now, exp: now + 3600, sub: APPLE_SERVICE_ID },
    privateKey,
    {
      algorithm: 'ES256',
      header: { alg: 'ES256', kid: APPLE_KEY_ID, id: `${APPLE_TEAM_ID}.${APPLE_SERVICE_ID}` } as any,
    },
  );
}

async function fetchWeatherKit(lat: number, lon: number) {
  const token = generateWeatherKitToken();
  const now = new Date().toISOString();
  const tomorrow = new Date(Date.now() + 24 * 3600_000).toISOString();
  const today = new Date().toISOString().split('T')[0];
  const week = new Date(Date.now() + 7 * 24 * 3600_000).toISOString().split('T')[0];
  const url = `https://weatherkit.apple.com/api/v1/weather/en-US/${lat}/${lon}?dataSets=currentWeather,forecastHourly,forecastDaily&hourlyStart=${now}&hourlyEnd=${tomorrow}&dailyStart=${today}&dailyEnd=${week}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`WeatherKit HTTP ${r.status}`);
  return r.json();
}

function transformWeatherKit(raw: any, lat: number, lon: number) {
  const current = raw.currentWeather;
  const hourly = raw.forecastHourly?.hours || [];
  const daily = raw.forecastDaily?.days || [];
  const cond = mapAppleCode(current.conditionCode);
  return {
    current: {
      temperature: Math.round(current.temperature),
      temperatureApparent: Math.round(current.temperatureApparent),
      humidity: Math.round(current.humidity * 100),
      windSpeed: Math.round(current.windSpeed),
      windDirection: current.windDirection,
      conditionCode: current.conditionCode,
      uvIndex: current.uvIndex,
      visibility: Math.round((current.visibility || 0) / 1000),
      precipitationChance: Math.round((current.precipitationChance || 0) * 100),
      sunrise: daily[0]?.sunrise || '',
      sunset: daily[0]?.sunset || '',
      icon: cond.icon,
      description: cond.description,
    },
    hourly: hourly.slice(0, 12).map((h: any) => {
      const hc = mapAppleCode(h.conditionCode);
      return {
        time: h.forecastStart,
        temperature: Math.round(h.temperature),
        conditionCode: h.conditionCode,
        precipitationChance: Math.round((h.precipitationChance || 0) * 100),
        icon: hc.icon,
        description: hc.description,
      };
    }),
    daily: daily.slice(0, 7).map((d: any) => {
      const dc = mapAppleCode(d.conditionCode);
      return {
        date: d.forecastStart,
        temperatureMax: Math.round(d.temperatureMax),
        temperatureMin: Math.round(d.temperatureMin),
        conditionCode: d.conditionCode,
        precipitationChance: Math.round((d.precipitationChance || 0) * 100),
        sunrise: d.sunrise,
        sunset: d.sunset,
        icon: dc.icon,
        description: dc.description,
      };
    }),
    location: { lat, lon },
    source: 'apple_weatherkit',
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const lat = parseFloat((req.query.lat as string) || '') || DEFAULT_LAT;
  const lon = parseFloat((req.query.lon as string) || '') || DEFAULT_LON;
  const location = (req.query.location as string) || DEFAULT_LOCATION;
  const prefer = (req.query.prefer as string) || 'wttr';

  // Apple WeatherKit — only if caller explicitly prefers it AND creds are configured
  if (prefer === 'apple' && APPLE_AVAILABLE) {
    try {
      const raw = await fetchWeatherKit(lat, lon);
      return res.status(200).json(transformWeatherKit(raw, lat, lon));
    } catch (e: any) {
      console.error('[Weather] WeatherKit failed, falling back to wttr.in:', e?.message);
    }
  }

  // wttr.in — primary for all other cases
  try {
    const raw = await fetchWttrIn(location);
    return res.status(200).json(transformWttr(raw, location, lat, lon));
  } catch (e: any) {
    console.error('[Weather] wttr.in failed:', e?.message);
    return res.status(502).json({ error: 'Weather upstream unavailable', source: 'none' });
  }
}
