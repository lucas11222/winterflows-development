import type { Workflow } from '../database/workflows'

export interface ExecutionContext {
  trigger_user_id: string
  token: string // same as workflow.access_token!
  workflow: Workflow
}
