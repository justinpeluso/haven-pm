#!/usr/bin/env npx tsx
/**
 * Builds data/downtowns.json — 150+ downtown cores within ~40mi of Allegheny County (PA + OH).
 * Baselines are deterministic heuristics for demos; Overpass can refresh live when available.
 */
import fs from "fs";
import path from "path";

type Mix = {
  food: number;
  retail: number;
  services: number;
  civic: number;
  office: number;
  other: number;
};

type Raw = {
  name: string;
  state: "PA" | "OH";
  county: string;
  lat: number;
  lng: number;
  downtownName?: string;
  tags?: string[];
  radiusM?: number;
};

const ALLEGHENY = { lat: 40.4406, lng: -79.9959 };

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function baselineFor(id: string, tags: string[], miles: number) {
  const h = hash(id);
  const tagBoost =
    (tags.includes("college") ? 8 : 0) +
    (tags.includes("river_town") ? 4 : 0) +
    (tags.includes("main_street") ? 6 : 0) +
    (tags.includes("industrial") ? -4 : 0) +
    (tags.includes("suburb") ? 2 : 0);
  const vibrancy = Math.max(28, Math.min(92, 55 + (h % 31) - 10 + tagBoost - miles * 0.15));
  const vacancyEstimate = Math.max(
    4,
    Math.min(38, 22 - tagBoost * 0.4 + (h % 17) * 0.6 + miles * 0.08)
  );
  const food = 18 + (h % 14);
  const retail = 16 + ((h >> 3) % 12);
  const services = 20 + ((h >> 5) % 10);
  const civic = 8 + ((h >> 7) % 8);
  const office = 10 + ((h >> 9) % 10);
  let other = 100 - food - retail - services - civic - office;
  if (other < 4) other = 4;
  const sum = food + retail + services + civic + office + other;
  const mix: Mix = {
    food: Math.round((food / sum) * 100),
    retail: Math.round((retail / sum) * 100),
    services: Math.round((services / sum) * 100),
    civic: Math.round((civic / sum) * 100),
    office: Math.round((office / sum) * 100),
    other: 0,
  };
  mix.other = Math.max(0, 100 - mix.food - mix.retail - mix.services - mix.civic - mix.office);
  const poiCount = Math.round(35 + vibrancy * 1.1 + (h % 40));
  return { vibrancy: Math.round(vibrancy), vacancyEstimate: Math.round(vacancyEstimate * 10) / 10, mix, poiCount };
}

