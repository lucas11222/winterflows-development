import type { KnownBlock, ModalView } from '@slack/types'
import type { Workflow } from '../database/workflows'
import { getWorkflowSteps } from '../utils/workflows'
import type { WorkflowStep } from './execute'
import type { WorkflowStepMap } from './steps'
import steps from './steps'
import slack from '../clients/slack'
import { truncateText } from '../utils/formatting'

export async function updateHomeTab(workflow: Workflow, user: string) {
  if (!workflow.access_token) return

  const blocks =
    user === workflow.creator_user_id
      ? await generateWorkflowEditView(workflow)
      : await generateWorkflowView(workflow)

  await slack.views.publish({
    token: workflow.access_token,
    user_id: user,
    view: { type: 'home', blocks },
  })
}

export async function generateWorkflowEditView(
  workflow: Workflow
): Promise<KnownBlock[]> {
  const stepBlocks = getWorkflowSteps(workflow).flatMap((s, i) =>
    generateStepEditBlocks(s, i, workflow)
  )

  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: workflow.name },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: workflow.description },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Run workflow' },
          action_id: 'run_workflow_home',
          value: JSON.stringify({ id: workflow.id }),
          style: 'primary',
        },
      ],
    },
    { type: 'divider' },
    {
      type: 'header',
      text: { type: 'plain_text', text: 'Steps' },
    },
    ...stepBlocks,
  ]
}

function generateStepEditBlocks<T extends keyof WorkflowStepMap>(
  step: WorkflowStep<T>,
  index: number,
  workflow: Workflow
): KnownBlock[] {
  const id = step.type_id
  const spec = steps[id]

  let text = `${index + 1}. *${spec.name}*`

  for (const [key, arg] of Object.entries(spec.inputs)) {
    text += `\n${arg.name}: \`${step.inputs[key as keyof typeof step.inputs]}\``
  }

  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text },
      accessory: {
        type: 'button',
        text: { type: 'plain_text', text: 'Edit' },
        value: JSON.stringify({ workflowId: workflow.id, stepId: step.id }),
        action_id: 'edit_step',
      },
    },
  ]
}

export async function generateWorkflowView(
  workflow: Workflow
): Promise<KnownBlock[]> {
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: workflow.name },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: workflow.description },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Run workflow' },
          action_id: 'run_workflow_home',
          value: JSON.stringify({ id: workflow.id }),
          style: 'primary',
        },
      ],
    },
  ]
}

export async function generateStepEditView(
  workflow: Workflow,
  stepIndex: number
): Promise<ModalView> {
  const step = getWorkflowSteps(workflow)[stepIndex]!

  const spec = steps[step.type_id as keyof WorkflowStepMap]!

  const inputBlocks = Object.entries(spec.inputs).flatMap(([key, def]) => {
    return [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${def.name}${
            def.required ? ' _(required)_' : ''
          }\nCurrent: \`${step.inputs[key]}\``,
        },
        accessory: {
          type: 'static_select',
          action_id: `update_input:${workflow.id}:${step.id}:${key}`,
          option_groups: [
            {
              label: { type: 'plain_text', text: 'Dynamic content' },
              options: [
                {
                  text: {
                    type: 'plain_text',
                    text: 'User that started this workflow',
                  },
                  value: '$!{ctx.trigger_user_id}',
                },
                { text: { type: 'plain_text', text: 'test' }, value: 'test' },
              ],
            },
          ],
        },
      },
    ] satisfies KnownBlock[]
  })

  return {
    type: 'modal',
    title: {
      type: 'plain_text',
      text: truncateText(`Editing step ${stepIndex + 1}`, 24),
    },
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: spec.name } },
      { type: 'section', text: { type: 'mrkdwn', text: '*Inputs*' } },
      ...inputBlocks,
    ],
  }
}
