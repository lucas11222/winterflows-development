import { sql } from 'bun'
import {
  deleteTriggerById,
  getTriggersByType,
  getTriggersWhere,
} from '../database/triggers'
import { executeTriggerFunction } from './functions'
import CronExpressionParser from 'cron-parser'

export async function timeTriggerTask() {
  while (true) {
    const timerTriggers = await getTriggersWhere(
      sql`type = 'time' AND val_number < ${Date.now()}`
    )
    try {
      await Promise.all(timerTriggers.map((t) => deleteTriggerById(t.id)))
      for (const trigger of timerTriggers) {
        executeTriggerFunction(trigger)
      }
    } catch (e) {
      console.error('Failed to execute time triggers:', e)
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

const startTime = Date.now()
const cronLastTriggerTime: Record<number, number> = {}

function getLastTriggerTime(triggerId: number) {
  return cronLastTriggerTime[triggerId] ?? startTime
}

export async function cronTriggerTask() {
  while (true) {
    const triggers = await getTriggersByType('cron')
    const now = Date.now()

    for (const trigger of triggers) {
      const expr = CronExpressionParser.parse(trigger.val_string!, {
        currentDate: getLastTriggerTime(trigger.id),
        tz: 'UTC',
      })
      const date = expr.next()
      if (date.getTime() < now) {
        cronLastTriggerTime[trigger.id] = now
        executeTriggerFunction(trigger)
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}
