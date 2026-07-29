import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { getMessages, isSiteLocale, localeMeta } from '@/i18n/config'
import { consumeRateLimit, trustedClientKey } from '@/utilities/rateLimit'

const bodySchema = z.object({
  message: z.string().trim().min(1).max(1_200),
  sessionId: z.string().max(100).optional(),
  pageUrl: z.string().max(500).optional(),
  locale: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['assistant', 'user']),
        text: z.string().max(1_200),
      }),
    )
    .max(6)
    .optional(),
}).strict()

function findText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(findText).filter(Boolean).join('')
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  for (const key of ['answer', 'content', 'text', 'output', 'result', 'message']) {
    const found = findText(record[key])
    if (found) return found
  }
  return ''
}

function parseAgentResponse(raw: string, contentType: string) {
  if (contentType.includes('text/event-stream')) {
    return raw
      .split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .filter((line) => line && line !== '[DONE]')
      .map((line) => {
        try {
          return findText(JSON.parse(line))
        } catch {
          return line
        }
      })
      .join('')
  }
  try {
    return findText(JSON.parse(raw))
  } catch {
    return raw
  }
}

function agentAuthHeaders(apiKey: string | undefined): Record<string, string> {
  if (!apiKey) return {}
  switch ((process.env.AI_CHAT_AUTH_SCHEME || 'bearer').toLowerCase()) {
    case 'raw':
      return { Authorization: apiKey }
    case 'x-api-key':
      return { 'X-API-Key': apiKey }
    case 'none':
      return {}
    default:
      return { Authorization: `Bearer ${apiKey}` }
  }
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 16_384) {
    return NextResponse.json({ error: 'Request too large.' }, { status: 413 })
  }

  const rawBody = await request.text()
  if (Buffer.byteLength(rawBody) > 16_384) {
    return NextResponse.json({ error: 'Request too large.' }, { status: 413 })
  }
  const parsed = bodySchema.safeParse(
    (() => {
      try {
        return JSON.parse(rawBody)
      } catch {
        return null
      }
    })(),
  )
  const requestedLocale = parsed.success ? parsed.data.locale : undefined
  const locale = isSiteLocale(requestedLocale) ? requestedLocale : 'en'
  const t = getMessages(locale)
  if (!parsed.success) {
    return NextResponse.json({ error: t.questionTooLong }, { status: 400 })
  }
  let rateLimit: Awaited<ReturnType<typeof consumeRateLimit>>
  try {
    rateLimit = await consumeRateLimit({
      key: `ai:${trustedClientKey(request.headers)}`,
      limit: 15,
      windowSeconds: 60,
    })
  } catch {
    return NextResponse.json({ error: t.chatUnavailable }, { status: 503 })
  }
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: t.tooMany }, { status: 429 })
  }

  const apiUrl = process.env.AI_CHAT_API_URL
  const apiKey = process.env.AI_CHAT_API_KEY
  if (!apiUrl) return NextResponse.json({ answer: t.aiConnecting })

  const context = {
    mode: 'customer_service',
    responseLanguage: localeMeta[locale].label,
    rules: [
      'Answer as a concise international-trade product assistant.',
      'Never invent price, certification, inventory or delivery promises.',
      'When information is missing, ask for product name, quantity and destination country.',
      'Suggest contacting the sales team for a confirmed quotation.',
    ],
    currentPage: parsed.data.pageUrl || `/${locale}`,
    recentMessages: (parsed.data.history || []).slice(-6),
    customerQuestion: parsed.data.message,
  }

  try {
    const upstream = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...agentAuthHeaders(apiKey),
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: JSON.stringify(context) }],
        sessionId: parsed.data.sessionId || crypto.randomUUID(),
        source: 'api',
        extra: {},
      }),
      signal: AbortSignal.timeout(45_000),
    })
    const raw = await upstream.text()
    if (!upstream.ok) throw new Error(`Upstream returned ${upstream.status}`)
    const answer = parseAgentResponse(raw, upstream.headers.get('content-type') || '')
    if (!answer.trim()) throw new Error('Empty assistant response')
    return NextResponse.json({ answer: answer.trim() })
  } catch {
    return NextResponse.json({ error: t.chatUnavailable }, { status: 502 })
  }
}
