import type { SlackAction } from '@slack/bolt'
import { startWorkflow } from '../workflows/execute'
import { deleteWorkflowById, getWorkflowById } from '../database/workflows'
import { updateCoreHomeTab } from './blocks'
import slack from '../clients/slack'
import { getActiveConfigToken } from '../utils/slack'

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
      if (!workflow) return

      await startWorkflow(workflow, interaction.user.id)
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
      if (!workflow) return

      const configToken = await getActiveConfigToken()
      if (!configToken) return

      await Promise.all([
        deleteWorkflowById(id),
        slack.apps.manifest.delete({
          token: configToken,
          app_id: workflow.app_id,
        }),
      ])

      await updateCoreHomeTab(interaction.user.id)
    }
  }
}
