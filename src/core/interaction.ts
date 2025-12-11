import type { SlackAction, ViewOutput } from '@slack/bolt'
import { startWorkflow } from '../workflows/execute'
import { deleteWorkflowById, getWorkflowById } from '../database/workflows'
import { generateComponentsHelperView, updateCoreHomeTab } from './blocks'
import slack from '../clients/slack'
import { getActiveConfigToken, respond } from '../utils/slack'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN!

export async function handleCoreInteraction(interaction: SlackAction) {
  if (interaction.type === 'block_actions') {
    const action = interaction.actions[0]
    if (!action) return
    const actionId = action.action_id

    if (actionId === 'run_workflow_home') {
      // the "Run workflow" button was pressed on the App Home or a message embed

      if (action.type !== 'button') return

      const { id } = JSON.parse(action.value!) as { id: number }
      const workflow = await getWorkflowById(id)
      if (!workflow) return respond(interaction, 'The workflow is not found!')

      await startWorkflow(
        workflow,
        interaction.user.id,
        undefined,
        interaction.trigger_id
      )
    } else if (actionId === 'search_workflows') {
      // the search workflow input on App Home was submitted

      if (action.type !== 'plain_text_input') return

      const search = action.value

      await updateCoreHomeTab(interaction.user.id, search)
    } else if (actionId === 'delete_workflow') {
      // the "Delete" button was pressed on the app home

      if (action.type !== 'button') return

      const { id } = JSON.parse(action.value!) as { id: number }
      const workflow = await getWorkflowById(id)
      if (!workflow) return respond(interaction, 'The workflow is not found!')

      const configToken = await getActiveConfigToken()
      if (!configToken)
        return respond(
          interaction,
          'No app config token was set, or it has expired. Please contact the devs for assistance.'
        )

      if (workflow.access_token)
        await slack.apps.uninstall({
          token: workflow.access_token,
          client_id: workflow.client_id,
          client_secret: workflow.client_secret,
        })
      await Promise.all([
        deleteWorkflowById(id),
        slack.apps.manifest.delete({
          token: configToken,
          app_id: workflow.app_id,
        }),
      ])

      await updateCoreHomeTab(interaction.user.id)
    } else if (action.action_id === 'open_components_generator') {
      // the "Message components generator" button on App Home is clicked

      if (action.type !== 'button') return

      await slack.views.open({
        token: SLACK_BOT_TOKEN,
        trigger_id: interaction.trigger_id,
        view: await generateComponentsHelperView(1),
      })
    } else if (action.action_id === 'component_helper_update') {
      // something is edited in a component helper modal

      const { count } = JSON.parse(interaction.view!.private_metadata) as {
        count: number
      }
      const data = extractComponentData(interaction.view!.state.values)

      await slack.views.update({
        token: SLACK_BOT_TOKEN,
        view_id: interaction.view!.id,
        view: await generateComponentsHelperView(count, JSON.stringify(data)),
      })
    } else if (action.action_id === 'component_helper_add') {
      // the "Add button" button is clicked in component helper

      if (action.type !== 'button') return

      const { count } = JSON.parse(interaction.view!.private_metadata) as {
        count: number
      }
      await slack.views.update({
        token: SLACK_BOT_TOKEN,
        view_id: interaction.view!.id,
        view: await generateComponentsHelperView(count + 1),
      })
    } else if (action.action_id === 'component_helper_delete') {
      // the "Delete last button" button is clicked in component helper

      if (action.type !== 'button') return

      const { count } = JSON.parse(interaction.view!.private_metadata) as {
        count: number
      }
      await slack.views.update({
        token: SLACK_BOT_TOKEN,
        view_id: interaction.view!.id,
        view: await generateComponentsHelperView(count - 1),
      })
    }
  }
}

function extractComponentData(values: ViewOutput['state']['values']) {
  const items: { name: string; style?: string }[] = []
  for (let i = 0; ; i++) {
    if (`${i}_name` in values && `${i}_style` in values) {
      items.push({
        name: values[`${i}_name`]!.component_helper_update!.value! || '',
        style:
          values[`${i}_style`]!.component_helper_update!.selected_option
            ?.value || undefined,
      })
    } else {
      return items
    }
  }
}
