/** Open-Meteo — free, no API key required. https://open-meteo.com */

export interface WeatherSnapshot {
  locationLabel: string;
  temperature: number;
  temperatureUnit: string;
  weatherCode: number;
  windSpeed: number;
  windUnit: string;
  high: number | null;
  low: number | null;
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

/** Default: Portland, OR (company HQ seed city) */
const DEFAULT_COORDS = { lat: 45.5152, lon: -122.6784, label: "Portland, OR" };

export async function fetchWeatherForPlace(
  city: string,
  state?: string
): Promise<WeatherSnapshot> {
  let lat = DEFAULT_COORDS.lat;
  let lon = DEFAULT_COORDS.lon;
  let locationLabel = DEFAULT_COORDS.label;

  const query = [city, state].filter(Boolean).join(", ");
  if (query) {
    try {
      const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
      geoUrl.searchParams.set("name", city);
      geoUrl.searchParams.set("count", "1");
      geoUrl.searchParams.set("language", "en");
      geoUrl.searchParams.set("format", "json");

      const geoRes = await fetch(geoUrl.toString(), { next: { revalidate: 86400 } });
      if (geoRes.ok) {
        const geo = await geoRes.json();
        const hit = geo.results?.[0];
        if (hit) {
          lat = hit.latitude;
          lon = hit.longitude;
          locationLabel = [hit.name, hit.admin1 || state].filter(Boolean).join(", ");
        } else if (city) {
          locationLabel = state ? `${city}, ${state}` : city;
        }
      }
    } catch {
      // fall back to defaults
    }
  }

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
  forecastUrl.searchParams.set("timezone", "auto");
  forecastUrl.searchParams.set("forecast_days", "1");

  const res = await fetch(forecastUrl.toString(), { next: { revalidate: 1800 } });
  if (!res.ok) {
    throw new Error("Weather service unavailable");
  }

  const data = await res.json();
  const current = data.current;
  const daily = data.daily;

  return {
    locationLabel,
    temperature: Math.round(current.temperature_2m),
    temperatureUnit: data.current_units?.temperature_2m || "°F",
    weatherCode: current.weather_code,
    windSpeed: Math.round(current.wind_speed_10m),
    windUnit: data.current_units?.wind_speed_10m || "mph",
    high: daily?.temperature_2m_max?.[0] != null ? Math.round(daily.temperature_2m_max[0]) : null,
    low: daily?.temperature_2m_min?.[0] != null ? Math.round(daily.temperature_2m_min[0]) : null,
    fetchedAt: new Date().toISOString(),
  };
}
