import { defineStep, PENDING } from '.'
import { createTimeTrigger } from '../../triggers/create'
import { registerTriggerFunction } from '../../triggers/functions'
import type { ExecutionContext } from '../context'
import { advanceWorkflow } from '../execute'

async function delayWorkflow(ctx: ExecutionContext, { ms }: { ms: string }) {
  const time = parseFloat(ms)
  if (isNaN(time)) {
    throw new Error(`Failed to parse sleep duration \`${ms}\``)
  }
  await createTimeTrigger(Date.now() + time, {
    workflow_id: null,
    execution_id: ctx.execution.id,
    func: 'steps.delay.restart',
    details: ctx.step_id,
  })
  return PENDING
  return {}
}

registerTriggerFunction('steps.delay.restart', async (trigger) => {
  const stepId = trigger.details!
  await advanceWorkflow(trigger.execution_id!, stepId, {})
})

async function stopWorkflow(): Promise<typeof PENDING> {
  // FIXME: if i ever implementing calling other workflows, this won't
  // really work :( but for now it's fine
  return PENDING
}

export default {
  delay: defineStep(delayWorkflow, {
    name: 'Delay execution',
    category: 'Utilities',
    inputs: {
      ms: { name: 'Time (in ms)', required: true, type: 'text' },
    },
    outputs: {},
  }),
  stop: defineStep(stopWorkflow, {
    name: 'Stop the workflow',
    category: 'Utilities',
    inputs: {},
    outputs: {},
  }),
}
