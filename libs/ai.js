/** One Anthropic Messages call that returns parsed JSON. Key: ANTHROPIC_API_KEY (server only). */
export async function askJson({ model, system, prompt, maxTokens = 600 }) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: prompt }] }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `Anthropic error ${res.status}`)
  const text = data.content?.map((c) => c.text || '').join('') || ''
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
}
