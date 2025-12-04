import { CronExpressionParser } from 'cron-parser'

export function validateCron(expr: string) {
  if (expr.trim().split(/\s+/).length !== 5) {
    return { ok: false, message: 'Cron expressions must have exactly 5 fields' }
  }

  try {
    const cron = CronExpressionParser.parse(expr, {
      tz: 'UTC',
    })

    const a = cron.next().getTime()
    const b = cron.next().getTime()

    if (b - a < 60 * 60 * 1000) {
      return {
        ok: false,
        message: 'Cron expressions can only trigger once per hour at maximum',
      }
    }

    return { ok: true, next: a }
  } catch {
    return { ok: false, message: 'Failed to parse cron expression' }
  }
}
