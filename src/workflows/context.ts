import type { WorkflowExecution } from '../database/workflow_executions'
import type { Workflow } from '../database/workflows'

export interface ExecutionContext {
  execution: WorkflowExecution
  step_id: string
  trigger_user_id: string
  token: string // same as workflow.access_token!
  workflow: Workflow
  trigger_id?: string // the most recent one
}
