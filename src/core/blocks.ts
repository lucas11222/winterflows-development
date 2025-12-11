import type {
  ActionsBlockElement,
  Button,
  HomeView,
  KnownBlock,
  ModalView,
} from '@slack/types'
import { getWorkflowsByCreator, type Workflow } from '../database/workflows'
import slack from '../clients/slack'
import { truncateText } from '../utils/formatting'
import { WORKFLOW_APP_SCOPES } from '../consts'
import { getTriggersWhere } from '../database/triggers'
import { sql } from 'bun'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN!

export async function updateCoreHomeTab(userId: string, search?: string) {
  const workflows = await getWorkflowsByCreator(userId)

  await slack.views.publish({
    token: SLACK_BOT_TOKEN,
    user_id: userId,
    view: await generateCoreHomeView(workflows, search),
  })
}

const MAX_WORKFLOWS_PER_PAGE = 25

async function generateCoreHomeView(
  workflows: Workflow[],
  search?: string
): Promise<HomeView> {
  const filteredWorkflows = workflows.filter(
    (w) =>
      (!search || w.name.toLowerCase().includes(search.toLowerCase())) &&
      w.access_token
  )

  const blocks: KnownBlock[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'Welcome to Winterflows!' },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Next-generation workflows, rising just as the long winter of Slack workflows begins... :snowflake:',
      },
    },
    { type: 'divider' },
    { type: 'header', text: { type: 'plain_text', text: 'Tools' } },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Message components generator' },
          action_id: 'open_components_generator',
        },
      ],
    },
    { type: 'divider' },
  ]

  if (!search) {
    const unauthedWorkflows = workflows.filter((w) => !w.access_token)
    if (unauthedWorkflows.length) {
      blocks.push(
        {
          type: 'header',
          text: { type: 'plain_text', text: 'Unauthorized workflows' },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              'Please click on the links below to install these workflow apps to activate them!\n' +
              unauthedWorkflows
                .map(
                  (w) =>
                    `*${
                      w.name
                    }*: <https://slack.com/oauth/v2/authorize?client_id=${
                      w.client_id
                    }&scope=${encodeURIComponent(
                      WORKFLOW_APP_SCOPES.join(',')
                    )}&state=${w.app_id}|install>`
                )
                .join('\n'),
          },
        }
      )
    }
  }

  blocks.push({
    type: 'header',
    text: { type: 'plain_text', text: 'Your workflows' },
  })

  if (!workflows.length) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Looks like your workflow forest is still bare. Use the `/winterflows-create` command to grow your first snow-covered workflow!',
      },
    })
  } else {
    blocks.push({
      type: 'input',
      label: { type: 'plain_text', text: ':mag: Search', emoji: true },
      element: {
        type: 'plain_text_input',
        action_id: 'search_workflows',
        placeholder: {
          type: 'plain_text',
          text: 'Type here to search through the snow...',
        },
        initial_value: search || undefined,
        dispatch_action_config: {
          trigger_actions_on: ['on_character_entered'],
        },
      },
      dispatch_action: true,
    })
    if (!filteredWorkflows.length) {
      blocks.push({
        type: 'section',
        text: {
          type: 'plain_text',
          text: 'No matching and installed workflows found.',
        },
      })
    }
    if (filteredWorkflows.length > MAX_WORKFLOWS_PER_PAGE) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '_Only the first 25 workflows shown. To see more, use the search bar above._',
        },
      })
    }
    for (const workflow of filteredWorkflows.slice(0, MAX_WORKFLOWS_PER_PAGE)) {
      const trigger = await getTriggersWhere(sql`workflow_id = ${workflow.id}`)
      const runButtons: ActionsBlockElement[] = trigger.length
        ? []
        : [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Run workflow' },
              action_id: 'run_workflow_home',
              value: JSON.stringify({ id: workflow.id }),
              style: 'primary',
            },
          ]
      blocks.push(
        { type: 'header', text: { type: 'plain_text', text: workflow.name } },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: workflow.description },
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Edit' },
              url: `slack://app?id=${workflow.app_id}&tab=home`,
            },
            ...runButtons,
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Delete' },
              action_id: 'delete_workflow',
              value: JSON.stringify({ id: workflow.id }),
              style: 'danger',
              confirm: {
                title: {
                  type: 'plain_text',
                  text: truncateText(`Delete "${workflow.name}"`, 100),
                },
                text: {
                  type: 'mrkdwn',
                  text: 'Are you sure you want to delete this workflow? This cannot be undone.',
                },
                confirm: { type: 'plain_text', text: 'Delete' },
                deny: { type: 'plain_text', text: 'Cancel' },
                style: 'danger',
              },
            },
          ],
        }
      )
    }
  }

  return { type: 'home', blocks }
}

export async function generateComponentsHelperView(
  count: number,
  generated?: string
): Promise<ModalView> {
  const generatedBlocks: KnownBlock[] = generated
    ? [
        {
          type: 'rich_text',
          elements: [
            {
              type: 'rich_text_section',
              elements: [
                { type: 'text', text: 'Generated JSON', style: { bold: true } },
                {
                  type: 'text',
                  text: '\nYou can copy this to any workflow step that accepts a JSON array of interactive buttons.',
                },
              ],
            },
            {
              type: 'rich_text_preformatted',
              elements: [{ type: 'text', text: generated }],
            },
          ],
        },
      ]
    : []

  const deleteButtons: Button[] =
    count > 1
      ? [
          {
            type: 'button',
            action_id: 'component_helper_delete',
            text: { type: 'plain_text', text: 'Delete last button' },
            style: 'danger',
          },
        ]
      : []

  const blocks: KnownBlock[] = [
    ...Array.from({ length: count }).flatMap(
      (_, i) =>
        [
          {
            type: 'input',
            block_id: `${i}_name`,
            label: { type: 'plain_text', text: `Button #${i + 1}` },
            dispatch_action: true,
            element: {
              type: 'plain_text_input',
              action_id: 'component_helper_update',
              placeholder: {
                type: 'plain_text',
                text: 'Enter the text shown on the button',
              },
              max_length: 75,
              dispatch_action_config: {
                trigger_actions_on: ['on_character_entered'],
              },
            },
          },
          {
            type: 'input',
            block_id: `${i}_style`,
            label: { type: 'plain_text', text: 'Style' },
            optional: true,
            dispatch_action: true,
            element: {
              type: 'static_select',
              action_id: 'component_helper_update',
              placeholder: {
                type: 'plain_text',
                text: 'Choose a button style',
              },
              options: [
                {
                  text: { type: 'plain_text', text: 'Primary' },
                  value: 'primary',
                },
                {
                  text: { type: 'plain_text', text: 'Danger' },
                  value: 'danger',
                },
              ],
            },
          },
        ] satisfies KnownBlock[]
    ),
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          action_id: 'component_helper_add',
          text: {
            type: 'plain_text',
            text: ':heavy_plus_sign: Add button',
            emoji: true,
          },
        },
        ...deleteButtons,
      ],
    },
    ...generatedBlocks,
  ]

  return {
    type: 'modal',
    callback_id: 'components_helper',
    private_metadata: JSON.stringify({ count }),
    title: { type: 'plain_text', text: 'Generate components' },
    submit: { type: 'plain_text', text: 'Done' },
    blocks,
  }
}
