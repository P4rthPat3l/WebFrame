export function getDomainFromUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain
      .replace(/^www\./, '')
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();
  } catch {
    return 'screenshot';
  }
}
