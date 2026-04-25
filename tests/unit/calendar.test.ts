import { inferCalendarDate } from '../../src/main/calendar'
import type { Priority } from '../../src/shared/constants'

describe('inferCalendarDate', () => {
  const now = new Date('2026-04-25T10:00:00')

  it.each([
    ['inbox', '2026-04-25'],
    ['for-now', '2026-04-25'],
    ['today', '2026-04-25'],
    ['tomorrow', '2026-04-26'],
    ['this-week', '2026-04-28'],
    ['someday', '2026-05-02']
  ] satisfies Array<[Priority, string]>)('maps %s to %s', (priority, expected) => {
    expect(inferCalendarDate(priority, now)).toBe(expected)
  })
})
