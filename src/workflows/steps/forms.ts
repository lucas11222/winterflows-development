import type { ViewSubmitAction } from '@slack/bolt'
import type { RichTextBlock } from '@slack/types'
import { defineStep, PENDING } from '.'
import slack from '../../clients/slack'
import { createModalTrigger } from '../../triggers/create'
import { registerTriggerFunction } from '../../triggers/functions'
import { generateRandomId } from '../../utils/formatting'
import type { ExecutionContext } from '../context'
import { advanceWorkflow } from '../execute'

async function collectDataInForm(
  ctx: ExecutionContext,
  { title, body, questions }: { title: string; body: string; questions: string }
) {
  if (!ctx.trigger_id) {
    throw new Error(
      'The form action can only be run from a Slack interaction, such as a button click. This is a Slack limitation.'
    )
  }
  if (title.length > 24) {
    throw new Error('The form title must be 24 characters or less')
  }

  const qs = JSON.parse(questions) as string[]
  const id = generateRandomId()

  const bodyBlocks = body ? [JSON.parse(body) as RichTextBlock] : []

  await slack.views.open({
    token: ctx.token,
    trigger_id: ctx.trigger_id,
    view: {
      type: 'modal',
      title: { type: 'plain_text', text: title },
      submit: { type: 'plain_text', text: 'Submit' },
      callback_id: 'trigger',
      private_metadata: JSON.stringify({ id }),
      blocks: [
        ...bodyBlocks,
        ...qs.map((q, i) => ({
          type: 'input',
          block_id: `${i}`,
          label: { type: 'plain_text', text: q },
          element: { type: 'plain_text_input', action_id: 'value' },
        })),
      ],
    },
  })
  ctx.trigger_id = undefined
  await createModalTrigger(id, {
    workflow_id: null,
    execution_id: ctx.execution.id,
    func: 'steps.form-collect.submit',
    details: JSON.stringify({ stepId: ctx.step_id }),
  })
  return PENDING
  return { '0': '' }
}

registerTriggerFunction(
  'steps.form-collect.submit',
  async (trigger, data: ViewSubmitAction) => {
    const { stepId } = JSON.parse(trigger.details!)
    const outputs: Record<string, any> = {}
    for (const [blockId, block] of Object.entries(data.view.state.values)) {
      outputs[blockId] = block.value!.value!
    }
    await advanceWorkflow(
      trigger.execution_id!,
      stepId,
      outputs,
      data.trigger_id
    )
  }
)

export default {
  'form-collect': defineStep(collectDataInForm, {
    name: 'Collect info in a form',
    category: 'Forms',
    inputs: {
      title: {
        type: 'text',
        name: 'Form title',
        required: true,
      },
      body: {
        type: 'rich_text',
        name: 'Form body text',
        required: false,
      },
      questions: {
        type: 'text',
        name: 'Questions',
        description:
          'Enter your questions in a JSON array format, like this: `["What do you like?". "Why are you here?"]`',
        required: true,
      },
    },
    outputs: {
      '0': {
        type: 'text',
        required: true,
        name: 'Responses (change `.0` for other answers)',
      },
    },
  }),
}
