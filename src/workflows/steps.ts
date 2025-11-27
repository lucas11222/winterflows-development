import slack from '../clients/slack'
import type { ExecutionContext } from './context'

export type DataType = 'user' | 'channel' | 'text' | 'rich_text'

export type StepFunction<
  Inputs extends Record<string, string> = Record<string, string>,
  Outputs = void
> = (ctx: ExecutionContext, inputs: Inputs) => Outputs | Promise<Outputs>

export type StepIOSpec<
  T extends Record<string, string> = Record<string, string>
> = {
  [K in keyof T]: {
    name: string
    type: DataType
    required: boolean
  }
}

export type StepSpec<
  Inputs extends Record<string, string> = Record<string, string>,
  Outputs = void
> = {
  id: string
  inputs: StepIOSpec<Inputs>
} & (Outputs extends {} ? { outputs: StepIOSpec<Outputs> } : {})

export type WorkflowStep<
  Inputs extends Record<string, string> = Record<string, string>,
  Outputs = void
> = {
  func: StepFunction<Inputs, Outputs>
} & StepSpec<Inputs, Outputs>

function defineStep<
  Inputs extends Record<string, string> = Record<string, string>,
  Outputs = void
>(
  func: StepFunction<Inputs, Outputs>,
  spec: StepSpec<Inputs, Outputs>
): WorkflowStep<Inputs, Outputs> {
  return { func, ...spec }
}

// steps

async function sendMessageToUser(
  ctx: ExecutionContext,
  { user_id }: { user_id: string }
) {
  const msg = await slack.chat.postMessage({
    token: ctx.token,
    channel: user_id,
    text: 'Hello, Winterflows!',
  })
  return {
    ts: msg.ts!,
  }
}

// end steps

const steps: WorkflowStep<any, any>[] = [
  defineStep(sendMessageToUser, {
    id: 'test-dm-user',
    inputs: {
      user_id: {
        name: 'User to send a message to',
        required: true,
        type: 'user',
      },
    },
    outputs: {
      ts: {
        name: 'Timestamp of sent message',
        required: true,
        type: 'text',
      },
    },
  }),
]
export default steps
