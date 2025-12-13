import { defineStep } from '.'
import slack from '../../clients/slack'
import type { ExecutionContext } from '../context'

async function addToUserGroup(
  ctx: ExecutionContext,
  { user, group }: { user: string; group: string }
) {
  const res = await slack.usergroups.users.list({
    token: ctx.token,
    usergroup: group,
  })
  const users = res.users!
  users.push(user)
  await slack.usergroups.users.update({
    token: ctx.token,
    usergroup: group,
    users: users.join(','),
  })
  return {}
}

async function removeFromUserGroup(
  ctx: ExecutionContext,
  { user, group }: { user: string; group: string }
) {
  const res = await slack.usergroups.users.list({
    token: ctx.token,
    usergroup: group,
  })
  const users = res.users!
  if (users.includes(user)) {
    users.splice(users.indexOf(user), 1)
    await slack.usergroups.users.update({
      token: ctx.token,
      usergroup: group,
      users: users.join(','),
    })
  }
  return {}
}

async function createUserGroup(
  ctx: ExecutionContext,
  { handle, name }: { handle: string; name: string }
) {
  const res = await slack.usergroups.create({
    token: ctx.token,
    handle,
    name,
  })
  return { group: res.usergroup!.id! }
}

async function getUserInfo(ctx: ExecutionContext, { user }: { user: string }) {
  const res = await slack.users.info({
    token: ctx.token,
    user,
  })
  const username = res.user!.name!
  const real = res.user!.profile!.real_name || res.user!.real_name || username
  const display = res.user!.profile!.display_name || real
  return { username, real, display }
}

export default {
  'get-user-info': defineStep(getUserInfo, {
    name: 'Get info about user',
    category: 'Users',
    inputs: {
      user: { name: 'User', type: 'user', required: true },
    },
    outputs: {
      username: { name: 'Username', type: 'text', required: true },
      real: { name: 'Real name', type: 'text', required: true },
      display: { name: 'Display name', type: 'text', required: true },
    },
  }),
  'usergroup-add': defineStep(addToUserGroup, {
    name: 'Add user to a user group',
    category: 'Users',
    inputs: {
      user: { name: 'User', type: 'user', required: true },
      group: { name: 'User group', type: 'usergroup', required: true },
    },
    outputs: {},
  }),
  'usergroup-remove': defineStep(removeFromUserGroup, {
    name: 'Remove user from a user group',
    category: 'Users',
    inputs: {
      user: { name: 'User', type: 'user', required: true },
      group: { name: 'User group', type: 'usergroup', required: true },
    },
    outputs: {},
  }),
  'usergroup-create': defineStep(createUserGroup, {
    name: 'Create a user group',
    category: 'Users',
    inputs: {
      handle: { name: 'Handle', type: 'text', required: true },
      name: { name: 'Name', type: 'text', required: true },
    },
    outputs: {
      group: { name: 'Created user group', type: 'usergroup', required: true },
    },
  }),
}
