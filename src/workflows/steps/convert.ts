import { defineStep } from '.'
import type { ExecutionContext } from '../context'

async function identity(_ctx: ExecutionContext, { value }: { value: string }) {
  return { value }
}

async function convertUserToPing(
  _: ExecutionContext,
  { value }: { value: string }
) {
  return { value: `<@${value}>` }
}

async function convertMessageToTs(
  _: ExecutionContext,
  { message }: { message: string }
) {
  return { ts: JSON.parse(message).ts }
}

async function convertMessageToChannel(
  _: ExecutionContext,
  { message }: { message: string }
) {
  return { channel: JSON.parse(message).channel }
}

async function convertToMessage(
  _: ExecutionContext,
  { channel, ts }: { channel: string; ts: string }
) {
  return { message: JSON.stringify({ channel, ts }) }
}

export default {
  'convert-user-to-id': defineStep(identity, {
    name: 'Convert user to user ID',
    category: 'Convert',
    inputs: {
      value: { type: 'user', name: 'User', required: true },
    },
    outputs: {
      value: { type: 'text', name: 'User ID', required: true },
    },
  }),
  'convert-user-to-ping': defineStep(convertUserToPing, {
    name: 'Convert user to @user',
    category: 'Convert',
    inputs: {
      value: { type: 'user', name: 'User', required: true },
    },
    outputs: {
      value: { type: 'text', name: '@user mention', required: true },
    },
  }),
  'convert-user-id-to-user': defineStep(identity, {
    name: 'Convert user ID to user',
    category: 'Convert',
    inputs: {
      value: {
        type: 'user',
        name: 'User ID',
        required: true,
        description:
          'It is your responsibility to ensure this is a valid user ID. Otherwise, later steps that use this user may fail.',
      },
    },
    outputs: {
      value: { type: 'user', name: 'User', required: true },
    },
  }),
  'convert-channel-to-id': defineStep(identity, {
    name: 'Convert channel to channel ID',
    category: 'Convert',
    inputs: {
      value: { type: 'channel', name: 'Channel', required: true },
    },
    outputs: {
      value: { type: 'text', name: 'Channel ID', required: true },
    },
  }),
  'convert-id-to-channel': defineStep(identity, {
    name: 'Convert channel ID to channel',
    category: 'Convert',
    inputs: {
      value: {
        type: 'text',
        name: 'Channel ID',
        required: true,
        description:
          'It is your responsibility to ensure this is a valid channel ID. Otherwise, later steps that use this channel may fail.',
      },
    },
    outputs: {
      value: { type: 'channel', name: 'Channel', required: true },
    },
  }),
  'convert-message-to-ts': defineStep(convertMessageToTs, {
    name: 'Get timestamp from message',
    category: 'Convert',
    inputs: {
      message: { name: 'Message', type: 'message', required: true },
    },
    outputs: {
      ts: { name: 'Timestamp', type: 'text', required: true },
    },
  }),
  'convert-message-to-channel': defineStep(convertMessageToChannel, {
    name: 'Get channel from message',
    category: 'Convert',
    inputs: {
      message: { name: 'Message', type: 'message', required: true },
    },
    outputs: {
      channel: { name: 'Channel', type: 'channel', required: true },
    },
  }),
  'convert-channel-ts-to-message': defineStep(convertToMessage, {
    name: 'Get message from channel and timestamp',
    category: 'Convert',
    inputs: {
      channel: {
        name: 'Channel',
        type: 'channel',
        required: true,
        description:
          'It is your responsibility to ensure the channel and timestamp are correct. Otherwise, later steps that use this message may fail.',
      },
      ts: { name: 'Timestamp', type: 'text', required: true },
    },
    outputs: {
      message: { name: 'Message', type: 'message', required: true },
    },
  }),
}
