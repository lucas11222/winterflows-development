import { addTrigger, type Trigger } from '../database/triggers'

export async function createTimeTrigger(
  time: number,
  trigger: Omit<Trigger, 'id' | 'type' | 'val_string' | 'val_number'>
) {
  await addTrigger({
    ...trigger,
    type: 'time',
    val_string: null,
    val_number: time,
  })
}
