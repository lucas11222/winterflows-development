import slack from '../../clients/slack'
import type { ExecutionContext } from '../context'
import { defineStep } from '.'

async function sendMessageToUser(
  ctx: ExecutionContext,
  { user_id, message }: { user_id: string; message: string }
) {
  const msg = await slack.chat.postMessage({
    token: ctx.token,
    channel: user_id,
    blocks: [JSON.parse(message)],
  })
  return {
    message: JSON.stringify({ channel: msg.channel!, ts: msg.ts! }),
  }
}

async function sendMessageToChannel(
  ctx: ExecutionContext,
  { channel, message }: { channel: string; message: string }
) {
  const msg = await slack.chat.postMessage({
    token: ctx.token,
    channel,
    blocks: [JSON.parse(message)],
  })
  return {
    message: JSON.stringify({ channel: msg.channel!, ts: msg.ts! }),
  }
}

async function replyToMessage(
  ctx: ExecutionContext,
  { thread, message }: { thread: string; message: string }
) {
  const { channel, ts } = JSON.parse(thread)
  const msg = await slack.chat.postMessage({
    token: ctx.token,
    channel,
    thread_ts: ts,
    blocks: [JSON.parse(message)],
  })
  return {
    message: JSON.stringify({ channel: msg.channel!, ts: msg.ts! }),
  }
}

async function addReactionToMessage(
  ctx: ExecutionContext,
  { message, emoji }: { message: string; emoji: string }
) {
  const { channel, ts } = JSON.parse(message)
  try {
    await slack.reactions.add({
      token: ctx.token,
      channel,
      timestamp: ts,
      name: emoji,
    })
  } catch (e: any) {
    if (e.data?.error !== 'already_reacted') {
      throw e
    }
  }
  return {}
}

async function removeReactionFromMessage(
  ctx: ExecutionContext,
  { message, emoji }: { message: string; emoji: string }
) {
  const { channel, ts } = JSON.parse(message)
  try {
    await slack.reactions.remove({
      token: ctx.token,
      channel,
      timestamp: ts,
      name: emoji,
    })
  } catch (e: any) {
    if (e.data?.error !== 'no_reaction') {
      throw e
    }
  }
  return {}
}

async function sendEphemeralMessage(
  ctx: ExecutionContext,
  { channel, user, message }: { channel: string; user: string; message: string }
) {
  slack.chat.postEphemeral({
    token: ctx.token,
    channel,
    user,
    blocks: [JSON.parse(message)],
  })
  return {}
}

export default {
  'dm-user': defineStep(sendMessageToUser, {
    name: 'Send a message to a person',
    category: 'Messages',
    inputs: {
      user_id: { name: 'User', required: true, type: 'user' },
      message: { name: 'Message', required: true, type: 'rich_text' },
    },
    outputs: {
      message: { name: 'Sent message', required: true, type: 'message' },
    },
  }),
  'message-channel': defineStep(sendMessageToChannel, {
    name: 'Send a message to a channel',
    category: 'Messages',
    inputs: {
      channel: { name: 'Channel', required: true, type: 'channel' },
      message: { name: 'Message', required: true, type: 'rich_text' },
    },
    outputs: {
      message: { name: 'Sent message', required: true, type: 'message' },
    },
  }),
  'message-reply': defineStep(replyToMessage, {
    name: 'Reply to a message in thread',
    category: 'Messages',
    inputs: {
      thread: { name: 'Message to reply to', required: true, type: 'message' },
      message: { name: 'Message', required: true, type: 'rich_text' },
    },
    outputs: {
      message: { name: 'Sent message', required: true, type: 'message' },
    },
  }),
  'react-message': defineStep(addReactionToMessage, {
    name: 'Add a reaction to a message',
    category: 'Messages',
    inputs: {
      message: { name: 'Message', required: true, type: 'message' },
      emoji: {
        name: 'Emoji name (without colons)',
        required: true,
        type: 'text',
      },
    },
    outputs: {},
  }),
  'unreact-message': defineStep(removeReactionFromMessage, {
    name: 'Remove a reaction from a message',
    category: 'Messages',
    inputs: {
      message: { name: 'Message', required: true, type: 'message' },
      emoji: {
        name: 'Emoji name (without colons)',
        required: true,
        type: 'text',
      },
    },
    outputs: {},
  }),
  'send-ephemeral': defineStep(sendEphemeralMessage, {
    name: 'Send an "only visible to you" message',
    category: 'Messages',
    inputs: {
      channel: { name: 'Channel', required: true, type: 'channel' },
      user: { name: 'User', required: true, type: 'user' },
      message: { name: 'Message', required: true, type: 'rich_text' },
    },
    outputs: {},
  }),
}
