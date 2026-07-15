/** Lightweight free web research for Computer Helper (DuckDuckGo HTML lite). */

export type ResearchSnippet = {
  title: string;
  url: string;
  snippet: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeDuckUrl(raw: string): string {
  try {
    if (raw.startsWith("//")) raw = `https:${raw}`;
    const u = new URL(raw, "https://duckduckgo.com");
    const uddg = u.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    return u.toString();
  } catch {
    return raw;
  }
}

/**
 * Best-effort public search. Failures return [] — caller still uses live LLM
 * with current-date context when research is empty.
 */
export async function researchComputerHelper(
  query: string,
  osLabel: string
): Promise<ResearchSnippet[]> {
  const q = `${osLabel} ${query} troubleshooting fix site:support.microsoft.com OR site:support.apple.com OR site:support.google.com OR official`.slice(
    0,
    220
  );
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "HavenPM-ComputerHelper/1.0 (+https://havenpm; troubleshooting research)",
        Accept: "text/html",
      },
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const html = await res.text();

    const out: ResearchSnippet[] = [];
    // DuckDuckGo HTML results: result__a + result__snippet
    const blockRe =
      /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|td|div)>)/gi;
    let m: RegExpExecArray | null;
    while ((m = blockRe.exec(html)) && out.length < 6) {
      const href = decodeDuckUrl(m[1]);
      const title = stripHtml(m[2]).slice(0, 160);
      const snippet = stripHtml(m[3] || "").slice(0, 320);
      if (!title || !href.startsWith("http")) continue;
      out.push({ title, url: href, snippet });
    }

    // Fallback: simpler link scrape if markup changed
    if (out.length === 0) {
      const linkRe =
        /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      while ((m = linkRe.exec(html)) && out.length < 5) {
        const href = decodeDuckUrl(m[1]);
        const title = stripHtml(m[2]).slice(0, 160);
        if (!title || !href.startsWith("http")) continue;
        out.push({ title, url: href, snippet: "" });
      }
    }

    return out;
  } catch {
    return [];
  }
}

export function formatResearchForPrompt(snips: ResearchSnippet[]): string {
  if (!snips.length) {
    return "(No live search snippets available — rely on current OS vendor guidance and up-to-date troubleshooting practice.)";
  }
  return snips
    .map(
      (s, i) =>
        `[${i + 1}] ${s.title}\nURL: ${s.url}\n${s.snippet || "(no snippet)"}`
    )
    .join("\n\n");
}