/** Curated downtowns — Allegheny + ring counties + OH fringe (within ~40mi). */
const RAW: Raw[] = [
  // —— Allegheny County ——
  { name: "Pittsburgh", state: "PA", county: "Allegheny", lat: 40.4406, lng: -79.9959, downtownName: "Downtown / Golden Triangle", tags: ["city", "river_town", "main_street"], radiusM: 1200 },
  { name: "Sewickley", state: "PA", county: "Allegheny", lat: 40.5365, lng: -80.1845, downtownName: "Broad Street Downtown", tags: ["main_street", "river_town"] },
  { name: "Oakmont", state: "PA", county: "Allegheny", lat: 40.5217, lng: -79.8423, downtownName: "Allegheny River Boulevard", tags: ["main_street", "river_town"] },
  { name: "Sharpsburg", state: "PA", county: "Allegheny", lat: 40.4945, lng: -79.9262, downtownName: "Main Street", tags: ["main_street", "river_town"] },
  { name: "Etna", state: "PA", county: "Allegheny", lat: 40.5042, lng: -79.9448, downtownName: "Butler Street Corridor", tags: ["main_street"] },
  { name: "Millvale", state: "PA", county: "Allegheny", lat: 40.4801, lng: -79.9784, downtownName: "Grant Avenue Downtown", tags: ["main_street", "river_town"] },
  { name: "Aspinwall", state: "PA", county: "Allegheny", lat: 40.4915, lng: -79.9045, downtownName: "Freeport Road Business District", tags: ["main_street"] },
  { name: "Blawnox", state: "PA", county: "Allegheny", lat: 40.4923, lng: -79.8614, downtownName: "Freeport Road", tags: ["main_street"] },
  { name: "Verona", state: "PA", county: "Allegheny", lat: 40.5065, lng: -79.8392, downtownName: "Allegheny River Blvd", tags: ["main_street", "river_town"] },
  { name: "Cheswick", state: "PA", county: "Allegheny", lat: 40.5417, lng: -79.7631, downtownName: "Pittsburgh Street", tags: ["main_street"] },
  { name: "Springdale", state: "PA", county: "Allegheny", lat: 40.5409, lng: -79.7839, downtownName: "Pittsburgh Street Downtown", tags: ["main_street", "river_town"] },
  { name: "Tarentum", state: "PA", county: "Allegheny", lat: 40.6031, lng: -79.7598, downtownName: "Corbet Street Downtown", tags: ["main_street", "river_town"] },
  { name: "Brackenridge", state: "PA", county: "Allegheny", lat: 40.6081, lng: -79.7412, downtownName: "Brackenridge Avenue", tags: ["main_street", "industrial"] },
  { name: "Coraopolis", state: "PA", county: "Allegheny", lat: 40.5184, lng: -80.1667, downtownName: "Fifth Avenue Downtown", tags: ["main_street", "river_town"] },
  { name: "McKees Rocks", state: "PA", county: "Allegheny", lat: 40.4656, lng: -80.0656, downtownName: "Island Avenue / Chartiers", tags: ["main_street", "industrial"] },
  { name: "Bellevue", state: "PA", county: "Allegheny", lat: 40.494, lng: -80.0517, downtownName: "Lincoln Avenue", tags: ["main_street"] },
  { name: "Avalon", state: "PA", county: "Allegheny", lat: 40.501, lng: -80.0684, downtownName: "California Avenue", tags: ["main_street"] },
  { name: "Ben Avon", state: "PA", county: "Allegheny", lat: 40.5081, lng: -80.0834, downtownName: "Ohio River Blvd shops", tags: ["main_street"] },
  { name: "Emsworth", state: "PA", county: "Allegheny", lat: 40.5123, lng: -80.0945, downtownName: "Center Avenue", tags: ["main_street"] },
  { name: "Crafton", state: "PA", county: "Allegheny", lat: 40.4345, lng: -80.0667, downtownName: "Crafton Boulevard", tags: ["main_street"] },
  { name: "Ingram", state: "PA", county: "Allegheny", lat: 40.4467, lng: -80.0778, downtownName: "West Prospect Avenue", tags: ["main_street"] },
  { name: "Carnegie", state: "PA", county: "Allegheny", lat: 40.4087, lng: -80.0834, downtownName: "East Main Street", tags: ["main_street"] },
  { name: "Heidelberg", state: "PA", county: "Allegheny", lat: 40.3912, lng: -80.0901, downtownName: "Washington Avenue", tags: ["main_street"] },
  { name: "Bridgeville", state: "PA", county: "Allegheny", lat: 40.3562, lng: -80.1101, downtownName: "Washington Avenue Downtown", tags: ["main_street"] },
  { name: "Dormont", state: "PA", county: "Allegheny", lat: 40.3956, lng: -80.0331, downtownName: "Potomac Avenue", tags: ["main_street", "suburb"] },
  { name: "Mount Lebanon", state: "PA", county: "Allegheny", lat: 40.3553, lng: -80.0506, downtownName: "Washington Road Uptown", tags: ["main_street", "suburb"] },
  { name: "Castle Shannon", state: "PA", county: "Allegheny", lat: 40.3648, lng: -80.0223, downtownName: "Castle Shannon Boulevard", tags: ["main_street", "suburb"] },
  { name: "Bethel Park", state: "PA", county: "Allegheny", lat: 40.3276, lng: -80.0395, downtownName: "South Park Road / Village", tags: ["suburb", "main_street"] },
  { name: "Baldwin", state: "PA", county: "Allegheny", lat: 40.3381, lng: -79.9789, downtownName: "Brownsville Road", tags: ["suburb"] },
  { name: "Whitehall", state: "PA", county: "Allegheny", lat: 40.3601, lng: -79.9906, downtownName: "Provost Road shops", tags: ["suburb"] },
  { name: "Brentwood", state: "PA", county: "Allegheny", lat: 40.3709, lng: -79.975, downtownName: "Brownsville Road", tags: ["main_street", "suburb"] },
  { name: "Homestead", state: "PA", county: "Allegheny", lat: 40.4053, lng: -79.9117, downtownName: "Eighth Avenue Downtown", tags: ["main_street", "river_town", "industrial"] },
  { name: "Munhall", state: "PA", county: "Allegheny", lat: 40.3917, lng: -79.9001, downtownName: "East Eighth Avenue", tags: ["main_street"] },
  { name: "West Homestead", state: "PA", county: "Allegheny", lat: 40.3956, lng: -79.9156, downtownName: "West Eighth Avenue", tags: ["main_street"] },
  { name: "Swissvale", state: "PA", county: "Allegheny", lat: 40.4237, lng: -79.8828, downtownName: "Monongahela Avenue", tags: ["main_street"] },
  { name: "Edgewood", state: "PA", county: "Allegheny", lat: 40.432, lng: -79.8806, downtownName: "Pennwood Avenue", tags: ["main_street"] },
  { name: "Wilkinsburg", state: "PA", county: "Allegheny", lat: 40.4417, lng: -79.8817, downtownName: "Penn Avenue Business District", tags: ["main_street"] },
  { name: "Forest Hills", state: "PA", county: "Allegheny", lat: 40.4198, lng: -79.8501, downtownName: "Ardmore Boulevard", tags: ["main_street", "suburb"] },
  { name: "Braddock", state: "PA", county: "Allegheny", lat: 40.4034, lng: -79.8684, downtownName: "Braddock Avenue", tags: ["main_street", "industrial"] },
  { name: "North Braddock", state: "PA", county: "Allegheny", lat: 40.4112, lng: -79.8512, downtownName: "Jones Avenue", tags: ["industrial"] },
  { name: "Rankin", state: "PA", county: "Allegheny", lat: 40.4123, lng: -79.879, downtownName: "Kenmawr Avenue", tags: ["main_street"] },
  { name: "East Pittsburgh", state: "PA", county: "Allegheny", lat: 40.397, lng: -79.8384, downtownName: "Electric Avenue", tags: ["main_street", "industrial"] },
  { name: "Turtle Creek", state: "PA", county: "Allegheny", lat: 40.4067, lng: -79.8256, downtownName: "Penn Avenue Downtown", tags: ["main_street"] },
  { name: "Wilmerding", state: "PA", county: "Allegheny", lat: 40.3909, lng: -79.8081, downtownName: "Westinghouse Avenue", tags: ["main_street", "industrial"] },
  { name: "Pitcairn", state: "PA", county: "Allegheny", lat: 40.4031, lng: -79.7762, downtownName: "Broadway Boulevard", tags: ["main_street"] },
  { name: "Monroeville", state: "PA", county: "Allegheny", lat: 40.4212, lng: -79.7881, downtownName: "Monroeville Boulevard / Miracle Mile", tags: ["suburb"] },
  { name: "Plum", state: "PA", county: "Allegheny", lat: 40.5003, lng: -79.7495, downtownName: "New Texas Road / Village", tags: ["suburb"] },
  { name: "McKeesport", state: "PA", county: "Allegheny", lat: 40.3478, lng: -79.8642, downtownName: "Fifth Avenue Downtown", tags: ["city", "river_town", "main_street", "industrial"] },
  { name: "Duquesne", state: "PA", county: "Allegheny", lat: 40.3703, lng: -79.86, downtownName: "Grant Avenue", tags: ["main_street", "industrial"] },
  { name: "Clairton", state: "PA", county: "Allegheny", lat: 40.2945, lng: -79.8851, downtownName: "St. Clair Avenue", tags: ["main_street", "industrial", "river_town"] },
  { name: "Glassport", state: "PA", county: "Allegheny", lat: 40.3259, lng: -79.8923, downtownName: "Ohio Avenue", tags: ["main_street", "river_town"] },
  { name: "Port Vue", state: "PA", county: "Allegheny", lat: 40.3367, lng: -79.8706, downtownName: "Romine Avenue", tags: ["main_street"] },
  { name: "Liberty", state: "PA", county: "Allegheny", lat: 40.3256, lng: -79.8567, downtownName: "Liberty Way shops", tags: ["main_street"] },
  { name: "Dravosburg", state: "PA", county: "Allegheny", lat: 40.3506, lng: -79.8895, downtownName: "McClure Street", tags: ["main_street", "river_town"] },
  { name: "West Mifflin", state: "PA", county: "Allegheny", lat: 40.3634, lng: -79.8664, downtownName: "Lebanon Church Road / Century III", tags: ["suburb"] },
  { name: "Pleasant Hills", state: "PA", county: "Allegheny", lat: 40.3323, lng: -79.9606, downtownName: "Claireton Boulevard", tags: ["suburb"] },
  { name: "Jefferson Hills", state: "PA", county: "Allegheny", lat: 40.2912, lng: -79.9301, downtownName: "Route 51 Village", tags: ["suburb"] },
  { name: "Elizabeth", state: "PA", county: "Allegheny", lat: 40.2695, lng: -79.8898, downtownName: "Second Avenue Downtown", tags: ["main_street", "river_town"] },
  { name: "Green Tree", state: "PA", county: "Allegheny", lat: 40.4151, lng: -80.0456, downtownName: "Greentree Road", tags: ["suburb"] },
  { name: "Rosslyn Farms", state: "PA", county: "Allegheny", lat: 40.4256, lng: -80.0789, downtownName: "Kings Highway shops", tags: ["suburb"] },
  { name: "Thornburg", state: "PA", county: "Allegheny", lat: 40.4345, lng: -80.0834, downtownName: "Cornell Avenue", tags: ["main_street"] },
  { name: "Pennsbury Village", state: "PA", county: "Allegheny", lat: 40.4289, lng: -80.1012, downtownName: "Pennsbury Boulevard", tags: ["suburb"] },
  { name: "Oakdale", state: "PA", county: "Allegheny", lat: 40.3978, lng: -80.1856, downtownName: "State Street", tags: ["main_street"] },
  { name: "McDonald", state: "PA", county: "Allegheny", lat: 40.3701, lng: -80.2345, downtownName: "East Lincoln Avenue", tags: ["main_street"] },
  { name: "Leetsdale", state: "PA", county: "Allegheny", lat: 40.5634, lng: -80.2101, downtownName: "Beaver Street", tags: ["main_street", "river_town", "industrial"] },
  { name: "Edgeworth", state: "PA", county: "Allegheny", lat: 40.5512, lng: -80.1923, downtownName: "Beaver Road", tags: ["main_street"] },
  { name: "Glen Osborne", state: "PA", county: "Allegheny", lat: 40.5289, lng: -80.1689, downtownName: "Ohio River Blvd", tags: ["river_town"] },
  { name: "Fox Chapel", state: "PA", county: "Allegheny", lat: 40.5117, lng: -79.8795, downtownName: "Fox Chapel Road Village", tags: ["suburb"] },
  { name: "Franklin Park", state: "PA", county: "Allegheny", lat: 40.5834, lng: -80.0901, downtownName: "Rochester Road / Brandt School", tags: ["suburb"] },
  { name: "West View", state: "PA", county: "Allegheny", lat: 40.5223, lng: -80.0173, downtownName: "Center Avenue", tags: ["main_street", "suburb"] },
  { name: "Bellevue Heights", state: "PA", county: "Allegheny", lat: 40.5089, lng: -80.0456, downtownName: "Lincoln Avenue North", tags: ["main_street"] },
  { name: "Mount Oliver", state: "PA", county: "Allegheny", lat: 40.4084, lng: -79.9867, downtownName: "Brownsville Road", tags: ["main_street"] },
  { name: "Chalfant", state: "PA", county: "Allegheny", lat: 40.4089, lng: -79.8389, downtownName: "North Avenue", tags: ["main_street"] },
  { name: "East McKeesport", state: "PA", county: "Allegheny", lat: 40.3834, lng: -79.8089, downtownName: "Fifth Avenue", tags: ["main_street"] },
  { name: "Wall", state: "PA", county: "Allegheny", lat: 40.3934, lng: -79.7889, downtownName: "Wall Avenue", tags: ["main_street"] },
  { name: "Trafford", state: "PA", county: "Allegheny", lat: 40.3856, lng: -79.7589, downtownName: "Brinton Avenue", tags: ["main_street"] },
  { name: "White Oak", state: "PA", county: "Allegheny", lat: 40.3356, lng: -79.8089, downtownName: "Lincoln Way", tags: ["suburb", "main_street"] },
  { name: "South Versailles", state: "PA", county: "Allegheny", lat: 40.3189, lng: -79.7989, downtownName: "Versailles Avenue", tags: ["main_street"] },
  { name: "Penn Hills", state: "PA", county: "Allegheny", lat: 40.5012, lng: -79.839, downtownName: "Rodgers Drive / Universal", tags: ["suburb"] },
  { name: "Shaler", state: "PA", county: "Allegheny", lat: 40.5223, lng: -79.9634, downtownName: "Mount Royal Boulevard", tags: ["suburb", "main_street"] },
  { name: "Ross", state: "PA", county: "Allegheny", lat: 40.5434, lng: -80.0189, downtownName: "McKnight Road Corridor", tags: ["suburb"] },
  { name: "McCandless", state: "PA", county: "Allegheny", lat: 40.5834, lng: -80.0334, downtownName: "Perry Highway / North Park", tags: ["suburb"] },
  { name: "Hampton", state: "PA", county: "Allegheny", lat: 40.5834, lng: -79.9589, downtownName: "Route 8 Village", tags: ["suburb"] },
  { name: "Indiana Township", state: "PA", county: "Allegheny", lat: 40.5634, lng: -79.8789, downtownName: "Route 910 Village", tags: ["suburb"] },
  { name: "O'Hara", state: "PA", county: "Allegheny", lat: 40.4989, lng: -79.8989, downtownName: "Freeport Road", tags: ["suburb"] },
  { name: "Harmar", state: "PA", county: "Allegheny", lat: 40.5389, lng: -79.8234, downtownName: "Freeport Road", tags: ["suburb"] },
  { name: "West Deer", state: "PA", county: "Allegheny", lat: 40.6334, lng: -79.8734, downtownName: "Saxonburg Boulevard", tags: ["suburb"] },
  { name: "Richland", state: "PA", county: "Allegheny", lat: 40.6434, lng: -79.9534, downtownName: "Route 8 / Gibsonia", tags: ["suburb"] },
  { name: "Pine", state: "PA", county: "Allegheny", lat: 40.6434, lng: -80.0334, downtownName: "Perry Highway", tags: ["suburb"] },
  { name: "Marshall", state: "PA", county: "Allegheny", lat: 40.6534, lng: -80.0934, downtownName: "Wexford / Route 19", tags: ["suburb"] },
  { name: "Bradford Woods", state: "PA", county: "Allegheny", lat: 40.6389, lng: -80.0834, downtownName: "Bradford Road Village", tags: ["suburb"] },
  { name: "Bell Acres", state: "PA", county: "Allegheny", lat: 40.5934, lng: -80.1634, downtownName: "Big Sewickley Creek", tags: ["suburb"] },
  { name: "Sewickley Hills", state: "PA", county: "Allegheny", lat: 40.5634, lng: -80.1434, downtownName: "Fern Hollow Village", tags: ["suburb"] },
  { name: "Sewickley Heights", state: "PA", county: "Allegheny", lat: 40.5534, lng: -80.1534, downtownName: "Country Club / Village", tags: ["suburb"] },
  { name: "Aleppo", state: "PA", county: "Allegheny", lat: 40.5434, lng: -80.1634, downtownName: "Glenfield Road", tags: ["suburb"] },
  { name: "Kilbuck", state: "PA", county: "Allegheny", lat: 40.5234, lng: -80.1234, downtownName: "Ohio River Blvd", tags: ["river_town"] },
  { name: "Ohio Township", state: "PA", county: "Allegheny", lat: 40.5534, lng: -80.1034, downtownName: "Mount Nebo Road", tags: ["suburb"] },
  { name: "Kennedy", state: "PA", county: "Allegheny", lat: 40.4789, lng: -80.1034, downtownName: "Pine Hollow Road", tags: ["suburb"] },
  { name: "Robinson", state: "PA", county: "Allegheny", lat: 40.4589, lng: -80.1434, downtownName: "Robinson Town Centre", tags: ["suburb"] },
  { name: "North Fayette", state: "PA", county: "Allegheny", lat: 40.4289, lng: -80.2034, downtownName: "Route 22 / Imperial", tags: ["suburb"] },
  { name: "Findlay", state: "PA", county: "Allegheny", lat: 40.4789, lng: -80.2534, downtownName: "Airport / Clinton Village", tags: ["suburb", "industrial"] },
  { name: "Moon", state: "PA", county: "Allegheny", lat: 40.5189, lng: -80.2234, downtownName: "University Boulevard", tags: ["suburb", "college"] },
  { name: "Crescent", state: "PA", county: "Allegheny", lat: 40.5634, lng: -80.2334, downtownName: "Stoops Ferry", tags: ["river_town"] },
  { name: "Neville", state: "PA", county: "Allegheny", lat: 40.5089, lng: -80.1234, downtownName: "Grand Avenue", tags: ["industrial", "river_town"] },
  { name: "Stowe", state: "PA", county: "Allegheny", lat: 40.4789, lng: -80.0734, downtownName: "Broadway Avenue", tags: ["main_street"] },
  { name: "Scott", state: "PA", county: "Allegheny", lat: 40.3889, lng: -80.0834, downtownName: "Washington Avenue / Bower Hill", tags: ["suburb"] },
  { name: "Collier", state: "PA", county: "Allegheny", lat: 40.3789, lng: -80.1334, downtownName: "Route 50 / Rennerdale", tags: ["suburb"] },
  { name: "South Fayette", state: "PA", county: "Allegheny", lat: 40.3489, lng: -80.1634, downtownName: "Millers Run / Mayview", tags: ["suburb"] },
  { name: "Upper St. Clair", state: "PA", county: "Allegheny", lat: 40.3289, lng: -80.0834, downtownName: "Washington Road", tags: ["suburb"] },
  { name: "South Park", state: "PA", county: "Allegheny", lat: 40.2989, lng: -80.0234, downtownName: "Library Road", tags: ["suburb"] },
  { name: "North Versailles", state: "PA", county: "Allegheny", lat: 40.3789, lng: -79.8134, downtownName: "East Pittsburgh-McKeesport Blvd", tags: ["suburb"] },
  { name: "Wilkins", state: "PA", county: "Allegheny", lat: 40.4189, lng: -79.8234, downtownName: "William Penn Highway", tags: ["suburb"] },
  { name: "Reserve", state: "PA", county: "Allegheny", lat: 40.4989, lng: -79.9834, downtownName: "Reserve Road / Millvale border", tags: ["suburb"] },
  { name: "Harrison", state: "PA", county: "Allegheny", lat: 40.6289, lng: -79.7234, downtownName: "Freeport Road / Natrona", tags: ["main_street", "industrial"] },
  { name: "Fawn", state: "PA", county: "Allegheny", lat: 40.6489, lng: -79.7434, downtownName: "Butler-Freeport corridor", tags: ["suburb"] },
  { name: "East Deer", state: "PA", county: "Allegheny", lat: 40.6089, lng: -79.7734, downtownName: "Freeport Road", tags: ["industrial"] },
  { name: "Frazer", state: "PA", county: "Allegheny", lat: 40.5889, lng: -79.7934, downtownName: "Butler Road", tags: ["suburb"] },
  { name: "West Elizabeth", state: "PA", county: "Allegheny", lat: 40.2689, lng: -79.8989, downtownName: "Fifth Street", tags: ["main_street", "river_town"] },
  { name: "Forward", state: "PA", county: "Allegheny", lat: 40.2489, lng: -79.8689, downtownName: "River Road Village", tags: ["river_town"] },

  // —— Beaver County ——
  { name: "Beaver", state: "PA", county: "Beaver", lat: 40.6953, lng: -80.3048, downtownName: "Third Street Downtown", tags: ["main_street", "river_town", "county_seat"] },
  { name: "Beaver Falls", state: "PA", county: "Beaver", lat: 40.752, lng: -80.3192, downtownName: "Seventh Avenue Downtown", tags: ["main_street", "college", "river_town"] },
  { name: "New Brighton", state: "PA", county: "Beaver", lat: 40.7303, lng: -80.3101, downtownName: "Third Avenue", tags: ["main_street", "river_town"] },
  { name: "Rochester", state: "PA", county: "Beaver", lat: 40.7023, lng: -80.2834, downtownName: "Brighton Avenue", tags: ["main_street", "river_town"] },
  { name: "Monaca", state: "PA", county: "Beaver", lat: 40.6834, lng: -80.2712, downtownName: "Pennsylvania Avenue", tags: ["main_street", "river_town"] },
  { name: "Aliquippa", state: "PA", county: "Beaver", lat: 40.6089, lng: -80.2401, downtownName: "Franklin Avenue Downtown", tags: ["main_street", "industrial", "river_town"] },
  { name: "Ambridge", state: "PA", county: "Beaver", lat: 40.589, lng: -80.2262, downtownName: "Merchant Street", tags: ["main_street", "industrial", "river_town"] },
  { name: "Baden", state: "PA", county: "Beaver", lat: 40.6356, lng: -80.2289, downtownName: "State Street", tags: ["main_street"] },
  { name: "Economy", state: "PA", county: "Beaver", lat: 40.6689, lng: -80.1834, downtownName: "Route 65 Village", tags: ["suburb"] },
  { name: "Conway", state: "PA", county: "Beaver", lat: 40.6634, lng: -80.2367, downtownName: "Second Avenue", tags: ["main_street"] },
  { name: "Freedom", state: "PA", county: "Beaver", lat: 40.6834, lng: -80.2512, downtownName: "Third Avenue", tags: ["main_street", "river_town"] },
  { name: "East Rochester", state: "PA", county: "Beaver", lat: 40.6989, lng: -80.2689, downtownName: "New York Avenue", tags: ["main_street"] },
  { name: "Bridgewater", state: "PA", county: "Beaver", lat: 40.6989, lng: -80.2934, downtownName: "Market Street", tags: ["main_street"] },
  { name: "Fallston", state: "PA", county: "Beaver", lat: 40.7234, lng: -80.3089, downtownName: "Second Avenue", tags: ["main_street"] },
  { name: "Patterson Heights", state: "PA", county: "Beaver", lat: 40.7389, lng: -80.3234, downtownName: "Seventh Avenue", tags: ["main_street"] },
  { name: "West Mayfield", state: "PA", county: "Beaver", lat: 40.7689, lng: -80.3389, downtownName: "Fourteenth Avenue", tags: ["main_street"] },
  { name: "Midland", state: "PA", county: "Beaver", lat: 40.6334, lng: -80.4489, downtownName: "Midland Avenue", tags: ["main_street", "industrial", "river_town"] },
  { name: "Shippingport", state: "PA", county: "Beaver", lat: 40.6289, lng: -80.4234, downtownName: "Main Street", tags: ["river_town", "industrial"] },
  { name: "Industry", state: "PA", county: "Beaver", lat: 40.6489, lng: -80.4089, downtownName: "Ohio River Blvd", tags: ["industrial"] },
  { name: "Midland Heights", state: "PA", county: "Beaver", lat: 40.6489, lng: -80.4334, downtownName: "Midland Road", tags: ["suburb"] },
  { name: "Ellwood City", state: "PA", county: "Beaver", lat: 40.8617, lng: -80.2867, downtownName: "Fifth Street Downtown", tags: ["main_street"] },
  { name: "Koppel", state: "PA", county: "Beaver", lat: 40.8334, lng: -80.3189, downtownName: "Fifth Avenue", tags: ["main_street", "industrial"] },
  { name: "Big Beaver", state: "PA", county: "Beaver", lat: 40.8234, lng: -80.3634, downtownName: "Route 18 Village", tags: ["suburb"] },
  { name: "Homewood", state: "PA", county: "Beaver", lat: 40.8134, lng: -80.3489, downtownName: "Fourth Avenue", tags: ["main_street"] },
  { name: "New Galilee", state: "PA", county: "Beaver", lat: 40.8334, lng: -80.3989, downtownName: "Centennial Avenue", tags: ["main_street"] },
  { name: "Darlington", state: "PA", county: "Beaver", lat: 40.8089, lng: -80.4234, downtownName: "Second Street", tags: ["main_street"] },
  { name: "Hookstown", state: "PA", county: "Beaver", lat: 40.5989, lng: -80.4734, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Georgetown", state: "PA", county: "Beaver", lat: 40.6389, lng: -80.4989, downtownName: "Market Street", tags: ["main_street", "river_town"] },
  { name: "Glasgow", state: "PA", county: "Beaver", lat: 40.6489, lng: -80.5089, downtownName: "First Street", tags: ["river_town"] },
  { name: "Ohioville", state: "PA", county: "Beaver", lat: 40.6789, lng: -80.4934, downtownName: "Route 168 Village", tags: ["suburb"] },
  { name: "South Heights", state: "PA", county: "Beaver", lat: 40.5734, lng: -80.2389, downtownName: "Jordan Street", tags: ["main_street"] },
  { name: "Harmony Township", state: "PA", county: "Beaver", lat: 40.6089, lng: -80.2089, downtownName: "Duss Avenue", tags: ["suburb"] },
  { name: "Center Township", state: "PA", county: "Beaver", lat: 40.6489, lng: -80.3034, downtownName: "Brodhead Road", tags: ["suburb"] },
  { name: "Hopewell", state: "PA", county: "Beaver", lat: 40.5889, lng: -80.2734, downtownName: "Route 151 Village", tags: ["suburb"] },
  { name: "Independence", state: "PA", county: "Beaver", lat: 40.5489, lng: -80.3534, downtownName: "Independence Road", tags: ["suburb"] },
  { name: "Raccoon", state: "PA", county: "Beaver", lat: 40.5989, lng: -80.3834, downtownName: "Route 18", tags: ["suburb"] },
  { name: "Potter", state: "PA", county: "Beaver", lat: 40.6689, lng: -80.3534, downtownName: "Route 68 Village", tags: ["suburb"] },
  { name: "Brighton Township", state: "PA", county: "Beaver", lat: 40.7289, lng: -80.3534, downtownName: "Dutch Ridge Road", tags: ["suburb"] },
  { name: "Chippewa", state: "PA", county: "Beaver", lat: 40.7589, lng: -80.3734, downtownName: "Shenango Road", tags: ["suburb"] },
  { name: "Marion Township", state: "PA", county: "Beaver", lat: 40.7889, lng: -80.3234, downtownName: "Route 588", tags: ["suburb"] },
  { name: "North Sewickley", state: "PA", county: "Beaver", lat: 40.7789, lng: -80.2834, downtownName: "Route 65", tags: ["suburb"] },
  { name: "Franklin Township Beaver", state: "PA", county: "Beaver", lat: 40.8089, lng: -80.2534, downtownName: "Route 288 Village", tags: ["suburb"] },
  { name: "New Sewickley", state: "PA", county: "Beaver", lat: 40.7289, lng: -80.2034, downtownName: "Freedom Road", tags: ["suburb"] },
  { name: "Pulaski Township", state: "PA", county: "Beaver", lat: 40.7789, lng: -80.4034, downtownName: "Route 351", tags: ["suburb"] },

  // —— Butler County ——
  { name: "Butler", state: "PA", county: "Butler", lat: 40.8612, lng: -79.8953, downtownName: "Main Street Downtown", tags: ["main_street", "county_seat", "city"] },
  { name: "Zelienople", state: "PA", county: "Butler", lat: 40.7945, lng: -80.1934, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Harmony", state: "PA", county: "Butler", lat: 40.8023, lng: -80.1273, downtownName: "Main Street Historic", tags: ["main_street"] },
  { name: "Evans City", state: "PA", county: "Butler", lat: 40.7692, lng: -80.0667, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Mars", state: "PA", county: "Butler", lat: 40.6956, lng: -80.0117, downtownName: "Grand Avenue Downtown", tags: ["main_street"] },
  { name: "Valencia", state: "PA", county: "Butler", lat: 40.6756, lng: -80.0489, downtownName: "Three Degree Road", tags: ["main_street"] },
  { name: "Seven Fields", state: "PA", county: "Butler", lat: 40.6889, lng: -80.0634, downtownName: "Route 228 Village", tags: ["suburb"] },
  { name: "Cranberry Township", state: "PA", county: "Butler", lat: 40.6845, lng: -80.1073, downtownName: "Route 19 / Freedom Road", tags: ["suburb"] },
  { name: "Callery", state: "PA", county: "Butler", lat: 40.7389, lng: -80.0389, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Saxonburg", state: "PA", county: "Butler", lat: 40.7534, lng: -79.8112, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Prospective", state: "PA", county: "Butler", lat: 40.8089, lng: -79.8334, downtownName: "Route 8 Village", tags: ["suburb"] },
  { name: "Lyndora", state: "PA", county: "Butler", lat: 40.8489, lng: -79.9189, downtownName: "Main Street", tags: ["main_street", "industrial"] },
  { name: "Meadowood", state: "PA", county: "Butler", lat: 40.8689, lng: -79.9389, downtownName: "New Castle Road", tags: ["suburb"] },
  { name: "Meridian", state: "PA", county: "Butler", lat: 40.8589, lng: -79.9589, downtownName: "Meridian Road", tags: ["suburb"] },
  { name: "Nixon", state: "PA", county: "Butler", lat: 40.7789, lng: -79.9289, downtownName: "Route 8", tags: ["suburb"] },
  { name: "Shanor-Northvue", state: "PA", county: "Butler", lat: 40.8889, lng: -79.9089, downtownName: "Route 8 North", tags: ["suburb"] },
  { name: "Homeacre-Lyndora", state: "PA", county: "Butler", lat: 40.8389, lng: -79.9289, downtownName: "New Castle Street", tags: ["suburb"] },
  { name: "Connoquenessing", state: "PA", county: "Butler", lat: 40.8189, lng: -80.0134, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Portersville", state: "PA", county: "Butler", lat: 40.9234, lng: -80.1434, downtownName: "Main Street", tags: ["main_street"] },

  // —— Washington County ——
  { name: "Washington", state: "PA", county: "Washington", lat: 40.174, lng: -80.2462, downtownName: "Main Street Downtown", tags: ["main_street", "county_seat", "city", "college"] },
  { name: "Canonsburg", state: "PA", county: "Washington", lat: 40.2626, lng: -80.1873, downtownName: "Pike Street Downtown", tags: ["main_street"] },
  { name: "Houston", state: "PA", county: "Washington", lat: 40.2489, lng: -80.2089, downtownName: "Pike Street", tags: ["main_street"] },
  { name: "McMurray", state: "PA", county: "Washington", lat: 40.2789, lng: -80.0834, downtownName: "McMurray Road Village", tags: ["suburb"] },
  { name: "Peters Township", state: "PA", county: "Washington", lat: 40.2689, lng: -80.0634, downtownName: "Washington Road / Venetia", tags: ["suburb"] },
  { name: "Cecil", state: "PA", county: "Washington", lat: 40.3289, lng: -80.1834, downtownName: "Route 50 Village", tags: ["suburb"] },
  { name: "Lawrence", state: "PA", county: "Washington", lat: 40.3089, lng: -80.2234, downtownName: "Route 19", tags: ["suburb"] },
  { name: "Charleroi", state: "PA", county: "Washington", lat: 40.1462, lng: -79.9014, downtownName: "McKean Avenue Downtown", tags: ["main_street", "river_town", "industrial"] },
  { name: "Monongahela", state: "PA", county: "Washington", lat: 40.2003, lng: -79.9264, downtownName: "Main Street", tags: ["main_street", "river_town"] },
  { name: "Donora", state: "PA", county: "Washington", lat: 40.1734, lng: -79.8576, downtownName: "Fifth Street Downtown", tags: ["main_street", "industrial", "river_town"] },
  { name: "Monessen", state: "PA", county: "Westmoreland", lat: 40.1615, lng: -79.8876, downtownName: "Donner Avenue", tags: ["main_street", "industrial", "river_town"] },
  { name: "Bentleyville", state: "PA", county: "Washington", lat: 40.1234, lng: -80.0089, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Ellsworth", state: "PA", county: "Washington", lat: 40.1089, lng: -80.0234, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Cokeburg", state: "PA", county: "Washington", lat: 40.0989, lng: -80.0634, downtownName: "Main Street", tags: ["main_street", "industrial"] },
  { name: "Burgettstown", state: "PA", county: "Washington", lat: 40.3809, lng: -80.3912, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Midway", state: "PA", county: "Washington", lat: 40.3689, lng: -80.2934, downtownName: "Main Street", tags: ["main_street"] },
  { name: "McDonald Washington", state: "PA", county: "Washington", lat: 40.3689, lng: -80.2334, downtownName: "East Lincoln Avenue", tags: ["main_street"] },
  { name: "Sturgeon", state: "PA", county: "Washington", lat: 40.3889, lng: -80.2134, downtownName: "Noblestown Road", tags: ["main_street"] },
  { name: "Imperial", state: "PA", county: "Allegheny", lat: 40.4534, lng: -80.2434, downtownName: "Route 30 / Imperial", tags: ["suburb"] },
  { name: "Bulger", state: "PA", county: "Washington", lat: 40.4089, lng: -80.3334, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Slovan", state: "PA", county: "Washington", lat: 40.3989, lng: -80.3534, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Avella", state: "PA", county: "Washington", lat: 40.2789, lng: -80.4534, downtownName: "Main Street", tags: ["main_street"] },
  { name: "West Middletown", state: "PA", county: "Washington", lat: 40.2389, lng: -80.4234, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Claysville", state: "PA", county: "Washington", lat: 40.1289, lng: -80.4134, downtownName: "Main Street", tags: ["main_street"] },

  // —— Westmoreland County (west) ——
  { name: "Greensburg", state: "PA", county: "Westmoreland", lat: 40.3015, lng: -79.5389, downtownName: "Main Street Downtown", tags: ["main_street", "county_seat", "city", "college"] },
  { name: "Jeannette", state: "PA", county: "Westmoreland", lat: 40.3281, lng: -79.6153, downtownName: "Fifth Street Downtown", tags: ["main_street", "industrial"] },
  { name: "Irwin", state: "PA", county: "Westmoreland", lat: 40.3245, lng: -79.7012, downtownName: "Main Street", tags: ["main_street"] },
  { name: "North Irwin", state: "PA", county: "Westmoreland", lat: 40.3389, lng: -79.7134, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Manor", state: "PA", county: "Westmoreland", lat: 40.3334, lng: -79.6689, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Penn", state: "PA", county: "Westmoreland", lat: 40.3289, lng: -79.6434, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Adamsburg", state: "PA", county: "Westmoreland", lat: 40.3089, lng: -79.6534, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Export", state: "PA", county: "Westmoreland", lat: 40.4189, lng: -79.6234, downtownName: "Washington Avenue", tags: ["main_street"] },
  { name: "Murrysville", state: "PA", county: "Westmoreland", lat: 40.4284, lng: -79.6976, downtownName: "Old William Penn Highway", tags: ["suburb", "main_street"] },
  { name: "Delmont", state: "PA", county: "Westmoreland", lat: 40.4134, lng: -79.5712, downtownName: "Greensburgh Street", tags: ["main_street"] },
  { name: "New Kensington", state: "PA", county: "Westmoreland", lat: 40.5698, lng: -79.7648, downtownName: "Fifth Avenue Downtown", tags: ["main_street", "river_town", "industrial"] },
  { name: "Arnold", state: "PA", county: "Westmoreland", lat: 40.5801, lng: -79.7667, downtownName: "Constitution Boulevard", tags: ["main_street", "industrial"] },
  { name: "Lower Burrell", state: "PA", county: "Westmoreland", lat: 40.5834, lng: -79.7212, downtownName: "Freeport Road", tags: ["suburb"] },
  { name: "Upper Burrell", state: "PA", county: "Westmoreland", lat: 40.6089, lng: -79.6834, downtownName: "Route 56 Village", tags: ["suburb"] },
  { name: "Vandergrift", state: "PA", county: "Westmoreland", lat: 40.6028, lng: -79.5648, downtownName: "Grant Avenue", tags: ["main_street", "industrial"] },
  { name: "East Vandergrift", state: "PA", county: "Westmoreland", lat: 40.5989, lng: -79.5589, downtownName: "Washington Avenue", tags: ["main_street"] },
  { name: "Hyde Park", state: "PA", county: "Westmoreland", lat: 40.5889, lng: -79.5834, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Oklahoma", state: "PA", county: "Westmoreland", lat: 40.5789, lng: -79.5734, downtownName: "Main Street", tags: ["main_street"] },
  { name: "West Newton", state: "PA", county: "Westmoreland", lat: 40.2089, lng: -79.7689, downtownName: "Main Street", tags: ["main_street", "river_town"] },
  { name: "Sutersville", state: "PA", county: "Westmoreland", lat: 40.2389, lng: -79.8034, downtownName: "First Street", tags: ["main_street", "river_town"] },
  { name: "Smithton", state: "PA", county: "Westmoreland", lat: 40.1589, lng: -79.7389, downtownName: "Second Street", tags: ["main_street"] },
  { name: "Madison", state: "PA", county: "Westmoreland", lat: 40.2489, lng: -79.6789, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Hunker", state: "PA", county: "Westmoreland", lat: 40.2089, lng: -79.6189, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Youngwood", state: "PA", county: "Westmoreland", lat: 40.2389, lng: -79.5789, downtownName: "Third Street", tags: ["main_street"] },
  { name: "Southwest Greensburg", state: "PA", county: "Westmoreland", lat: 40.2889, lng: -79.5489, downtownName: "Main Street", tags: ["main_street"] },
  { name: "South Greensburg", state: "PA", county: "Westmoreland", lat: 40.2789, lng: -79.5389, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Southwest Greensburg Heights", state: "PA", county: "Westmoreland", lat: 40.2989, lng: -79.5589, downtownName: "Otterman Street", tags: ["suburb"] },

  // —— Armstrong / Lawrence fringe ——
  { name: "Freeport", state: "PA", county: "Armstrong", lat: 40.6745, lng: -79.6848, downtownName: "Fifth Street Downtown", tags: ["main_street", "river_town"] },
  { name: "Apollo", state: "PA", county: "Armstrong", lat: 40.5815, lng: -79.5664, downtownName: "First Street", tags: ["main_street", "river_town"] },
  { name: "North Apollo", state: "PA", county: "Armstrong", lat: 40.5912, lng: -79.5589, downtownName: "North Fourth Street", tags: ["main_street"] },
  { name: "Leechburg", state: "PA", county: "Armstrong", lat: 40.6292, lng: -79.6056, downtownName: "Market Street", tags: ["main_street", "river_town"] },
  { name: "West Leechburg", state: "PA", county: "Westmoreland", lat: 40.6289, lng: -79.6189, downtownName: "Third Street", tags: ["main_street"] },
  { name: "New Castle", state: "PA", county: "Lawrence", lat: 41.0037, lng: -80.347, downtownName: "Washington Street Downtown", tags: ["main_street", "city", "county_seat"] },
  { name: "Ellwood City Lawrence", state: "PA", county: "Lawrence", lat: 40.8617, lng: -80.2867, downtownName: "Fifth Street", tags: ["main_street"] },
  { name: "Wampum", state: "PA", county: "Lawrence", lat: 40.8889, lng: -80.3389, downtownName: "Main Street", tags: ["main_street"] },
  { name: "New Wilmington", state: "PA", county: "Lawrence", lat: 41.1189, lng: -80.3334, downtownName: "Neshannock Avenue", tags: ["main_street", "college"] },

  // —— Ohio (within ~40mi of Allegheny) ——
  { name: "East Liverpool", state: "OH", county: "Columbiana", lat: 40.6187, lng: -80.5773, downtownName: "Fifth Street Downtown", tags: ["main_street", "river_town", "industrial"] },
  { name: "Wellsville", state: "OH", county: "Columbiana", lat: 40.6028, lng: -80.6489, downtownName: "Main Street", tags: ["main_street", "river_town"] },
  { name: "Toronto", state: "OH", county: "Jefferson", lat: 40.4642, lng: -80.6006, downtownName: "Market Street Downtown", tags: ["main_street", "river_town"] },
  { name: "Steubenville", state: "OH", county: "Jefferson", lat: 40.3698, lng: -80.634, downtownName: "Fourth Street Downtown", tags: ["main_street", "city", "college", "river_town"] },
  { name: "Mingo Junction", state: "OH", county: "Jefferson", lat: 40.3217, lng: -80.6123, downtownName: "Commercial Street", tags: ["main_street", "industrial", "river_town"] },
  { name: "Brilliant", state: "OH", county: "Jefferson", lat: 40.2689, lng: -80.6234, downtownName: "Third Street", tags: ["main_street", "river_town"] },
  { name: "Empire", state: "OH", county: "Jefferson", lat: 40.5089, lng: -80.6234, downtownName: "Main Street", tags: ["main_street", "river_town"] },
  { name: "Stratton", state: "OH", county: "Jefferson", lat: 40.5289, lng: -80.6334, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Salineville", state: "OH", county: "Columbiana", lat: 40.6223, lng: -80.8378, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Lisbon", state: "OH", county: "Columbiana", lat: 40.7737, lng: -80.7681, downtownName: "Market Street Downtown", tags: ["main_street", "county_seat"] },
  { name: "East Palestine", state: "OH", county: "Columbiana", lat: 40.8339, lng: -80.5403, downtownName: "Market Street", tags: ["main_street"] },
  { name: "Columbiana", state: "OH", county: "Columbiana", lat: 40.8884, lng: -80.6903, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Leetonia", state: "OH", county: "Columbiana", lat: 40.8773, lng: -80.7556, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Salem", state: "OH", county: "Columbiana", lat: 40.9009, lng: -80.8567, downtownName: "East State Street Downtown", tags: ["main_street", "city"] },
  { name: "Calcutta", state: "OH", county: "Columbiana", lat: 40.6789, lng: -80.5834, downtownName: "St. Clair Avenue", tags: ["suburb"] },
  { name: "Negley", state: "OH", county: "Columbiana", lat: 40.7889, lng: -80.5389, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Rogers", state: "OH", county: "Columbiana", lat: 40.7889, lng: -80.6089, downtownName: "Main Street", tags: ["main_street"] },
  { name: "New Waterford", state: "OH", county: "Columbiana", lat: 40.8489, lng: -80.6189, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Wintersville", state: "OH", county: "Jefferson", lat: 40.3789, lng: -80.7034, downtownName: "Main Street", tags: ["suburb", "main_street"] },
  { name: "Tiltonsville", state: "OH", county: "Jefferson", lat: 40.1789, lng: -80.6989, downtownName: "Walden Avenue", tags: ["main_street", "river_town"] },
  { name: "Yorkville", state: "OH", county: "Jefferson", lat: 40.1589, lng: -80.7089, downtownName: "Market Street", tags: ["main_street", "river_town"] },
  { name: "Adena", state: "OH", county: "Jefferson", lat: 40.2189, lng: -80.8734, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Smithfield", state: "OH", county: "Jefferson", lat: 40.2689, lng: -80.7834, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Richmond", state: "OH", county: "Jefferson", lat: 40.4389, lng: -80.7734, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Bergholz", state: "OH", county: "Jefferson", lat: 40.5189, lng: -80.8834, downtownName: "Main Street", tags: ["main_street"] },
  { name: "Irondale", state: "OH", county: "Jefferson", lat: 40.5689, lng: -80.7289, downtownName: "Main Street", tags: ["main_street", "industrial"] },
  { name: "Pollock", state: "OH", county: "Columbiana", lat: 40.7089, lng: -80.6289, downtownName: "State Route 7", tags: ["suburb"] },
  { name: "LaCroft", state: "OH", county: "Columbiana", lat: 40.6489, lng: -80.5834, downtownName: "St. Clair Avenue", tags: ["suburb"] },
];

function main() {
  const seen = new Set<string>();
  const downtowns = [];

  for (const r of RAW) {
    const miles = haversineMiles(ALLEGHENY, { lat: r.lat, lng: r.lng });
    if (miles > 42) continue; // soft 40mi band
    const id = `${slug(r.name)}-${r.state.toLowerCase()}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const tags = r.tags ?? ["main_street"];
    const downtownName = r.downtownName ?? `${r.name} Downtown`;
    const baseline = baselineFor(id, tags, miles);
    downtowns.push({
      id,
      name: r.name,
      state: r.state,
      county: r.county,
      milesFromAllegheny: Math.round(miles * 10) / 10,
      downtownName,
      center: { lat: r.lat, lng: r.lng },
      radiusM: r.radiusM ?? (tags.includes("city") ? 900 : 550),
      tags,
      baseline,
    });
  }

  downtowns.sort((a, b) => a.milesFromAllegheny - b.milesFromAllegheny || a.name.localeCompare(b.name));

  const outPath = path.join(process.cwd(), "data", "downtowns.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        alleghenyCenter: ALLEGHENY,
        radiusMiles: 40,
        count: downtowns.length,
        downtowns,
      },
      null,
      2
    )
  );
  console.log(`Wrote ${downtowns.length} downtowns → ${outPath}`);
}

main();
