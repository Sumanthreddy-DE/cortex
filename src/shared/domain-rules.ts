const DOMAIN_MAP: Record<string, string> = {
  'reddit.com': 'Reddit',
  'old.reddit.com': 'Reddit',
  'github.com': 'GitHub',
  'gist.github.com': 'GitHub',
  'x.com': 'X',
  'twitter.com': 'X',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'linkedin.com': 'LinkedIn',
  'news.ycombinator.com': 'HackerNews',
  'medium.com': 'Medium',
  'producthunt.com': 'ProductHunt',
  'stackoverflow.com': 'StackOverflow',
  'dev.to': 'DevTo',
  'substack.com': 'Substack'
}

export function getDomainTag(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    return DOMAIN_MAP[hostname] ?? null
  } catch {
    return null
  }
}
