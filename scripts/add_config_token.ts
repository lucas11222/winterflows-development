import { WebClient } from '@slack/web-api'
import { sql } from 'bun'

const slack = new WebClient()

const refreshToken = prompt('Please enter the refresh token:')!

const res = await slack.tooling.tokens.rotate({
  refresh_token: refreshToken,
})

console.log(res)

const obj = {
  access_token: res.token,
  refresh_token: res.refresh_token,
  user_id: res.user_id,
  expires_at: res.exp! * 1000,
}

await sql`INSERT INTO config_tokens ${sql(obj)}`
