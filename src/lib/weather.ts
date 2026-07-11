/** Open-Meteo — free, no API key required. https://open-meteo.com */

export interface WeatherDay {
  date: string;
  weatherCode: number;
  high: number;
  low: number;
}

export interface WeatherSnapshot {
  locationLabel: string;
  temperature: number;
  temperatureUnit: string;
  weatherCode: number;
  windSpeed: number;
  windUnit: string;
  high: number | null;
  low: number | null;
  days: WeatherDay[];
  fetchedAt: string;
}

const WMO_LABELS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Icy fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent showers",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm",
};

export function weatherLabel(code: number): string {
  return WMO_LABELS[code] ?? "Weather";
}

/** Pittsburgh, PA — fixed weather location */
const PITTSBURGH = { lat: 40.4406, lon: -79.9959, label: "Pittsburgh, PA" };

export async function fetchWeatherForPlace(
  _city?: string,
  _state?: string
): Promise<WeatherSnapshot> {
  const { lat, lon, label: locationLabel } = PITTSBURGH;

  const forecastUrl = new URL("https://api.open-meteo.com/v1/forecast");
  forecastUrl.searchParams.set("latitude", String(lat));
  forecastUrl.searchParams.set("longitude", String(lon));
  forecastUrl.searchParams.set(
    "current",
    "temperature_2m,weather_code,wind_speed_10m"
  );
  forecastUrl.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min"
  );
  forecastUrl.searchParams.set("temperature_unit", "fahrenheit");
  forecastUrl.searchParams.set("wind_speed_unit", "mph");
  forecastUrl.searchParams.set("timezone", "America/New_York");
  forecastUrl.searchParams.set("forecast_days", "7");

  const res = await fetch(forecastUrl.toString(), { next: { revalidate: 1800 } });
  if (!res.ok) {
    throw new Error("Weather service unavailable");
  }

  const data = await res.json();
  const current = data.current;
  const daily = data.daily;

  const days: WeatherDay[] = (daily?.time ?? []).map((date: string, i: number) => ({
    date,
    weatherCode: daily.weather_code[i],
    high: Math.round(daily.temperature_2m_max[i]),
    low: Math.round(daily.temperature_2m_min[i]),
  }));

  return {
    locationLabel,
    temperature: Math.round(current.temperature_2m),
    temperatureUnit: data.current_units?.temperature_2m || "°F",
    weatherCode: current.weather_code,
    windSpeed: Math.round(current.wind_speed_10m),
    windUnit: data.current_units?.wind_speed_10m || "mph",
    high: days[0]?.high ?? null,
    low: days[0]?.low ?? null,
    days,
    fetchedAt: new Date().toISOString(),
  };
}
