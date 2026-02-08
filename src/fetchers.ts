import { requestUrl } from "obsidian";
import type { LinkCardMeta, LinkCardSettings, ProviderName } from "./types";

/** Remove common tracking params to stabilize caching. */
export function normalizeUrl(input: string, stripUtm: boolean): string {
  try {
    const u = new URL(input);
    if (!stripUtm) return u.toString();
    const kill = new Set([
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
      "msclkid",
      "igshid"
    ]);
    [...u.searchParams.keys()].forEach((k) => {
      if (kill.has(k.toLowerCase())) u.searchParams.delete(k);
    });
    return u.toString();
  } catch {
    return input;
  }
}

function absolutize(baseUrl: string, maybeRelative?: string): string | undefined {
  if (!maybeRelative) return undefined;
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return maybeRelative;
  }
}

function pickFirstImage(images: string[] | undefined): string | undefined {
  if (!images || images.length === 0) return undefined;
  return images.find(Boolean);
}

export async function fetchMetaWithProviders(
  url: string,
  settings: LinkCardSettings
): Promise<LinkCardMeta> {
  const normalized = normalizeUrl(url, settings.stripUtmParams);
  let lastErr: unknown = null;

  for (const provider of settings.providerOrder) {
    try {
      const meta = await fetchMeta(normalized, provider, settings);
      // Always ensure meta.url is set
      meta.url = normalized;
      // Best-effort absolutize image/favicon
      meta.image = absolutize(normalized, meta.image);
      meta.favicon = absolutize(normalized, meta.favicon);
      return meta;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr ?? new Error("No providers succeeded");
}

async function fetchMeta(
  url: string,
  provider: ProviderName,
  settings: LinkCardSettings
): Promise<LinkCardMeta> {
  switch (provider) {
    case "direct":
      return fetchDirect(url, settings);
    case "iframely":
      return fetchIframely(url, settings);
    case "linkpreview":
      return fetchLinkPreview(url, settings);
    case "jsonlink":
      return fetchJsonLink(url, settings);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Direct HTML fetch + parse OG/Twitter/meta tags.
 * Uses Obsidian requestUrl so it bypasses CORS restrictions.  [oai_citation:4‡Developer Documentation](https://docs.obsidian.md/Reference/TypeScript%2BAPI/requestUrl?utm_source=chatgpt.com)
 */
async function fetchDirect(url: string, settings: LinkCardSettings): Promise<LinkCardMeta> {
  const res = await requestUrl({
    url,
    method: "GET",
    headers: {
      "User-Agent": settings.userAgent,
      "Accept": "text/html,application/xhtml+xml"
    },
    timeout: settings.timeoutMs
  });

  if (res.status >= 400) {
    throw new Error(`Direct fetch failed: ${res.status}`);
  }

  const html = res.text;
  const doc = new DOMParser().parseFromString(html, "text/html");

  const getMeta = (selector: string): string | undefined => {
    const el = doc.querySelector(selector) as HTMLMetaElement | null;
    const v = el?.getAttribute("content")?.trim();
    return v || undefined;
  };

  const title =
    getMeta('meta[property="og:title"]') ||
    getMeta('meta[name="twitter:title"]') ||
    doc.querySelector("title")?.textContent?.trim() ||
    undefined;

  const description =
    getMeta('meta[property="og:description"]') ||
    getMeta('meta[name="twitter:description"]') ||
    getMeta('meta[name="description"]') ||
    undefined;

  const image =
    getMeta('meta[property="og:image"]') ||
    getMeta('meta[name="twitter:image"]') ||
    undefined;

  const siteName = getMeta('meta[property="og:site_name"]') || new URL(url).hostname;

  const favicon =
    (doc.querySelector('link[rel="icon"]') as HTMLLinkElement | null)?.href ||
    (doc.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement | null)?.href ||
    undefined;

  return { url, title, description, image, siteName, favicon };
}

/**
 * Iframely endpoint:
 * iframe.ly/api/iframely?url={URL}&api_key={API_KEY}  [oai_citation:5‡Iframely](https://iframely.com/docs/iframely-api)
 */
async function fetchIframely(url: string, settings: LinkCardSettings): Promise<LinkCardMeta> {
  if (!settings.iframelyApiKey) throw new Error("Missing Iframely API key");

  const apiUrl =
    `https://iframe.ly/api/iframely?url=${encodeURIComponent(url)}` +
    `&api_key=${encodeURIComponent(settings.iframelyApiKey)}`;

  const res = await requestUrl({
    url: apiUrl,
    method: "GET",
    headers: { "User-Agent": settings.userAgent, "Accept": "application/json" },
    timeout: settings.timeoutMs
  });

  if (res.status >= 400) throw new Error(`Iframely failed: ${res.status}`);

  const data = res.json as any;
  const meta = data?.meta ?? {};

  const image =
    pickFirstImage(meta?.thumbnail ? [meta.thumbnail] : undefined) ||
    pickFirstImage(meta?.images);

  return {
    url,
    title: meta?.title,
    description: meta?.description,
    image,
    siteName: meta?.site,
    favicon: meta?.icon
  };
}

/**
 * LinkPreview API:
 * GET https://api.linkpreview.net/?q=<URL> with header X-Linkpreview-Api-Key  [oai_citation:6‡LinkPreview API](https://docs.linkpreview.net/)
 */
async function fetchLinkPreview(url: string, settings: LinkCardSettings): Promise<LinkCardMeta> {
  if (!settings.linkPreviewApiKey) throw new Error("Missing LinkPreview API key");

  const apiUrl = `https://api.linkpreview.net/?q=${encodeURIComponent(url)}`;
  const res = await requestUrl({
    url: apiUrl,
    method: "GET",
    headers: {
      "User-Agent": settings.userAgent,
      "Accept": "application/json",
      "X-Linkpreview-Api-Key": settings.linkPreviewApiKey
    },
    timeout: settings.timeoutMs
  });

  if (res.status >= 400) throw new Error(`LinkPreview failed: ${res.status}`);

  const data = res.json as any;
  return {
    url: data?.url ?? url,
    title: data?.title,
    description: data?.description,
    image: data?.image,
    siteName: data?.url ? new URL(data.url).hostname : new URL(url).hostname,
    favicon: undefined
  };
}

/**
 * JsonLink extract endpoint:
 * https://jsonlink.io/api/extract?api_key=<API_KEY>&url=<URL>  [oai_citation:7‡JsonLink](https://jsonlink.io/docs)
 */
async function fetchJsonLink(url: string, settings: LinkCardSettings): Promise<LinkCardMeta> {
  if (!settings.jsonLinkApiKey) throw new Error("Missing JsonLink API key");

  const apiUrl =
    `https://jsonlink.io/api/extract?api_key=${encodeURIComponent(settings.jsonLinkApiKey)}` +
    `&url=${encodeURIComponent(url)}`;

  const res = await requestUrl({
    url: apiUrl,
    method: "GET",
    headers: { "User-Agent": settings.userAgent, "Accept": "application/json" },
    timeout: settings.timeoutMs
  });

  if (res.status >= 400) throw new Error(`JsonLink failed: ${res.status}`);

  const data = res.json as any;
  return {
    url: data?.url ?? url,
    title: data?.title,
    description: data?.description,
    image: pickFirstImage(data?.images),
    siteName: data?.sitename ?? data?.domain ?? new URL(url).hostname,
    favicon: data?.favicon
  };
}