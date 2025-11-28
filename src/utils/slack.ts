import type { RespondArguments } from '@slack/bolt'
import type {
  RichTextBlock,
  RichTextBlockElement,
  RichTextElement,
} from '@slack/types'
import slack from '../clients/slack'
import { getConfigToken, updateConfigToken } from '../database/config_tokens'

export async function respond(
  event: { response_url: string },
  data: string | RespondArguments
) {
  const isText = typeof data === 'string'
  const contentType = isText ? 'text/plain' : 'application/json'
  const body = isText ? data : JSON.stringify(data)

  return await fetch(event.response_url, {
    method: 'POST',
    body,
    headers: {
      'Content-Type': contentType,
    },
  })
}

export async function getActiveConfigToken() {
  const token = await getConfigToken()
  if (!token) return
  if (token.expires_at > Date.now()) return token.access_token
  try {
    const res = await slack.tooling.tokens.rotate({
      refresh_token: token.refresh_token,
    })
    token.access_token = res.token!
    token.refresh_token = res.refresh_token!
    token.expires_at = res.exp! * 1000
  } catch (e) {
    console.error('Failed to rotate app config token:', e)
    return
  }
  await updateConfigToken(token)
  console.log('Successfully rotated config token!')
  return token.access_token
}

export function replaceRichText(
  block: RichTextBlock,
  replacements: Record<string, string>
) {
  for (const element of block.elements) {
    replaceRichTextBlockElement(element, replacements)
  }
  return block
}

function replaceRichTextBlockElement(
  element: RichTextBlockElement,
  replacements: Record<string, string>
) {
  const elements: RichTextElement[] = []
  switch (element.type) {
    case 'rich_text_list':
      for (const section of element.elements)
        replaceRichTextBlockElement(section, replacements)
      break
    case 'rich_text_preformatted':
    case 'rich_text_quote':
    case 'rich_text_section':
    default:
      for (const ele of element.elements)
        elements.push(replaceRichTextElement(ele, replacements))
      element.elements = elements
      break
  }
}

function replaceRichTextElement(
  element: RichTextElement,
  replacements: Record<string, string>
): RichTextElement {
  if (element.type !== 'link' && element.type !== 'text') return element

  // special case, when a text element's old text is exactly a key and the new text is
  // exactly a mention, just convert to the appropriate block
  if (element.type === 'text') {
    for (const [old, repl] of Object.entries(replacements)) {
      if (old !== element.text) continue
      let match: RegExpMatchArray | null
      if ((match = repl.match(/^<@(U[0-9A-Z]+)>$/))) {
        const userId = match[1]!
        return { type: 'user', user_id: userId, style: element.style }
      } else if ((match = repl.match(/^<#(C[0-9A-Z]+)>$/))) {
        const channelId = match[1]!
        return { type: 'channel', channel_id: channelId, style: element.style }
      }
    }
  }

  element.text = element.text && replaceText(element.text, replacements)
  return element
}

export function replaceText(
  text: string,
  replacements: Record<string, string>
) {
  for (const [old, repl] of Object.entries(replacements))
    text = text.replaceAll(old, repl)
  return text
}
