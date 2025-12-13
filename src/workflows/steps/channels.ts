import { defineStep } from '.'
import slack from '../../clients/slack'
import type { ExecutionContext } from '../context'

async function addUserToChannel(
  ctx: ExecutionContext,
  { channel, user }: { channel: string; user: string }
) {
  try {
    await slack.conversations.invite({
      token: ctx.token,
      channel,
      users: user,
    })
  } catch (e: any) {
    if (e.data?.error !== 'already_in_channel') {
      throw e
    }
  }
  return {}
}

async function removeUserFromChannel(
  ctx: ExecutionContext,
  { channel, user }: { channel: string; user: string }
) {
  try {
    await slack.conversations.kick({ token: ctx.token, channel, user })
  } catch (e: any) {
    if (e.data?.error !== 'not_in_channel') {
      throw e
    }
  }
  return {}
}

async function archiveChannel(
  ctx: ExecutionContext,
  { channel }: { channel: string }
) {
  await slack.conversations.archive({
    token: ctx.token,
    channel,
  })
  return {}
}

async function createPublicChannel(
  ctx: ExecutionContext,
  { name }: { name: string }
) {
  const channel = await slack.conversations.create({
    token: ctx.token,
    name: name,
    is_private: false,
  })
  return { id: channel.channel!.id! }
}

async function createPrivateChannel(
  ctx: ExecutionContext,
  { name }: { name: string }
) {
  const channel = await slack.conversations.create({
    token: ctx.token,
    name: name,
    is_private: true,
  })
  return { id: channel.channel!.id! }
}

async function pinMessage(
  ctx: ExecutionContext,
  { message }: { message: string }
) {
  const { channel, ts } = JSON.parse(message)
  try {
    await slack.pins.add({
      token: ctx.token,
      channel,
      timestamp: ts,
    })
  } catch (e: any) {
    if (e.data?.error !== 'already_pinned') {
      throw e
    }
  }
  return {}
}

async function editTopic(
  ctx: ExecutionContext,
  { channel, topic }: { channel: string; topic: string }
) {
  await slack.conversations.setTopic({
    token: ctx.token,
    channel,
    topic,
  })
  return {}
}

export default {
  'channel-invite': defineStep(addUserToChannel, {
    name: 'Add a user to a channel',
    category: 'Channels',
    inputs: {
      channel: { name: 'Channel', type: 'channel', required: true },
      user: { name: 'User', type: 'user', required: true },
    },
    outputs: {},
  }),
  'channel-kick': defineStep(removeUserFromChannel, {
    name: 'Remove a user from a channel',
    category: 'Channels',
    inputs: {
      channel: { name: 'Channel', type: 'channel', required: true },
      user: { name: 'User', type: 'user', required: true },
    },
    outputs: {},
  }),
  'archive-channel': defineStep(archiveChannel, {
    name: 'Archive a channel',
    category: 'Channels',
    inputs: {
      channel: { name: 'Channel', type: 'channel', required: true },
    },
    outputs: {},
  }),
  'create-public-channel': defineStep(createPublicChannel, {
    name: 'Create a public channel',
    category: 'Channels',
    inputs: {
      name: { name: 'Name', type: 'text', required: true },
    },
    outputs: {
      id: { name: 'Channel', type: 'channel', required: true },
    },
  }),
  'create-private-channel': defineStep(createPrivateChannel, {
    name: 'Create a private channel',
    category: 'Channels',
    inputs: {
      name: { name: 'Name', type: 'text', required: true },
    },
    outputs: {
      id: { name: 'Created channel', type: 'channel', required: true },
    },
  }),
  'pin-message': defineStep(pinMessage, {
    name: 'Pin a message',
    category: 'Channels',
    inputs: {
      message: { name: 'Message', type: 'message', required: true },
    },
    outputs: {},
  }),
  'set-channel-topic': defineStep(editTopic, {
    name: 'Update the channel topic',
    category: 'Channels',
    inputs: {
      channel: { name: 'Channel', type: 'channel', required: true },
      topic: { name: 'Topic', type: 'text', required: true },
    },
    outputs: {},
  }),
}
