/** Pittsburgh air quality via Open-Meteo — free, no API key. */

export interface AirQualitySnapshot {
  locationLabel: string;
  usAqi: number;
  pm25: number;
  pm10: number;
  category: string;
  advice: string;
  fetchedAt: string;
  source: string;
}

const PITTSBURGH = { lat: 40.4406, lon: -79.9959 };

let cache: { at: number; data: AirQualitySnapshot } | null = null;
const CACHE_MS = 15 * 60 * 1000;

function categorize(aqi: number): { category: string; advice: string } {
  if (aqi <= 50) {
    return {
      category: "Good",
      advice: "Air quality is satisfactory for most people.",
    };
  }
  if (aqi <= 100) {
    return {
      category: "Moderate",
      advice: "Unusually sensitive people should limit prolonged outdoor exertion.",
    };
  }
  if (aqi <= 150) {
    return {
      category: "Unhealthy for sensitive groups",
      advice: "Kids, older adults, and people with lung issues should reduce outdoor activity.",
    };
  }
  if (aqi <= 200) {
    return {
      category: "Unhealthy",
      advice: "Everyone should limit outdoor exertion.",
    };
  }
  if (aqi <= 300) {
    return {
      category: "Very unhealthy",
      advice: "Avoid outdoor activity if possible.",
    };
  }
  return {
    category: "Hazardous",
    advice: "Remain indoors and keep activity levels low.",
  };
}

export async function fetchPittsburghAirQuality(): Promise<AirQualitySnapshot> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;

  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.searchParams.set("latitude", String(PITTSBURGH.lat));
  url.searchParams.set("longitude", String(PITTSBURGH.lon));
  url.searchParams.set("current", "us_aqi,pm2_5,pm10");
  url.searchParams.set("timezone", "America/New_York");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": "HavenPM/1.0" },
    next: { revalidate: 900 },
  });
  if (!res.ok) throw new Error("Air quality unavailable");

  const data = await res.json();
  const current = data.current;
  const usAqi = Math.round(Number(current.us_aqi));
  const { category, advice } = categorize(usAqi);

  const snapshot: AirQualitySnapshot = {
    locationLabel: "Pittsburgh, PA",
    usAqi,
    pm25: Math.round(Number(current.pm2_5) * 10) / 10,
    pm10: Math.round(Number(current.pm10) * 10) / 10,
    category,
    advice,
    fetchedAt: new Date().toISOString(),
    source: "Open-Meteo",
  };

  cache = { at: Date.now(), data: snapshot };
  return snapshot;
}
