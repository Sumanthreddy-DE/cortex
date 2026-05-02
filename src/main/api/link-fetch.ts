import Database from 'better-sqlite3'
import { updateItemTitle } from './items'

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
}

export async function fetchAndUpdateLinkTitle(
  db: Database.Database,
  id: string,
  url: string
): Promise<void> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8_000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Cortex/1.0)'
      }
    })

    if (!response.ok) {
      return
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) {
      return
    }

    const html = await response.text()
    const ogTitle =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]
    const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]
    const title = decodeHtmlEntities((ogTitle ?? titleTag ?? '').trim().replace(/\s+/g, ' '))

    if (title) {
      updateItemTitle(db, id, title)
    }
  } catch {
    // Keep the original title when metadata fetch fails.
  }
}
