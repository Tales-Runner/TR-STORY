export function normalizeSiteUrl(value: string): string {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Site URL must be an HTTP(S) URL without credentials, query or fragment');
  }
  return url.href.replace(/\/+$/, '');
}

export function absoluteSiteUrl(siteUrl: string, path = '/'): string {
  return `${normalizeSiteUrl(siteUrl)}/${path.replace(/^\/+/, '')}`;
}
