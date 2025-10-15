const DEFAULT_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";

const PREVIEW_HOST_SUFFIXES = (process.env.NEXT_PUBLIC_PREVIEW_HOST_SUFFIXES ||
  ".netlify.app,.vercel.app")
  .split(",")
  .map((suffix) => suffix.trim())
  .filter(Boolean);

const primarySiteUrl = parseUrl(DEFAULT_SITE_URL);

function parseUrl(value: string | undefined): URL {
  const fallback = "http://localhost:3000";

  if (!value) {
    return new URL(fallback);
  }

  const hasScheme = /^https?:\/\//i.test(value);
  const normalized = hasScheme ? value : `https://${value}`;

  try {
    return new URL(normalized);
  } catch {
    return new URL(fallback);
  }
}

function isLocalHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.startsWith("localhost:") ||
    hostname === "127.0.0.1"
  );
}

function isIpAddress(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

export function getPrimarySiteUrl(): URL {
  return primarySiteUrl;
}

export function isPreviewHost(hostname: string): boolean {
  if (!hostname) return false;

  if (hostname === primarySiteUrl.hostname) {
    return false;
  }

  if (isLocalHost(hostname) || isIpAddress(hostname)) {
    return false;
  }

  return PREVIEW_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

export function resolveRedirectOrigin(
  hostname: string,
  origin: string,
  protocol?: string
): string {
  if (protocol === "http:" && primarySiteUrl.protocol === "https:") {
    return primarySiteUrl.origin;
  }

  return isPreviewHost(hostname) ? primarySiteUrl.origin : origin;
}

export function resolveRequestRedirectOrigin(requestUrl: URL): string {
  return resolveRedirectOrigin(
    requestUrl.hostname,
    requestUrl.origin,
    requestUrl.protocol
  );
}
