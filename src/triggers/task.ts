import { sql } from 'bun'
import { deleteTriggerById, getTriggersWhere } from '../database/triggers'
import { executeTriggerFunction } from './functions'

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
