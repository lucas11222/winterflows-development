import type { Trigger } from '../database/triggers'

export type TriggerFunction = (trigger: Trigger) => unknown

const FUNCTIONS: Record<string, TriggerFunction> = {}

export function registerTriggerFunction(name: string, func: TriggerFunction) {
  FUNCTIONS[name] = func
}

export async function executeTriggerFunction(trigger: Trigger) {
  const callback = FUNCTIONS[trigger.func]
  if (!callback) {
    throw new Error(`Callback function ${trigger.func} is undefined`)
  }
  return callback(trigger)
}
